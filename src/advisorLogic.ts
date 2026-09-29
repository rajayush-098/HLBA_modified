import { getTehsilMarketReach } from '../locationData';
import governmentSchemesData from './government_schemes.json';
import {
  isDairyCategory,
  buildDairyAnalysis,
  parseCsvDataLayer,
  formatCsvDataLayer,
} from './dairyDataService';
import type { DairyAnalysisResult } from './dairyDataService';
import {
  routePsCoreScheme,
  calculateProjectCostAndMaxLoan,
  calculateEmi,
  generateRepaymentSchedule,
  calculateSih26091Financials,
  PsCoreSchemeResult,
  CentralFinancialResult,
} from './financialRouter';

export {
  routePsCoreScheme,
  calculateProjectCostAndMaxLoan,
  calculateEmi,
  generateRepaymentSchedule,
  calculateSih26091Financials,
};
export type { PsCoreSchemeResult, CentralFinancialResult };

export interface BusinessRequest {
  business_name: string;
  category: string;
  state: string;
  district: string;
  block: string;
  location: string;
  pin?: string;
  experience: string;
  investment: number;
  monthly_revenue: number;
  monthly_expenses: number;
}

export function cleanBusinessTokens(businessString: string): string[] {
  if (!businessString) return [];
  const stopWords = new Set([
    'and', '&', 'or', 'the', 'in', 'of', 'for', 'with', 'a', 'an', 'at', 'by', 'from',
    'setup', 'services', 'service', 'centre', 'center', 'store', 'shop'
  ]);
  return businessString
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !stopWords.has(w));
}

function tokenMatchesText(token: string, targetText: string): boolean {
  if (!targetText || typeof targetText !== 'string' || !token) return false;
  const t = targetText.toLowerCase().trim();
  const tok = token.toLowerCase().trim();
  if (t === tok) return true;
  const words = t.split(/[\s,/_.-]+/);
  if (words.includes(tok)) return true;
  if (tok.length >= 4 && t.includes(tok)) return true;
  if (t.length >= 4 && tok.includes(t)) return true;
  if (tok.length >= 5 && t.length >= 5 && tok.slice(0, 5) === t.slice(0, 5)) return true;
  return false;
}

function getSchemeMinLimit(scheme: any): number | null {
  if (scheme.project_limits?.minimum_project_cost != null) {
    return Number(scheme.project_limits.minimum_project_cost);
  }
  if (scheme.matching_rules?.min_project_cost != null) {
    return Number(scheme.matching_rules.min_project_cost);
  }
  if (scheme.loan?.minimum_loan != null) {
    return Number(scheme.loan.minimum_loan);
  }
  return null;
}

function getSchemeMaxLimit(scheme: any): number | null {
  const candidates: number[] = [];

  if (scheme.matching_rules?.max_project_cost != null) {
    candidates.push(Number(scheme.matching_rules.max_project_cost));
  }
  if (scheme.project_limits?.maximum_project_cost_manufacturing != null) {
    candidates.push(Number(scheme.project_limits.maximum_project_cost_manufacturing));
  }
  if (scheme.project_limits?.maximum_project_cost_service_business != null) {
    candidates.push(Number(scheme.project_limits.maximum_project_cost_service_business));
  }
  if (scheme.project_limits?.maximum_credit_facility != null) {
    candidates.push(Number(scheme.project_limits.maximum_credit_facility));
  }
  if (scheme.project_limits?.loan_limit_for_interest_subvention != null) {
    candidates.push(Number(scheme.project_limits.loan_limit_for_interest_subvention));
  }
  if (scheme.loan?.maximum_loan != null && Number(scheme.loan.maximum_loan) > 0) {
    candidates.push(Number(scheme.loan.maximum_loan));
  }

  const limitsArray = scheme.loan?.loan_limits || scheme.loan?.loan_categories;
  if (Array.isArray(limitsArray)) {
    limitsArray.forEach((item: any) => {
      if (item.max != null) candidates.push(Number(item.max));
      if (item.amount != null) candidates.push(Number(item.amount));
    });
  }

  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

function isEligibleByLimits(scheme: any, investment: number, projectCost: number, _loanReq: number): boolean {
  const minLimit = getSchemeMinLimit(scheme);
  if (minLimit != null && investment < minLimit && projectCost < minLimit) {
    return false;
  }
  const maxLimit = getSchemeMaxLimit(scheme);
  if (maxLimit != null && investment > maxLimit) {
    return false;
  }
  return true;
}

function scoreSchemeForBusiness(scheme: any, tokens: string[]) {
  let specializedScore = 0;
  let generalScore = 0;

  // Preferred categories, eligible activities, target sectors (score highest)
  const specializedFields = [
    ...(scheme.matching_rules?.preferred_categories || []),
    ...(scheme.matching_rules?.eligible_activities || []),
    ...(scheme.matching_rules?.target_sectors || []),
    ...(scheme.eligible_activities || []),
    ...(scheme.target_sectors || []),
  ].map((s: any) => String(s).toLowerCase().trim());

  const sectorFields = [
    ...(scheme.sectors || []),
    ...(scheme.business_types || []),
    ...(scheme.category ? [scheme.category] : []),
  ].map((s: any) => String(s).toLowerCase().trim());

  tokens.forEach((tok) => {
    let matchedInSpecialized = false;
    for (const spec of specializedFields) {
      if (tokenMatchesText(tok, spec)) {
        specializedScore += 25;
        matchedInSpecialized = true;
        break;
      }
    }
    if (!matchedInSpecialized) {
      for (const sec of sectorFields) {
        if (tokenMatchesText(tok, sec)) {
          specializedScore += 10;
          break;
        }
      }
    }
  });

  // Secondary match if tagged for general micro/small enterprises (e.g. mse, general, all, msme)
  const allSchemeText = [
    ...specializedFields,
    ...sectorFields,
    scheme.category?.toLowerCase() || '',
    scheme.scheme_name?.toLowerCase() || '',
  ];

  const hasGeneralTag = allSchemeText.some(
    (txt) =>
      txt.includes('micro enterprise') ||
      txt.includes('mse') ||
      txt.includes('msme') ||
      txt.includes('small enterprise') ||
      txt.includes('general') ||
      txt.includes('all') ||
      txt.includes('rural enterprise')
  );

  if (hasGeneralTag) {
    generalScore += 3;
  }

  const totalScore = specializedScore + generalScore;
  return { specializedScore, generalScore, totalScore };
}

export function matchGovernmentScheme(category: string, investment: number) {
  const schemes = governmentSchemesData?.schemes || [];
  const tokens = cleanBusinessTokens(category);
  const numInvestment = Number(investment) || 0;
  const projectCost = numInvestment / 0.1;
  const loanReq = projectCost * 0.9;

  const eligibleSchemes = schemes.filter((scheme: any) =>
    isEligibleByLimits(scheme, numInvestment, projectCost, loanReq)
  );

  const scored = eligibleSchemes.map((scheme: any) => {
    const { specializedScore, generalScore, totalScore } = scoreSchemeForBusiness(scheme, tokens);
    return { scheme, specializedScore, generalScore, totalScore };
  });

  // Prioritize highest specialized scoring eligible scheme
  const specializedMatches = scored
    .filter((s) => s.specializedScore > 0)
    .sort((a, b) => b.totalScore - a.totalScore);

  if (specializedMatches.length > 0) {
    return specializedMatches[0].scheme;
  }

  // Next, pick highest general scoring eligible scheme
  const generalMatches = scored
    .filter((s) => s.totalScore > 0)
    .sort((a, b) => b.totalScore - a.totalScore);

  if (generalMatches.length > 0) {
    return generalMatches[0].scheme;
  }

  // Fallback to appropriate general scheme (like PMMY / MUDRA or PMEGP) that fits investment
  const generalFallback =
    eligibleSchemes.find(
      (s: any) =>
        s.scheme_id === 'PMMY' ||
        s.short_name?.includes('MUDRA') ||
        s.scheme_id === 'PMEGP'
    ) || schemes.find((s: any) => s.scheme_id === 'PMMY') || schemes[0];

  return generalFallback;
}

export function getAllMatchingSchemes(category: string, investment: number) {
  const schemes = governmentSchemesData?.schemes || [];
  const tokens = cleanBusinessTokens(category);
  const numInvestment = Number(investment) || 0;
  const projectCost = numInvestment / 0.1;
  const loanReq = projectCost * 0.9;

  const eligibleSchemes = schemes.filter((scheme: any) =>
    isEligibleByLimits(scheme, numInvestment, projectCost, loanReq)
  );

  const scored = eligibleSchemes
    .map((scheme: any) => {
      const { specializedScore, generalScore, totalScore } = scoreSchemeForBusiness(scheme, tokens);
      return { scheme, specializedScore, generalScore, totalScore };
    })
    .filter((s) => s.totalScore > 0)
    .sort((a, b) => b.totalScore - a.totalScore);

  const matched = scored.map((s) => s.scheme);
  return matched.length > 0 ? matched : [matchGovernmentScheme(category, investment)];
}

export interface AdvisorRequest {
  question: string;
  business_name?: string;
  category?: string;
  monthly_revenue?: number;
  monthly_expenses?: number;
  monthly_profit?: number;
  roi_percentage?: number;
  feasibility?: string;
  financial_risk?: string;
  overall_risk_level?: string;
  affordability_status?: string;
  monthly_emi?: number;
  local_demand?: string;
  competition_level?: string;
  scheme_name?: string;
  eligible_loan?: number;
  project_cost?: number;
  promoter_margin?: number;
  interest_rate?: number | null;
  loan_tenure_months?: number | null;
  moratorium_months?: number | null;
  district?: string;
  state?: string;
  block?: string;
  language?: string;
  history?: Array<{ role: string; text: string }>;
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Math.round(val));
}

function extractAmountFromText(text: string): number | null {
  if (!text) return null;
  const clean = text.toLowerCase().replace(/,/g, '');

  // 1. Lakhs: e.g. "1.5 lakh", "1 lakh", "2 lakhs", "1 lac", "1.5lac"
  const lakhMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?|लाख)/i);
  if (lakhMatch) {
    return parseFloat(lakhMatch[1]) * 100000;
  }

  // 2. Thousands / K: e.g. "80k", "50k"
  const kMatch = clean.match(/(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) {
    return parseFloat(kMatch[1]) * 1000;
  }

  // 3. Hazar / Thousand: e.g. "80 hazar", "80 thousand", "50 hazaar"
  const hazarMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:thousand|thousands|hazar|hazaar|हजार)/i);
  if (hazarMatch) {
    return parseFloat(hazarMatch[1]) * 1000;
  }

  // 4. Direct numeric figures: e.g. "₹80000", "80000 rupees", "80000", "100000"
  const numMatch = clean.match(/(?:₹|rs\.?|inr)?\s*(\d{4,9})\b/i);
  if (numMatch) {
    return parseFloat(numMatch[1]);
  }

  return null;
}

export function getCategoryProfile(cat?: string, name?: string): string {
  const combined = `${cat || ''} ${name || ''}`.toLowerCase();
  if (/fish|fishery|machhli|matsya|aquaculture|prawn|shrimp/i.test(combined)) return 'fishery';
  if (/dairy|milk|doodh|cattle|cow|buffalo|ghee|paneer/i.test(combined)) return 'dairy';
  if (/poultry|chicken|murgi|broiler|layer|egg/i.test(combined)) return 'poultry';
  if (/farm|agriculture|kheti|crop|horticulture|polyhouse|greenhouse|vegetable|fruit/i.test(combined)) return 'agriculture';
  if (/food\s*processing|processing|atta\s*mill|flour\s*mill|oil\s*expeller|spice|bakery|pickle/i.test(combined)) return 'food_processing';
  if (/kirana|grocery|retail|general\s*store|dukan|shop/i.test(combined)) return 'retail';
  if (/tailor|garment|cloth|apparel|textile/i.test(combined)) return 'garments';
  if (/manufactur|fabricat|workshop|hardware|welding/i.test(combined)) return 'manufacturing';
  if (/transport|vehicle|logistics|auto|tempo/i.test(combined)) return 'transport';
  return 'general';
}

export function getSchemeDetailsForAdvisor(schemeNameOrId?: string | null, category?: string | null): any | null {
  const schemes: any[] = (governmentSchemesData as any)?.schemes || [];
  if (!schemes.length) return null;

  if (schemeNameOrId) {
    const sClean = schemeNameOrId.toLowerCase().trim();
    const found = schemes.find((s) => {
      const sId = (s.scheme_id || '').toLowerCase();
      const sName = (s.scheme_name || '').toLowerCase();
      const sShort = (s.short_name || '').toLowerCase();
      return (
        sId === sClean ||
        sName === sClean ||
        sClean.includes(sId) ||
        sClean.includes(sShort) ||
        sName.includes(sClean)
      );
    });
    if (found) return found;
  }

  // Fallback to match by category
  if (category) {
    const tokens = cleanBusinessTokens(category);
    for (const scheme of schemes) {
      const match = scoreSchemeForBusiness(scheme, tokens);
      if (match.totalScore > 0) return scheme;
    }
  }

  return schemes.find((s) => s.scheme_id === 'PMMY') || schemes[0] || null;
}

