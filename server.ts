import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { handleAdvisor, handleAnalyze, getSchemeDetailsForAdvisor } from "./src/advisorLogic";
import {
  isDairyCategory,
  buildDairyAnalysis,
  parseCsvDataLayer,
  formatCsvDataLayer,
} from "./src/dairyDataService";
import type { DairyAnalysisResult } from "./src/dairyDataService";
import { MEERUT_DATA, getTehsilMarketReach } from "./locationData";
import rawBlocksData from "./src/rawBlocksData.json";

function categorizeGeminiError(err: any): { category: string; description: string } {
  const status = err?.status || err?.statusCode || 0;
  const msg = String(err?.message || err || "").toLowerCase();
  if (status === 429 || msg.includes("429") || msg.includes("quota") || msg.includes("resource_exhausted")) {
    return { category: "QUOTA_EXCEEDED", description: "Rate limit or quota exhausted (HTTP 429)" };
  }
  if (status === 401 || status === 403 || msg.includes("401") || msg.includes("403") || msg.includes("permission_denied") || msg.includes("api_key")) {
    return { category: "AUTH_ERROR", description: "Authentication or credential error" };
  }
  if (msg.includes("timed out") || msg.includes("timeout") || msg.includes("abort")) {
    return { category: "TIMEOUT", description: "Request timed out" };
  }
  if (status === 404 || msg.includes("not found") || msg.includes("model")) {
    return { category: "INVALID_MODEL", description: "Model not found or unavailable" };
  }
  if (status >= 500) {
    return { category: "UPSTREAM_SERVER_ERROR", description: `Upstream Gemini server error (${status})` };
  }
  return { category: "GENERAL_ERROR", description: msg || "Unspecified Gemini error" };
}

function extractAmountFromText(text: string): number | null {
  if (!text) return null;
  const clean = text.toLowerCase().replace(/,/g, '');
  const lakhMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?|लाख)/i);
  if (lakhMatch) return parseFloat(lakhMatch[1]) * 100000;
  const kMatch = clean.match(/(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) return parseFloat(kMatch[1]) * 1000;
  const hazarMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:thousand|thousands|hazar|hazaar|हजार)/i);
  if (hazarMatch) return parseFloat(hazarMatch[1]) * 1000;
  const numMatch = clean.match(/(?:₹|rs\.?|inr)?\s*(\d{3,9})\b/i);
  if (numMatch) return parseFloat(numMatch[1]);
  return null;
}

if (typeof (process as any).loadEnvFile === "function") {
  try {
    (process as any).loadEnvFile();
  } catch {
    // Ignore if .env is missing or cannot be read
  }
}

let genAIClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!genAIClient) {
    try {
      genAIClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    } catch (err) {
      console.error("Failed to initialize GoogleGenAI client:", err);
      return null;
    }
  }
  return genAIClient;
}

