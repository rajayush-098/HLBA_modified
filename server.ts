import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { handleAdvisor, handleAnalyze } from "./src/advisorLogic";
import { MEERUT_DATA, getTehsilMarketReach } from "./locationData";
import rawBlocksData from "./src/rawBlocksData.json";

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
        (Number(req.body?.investment || 100000) / 0.1);

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

      const prompt = `You are an honest, experienced rural business advisor in India.
The user wants to start a ${business_category} business in ${locationLabel}${pin ? ` (PIN: ${pin})` : ""}.
Context: Estimated Catchment: ~${hyperLocalData.reachable_consumers} consumers; Zone: ${hyperLocalData.zone_classification}; Estimated Project Cost: ₹${projectCost}; Screened Scheme: ${schemeRoute}.

Generate a market_summary consisting of EXACTLY TWO flowing paragraphs (about 6 to 8 sentences total):

Paragraph 1: Discuss the demand viability for a ${business_category} in ${locationLabel}. Note that actual local competition should be confirmed by a physical field visit, and discuss whether the local catchment can support steady sales. State clearly that scheme sanction is subject to official bank appraisal.

Paragraph 2: Provide a practical, low-cost operational tip on how the entrepreneur can gain customer trust in rural/semi-urban markets (e.g., direct relationships, weekly market presence, quality consistency, fair pricing).

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
        market_summary =
          rawLang === "hi"
            ? `स्थानीय बाज़ार में ${business_category} के लिए नियमित उपभोक्ता माँग का अनुमान लगाया गया है। इस क्षेत्र में सफलता मुख्य रूप से उचित मूल्य निर्धारण और ग्राहकों के विश्वास पर निर्भर करेगी। सरकारी लोन योजना (${schemeRoute}) के तहत पात्रता एक प्रारंभिक स्क्रीनिंग है जिसकी अंतिम स्वीकृति बैंक सत्यापन पर निर्भर है।\n\nग्राहकों का विश्वास तेज़ी से बनाने के लिए पहले दिन से ही उत्पाद की गुणवत्ता और समय पर सेवा पर विशेष ध्यान दें। नज़दीकी परिवारों व स्थानीय दुकानदारों से सीधा संपर्क रखें और बाज़ार में अपनी नियमित उपस्थिति दर्ज कराएं।`
            : `There is steady daily demand potential for ${business_category} across ${locationLabel}. Business viability will depend heavily on maintaining competitive pricing and building direct community trust. Note that government scheme (${schemeRoute}) alignment is a preliminary screening and final sanction depends on bank appraisal.\n\nTo build initial customer loyalty, focus on consistent product purity and transparent dealings rather than relying solely on foot traffic. Cultivating direct relationships with local families and neighborhood stores will generate reliable repeat business.`;
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
      const bMargin =
        businessContext.promoterMargin != null
          ? `₹${Number(businessContext.promoterMargin).toLocaleString("en-IN")}`
          : "Not specified";
      const bLoan =
        businessContext.eligibleLoan != null
          ? `₹${Number(businessContext.eligibleLoan).toLocaleString("en-IN")}`
          : "Not specified";
      const bEmi =
        businessContext.monthlyEmi != null
          ? `₹${Number(businessContext.monthlyEmi).toLocaleString("en-IN")}`
          : "Not specified";

      const localMarketStr =
        businessContext.localMarketContext ||
        "Local Market Context: Live field scan data pending or not supplied.";

      const profileHeader = `Profile: ${bName}, ${bDistrict}${bState ? `, ${bState}` : ""}\nScreened Scheme: ${bScheme}\nMargin: ${bMargin} | Screened Loan: ${bLoan} | EMI: ${bEmi}\n${localMarketStr}`;

      const serializedContext =
        typeof businessContext === "string"
          ? businessContext
          : `${profileHeader}\n\n${JSON.stringify(businessContext, null, 2)}`;

      const systemInstruction = `You are SAHYOGI, a practical rural business mentor in India.
You are advising an entrepreneur on the following business profile:

${serializedContext}

Guidelines:
- Reference their actual numbers where provided. If figures are not provided, do not fabricate them.
- If real-time map data is present, incorporate it realistically. If map data was unavailable, acknowledge it honestly.
- Remind the user that government scheme eligibility is an indicative screening, and official loan sanction requires lender appraisal.
- Provide step-by-step, actionable guidance in: ${selectedLanguage}.`;

      const geminiClient = getGeminiClient();
      if (!geminiClient) {
        const fallback = handleAdvisor({
          question: message,
          business_name: bName,
          category: businessContext.businessType,
          monthly_revenue: businessContext.monthlyRevenue,
          monthly_expenses: businessContext.monthlyExpenses,
          monthly_profit: businessContext.monthlyProfit,
          roi_percentage: businessContext.roiPercentage,
          affordability_status: businessContext.affordabilityStatus,
          monthly_emi: businessContext.monthlyEmi,
          local_demand: businessContext.localDemand,
          competition_level: businessContext.competitionLevel,
          feasibility: businessContext.feasibility,
        });
        res.json({
          reply: fallback.answer,
          answer: fallback.answer,
          text: fallback.answer,
          source: "fallback",
        });
        return;
      }

      // Non-streaming response
      let answerText = "";
      try {
        const response = await geminiClient.models.generateContent({
          model: "gemini-3.8-flash",
          contents: message,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        answerText = response.text ? response.text.trim() : "";
      } catch (genErr: any) {
        console.warn("Advisor Gemini primary attempt failed, retrying with fallback model:", genErr?.message || genErr);
        try {
          const fallbackAi = await geminiClient.models.generateContent({
            model: "gemini-flash-latest",
            contents: message,
            config: {
              systemInstruction,
              temperature: 0.7,
            },
          });
          answerText = fallbackAi.text ? fallbackAi.text.trim() : "";
        } catch (genErr2) {
          console.warn("Advisor Gemini fallback model failed:", genErr2);
        }
      }

      if (answerText) {
        res.json({
          answer: answerText,
          reply: answerText,
          text: answerText,
          source: "gemini",
        });
        return;
      }

      // Deterministic rule-based mentor fallback
      const fallback = handleAdvisor({
        question: message,
        business_name: bName,
        category: businessContext.businessType,
        monthly_revenue: businessContext.monthlyRevenue,
        monthly_expenses: businessContext.monthlyExpenses,
        monthly_profit: businessContext.monthlyProfit,
        monthly_emi: businessContext.monthlyEmi,
        local_demand: businessContext.localDemand,
        competition_level: businessContext.competitionLevel,
        feasibility: businessContext.feasibility,
      });
      res.json({
        answer: fallback.answer,
        reply: fallback.answer,
        text: fallback.answer,
        source: "fallback",
      });
    } catch (err: any) {
      console.error("Advisor error:", err);
      res.status(500).json({
        error: "Advisor service encountered an error",
        reply: "माफ़ कीजिए, अभी सलाहकार सेवा में समस्या आ रही है। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
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