export function getAdvisorAdvice(data: AdvisorRequest): { answer: string } {
  const rawQ = (data.question || '').trim();
  const qLower = rawQ.toLowerCase();

  if (!rawQ) {
    return { answer: 'Please ask a question about your business plan, loan, or investment.' };
  }

  // Language Detection
  const hasDevanagari = /[\u0900-\u097F]/.test(rawQ);
  const isHinglish =
    /\b(bhai|mere|paas|kitna|hoga|hogi|hai|kya|kaise|karu|karein|bina|chahiye|chalega|kamai|paisa|paise|lagana|karna|shuru|munafa|milega|udhar|bikri)\b/i.test(
      rawQ
    );
  const langMode = hasDevanagari ? 'hi' : isHinglish ? 'hinglish' : (data.language || 'en');

  const businessName = data.business_name || (langMode === 'hi' ? 'आपका व्यवसाय' : 'Your Business');
  const category = data.category || (langMode === 'hi' ? 'व्यवसाय' : 'Enterprise');
  const catProfile = getCategoryProfile(category, businessName);

  // Safe numeric parsing without optimistic or arbitrary defaults
  const monthlyRevenue = data.monthly_revenue != null && !isNaN(Number(data.monthly_revenue)) ? Number(data.monthly_revenue) : null;
  const monthlyExpenses = data.monthly_expenses != null && !isNaN(Number(data.monthly_expenses)) ? Number(data.monthly_expenses) : null;
  const monthlyProfit = data.monthly_profit != null && !isNaN(Number(data.monthly_profit))
    ? Number(data.monthly_profit)
    : (monthlyRevenue != null && monthlyExpenses != null ? monthlyRevenue - monthlyExpenses : null);
  const roiPercentage = data.roi_percentage != null && !isNaN(Number(data.roi_percentage)) ? Number(data.roi_percentage) : null;
  const monthlyEmi = data.monthly_emi != null && !isNaN(Number(data.monthly_emi)) ? Number(data.monthly_emi) : null;

  const projectCost = data.project_cost != null && !isNaN(Number(data.project_cost))
    ? Number(data.project_cost)
    : (data.promoter_margin != null && !isNaN(Number(data.promoter_margin)) ? Number(data.promoter_margin) / 0.1 : null);
  const promoterMargin = data.promoter_margin != null && !isNaN(Number(data.promoter_margin))
    ? Number(data.promoter_margin)
    : (projectCost != null ? projectCost * 0.1 : null);
  const eligibleLoan = data.eligible_loan != null && !isNaN(Number(data.eligible_loan))
    ? Number(data.eligible_loan)
    : (projectCost != null && promoterMargin != null ? Math.max(0, projectCost - promoterMargin) : null);

  const schemeName = data.scheme_name || (projectCost != null ? (projectCost <= 140000 ? 'Micro Finance Scheme' : 'Term Loan Scheme') : 'Credit Scheme');
  const interestRate = data.interest_rate != null ? Number(data.interest_rate) : null;
  const tenure = data.loan_tenure_months != null ? Number(data.loan_tenure_months) : null;
  const moratorium = data.moratorium_months != null ? Number(data.moratorium_months) : null;
  const affordabilityStatus = data.affordability_status || (monthlyProfit != null && monthlyEmi != null ? (monthlyProfit >= monthlyEmi ? 'Serviceable' : 'Strained') : 'Requires Verification');
  const feasibility = data.feasibility || 'Requires Verification';
  const location = [data.block, data.district, data.state].filter(Boolean).join(', ') || 'your local market area';

  // Check for amounts mentioned in user query
  const userAmount = extractAmountFromText(rawQ);

  // Pre-calculated deterministic operating metrics
  const operatingSurplus = monthlyRevenue != null && monthlyExpenses != null ? monthlyRevenue - monthlyExpenses : (monthlyProfit ?? 0);
  const netTakeHome = monthlyEmi != null ? Math.max(0, operatingSurplus - monthlyEmi) : operatingSurplus;
  const effectiveExpenses = monthlyExpenses ?? (monthlyRevenue != null && monthlyProfit != null ? Math.max(0, monthlyRevenue - monthlyProfit) : 0);
  const effectiveRevenue = monthlyRevenue ?? (monthlyExpenses != null && monthlyProfit != null ? monthlyExpenses + monthlyProfit : 0);

  // CRITICAL CONDITION: DAIRY SECTOR MACRO-DEMOGRAPHICS & MARKET GAP
  // ONLY apply this specific demographic and pricing analysis if the user's business category is "Dairy & Milk Products"
  // (e.g., dairy farm, milk processing, ghee manufacturing). For all other businesses, ignore this section.
  const isDairyBiz = isDairyCategory(data.category) || qLower.includes('dist_population') || qLower.includes('[csv data layer]');
  const isDairyAnalysisQuery =
    qLower.includes('dist_population') ||
    qLower.includes('price arbitrage') ||
    qLower.includes('sourcing advantage') ||
    qLower.includes('margin compression') ||
    qLower.includes('demographic targeting') ||
    qLower.includes('market sizing') ||
    qLower.includes('agri_workers') ||
    qLower.includes('cattle feed') ||
    qLower.includes('secondary b2b') ||
    qLower.includes('potential local buyers') ||
    qLower.includes('production scale and emi') ||
    qLower.includes('macro-demographics') ||
    qLower.includes('market gap') ||
    (isDairyBiz && (
      qLower.includes('buyer') ||
      qLower.includes('sourcing') ||
      qLower.includes('wholesale') ||
      qLower.includes('feed') ||
      qLower.includes('urea') ||
      qLower.includes('tractor') ||
      qLower.includes('kharid') ||
      qLower.includes('rate') ||
      qLower.includes('arbitrage')
    ));

  if (isDairyBiz && isDairyAnalysisQuery) {
    const customCsv = parseCsvDataLayer(rawQ);
    const dairyRes = buildDairyAnalysis({
      district: data.district,
      customCsvData: customCsv,
      customSourcingPrice: userAmount,
      monthlyRevenue: monthlyRevenue,
      monthlyExpenses: monthlyExpenses,
      monthlyEmi: monthlyEmi,
      projectCost: projectCost,
    });

    if (langMode === 'hi') {
      return {
        answer: dairyRes.summary_report_hi,
      };
    }
    return {
      answer: dairyRes.summary_report,
    };
  }

  // 1. Follow-up resolution: check if "that", "this", "it" refers to previous turn
  const lastTurn = (data.history || []).slice(-1)[0]?.text?.toLowerCase() || '';
  const isFollowUpAfford =
    /\b(can i afford that|can i afford this|is that affordable|afford ho jayega|afford kar paunga|can i repay that|can i afford)\b/i.test(qLower) ||
    (/\b(afford|affordability|chuka paunga)\b/i.test(qLower) && (lastTurn.includes('emi') || lastTurn.includes('₹') || lastTurn.includes('loan')));

  // INTENT: Follow-up Affordability / "Can I afford that?" / "Is this affordable for me?" / "Will this EMI put pressure on my business?"
  if (
    isFollowUpAfford ||
    /\b(?:can\s+i\s+afford|is\s+(?:this\s+)?affordable|how\s+much\s+can\s+i\s+safely\s+pay|safely\s+pay\s+every\s+month|will\s+(?:this\s+)?emi\s+put\s+pressure|emi\s+(?:put\s+)?pressure|afford\s+kar\s+paunga|kya\s+me\s+afford|affordability|repay\s+pressure)\b/i.test(qLower)
  ) {
    if (monthlyRevenue == null || monthlyExpenses == null || monthlyEmi == null) {
      if (langMode === 'hinglish') {
        return {
          answer: `Affordability verify karne ke liye aapki monthly bikri, monthly kharcha aur bank EMI ka data zaroori hai. Kripya apna anumanit monthly revenue aur expenses darj karein taaki sahi ganit nikala ja sake.`,
        };
      }
      if (langMode === 'hi') {
        return {
          answer: `ऋण वहन क्षमता (affordability) का सटीक आंकलन करने के लिए अनुमानित मासिक बिक्री, मासिक खर्च और बैंक EMI की जानकारी आवश्यक है। कृपया अपनी अपेक्षित बिक्री और खर्च दर्ज करें।`,
        };
      }
      return {
        answer: `Evaluating affordability requires your expected monthly sales, operating costs, and monthly EMI. Please enter your revenue and expense estimates to calculate whether debt servicing is mathematically sound.`,
      };
    }

    if (operatingSurplus >= monthlyEmi) {
      const surplusAfterEmi = operatingSurplus - monthlyEmi;
      if (langMode === 'hinglish') {
        return {
          answer: `Aapki anumanit monthly revenue ₹${formatCurrency(monthlyRevenue)} aur monthly kharch ₹${formatCurrency(monthlyExpenses)} ke aadhar par, business EMI se pehle ₹${formatCurrency(operatingSurplus)} aur EMI ke baad ₹${formatCurrency(surplusAfterEmi)} generate karta hai. Is hisab se ₹${formatCurrency(monthlyEmi)} ki EMI mathematically serviceable hai, lekin bachat margin limited hai aur actual affordability daily bikri ki sthirta aur emergency kharchon par nirbhar karegi.`,
        };
      }
      if (langMode === 'hi') {
        return {
          answer: `दर्ज मासिक आय ₹${formatCurrency(monthlyRevenue)} और परिचालन खर्च ₹${formatCurrency(monthlyExpenses)} के आधार पर, यह व्यवसाय EMI से पूर्व ₹${formatCurrency(operatingSurplus)} और EMI भुगतान के पश्चात ₹${formatCurrency(surplusAfterEmi)} का सरप्लस उत्पन्न करता है। इन मान्यताओं के तहत ₹${formatCurrency(monthlyEmi)} की EMI गणितीय रूप से वहन करने योग्य (serviceable) है, किंतु सुरक्षा मार्जिन सीमित है और वास्तविक वहन क्षमता बिक्री में उतार-चढ़ाव एवं अतिरिक्त आकस्मिक खर्चों पर निर्भर करेगी।`,
        };
      }
      return {
        answer: `Based on the stated revenue of ₹${formatCurrency(monthlyRevenue)} and operating costs of ₹${formatCurrency(monthlyExpenses)}, the business generates ₹${formatCurrency(operatingSurplus)} before EMI and ₹${formatCurrency(surplusAfterEmi)} after EMI. The monthly EMI of ₹${formatCurrency(monthlyEmi)} is mathematically serviceable under these assumptions, but the remaining margin is limited and actual affordability will depend on sales fluctuations, additional expenses and other business costs.`,
      };
    } else {
      const deficit = monthlyEmi - operatingSurplus;
      if (langMode === 'hinglish') {
        return {
          answer: `Filhal yeh debt structure cash flow par dabav dalega, kyunki aapka operating surplus ₹${formatCurrency(operatingSurplus)} hai jo monthly EMI (₹${formatCurrency(monthlyEmi)}) se ₹${formatCurrency(deficit)} kam hai. Is risk ko kam karne ke liye shuruat mein loan ki rashi ghatayein ya promoter margin badhakar borrowing kam karein.`,
        };
      }
      if (langMode === 'hi') {
        return {
          answer: `वर्तमान आंकड़ों के अनुसार यह ऋण संरचना जोखिमपूर्ण है, क्योंकि ₹${formatCurrency(operatingSurplus)} का ऑपरेटिंग लाभ ₹${formatCurrency(monthlyEmi)} की EMI से ₹${formatCurrency(deficit)} कम है। इस जोखिम को दूर करने के लिए आवश्यक है कि स्वयं का अंशदान बढ़ाकर बैंक ऋण की राशि घटाई जाए या शुरुआती लागत कम की जाए।`,
        };
      }
      return {
        answer: `At present projections, this loan structure creates severe cash flow strain because your operating surplus of ₹${formatCurrency(operatingSurplus)} is ₹${formatCurrency(deficit)} below the monthly EMI of ₹${formatCurrency(monthlyEmi)}. To make this mathematically safe, reduce the borrowing amount or contribute a higher upfront promoter margin.`,
      };
    }
  }

  // INTENT: Margin Question ("Should I increase the margin cost?", "Should I invest more margin?", "What happens if I invest more?")
  if (
    /\b(should\s+i\s+(?:increase|raise|put\s+more|invest\s+more)\s+(?:the\s+)?margin|increase\s+(?:the\s+)?margin|margin\s+(?:badhana|zyada|badhau|increase|badhaye)|should\s+i\s+put\s+more\s+margin|higher\s+margin|what\s+happens\s+if\s+i\s+invest\s+more|if\s+i\s+invest\s+more|invest\s+more|zyada\s+invest|zyada\s+margin|margin\s+cost)\b/i.test(
      qLower
    ) ||
    /मार्जिन\s*(?:बढ़ाना|बढ़ाएं|अधिक|ज्यादा)/.test(rawQ) ||
    /मार्जिन.*लागत/.test(rawQ)
  ) {
    const isExceedingScheme =
      feasibility.toLowerCase().includes('not eligible') ||
      feasibility.toLowerCase().includes('exceed') ||
      schemeName.toLowerCase().includes('exceed') ||
      (eligibleLoan === 0 && projectCost > 1500000) ||
      projectCost > 10000000;

    if (isExceedingScheme) {
      if (langMode === 'hinglish') {
        return {
          answer: `Sirf promoter margin badhane se scheme eligibility ka masla hal nahi hoga. Sarkari loan yojanaon (jaise PMMY ya PMEGP) me total project cost ki ek nishchit ceiling hoti hai (jaise ₹10 lakh ya ₹25 lakh). Agar aapka total project cost (₹${formatCurrency(projectCost)}) scheme limit se zyada hai, to aap chahe jitna bhi margin badha lein, scheme qualify nahi hogi — iske liye project ka scale chhota karke total cost ko scheme ke daayre me lana zaroori hai. Agar project eligible hai, to zyada margin lagane se loan aur EMI zaroor kam honge, par dhyan rahe ki daily emergency working capital ke liye cash reserve bacha rahe.`,
        };
      }
      if (langMode === 'hi') {
        return {
          answer: `केवल प्रमोटर मार्जिन बढ़ाने से योजना की पात्रता (eligibility) स्वतः हल नहीं होगी। सरकारी ऋण योजनाओं (जैसे PMMY या PMEGP) में प्रोजेक्ट लागत की अधिकतम सीमा तय होती है। यदि कुल प्रोजेक्ट लागत (₹${formatCurrency(projectCost)}) योजना की सीमा से अधिक है, तो अधिक मार्जिन लगाने पर भी योजना स्वीकृत नहीं होगी — इसके लिए प्रोजेक्ट का पैमाना घटाकर उसे योजना की सीमा में लाना अधिक प्रासंगिक है। यदि प्रोजेक्ट पात्र है, तो मार्जिन बढ़ाने से ऋण राशि और मासिक EMI घटेंगे, किंतु अपनी आपातकालीन कार्यशील पूंजी को सुरक्षित रखकर ही अतिरिक्त मार्जिन लगाएं।`,
        };
      }
      return {
        answer: `Increasing your promoter margin will not solve scheme eligibility on its own. Government loan schemes (such as PMMY or PMEGP) have fixed upper limits on total project cost or maximum loan amounts (e.g., ₹10 lakh to ₹50 lakh). If your project cost (₹${formatCurrency(projectCost)}) exceeds the applicable scheme ceiling, contributing a higher margin does not change that scheme limit. Instead, reducing your project size or phasing equipment to bring the total cost within the eligible threshold is what makes it qualify. When a project is eligible, a higher margin does reduce your borrowing and EMI, but be careful not to lock up your entire cash reserve.`,
      };
    }

    if (langMode === 'hinglish') {
      return {
        answer: `Margin badhane ka faisla ek trade-off hai: Fayda yeh hai ki apna paisa zyada lagane se bank loan ₹${formatCurrency(eligibleLoan)} se kam lena padega, jisse har mahine ki EMI ₹${formatCurrency(monthlyEmi)} se seedhe kam ho jayegi aur byaj bachega. Lekin nuksan yeh hai ki aapki personal bachat lock ho jayegi aur daily emergency kharchon ke liye cash kam pad sakta hai. Saath hi, margin badhane se sarkari scheme ki ceiling limit nahi badhti. Isliye margin tabhi badhayein jab margin dene ke baad bhi aapke paas kam se kam 1-2 mahine ka operating cash (lagbhag ₹${formatCurrency(effectiveExpenses)}) bacha rahe.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `प्रमोटर मार्जिन बढ़ाने में दोनों पक्षों (trade-off) पर विचार करना चाहिए: मुख्य लाभ यह है कि अधिक स्वयं का अंशदान देने से आवश्यक बैंक लोन ₹${formatCurrency(eligibleLoan)} से घट जाएगा, जिससे मासिक EMI ₹${formatCurrency(monthlyEmi)} से कम होगी और ब्याज की बचत होगी। वहीं दूसरा पहलू यह है कि आपकी नकद पूंजी ब्लॉक हो जाएगी, जिससे आपातकालीन कार्यशील पूंजी का संकट हो सकता है। साथ ही, मार्जिन बढ़ाने से योजना की सीमा नहीं बढ़ती। अतः अतिरिक्त मार्जिन तभी लगाएं जब आपके पास दैनिक खर्चों के लिए लगभग ₹${formatCurrency(effectiveExpenses)} का लिक्विड रिज़र्व फंड शेष रहे।`,
      };
    }
    return {
      answer: `Increasing your promoter margin involves a clear trade-off: On the positive side, putting more of your own money reduces your required bank loan below ₹${formatCurrency(eligibleLoan)}, which directly lowers your monthly EMI from ₹${formatCurrency(monthlyEmi)} and saves on total interest paid ${tenure != null ? `over ${tenure} months` : 'over the loan tenure'}. However, the downside is locking up more personal savings. If you commit too much cash to upfront margin, you may run short of working capital for daily operations or emergencies. Also, remember that increasing margin does not expand government scheme ceilings; if project size ever exceeds scheme limits, downsizing the project scale is what matters. Therefore, only increase your margin if you retain at least 1–2 months of operating expenses (₹${formatCurrency(effectiveExpenses)}) as liquid cash.`,
    };
  }

  // INTENT: Cost Reduction Question ("How can I lower my initial setup cost?", "Reduce setup cost", etc.)
  if (
    /\b(how\s+can\s+i\s+(?:lower|reduce|cut)\s+(?:my\s+)?(?:initial\s+)?(?:setup\s+)?cost|lower\s+(?:the\s+)?(?:initial\s+)?setup\s+cost|reduce\s+(?:the\s+)?(?:initial\s+)?setup\s+cost|setup\s+cost\s+kam|initial\s+cost\s+kam|kharch\s+kam\s+kaise|lower\s+(?:my\s+)?initial\s+investment|reduce\s+investment|cut\s+(?:down\s+)?(?:setup\s+)?cost|cost\s+cutting|lagat\s+kam|kam\s+lagat)\b/i.test(
      qLower
    ) ||
    /(?:सेटअप\s*लागत|शुरुआती\s*लागत|खर्च|लागत)\s*(?:कम\s*कैसे|कैसे\s*कम|घटा)/.test(rawQ)
  ) {
    if (langMode === 'hinglish') {
      return {
        answer: `Initial setup cost (₹${formatCurrency(projectCost)}) ko kam karne ke 4 practical tarike hain:\n1) Phased Startup: Shuruat me sirf zaroori core productive machinery lein aur extra automation ya sajawat baad ke mahino par chhod dein.\n2) Khareedne ke bajaye Kiraye (Lease) par lein: Shed, dukan ya machine khareedne ke bajaye lease par lene se upfront capital kharch bohot kam ho jata hai.\n3) Refurbished / Second-Hand Machinery: Brand-new equipment ke bajaye achhi condition wali tested second-hand machine lein.\n4) Initial Capacity Chhoti Rakhein: Shuruat me local demand ke hisab se chhota pilot batch shuru karein.\nFinancial fayda: Project cost kam hote hi aapka required 10% promoter margin (₹${formatCurrency(promoterMargin)}) aur bank loan (₹${formatCurrency(eligibleLoan)}) dono kam ho jayenge, jisse monthly EMI ghategi aur business par karz ka dabav nahi aayega.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `शुरुआती सेटअप लागत (वर्तमान में ₹${formatCurrency(projectCost)}) को कम करने के 4 व्यावहारिक उपाय:\n1) चरणबद्ध शुरुआत (Phased Procurement): शुरुआत में केवल मुख्य उत्पादन मशीनरी खरीदें और अतिरिक्त ऑटोमेशन या बड़े इंफ्रास्ट्रक्चर को बाद के लिए टालें।\n2) खरीदने के बजाय लीज/किराया: वर्कशॉप शेड या भारी उपकरणों को खरीदने के बजाय लीज पर लें, जिससे अग्रिम पूंजी बचती है।\n3) प्रमाणित प्रयुक्त (Refurbished) उपकरण: प्रतिष्ठित विक्रेताओं से अच्छी स्थिति वाली प्रयुक्त मशीनरी लेकर मशीनरी खर्च घटाया जा सकता है।\n4) शुरुआती उत्पादन क्षमता सीमित रखें: पहले दिन से बड़े पैमाने के बजाय स्थानीय ग्राहकों की तत्काल मांग के अनुसार पायलट स्तर पर शुरुआत करें।\nवित्तीय प्रभाव: प्रोजेक्ट लागत कम होने से आपका 10% आवश्यक प्रमोटर मार्जिन (₹${formatCurrency(promoterMargin)}) और बैंक लोन (₹${formatCurrency(eligibleLoan)}) दोनों घटेंगे, जिससे मासिक EMI कम होगी और व्यवसाय तेजी से लाभप्रद बनेगा।`,
      };
    }
    return {
      answer: `To lower your initial setup cost from the current ₹${formatCurrency(projectCost)}, here are 4 practical strategies:\n1. Start in phases: Procure only the primary, revenue-generating core equipment first and postpone optional automation, branding, or secondary capacity until sales stabilize.\n2. Lease or rent instead of purchasing: Renting workspace or leasing heavy machinery converts high upfront capital expenditure into smaller monthly operating costs.\n3. Source certified refurbished machinery: Procure tested, second-hand machinery from reputable workshops to cut equipment outlay without sacrificing performance.\n4. Scale down initial production capacity: Size the initial pilot for immediate, verified local buyers rather than over-investing in peak capacity upfront.\nFinancial impact: Reducing the total project cost directly lowers your required 10% promoter margin below ₹${formatCurrency(promoterMargin)} and reduces the required loan below ₹${formatCurrency(eligibleLoan)}, which reduces your monthly EMI and speeds up breakeven.`,
    };
  }

  // INTENT: Increased Operating Costs (Stress Testing)
  if (
    /\b(?:costs?|expenses?|kharcha|kharch)\s*(?:increase|rise|grow|badh|badha|badhe|badhta)\b|\b(?:increase|badha|badhe)\s*(?:in\s*)?(?:costs?|expenses?|kharcha)\b/i.test(qLower) ||
    /\bwhat\s+happens\s+if\s+(?:my\s+)?(?:costs?|expenses?)\s+increase\b/i.test(qLower) ||
    /खर्च.*बढ़/.test(rawQ)
  ) {
    const deltaCost = userAmount !== null && userAmount > 0 ? userAmount : 5000;
    const curRevenue = monthlyRevenue ?? 45000;
    const curCosts = monthlyExpenses ?? 22000;
    const curEmi = monthlyEmi ?? 14835;
    const isAssumed = monthlyRevenue == null || monthlyExpenses == null || monthlyEmi == null;

    const newCosts = curCosts + deltaCost;
    const curOperatingSurplus = curRevenue - curCosts;
    const curSurplusAfterEmi = curOperatingSurplus - curEmi;
    const newOperatingSurplus = curRevenue - newCosts;
    const newSurplusAfterEmi = newOperatingSurplus - curEmi;

    const assumptionNote = isAssumed
      ? (langMode === 'hi'
          ? " (नोट: आंकड़े उदाहरणार्थ माने गए हैं; अपनी वास्तविक बिक्री व खर्च से जांचें)"
          : langMode === 'hinglish'
          ? " (Note: Yeh aankde illustration ke liye assumed hain)"
          : " (Note: Baseline figures assumed for illustration; actual terms may differ)")
      : "";

    if (langMode === 'hinglish') {
      return {
        answer: `Aapke business ke liye stress test calculation${assumptionNote}:
• Current Monthly Sales: ₹${formatCurrency(curRevenue)}
• Current Operating Costs: ₹${formatCurrency(curCosts)}
• Current EMI: ₹${formatCurrency(curEmi)}
Agar kharch ₹${formatCurrency(deltaCost)} badhkar ₹${formatCurrency(newCosts)} ho jata hai:
• Operating surplus ₹${formatCurrency(curOperatingSurplus)} se ghatkar ₹${formatCurrency(newOperatingSurplus)} reh jayega.
• Har mahine ₹${formatCurrency(curEmi)} ki EMI nikalne ke baad aapke paas ₹${formatCurrency(newSurplusAfterEmi)} ka net surplus bachega.
Natija: In assumptions ke tahat EMI mathematically serviceable hai, lekin bachat margin pehle se kam ho jayega, isliye emergency buffer rakhna zaroori hai.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `आपके व्यवसाय के लिए स्ट्रेस टेस्ट गणना${assumptionNote}:
• वर्तमान मासिक बिक्री: ₹${formatCurrency(curRevenue)}
• वर्तमान परिचालन खर्च: ₹${formatCurrency(curCosts)}
• मासिक बैंक EMI: ₹${formatCurrency(curEmi)}
यदि परिचालन खर्च ₹${formatCurrency(deltaCost)} बढ़कर ₹${formatCurrency(newCosts)} हो जाता है:
• ऑपरेटिंग सरप्लस ₹${formatCurrency(curOperatingSurplus)} से घटकर ₹${formatCurrency(newOperatingSurplus)} रह जाएगा।
• ₹${formatCurrency(curEmi)} की बैंक EMI चुकाने के बाद आपके पास प्रति माह ₹${formatCurrency(newSurplusAfterEmi)} का शुद्ध सरप्लस बचेगा।
निष्कर्ष: यह EMI गणितीय रूप से वहन करने योग्य (serviceable) बनी रहेगी, किंतु आपका सुरक्षा मार्जिन घटकर ₹${formatCurrency(newSurplusAfterEmi)} रह जाएगा।`,
      };
    }
    return {
      answer: `Deterministic stress test calculation for your business${assumptionNote}:
• Current Monthly Revenue: ₹${formatCurrency(curRevenue)}
• Current Operating Costs: ₹${formatCurrency(curCosts)}
• Monthly Loan EMI: ₹${formatCurrency(curEmi)}
If operating costs increase by ₹${formatCurrency(deltaCost)} to ₹${formatCurrency(newCosts)}:
• Operating surplus reduces from ₹${formatCurrency(curOperatingSurplus)} to ₹${formatCurrency(newOperatingSurplus)}.
• Surplus after EMI reduces from ₹${formatCurrency(curSurplusAfterEmi)} to ₹${formatCurrency(newSurplusAfterEmi)}.
Conclusion: The monthly EMI remains mathematically serviceable under these assumptions, but the remaining margin is reduced to ₹${formatCurrency(newSurplusAfterEmi)}. Actual affordability will depend on consistent sales and unexpected expenses.`,
    };
  }

  // INTENT: Loan Necessity / Whether the business can operate without a loan
  if (
    /\b(?:is\s+(?:taking\s+(?:a\s+|the\s+)?)?loan\s+(?:actually\s+|really\s+)?necessary|loan\s+(?:is\s+)?necessary|do\s+i\s+(?:even\s+|really\s+)?need\s+(?:to\s+)?(?:borrow|a\s+loan)|is\s+taking\s+(?:a\s+|the\s+)?loan\s+necessary|can\s+i\s+(?:start|operate|do\s+this)\s+without\s+(?:debt|a\s+loan)|without\s+(?:a\s+)?loan|no\s+loan|bina\s+loan|loan\s+(?:lena\s+)?zaroori|kya\s+loan\s+lena\s+chahiye|loan\s+ke\s+bina)\b/i.test(
      qLower
    ) ||
    /बिना\s*लोन|लोन\s*की\s*ज़रूरत|लोन\s*लेना\s*ज़रूरी/.test(rawQ)
  ) {
    const cost = projectCost ?? (promoterMargin ? promoterMargin / 0.1 : 140000);
    const margin = promoterMargin ?? (cost * 0.1);
    const loanGap = cost - margin;

    if (langMode === 'hinglish') {
      return {
        answer: `Bina loan ke business chalana bilkul sambhav hai, par iske trade-offs samajhna zaroori hai:
1) Capital Gap: Poore planned scale par shuru karne ke liye ₹${formatCurrency(cost)} chahiye, jabki aapka margin ₹${formatCurrency(margin)} hai (gap: ₹${formatCurrency(loanGap)}).
2) Bina Loan Ke Shuruat Ke Tarike:
   • Scope Chhota Karein: Shuruat me sirf basic machine khareedein aur pilot setup se start karein.
   • Lease ya Rent Par Lein: Dukan ya shed khareedne ke bajaye kiraye par lein.
   • Phased Expansion: Pehle 6-12 mahine jo monthly profit bache, usi ko reinvest karke nayi machinery jodein.
Fayda: Aap par har mahine ₹${formatCurrency(monthlyEmi ?? 0)} ki EMI ka koi bojh nahi hoga. Nuksan yeh hai ki shuruati production capacity thodi chhoti rahegi.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `बिना बैंक लोन के व्यवसाय शुरू करना व्यावहारिक रूप से संभव है, बशर्ते आप पैमाने में आवश्यक तालमेल बिठाएं:
1) पूंजी का अंतर: पूर्ण नियोजित क्षमता हेतु कुल लागत ₹${formatCurrency(cost)} है, जबकि उपलब्ध मार्जिन ₹${formatCurrency(margin)} है (अंतर: ₹${formatCurrency(loanGap)})।
2) बिना लोन शुरू करने के व्यावहारिक विकल्प:
   • पायलट स्तर पर शुरुआत: शुरुआत में केवल आवश्यक कोर मशीनरी से कार्य आरंभ करें।
   • क्रय के स्थान पर लीज/किराया: भारी पूंजी लगाने के बजाय परिसर अथवा उपकरण लीज पर लें।
   • लाभ से चरणबद्ध विस्तार: पहले वर्ष अर्जित होने वाले परिचालन मुनाफे को पुनः व्यवसाय में लगाकर विस्तार करें।
लाभ: आपको प्रति माह ₹${formatCurrency(monthlyEmi ?? 0)} की EMI का कोई वित्तीय दबाव नहीं झेलना होगा, हालांकि प्रारंभिक उत्पादन क्षमता सीमित रहेगी।`,
      };
    }
    return {
      answer: `Operating without a bank loan is viable, provided you adapt your initial scale:
1) Capital Structure: Full planned setup requires ₹${formatCurrency(cost)}, while available upfront margin is ₹${formatCurrency(margin)} (gap: ₹${formatCurrency(loanGap)}).
2) Strategies to start debt-free:
   • Pilot Scale: Launch with essential core equipment sized for immediate local demand.
   • Lease over Purchase: Rent workshop space or equipment instead of capital outlay.
   • Organic Expansion: Reinvest early operating surplus into additional equipment rather than taking on debt.
Advantage: You carry zero monthly EMI (saving ₹${formatCurrency(monthlyEmi ?? 0)}/month) and zero default risk. The trade-off is a smaller initial launch capacity.`,
    };
  }

  // INTENT: Government Scheme Documents & Rules (Grounded in official dataset)
  if (
    /\b(documents?|kagaz|dastavez|kaun se document|required document|scheme document|documents needed|eligibility documents)\b/i.test(
      qLower
    ) ||
    /कागजात|दस्तावेज़|डॉक्यूमेंट|कागज़/.test(rawQ)
  ) {
    const schemeObj = getSchemeDetailsForAdvisor(schemeName, category);
    const docs = schemeObj?.documents || [
      'Aadhaar Card / Voter ID (Identity Proof)',
      'Electricity Bill / Ration Card (Address Proof)',
      'Bank Account Passbook / Statement (Last 6 Months)',
      'Business Project Proposal / Quotation',
      'Udyam Registration Certificate where applicable',
    ];
    const sName = schemeObj?.scheme_name || schemeName;
    const sourceInfo = schemeObj?.official_source
      ? ` [Source: ${schemeObj.official_source.organization}, Verified: ${schemeObj.official_source.verified_date}]`
      : ' [Subject to lending bank guidelines]';

    if (langMode === 'hinglish') {
      return {
        answer: `${sName} ke liye aavedan karte samay aamtaur par nimnlikhit official documents zaroori hote hain${sourceInfo}:
${docs.map((d: string, i: number) => `${i + 1}) ${d}`).join('\n')}
Important: Bank loan ki antim swikriti aur byaj dar bank branch ke physical verification aur credit assessment par nirbhar karti hai. Kisi bhi anadhikrut agent ko rishwat na dein.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `${sName} हेतु आवेदन के लिए आधिकारिक रूप से आवश्यक मुख्य दस्तावेज़${sourceInfo}:
${docs.map((d: string, i: number) => `${i + 1}) ${d}`).join('\n')}
महत्वपूर्ण नियम: ऋण की अंतिम स्वीकृति एवं ब्याज दर संबंधित बैंक शाखा द्वारा आधिकारिक भौतिक सत्यापन और क्रेडिट मूल्यांकन के आधार पर निर्धारित की जाती है।`,
      };
    }
    return {
      answer: `Official required documentation for ${sName}${sourceInfo}:
${docs.map((d: string, i: number) => `${i + 1}. ${d}`).join('\n')}
Important note: Final sanction, interest rate, and tenure are determined by the lending institution under official scheme rules upon appraisal. Additional lender-specific documents may be requested during branch verification.`,
    };
  }

  // INTENT: Operating Surplus, Break-Even & Surplus After EMI
  if (
    /\b(operating surplus|surplus after emi|break\s*even|break-even|breakeven|shuddh bachat|net surplus|surplus kitna)\b/i.test(
      qLower
    ) ||
    /ब्रेक\s*ईवन|ऑपरेटिंग\s*सरप्लस|EMI\s*के\s*बाद\s*बचत/.test(rawQ)
  ) {
    const rev = monthlyRevenue ?? effectiveRevenue;
    const exp = monthlyExpenses ?? effectiveExpenses;
    const opSurplus = rev - exp;
    const emi = monthlyEmi ?? 0;
    const surplusAfter = opSurplus - emi;
    const breakEven = exp + emi;

    if (langMode === 'hinglish') {
      return {
        answer: `Aapke business ka operating surplus aur break-even hisab:
• Monthly Revenue: ₹${formatCurrency(rev)}
• Monthly Operating Costs: ₹${formatCurrency(exp)}
• Operating Surplus (EMI se pehle): ₹${formatCurrency(opSurplus)}
• Monthly Loan EMI: ₹${formatCurrency(emi)}
• Surplus After EMI: ₹${formatCurrency(surplusAfter)}
• Minimum Break-Even Sales Needed: ₹${formatCurrency(breakEven)} har mahine (is bikri par na labh hoga na hani).
In anumanon ke aadhar par aapka business surplus me hai, par har mahine break-even se kam se kam 20–30% zyada bikri ka lakshya rakhein.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `आपके व्यवसाय का ऑपरेटिंग सरप्लस और ब्रेक-ईवन विश्लेषण:
• अनुमानित मासिक बिक्री: ₹${formatCurrency(rev)}
• मासिक परिचालन लागत: ₹${formatCurrency(exp)}
• ऑपरेटिंग सरप्लस (EMI से पूर्व): ₹${formatCurrency(opSurplus)}
• मासिक बैंक EMI: ₹${formatCurrency(emi)}
• EMI भुगतान पश्चात शुद्ध सरप्लस: ₹${formatCurrency(surplusAfter)}
• न्यूनतम ब्रेक-ईवन बिक्री: ₹${formatCurrency(breakEven)} प्रति माह (इस स्तर पर कोई लाभ या हानि नहीं होगी)।
व्यवसाय वित्तीय दृष्टि से सकारात्मक है, किंतु अप्रत्याशित खर्चों के लिए ब्रेक-ईवन से कम से कम 25% अधिक बिक्री बनाए रखना सुरक्षित रहेगा।`,
      };
    }
    return {
      answer: `Deterministic operating surplus and break-even breakdown:
• Expected Monthly Revenue: ₹${formatCurrency(rev)}
• Monthly Operating Costs: ₹${formatCurrency(exp)}
• Operating Surplus Before EMI: ₹${formatCurrency(opSurplus)}
• Monthly Loan EMI: ₹${formatCurrency(emi)}
• Surplus After EMI: ₹${formatCurrency(surplusAfter)}
• Break-Even Revenue Threshold: ₹${formatCurrency(breakEven)}/month (minimum sales required to cover costs + EMI without a loss).
Under these assumptions, the business operates with positive cash flow. Maintaining sales at least 25% above break-even is recommended to guard against market slowdowns.`,
    };
  }

  // INTENT: What if I take a smaller loan?
  if (
    /\b(what if i take a smaller loan|smaller loan|take a smaller loan|chhota loan|kam loan lu|kam loan)\b/i.test(
      qLower
    )
  ) {
    if (langMode === 'hinglish') {
      return {
        answer: `Agar aap chhota loan lete hain (jaise ₹${formatCurrency(eligibleLoan)} ki jagah kam rashi): Aapki monthly EMI ₹${formatCurrency(monthlyEmi)} se kaafi kam ho jayegi aur byaj ka bojh kam hoga. Lekin iske liye aapko ya to khud ka margin badhana hoga ya shuruat mein equipment aur machinery ka scale thoda chhota rakhna hoga.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `यदि आप कम बैंक ऋण लेते हैं: आपकी मासिक EMI ₹${formatCurrency(monthlyEmi)} से काफी कम हो जाएगी और ब्याज का खर्च बचेगा। हालांकि इसके लिए आपको या तो स्वयं का मार्जिन बढ़ाना होगा या शुरुआती मशीनरी का पैमाना थोड़ा छोटा रखना होगा।`,
      };
    }
    return {
      answer: `If you take a smaller loan: Your monthly EMI decreases below ₹${formatCurrency(monthlyEmi)}, saving on interest costs and easing debt servicing. However, you will either need to contribute a higher promoter margin upfront or phase your initial equipment purchases.`,
    };
  }

  // INTENT: Can I repay this from expected profit?
  if (
    /\b(can i repay this from the expected profit|can i repay|repay from profit|munafey se loan|profit se loan|profit se chuk jayega)\b/i.test(
      qLower
    )
  ) {
    if (monthlyProfit >= monthlyEmi) {
      if (langMode === 'hinglish') {
        return {
          answer: `Haan, bilkul! Aapka anumanit net monthly profit ₹${formatCurrency(monthlyProfit)} hai, jabki monthly EMI sirf ₹${formatCurrency(monthlyEmi)} hai. Yani aapka munafa EMI se ${dscr} guna bada hai. Loan ki poori EMI har mahine chukane ke baad bhi aapke paas ₹${formatCurrency(netTakeHome)} shuddh kamai bachegi.`,
        };
      }
      if (langMode === 'hi') {
        return {
          answer: `हाँ, बिल्कुल! आपका अनुमानित शुद्ध मासिक लाभ ₹${formatCurrency(monthlyProfit)} है, जबकि बैंक EMI केवल ₹${formatCurrency(monthlyEmi)} है। आपका लाभ EMI का ${dscr} गुना है, इसलिए आप आसानी से व्यवसाय के लाभ से ही लोन चुका देंगे और हर महीने ₹${formatCurrency(netTakeHome)} का शुद्ध सरप्लस भी बचेगा।`,
        };
      }
      return {
        answer: `Yes, absolutely! Your projected net monthly profit is ₹${formatCurrency(monthlyProfit)}, while your monthly EMI is only ₹${formatCurrency(monthlyEmi)}. Your profit covers the EMI by ${dscr} times, meaning the business comfortably repays the loan from its operations while retaining ₹${formatCurrency(netTakeHome)} in monthly surplus.`,
      };
    } else {
      if (langMode === 'hinglish') {
        return {
          answer: `Filhal profit (₹${formatCurrency(monthlyProfit)}) EMI (₹${formatCurrency(monthlyEmi)}) se kam hai, isliye seedhe profit se repayment mushkil hogi jab tak aap monthly kharche kam na karein ya margin badhakar EMI na ghatayein.`,
        };
      }
      if (langMode === 'hi') {
        return {
          answer: `वर्तमान में लाभ (₹${formatCurrency(monthlyProfit)}) EMI (₹${formatCurrency(monthlyEmi)}) से कम है। इसके लिए आपको या तो परिचालन लागत घटानी होगी या अधिक मार्जिन लगाकर EMI कम करनी होगी।`,
        };
      }
      return {
        answer: `Currently, projected monthly profit (₹${formatCurrency(monthlyProfit)}) is lower than the monthly EMI (₹${formatCurrency(monthlyEmi)}). You would need to reduce operating expenses or invest more margin upfront to lower the debt burden.`,
      };
    }
  }

  // INTENT: Why do I need this much margin? / Why 10% margin?
  if (
    /\b(why do i need this much margin|why do i need margin|why margin|margin kyu|10% margin|why 10% margin|margin itna kyu)\b/i.test(
      qLower
    )
  ) {
    if (langMode === 'hinglish') {
      return {
        answer: `10% promoter margin (₹${formatCurrency(promoterMargin)}) bank aur ${schemeName} ka mandatory niyam hai. Iske do mukhya kaaran hain: 1) Yeh bank ko dikhata hai ki entrepreneur ka apna risk aur commitment business mein juda hai; 2) Is 10% margin ke aadhar par hi bank baaki 90% (₹${formatCurrency(eligibleLoan)}) ka loan sanction karta hai. Yeh minimum standard rule hai.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `10% प्रमोटर मार्जिन (₹${formatCurrency(promoterMargin)}) बैंक और ${schemeName} का अनिवार्य नियम है। यह उद्यमी के समर्पण और जोखिम सहभागिता (equity commitment) को दर्शाता है। इसी 10% अंशदान के आधार पर बैंक शेष 90% (₹${formatCurrency(eligibleLoan)}) का ऋण स्वीकृत करता है।`,
      };
    }
    return {
      answer: `The 10% promoter margin (₹${formatCurrency(promoterMargin)}) is a mandatory regulatory requirement under ${schemeName} and bank lending guidelines. It ensures the borrower maintains a personal equity stake and risk commitment in the venture, enabling the lending bank to safely sanction the remaining 90% (₹${formatCurrency(eligibleLoan)}).`,
    };
  }

  // INTENT: Specific Amount / Budget Starting Query (e.g. "Can I start this with ₹1 lakh?", "I only have 80,000 rupees", "Mere paas sirf 80 hazaar hai, kaam ho jayega kya?")
  if (
    userAmount !== null &&
    (/\b(start|shuru|invest|afford|have|paas|enough|ho jayega|kaam ho jayega|chahiye|budget|rupees|lakh|hazaar|hazar)\b/i.test(qLower) ||
      qLower.includes('can i start') ||
      qLower.includes('only have') ||
      qLower.includes('mere paas'))
  ) {
    const isWithoutLoanIntent =
      /\b(without\s+(?:a\s+|any\s+|taking\s+a\s+)?loan|bina loan|no loan|loan nahi|bina bank|debt[- ]free)\b/i.test(qLower);

    if (isWithoutLoanIntent) {
      const shortfallWithoutLoan = Math.max(0, projectCost - userAmount);
      if (shortfallWithoutLoan === 0) {
        if (langMode === 'hinglish') {
          return {
            answer: `Haan bhai, bilkul! Aapka total project cost ₹${formatCurrency(projectCost)} hai aur aapke paas poore ₹${formatCurrency(userAmount)} hain. Aap bina kisi bank loan ya EMI ke 100% apne paise se yeh business shuru kar sakte hain, jisse aapka poora munafa aapke paas hi rahega.`,
          };
        }
        if (langMode === 'hi') {
          return {
            answer: `हाँ, आप बिना किसी लोन के यह व्यापार शुरू कर सकते हैं। आपका कुल प्रोजेक्ट खर्च ₹${formatCurrency(projectCost)} है और आपके पास ₹${formatCurrency(userAmount)} उपलब्ध हैं। आपको कोई मासिक EMI नहीं भरनी होगी और पूरा शुद्ध लाभ आपका होगा।`,
          };
        }
        return {
          answer: `Yes, you can start completely without a bank loan. Your total estimated project cost is ₹${formatCurrency(projectCost)}, and your available cash of ₹${formatCurrency(userAmount)} covers 100% of it. This eliminates interest costs and monthly EMI obligations entirely.`,
        };
      } else {
        if (langMode === 'hinglish') {
          return {
            answer: `Bina loan ke shuru karne ke liye aapko poora project cost ₹${formatCurrency(projectCost)} chahiye. Aapke paas ₹${formatCurrency(userAmount)} hain, yaani lagbhag ₹${formatCurrency(shortfallWithoutLoan)} ki kami hai. Ya to aap purani machine khareed kar setup cost kam karein, ya phir ₹${formatCurrency(eligibleLoan)} ka eligible sarkari bank loan le sakte hain.`,
          };
        }
        if (langMode === 'hi') {
          return {
            answer: `बिना लोन के पूरा प्रोजेक्ट शुरू करने के लिए कुल ₹${formatCurrency(projectCost)} की आवश्यकता है। ₹${formatCurrency(userAmount)} के साथ आपके पास ₹${formatCurrency(shortfallWithoutLoan)} की कमी रहेगी। आप या तो शुरुआत में मशीनरी चरणबद्ध तरीके से खरीदें, या योजना के तहत ₹${formatCurrency(eligibleLoan)} तक का बैंक लोन ले सकते हैं।`,
          };
        }
        return {
          answer: `To start completely without a bank loan, you would need the full project cost of ₹${formatCurrency(projectCost)}. With your available cash of ₹${formatCurrency(userAmount)}, you have a gap of ₹${formatCurrency(shortfallWithoutLoan)}. You can either scale down initial machinery to fit your budget, or use the eligible ₹${formatCurrency(eligibleLoan)} bank loan under ${schemeName}.`,
        };
      }
    }

    // Standard loan-assisted start
    const meetsMargin = userAmount >= promoterMargin;
    const surplusMargin = userAmount - promoterMargin;
    const marginShortfall = promoterMargin - userAmount;

    if (meetsMargin) {
      if (langMode === 'hinglish') {
        return {
          answer: `Haan bhai, bilkul ho jayega! Is business ke liye total project cost ₹${formatCurrency(projectCost)} hai, jismein bank niyam ke mutabiq promoter margin (aapka apna lagaya paisa) sirf ₹${formatCurrency(promoterMargin)} (10%) chahiye. Kyunki aapke paas ₹${formatCurrency(userAmount)} hain, aap margin asaani se de sakte hain aur baaki ₹${formatCurrency(eligibleLoan)} ka eligible loan ${schemeName} ke tahat mil sakta hai. Margin dene ke baad bhi aapke paas ₹${formatCurrency(surplusMargin)} emergency working capital ke liye bachenge.`,
        };
      }
      if (langMode === 'hi') {
        return {
          answer: `हाँ, आप निश्चित रूप से शुरू कर सकते हैं! इस प्रोजेक्ट की कुल अनुमानित लागत ₹${formatCurrency(projectCost)} है, जिसके लिए आवश्यक प्रमोटर मार्जिन (आपका अपना अंशदान) केवल ₹${formatCurrency(promoterMargin)} (10%) है। आपके पास ₹${formatCurrency(userAmount)} उपलब्ध हैं, जो मार्जिन के लिए पर्याप्त हैं। शेष ₹${formatCurrency(eligibleLoan)} की राशि ${schemeName} के तहत पात्र बैंक लोन से पूरी हो सकती है।`,
        };
      }
      return {
        answer: `Yes, you can comfortably start! The total estimated project cost is ₹${formatCurrency(projectCost)}, which requires a minimum promoter margin (your 10% cash contribution) of ₹${formatCurrency(promoterMargin)}. Since you have ₹${formatCurrency(userAmount)}, you fulfill the margin requirement, and the remaining ₹${formatCurrency(eligibleLoan)} is eligible for bank financing under ${schemeName}. You will even retain ₹${formatCurrency(surplusMargin)} as emergency operational buffer.`,
      };
    } else {
      if (langMode === 'hinglish') {
        return {
          answer: `Total project cost ₹${formatCurrency(projectCost)} hai, jismein bank ke niyam anusar kam se kam 10% promoter margin (₹${formatCurrency(promoterMargin)}) aapko lagana hota hai. Aapke paas ₹${formatCurrency(userAmount)} hain, yaani margin ke liye ₹${formatCurrency(marginShortfall)} kam pad rahe hain. Aap initial setup cost thoda kam karke ya kisi sahyogi ke sath milkar yeh margin jod sakte hain.`,
        };
      }
      if (langMode === 'hi') {
        return {
          answer: `इस प्रोजेक्ट की कुल लागत ₹${formatCurrency(projectCost)} है, जिसके लिए बैंक के नियमानुसार 10% प्रमोटर मार्जिन (₹${formatCurrency(promoterMargin)}) आवश्यक है। ₹${formatCurrency(userAmount)} के साथ आपके पास आवश्यक मार्जिन में ₹${formatCurrency(marginShortfall)} की कमी है। आप अपनी मशीनरी बजट को थोड़ा कम करके आवेदन कर सकते हैं।`,
        };
      }
      return {
        answer: `For a total project cost of ₹${formatCurrency(projectCost)}, the mandatory promoter margin (10% self-contribution) is ₹${formatCurrency(promoterMargin)}. With your ₹${formatCurrency(userAmount)}, you currently have a shortfall of ₹${formatCurrency(marginShortfall)} to meet the bank's minimum margin criterion. You can bridge this gap by phasing equipment purchases to reduce overall setup cost.`,
      };
    }
  }

  // INTENT: Without taking a loan / Self financing without amount mentioned
  if (
    /\b(without\s+(?:a\s+|any\s+|taking\s+a\s+)?loan|no loan|bina loan|bina kisi loan|self funding|bina bank|own money|debt[- ]free)\b/i.test(qLower)
  ) {
    const gap = projectCost - promoterMargin;
    if (langMode === 'hinglish') {
      return {
        answer: `Bina kisi bank loan ke shuru karne ke liye aapko poori project cost ₹${formatCurrency(projectCost)} khud lagani hogi. Agar aap sirf apna ₹${formatCurrency(promoterMargin)} ka margin lagate hain, to ₹${formatCurrency(gap)} ki kami hogi. Bina karz ke shuru karne ke liye aap machinery kiraye (lease) par le sakte hain ya shuruat me sirf zaroori equipment se chhota pilot start karein.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `बिना बैंक लोन के इस व्यवसाय को शुरू करने के लिए आपको पूरी प्रोजेक्ट लागत ₹${formatCurrency(projectCost)} स्वयं लगानी होगी। वर्तमान में आपके मार्जिन (₹${formatCurrency(promoterMargin)}) के अलावा ₹${formatCurrency(gap)} की अतिरिक्त आवश्यकता होगी। यदि आप लोन नहीं लेना चाहते, तो आप शुरुआत में उपकरण लीज पर ले सकते हैं या छोटे पैमाने पर शुरुआत कर सकते हैं।`,
      };
    }
    return {
      answer: `To establish this business without any bank debt, you would need to fund the entire project cost of ₹${formatCurrency(projectCost)} upfront. Based on your current promoter contribution of ₹${formatCurrency(promoterMargin)}, there is a capital gap of ₹${formatCurrency(gap)}. To start without borrowing, you could lease machinery or begin with a phased pilot setup.`,
    };
  }

  // INTENT: How much more money will I need? / Shortfall query
  if (
    /\b(how much more money|more money|how much more|aur kitna paisa|aur kitna chahiye|shortfall)\b/i.test(qLower)
  ) {
    if (langMode === 'hinglish') {
      return {
        answer: `Aapko project setup ke liye koi aur extra paisa nahi chahiye! Total project cost ₹${formatCurrency(projectCost)} hai, jismein aapka margin ₹${formatCurrency(promoterMargin)} aur eligible bank loan ₹${formatCurrency(eligibleLoan)} milkar poori 100% funding kar dete hain. Haan, backup ke liye ₹${formatCurrency(effectiveExpenses || 25000)} ka emergency working capital zaroor paas rakhein.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `प्रोजेक्ट सेटअप के लिए आपको किसी अतिरिक्त पूंजी की आवश्यकता नहीं है। ₹${formatCurrency(projectCost)} की कुल लागत में से आपका मार्जिन ₹${formatCurrency(promoterMargin)} और ₹${formatCurrency(eligibleLoan)} का बैंक लोन मिलकर पूरा 100% खर्च कवर कर देते हैं। दैनिक खर्चों के लिए लगभग ₹${formatCurrency(effectiveExpenses || 25000)} का रिज़र्व फंड रखना उचित होगा।`,
      };
    }
    return {
      answer: `You do not need any additional money for the core project setup. The ₹${formatCurrency(projectCost)} total cost is completely covered by your ₹${formatCurrency(promoterMargin)} promoter margin plus the ₹${formatCurrency(eligibleLoan)} eligible bank loan under ${schemeName}. We only recommend holding approximately ₹${formatCurrency(effectiveExpenses || 25000)} as an operating cash reserve.`,
    };
  }

  // INTENT: How much will I pay every month? / What is my EMI? / Har mahine kitna dena padega?
  if (
    /\b(how much will i pay every month|how much will i pay|pay every month|what is my emi|my emi|har mahine kitna|kitna dena padega|har mahine ki emi|monthly payment)\b/i.test(
      qLower
    )
  ) {
    const rateTextEn = interestRate != null ? `at ${interestRate}% annual reducing interest` : 'at standard reducing interest';
    const rateTextHi = interestRate != null ? `${interestRate}% वार्षिक ब्याज` : 'वार्षिक बैंक ब्याज दर';
    const rateTextHing = interestRate != null ? `${interestRate}% byaj` : 'bank byaj';
    const tenureTextEn = tenure != null ? `over a ${tenure}-month tenure${moratorium != null ? ` (with a ${moratorium}-month moratorium)` : ''}` : 'over the loan tenure';
    const tenureTextHi = tenure != null ? `${tenure} माह की अवधि${moratorium != null ? ` (${moratorium} माह मोराटोरियम सहित)` : ''}` : 'ऋण अवधि';
    const tenureTextHing = tenure != null ? `${tenure} mahine ke samay` : 'loan samay';

    if (langMode === 'hinglish') {
      return {
        answer: `Aapko har mahine lagbhag ₹${formatCurrency(monthlyEmi)} ki EMI deni hogi. Yeh calculation ₹${formatCurrency(eligibleLoan)} ke bank loan par ${rateTextHing} aur ${tenureTextHing} ke hisab se hai. Aapke har mahine ke ₹${formatCurrency(monthlyProfit)} profit mein se yeh aasaani se chuk jayegi aur ₹${formatCurrency(netTakeHome)} aapki jeb mein bachenge.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `आपको प्रति माह लगभग ₹${formatCurrency(monthlyEmi)} की बैंक EMI चुकानी होगी। यह गणना ₹${formatCurrency(eligibleLoan)} के पात्र लोन पर ${rateTextHi} और ${tenureTextHi} के आधार पर है। ₹${formatCurrency(monthlyProfit)} के मासिक लाभ से यह किश्त आसानी से निकल जाएगी और ₹${formatCurrency(netTakeHome)} शुद्ध बचत होगी।`,
      };
    }
    return {
      answer: `You will pay approximately ₹${formatCurrency(monthlyEmi)} each month as loan EMI. This is computed on an eligible loan of ₹${formatCurrency(eligibleLoan)} ${rateTextEn} ${tenureTextEn}. With an estimated net monthly profit of ₹${formatCurrency(monthlyProfit)}, this leaves ₹${formatCurrency(netTakeHome)} in take-home monthly surplus.`,
    };
  }

  // INTENT: Why is EMI so high? / Explain EMI
  if (
    /\b(why is my emi so high|why is the emi this high|emi so high|emi itni zyada kyu|emi high|kam emi)\b/i.test(qLower)
  ) {
    const rateTextEn = interestRate != null ? `at ${interestRate}% annual reducing interest` : 'at standard reducing interest';
    const rateTextHi = interestRate != null ? `${interestRate}% वार्षिक ब्याज` : 'वार्षिक ब्याज दर';
    const rateTextHing = interestRate != null ? `${interestRate}% byaj` : 'byaj';
    const tenureTextEn = tenure != null ? `over ${tenure} months` : 'over the repayment tenure';
    const tenureTextHi = tenure != null ? `${tenure} माह की अवधि` : 'ऋण अवधि';
    const tenureTextHing = tenure != null ? `${tenure} mahine` : 'tenure';

    if (langMode === 'hinglish') {
      return {
        answer: `Aapki monthly EMI ₹${formatCurrency(monthlyEmi)} hai, jo ₹${formatCurrency(eligibleLoan)} ke loan par ${rateTextHing} aur ${tenureTextHing} ke aadhar par reducing balance se nikali gayi hai. Achhi baat yeh hai ki aapka anumanit monthly profit ₹${formatCurrency(monthlyProfit)} hai, jo EMI se ${dscr} guna zyada hai! EMI bharne ke baad bhi aapke paas har mahine lagbhag ₹${formatCurrency(netTakeHome)} ka shuddh munafa bachega. Agar aap EMI kam karna chahte hain, to shuruat me apna margin badha sakte hain.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `आपकी मासिक EMI ₹${formatCurrency(monthlyEmi)} है, जो ₹${formatCurrency(eligibleLoan)} के बैंक लोन पर ${rateTextHi} और ${tenureTextHi} के आधार पर निर्धारित है। आपका अनुमानित मासिक लाभ ₹${formatCurrency(monthlyProfit)} है, जो EMI का ${dscr} गुना है। EMI चुकाने के बाद भी आपके पास ₹${formatCurrency(netTakeHome)} का शुद्ध लाभ सुरक्षित रहता है। आप अधिक मार्जिन लगाकर इसे और कम कर सकते हैं।`,
      };
    }
    return {
      answer: `Your monthly EMI is ₹${formatCurrency(monthlyEmi)}, calculated on an eligible loan of ₹${formatCurrency(eligibleLoan)} ${rateTextEn} ${tenureTextEn}. With an estimated net monthly profit of ₹${formatCurrency(monthlyProfit)}, your profit comfortably covers this EMI by ${dscr}x, leaving ₹${formatCurrency(netTakeHome)} in take-home monthly surplus. You can lower the EMI by contributing higher upfront margin capital.`,
    };
  }

  // INTENT: How much loan can I get? / Loan eligibility
  if (
    /\b(how much loan|how much loan can i get|how much loan would i need|loan kitna|kitna loan milega|loan eligibility|eligible loan)\b/i.test(
      qLower
    )
  ) {
    if (langMode === 'hinglish') {
      return {
        answer: `Aapke ₹${formatCurrency(projectCost)} ke project par ${schemeName} ke tahat aapko ₹${formatCurrency(eligibleLoan)} tak ka eligible bank loan mil sakta hai (jo total cost ka 90% hai). Isme aapka apna promoter margin sirf ₹${formatCurrency(promoterMargin)} (10%) rahega, byaj dar ${interestRate}% p.a. hogi, aur repayment samay ${tenure} mahine (jismein ${moratorium} mahine ka moratorium shamil hai) rahega.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `₹${formatCurrency(projectCost)} के प्रोजेक्ट लागत पर ${schemeName} के तहत आप अधिकतम ₹${formatCurrency(eligibleLoan)} (90%) के बैंक लोन के लिए पात्र हैं। इसमें आपका अंशदान ₹${formatCurrency(promoterMargin)} (10%) होगा, ब्याज दर ${interestRate}% वार्षिक और चुकाने की अवधि ${tenure} माह (${moratorium} माह मोराटोरियम सहित) होगी।`,
      };
    }
    return {
      answer: `Under the ${schemeName}, based on your total project cost of ₹${formatCurrency(projectCost)} and a 10% promoter contribution of ₹${formatCurrency(promoterMargin)}, your eligible bank loan is ₹${formatCurrency(eligibleLoan)} (90% of total cost). The terms include an annual interest rate of ${interestRate}%, a repayment tenure of ${tenure} months, and a ${moratorium}-month moratorium.`,
    };
  }

  // INTENT: Why is this feasible? / Why do you say this business is feasible?
  if (
    /\b(why is this feasible|why feasible|why do you say this business is feasible|feasible kyu|kyu feasible bola|practical)\b/i.test(
      qLower
    )
  ) {
    if (langMode === 'hinglish') {
      return {
        answer: `Is business ko '${feasibility}' isliye kaha gaya hai kyunki iske 3 bade financial pillars mazboot hain: 1) Cash Flow: Har mahine ₹${formatCurrency(monthlyProfit)} ka net profit hota hai jo ₹${formatCurrency(monthlyEmi)} ki EMI se ${dscr}x zyada hai; 2) ROI: Saal ka ${roiPercentage.toFixed(1)}% return mil raha hai; 3) Low Risk: Kharch (₹${formatCurrency(effectiveExpenses)}) revenue ke mutabiq santulit hai.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `इस व्यवसाय को '${feasibility}' घोषित करने के 3 ठोस वित्तीय आधार हैं: 1) ऋण सुरक्षा: ₹${formatCurrency(monthlyProfit)} का शुद्ध लाभ ₹${formatCurrency(monthlyEmi)} की EMI को ${dscr} गुना कवर करता है; 2) स्वस्थ लाभप्रदता: वार्षिक ROI ${roiPercentage.toFixed(1)}% है; 3) परिचालन लागत (₹${formatCurrency(effectiveExpenses)}) कुल बिक्री के मुकाबले उचित स्तर पर है।`,
      };
    }
    return {
      answer: `This business is rated '${feasibility}' because of three concrete financial fundamentals: 1) Healthy Debt Service: Your net monthly profit of ₹${formatCurrency(monthlyProfit)} covers the ₹${formatCurrency(monthlyEmi)} EMI by ${dscr} times; 2) Attractive Returns: An estimated annual ROI of ${roiPercentage.toFixed(1)}%; 3) Balanced Operations: Operating expenses of ₹${formatCurrency(effectiveExpenses)} leave a reliable cash surplus every month.`,
    };
  }

  // INTENT: Why is this risky? / What are the main risks for this business here? / What could make this business fail?
  if (
    /\b(why\s+risky|why\s+did\s+you\s+say\s+this\s+is\s+risky|make\s+this\s+business\s+fail|fail\s+kyu|khatra\s+kya|khatre\s+kya|biggest\s+risks|what\s+are\s+the\s+main\s+risks|main\s+risks|risk\s+factor|risks\s+for\s+this\s+business|what\s+risks|kya\s+khatra|kya\s+khatre)\b/i.test(
      qLower
    ) ||
    /(?:मुख्य\s*जोखिम|बड़ा\s*जोखिम|खतरा|खतरे|नुकसान|जोखिम\s*क्या)/.test(rawQ)
  ) {
    const hasDebt = monthlyEmi > 0 && eligibleLoan > 0;

    if (catProfile === 'fishery') {
      if (langMode === 'hinglish') {
        return {
          answer: `Fish farming business (${businessName}) mein ${location} ke context me mukhya practical risks yeh hain:\n1) Paani ki quality aur oxygen level kam hona jisse machhliyon me mortality (maut) ka khatra rehta hai;\n2) Commercial fish feed (dana) ki lagatar badhti keemat jo operational kharch ka sabse bada hissa hai;\n3) Barish/monsoon me talaab me overflow ya garmi me paani sookhna;\n4) Harvest ke time mandi me daam girna aur local cold storage ki kami;\n5) Chori aur pakshiyon (predators) se nuksan.${hasDebt ? `\n6) Machhli badi hone tak har mahine ₹${formatCurrency(monthlyEmi)} ki EMI samay par nikalna.` : ''}\nIn risks se bachne ke liye regular water testing, aeration backup aur backup cash zaroor rakhein.`,
        };
      }
      if (langMode === 'hi') {
        return {
          answer: `मत्स्य पालन व्यवसाय (${businessName}) के लिए ${location} में मुख्य व्यावहारिक जोखिम निम्नलिखित हैं:\n1) पानी की गुणवत्ता व घुलित ऑक्सीजन में कमी से मछलियों में मृत्यु दर (mortality);\n2) कमर्शियल फ़ीड (मछली आहार) की अनियंत्रित कीमतें जो कुल खर्च का 60–70% होती हैं;\n3) अत्यधिक वर्षा/बाढ़ से तालाब ओवरफ्लो या ग्रीष्मकाल में जल स्तर गिरना;\n4) फसल तैयार होने पर स्थानीय मंडी में भाव गिरना व कोल्ड स्टोरेज का अभाव;\n5) पक्षियों व परभक्षियों से नुकसान।${hasDebt ? `\n6) मछलियों के परिपक्व होने तक प्रति माह ₹${formatCurrency(monthlyEmi)} की बैंक EMI का समय पर प्रबंधन।` : ''}\nनियमित जल परीक्षण और आपातकालीन रिज़र्व रखने से इन जोखिमों को नियंत्रित किया जा सकता है।`,
        };
      }
      return {
        answer: `For a fish farming business (${businessName}) in ${location}, the primary operational risks are:\n1) Water quality deterioration and dissolved oxygen depletion causing fish mortality;\n2) Escalating commercial feed costs, which form 60–70% of operating expenses;\n3) Monsoon flooding or extreme seasonal water evaporation;\n4) Post-harvest mandi price dips and lack of refrigerated cold storage;\n5) Bird predation and theft.${hasDebt ? `\n6) Debt servicing on your ₹${formatCurrency(monthlyEmi)} monthly EMI during the fingerling grow-out period.` : ''}\nKeeping water testing kits, backup aerators, and an operating cash reserve directly mitigates these hazards.`,
      };
    }

    if (catProfile === 'dairy') {
      if (langMode === 'hinglish') {
        return {
          answer: `Dairy business mein ${location} ke hisaab se mukhya risks yeh hain:\n1) Pashuon me bimariyan (FMD, mastitis) jisse doodh utpadan achanak gir sakta hai;\n2) Hare chara aur feed ki badhti keemat;\n3) Garmi ke mausam me lactation yield me kami;\n4) Samay par chilled collection na hone par doodh kharab hone ka risk.${hasDebt ? `\n5) Dry period me ₹${formatCurrency(monthlyEmi)} ki monthly EMI ka niyamit bhugtan.` : ''}`,
        };
      }
      if (langMode === 'hi') {
        return {
          answer: `डेयरी व्यवसाय में ${location} के संदर्भ में मुख्य जोखिम:\n1) पशुओं में मौसमी बीमारियां व थनैला जिससे दुग्ध उत्पादन घट सकता है;\n2) सूखे व हरे चारे तथा संतुलित आहार की बढ़ती कीमतें;\n3) ग्रीष्म ऋतु में दुग्ध उत्पादन में प्राकृतिक गिरावट;\n4) समय पर प्रशीतन (chilling) न मिलने पर दूध खराब होने का खतरा।${hasDebt ? `\n5) पशुओं के ड्राई पीरियड में ₹${formatCurrency(monthlyEmi)} की बैंक किश्त का समय पर भुगतान।` : ''}`,
        };
      }
      return {
        answer: `For a dairy enterprise in ${location}, the key operational risks are:\n1) Cattle morbidity and diseases (mastitis, FMD) impacting milk production;\n2) Feed and green fodder cost inflation;\n3) Summer drop in lactation yields;\n4) Milk spoilage risk without rapid chilling or reliable local collection.${hasDebt ? `\n5) Servicing the ₹${formatCurrency(monthlyEmi)} monthly EMI during cattle dry cycles.` : ''}`,
      };
    }

    if (catProfile === 'poultry') {
      if (langMode === 'hinglish') {
        return {
          answer: `Poultry business ke mukhya practical risks:\n1) Sangramak bimariyan (bird flu, Ranikhet) jisse batch mortality ka khatra rehta hai;\n2) Soyabean aur makka feed ke daam me tezi;\n3) Garmi me heat stroke aur sardi me temperature control;\n4) Wholesale mandi me chicken aur andon ke daam achanak girna.${hasDebt ? `\n5) Batch bikne ke beech ke dino me ₹${formatCurrency(monthlyEmi)} ki EMI ka intazam.` : ''}`,
        };
      }
      if (langMode === 'hi') {
        return {
          answer: `पोल्ट्री व्यवसाय के प्रमुख व्यावहारिक जोखिम:\n1) संक्रामक बीमारियां (बर्ड फ्लू, रानीखेत) जिससे बर्ड्स की मृत्यु दर का खतरा;\n2) मक्का व सोयाबीन आहार की कीमतों में उतार-चढ़ाव;\n3) मौसमी तापमान व लू (heat stress) का प्रभाव;\n4) थोक बाज़ार में चिकन व अंडों की कीमतों में अचानक गिरावट।${hasDebt ? `\n5) नए बैच के तैयार होने तक ₹${formatCurrency(monthlyEmi)} की EMI का प्रबंधन।` : ''}`,
        };
      }
      return {
        answer: `For a poultry venture in ${location}, the main operational risks are:\n1) Highly contagious avian epidemics (bird flu, Ranikhet) causing flock mortality;\n2) Volatility in maize and soybean feed prices;\n3) Extreme seasonal temperature and heat stress;\n4) Sudden wholesale price collapses for broilers and eggs.${hasDebt ? `\n5) Servicing your ₹${formatCurrency(monthlyEmi)} monthly EMI between flock harvesting cycles.` : ''}`,
      };
    }

    if (catProfile === 'agriculture') {
      if (langMode === 'hinglish') {
        return {
          answer: `Kheti aur agriculture business mein mukhya risks:\n1) Mausam aur barish ki anishchitta;\n2) Keede aur fasal ki bimariyan;\n3) Fasal aane par mandi me achanak daam girna;\n4) Beej aur khad ke badhte daam.${hasDebt ? `\n5) Harvest ke beech me ₹${formatCurrency(monthlyEmi)} ki monthly EMI ka bhugtan.` : ''}`,
        };
      }
      if (langMode === 'hi') {
        return {
          answer: `कृषि व्यवसाय में मुख्य जोखिम:\n1) मौसम व अनियंत्रित वर्षा का चक्र;\n2) कीट प्रकोप और फसल रोग;\n3) कटाई के समय मंडी में मूल्य गिरावट;\n4) खाद, बीज व सिंचाई की बढ़ती लागत।${hasDebt ? `\n5) फसल कटाई के बीच ₹${formatCurrency(monthlyEmi)} की बैंक किश्त का भुगतान।` : ''}`,
        };
      }
      return {
        answer: `For an agricultural business in ${location}, primary risks include:\n1) Rainfall and weather volatility;\n2) Pest infestations and crop blight;\n3) Post-harvest mandi price crashes;\n4) Escalating seed, fertilizer, and irrigation power costs.${hasDebt ? `\n5) Servicing the ₹${formatCurrency(monthlyEmi)} monthly EMI during off-harvest months.` : ''}`,
      };
    }

    if (catProfile === 'food_processing') {
      if (langMode === 'hinglish') {
        return {
          answer: `Food processing business mein mukhya risks:\n1) Raw material (anaj, sarson, masale) ke mausam ke hisab se badalte daam;\n2) Storage me nami aur keede se raw material kharab hona;\n3) Bijli ki regular supply na hona;\n4) FSSAI hygiene niyam aur quality consistency.${hasDebt ? `\n5) Mahine ki ₹${formatCurrency(monthlyEmi)} loan EMI ka niyamit bhugtan.` : ''}`,
        };
      }
      if (langMode === 'hi') {
        return {
          answer: `खाद्य प्रसंस्करण व्यवसाय में मुख्य जोखिम:\n1) मौसमी कारणों से कच्चे माल (अनाज, तिलहन आदि) की कीमतों में उतार-चढ़ाव;\n2) भंडारण में नमी व कीटों से अनाज का नुकसान;\n3) विद्युत आपूर्ति में रुकावट;\n4) गुणवत्ता व स्वच्छता मानकों का अनुपालन।${hasDebt ? `\n5) ₹${formatCurrency(monthlyEmi)} की मासिक EMI का नियमित भुगतान।` : ''}`,
        };
      }
      return {
        answer: `For an agro/food processing enterprise, primary risks are:\n1) Seasonal price spikes and availability swings for raw agri-inputs;\n2) Storage moisture and pest spoilage;\n3) Industrial power supply interruptions;\n4) Maintaining food hygiene and quality consistency.${hasDebt ? `\n5) Servicing your ₹${formatCurrency(monthlyEmi)} monthly loan EMI.` : ''}`,
      };
    }

    if (catProfile === 'retail') {
      if (langMode === 'hinglish') {
        return {
          answer: `Retail/kirana business mein sabse bade practical risks:\n1) Grahakon ko zyada udhari (customer credit) baantne se working capital fas jana;\n2) Slow-moving stock jisse paisa atka rehta hai;\n3) Aas-paas ke naye dukandaron se margin competition.${hasDebt ? `\n4) Har mahine samay par ₹${formatCurrency(monthlyEmi)} ki EMI bharna.` : ''}`,
        };
      }
      if (langMode === 'hi') {
        return {
          answer: `खुदरा (रिटेल) व्यवसाय में मुख्य जोखिम:\n1) ग्राहकों को अनियंत्रित उधारी देना जिससे कार्यशील पूंजी अटक जाती है; 2) लंबे समय तक माल न बिकना और इन्वेंटरी जाम होना; 3) स्थानीय प्रतिस्पर्धियों से मूल्य युद्ध (price competition)।${hasDebt ? `\n4) ₹${formatCurrency(monthlyEmi)} की बैंक किश्त का समय पर भुगतान।` : ''}`,
        };
      }
      return {
        answer: `For a retail store in ${location}, primary operational risks are:\n1) Excessive customer credit (udhaari) freezing your liquid working capital;\n2) Dead or slow-moving inventory locking up funds;\n3) Price competition from nearby wholesalers.${hasDebt ? `\n4) Servicing the ₹${formatCurrency(monthlyEmi)} monthly loan EMI.` : ''}`,
      };
    }

    if (catProfile === 'manufacturing' || catProfile === 'garments') {
      if (langMode === 'hinglish') {
        return {
          answer: `Manufacturing / workshop business mein mukhya risks:\n1) Machinery ka breakdown aur spare parts/repair me deri;\n2) Karigaron aur skilled labor ki kami;\n3) Raw material ki badhti keemat aur client se payment aane me deri.${hasDebt ? `\n4) Monthly ₹${formatCurrency(monthlyEmi)} ki EMI samay par nikalna.` : ''}`,
        };
      }
      if (langMode === 'hi') {
        return {
          answer: `निर्माण/वर्कशॉप व्यवसाय में मुख्य जोखिम:\n1) मशीनरी खराबी और मरम्मत में देरी से उत्पादन रुकना; 2) कुशल कारीगरों की कमी; 3) कच्चे माल की कीमतों में वृद्धि और ग्राहकों से भुगतान में विलंब।${hasDebt ? `\n4) ₹${formatCurrency(monthlyEmi)} की मासिक बैंक EMI का भुगतान।` : ''}`,
        };
      }
      return {
        answer: `For a manufacturing/workshop business, key risks include:\n1) Machine breakdowns and maintenance delays halting production;\n2) Skilled technician availability;\n3) Raw material price inflation and delayed buyer receivables.${hasDebt ? `\n4) Servicing the ₹${formatCurrency(monthlyEmi)} monthly loan EMI on time.` : ''}`,
      };
    }

    // Default / General
    if (langMode === 'hinglish') {
      return {
        answer: `Is business mein mukhya practical risks yeh hain:\n1) Grahakon ko bina limit udhari baantna jisse working capital fas jaye;\n2) Monthly operating expenses (₹${formatCurrency(effectiveExpenses)}) par control na hona;\n3) Grahakon se regular repeat orders na milna.${hasDebt ? `\n4) Har mahine pehle ₹${formatCurrency(monthlyEmi)} ki loan EMI alag rakhna.` : ''}\nInse bachne ke liye 1 mahine ka cash backup reserve zaroor banayein.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `इस व्यवसाय में मुख्य व्यावहारिक जोखिम:\n1) अनियंत्रित उधारी देना जिससे कार्यशील पूंजी अटक जाए;\n2) मासिक परिचालन खर्चों (₹${formatCurrency(effectiveExpenses)}) का बजट से बाहर जाना;\n3) ग्राहकों की निरंतरता बनाए रखना।${hasDebt ? `\n4) ₹${formatCurrency(monthlyEmi)} की बैंक किश्त का समय पर भुगतान।` : ''}\nइनसे बचाव के लिए 1 माह का रिज़र्व फंड रखें।`,
      };
    }
    return {
      answer: `The primary operational risks to guard against are:\n1) Excessive customer credit tying up working capital;\n2) Cost creep on monthly operating expenses (currently estimated at ₹${formatCurrency(effectiveExpenses)});\n3) Slower-than-expected repeat customer acquisition.${hasDebt ? `\n4) Servicing your ₹${formatCurrency(monthlyEmi)} monthly loan EMI.` : ''}\nKeeping a 1-month liquid cash reserve directly mitigates these vulnerabilities.`,
    };
  }

  // INTENT: How much can I earn? / Earnings / Profit / "Bhai itna munafa sach me ho sakta hai?"
  if (
    /\b(how much can i earn|how much profit|kitna kama sakta|kamai kitni hogi|munafa kitna|earnings|earn|itna munafa sach me|sach me ho sakta|real profit)\b/i.test(
      qLower
    )
  ) {
    if (langMode === 'hinglish') {
      return {
        answer: `Aapki anumanit monthly revenue ₹${formatCurrency(effectiveRevenue)} aur kharche ₹${formatCurrency(effectiveExpenses)} hain, jisse aapka net monthly profit lagbhag ₹${formatCurrency(monthlyProfit)} (saal ka lagbhag ₹${formatCurrency(monthlyProfit * 12)}) banta hai. Bank ki ₹${formatCurrency(monthlyEmi)} EMI nikalne ke baad aapki jeb mein lagbhag ₹${formatCurrency(netTakeHome)} shuddh kamai har mahine bachegi. Yeh hisab gaon aur kasbe ke bazaar ke aadhar par practical hai.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `₹${formatCurrency(effectiveRevenue)} की मासिक बिक्री और ₹${formatCurrency(effectiveExpenses)} के खर्च के आधार पर आपका शुद्ध मासिक लाभ लगभग ₹${formatCurrency(monthlyProfit)} (वार्षिक लगभग ₹${formatCurrency(monthlyProfit * 12)}) है। बैंक EMI (₹${formatCurrency(monthlyEmi)}) चुकाने के पश्चात आपके पास प्रति माह लगभग ₹${formatCurrency(netTakeHome)} की शुद्ध आय रहेगी।`,
      };
    }
    return {
      answer: `Based on estimated monthly revenue of ₹${formatCurrency(effectiveRevenue)} and operating expenses of ₹${formatCurrency(effectiveExpenses)}, your net profit is approximately ₹${formatCurrency(monthlyProfit)} per month (₹${formatCurrency(monthlyProfit * 12)} per year). After servicing your monthly loan EMI of ₹${formatCurrency(monthlyEmi)}, your net take-home profit is approximately ₹${formatCurrency(netTakeHome)} per month.`,
    };
  }

  // INTENT: What if sales are lower? / What if profit is only ₹15,000? / Sales drop
  if (
    /\b(?:(?:if|what\s+if)\s+(?:my\s+)?sales?\s+(?:are\s+)?(?:lower|less|down|drop|fall|decrease)|sales?\s+(?:drop|fall|decrease|down|lower|slump)|profit\s+(?:is\s+)?(?:lower|down|drops?)|profit\s+is\s+only|bikri\s+(?:kam|gir)|munafa\s+kam|agar\s+bikri\s+kam)\b/i.test(
      qLower
    ) ||
    /(?:बिक्री|कमाई)\s*(?:कम|घट|गिरे)/.test(rawQ)
  ) {
    if (userAmount !== null) {
      const lowerProfit = userAmount;
      const surplus = lowerProfit - monthlyEmi;
      if (surplus >= 0) {
        if (langMode === 'hinglish') {
          return {
            answer: `Agar aapka monthly profit kam hokar sirf ₹${formatCurrency(lowerProfit)} bhi reh jata hai, tab bhi aap ₹${formatCurrency(monthlyEmi)} ki EMI aasaani se de sakenge aur ₹${formatCurrency(surplus)} aapke paas bachenge. Loan bilkul safe rahega, bas aapko thoda personal bachat par dhyan dena hoga.`,
          };
        }
        if (langMode === 'hi') {
          return {
            answer: `यदि आपका मासिक लाभ घटकर केवल ₹${formatCurrency(lowerProfit)} रह जाता है, तब भी ₹${formatCurrency(monthlyEmi)} की बैंक EMI चुकाने के बाद आपके पास ₹${formatCurrency(surplus)} बचेंगे। लोन डिफ़ॉल्ट का कोई खतरा नहीं होगा, हालांकि व्यक्तिगत बचत सीमित रहेगी।`,
          };
        }
        return {
          answer: `If your monthly profit drops to ₹${formatCurrency(lowerProfit)}, after paying your ₹${formatCurrency(monthlyEmi)} monthly EMI, you would still retain ₹${formatCurrency(surplus)} in positive cash flow. Your loan remains fully safe and serviceable, though your personal income will be tighter.`,
        };
      } else {
        const deficit = monthlyEmi - lowerProfit;
        return {
          answer: `If profit falls to ₹${formatCurrency(lowerProfit)}, it would be ₹${formatCurrency(deficit)} below the monthly EMI of ₹${formatCurrency(monthlyEmi)}. In that scenario, you would need to cut operating expenses immediately to avoid cash strain.`,
        };
      }
    }

    const stressProfit = Math.round(monthlyProfit * 0.7);
    const stressSurplus = stressProfit - monthlyEmi;
    if (langMode === 'hinglish') {
      return {
        answer: `Agar sales 30% tak gir bhi jati hain, tab bhi aapka profit lagbhag ₹${formatCurrency(stressProfit)} rahega, jo ₹${formatCurrency(monthlyEmi)} ki EMI ko cover karke ₹${formatCurrency(Math.max(0, stressSurplus))} bacha lega. Isliye business mein sales drop jhelne ki achhi kshamta hai.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `यदि बिक्री में 30% की गिरावट भी आती है, तो भी अनुमानित मासिक लाभ लगभग ₹${formatCurrency(stressProfit)} रहेगा, जो ₹${formatCurrency(monthlyEmi)} की EMI चुकाने के बाद भी ₹${formatCurrency(Math.max(0, stressSurplus))} का सुरक्षा मार्जिन प्रदान करेगा।`,
      };
    }
    return {
      answer: `Even if sales experience a 30% downturn, your estimated profit would remain around ₹${formatCurrency(stressProfit)}, comfortably covering the ₹${formatCurrency(monthlyEmi)} EMI with a remaining surplus of ₹${formatCurrency(Math.max(0, stressSurplus))}. This demonstrates solid resilience against sales volatility.`,
    };
  }

  // INTENT: When will I recover my investment? / Payback
  if (
    /\b(when will i recover|recover my investment|payback|paisa kab wapas|recovery period|capital recovery)\b/i.test(
      qLower
    )
  ) {
    if (langMode === 'hinglish') {
      return {
        answer: `Aapka apna lagaya hua promoter margin (₹${formatCurrency(promoterMargin)}) sirf lagbhag ${marginPaybackMonths} mahino mein wapas recover ho jayega! Poore ₹${formatCurrency(projectCost)} ke project cost ki capital recovery lagbhag ${totalPaybackMonths} mahino mein complete ho jayegi.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `आपके द्वारा लगाया गया स्वयं का मार्जिन (₹${formatCurrency(promoterMargin)}) मात्र लगभग ${marginPaybackMonths} माह में शुद्ध लाभ से वसूल हो जाएगा। संपूर्ण प्रोजेक्ट लागत (₹${formatCurrency(projectCost)}) की रिकवरी लगभग ${totalPaybackMonths} माह में पूरी हो जाएगी।`,
      };
    }
    return {
      answer: `At an estimated net profit of ₹${formatCurrency(monthlyProfit)} per month, you will fully recover your personal promoter contribution (₹${formatCurrency(promoterMargin)}) in approximately ${marginPaybackMonths} months. Total project cost capital recovery takes approximately ${totalPaybackMonths} months.`,
    };
  }

  // INTENT: Where can I sell? / Who are my customers?
  if (
    /\b(where can i sell|who are my customers|kaha bechu|customer kon|customer kaun|grahak kon|target customers)\b/i.test(
      qLower
    )
  ) {
    if (langMode === 'hinglish') {
      return {
        answer: `${location} mein aapke 3 mukhya customer segments honge: 1) Gaon aur kasbe ke aam parivaar jo daily zaroorat ke liye khareedte hain; 2) Haat aur bazaar ke din aane wale aas-paas ke gaon ke log; 3) Local kirana ya retail dukandarein jo aapse bulk supply le sakti hain.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `${location} में आपके 3 प्राथमिक ग्राहक वर्ग होंगे: 1) स्थानीय ग्रामीण और कस्बाई परिवार; 2) साप्ताहिक हाट/बाज़ार में आने वाले उपभोक्ता; 3) नज़दीकी खुदरा दुकानदार जो आपसे सीधे थोक में माल खरीद सकते हैं।`,
      };
    }
    return {
      answer: `In ${location}, your core customer base consists of: 1) Local village and neighborhood households for routine needs; 2) Weekly haat/market day shoppers from surrounding hamlets; 3) Neighborhood retail shops looking for reliable local bulk supply.`,
    };
  }

  // INTENT: What competition might I face?
  if (
    /\b(what competition|competition|competitor|mukabla|pratispardha|pratispardhi)\b/i.test(
      qLower
    )
  ) {
    if (langMode === 'hinglish') {
      return {
        answer: `${location} mein ${category} ke liye competition level '${competitionLevel}' hai. Competitors se aage nikalne ke 3 practical tarike: 1) Udhar baantne se bachein aur cash par 2% discount dein; 2) Quality mein consistent rahein; 3) Haat ke din subah se regular stock uplabdh rakhein.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `${location} क्षेत्र में ${category} के लिए प्रतिस्पर्धा स्तर '${competitionLevel}' आंका गया है। स्थानीय प्रतिस्पर्धियों से बढ़त बनाने के लिए: 1) अनियंत्रित उधारी से बचें; 2) गुणवत्ता की निरंतरता बनाए रखें; 3) स्थानीय बाज़ार दिनों में समय पर पर्याप्त माल उपलब्ध रखें।`,
      };
    }
    return {
      answer: `In ${location}, local competition for ${category} is assessed at '${competitionLevel}'. To gain competitive advantage: 1) Enforce cash-first discipline with small prompt payment incentives; 2) Maintain reliable product quality; 3) Ensure full stock availability on high-traffic weekly market days.`,
    };
  }

  // INTENT: Will this work in my area? / Location / Market demand
  if (
    /\b(will this work in my area|in my area|mere area me|is there demand|demand|chalega kya|local market me chalega)\b/i.test(
      qLower
    )
  ) {
    if (langMode === 'hinglish') {
      return {
        answer: `Haan, ${location} mein ${category} ke liye demand '${localDemand}' hai. Is kshetra mein niyamit upbhokta demand uplabdh hai. Safalta ke liye 2 cheezein zaroori hain: 1) Sahi quality aur wajbi rate, 2) Haat/bazaar ke din zyadatar logon tak pahunch banayein.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `${location} क्षेत्र में ${category} के लिए दैनिक स्थानीय मांग '${localDemand}' स्तर पर निरंतर बनी रहती है। उत्पाद की शुद्धता और प्रतिस्पर्धी मूल्य निर्धारण से आप तेज़ी से स्थायी ग्राहक बना सकते हैं।`,
      };
    }
    return {
      answer: `Yes, in ${location}, there is steady local consumer demand (rated '${localDemand}') for ${category} goods and services. To establish strong market presence, focus on transparent pricing and building direct relationships with repeat buyers.`,
    };
  }

  // INTENT: What should I do first? / Where to start?
  if (
    /\b(what should i do first|where to start|where should i start|pehle kya karu|pehle kya karna|first step|shuruat kaha se)\b/i.test(
      qLower
    )
  ) {
    if (langMode === 'hinglish') {
      return {
        answer: `Pehle yeh 3 zaroori kaam karein: 1) Machinery aur equipment ka pakka quotation lein jo ₹${formatCurrency(projectCost)} ke budget mein fit ho; 2) Apne paas 10% margin (₹${formatCurrency(promoterMargin)}) ready rakhein aur nikat-tam bank mein ${schemeName} ke tahat aavedan karein; 3) Dukan ya shed ka kirayanama (rent agreement) kam se kam advance par finalize karein.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `शुरुआत में ये 3 आवश्यक कदम उठाएं: 1) ₹${formatCurrency(projectCost)} के प्रोजेक्ट बजट के अनुसार आवश्यक मशीनरी का कोटेशन लें; 2) अपना 10% प्रमोटर मार्जिन (₹${formatCurrency(promoterMargin)}) सुरक्षित रखें और निकटतम बैंक में ${schemeName} हेतु आवेदन करें; 3) कार्यस्थल का रेंट एग्रीमेंट न्यूनतम अग्रिम पर तय करें।`,
      };
    }
    return {
      answer: `Begin with these 3 immediate action steps: 1) Obtain formal equipment quotations matching your ₹${formatCurrency(projectCost)} project cost; 2) Prepare your 10% promoter contribution (₹${formatCurrency(promoterMargin)}) and submit your application for ${schemeName} at your local bank; 3) Finalize premises with minimal advance lease terms.`,
    };
  }

  // INTENT: Should I expand? / Business expansion
  if (
    /\b(should i expand|expand|bada karein|badhana chahiye|expansion)\b/i.test(
      qLower
    )
  ) {
    if (langMode === 'hinglish') {
      return {
        answer: `Abhi turant expand na karein. Pehle 6 se 12 mahine regular EMI (₹${formatCurrency(monthlyEmi)}) bina kisi deri ke bharein aur kam se kam 2 mahine ka cash backup fund banayein. Jab monthly sales stable ho jaye aur har mahine surplus cash flow bache, tabhi dusri machine ya nayi branch ki sochein.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `शुरुआती 6–12 महीनों में विस्तार की जल्दबाज़ी न करें। पहले नियमित मासिक EMI (₹${formatCurrency(monthlyEmi)}) का भुगतान समय पर करें और कार्यशील पूंजी का 2 माह का रिज़र्व फंड बनाएं। जब मासिक राजस्व स्थिर हो जाए, तभी क्षमता विस्तार पर विचार करें।`,
      };
    }
    return {
      answer: `Avoid expanding prematurely. For the first 6–12 months, focus on servicing your ₹${formatCurrency(monthlyEmi)} monthly EMI on time and building a 2-month operating reserve. Consider physical capacity expansion only after cash flows remain consistently profitable.`,
    };
  }

  // INTENT: What should I improve?
  if (
    /\b(what should i improve|kya sudhaar|improve|kya improve karein)\b/i.test(
      qLower
    )
  ) {
    if (langMode === 'hinglish') {
      return {
        answer: `Yeh 3 cheezein turant sudharein: 1) Monthly expenses (₹${formatCurrency(effectiveExpenses)}) par nazar rakhein aur raw material direct wholesale se lein; 2) Kisi ko bhi bina date ke lambi udhari na dein; 3) EMI (₹${formatCurrency(monthlyEmi)}) ki rashi har mahine ki pehli tareekh ko alag rakh dein.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `इन 3 बिंदुओं में तुरंत सुधार करें: 1) मासिक परिचालन व्यय (₹${formatCurrency(effectiveExpenses)}) को नियंत्रित रखें; 2) ग्राहकों को दी जाने वाली उधारी पर सख्त सीमा लगाएं; 3) मासिक EMI (₹${formatCurrency(monthlyEmi)}) की राशि माह की शुरुआत में ही अलग बैंक खाते में जमा करें।`,
      };
    }
    return {
      answer: `Focus on improving these three core areas: 1) Tightly manage your monthly operating expenses (currently ₹${formatCurrency(effectiveExpenses)}); 2) Eliminate extended customer credit cycles; 3) Set aside your ₹${formatCurrency(monthlyEmi)} EMI payment on the first of every month before taking personal drawings.`,
    };
  }

  // INTENT: How can I increase my profit? / Business Operations / Growth
  if (
    /\b(how can i increase my profit|increase profit|grow|munafa kaise badhaye|growth)\b/i.test(
      qLower
    )
  ) {
    if (langMode === 'hinglish') {
      return {
        answer: `Munafa badhane ke 4 practical tarike: 1) Raw material direct thoke/mandi se khareedein taaki monthly expenses (₹${formatCurrency(effectiveExpenses)}) kam hon; 2) Cash discount dekar udhari band karein; 3) Kuch high-margin complementary items sath mein bechein; 4) Pehle 6 mahine saara surplus paisa business mein hi reinvest karein.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `मुनाफा बढ़ाने के 4 व्यावहारिक कदम: 1) कच्चा माल सीधे थोक विक्रेताओं से खरीदें ताकि ₹${formatCurrency(effectiveExpenses)} के मासिक खर्च में 5–10% बचत हो; 2) नकद भुगतान पर छोटे ऑफर देकर उधारी रोकें; 3) उच्च मार्जिन वाले पूरक उत्पाद जोड़ें; 4) पहले 6 माह लाभ को पुनः कार्यशील पूंजी में लगाएं।`,
      };
    }
    return {
      answer: `To increase your net profit: 1) Procure raw materials directly from primary wholesale hubs to reduce your monthly expenses (currently ₹${formatCurrency(effectiveExpenses)}); 2) Enforce cash-first terms to eliminate bad debts; 3) Add high-margin allied goods; 4) Reinvest early cash surpluses into bulk stock before considering physical expansion.`,
    };
  }

  // INTENT: Greetings & General conversational queries
  if (['hello', 'hi', 'hey', 'namaste', 'pranam'].some((w) => qLower === w || qLower.startsWith(w + ' '))) {
    if (langMode === 'hinglish') {
      return {
        answer: `Namaste! Main aapka AI Business Advisor hoon. ${businessName} ke liye ₹${formatCurrency(projectCost)} ke project cost, ₹${formatCurrency(promoterMargin)} ke margin, aur ₹${formatCurrency(monthlyProfit)} ke anumanit profit ke sath aapka poora hisab ready hai. Aap mujhse budget, loan, EMI, munafa, ya bazaar ke baare mein koi bhi sawaal poochh sakte hain!`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `नमस्ते! मैं आपका AI व्यापार सलाहकार हूँ। ${businessName} के लिए ₹${formatCurrency(projectCost)} प्रोजेक्ट लागत, ₹${formatCurrency(promoterMargin)} मार्जिन और ₹${formatCurrency(monthlyProfit)} मासिक लाभ का संपूर्ण वित्तीय मॉडल तैयार है। आप बेझिझक कोई भी सवाल पूछ सकते हैं।`,
      };
    }
    return {
      answer: `Hello! I am your AI Business Advisor for ${businessName}. I have your complete project figures ready (Project Cost: ₹${formatCurrency(projectCost)}, Margin: ₹${formatCurrency(promoterMargin)}, Eligible Loan: ₹${formatCurrency(eligibleLoan)}, Monthly Profit: ₹${formatCurrency(monthlyProfit)}). Ask me any specific question about your budget, loan EMI, profitability, or market competition!`,
    };
  }

  // Targeted clarification prompt when user intent is genuinely unclear
  if (langMode === 'hinglish') {
    return {
      answer: `Main aapke is sawaal ka sabse sateek jawab dena chahta hoon. Kripya batayein ki aap ${businessName} ke liye kya janna chahte hain:
