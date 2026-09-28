import { getTehsilMarketReach } from '../locationData';
import governmentSchemesData from './government_schemes.json';
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

export function getAdvisorAdvice(data: AdvisorRequest): { answer: string } {
  const rawQ = (data.question || '').trim();
  const qLower = rawQ.toLowerCase();

  if (!rawQ) {
    return { answer: 'Please ask a question about your business plan, loan, or investment.' };
  }

  const businessName = data.business_name || 'Your Business';
  const category = data.category || 'Enterprise';
  const monthlyRevenue = data.monthly_revenue ?? 0;
  const monthlyExpenses = data.monthly_expenses ?? 0;
  const monthlyProfit = data.monthly_profit ?? (monthlyRevenue - monthlyExpenses);
  const roiPercentage = data.roi_percentage ?? 0;
  const affordabilityStatus = data.affordability_status || 'Eligible';
  const monthlyEmi = data.monthly_emi ?? 0;
  const feasibility = data.feasibility || 'Feasible';
  const projectCost = data.project_cost || (data.promoter_margin ? data.promoter_margin / 0.1 : 140000);
  const promoterMargin = data.promoter_margin || projectCost * 0.1;
  const eligibleLoan = data.eligible_loan || projectCost * 0.9;
  const schemeName = data.scheme_name || (projectCost <= 140000 ? 'Micro Finance Scheme' : 'Term Loan Scheme');
  const interestRate = data.interest_rate || (projectCost <= 140000 ? 6.5 : 8.0);
  const tenure = data.loan_tenure_months || (projectCost <= 140000 ? 36 : 84);
  const moratorium = data.moratorium_months || (projectCost <= 140000 ? 3 : 6);
  const location = [data.block, data.district, data.state].filter(Boolean).join(', ') || 'your local market area';
  const dscr = monthlyEmi > 0 ? (monthlyProfit / monthlyEmi).toFixed(1) : '999';

  // Language Detection
  const hasDevanagari = /[\u0900-\u097F]/.test(rawQ);
  const isHinglish =
    /\b(bhai|mere|paas|kitna|hoga|hogi|hai|kya|kaise|karu|karein|bina|chahiye|chalega|kamai|paisa|paise|lagana|karna|shuru|munafa|milega|udhar|bikri)\b/i.test(
      rawQ
    );
  const langMode = hasDevanagari ? 'hi' : isHinglish ? 'hinglish' : (data.language || 'en');

  // Check for amounts mentioned in user query
  const userAmount = extractAmountFromText(rawQ);

  // If monthlyRevenue was not passed directly but monthlyProfit and monthlyExpenses exist
  const effectiveRevenue = monthlyRevenue > 0 ? monthlyRevenue : (monthlyProfit > 0 && monthlyExpenses > 0 ? monthlyProfit + monthlyExpenses : monthlyProfit * 1.5);
  const effectiveExpenses = monthlyExpenses > 0 ? monthlyExpenses : Math.max(0, effectiveRevenue - monthlyProfit);
  const netTakeHome = Math.max(0, monthlyProfit - monthlyEmi);
  const marginPaybackMonths = monthlyProfit > 0 ? (promoterMargin / monthlyProfit).toFixed(1) : 'N/A';
  const totalPaybackMonths = monthlyProfit > 0 ? (projectCost / monthlyProfit).toFixed(1) : 'N/A';
  const localDemand = data.local_demand || 'Medium';
  const competitionLevel = data.competition_level || 'Medium';

  // 1. Follow-up resolution: check if "that", "this", "it" refers to previous turn
  const lastTurn = (data.history || []).slice(-1)[0]?.text?.toLowerCase() || '';
  const isFollowUpAfford =
    /\b(can i afford that|can i afford this|is that affordable|afford ho jayega|afford kar paunga|can i repay that|can i afford)\b/i.test(qLower) ||
    (/\b(afford|affordability|chuka paunga)\b/i.test(qLower) && (lastTurn.includes('emi') || lastTurn.includes('₹') || lastTurn.includes('loan')));

  // INTENT: Follow-up Affordability / "Can I afford that?" / "Is this affordable for me?"
  if (
    isFollowUpAfford ||
    /\b(can i afford|is this affordable|is this affordable for me|afford kar paunga|kya me afford|affordability)\b/i.test(qLower)
  ) {
    if (monthlyProfit >= monthlyEmi) {
      if (langMode === 'hinglish') {
        return {
          answer: `Haan, aap ise aasaani se afford kar sakte hain! Aapki har mahine ki bank EMI ₹${formatCurrency(monthlyEmi)} hai, jabki anumanit net monthly profit ₹${formatCurrency(monthlyProfit)} hai. EMI nikalne ke baad bhi aapke paas ₹${formatCurrency(netTakeHome)} ka shuddh munafa har mahine bachega. Is hisaab se aapka repayment status '${affordabilityStatus}' hai aur default ka risk bohot kam hai.`,
        };
      }
      if (langMode === 'hi') {
        return {
          answer: `हाँ, आप इसे आसानी से वहन (afford) कर सकते हैं! आपकी मासिक बैंक EMI ₹${formatCurrency(monthlyEmi)} है, जबकि अनुमानित शुद्ध मासिक लाभ ₹${formatCurrency(monthlyProfit)} है। EMI चुकाने के बाद भी हर माह आपके पास ₹${formatCurrency(netTakeHome)} का शुद्ध सरप्लस सुरक्षित रहेगा। आपकी ऋण वहन क्षमता '${affordabilityStatus}' श्रेणी में है।`,
        };
      }
      return {
        answer: `Yes, you can comfortably afford this! Your estimated monthly EMI is ₹${formatCurrency(monthlyEmi)}, while your projected net profit is ₹${formatCurrency(monthlyProfit)}. After paying the EMI each month, you still retain ₹${formatCurrency(netTakeHome)} in positive cash flow buffer. This gives your project an '${affordabilityStatus}' rating.`,
      };
    } else {
      const deficit = monthlyEmi - monthlyProfit;
      if (langMode === 'hinglish') {
        return {
          answer: `Filhal yeh thoda risky hai, kyunki aapka monthly profit ₹${formatCurrency(monthlyProfit)} hai aur EMI ₹${formatCurrency(monthlyEmi)} hai (lagbhag ₹${formatCurrency(deficit)} ki kami). Ise safe banane ke liye aapko shuruat mein apna promoter margin badhana hoga taaki loan aur EMI kam ho sakein.`,
        };
      }
      if (langMode === 'hi') {
        return {
          answer: `वर्तमान आंकड़ों के अनुसार यह थोड़ा जोखिमपूर्ण है, क्योंकि ₹${formatCurrency(monthlyProfit)} का लाभ ₹${formatCurrency(monthlyEmi)} की EMI से ₹${formatCurrency(deficit)} कम है। इसे सुरक्षित करने के लिए आपको अधिक मार्जिन लगाकर लोन की राशि घटानी चाहिए।`,
        };
      }
      return {
        answer: `At present projections, this poses cash flow strain because your net monthly profit of ₹${formatCurrency(monthlyProfit)} is ₹${formatCurrency(deficit)} below the monthly EMI of ₹${formatCurrency(monthlyEmi)}. To make this safe, contribute higher upfront margin to reduce the borrowing amount.`,
      };
    }
  }

  // INTENT: What happens if I invest more? / Higher margin investment
  if (
    /\b(what happens if i invest more|invest more|if i invest more|agar main zyada invest karu|zyada invest|zyada lagau|zyada paisa lagau|higher margin)\b/i.test(
      qLower
    )
  ) {
    if (langMode === 'hinglish') {
      return {
        answer: `Agar aap zyada margin invest karte hain (jaise 10% ki jagah 20% ya 30%): 1) Bank se loan kam lena padega (₹${formatCurrency(eligibleLoan)} se kam); 2) Aapki monthly EMI ₹${formatCurrency(monthlyEmi)} se seedhe kam ho jayegi; 3) Byaj ki bachat hogi aur har mahine bacha hua munafa badh jayega. Jaise hi aap margin badhayenge, debt risk kam hoga aur business aur bhi mazboot hoga.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `यदि आप अधिक मार्जिन निवेश करते हैं: 1) बैंक ऋण की आवश्यकता ₹${formatCurrency(eligibleLoan)} से घट जाएगी; 2) आपकी मासिक EMI ₹${formatCurrency(monthlyEmi)} से कम होगी, जिससे ब्याज का खर्च बचेगा; 3) हर महीने आपके हाथ में बचने वाला शुद्ध लाभ बढ़ जाएगा। इससे व्यवसाय का वित्तीय जोखिम न्यूनतम हो जाता है।`,
      };
    }
    return {
      answer: `If you invest more upfront margin capital: 1) Your required bank loan decreases below ₹${formatCurrency(eligibleLoan)}; 2) Your monthly EMI drops proportionately from ₹${formatCurrency(monthlyEmi)}, saving substantial interest; 3) Your financial risk drops and your net monthly cash surplus increases.`,
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
    if (langMode === 'hinglish') {
      return {
        answer: `Aapko har mahine lagbhag ₹${formatCurrency(monthlyEmi)} ki EMI deni hogi. Yeh calculation ₹${formatCurrency(eligibleLoan)} ke bank loan par ${interestRate}% annual reducing interest aur ${tenure} mahine ke samay (${moratorium} mahine moratorium sahit) ke hisab se hai. Aapke har mahine ke ₹${formatCurrency(monthlyProfit)} profit mein se yeh aasaani se chuk jayegi aur ₹${formatCurrency(netTakeHome)} aapki jeb mein bachenge.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `आपको प्रति माह लगभग ₹${formatCurrency(monthlyEmi)} की बैंक EMI चुकानी होगी। यह गणना ₹${formatCurrency(eligibleLoan)} के पात्र लोन पर ${interestRate}% वार्षिक ब्याज और ${tenure} माह की अवधि (${moratorium} माह मोराटोरियम सहित) के आधार पर है। ₹${formatCurrency(monthlyProfit)} के मासिक लाभ से यह किश्त आसानी से निकल जाएगी और ₹${formatCurrency(netTakeHome)} शुद्ध बचत होगी।`,
      };
    }
    return {
      answer: `You will pay approximately ₹${formatCurrency(monthlyEmi)} each month as loan EMI. This is computed on an eligible loan of ₹${formatCurrency(eligibleLoan)} at ${interestRate}% annual reducing interest over a ${tenure}-month tenure (with a ${moratorium}-month moratorium). With an estimated net monthly profit of ₹${formatCurrency(monthlyProfit)}, this leaves ₹${formatCurrency(netTakeHome)} in take-home monthly surplus.`,
    };
  }

  // INTENT: Why is EMI so high? / Explain EMI
  if (
    /\b(why is my emi so high|why is the emi this high|emi so high|emi itni zyada kyu|emi high|kam emi)\b/i.test(qLower)
  ) {
    if (langMode === 'hinglish') {
      return {
        answer: `Aapki monthly EMI ₹${formatCurrency(monthlyEmi)} hai, jo ₹${formatCurrency(eligibleLoan)} ke loan par ${interestRate}% byaj aur ${tenure} mahine ke samay ke aadhar par reducing balance se nikali gayi hai. Achhi baat yeh hai ki aapka anumanit monthly profit ₹${formatCurrency(monthlyProfit)} hai, jo EMI se ${dscr} guna zyada hai! EMI bharne ke baad bhi aapke paas har mahine lagbhag ₹${formatCurrency(netTakeHome)} ka shuddh munafa bachega. Agar aap EMI kam karna chahte hain, to shuruat me apna margin badha sakte hain.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `आपकी मासिक EMI ₹${formatCurrency(monthlyEmi)} है, जो ₹${formatCurrency(eligibleLoan)} के बैंक लोन पर ${interestRate}% वार्षिक ब्याज और ${tenure} माह की अवधि के आधार पर निर्धारित है। आपका अनुमानित मासिक लाभ ₹${formatCurrency(monthlyProfit)} है, जो EMI का ${dscr} गुना है। EMI चुकाने के बाद भी आपके पास ₹${formatCurrency(netTakeHome)} का शुद्ध लाभ सुरक्षित रहता है। आप अधिक मार्जिन लगाकर इसे और कम कर सकते हैं।`,
      };
    }
    return {
      answer: `Your monthly EMI is ₹${formatCurrency(monthlyEmi)}, calculated on an eligible loan of ₹${formatCurrency(eligibleLoan)} at ${interestRate}% annual reducing interest over ${tenure} months (including a ${moratorium}-month moratorium). With an estimated net monthly profit of ₹${formatCurrency(monthlyProfit)}, your profit comfortably covers this EMI by ${dscr}x, leaving ₹${formatCurrency(netTakeHome)} in take-home monthly surplus. You can lower the EMI by contributing higher upfront margin capital.`,
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

  // INTENT: Why is this risky? / What could make this business fail?
  if (
    /\b(why risky|why did you say this is risky|make this business fail|fail kyu|khatra kya|biggest risks|what are the main risks|risk factor)\b/i.test(
      qLower
    )
  ) {
    if (langMode === 'hinglish') {
      return {
        answer: `Is business mein sabse bade 3 practical risks yeh hain: 1) Udhaari (Customer Credit): Gaon/bazaar mein zyada udhar baantne se working capital fas sakta hai; 2) Kharche par control: Monthly expenses ₹${formatCurrency(effectiveExpenses)} se zyada na badhne dein; 3) Regular EMI: Har mahine pehle EMI ₹${formatCurrency(monthlyEmi)} alag rakhein. In teeno se bachne ke liye ₹25,000 ka cash reserve zaroor banayein.`,
      };
    }
    if (langMode === 'hi') {
      return {
        answer: `इस व्यवसाय में मुख्य रूप से 3 जोखिमों पर सतर्कता आवश्यक है: 1) ग्राहकों को अनियंत्रित उधारी देना जिससे कार्यशील पूंजी अटक सकती है; 2) मासिक परिचालन खर्चों (₹${formatCurrency(effectiveExpenses)}) का बजट से बाहर जाना; 3) किश्त (₹${formatCurrency(monthlyEmi)}) में देरी। शुरुआत से ही ₹25,000–₹50,000 का इमरजेंसी रिज़र्व फंड रखने से यह जोखिम न्यूनतम हो जाता है।`,
      };
    }
    return {
      answer: `The primary operational risks to guard against are: 1) Excessive customer credit (udhaari), which ties up working capital; 2) Cost creep on monthly operating expenses (currently estimated at ₹${formatCurrency(effectiveExpenses)}); 3) Irregular debt servicing on your ₹${formatCurrency(monthlyEmi)} EMI. Keeping a dedicated 1-month operating reserve mitigates these vulnerabilities.`,
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
    /\b(what if sales are lower|sales drop|profit is lower|profit is only|bikri kam hui|munafa kam hua|profit kam|agar bikri kam)\b/i.test(
      qLower
    )
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

  // Fallback for conversational queries: Answer directly based on user's exact query words
  if (langMode === 'hinglish') {
    return {
      answer: `${businessName} ke liye aapka total project cost ₹${formatCurrency(projectCost)} hai, jismein ₹${formatCurrency(promoterMargin)} aapka margin aur ₹${formatCurrency(eligibleLoan)} eligible loan hai. Har mahine anumanit ₹${formatCurrency(monthlyProfit)} profit ke sath yeh business '${feasibility}' hai. Aap mujhse is sawaal se juda koi bhi specific hisab poochh sakte hain.`,
    };
  }
  if (langMode === 'hi') {
    return {
      answer: `${businessName} के लिए प्रोजेक्ट लागत ₹${formatCurrency(projectCost)}, प्रमोटर मार्जिन ₹${formatCurrency(promoterMargin)} और पात्र बैंक लोन ₹${formatCurrency(eligibleLoan)} है। ₹${formatCurrency(monthlyProfit)} के मासिक लाभ के साथ यह प्रोजेक्ट '${feasibility}' श्रेणी में है।`,
    };
  }
  return {
    answer: `For ${businessName}, your estimated project cost is ₹${formatCurrency(projectCost)} (requiring ₹${formatCurrency(promoterMargin)} margin and ₹${formatCurrency(eligibleLoan)} eligible loan under ${schemeName}). With an estimated net profit of ₹${formatCurrency(monthlyProfit)}/month and '${feasibility}' rating, please ask any specific financial, loan, or market question.`,
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
  };
}

export const handleAnalyze = analyzeBusiness;
export const handleAdvisor = getAdvisorAdvice;


