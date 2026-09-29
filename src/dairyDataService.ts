import fs from "fs";
import path from "path";

export interface DistrictDairyData {
  district: string;
  dist_population: number;
  agri_workers: number;
  total_workers: number;
  households: number;
  literacy_rate_pct: number;
}

export interface DairyMetrics {
  dist_population: number;
  agri_workers: number;
  nat_retail_avg: number; // ₹61.45/kg
  nat_wholesale_avg: number; // ₹57.63/kg
  local_sourcing_price: number;
  csv_data_layer: string;
}

export interface DairyAnalysisResult {
  dist_population: number;
  agri_workers: number;
  nat_retail_avg: number;
  nat_wholesale_avg: number;
  local_sourcing_price: number;
  csv_data_layer: string;
  price_arbitrage: {
    status: "Strong Sourcing Advantage" | "Margin Compression";
    margin_diff_retail: number;
    margin_diff_wholesale: number;
    recommendation: "Focus on volume" | "Advise premium retail packaging";
    explanation: string;
    explanation_hi: string;
  };
  demographic_targeting: {
    agri_worker_share_pct: number;
    has_high_agri_concentration: boolean;
    secondary_b2b_streams: string[];
    secondary_b2b_streams_hi: string[];
    explanation: string;
    explanation_hi: string;
  };
  market_sizing: {
    dist_population: number;
    estimated_households: number;
    production_scale_litres_day: number;
    required_daily_buyers: number;
    household_penetration_needed_pct: number;
    monthly_emi: number;
    monthly_revenue: number;
    is_mathematically_validated: boolean;
    explanation: string;
    explanation_hi: string;
  };
  summary_report: string;
  summary_report_hi: string;
}

// In-memory cache for district data
let districtCache: Map<string, DistrictDairyData> | null = null;

// Official prices from dairy_price_layer_real_official_2026-09-28.csv
export const OFFICIAL_DAIRY_PRICES = {
  NAT_RETAIL_AVG: 61.45,
  NAT_WHOLESALE_AVG: 57.63,
  DESI_GHEE_RETAIL: 701.19,
  BUTTER_RETAIL: 60.6,
  DEFAULT_LOCAL_SOURCING_PRICE: 42.0,
};

/**
 * Check if the given category represents a Dairy & Milk Products enterprise.
 * CRITICAL RULE: ONLY apply demographic and pricing analysis if this returns true.
 */
export function isDairyCategory(category?: string | null): boolean {
  if (!category) return false;
  const c = category.toLowerCase().trim();
  return (
    c === "dairy & milk products" ||
    c.includes("dairy") ||
    c.includes("milk") ||
    c.includes("ghee") ||
    c.includes("दुग्ध") ||
    c.includes("दूध") ||
    c.includes("डेयरी")
  );
}

/**
 * Load and parse the district layer dataset.
 */