// Pre-index blocks data by district lowercase name for fast pan-India lookups
const panIndiaBlocksMap: Record<string, string[]> = {};
if (Array.isArray(rawBlocksData)) {
  rawBlocksData.forEach((districtObj: any) => {
    if (districtObj && districtObj.name) {
      const key = districtObj.name.toLowerCase().trim();
      const blocks = Array.isArray(districtObj.blockList)
        ? districtObj.blockList.map((b: any) => {
            const name = typeof b === "string" ? b : (b.name || "");
            return name
              .toLowerCase()
              .split(" ")
              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");
          })
        : [];
      panIndiaBlocksMap[key] = blocks;
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ================= CANONICAL API ROUTES =================

  // 1. Health & Status
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/status", (_req, res) => {
    res.json({
      message: "Vyapaar AI API is running!",
      status: "success",
      gemini_configured: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // 2. SAHYOGI AI Assistant (Canonical: POST /api/sahyogi, Alias: POST /api/smrity)
  const sahyogiHandler = async (req: express.Request, res: express.Response) => {
    try {
      const { message, context } = req.body;
      if (!message || typeof message !== "string") {
        res.status(400).json({ error: "Message is required" });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.json({
          reply:
            "नमस्ते! मैं सहयोगी (SAHYOGI) हूँ — आपका ग्रामीण व्यापार साथी। सर्वर में अभी AI कुंजी सेट नहीं है, लेकिन आप अपनी चुनी हुई व्यापार श्रेणी, लागत व लोन के संबंध में नीचे दिए गए नियमों का पालन कर सकते हैं।",
          source: "fallback",
        });
        return;
      }

      let contextStr = "";
      if (context && typeof context === "object") {
        contextStr = `\nCurrent User Business Profile:\n${JSON.stringify(context, null, 2)}`;
        const cat = context.businessType || context.category || "";
        if (isDairyCategory(cat) || message.includes("Dist_Population") || message.includes("[CSV DATA LAYER]")) {
          const dData = buildDairyAnalysis({
            district: context.district || "Meerut",
            monthlyRevenue: context.monthlyRevenue || context.monthly_revenue,
            monthlyExpenses: context.monthlyExpenses || context.monthly_expenses,
            monthlyEmi: context.monthlyEmi || context.monthly_emi,
            projectCost: context.totalProjectCost || context.project_cost,
          });
          contextStr += `\n==== DAIRY SECTOR MACRO-DEMOGRAPHICS & MARKET GAP ====
[CSV DATA LAYER]
${dData.csv_data_layer}
Price Arbitrage: ${dData.price_arbitrage.explanation}
Demographic Targeting: ${dData.demographic_targeting.explanation}
Market Sizing: ${dData.market_sizing.explanation}`;
        }
      }

      const systemInstruction = `You are "SAHYOGI" (सहयोगी), a friendly, respectful, and practical AI business companion built for "Vyapaar AI".
Your purpose is to assist rural and semi-urban micro-entrepreneurs in India with honesty and clarity.
Core Guidelines:
- Ground your advice in the provided business profile. If a financial figure or metric is not provided, null, or zero, do not quote it as ₹0 or blank; simply state that detailed financial projections will be available once inputs are submitted or focus on practical guidance.
- Answer in the language the user speaks (Hindi, Hinglish, or clear simple English).
- When discussing government schemes, clearly state that loan eligibility is subject to official verification and sanction by the lending bank.
- Keep explanations simple, realistic, and encouraging, like a wise, trusted local business elder.
${contextStr}`;

      let reply = "";
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: message,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        reply = response.text ? response.text.trim() : "";
      } catch (e1: any) {
        console.warn("Sahyogi gemini-3.8-flash error, retrying with fallback model:", e1?.message || e1);
        try {
          const response2 = await ai.models.generateContent({
            model: "gemini-flash-latest",
            contents: message,
            config: {
              systemInstruction,
              temperature: 0.7,
            },
          });
          reply = response2.text ? response2.text.trim() : "";
        } catch (e2: any) {
          console.warn("Sahyogi gemini-flash-latest error:", e2?.message || e2);
        }
      }

      if (!reply) {
        const fallback = handleAdvisor({
          question: message,
          business_name: context?.businessName || context?.business_name,
          category: context?.category || context?.businessType,
        });
        reply =
          fallback.answer ||
          "नमस्ते! अपने व्यापार को सफल बनाने के लिए शुरुआती लागत नियंत्रित रखें, समय पर बैंक किश्त भरें, और ग्राहकों से सीधा संपर्क बनाकर विश्वास अर्जित करें।";
      }

      res.json({ reply, source: "gemini" });
    } catch (error: any) {
      console.warn("Sahyogi Gemini call failed:", error?.message || error);
      const fallback = handleAdvisor({
        question: req.body?.message || "",
      });
      res.json({
        reply:
          fallback.answer ||
          "नमस्ते! अपने व्यापार को सफल बनाने के लिए शुरुआती लागत सीमित रखें और सरकारी योजनाओं के तहत मिलने वाले ऋण का सदुपयोग करें।",
        source: "fallback",
      });
    }
  };

  app.post("/api/sahyogi", sahyogiHandler);
  app.post("/api/smrity", sahyogiHandler); // Backward-compatible alias

  // 3. Location Demographics & Market Reach (Canonical: GET /api/market-reach)
  const getMarketReachHandler = (req: express.Request, res: express.Response) => {
    const district =
      (req.query.district as string) ||
      (req.body?.district as string) ||
      "";
    const block =
      (req.query.block as string) ||
      (req.query.tehsil as string) ||
      (req.body?.block as string) ||
      (req.body?.tehsil as string) ||
      district;
    const radiusParam =
      req.query.radiusKm || req.query.radius_km || req.body?.radiusKm || req.body?.radius_km;
    const radiusKm = radiusParam ? parseFloat(String(radiusParam)) : 5;

    const reach = getTehsilMarketReach(district, block, radiusKm);
    res.json(reach);
  };

  app.get("/api/market-reach", getMarketReachHandler);
  app.post("/api/market-reach", getMarketReachHandler);
  app.get("/market-reach", getMarketReachHandler); // Compatibility alias
  app.post("/market-reach", getMarketReachHandler);

  // 4. Pan-India District Blocks / Tehsils (Canonical: GET /api/locations/tehsils)
  const getTehsilsHandler = (req: express.Request, res: express.Response) => {
    const district = ((req.query.district as string) || "").trim();
    if (!district) {
      res.json({
        district: "",
        has_verified_data: false,
        tehsils: [],
      });
      return;
    }

    const cleanLower = district.toLowerCase();

    // Check Meerut benchmark profile first
    if (cleanLower === "meerut") {
      res.json({
        district: MEERUT_DATA.district,
        has_verified_data: true,
        tehsils: Object.keys(MEERUT_DATA.tehsils),
        details: MEERUT_DATA.tehsils,
      });
      return;
    }

    // Check nationwide blocks database
    if (panIndiaBlocksMap[cleanLower] && panIndiaBlocksMap[cleanLower].length > 0) {
      res.json({
        district,
        has_verified_data: true,
        tehsils: panIndiaBlocksMap[cleanLower],
      });
      return;
    }

    // Fuzzy check
    const matchedKey = Object.keys(panIndiaBlocksMap).find(
      (k) => k === cleanLower || k.includes(cleanLower) || cleanLower.includes(k)
    );
    if (matchedKey && panIndiaBlocksMap[matchedKey].length > 0) {
      res.json({
        district,
        has_verified_data: true,
        tehsils: panIndiaBlocksMap[matchedKey],
      });
      return;
    }

    res.json({
      district,
      has_verified_data: false,
      tehsils: [],
    });
  };

  app.get("/api/locations/tehsils", getTehsilsHandler);
  app.get("/locations/tehsils", getTehsilsHandler); // Compatibility alias
  app.get("/api/location/meerut", (_req, res) => res.json(MEERUT_DATA)); // Reference dataset alias
  app.get("/api/location-data", (_req, res) => res.json({ districts: [MEERUT_DATA] }));

  // 5. Business Analysis (Canonical: POST /api/analyze)
  const analyzeHandler = async (req: express.Request, res: express.Response) => {
    try {
      const result = handleAnalyze(req.body);
      const business_category = req.body?.category || result.category || "General Enterprise";
      const district = (req.body?.district || result.district || "").trim();
      const block = (req.body?.block || result.block || district || "").trim();
      const radiusKm = req.body?.radius_km || req.body?.radiusKm || 5;
      const pin = req.body?.pin || "";

      // Demographics calculated dynamically using block and district
      const hyperLocalData = getTehsilMarketReach(district, block, Number(radiusKm));

      const projectCost =
        result.scheme_analysis?.project_cost ||
        (req.body?.investment != null && !isNaN(Number(req.body.investment)) ? Number(req.body.investment) / 0.1 : 0);

      // Preserve SIH26091 core scheme as authoritative route
      const schemeRoute =
        result.scheme_analysis?.scheme_name ||
        "Micro Finance Scheme";
      const schemeDetails =
        (result.scheme_analysis as any)?.message ||
        "SIH26091 Core Scheme Financing";

      // Populate calibrated block demographics
      if (result.hyper_local_profile) {
        result.hyper_local_profile.market_reach = {
          ...result.hyper_local_profile.market_reach,
          ...hyperLocalData,
          service_area: district ? `5–10 km radius covering ${block || district}, ${district}` : "5–10 km local catchment area",
          consumer_base: `${hyperLocalData.reachable_consumers.toLocaleString("en-IN")} reachable consumers (~${hyperLocalData.reachable_households.toLocaleString("en-IN")} households)`,
          consumer_base_status: hyperLocalData.consumer_base_status,
          data_source: hyperLocalData.data_source,
          reach_type: `${hyperLocalData.zone_classification} • ${block || "Local"} Catchment`,
        };
        if (hyperLocalData.dominant_local_clusters?.length) {
          (result.hyper_local_profile as any).dominant_clusters = hyperLocalData.dominant_local_clusters;
        }
        if (hyperLocalData.district_bottlenecks?.length) {
          (result.hyper_local_profile as any).district_bottlenecks = hyperLocalData.district_bottlenecks;
        }
      }

      // Language handling
      const languageMap: Record<string, string> = {
        hi: "Hindi",
        en: "English",
        hinglish: "Hinglish (conversational Hindi written in English/Latin script)",
        mr: "Marathi",
        bn: "Bengali",
        te: "Telugu",
        ta: "Tamil",
      };
      const rawLang = req.body?.selectedLanguage || req.body?.language || "Hindi";
      const selectedLanguage = languageMap[rawLang] || rawLang;

      const locationLabel = [block, district].filter(Boolean).join(", ") || "the specified local area";

      // Dairy sector macro-demographics & market gap layer integration
      // CRITICAL CONDITION: ONLY apply if category is Dairy & Milk Products
      let dairyPromptSection = "";
      let dairyAnalysisResult: DairyAnalysisResult | null = null;
      if (isDairyCategory(business_category)) {
        dairyAnalysisResult = buildDairyAnalysis({
          district,
          monthlyRevenue: req.body?.monthly_revenue ? Number(req.body.monthly_revenue) : (result.financial_analysis?.monthly_revenue ?? null),
          monthlyExpenses: req.body?.monthly_expenses ? Number(req.body.monthly_expenses) : (result.financial_analysis?.monthly_expenses ?? null),
          monthlyEmi: result.loan_affordability?.monthly_emi,
          projectCost,
        });

        result.dairy_analysis = dairyAnalysisResult;

        dairyPromptSection = `
CRITICAL INSTRUCTION FOR DAIRY CATEGORY:
==== DAIRY SECTOR MACRO-DEMOGRAPHICS & MARKET GAP ====
[CSV DATA LAYER]
${dairyAnalysisResult.csv_data_layer}

You must integrate the following into your market_summary:
- Price Arbitrage (from Price Layer): Compare the Local_Sourcing_Price (₹${dairyAnalysisResult.local_sourcing_price.toFixed(2)}/kg) to Nat_Retail_Avg (₹61.45/kg) and Nat_Wholesale_Avg (₹57.63/kg). ${dairyAnalysisResult.price_arbitrage.status === "Strong Sourcing Advantage" ? 'Since local cost is significantly lower, explicitly state they have a "Strong Sourcing Advantage" and should focus on volume.' : 'Since local cost is near or above the national average, warn them of "Margin Compression" and advise premium retail packaging.'}
- Demographic Targeting (from District Gap Layer): Analyze the Agri_Workers (${dairyAnalysisResult.agri_workers.toLocaleString("en-IN")}) relative to Dist_Population (${dairyAnalysisResult.dist_population.toLocaleString("en-IN")}). Since the district has a high concentration of agricultural workers, you MUST suggest a secondary B2B revenue stream tailored to farmers (e.g., selling cattle feed, urea, or tractor rentals).
- Market Sizing (from Integrated Dataset): Use the district population (${dairyAnalysisResult.dist_population.toLocaleString("en-IN")}) to mathematically validate if there are enough potential local buyers to support their proposed production scale and EMI payments.`;
      }

      const prompt = `You are an honest, experienced rural business advisor in India.
The user wants to start a ${business_category} business in ${locationLabel}${pin ? ` (PIN: ${pin})` : ""}.
Context: Estimated Catchment: ~${hyperLocalData.reachable_consumers} consumers; Zone: ${hyperLocalData.zone_classification}; Estimated Project Cost: ₹${projectCost}; Screened Scheme: ${schemeRoute}.
${dairyPromptSection}

Generate a market_summary consisting of EXACTLY TWO flowing paragraphs (about 6 to 8 sentences total):

Paragraph 1: Discuss the demand viability for a ${business_category} in ${locationLabel}. Note that actual local competition should be confirmed by a physical field visit, and discuss whether the local catchment can support steady sales. State clearly that scheme sanction is subject to official bank appraisal.${dairyAnalysisResult ? ` Incorporate Price Arbitrage (${dairyAnalysisResult.price_arbitrage.status === "Strong Sourcing Advantage" ? 'explicitly stating a "Strong Sourcing Advantage" and focusing on volume' : 'warning of "Margin Compression" and advising premium retail packaging'}) and Market Sizing (using district population of ${dairyAnalysisResult.dist_population.toLocaleString("en-IN")} to mathematically validate local buyers for production scale and EMI payments).` : ''}

Paragraph 2: Provide a practical, low-cost operational tip on how the entrepreneur can gain customer trust in rural/semi-urban markets (e.g., direct relationships, weekly market presence, quality consistency, fair pricing).${dairyAnalysisResult ? ` Suggest a secondary B2B revenue stream tailored to farmers (e.g., selling cattle feed, urea, or tractor rentals) given the high concentration of agricultural workers (${dairyAnalysisResult.agri_workers.toLocaleString("en-IN")} workers).` : ''}

STRICT CONSTRAINTS:
- Output exactly 2 flowing paragraphs separated by a single blank line.
- DO NOT use markdown symbols, asterisks (*), hashtags (#), or bullet points.
- Do NOT fabricate specific competitor shop counts; speak in realistic business terms.
- Write entirely in: ${selectedLanguage}`;

      let market_summary = "";
      try {
        const geminiClient = getGeminiClient();
        if (geminiClient) {
          let aiResponse;
          try {
            aiResponse = await geminiClient.models.generateContent({
              model: "gemini-3.8-flash",
              contents: prompt,
            });
          } catch (e1) {
            console.warn("gemini-3.8-flash error in analyze, retrying:", (e1 as any)?.message);
            aiResponse = await geminiClient.models.generateContent({
              model: "gemini-flash-latest",
              contents: prompt,
            });
          }
          market_summary = aiResponse.text ? aiResponse.text.trim().replace(/[*#_`]/g, "") : "";
        }
      } catch (geminiErr: any) {
        console.warn("Gemini market summary unavailable:", geminiErr?.message || geminiErr);
      }

      if (!market_summary) {
        if (dairyAnalysisResult) {
          market_summary = rawLang === "hi"
            ? `${dairyAnalysisResult.summary_report_hi}`
            : `${dairyAnalysisResult.summary_report}`;
        } else {
          market_summary =
            rawLang === "hi"
              ? `स्थानीय बाज़ार में ${business_category} के लिए नियमित उपभोक्ता माँग का अनुमान लगाया गया है। इस क्षेत्र में सफलता मुख्य रूप से उचित मूल्य निर्धारण और ग्राहकों के विश्वास पर निर्भर करेगी। सरकारी लोन योजना (${schemeRoute}) के तहत पात्रता एक प्रारंभिक स्क्रीनिंग है जिसकी अंतिम स्वीकृति बैंक सत्यापन पर निर्भर है।\n\nग्राहकों का विश्वास तेज़ी से बनाने के लिए पहले दिन से ही उत्पाद की गुणवत्ता और समय पर सेवा पर विशेष ध्यान दें। नज़दीकी परिवारों व स्थानीय दुकानदारों से सीधा संपर्क रखें और बाज़ार में अपनी नियमित उपस्थिति दर्ज कराएं।`
              : `There is steady daily demand potential for ${business_category} across ${locationLabel}. Business viability will depend heavily on maintaining competitive pricing and building direct community trust. Note that government scheme (${schemeRoute}) alignment is a preliminary screening and final sanction depends on bank appraisal.\n\nTo build initial customer loyalty, focus on consistent product purity and transparent dealings rather than relying solely on foot traffic. Cultivating direct relationships with local families and neighborhood stores will generate reliable repeat business.`;
        }
      }

      res.json({
        ...result,
        scheme_route: schemeRoute,
        scheme_details: schemeDetails,
        market_summary,
        feasibility_report: market_summary,
      });
    } catch (err: any) {
      console.error("Analyze error:", err);
      res.status(500).json({ error: err?.message || "Failed to analyze business" });
    }
  };

  app.post("/api/analyze", analyzeHandler);
  app.post("/analyze", analyzeHandler); // Compatibility alias

  // 6. Advisor Q&A (Canonical: POST /api/advisor)
  const advisorHandler = async (req: express.Request, res: express.Response) => {
    try {
      const message = (req.body?.message || req.body?.question || "").trim();
      const businessContext = req.body?.businessContext || req.body?.context || {};

      if (!message) {
        res.status(400).json({ error: "Message or question is required" });
        return;
      }

      const languageMap: Record<string, string> = {
        hi: "Hindi",
        en: "English",
        hinglish: "Hinglish (conversational Hindi written in English/Latin script)",
        mr: "Marathi",
        bn: "Bengali",
        te: "Telugu",
        ta: "Tamil",
      };
      const rawLang = req.body?.selectedLanguage || req.body?.language || "Hindi";
      const selectedLanguage = languageMap[rawLang] || rawLang;

      const bName = businessContext.businessName || "Your Enterprise";
      const bDistrict = businessContext.district || "Local Area";
      const bState = businessContext.state || "";
      const bScheme = businessContext.matchedScheme || "Government Credit Scheme";
      const bProjectCost =
        businessContext.totalProjectCost ??
        businessContext.project_cost ??
        businessContext.projectCost ??
        (businessContext.promoterMargin != null ? Number(businessContext.promoterMargin) / 0.1 : undefined);

      const bMarginVal =
        businessContext.promoterMargin ??
        businessContext.promoter_margin ??
        businessContext.margin_capital ??
        businessContext.investment ??
        (bProjectCost != null ? Number(bProjectCost) * 0.1 : undefined);

      const bLoanVal =
        businessContext.eligibleLoan ??
        businessContext.eligible_loan ??
        (bProjectCost != null && bMarginVal != null ? Number(bProjectCost) - Number(bMarginVal) : undefined);

      const bEmiVal =
        businessContext.monthlyEmi ??
        businessContext.monthly_emi ??
        undefined;

      const bInterestRate =
        businessContext.interestRate ??
        businessContext.loanInterestRate ??
        businessContext.interest_rate ??
        undefined;

      const bTenureMonths =
        businessContext.loanTenureMonths ??
        businessContext.loanTenure ??
        businessContext.tenure_months ??
        undefined;

      const bMoratoriumMonths =
        businessContext.moratoriumMonths ??
        businessContext.moratorium_months ??
        undefined;

      const bRevenue =
        businessContext.monthlyRevenue ??
        businessContext.monthly_revenue ??
        undefined;

      const bExpenses =
        businessContext.monthlyExpenses ??
        businessContext.monthly_expenses ??
        undefined;

      const bProfit =
        businessContext.monthlyProfit ??
        businessContext.monthly_profit ??
        undefined;

      const bRoi =
        businessContext.roiPercentage ??
        businessContext.roi_percentage ??
        undefined;

      const bAffordability =
        businessContext.affordabilityStatus ??
        businessContext.affordability_status ??
        "Requires Verification";

      const bFeasibility =
        businessContext.feasibilityVerdict ||
        businessContext.feasibility ||
        "Requires Verification";

      const bMarginStr =
        bMarginVal != null
          ? `₹${Number(bMarginVal).toLocaleString("en-IN")}`
          : "Not specified";
      const bLoanStr =
        bLoanVal != null
          ? `₹${Number(bLoanVal).toLocaleString("en-IN")}`
          : "Not specified";
      const bEmiStr =
        bEmiVal != null
          ? `₹${Number(bEmiVal).toLocaleString("en-IN")}`
          : "Not specified";
      const bProjectCostStr =
        bProjectCost != null
          ? `₹${Number(bProjectCost).toLocaleString("en-IN")}`
          : "Not specified";
      const bProfitStr =
        bProfit != null
          ? `₹${Number(bProfit).toLocaleString("en-IN")}`
          : "Not specified";

      const localMarketStr =
        businessContext.localMarketContext ||
        "Local Market Context: Live field scan data pending or not supplied.";

      const profileHeader = `PROFILE:
Business: ${bName} (${businessContext.businessType || "Enterprise"})
Location: ${bDistrict}${bState ? `, ${bState}` : ""} (Block: ${businessContext.block || bDistrict})
Total Project Cost: ${bProjectCostStr}
Promoter Margin (10%): ${bMarginStr}
Eligible Bank Loan (90%): ${bLoanStr}
Screened Scheme: ${bScheme} (Interest: ${bInterestRate != null ? `${bInterestRate}%` : "Lender determined / requires bank appraisal"}, Tenure: ${bTenureMonths != null ? `${bTenureMonths} months` : "Per scheme guidelines"}, Moratorium: ${bMoratoriumMonths != null ? `${bMoratoriumMonths} months` : "Per scheme guidelines"})
Monthly Loan EMI: ${bEmiStr}
Monthly Revenue: ${bRevenue != null ? `₹${Number(bRevenue).toLocaleString("en-IN")}` : "Not provided"}
Monthly Expenses: ${bExpenses != null ? `₹${Number(bExpenses).toLocaleString("en-IN")}` : "Not provided"}
Net Monthly Profit: ${bProfitStr}
Annual ROI: ${bRoi != null ? `${bRoi}%` : "Requires input"}
Feasibility: ${bFeasibility} | Affordability: ${bAffordability}
${localMarketStr}`;

      // ================= BACKEND DETERMINISTIC FINANCIAL ARITHMETIC =================
      // LLM MUST NOT PERFORM CORE FINANCIAL ARITHMETIC OR OVERRIDE THESE VALUES
      const numRevenue = bRevenue != null && !isNaN(Number(bRevenue)) ? Number(bRevenue) : null;
      const numExpenses = bExpenses != null && !isNaN(Number(bExpenses)) ? Number(bExpenses) : null;
      const numEmi = bEmiVal != null && !isNaN(Number(bEmiVal)) ? Number(bEmiVal) : null;

      const operatingSurplus = (numRevenue != null && numExpenses != null) ? numRevenue - numExpenses : null;
      const surplusAfterEmi = (operatingSurplus != null && numEmi != null) ? operatingSurplus - numEmi : null;
      const breakEvenRevenue = numExpenses != null ? numExpenses + (numEmi || 0) : null;

      // Dynamic Stress Testing Pre-Calculations
      const parsedAmount = extractAmountFromText(message);
      const isCostIncreaseQuery = /\b(?:costs?|expenses?|kharcha|kharch)\s*(?:increase|rise|grow|badh|badha|badhe|badhta)\b|\b(?:increase|badha|badhe)\s*(?:in\s*)?(?:costs?|expenses?|kharcha)\b/i.test(message) || /खर्च.*बढ़/.test(message);
      const isSalesDropQuery = /\b(?:sales?|revenue|bikri|kamai)\s*(?:drop|fall|decrease|down|lower|kam|ghat|gire)\b|\bwhat\s+if\s+sales\s+are\s+lower\b/i.test(message) || /(?:बिक्री|कमाई).*घट/.test(message);

      let stressCalculationText = "";
      if (isCostIncreaseQuery) {
        const delta = parsedAmount != null && parsedAmount > 0 ? parsedAmount : 5000;
        const curRev = numRevenue ?? 45000;
        const curExp = numExpenses ?? 22000;
        const curE = numEmi ?? 14835;
        const newExp = curExp + delta;
        const curSurplus = curRev - curExp;
        const newOpSurplus = curRev - newExp;
        const newSurplusAfter = newOpSurplus - curE;

        stressCalculationText = `
STRESS TEST PRE-CALCULATED SCENARIO (COST INCREASE):
- Current Stated Revenue: ₹${curRev.toLocaleString("en-IN")}
- Current Stated Operating Costs: ₹${curExp.toLocaleString("en-IN")}
- Monthly EMI: ₹${curE.toLocaleString("en-IN")}
- Cost Increase Tested: +₹${delta.toLocaleString("en-IN")}
- New Stressed Operating Costs: ₹${newExp.toLocaleString("en-IN")}
- Current Operating Surplus: ₹${curSurplus.toLocaleString("en-IN")}
- New Stressed Operating Surplus: ₹${newOpSurplus.toLocaleString("en-IN")}
- New Surplus After EMI: ₹${newSurplusAfter.toLocaleString("en-IN")}
- Serviceability Status: ${newSurplusAfter >= 0 ? `Mathematically serviceable with reduced buffer of ₹${newSurplusAfter.toLocaleString("en-IN")}` : "Deficit / cash flow strain risk"}
(Rule: Quote these exact figures; do not recalculate)`;
      } else if (isSalesDropQuery) {
        const curRev = numRevenue ?? 45000;
        const curExp = numExpenses ?? 22000;
        const curE = numEmi ?? 14835;
        let newRev: number;
        let dropDesc: string;
        if (parsedAmount != null && parsedAmount > 0 && parsedAmount < curRev) {
          if (parsedAmount <= 100) {
            newRev = Math.round(curRev * (1 - parsedAmount / 100));
            dropDesc = `${parsedAmount}% drop`;
          } else {
            newRev = curRev - parsedAmount;
            dropDesc = `₹${parsedAmount.toLocaleString("en-IN")} reduction`;
          }
        } else {
          newRev = Math.round(curRev * 0.7);
          dropDesc = "30% sales drop";
        }
        const newOpSurplus = newRev - curExp;
        const newSurplusAfter = newOpSurplus - curE;

        stressCalculationText = `
STRESS TEST PRE-CALCULATED SCENARIO (SALES DOWNTURN):
- Baseline Stated Revenue: ₹${curRev.toLocaleString("en-IN")}
- Stressed Revenue (${dropDesc}): ₹${newRev.toLocaleString("en-IN")}
- Current Stated Operating Costs: ₹${curExp.toLocaleString("en-IN")}
- Monthly EMI: ₹${curE.toLocaleString("en-IN")}
- New Stressed Operating Surplus: ₹${newOpSurplus.toLocaleString("en-IN")}
- New Surplus After EMI: ₹${newSurplusAfter.toLocaleString("en-IN")}
- Serviceability Status: ${newSurplusAfter >= 0 ? `Mathematically serviceable with reduced buffer of ₹${newSurplusAfter.toLocaleString("en-IN")}` : "Deficit / cash flow strain risk"}
(Rule: Quote these exact figures; do not recalculate)`;
      }

      // Check for scheme questions to inject official scheme dataset
      let schemeOfficialText = "";
      const isSchemeQuery = /\b(documents?|kagaz|dastavez|scheme|eligibility|guidelines|pmmy|pmegp|pmfme|mudra)\b/i.test(message) || /योजना|कागजात|दस्तावेज/.test(message);
      if (isSchemeQuery) {
        const schemeObj = getSchemeDetailsForAdvisor(bScheme, businessContext.businessType || businessContext.category);
        if (schemeObj) {
          schemeOfficialText = `
OFFICIAL GOVERNMENT SCHEME DATASET (JanSamarth / Official Ministry Rules):
- Scheme Name: ${schemeObj.scheme_name} (${schemeObj.short_name || schemeObj.scheme_id})
- Implementing Ministry/Agency: ${schemeObj.ministry || "Ministry of MSME"} / ${schemeObj.implementing_agency || "Member Lending Institutions"}
- Official Documents Required: ${(schemeObj.documents || []).join(", ")}
- Source Organization: ${schemeObj.official_source?.organization || "Official portal"} (Verified date: ${schemeObj.official_source?.verified_date || "2026-09-24"})
- Lender Rule Note: Official lending rate and sanction are determined by the financing bank under applicable scheme rules upon branch appraisal.`;
        }
      }

      // ================= DAIRY SECTOR MACRO-DEMOGRAPHICS & MARKET GAP =================
      // CRITICAL CONDITION: ONLY apply this specific demographic and pricing analysis if the user's business category
      // is "Dairy & Milk Products" (e.g., dairy farm, milk processing, ghee manufacturing). For all other businesses, ignore this section.
      const bCategory = businessContext.businessType || businessContext.category || req.body?.category || "";
      const hasCsvInQuery = message.includes("Dist_Population") || message.includes("[CSV DATA LAYER]");
      const isDairy = isDairyCategory(bCategory) || hasCsvInQuery;

      let dairyOfficialBlock = "";
      let dairyAnalysisData: DairyAnalysisResult | null = null;

      if (isDairy) {
        let customCsv = parseCsvDataLayer(message);
        if (!customCsv && businessContext.csvDataLayer) {
          customCsv = parseCsvDataLayer(businessContext.csvDataLayer);
        }

        let customSourcing = businessContext.localSourcingPrice || businessContext.sourcingPrice || null;
        if (!customSourcing) {
          const matchSourcing = message.match(/(?:sourcing|purchase|buying|procurement|cost|kharid)\s*(?:price|rate|cost)?\s*(?:is|at|of|mein)?\s*₹?\s*([0-9]+(?:\.[0-9]+)?)/i);
          if (matchSourcing) {
            customSourcing = Number(matchSourcing[1]);
          }
        }

        dairyAnalysisData = buildDairyAnalysis({
          district: bDistrict,
          customCsvData: customCsv,
          customSourcingPrice: customSourcing,
          monthlyRevenue: numRevenue,
          monthlyExpenses: numExpenses,
          monthlyEmi: numEmi,
          projectCost: bProjectCost,
        });

        dairyOfficialBlock = `
==== DAIRY SECTOR MACRO-DEMOGRAPHICS & MARKET GAP ====
[CSV DATA LAYER]
${dairyAnalysisData.csv_data_layer}

CRITICAL MANDATORY INSTRUCTIONS FOR DAIRY SECTOR:
1. Price Arbitrage (from Price Layer):
   - Compare Local_Sourcing_Price (₹${dairyAnalysisData.local_sourcing_price.toFixed(2)}/kg) to Nat_Retail_Avg (₹61.45/kg) and Nat_Wholesale_Avg (₹57.63/kg).
   - ${dairyAnalysisData.price_arbitrage.status === "Strong Sourcing Advantage" ? 'Since local cost is significantly lower, you MUST explicitly state that they have a "Strong Sourcing Advantage" and should focus on volume.' : 'Since local cost is near or above the national average, you MUST warn them of "Margin Compression" and advise premium retail packaging.'}

2. Demographic Targeting (from District Gap Layer):
   - Analyze Agri_Workers (${dairyAnalysisData.agri_workers.toLocaleString("en-IN")}) relative to Dist_Population (${dairyAnalysisData.dist_population.toLocaleString("en-IN")}).
   - Since the district has a high concentration of agricultural workers, you MUST suggest a secondary B2B revenue stream tailored to farmers (e.g., selling cattle feed, urea, or tractor rentals).

3. Market Sizing (from Integrated Dataset):
   - Use the district population (${dairyAnalysisData.dist_population.toLocaleString("en-IN")}) to mathematically validate if there are enough potential local buyers to support their proposed production scale and EMI payments.`;
      }

      const preCalculatedBlock = `
DETERMINISTIC PRE-CALCULATED METRICS (AUTHORITATIVE SOURCE OF TRUTH — NEVER RECALCULATE):
- Expected Monthly Revenue: ${numRevenue != null ? `₹${numRevenue.toLocaleString("en-IN")}` : "Not provided"}
- Monthly Operating Costs: ${numExpenses != null ? `₹${numExpenses.toLocaleString("en-IN")}` : "Not provided"}
- Operating Surplus Before EMI: ${operatingSurplus != null ? `₹${operatingSurplus.toLocaleString("en-IN")}` : "Not calculated"}
- Monthly Loan EMI: ${numEmi != null ? `₹${numEmi.toLocaleString("en-IN")}` : "Not calculated"}
- Surplus After EMI: ${surplusAfterEmi != null ? `₹${surplusAfterEmi.toLocaleString("en-IN")}` : "Not calculated"}
- Minimum Break-Even Revenue Needed: ${breakEvenRevenue != null ? `₹${breakEvenRevenue.toLocaleString("en-IN")}` : "Not calculated"}
${stressCalculationText}
${schemeOfficialText}
${dairyOfficialBlock}`;

      const systemInstruction = `You are SAHYOGI (सहयोगी), an intelligent, practical, and highly empathetic rural business advisor and mentor in India.
You have the following verified business and financial data in mind for this entrepreneur:

${profileHeader}
${preCalculatedBlock}

CORE OPERATIONAL RULES:
1. NEVER START RESPONSES WITH A BOILERPLATE PROFILE DUMP OR TEMPLATE.
   - DO NOT start by reciting: "For your business, Total Project Cost is X, Margin is Y, Loan is Z, Profit is W..."
   - The user already knows their business profile. Only cite specific figures if they directly explain the answer to the user's question!
2. THE ANSWER MUST BE DRIVEN EXCLUSIVELY BY THE USER'S EXACT QUESTION.
3. FOLLOW THIS 5-STEP REASONING PROCESS FOR EVERY QUESTION:
   Step 1: Identify what the user is actually asking.
   Step 2: Determine which existing business/project data is relevant to that question.
   Step 3: Use that data to reason about the question.
   Step 4: Answer the question directly in the very first sentence.
   Step 5: Only include other financial or profile information if it helps answer the question.

4. CRITICAL MATHEMATICAL RULE:
   - ALL NUMERICAL FINANCIAL ARITHMETIC IS ALREADY CALCULATED BY BACKEND LOGIC ABOVE.
   - DO NOT perform mental arithmetic or attempt to recalculate figures independently.
   - Quote and interpret the pre-calculated numbers provided above.

5. FINANCIALLY RESPONSIBLE AFFORDABILITY LANGUAGE:
   - Never say: "Yes, you can comfortably afford this" or "This is 100% risk free".
   - Instead, state clearly: "Based on the stated revenue of ₹X and operating costs of ₹Y, the business generates ₹Z before EMI and ₹W after EMI. The EMI is mathematically serviceable under these assumptions, but the remaining margin is limited and actual affordability will depend on sales fluctuations, additional expenses and other business costs."

SPECIFIC GUIDANCE FOR COMMON QUESTION TYPES:

1. MARGIN QUESTIONS (e.g. "Should I increase the margin cost?", "Should I invest more margin?"):
   - Discuss the trade-off directly:
     * Higher promoter margin means more money invested by the user upfront.
     * It reduces the required borrowing amount (below current ${bLoanStr}).
     * It reduces the monthly EMI (below current ${bEmiStr}) and total interest burden over the tenure.
     * CRITICAL RULE: Increasing margin does NOT automatically solve scheme eligibility! If the project cost exceeds the applicable government scheme limit (e.g. Mudra or PMEGP ceiling), contributing more margin will not make it eligible under that scheme — reducing the project size/scale to fit within the ceiling is what is required.
     * Advise keeping sufficient liquid emergency cash for working capital rather than locking all savings into margin.

2. RISK QUESTIONS (e.g. "What are the main risks for this business here?", "What could make this business fail?"):
   - Ground risks in the ACTUAL category (${businessContext.businessType || "enterprise"}) and location (${bDistrict}${bState ? `, ${bState}` : ""}):
     * For aquaculture / fish farming: water aeration, disease outbreak, feed costs, monsoon flooding, perishable transport.
     * For dairy / livestock: cattle disease, feed inflation, summer lactation drop, milk chilling.
     * For poultry: epidemic diseases, maize/feed volatility, heat stress, wholesale price swings.
     * For agriculture: rainfall irregularity, pest attacks, post-harvest mandi pricing, input costs.
     * For retail / trade: customer credit (udhaari) freezing working capital, slow inventory, competition.
   - DEBT SERVICING RULE:
     * DO NOT say there is a debt-servicing risk when loan is ₹0 or EMI is ₹0! Only discuss EMI risk if debt actually exists.

3. COST REDUCTION QUESTIONS (e.g. "How can I lower my initial setup cost?"):
   - Provide practical strategies: phased capacity rollout, leasing premises/equipment instead of buying, procuring tested refurbished machinery, scaling down initial pilot.
   - Explain how lowering project size directly cuts required 10% promoter margin and cuts monthly EMI.

4. SCHEME DOCUMENTS & RULES:
   - Use the official scheme documents list provided above. Mention that final approval and interest rate require official bank branch appraisal.

LANGUAGE & TONE:
- Respond naturally in: ${selectedLanguage}.
- If user asks in Hinglish, respond in natural, friendly Hinglish.
- If user asks in Hindi, respond in clear, respectful Hindi.
- Keep answers concise, direct, and conversational (this is spoken in Voice Mode).`;

      // Helper to generate deterministic fallback when Gemini is unavailable
      const runFallback = () => {
        const isDairyQuery = isDairy && (
          hasCsvInQuery ||
          /\b(dairy|milk|price arbitrage|sourcing advantage|margin compression|demographic targeting|agri_workers|market sizing|potential local buyers|cattle feed|secondary b2b|tractor rentals)\b/i.test(message)
        );

        if (isDairyQuery && dairyAnalysisData) {
          const answerText = selectedLanguage === "Hindi" || rawLang === "hi"
            ? dairyAnalysisData.summary_report_hi
            : dairyAnalysisData.summary_report;
          return { answer: answerText };
        }

        return handleAdvisor({
          question: message,
          business_name: bName,
          category: businessContext.businessType || businessContext.category,
          monthly_revenue: bRevenue,
          monthly_expenses: bExpenses,
          monthly_profit: bProfit,
          roi_percentage: bRoi,
          affordability_status: bAffordability,
          monthly_emi: bEmiVal,
          eligible_loan: bLoanVal,
          project_cost: bProjectCost,
          promoter_margin: bMarginVal,
          scheme_name: bScheme,
          interest_rate: bInterestRate,
          loan_tenure_months: bTenureMonths,
          moratorium_months: bMoratoriumMonths,
          local_demand: businessContext.localDemand,
          competition_level: businessContext.competitionLevel,
          feasibility: bFeasibility,
          district: bDistrict,
          state: bState,
          block: businessContext.block,
          language: selectedLanguage,
          history: req.body?.history,
        });
      };

      const geminiClient = getGeminiClient();
      if (!geminiClient) {
        const fallback = runFallback();
        res.json({
          reply: fallback.answer,
          answer: fallback.answer,
          text: fallback.answer,
          source: "fallback",
          fallbackReason: "API_KEY_UNCONFIGURED",
          dairy_analysis: isDairy ? dairyAnalysisData : undefined,
        });
        return;
      }

      // Build multi-turn conversational contents for Gemini
      const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];
      const geminiContents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

      for (const item of rawHistory) {
        if (item && item.text && typeof item.text === "string") {
          const role = item.role === "assistant" || item.role === "model" ? "model" : "user";
          geminiContents.push({
            role,
            parts: [{ text: item.text.trim() }],
          });
        }
      }
      geminiContents.push({
        role: "user",
        parts: [{ text: message }],
      });

      // Non-streaming response with robust timeout protection
      let answerText = "";
      let errorCategory = "";
      try {
        const primaryPromise = geminiClient.models.generateContent({
          model: "gemini-3.8-flash",
          contents: geminiContents as any,
          config: {
            systemInstruction,
            temperature: 0.6,
          },
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Gemini generateContent timed out")), 7000)
        );
        const response = await Promise.race([primaryPromise, timeoutPromise]);
        answerText = response.text ? response.text.trim() : "";
      } catch (genErr: any) {
        const errInfo = categorizeGeminiError(genErr);
        errorCategory = errInfo.category;
        console.warn(`[Advisor Gemini Primary Failed] Category: ${errInfo.category} - ${errInfo.description}`);
        try {
          const fallbackPromise = geminiClient.models.generateContent({
            model: "gemini-flash-latest",
            contents: geminiContents as any,
            config: {
              systemInstruction,
              temperature: 0.6,
            },
          });
          const fbTimeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Gemini fallback model timed out")), 4000)
          );
          const fallbackAi = await Promise.race([fallbackPromise, fbTimeoutPromise]);
          answerText = fallbackAi.text ? fallbackAi.text.trim() : "";
        } catch (genErr2: any) {
          const errInfo2 = categorizeGeminiError(genErr2);
          errorCategory = errInfo2.category;
          console.warn(`[Advisor Gemini Fallback Failed] Category: ${errInfo2.category} - ${errInfo2.description}`);
        }
      }

      if (answerText) {
        res.json({
          answer: answerText,
          reply: answerText,
          text: answerText,
          source: "gemini",
          dairy_analysis: isDairy ? dairyAnalysisData : undefined,
        });
        return;
      }

      // Deterministic rule-based mentor fallback
      const fallback = runFallback();
      res.json({
        answer: fallback.answer,
        reply: fallback.answer,
        text: fallback.answer,
        source: "fallback",
        fallbackReason: errorCategory || "FALLBACK_CALLED",
        dairy_analysis: isDairy ? dairyAnalysisData : undefined,
      });
    } catch (err: any) {
      const errInfo = categorizeGeminiError(err);
      console.error(`[Advisor Top-Level Error] Category: ${errInfo.category} - ${errInfo.description}`);
      res.status(500).json({
        error: "Advisor service encountered an error",
        reply: "माफ़ कीजिए, अभी सलाहकार सेवा में समस्या आ रही है। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
        fallbackReason: errInfo.category,
      });
    }
  };

  app.post("/api/advisor", advisorHandler);
  app.post("/advisor", advisorHandler); // Compatibility alias
  app.post("/api/advisor-chat", advisorHandler); // Compatibility alias

  // 7. Udyam Registration Verification Route (Canonical: POST /api/verify-udyam)
  app.post("/api/verify-udyam", async (req: express.Request, res: express.Response) => {
    try {
      const { udyamNumber } = req.body;
      if (!udyamNumber || typeof udyamNumber !== "string") {
        res.status(400).json({
          success: false,
          error: "Udyam registration number is required",
        });
        return;
      }

      const cleanUdyam = udyamNumber.trim().toUpperCase();

      // Format check (e.g. UDYAM-XX-00-0000000)
      const udyamRegex = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/i;
      if (!udyamRegex.test(cleanUdyam)) {
        res.status(400).json({
          success: false,
          error: "Invalid Udyam Registration Number format. Expected format: UDYAM-XX-00-0000000",
        });
        return;
      }

      const apiKey = process.env.UDYAM_API_KEY;
      if (!apiKey) {
        // Honest response when external verification provider is unconfigured
        res.status(200).json({
          success: false,
          serviceConfigured: false,
          error: "Official Udyam verification API gateway is not configured on this server. Please enter your enterprise details manually below.",
        });
        return;
      }

      const providerUrl = "https://api.udyamverification.provider.com/v1/verify";
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch(providerUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "x-api-key": apiKey,
          },
          body: JSON.stringify({ udyamNumber: cleanUdyam }),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!response.ok) {
          res.status(502).json({
            success: false,
            error: "Government Udyam portal returned an error. Please enter your enterprise details manually.",
          });
          return;
        }

        const responseData = await response.json();
        if (responseData && responseData.enterpriseName) {
          res.json({
            success: true,
            enterpriseName: responseData.enterpriseName,
            classification: responseData.classification || "Micro",
            state: responseData.state || "",
            district: responseData.district || "",
            pincode: responseData.pincode || "",
          });
          return;
        }

        res.status(404).json({
          success: false,
          error: "No enterprise record found for the provided Udyam number.",
        });
      } catch (fetchErr: any) {
        clearTimeout(timer);
        res.status(503).json({
          success: false,
          error: "Udyam verification service is temporarily unreachable. Please enter your details manually.",
        });
      }
    } catch (error: any) {
      console.error("Udyam verification error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error during Udyam verification",
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Vyapaar AI Server running on http://localhost:${PORT}`);
  });
}

startServer();
