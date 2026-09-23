import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { handleAdvisor, handleAnalyze } from "./src/advisorLogic";
import { MEERUT_DATA, getTehsilMarketReach } from "./locationData";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

let genAIClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  return ai;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/status", (_req, res) => {
    res.json({
      message: "Vyapaar AI API is running!",
      status: "success",
    });
  });

  // SAHYOGI AI Assistant powered by Gemini API
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
            "नमस्ते! मैं सहयोगी (SAHYOGI) हूँ। मैं आपकी सहायता के लिए तैयार हूँ। सर्वर में अभी GEMINI_API_KEY सेट नहीं है, कृपया Settings > Secrets में अपनी Gemini API key जोड़ें। तब तक आप मुझसे कोई भी सामान्य सवाल पूछ सकते हैं!",
          source: "fallback",
        });
        return;
      }

      let contextStr = "";
      if (context && typeof context === "object") {
        contextStr = `\nCurrent User Business Context: ${JSON.stringify(context)}`;
      }

      const systemInstruction = `You are "SAHYOGI", a friendly, humble, and polite AI assistant and business companion built for the "Vyapaar AI" rural business project.
Core Guidelines:
- You are not a cold, corporate robot. Avoid phrases like 'As an AI language model' or overly technical jargon.
- Answer in the language the user speaks (Hindi, Hinglish, or simple English).
- You can answer ANY type of question: business doubts, loan schemes, shop tips, calculations, how to use Vyapaar AI, general knowledge, student queries, or casual chat.
- Keep your explanations down-to-earth, simple, and practical, like a helpful friend and wise business guide.
${contextStr}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: message,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const reply =
        response.text ||
        "माफ़ कीजिए, मुझे उत्तर नहीं मिल पाया। कृपया अपना सवाल दोबारा पूछें!";
      res.json({ reply, source: "gemini" });
    } catch (error: any) {
      console.error("Sahyogi Gemini error:", error);
      res.status(500).json({
        error: error?.message || "Internal server error",
        reply:
          "माफ़ कीजिए, अभी नेटवर्क या सर्वर में थोड़ी दिक्कत आ रही है। कृपया थोड़ी देर बाद दोबारा पूछें।",
      });
    }
  };

  app.post("/api/sahyogi", sahyogiHandler);
  app.post("/api/smrity", sahyogiHandler);

  // Hyper-local Location & Market Reach routes for SIH 2026 Prototype
  const getMarketReachHandler = (req: express.Request, res: express.Response) => {
    const district = (req.query.district as string) || (req.body?.district as string) || "Meerut";
    const tehsil =
      (req.query.tehsil as string) ||
      (req.query.block as string) ||
      (req.body?.tehsil as string) ||
      (req.body?.block as string) ||
      "Meerut";
    const radiusParam = req.query.radiusKm || req.query.radius_km || req.body?.radiusKm || req.body?.radius_km;
    const radiusKm = radiusParam ? parseFloat(String(radiusParam)) : 5;

    const reach = getTehsilMarketReach(district, tehsil, radiusKm);
    if (!reach) {
      res.status(404).json({
        error: `Hyper-local reach data not found for district "${district}". Currently verified for Meerut district.`,
        district,
        tehsil,
        available_districts: ["Meerut"],
        available_tehsils: Object.keys(MEERUT_DATA.tehsils),
      });
      return;
    }

    res.json(reach);
  };

  app.get("/api/market-reach", getMarketReachHandler);
  app.post("/api/market-reach", getMarketReachHandler);
  app.get("/market-reach", getMarketReachHandler);
  app.post("/market-reach", getMarketReachHandler);

  app.get("/api/location/meerut", (_req, res) => {
    res.json(MEERUT_DATA);
  });

  app.get(["/api/locations/tehsils", "/locations/tehsils"], (req, res) => {
    const district = ((req.query.district as string) || "").trim();
    if (district.toLowerCase() === "meerut") {
      res.json({
        district: MEERUT_DATA.district,
        has_verified_data: true,
        tehsils: Object.keys(MEERUT_DATA.tehsils),
        details: MEERUT_DATA.tehsils,
      });
    } else {
      res.json({
        district,
        has_verified_data: false,
        tehsils: [],
      });
    }
  });

  app.get("/api/location-data", (_req, res) => {
    res.json({
      districts: [MEERUT_DATA],
    });
  });

  const analyzeHandler = async (req: express.Request, res: express.Response) => {
    try {
      const result = handleAnalyze(req.body);
      const business_category = req.body?.category || result.category || "Dairy";
      const location = req.body?.location || result.location || "Meerut";
      const district = req.body?.district || result.district || "Meerut";
      const tehsil = req.body?.block || req.body?.location || "Meerut";
      const radiusKm = req.body?.radius_km || req.body?.radiusKm || 5;
      
      // --> NEW: Grab the PIN code from the React frontend
      const pin = req.body?.pin || "Unknown PIN";

      const hyperLocalData = getTehsilMarketReach(district, tehsil, Number(radiusKm)) || {
        radius_km: 5,
        reachable_consumers: 76340,
        reachable_households: 12830,
        zone_classification: "Semi-Urban / Agricultural",
        dominant_local_clusters: ["Handloom", "Dairy", "Sugarcane"],
        district_bottlenecks: MEERUT_DATA.bottlenecks,
      };

      const projectCost =
        result.scheme_analysis?.project_cost ||
        (Number(req.body?.investment || 100000) / 0.1);

      const category = String(business_category).toLowerCase();
      let schemeRoute = "";
      let schemeDetails = "";

      // 1. Check for Agriculture / Farming first (Excluded from MUDRA/PMEGP)
      if (category.includes("farm") || category.includes("agriculture") || category.includes("crop") || category.includes("dairy")) {
          schemeRoute = "Kisan Credit Card (KCC) / Animal Husbandry Infrastructure Development Fund (AHIDF)";
          schemeDetails = "MUDRA does not cover direct farming. KCC provides short-term credit for agriculture/dairy at ~4% interest (with prompt repayment). AHIDF supports dairy/meat processing infrastructure.";
      } 
      // 2. Standard Non-Farm Micro/Small Business Routing
      else {
          if (projectCost <= 50000) {
              schemeRoute = "MUDRA Yojana - Shishu";
              schemeDetails = "Up to ₹50,000. Collateral-free. Ideal for micro-shops, vendors, and starting village industries. Interest rate ~8-12%.";
          } else if (projectCost <= 500000) {
              schemeRoute = "MUDRA Yojana - Kishore";
              schemeDetails = "₹50,001 to ₹5 Lakh. Collateral-free. Designed for buying equipment, inventory, or initial expansion. Interest rate ~8.6-11%.";
          } else if (projectCost <= 1000000) {
              schemeRoute = "MUDRA Yojana - Tarun";
              schemeDetails = "₹5 Lakh to ₹10 Lakh. Collateral-free. For established micro-units scaling up operations. Interest rate ~11-12%.";
          } else {
              schemeRoute = "PMEGP (Prime Minister's Employment Generation Programme)";
              schemeDetails = "Up to ₹50 Lakh (Manufacturing) / ₹20 Lakh (Service). Provides 15-35% margin money subsidy. Must be a new project.";
          }
      }

      if (result.scheme_analysis) {
        result.scheme_analysis.scheme_name = schemeRoute;
        (result.scheme_analysis as any).description = schemeDetails;
      }

      if (district && district.toLowerCase() === "meerut") {
        if (result.hyper_local_profile) {
          result.hyper_local_profile.market_reach = {
            ...result.hyper_local_profile.market_reach,
            ...hyperLocalData,
            consumer_base: `${hyperLocalData.reachable_consumers.toLocaleString("en-IN")} reachable consumers (~${hyperLocalData.reachable_households.toLocaleString("en-IN")} households)`,
            consumer_base_status: "Verified SIH 2026 Tehsil Dataset",
            data_source: `SIH 2026 Hyper-Local Tehsil Census Dataset (${hyperLocalData.zone_classification})`,
            confidence: "High (Census-calibrated)",
          };
          if (hyperLocalData.dominant_local_clusters?.length) {
            (result.hyper_local_profile as any).dominant_clusters = hyperLocalData.dominant_local_clusters;
          }
          if (hyperLocalData.district_bottlenecks?.length) {
            (result.hyper_local_profile as any).district_bottlenecks = hyperLocalData.district_bottlenecks;
          }
        }
      }

      // --> NEW: Added PIN to the Gemini prompt for hyper-local accuracy
      const prompt = `You are an expert rural micro-enterprise consultant for the Government of India. The user wants to start a ${business_category} business in ${location}, ${district} (PIN Code: ${pin}).