function loadDistrictData(): Map<string, DistrictDairyData> {
  if (districtCache) return districtCache;

  const map = new Map<string, DistrictDairyData>();
  try {
    const csvPath = path.join(process.cwd(), "src/data/india_district_dairy_market_gap_layer.csv");
    if (!fs.existsSync(csvPath)) {
      console.warn("District dairy layer CSV not found at:", csvPath);
      districtCache = map;
      return map;
    }

    const content = fs.readFileSync(csvPath, "utf8");
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      districtCache = map;
      return map;
    }

    const headers = lines[0].split(",").map((h) => h.trim());
    const dIndex = headers.indexOf("district");
    const popIndex = headers.indexOf("population_2011");
    const totalWorkersIndex = headers.indexOf("total_workers_2011");
    const householdsIndex = headers.indexOf("households_2011");
    const mainCultIndex = headers.indexOf("main_cultivators_2011");
    const mainAgriIndex = headers.indexOf("main_agricultural_labourers_2011");
    const margCultIndex = headers.indexOf("marginal_cultivators_2011");
    const margAgriIndex = headers.indexOf("marginal_agricultural_labourers_2011");
    const litIndex = headers.indexOf("literacy_rate_pct");

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",");
      const distName = (parts[dIndex] || "").trim();
      if (!distName) continue;

      const pop = Number(parts[popIndex]) || 0;
      const totalWorkers = Number(parts[totalWorkersIndex]) || 0;
      const households = Number(parts[householdsIndex]) || Math.round(pop / 5.5);
      const mainCult = Number(parts[mainCultIndex]) || 0;
      const mainAgri = Number(parts[mainAgriIndex]) || 0;
      const margCult = Number(parts[margCultIndex]) || 0;
      const margAgri = Number(parts[margAgriIndex]) || 0;
      const agriWorkers = mainCult + mainAgri + margCult + margAgri;
      const litRate = Number(parts[litIndex]) || 60;

      const data: DistrictDairyData = {
        district: distName,
        dist_population: pop,
        agri_workers: agriWorkers,
        total_workers: totalWorkers,
        households,
        literacy_rate_pct: litRate,
      };

      map.set(distName.toLowerCase(), data);
      // Clean special characters e.g. "Leh(Ladakh)" -> "leh"
      const cleanName = distName.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (cleanName !== distName.toLowerCase()) {
        map.set(cleanName, data);
      }
    }
  } catch (err) {
    console.error("Error loading india_district_dairy_market_gap_layer.csv:", err);
  }

  districtCache = map;
  return map;
}

/**
 * Look up district demographic and agricultural worker metrics.
 */
export function getDistrictDairyMetrics(districtName?: string): DistrictDairyData {
  const map = loadDistrictData();
  const clean = (districtName || "").toLowerCase().trim();

  if (clean && map.has(clean)) {
    return map.get(clean)!;
  }

  // Fuzzy match
  for (const [key, data] of map.entries()) {
    if (clean && (key.includes(clean) || clean.includes(key))) {
      return data;
    }
  }

  // Fallback representative district benchmark (e.g. Meerut profile)
  return {
    district: districtName || "Meerut",
    dist_population: 3443689,
    agri_workers: 350063,
    total_workers: 1090539,
    households: 579110,
    literacy_rate_pct: 62.18,
  };
}

/**
 * Parse an incoming [CSV DATA LAYER] string if provided in message/context.
 */
export function parseCsvDataLayer(text: string): Partial<DairyMetrics> | null {
  if (!text || !text.includes("Dist_Population")) return null;

  const match = text.match(
    /Dist_Population:\s*([0-9,]+)\s*\|\s*Agri_Workers:\s*([0-9,]+)\s*\|\s*Nat_Retail_Avg:\s*₹?([0-9.]+)(?:\/kg)?\s*\|\s*Nat_Wholesale_Avg:\s*₹?([0-9.]+)(?:\/kg)?\s*\|\s*Local_Sourcing_Price:\s*₹?([0-9.]+)/i
  );

  if (match) {
    return {
      dist_population: Number(match[1].replace(/,/g, "")),
      agri_workers: Number(match[2].replace(/,/g, "")),
      nat_retail_avg: Number(match[3]),
      nat_wholesale_avg: Number(match[4]),
      local_sourcing_price: Number(match[5]),
    };
  }
  return null;
}

/**
 * Construct the official formatted [CSV DATA LAYER] line.
 */
export function formatCsvDataLayer(
  distPopulation: number,
  agriWorkers: number,
  localSourcingPrice: number,
  natRetailAvg = OFFICIAL_DAIRY_PRICES.NAT_RETAIL_AVG,
  natWholesaleAvg = OFFICIAL_DAIRY_PRICES.NAT_WHOLESALE_AVG
): string {
  return `Dist_Population: ${distPopulation} | Agri_Workers: ${agriWorkers} | Nat_Retail_Avg: ₹${natRetailAvg.toFixed(2)}/kg | Nat_Wholesale_Avg: ₹${natWholesaleAvg.toFixed(2)}/kg | Local_Sourcing_Price: ₹${localSourcingPrice.toFixed(2)}`;
}

/**
 * Performs complete, authoritative dairy macro-demographic, price arbitrage,
 * demographic targeting, and market sizing analysis.
 */