1) Monthly EMI affordability aur loan repayment terms
2) Agar kharcha badhe ya sales kam ho to kitna munafa bachega (stress test)
3) Sarkari yojana ke zaroori documents aur eligibility niyam
4) Shuruati machinery aur setup lagat kam karne ke practical tarike?`,
    };
  }
  if (langMode === 'hi') {
    return {
      answer: `मैं आपके प्रश्न का सबसे सटीक एवं व्यावहारिक उत्तर देना चाहता हूँ। कृपया स्पष्ट करें कि आप ${businessName} के लिए इनमें से क्या जानना चाहते हैं:
1) मासिक बैंक EMI वहन क्षमता और ऋण शर्तें
2) खर्च बढ़ने अथवा बिक्री घटने पर मुनाफे पर प्रभाव (स्ट्रेस टेस्ट)
3) सरकारी योजना के लिए आवश्यक दस्तावेज़ व पात्रता नियम
4) शुरुआती मशीनरी व सेटअप लागत घटाने के उपाय?`,
    };
  }
  return {
    answer: `To give you the most practical and accurate guidance for ${businessName}, could you please clarify what you would like to explore:
1) Monthly loan EMI affordability and repayment structure
2) How increased operating costs or lower sales would affect your cash surplus (stress test)
3) Required government scheme documents and eligibility rules
4) Actionable strategies to reduce initial equipment and setup costs?`,
  };
}

export function analyzeBusiness(data: BusinessRequest) {
  const investment = Number(data.investment);
  const monthlyRevenue = Number(data.monthly_revenue);
  const monthlyExpenses = Number(data.monthly_expenses);

  // STEP 1: BASIC FINANCIAL CALCULATIONS
  const monthlyProfit = monthlyRevenue - monthlyExpenses;
  const yearlyProfit = monthlyProfit * 12;
  const roi = investment > 0 && yearlyProfit > 0 ? (yearlyProfit / investment) * 100 : 0;
  const paybackMonths = monthlyProfit > 0 ? investment / monthlyProfit : null;

  // STEP 2: ADVANCED FINANCIAL ANALYSIS
  const profitMargin = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;
  const expenseRatio = monthlyRevenue > 0 ? (monthlyExpenses / monthlyRevenue) * 100 : 0;
  const breakEvenRevenue = monthlyExpenses;
  const monthlyCashSurplus = monthlyProfit;

  let financialStrength = 'Weak';
  if (monthlyProfit <= 0) {
    financialStrength = 'Weak';
  } else if (profitMargin >= 30) {
    financialStrength = 'Strong';
  } else if (profitMargin >= 15) {
    financialStrength = 'Moderate';
  } else {
    financialStrength = 'Weak';
  }

  let financialRisk = 'Low';
  if (monthlyProfit <= 0 || expenseRatio >= 85) {
    financialRisk = 'High';
  } else if (expenseRatio >= 65) {
    financialRisk = 'Medium';
  } else {
    financialRisk = 'Low';
  }

  // STEP 5: CENTRAL SIH26091 FINANCIAL ROUTER & CORE SCHEME CALCULATION
  const coreFinancials = calculateSih26091Financials(investment, monthlyRevenue, monthlyExpenses);

  // Generic government schemes matching (retained as additional/supplementary info)
  const matchedScheme = matchGovernmentScheme(data.category, investment);
  const matchedAllSchemes = getAllMatchingSchemes(data.category, investment);

  const marginCapital = coreFinancials.margin_capital;
  const projectCost = coreFinancials.project_cost;
  const maximumLoan = coreFinancials.maximum_loan;
  const beneficiaryContribution = coreFinancials.beneficiary_contribution;
  const eligibleLoan = coreFinancials.eligible_loan;
  const schemeName = coreFinancials.scheme_name;
  const interestRate = coreFinancials.interest_rate;
  const repaymentPeriod = coreFinancials.repayment_period;
  const loanTenureMonths = coreFinancials.loan_tenure_months;
  const moratoriumMonths = coreFinancials.moratorium_months;
  const repaymentMonths = coreFinancials.repayment_months;
  const monthlyEmi = coreFinancials.monthly_emi;
  const totalRepayment = coreFinancials.total_repayment;
  const totalInterest = coreFinancials.total_interest;
  const emiToIncomeRatio = coreFinancials.emi_to_income_ratio;
  const affordabilityStatus = coreFinancials.affordability_status;
  const affordabilityMessage = coreFinancials.affordability_message;
  const repaymentSchedule = coreFinancials.repayment_schedule;
  const quarterlyRepaymentSchedule = coreFinancials.quarterly_repayment_schedule;
  const estimatedWorkingCapital = Math.max(monthlyExpenses, 0);
  const monthlyOperationalCost = Math.max(monthlyExpenses, 0);
  const schemeMessage = coreFinancials.message || `SIH26091 Scheme: ${schemeName}. Indicative screening subject to official bank appraisal.`;

  // 12-MONTH PROFIT PROJECTION (Linked directly with central repayment schedule)
  const profitProjection = [];
  let cumulativeProfit = 0;
  for (let month = 1; month <= 12; month++) {
    cumulativeProfit += monthlyProfit;
    const schedRow = repaymentSchedule[month - 1];
    profitProjection.push({
      month: `Month ${month}`,
      monthly_profit: Math.round(monthlyProfit * 100) / 100,
      cumulative_profit: Math.round(cumulativeProfit * 100) / 100,
      emi: schedRow ? schedRow.emi : 0,
      repayment_phase: schedRow ? schedRow.phase : 'N/A',
      interest: schedRow ? schedRow.interest : 0,
      principal: schedRow ? schedRow.principal : 0,
      outstanding_principal: schedRow ? schedRow.outstanding_principal : 0,
    });
  }

  // STEP 6.5: 5-TIER FINANCIAL CALCULATION & DEBT SERVICE COVERAGE RATIO (DSCR)
  const netMonthlyProfit = monthlyProfit;
  const effectiveMonthlyEmi = monthlyEmi && monthlyEmi > 0 ? monthlyEmi : 0;
  let dscr = 0;
  let feasibilityVerdict = '';
  let colorTheme = 'green';
  let feasibilityDescription = '';

  if (coreFinancials.status === 'Not Eligible') {
    dscr = 0;
    feasibilityVerdict = 'Not Eligible / Exceeds Scheme Limit';
    colorTheme = 'red';
    feasibilityDescription =
      coreFinancials.message || 'Project cost is above ₹50 lakh. Check other financing options.';
  } else if (coreFinancials.status === 'Invalid Input') {
    dscr = 0;
    feasibilityVerdict = 'Invalid Financial Input';
    colorTheme = 'orange';
    feasibilityDescription = 'Please provide valid positive investment figures.';
  } else {
    dscr = effectiveMonthlyEmi === 0 ? 999 : netMonthlyProfit / effectiveMonthlyEmi;

    if (dscr >= 2.0) {
      feasibilityVerdict = 'Exceptional & Highly Feasible';
      colorTheme = 'green';
      feasibilityDescription =
        'Strong profit margins. The business generates more than double the required loan payment, making it highly secure.';
    } else if (dscr >= 1.5) {
      feasibilityVerdict = 'Feasible & Safe';
      colorTheme = 'blue';
      feasibilityDescription =
        'Healthy profit buffer. You can comfortably cover the EMI and unexpected expenses while taking a personal income.';
    } else if (dscr >= 1.15) {
      feasibilityVerdict = 'Moderately Feasible / Needs Caution';
      colorTheme = 'yellow';
      feasibilityDescription =
        'Profitable but lean. You can make loan payments, but must strictly control daily expenses to avoid cash flow issues.';
    } else if (dscr >= 1.0) {
      feasibilityVerdict = 'High Risk / Tight Margins';
      colorTheme = 'orange';
      feasibilityDescription =
        'Barely breaking even. Almost all profit goes to the bank. High risk of loan default if sales drop even slightly.';
    } else {
      feasibilityVerdict = 'Unfeasible / Not Recommended';
      colorTheme = 'red';
      feasibilityDescription =
        'Mathematical loss. The projected profit cannot cover the monthly loan payment. Reassess your costs or loan amount.';
    }
  }

  const feasibility = feasibilityVerdict;

  // STEP 7: SMART SCHEME MATCHING (Dynamic from government_schemes.json)
  const matchingSchemes = matchedAllSchemes.map((s: any) => ({
    scheme_id: s.scheme_id,
    scheme_name: s.scheme_name,
    short_name: s.short_name,
    category: s.category,
    ministry: s.ministry,
    project_cost_limit: s.matching_rules?.max_project_cost
      ? `Up to ₹${(s.matching_rules.max_project_cost / 100000).toFixed(1)} Lakh`
      : 'Subject to project viability',
    maximum_loan: s.loan?.maximum_loan || maximumLoan,
    eligible_loan: Math.round(Math.min(maximumLoan, s.loan?.maximum_loan || maximumLoan) * 100) / 100,
    interest_rate: s.loan?.interest_rate != null ? s.loan.interest_rate : 9,
    repayment_period: s.loan?.repayment || '3 to 7 years',
    moratorium_months: 3,
    match_score: s.scheme_id === matchedScheme?.scheme_id ? 98 : 85,
    reason: `Screened for ${data.category} enterprises with indicative capital of ₹${investment.toLocaleString('en-IN')}.`,
    official_source_url: s.official_source?.url || "https://www.jansamarth.in/",
    screening_stage: "Indicative Screening",
    verification_required: true,
  }));

  const recommendedScheme = matchingSchemes.length > 0
    ? matchingSchemes.reduce((prev: any, curr: any) => (curr.match_score > prev.match_score ? curr : prev))
    : {
        scheme_name: schemeName,
        match_score: 95,
        reason: schemeMessage,
        official_source_url: matchedScheme?.official_source?.url || "https://www.jansamarth.in/",
        screening_stage: "Indicative Screening",
      };

  // HYPER-LOCAL MARKET ANALYSIS
  const category = (data.category || '').toLowerCase();
  const localDemand: string =
    ['dairy', 'agriculture', 'poultry', 'fishery', 'food', 'solar', 'agri', 'seed', 'farm', 'milk', 'bread', 'bakery'].some((k) => category.includes(k))
      ? 'High'
      : 'Medium';

  let competitionLevel = 'Medium';
  if (['retail', 'service', 'shop', 'vendor', 'hawker'].some((k) => category.includes(k))) {
    competitionLevel = 'High';
  } else if (['dairy', 'poultry', 'agriculture', 'farming', 'food', 'processing'].some((k) => category.includes(k))) {
    competitionLevel = 'Medium';
  } else {
    competitionLevel = 'Low';
  }

  let marketPotentialScore = 50;
  if (localDemand === 'High') marketPotentialScore += 30;
  else marketPotentialScore += 15;

  if (competitionLevel === 'Low') marketPotentialScore += 15;
  else if (competitionLevel === 'Medium') marketPotentialScore += 5;
  else marketPotentialScore -= 10;

  if (monthlyProfit > 0) marketPotentialScore += 10;

  if (data.experience === 'Experienced') marketPotentialScore += 10;
  else if (data.experience === 'Intermediate') marketPotentialScore += 5;

  marketPotentialScore = Math.min(Math.max(marketPotentialScore, 0), 100);

  let locationSuitability = 'Needs Improvement';
  if (marketPotentialScore >= 80) locationSuitability = 'Highly Suitable';
  else if (marketPotentialScore >= 60) locationSuitability = 'Suitable';

  // Market Reach - Exclusively calculated using block and district (village/location ignored)
  const cleanDistrict = (data.district || 'District').trim();
  const cleanBlock = (data.block || cleanDistrict).trim();
  const tehsilData = getTehsilMarketReach(cleanDistrict, cleanBlock, 5);

  const marketReach = {
    primary_radius_km: tehsilData ? tehsilData.radius_km : 5,
    extended_radius_km: tehsilData ? tehsilData.radius_km * 2 : 10,
    service_area: `5–10 km radius covering ${cleanBlock} Block, ${cleanDistrict}`,
    consumer_base: tehsilData
      ? `${tehsilData.reachable_consumers.toLocaleString('en-IN')} reachable consumers (~${tehsilData.reachable_households.toLocaleString('en-IN')} households)`
      : 'Calibrated block demographic estimates available',
    consumer_base_status: 'Verified Census & Block Demographics',
    data_source: tehsilData
      ? `Census & Block-Level Demographic Dataset (${tehsilData.zone_classification})`
      : 'Census & Block-Level Demographic Dataset',
    confidence: 'High (Census-calibrated)',
    reach_type: tehsilData
      ? `${tehsilData.zone_classification} • ${cleanBlock} Catchment`
      : 'Block Demographic Catchment',
    reachable_consumers: tehsilData?.reachable_consumers,
    reachable_households: tehsilData?.reachable_households,
    zone_classification: tehsilData?.zone_classification,
    dominant_local_clusters: tehsilData?.dominant_local_clusters,
    district_bottlenecks: tehsilData?.district_bottlenecks,
    distribution_channels: [] as string[],
    reach_assessment:
      localDemand === 'High'
        ? 'The business has strong potential to serve customers within the 5–10 km local service area.'
        : 'The business can serve the local 5–10 km market, but demand should be validated before expansion.',
  };

  if (category.includes('dairy') || category.includes('milk')) {
    marketReach.distribution_channels = [
      'Nearby households',
      'Local milk collection centers',
      'Local grocery shops',
      'Restaurants and tea shops',
      'Direct home delivery',
    ];
  } else if (category.includes('poultry') || category.includes('bird')) {
    marketReach.distribution_channels = [
      'Nearby households',
      'Local grocery shops',
      'Restaurants and hotels',
      'Local poultry retailers',
      'Direct local delivery',
    ];
  } else if (category.includes('agri') || category.includes('farm') || category.includes('seed')) {
    marketReach.distribution_channels = [
      'Local markets',
      'Nearby households',
      'Local traders',
      'Retailers and wholesalers',
      'Direct-to-consumer sales',
    ];
  } else if (category.includes('fish')) {
    marketReach.distribution_channels = [
      'Local fish markets',
      'Nearby households',
      'Restaurants and hotels',
      'Local retailers',
      'Direct local delivery',
    ];
  } else if (category.includes('retail') || category.includes('kirana') || category.includes('store') || category.includes('vendor')) {
    marketReach.distribution_channels = [
      'Nearby households',
      'Walk-in local customers',
      'Local institutions',
      'Local delivery',
      'Repeat neighborhood customers',
    ];
  } else if (category.includes('service') || category.includes('repair') || category.includes('solar') || category.includes('sanitation')) {
    marketReach.distribution_channels = [
      'Nearby households',
      'Local customers',
      'Local institutions',
      'Referral customers',
      'Digital/local communication channels',
    ];
  } else if (category.includes('food') || category.includes('bakery') || category.includes('pickle') || category.includes('flour')) {
    marketReach.distribution_channels = [
      'Local grocery stores & kirana shops',
      'Weekly village haats & bazaars',
      'Nearby households & direct delivery',
      'Tea stalls & small eateries',
      'Tehsil mandi wholesale points',
    ];
  } else if (category.includes('artisan') || category.includes('tailor') || category.includes('garment') || category.includes('weaving') || category.includes('carpenter') || category.includes('blacksmith') || category.includes('potter')) {
    marketReach.distribution_channels = [
      'Direct walk-in local clientele',
      'Custom bespoke orders for weddings & festivals',
      'Nearby village fairs & haat stalls',
      'Local retail shop tie-ups',
      'Word-of-mouth community referrals',
    ];
  } else {
    marketReach.distribution_channels = [
      'Nearby households',
      'Local customers',
      'Nearby retailers',
      'Local institutions',
      'Direct/local delivery',
    ];
  }

  // Local opportunities and risks
  let localOpportunities: string[] = [];
  let localRisks: string[] = [];

  if (category.includes('dairy') || category.includes('milk')) {
    localOpportunities = [
      'Growing demand for milk and dairy products.',
      'Opportunity to supply nearby households and milk collection centers.',
      'Potential for value-added products such as paneer, curd and ghee.',
    ];
    localRisks = [
      'High cattle feed and healthcare costs.',
      'Milk price fluctuations.',
      'Dependence on reliable veterinary services.',
    ];
  } else if (category.includes('poultry') || category.includes('bird')) {
    localOpportunities = [
      'Regular demand for eggs and poultry products.',
      'Opportunity to supply local shops and restaurants.',
      'Potential for gradual expansion after stable operations.',
    ];
    localRisks = [
      'Disease and infection risks.',
      'Fluctuating feed costs.',
      'Changes in local poultry market prices.',
    ];
  } else if (category.includes('agri') || category.includes('farm') || category.includes('seed')) {
    localOpportunities = [
      'Opportunity to select crops and seeds suitable for local soil conditions.',
      'Potential for direct farm-to-market selling.',
      'Scope for value-added agricultural inputs and advisory.',
    ];
    localRisks = [
      'Weather and seasonal rainfall risks.',
      'Fluctuating mandi crop prices.',
      'Water availability and irrigation dependency.',
    ];
  } else if (category.includes('fish')) {
    localOpportunities = [
      'Growing demand for fresh fish in weekly local bazaars.',
      'Opportunity to supply nearby markets and restaurants.',
      'Potential to select high-demand local fish species.',
    ];
    localRisks = [
      'Water quality and pond maintenance risks.',
      'Seasonal fingerling mortality risks.',
      'Seasonal and market price fluctuations.',
    ];
  } else if (category.includes('retail') || category.includes('kirana') || category.includes('store') || category.includes('vendor')) {
    localOpportunities = [
      'Opportunity to serve daily household consumer needs.',
      'Potential to build loyal repeat customers.',
      'Possibility of adding high-demand FMCG and grocery items.',
    ];
    localRisks = [
      'Local competition from neighboring stores.',
      'Working capital tied up in customer credit.',
      'Inventory spoilage and expiry management.',
    ];
  } else if (category.includes('food') || category.includes('bakery') || category.includes('pickle') || category.includes('flour')) {
    localOpportunities = [
      'High consumer appetite for fresh local food items without preservatives.',
      'Festive and wedding bulk orders for snacks, sweets and bakery goods.',
      'Government PMFME subsidy of 35% on machinery and setup.',
    ];
    localRisks = [
      'Hygiene, shelf-life and food safety compliance requirements.',
      'Fluctuations in raw material prices (oil, flour, spices, sugar).',
      'Packaging and moisture control in humid weather.',
    ];
  } else if (category.includes('artisan') || category.includes('tailor') || category.includes('garment') || category.includes('weaving') || category.includes('carpenter') || category.includes('blacksmith') || category.includes('potter')) {
    localOpportunities = [
      'PM Vishwakarma / Weaver MUDRA 5% subsidized credit and tool kits.',
      'High demand during wedding, school reopening, and festival seasons.',
      'Skilled craft differentiation with premium custom pricing.',
    ];
    localRisks = [
      'Seasonal rush followed by lean months.',
      'Rising cost of raw materials (wood, cloth, yarn, metal).',
      'Dependence on personal physical labor or skilled assistants.',
    ];
  } else if (category.includes('solar') || category.includes('clean') || category.includes('service') || category.includes('repair')) {
    localOpportunities = [
      'Government rooftop solar subsidies and green energy push.',
      'Increasing appliance ownership (smartphones, pumps, motors) needing repair.',
      'Minimal inventory cost with high service labor margins.',
    ];
    localRisks = [
      'Rapidly changing technical knowledge requirements.',
      'Dependency on specialized spare parts availability from cities.',
      'Initial customer acquisition trust-building period.',
    ];
  } else {
    localOpportunities = [
      'Opportunity to identify unmet local customer needs.',
      'Potential to build a strong local customer base.',
      'Possibility of gradual expansion after validation.',
    ];
    localRisks = [
      'Uncertain local demand.',
      'Competition from existing businesses.',
      'Need for continuous market monitoring.',
    ];
  }

  if (tehsilData?.district_bottlenecks?.length) {
    localRisks.push(...tehsilData.district_bottlenecks);
  }

  // Opportunity Analysis
  const opportunityAnalysis = {
    status: 'Needs local validation',
    focus: 'Potential unserved/underserved niches',
    location_scope: `${data.location}, ${data.block}, ${data.district}, ${data.state}`,
    identified_niches: [] as string[],
    evidence_basis: [
      `Selected business category: ${data.category}`,
      `Local demand indicator: ${localDemand}`,
      `Competition indicator: ${competitionLevel}`,
      'No verified establishment-level demand-gap dataset is connected.',
    ],
    data_source: 'Rule-based sector hypotheses; local validation data required',
    confidence: 'Low',
    methodology:
      'Candidate niches are generated from the selected sector and local demand/competition indicators, then must be validated through local customer interviews, competitor checks and current market-price observations.',
    validation_priority: localDemand === 'Low' || competitionLevel === 'High' ? 'High' : 'Medium',
    note:
      localDemand === 'Low' || competitionLevel === 'High'
        ? 'Validate each candidate niche carefully because the available indicators do not establish a local supply-demand gap.'
        : 'Candidate niches may be worth testing, but local supply-demand evidence is still required before investment.',
  };

  if (category.includes('dairy') || category.includes('milk')) {
    opportunityAnalysis.identified_niches = [
      'Hygienic packaged milk for nearby households',
      'Value-added dairy products such as paneer, curd and ghee',
      'Doorstep dairy delivery for nearby customers',
      'Bulk dairy supply to tea shops, restaurants and small institutions',
    ];
  } else if (category.includes('poultry') || category.includes('bird')) {
    opportunityAnalysis.identified_niches = [
      'Cleaned and graded egg supply for local retailers',
      'Direct household egg and poultry delivery',
      'Regular poultry supply contracts with restaurants and hotels',
      'Bundled poultry feed/essential support for nearby small producers',
    ];
  } else if (category.includes('agri') || category.includes('farm') || category.includes('seed')) {
    opportunityAnalysis.identified_niches = [
      'Last-mile agricultural input delivery & certified seeds',
      'Custom farm implement rental for small and marginal farmers',
      'Crop aggregation, grading and local market linkage',
      'Value-added processing of locally suitable agricultural produce',
    ];
  } else if (category.includes('fish')) {
    opportunityAnalysis.identified_niches = [
      'Cleaned and ready-to-cook fish for nearby households',
      'Doorstep fresh-fish delivery in thermal insulated bags',
      'Regular fresh-fish supply to restaurants and local retailers',
      'Small-scale ice/cold-chain support for local fish sellers',
    ];
  } else if (category.includes('retail') || category.includes('kirana') || category.includes('store') || category.includes('vendor')) {
    opportunityAnalysis.identified_niches = [
      'Last-mile delivery of essential goods to nearby households',
      'Digital/phone-based ordering for repeat local customers',
      'Focused stocking of frequently requested local products',
      'Home-delivery service for elderly or mobility-limited customers',
    ];
  } else if (category.includes('food') || category.includes('bakery') || category.includes('pickle') || category.includes('flour')) {
    opportunityAnalysis.identified_niches = [
      'Hygienic packed regional snacks, pickles, and spices for weekly haats',
      'Custom bakery biscuits, buns, and celebration cakes for local celebrations',
      'Freshly ground wheat flour (chakki atta) and cold-pressed mustard oil',
      'Bulk supply of papad and savories to village wedding caterers',
    ];
  } else if (category.includes('artisan') || category.includes('tailor') || category.includes('garment') || category.includes('weaving') || category.includes('carpenter') || category.includes('blacksmith') || category.includes('potter')) {
    opportunityAnalysis.identified_niches = [
      'Designer blouse, school uniform, and festive garment stitching',
      'Handloom woven traditional fabrics and home furnishing products',
      'Custom wooden furniture, doors, and agricultural wooden tools',
      'Repair and restoration of rural household metal/wooden implements',
    ];
  } else if (category.includes('solar') || category.includes('clean') || category.includes('service') || category.includes('repair')) {
    opportunityAnalysis.identified_niches = [
      'PM Surya Ghar rooftop solar rooftop survey and installation assistance',
      'On-site smart mobile, tablet, and home inverter/battery repair',
      'Mechanized septic tank and drain cleaning with safety equipment',
      'Farm equipment, pump motor, and solar generator maintenance service',
    ];
  } else {
    opportunityAnalysis.identified_niches = [
      'Unmet convenience or last-mile service needs',
      'Direct local delivery or doorstep service',
      'Niche products/services requested repeatedly by local customers',
      'Small institutional or business-to-business supply opportunities',
    ];
  }

  // SWOT Analysis
  const swotAnalysis = {
    scope: `${data.business_name} | ${data.category} | ${data.location}, ${data.block}, ${data.district}, ${data.state}`,
    budget_context: {
      available_margin_capital: Math.round(investment * 100) / 100,
      monthly_revenue: Math.round(monthlyRevenue * 100) / 100,
      monthly_expenses: Math.round(monthlyExpenses * 100) / 100,
      monthly_profit: Math.round(monthlyProfit * 100) / 100,
    },
    strengths: [] as string[],
    weaknesses: [] as string[],
    opportunities: [] as string[],
    threats: [] as string[],
    methodology:
      'SWOT is generated from the entered micro-enterprise budget, financial indicators, experience level, local demand and competition indicators, plus the existing local opportunity and risk assessment.',
    confidence: 'Moderate - rule-based assessment',
  };

  if (monthlyProfit > 0) {
    swotAnalysis.strengths.push(
      `Positive estimated monthly cash surplus of ₹${formatCurrency(monthlyProfit)}.`
    );
  } else {
    swotAnalysis.strengths.push(
      'The current plan can be improved through controlled pilot operations and cost monitoring.'
    );
  }

  if (data.experience === 'Experienced') {
    swotAnalysis.strengths.push(
      'Experienced operator profile can support execution and customer management.'
    );
  } else if (data.experience === 'Intermediate') {
    swotAnalysis.strengths.push(
      'Intermediate experience provides an existing operational base to build on.'
    );
  } else {
    swotAnalysis.strengths.push(
      'Beginner profile allows a structured pilot approach before major expansion.'
    );
  }

  if (localDemand === 'High') {
    swotAnalysis.strengths.push(
      'The selected sector has a high local-demand indicator in the current rule-based assessment.'
    );
  }

  if (monthlyProfit <= 0) {
    swotAnalysis.weaknesses.push('Current estimated monthly profit is not positive.');
  } else if (expenseRatio >= 65) {
    swotAnalysis.weaknesses.push(
      `Operating expenses consume about ${expenseRatio.toFixed(2)}% of estimated monthly revenue.`
    );
  }

  if (data.experience === 'Beginner') {
    swotAnalysis.weaknesses.push(
      'Limited operating experience may increase execution and market-learning requirements.'
    );
  }

  if (competitionLevel === 'High') {
    swotAnalysis.weaknesses.push(
      'High competition indicator may make customer acquisition more difficult.'
    );
  }

  swotAnalysis.opportunities = opportunityAnalysis.identified_niches
    .slice(0, 3)
    .map((item) => `Test candidate niche: ${item}.`);
  swotAnalysis.opportunities.push(
    'Validate local customer demand, competitor coverage and pricing before scaling.'
  );

  swotAnalysis.threats = [...localRisks.slice(0, 3)];
  if (affordabilityStatus === 'Not Affordable' || affordabilityStatus === 'High Repayment Burden') {
    swotAnalysis.threats.push(
      'Loan repayment pressure could strain cash flow if the business does not achieve projected sales.'
    );
  }
  if (competitionLevel === 'High') {
    swotAnalysis.threats.push(
      'Competitive pressure may reduce achievable market share or pricing power.'
    );
  }

  if (swotAnalysis.weaknesses.length === 0) {
    swotAnalysis.weaknesses.push(
      'No major financial weakness was detected from the entered figures; validate operating assumptions locally.'
    );
  }
  if (swotAnalysis.threats.length === 0) {
    swotAnalysis.threats.push(
      'Local demand, input costs and competitor behavior may change over time.'
    );
  }

  const districtWithPin = data.pin ? `${data.district} (PIN: ${data.pin})` : data.district;
  const hyperLocalRecommendation = `${data.business_name} in ${data.location}, ${districtWithPin}, ${data.state} has ${locationSuitability.toLowerCase()} market suitability. Estimated local demand is ${localDemand.toLowerCase()} with ${competitionLevel.toLowerCase()} competition.`;

  // CRITICAL CONDITION: DAIRY SECTOR MACRO-DEMOGRAPHICS & MARKET GAP
  // ONLY apply if category is Dairy & Milk Products
  const isDairy = isDairyCategory(data.category);
  const dairyAnalysis = isDairy
    ? buildDairyAnalysis({
        district: data.district,
        monthlyRevenue: monthlyRevenue,
        monthlyExpenses: monthlyExpenses,
        monthlyEmi: monthlyEmi,
        projectCost: projectCost,
      })
    : null;

  if (dairyAnalysis) {
    opportunityAnalysis.identified_niches.unshift(
      'Secondary B2B revenue: Selling balanced cattle feed, silage & mineral mixtures to local farmers',
      'Secondary B2B revenue: Distributing urea, organic manure & micro-nutrients',
      'Secondary B2B revenue: Custom tractor & fodder harvester rental service'
    );
  }

  const hyperLocalProfile = {
    state: data.state,
    district: data.district,
    pin: data.pin || '',
    block: data.block,
    location: data.location,
    category: data.category,
    profile_summary: `Business analysis prepared for ${data.business_name} in ${data.location}, ${data.block}, ${districtWithPin}, ${data.state}.`,
    local_demand: localDemand,
    competition_level: competitionLevel,
    market_potential_score: marketPotentialScore,
    location_suitability: locationSuitability,
    market_reach: marketReach,
    opportunity_analysis: opportunityAnalysis,
    swot_analysis: swotAnalysis,
    local_opportunities: localOpportunities,
    local_risks: localRisks,
    recommendation: hyperLocalRecommendation,
    dairy_analysis: dairyAnalysis,
  };

  // OVERALL BUSINESS RISK ANALYSIS
  let riskScore = 0;
  const riskFactors: string[] = [];
  const riskRecommendations: string[] = [];

  if (monthlyProfit <= 0) {
    riskScore += 35;
    riskFactors.push('The business is currently generating no positive monthly profit.');
    riskRecommendations.push('Reduce operating expenses and improve monthly revenue.');
  } else if (profitMargin < 10) {
    riskScore += 25;
    riskFactors.push('The profit margin is low.');
    riskRecommendations.push(
      'Improve profit margins by controlling expenses and increasing sales.'
    );
  } else if (profitMargin < 20) {
    riskScore += 15;
    riskFactors.push('The profit margin is moderate.');
    riskRecommendations.push('Monitor costs and work toward improving profit margins.');
  }

  if (expenseRatio >= 90) {
    riskScore += 25;
    riskFactors.push('Expenses consume more than 90% of monthly revenue.');
    riskRecommendations.push('Urgently review major operating expenses.');
  } else if (expenseRatio >= 75) {
    riskScore += 15;
    riskFactors.push('A high percentage of revenue is spent on expenses.');
    riskRecommendations.push('Control operating costs to improve cash surplus.');
  }

  if (affordabilityStatus === 'Not Affordable') {
    riskScore += 25;
    riskFactors.push('Loan EMI may not be manageable with current income.');
    riskRecommendations.push('Avoid large loans until cash flow improves.');
  } else if (affordabilityStatus === 'High Repayment Burden') {
    riskScore += 15;
    riskFactors.push('Loan EMI may create a significant repayment burden.');
    riskRecommendations.push('Consider reducing the loan amount.');
  } else if (affordabilityStatus === 'Moderately Affordable') {
    riskScore += 8;
    riskFactors.push('Loan repayment may put pressure on cash flow.');
    riskRecommendations.push('Maintain an emergency reserve for EMI payments.');
  }

  if (competitionLevel === 'High') {
    riskScore += 15;
    riskFactors.push('High local competition may affect customer acquisition.');
    riskRecommendations.push('Differentiate through better service, pricing, or products.');
  } else if (competitionLevel === 'Medium') {
    riskScore += 8;
    riskFactors.push('Moderate competition requires regular market monitoring.');
    riskRecommendations.push('Study competitors and improve customer value.');
  }

  if (localDemand === 'Medium') {
    riskScore += 8;
    riskFactors.push('Local demand is moderate and may require marketing efforts.');
    riskRecommendations.push('Use local marketing and customer feedback.');
  }

  if (data.experience === 'Beginner') {
    riskScore += 10;
    riskFactors.push('Limited business experience may increase operational risk.');
    riskRecommendations.push('Seek training, mentorship, or expert guidance.');
  } else if (data.experience === 'Intermediate') {
    riskScore += 5;
  }

  if (category === 'dairy') {
    riskScore += 5;
    riskFactors.push('Dairy operations are affected by cattle health and feed costs.');
    riskRecommendations.push('Maintain veterinary care and monitor feed costs.');
  } else if (category === 'poultry') {
    riskScore += 5;
    riskFactors.push('Poultry businesses face disease and feed price risks.');
    riskRecommendations.push('Follow hygiene and disease prevention practices.');
  } else if (category === 'agriculture') {
    riskScore += 8;
    riskFactors.push('Agriculture is exposed to weather and crop price risks.');
    riskRecommendations.push('Use suitable crops and efficient irrigation.');
  } else if (category === 'fishery') {
    riskScore += 8;
    riskFactors.push('Fishery operations can be affected by water quality and disease.');
    riskRecommendations.push('Monitor water quality and fish health.');
  }

  riskScore = Math.min(Math.max(riskScore, 0), 100);

  let overallRiskLevel = 'Low Risk';
  let riskSummary = 'The business currently shows a relatively manageable risk profile.';
  if (riskScore >= 70) {
    overallRiskLevel = 'High Risk';
    riskSummary = 'Significant financial, market, or operational risks require attention.';
  } else if (riskScore >= 40) {
    overallRiskLevel = 'Medium Risk';
    riskSummary =
      'Important risks should be managed through regular financial and market monitoring.';
  }

  if (riskFactors.length === 0) {
    riskFactors.push('No major risk factors were identified from the entered information.');
  }
  if (riskRecommendations.length === 0) {
    riskRecommendations.push(
      'Continue monitoring business performance and maintain an emergency reserve.'
    );
  }

  const riskAnalysis = {
    risk_score: riskScore,
    overall_risk_level: overallRiskLevel,
    risk_summary: riskSummary,
    risk_factors: riskFactors,
    risk_recommendations: riskRecommendations,
  };

  // BUSINESS ADVICE
  let businessAdvice: string[] = [];
  if (category === 'dairy') {
    businessAdvice = [
      'Consider starting with a manageable number of cattle.',
      'Maintain proper cattle nutrition and veterinary care.',
      'Build a reliable local milk collection and customer network.',
      'Monitor feed and healthcare costs carefully.',
      'Consider value-added products such as curd, paneer and ghee.',
    ];
  } else if (category === 'poultry') {
    businessAdvice = [
      'Start with a manageable number of birds.',
      'Maintain proper hygiene and vaccination schedules.',
      'Monitor feed costs carefully.',
      'Develop reliable local buyers before expanding.',
      'Keep emergency funds for disease and market risks.',
    ];
  } else if (category === 'fishery') {
    businessAdvice = [
      'Check water availability and quality before starting.',
      'Select fish species suitable for the local climate.',
      'Monitor feed and water management costs.',
      'Build connections with local fish markets.',
      'Plan for seasonal demand and weather-related risks.',
    ];
  } else if (category === 'agriculture') {
    businessAdvice = [
      'Choose crops suitable for local soil and climate.',
      'Use efficient irrigation methods.',
      'Monitor fertilizer and input costs.',
      'Consider direct-to-market selling.',
      'Explore value-added agricultural products.',
    ];
  } else {
    businessAdvice = [
      'Start with a small pilot before making a large investment.',
      'Study local demand and competitors.',
      'Maintain accurate records of revenue and expenses.',
      'Keep a financial reserve for unexpected expenses.',
      'Consider expanding after achieving stable profits.',
    ];
  }

  if (dairyAnalysis) {
    businessAdvice.unshift(
      'Establish a secondary B2B revenue stream tailored to farmers (e.g., selling cattle feed, urea, or tractor rentals).',
      dairyAnalysis.price_arbitrage.status === 'Strong Sourcing Advantage'
        ? 'Capitalize on Strong Sourcing Advantage by focusing on volume distribution and regular household milk delivery.'
        : 'Protect against raw milk Margin Compression by advising premium retail packaging (such as fresh paneer, curd, or desi ghee).'
    );
  }

  // FINAL RECOMMENDATION
  let recommendation = '';
  if (dscr < 1.0) {
    recommendation = `${data.business_name} is currently unfeasible based on the projected loan EMI and profit. Reassess your costs or loan amount.`;
  } else if (dscr >= 2.0) {
    recommendation = `${data.business_name} appears exceptionally feasible with healthy profit margins to cover loan commitments comfortably.`;
  } else if (dscr >= 1.5) {
    recommendation = `${data.business_name} appears feasible and safe with a reliable profit buffer over monthly loan EMI.`;
  } else if (dscr >= 1.15) {
    recommendation = `${data.business_name} is moderately feasible. You can service the loan, but must control daily expenses strictly.`;
  } else {
    recommendation = `${data.business_name} operates on tight margins. High risk of loan default if revenue drops even slightly.`;
  }

  return {
    business: data.business_name,
    category: data.category,
    state: data.state,
    district: data.district,
    pin: data.pin || '',
    block: data.block,
    location: data.location,
    experience: data.experience,
    hyper_local_profile: hyperLocalProfile,
    risk_analysis: riskAnalysis,
    matched_scheme: matchedScheme,
    financial_analysis: {
      initial_investment: Math.round(investment * 100) / 100,
      monthly_revenue: Math.round(monthlyRevenue * 100) / 100,
      monthly_expenses: Math.round(monthlyExpenses * 100) / 100,
      monthly_profit: Math.round(monthlyProfit * 100) / 100,
      yearly_profit: Math.round(yearlyProfit * 100) / 100,
      roi_percentage: Math.round(roi * 100) / 100,
      payback_period_months: paybackMonths !== null ? Math.round(paybackMonths * 100) / 100 : null,
    },
    advanced_financial_analysis: {
      profit_margin: Math.round(profitMargin * 100) / 100,
      expense_ratio: Math.round(expenseRatio * 100) / 100,
      break_even_revenue: Math.round(breakEvenRevenue * 100) / 100,
      monthly_cash_surplus: Math.round(monthlyCashSurplus * 100) / 100,
      financial_strength: financialStrength,
      financial_risk: financialRisk,
    },
    profit_projection: profitProjection,
    feasibility,
    feasibilityVerdict,
    feasibilityDescription,
    colorTheme,
    dscr: Math.round(dscr * 100) / 100,
    recommendation,
    scheme_analysis: {
      scheme_name: schemeName,
      status: coreFinancials.status,
      margin_capital: Math.round(marginCapital * 100) / 100,
      project_cost: Math.round(projectCost * 100) / 100,
      beneficiary_contribution: Math.round(beneficiaryContribution * 100) / 100,
      contribution_percentage: 10,
      maximum_loan: Math.round(maximumLoan * 100) / 100,
      eligible_loan: Math.round(eligibleLoan * 100) / 100,
      maximum_scheme_loan: coreFinancials.maximum_scheme_loan,
      interest_rate: interestRate,
      loan_tenure_months: loanTenureMonths,
      repayment_period: repaymentPeriod,
      moratorium_months: moratoriumMonths,
      rule_source: coreFinancials.rule_source,
      message: schemeMessage,
      screening_status: coreFinancials.status === "Eligible" ? "SIH26091 Core Scheme Routed" : "Not Eligible",
      verification_required: true,
      verification_note: "Core financial routing based on SIH26091 scheme rules. Formal eligibility and loan sanction require appraisal by the financing institution.",
      official_source_url: matchedScheme?.official_source?.url || "https://www.jansamarth.in/",
      official_agency: matchedScheme?.official_source?.organization || matchedScheme?.ministry || "Government of India",
    },
    smart_scheme_matching: {
      matching_schemes: matchingSchemes,
      recommended_scheme: recommendedScheme,
    },
    loan_affordability: {
      monthly_emi: monthlyEmi,
      loan_tenure_months: loanTenureMonths,
      moratorium_months: moratoriumMonths,
      repayment_months: repaymentMonths,
      interest_rate: interestRate,
      total_repayment: totalRepayment,
      total_interest: totalInterest,
      emi_to_income_ratio: emiToIncomeRatio,
      affordability_status: affordabilityStatus,
      affordability_message: affordabilityMessage,
      monthly_operational_cost: Math.round(monthlyOperationalCost * 100) / 100,
      estimated_working_capital: Math.round(estimatedWorkingCapital * 100) / 100,
      repayment_schedule: repaymentSchedule,
      quarterly_repayment_schedule: quarterlyRepaymentSchedule,
    },
    business_advice: businessAdvice,
    dairy_analysis: dairyAnalysis,
  };
}

export const handleAnalyze = analyzeBusiness;
export const handleAdvisor = getAdvisorAdvice;