FINANCIALS: Project Cost: ₹${projectCost}, Recommended Scheme: ${schemeRoute}. 
LOCAL MARKET DATA (DO NOT HALLUCINATE): 5km Reach: ${hyperLocalData.reachable_consumers} consumers. Zone Type: ${hyperLocalData.zone_classification}. Local Bottlenecks: ${Array.isArray(hyperLocalData.district_bottlenecks) ? hyperLocalData.district_bottlenecks.join("; ") : hyperLocalData.district_bottlenecks}.
Generate a strict 6-point Business Feasibility Report covering: 1. 5-10 km Market Catchment 2. Opportunity & Underserved Niche 3. Localized SWOT Analysis 4. Ground-Level Risk & Bottleneck Mapping 5. Competitor Density 6. Pricing Power & Unit Economics.`;

      let feasibility_report = "";
      try {
        const aiResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });
        feasibility_report = aiResponse.text || "";
      } catch (geminiErr: any) {
        console.error("Gemini feasibility report error:", geminiErr);
        feasibility_report = `1. 5-10 km Market Catchment: Primary reach covers ${hyperLocalData.reachable_consumers.toLocaleString("en-IN")} consumers across ${hyperLocalData.zone_classification}.
2. Opportunity & Underserved Niche: Unmet demand for local ${business_category} products with value-added processing.
3. Localized SWOT Analysis: High population density and accessible mandi links offset by initial working capital needs.
4. Ground-Level Risk & Bottleneck Mapping: Local bottlenecks to navigate: ${Array.isArray(hyperLocalData.district_bottlenecks) ? hyperLocalData.district_bottlenecks.join("; ") : hyperLocalData.district_bottlenecks}.
5. Competitor Density: Moderate competition within rural haat bazaars and semi-urban clusters.
6. Pricing Power & Unit Economics: Viable financial foundation based on ₹${projectCost} project cost and ${schemeRoute}.`;
      }

      res.json({
        ...result,
        scheme_route: schemeRoute,
        scheme_details: schemeDetails,
        feasibility_report,
      });
    } catch (err: any) {
      console.error("Analyze error:", err);
      res.status(500).json({ error: err?.message || "Failed to analyze business" });
    }
  };

  app.post("/analyze", analyzeHandler);
  app.post("/api/analyze", analyzeHandler);

  const advisorHandler = (req: express.Request, res: express.Response) => {
    try {
      const result = handleAdvisor(req.body);
      res.json(result);
    } catch (err: any) {
      console.error("Advisor error:", err);
      res.status(500).json({ error: err?.message || "Failed to process advisor request" });
    }
  };

  app.post("/advisor", advisorHandler);
  app.post("/api/advisor", advisorHandler);

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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