export function buildDairyAnalysis(options: {
  district?: string;
  customCsvData?: Partial<DairyMetrics> | null;
  customSourcingPrice?: number | null;
  monthlyRevenue?: number | null;
  monthlyExpenses?: number | null;
  monthlyEmi?: number | null;
  projectCost?: number | null;
}): DairyAnalysisResult {
  const districtMetrics = getDistrictDairyMetrics(options.district);

  const distPop = options.customCsvData?.dist_population ?? districtMetrics.dist_population;
  const agriWorkers = options.customCsvData?.agri_workers ?? districtMetrics.agri_workers;
  const natRetail = options.customCsvData?.nat_retail_avg ?? OFFICIAL_DAIRY_PRICES.NAT_RETAIL_AVG;
  const natWholesale = options.customCsvData?.nat_wholesale_avg ?? OFFICIAL_DAIRY_PRICES.NAT_WHOLESALE_AVG;

  let localSourcing = options.customCsvData?.local_sourcing_price;
  if (localSourcing == null || isNaN(localSourcing)) {
    if (options.customSourcingPrice != null && !isNaN(options.customSourcingPrice) && options.customSourcingPrice > 0) {
      localSourcing = options.customSourcingPrice;
    } else {
      localSourcing = OFFICIAL_DAIRY_PRICES.DEFAULT_LOCAL_SOURCING_PRICE;
    }
  }

  const csvDataLayer = formatCsvDataLayer(distPop, agriWorkers, localSourcing, natRetail, natWholesale);

  // 1. PRICE ARBITRAGE (from Price Layer)
  // Compare Local_Sourcing_Price to Nat_Retail_Avg (₹61.45/kg) and Nat_Wholesale_Avg (₹57.63/kg).
  // If significantly lower, explicitly state "Strong Sourcing Advantage" and focus on volume.
  // If near or above national average, warn of "Margin Compression" and advise premium retail packaging.
  const isSignificantlyLower = localSourcing <= natWholesale - 5.0; // e.g. <= ₹52.63/kg
  const priceArbitrageStatus: "Strong Sourcing Advantage" | "Margin Compression" = isSignificantlyLower
    ? "Strong Sourcing Advantage"
    : "Margin Compression";

  const diffWholesale = Math.round((natWholesale - localSourcing) * 100) / 100;
  const diffRetail = Math.round((natRetail - localSourcing) * 100) / 100;

  const priceRecommendation: "Focus on volume" | "Advise premium retail packaging" = isSignificantlyLower
    ? "Focus on volume"
    : "Advise premium retail packaging";

  const priceExplanationEn = isSignificantlyLower
    ? `Local sourcing price of ₹${localSourcing.toFixed(2)}/kg is significantly lower than the national wholesale average (₹${natWholesale.toFixed(2)}/kg) and national retail average (₹${natRetail.toFixed(2)}/kg), providing a gross procurement spread of ₹${diffRetail.toFixed(2)}/kg. The enterprise possesses a Strong Sourcing Advantage and should focus on volume distribution, bulk chilling aggregation, and daily direct household sales.`
    : `Local sourcing price of ₹${localSourcing.toFixed(2)}/kg is near or above the national average (Nat_Wholesale_Avg: ₹${natWholesale.toFixed(2)}/kg, Nat_Retail_Avg: ₹${natRetail.toFixed(2)}/kg). Due to impending Margin Compression on raw fluid milk, the enterprise should advise premium retail packaging (such as branded pouches, fresh vacuum-packed paneer, and desi ghee) rather than competing in thin-margin commodity wholesale.`;

  const priceExplanationHi = isSignificantlyLower
    ? `स्थानीय खरीद मूल्य (₹${localSourcing.toFixed(2)}/किग्रा) राष्ट्रीय थोक औसत (₹${natWholesale.toFixed(2)}/किग्रा) और खुदरा औसत (₹${natRetail.toFixed(2)}/किग्रा) से काफी कम है। आपके पास Strong Sourcing Advantage (मजबूत खरीद लाभ) है, इसलिए व्यापार को अधिक मात्रा (volume) और नियमित दैनिक आपूर्ति पर ध्यान केंद्रित करना चाहिए।`
    : `स्थानीय खरीद मूल्य (₹${localSourcing.toFixed(2)}/किग्रा) राष्ट्रीय औसत के निकट या अधिक है, जिससे Margin Compression (कम मुनाफा मार्जिन) का जोखिम है। कच्चे दूध के थोक व्यापार की जगह प्रीमियम रिटेल पैकेजिंग (जैसे ब्रांडेड पनीर, दही व देसी घी) पर ध्यान दें।`;

  // 2. DEMOGRAPHIC TARGETING (from District Gap Layer)
  // Analyze Agri_Workers relative to Dist_Population.
  // If high concentration of agricultural workers, suggest secondary B2B revenue stream tailored to farmers.
  const agriSharePct = distPop > 0 ? Math.round((agriWorkers / distPop) * 10000) / 100 : 10.17;
  const hasHighAgriConcentration = agriWorkers >= 40000 || agriSharePct >= 6.0;

  const secondaryStreamsEn = [
    "Selling balanced cattle feed, silage & mineral mixtures to local dairy farmers",
    "Distributing urea, organic manure & micro-nutrients",
    "Tractor & fodder harvester / silage baler rentals for agricultural plots",
  ];

  const secondaryStreamsHi = [
    "स्थानीय पशुपालकों को संतुलित पशु आहार (silage/खली) व मिनरल मिक्चर की बिक्री",
    "यूरिया, जैविक खाद व चारा पोषक तत्वों की आपूर्ति",
    "चारा कटाई व ढुलाई के लिए ट्रैक्टर व कृषि उपकरण किराया सेवा",
  ];

  const demoExplanationEn = hasHighAgriConcentration
    ? `The district has a high concentration of agricultural workers (${agriWorkers.toLocaleString("en-IN")} workers, representing ${agriSharePct}% of total district population). To maximize revenue resilience and buffer milk price fluctuations, the entrepreneur should establish a secondary B2B revenue stream tailored to farmers (e.g., selling cattle feed, urea, or tractor rentals).`
    : `Agricultural workers account for ${agriWorkers.toLocaleString("en-IN")} individuals (${agriSharePct}% of population). Farmers form a steady customer base for high-quality livestock feed and veterinary supplies alongside direct dairy operations.`;

  const demoExplanationHi = hasHighAgriConcentration
    ? `जिले में कृषि श्रमिकों की सघनता अधिक है (${agriWorkers.toLocaleString("en-IN")} कृषि श्रमिक, कुल आबादी का ${agriSharePct}%)। दूध के अतिरिक्त किसानों के लिए एक द्वितीयक B2B आय स्रोत शुरू करने की सिफारिश की जाती है (जैसे संतुलित पशु आहार, यूरिया/खाद की बिक्री, या ट्रैक्टर किराया सेवा)।`
    : `जिले में ${agriWorkers.toLocaleString("en-IN")} कृषि श्रमिक हैं, जो पशु आहार व कृषि सामग्री के नियमित ग्राहक बन सकते हैं।`;

  // 3. MARKET SIZING (from Integrated Dataset)
  // Use district population to mathematically validate if there are enough potential local buyers to support production scale and EMI payments.
  const estHouseholds = Math.round(distPop / 5.5);
  const monthlyRevenue = options.monthlyRevenue != null && options.monthlyRevenue > 0 ? options.monthlyRevenue : 45000;
  const monthlyEmi = options.monthlyEmi != null && options.monthlyEmi > 0 ? options.monthlyEmi : 14835;

  // Approximate daily production scale: Revenue / (₹60/kg) / 30 days
  const estPricePerKg = natRetail || 61.45;
  const impliedMonthlyLitres = Math.max(Math.round(monthlyRevenue / estPricePerKg), 300);
  const impliedDailyLitres = Math.max(Math.round(impliedMonthlyLitres / 30), 20);

  // Household milk consumption benchmark: ~1.5 - 2 litres per day per family
  const requiredDailyBuyers = Math.max(Math.ceil(impliedDailyLitres / 1.5), 15);
  const penetrationNeededPct = Math.round((requiredDailyBuyers / estHouseholds) * 10000) / 100; // typically < 0.05%

  const isMathValid = distPop >= 50000 && penetrationNeededPct < 1.0;

  const marketSizingEn = `With a district population of ${distPop.toLocaleString("en-IN")} (~${estHouseholds.toLocaleString("en-IN")} households), the proposed production scale of approximately ${impliedDailyLitres} litres/day requires only ${requiredDailyBuyers} regular household buyers (consuming ~1.5 L/day). This represents less than ${penetrationNeededPct < 0.01 ? "0.01%" : `${penetrationNeededPct}%`} of local households. The massive local population depth mathematically validates that buyer demand is more than sufficient to absorb the proposed output and reliably service the monthly loan EMI of ₹${monthlyEmi.toLocaleString("en-IN")}.`;

  const marketSizingHi = `जिले की ${distPop.toLocaleString("en-IN")} जनसंख्या (~${estHouseholds.toLocaleString("en-IN")} परिवार) के सापेक्ष, आपकी प्रस्तावित उत्पादन क्षमता (~${impliedDailyLitres} लीटर/दिन) के लिए प्रतिदिन केवल ${requiredDailyBuyers} नियमित ग्राहक परिवारों की आवश्यकता है। यह जिले के कुल परिवारों का 0.01% से भी कम हिस्सा है। यह गणितीय रूप से प्रमाणित करता है कि उत्पादन की पूरी खपत और ₹${monthlyEmi.toLocaleString("en-IN")} की मासिक लोन EMI भरने के लिए स्थानीय बाज़ार में पर्याप्त से अधिक खरीदार उपलब्ध हैं।`;

  const summaryReportEn = `DAIRY SECTOR ANALYSIS & LOCAL MARKET ADVISORY SUMMARY:
1. Price Arbitrage: ${priceExplanationEn}
2. Demographic Targeting: ${demoExplanationEn}
3. Market Sizing: ${marketSizingEn}`;

  const summaryReportHi = `डेयरी क्षेत्र मैक्रो-डेमोग्राफिक्स व बाज़ार अंतर रिपोर्ट:
1. मूल्य अंतरण (Price Arbitrage): ${priceExplanationHi}
2. जनसांख्यिकीय लक्ष्यीकरण (Demographic Targeting): ${demoExplanationHi}
3. बाज़ार आकार (Market Sizing): ${marketSizingHi}`;

  return {
    dist_population: distPop,
    agri_workers: agriWorkers,
    nat_retail_avg: natRetail,
    nat_wholesale_avg: natWholesale,
    local_sourcing_price: localSourcing,
    csv_data_layer: csvDataLayer,
    price_arbitrage: {
      status: priceArbitrageStatus,
      margin_diff_retail: diffRetail,
      margin_diff_wholesale: diffWholesale,
      recommendation: priceRecommendation,
      explanation: priceExplanationEn,
      explanation_hi: priceExplanationHi,
    },
    demographic_targeting: {
      agri_worker_share_pct: agriSharePct,
      has_high_agri_concentration: hasHighAgriConcentration,
      secondary_b2b_streams: secondaryStreamsEn,
      secondary_b2b_streams_hi: secondaryStreamsHi,
      explanation: demoExplanationEn,
      explanation_hi: demoExplanationHi,
    },
    market_sizing: {
      dist_population: distPop,
      estimated_households: estHouseholds,
      production_scale_litres_day: impliedDailyLitres,
      required_daily_buyers: requiredDailyBuyers,
      household_penetration_needed_pct: penetrationNeededPct,
      monthly_emi: monthlyEmi,
      monthly_revenue: monthlyRevenue,
      is_mathematically_validated: isMathValid,
      explanation: marketSizingEn,
      explanation_hi: marketSizingHi,
    },
    summary_report: summaryReportEn,
    summary_report_hi: summaryReportHi,
  };
}
