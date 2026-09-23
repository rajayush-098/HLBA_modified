import { getTehsilMarketReach } from '../locationData';

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
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

export function getAdvisorAdvice(data: AdvisorRequest): { answer: string } {
  const question = (data.question || '').toLowerCase().trim();

  if (!question) {
    return { answer: 'Please enter a question about your business.' };
  }

  const businessName = data.business_name || 'Your business';
  const monthlyProfit = data.monthly_profit ?? 0;
  const monthlyRevenue = data.monthly_revenue ?? 0;
  const monthlyExpenses = data.monthly_expenses ?? 0;
  const roiPercentage = data.roi_percentage ?? 0;
  const affordabilityStatus = data.affordability_status || '';
  const monthlyEmi = data.monthly_emi ?? 0;
  const overallRiskLevel = data.overall_risk_level || '';
  const financialRisk = data.financial_risk || '';
  const localDemand = data.local_demand || '';
  const competitionLevel = data.competition_level || '';
  const feasibility = data.feasibility || '';

  let answer = '';

  if (['hello', 'hi', 'hey', 'good morning', 'good evening'].some((w) => question.includes(w))) {
    answer = `Hello! I am your AI Business Advisor. I can help you understand the analysis for ${businessName}. You can ask me about profit, ROI, expenses, loans, EMI, risks, local market demand, competition, or business growth.`;
  } else if (['profit', 'profitable', 'profitability', 'earning', 'earnings'].some((w) => question.includes(w))) {
    if (monthlyProfit > 0) {
      answer = `${businessName} is currently generating an estimated monthly profit of ₹${formatCurrency(monthlyProfit)}. `;
      if (monthlyRevenue > 0) {
        const profitMargin = (monthlyProfit / monthlyRevenue) * 100;
        answer += `The estimated profit margin is ${profitMargin.toFixed(2)}%. `;
      }
      if (monthlyProfit < 10000) {
        answer += 'The business is profitable, but the profit level is relatively low. Focus on increasing sales and controlling expenses.';
      } else {
        answer += 'The business is generating positive profit. Continue monitoring expenses and maintain stable revenue growth.';
      }
    } else {
      answer = `${businessName} is currently not generating positive monthly profit. You should reduce operating expenses, improve sales, and review the business model before expanding or taking additional financial risk.`;
    }
  } else if (['roi', 'return on investment', 'return'].some((w) => question.includes(w))) {
    if (roiPercentage >= 30) {
      answer = `Your estimated ROI is ${roiPercentage.toFixed(2)}%, which indicates strong financial performance based on the entered business data.`;
    } else if (roiPercentage >= 15) {
      answer = `Your estimated ROI is ${roiPercentage.toFixed(2)}%, which indicates reasonable business performance. You can improve ROI by increasing profit without making a proportional increase in investment.`;
    } else if (roiPercentage > 0) {
      answer = `Your estimated ROI is ${roiPercentage.toFixed(2)}%, which is relatively low. Focus on improving revenue, reducing costs, and using investment more efficiently.`;
    } else {
      answer = 'Your current ROI is not positive. The business should improve its profitability before making additional investments.';
    }
  } else if (['expense', 'expenses', 'cost', 'reduce cost', 'reduce expense', 'save money'].some((w) => question.includes(w))) {
    if (monthlyRevenue > 0) {
      const expenseRatio = (monthlyExpenses / monthlyRevenue) * 100;
      answer = `Your estimated monthly expenses are ₹${formatCurrency(monthlyExpenses)}, which is approximately ${expenseRatio.toFixed(2)}% of monthly revenue. `;
      if (expenseRatio >= 80) {
        answer += 'Your expense ratio is high. Review your largest costs first, negotiate with suppliers, reduce wastage, and avoid unnecessary operational spending.';
      } else if (expenseRatio >= 60) {
        answer += 'Your expenses need regular monitoring. Identify recurring costs that can be reduced without affecting product or service quality.';
      } else {
        answer += 'Your expense ratio appears relatively manageable. Continue monitoring costs and maintain financial discipline.';
      }
    } else {
      answer = 'Please provide valid revenue information for a detailed expense analysis.';
    }
  } else if (['loan', 'emi', 'repayment', 'afford', 'affordable', 'pay loan'].some((w) => question.includes(w))) {
    answer = `Your current loan affordability status is '${affordabilityStatus}'. `;
    if (monthlyEmi > 0) {
      answer += `The estimated monthly EMI is ₹${formatCurrency(monthlyEmi)}. `;
    }
    if (affordabilityStatus === 'Affordable') {
      answer += 'Based on the entered business figures, the repayment burden appears manageable. However, keep an emergency reserve for unexpected expenses.';
    } else if (affordabilityStatus === 'Moderately Affordable') {
      answer += 'The loan may be manageable, but it can place pressure on cash flow. Maintain a reserve and avoid taking additional debt.';
    } else if (affordabilityStatus === 'High Repayment Burden') {
      answer += 'The repayment burden is high. Consider reducing the loan amount, increasing your own contribution, or improving business cash flow.';
    } else {
      answer += 'The current business figures indicate that loan repayment may be risky. Improve profitability before taking a large financial commitment.';
    }
  } else if (['risk', 'risky', 'danger', 'problem', 'threat'].some((w) => question.includes(w))) {
    answer = `The overall business risk level is '${overallRiskLevel}' and the financial risk is '${financialRisk}'. `;
    if (overallRiskLevel === 'High Risk') {
      answer += 'The priority should be improving profitability, reducing expenses, and avoiding excessive loan commitments.';
    } else if (overallRiskLevel === 'Medium Risk') {
      answer += 'The business has important risks that should be monitored carefully. Focus on financial discipline, market competition, and stable cash flow.';
    } else {
      answer += 'The current risk profile appears manageable, but you should continue monitoring market conditions, costs, and business performance.';
    }
  } else if (['market', 'demand', 'competition', 'customer', 'customers', 'local'].some((w) => question.includes(w))) {
    answer = `The estimated local demand is '${localDemand}' and the competition level is '${competitionLevel}'. `;
    if (localDemand === 'High') {
      answer += 'This suggests good potential for customer acquisition. Focus on quality, reliability, and building strong local customer relationships.';
    } else if (localDemand === 'Medium') {
      answer += 'There is reasonable potential, but marketing and customer feedback will be important for growing the business.';
    } else {
      answer += 'Demand should be validated carefully before expanding. Start with a smaller scale and test customer response.';
    }
  } else if (['grow', 'growth', 'improve', 'better', 'increase', 'expand', 'future'].some((w) => question.includes(w))) {
    answer = `To improve ${businessName}, focus on these priorities: 1) increase profitable sales, 2) control unnecessary expenses, 3) maintain accurate income and expense records, 4) study customer needs and competitors, 5) build an emergency cash reserve, and 6) expand gradually only after achieving stable profits.`;
  } else if (['feasible', 'feasibility', 'should i start', 'good business', 'worth starting'].some((w) => question.includes(w))) {
    answer = `The current feasibility assessment for ${businessName} is '${feasibility}'. `;
    if (feasibility === 'Highly Feasible') {
      answer += 'The entered financial figures show strong potential. Continue validating actual local demand before making the full investment.';
    } else if (feasibility === 'Feasible') {
      answer += 'The business appears viable, but you should carefully manage expenses and monitor local market performance.';
    } else if (feasibility === 'Moderately Feasible') {
      answer += 'The business has potential but should improve profitability and financial margins before major expansion.';
    } else {
      answer += 'The current financial figures do not support strong feasibility. Review revenue assumptions, expenses, and investment requirements.';
    }
  } else {
    answer = `Based on the analysis of ${businessName}, the current feasibility is '${feasibility}', with an estimated monthly profit of ₹${formatCurrency(monthlyProfit)} and ROI of ${roiPercentage.toFixed(2)}%. You can ask me specifically about profit, ROI, expenses, loan EMI, risks, market demand, competition, feasibility, or business growth.`;
  }

  return { answer };
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

  // 12-MONTH PROFIT PROJECTION
  const profitProjection = [];
  let cumulativeProfit = 0;
  for (let month = 1; month <= 12; month++) {
    cumulativeProfit += monthlyProfit;
    profitProjection.push({
      month: `Month ${month}`,
      monthly_profit: Math.round(monthlyProfit * 100) / 100,
      cumulative_profit: Math.round(cumulativeProfit * 100) / 100,
    });
  }

  // FEASIBILITY
  let feasibility = 'Moderately Feasible';
  if (monthlyProfit <= 0) {
    feasibility = 'Not Feasible';
  } else if (roi >= 30 && profitMargin >= 20) {
    feasibility = 'Highly Feasible';
  } else if (roi >= 15) {
    feasibility = 'Feasible';
  } else {
    feasibility = 'Moderately Feasible';
  }

  // STEP 5: GOVERNMENT LOAN SCHEME ANALYSIS
  const marginCapital = investment;
  const projectCost = marginCapital / 0.1;
  const maximumLoan = projectCost * 0.9;
  const beneficiaryContribution = marginCapital;
  let eligibleLoan = maximumLoan;

  let schemeName = 'Not Eligible';
  let schemeMessage = 'No suitable scheme found.';
  let interestRate: number | null = null;
  let repaymentPeriod: string | null = null;
  let loanTenureMonths: number | null = null;
  let moratoriumMonths = 0;
  let repaymentMonths: number | null = null;

  if (projectCost <= 140000) {
    schemeName = 'Micro Finance Scheme';
    eligibleLoan = Math.min(eligibleLoan, 125000);
    interestRate = 6.5;
    repaymentPeriod = '3 years including 3-month moratorium';
    loanTenureMonths = 36;
    moratoriumMonths = 3;
    schemeMessage = 'Eligible for the Micro Finance Scheme.';
  } else if (projectCost <= 5000000) {
    schemeName = 'Term Loan Scheme';
    eligibleLoan = Math.min(eligibleLoan, 4500000);
    interestRate = 8.0;
    repaymentPeriod = '7 years including 6-month moratorium';
    loanTenureMonths = 84;
    moratoriumMonths = 6;
    schemeMessage = 'Eligible for the Term Loan Scheme.';
  } else {
    schemeName = 'Above Standard Scheme Limit';
    eligibleLoan = 0;
    schemeMessage = 'Project cost is above ₹50 lakh. Check other financing options.';
  }

  // STEP 6: EMI + LOAN AFFORDABILITY + MORATORIUM
  let monthlyEmi: number | null = null;
  let totalRepayment: number | null = null;
  let totalInterest: number | null = null;
  let emiToIncomeRatio: number | null = null;

  const repaymentSchedule: Array<{
    month: number;
    phase: string;
    emi: number;
    interest: number;
    principal: number;
    outstanding_principal: number;
  }> = [];

  const quarterlyRepaymentSchedule: Array<{
    quarter: number;
    months: string;
    phase: string;
    emi_total: number;
    interest_total: number;
    principal_total: number;
    outstanding_principal: number;
  }> = [];

  const estimatedWorkingCapital = Math.max(monthlyExpenses, 0);
  const monthlyOperationalCost = Math.max(monthlyExpenses, 0);

  let affordabilityStatus = 'Not Available';
  let affordabilityMessage = 'Loan affordability could not be calculated.';

  if (eligibleLoan > 0 && interestRate !== null && loanTenureMonths !== null) {
    repaymentMonths = loanTenureMonths - moratoriumMonths;
    const monthlyInterestRate = interestRate / (12 * 100);

    if (repaymentMonths > 0) {
      let emi = 0;
      if (monthlyInterestRate > 0) {
        emi =
          (eligibleLoan *
            monthlyInterestRate *
            Math.pow(1 + monthlyInterestRate, repaymentMonths)) /
          (Math.pow(1 + monthlyInterestRate, repaymentMonths) - 1);
      } else {
        emi = eligibleLoan / repaymentMonths;
      }

      monthlyEmi = Math.round(emi * 100) / 100;
      let outstandingPrincipal = Math.round(eligibleLoan * 100) / 100;
      let totalRegularInterest = 0.0;
      let totalMoratoriumInterest = 0.0;

      for (let month = 1; month <= loanTenureMonths; month++) {
        const monthlyInterest = Math.round(outstandingPrincipal * monthlyInterestRate * 100) / 100;

        let principalPayment = 0.0;
        let emiPayment = 0.0;

        if (month <= moratoriumMonths) {
          totalMoratoriumInterest += monthlyInterest;
        } else {
          emiPayment = monthlyEmi;
          principalPayment = Math.round((emiPayment - monthlyInterest) * 100) / 100;

          if (month === loanTenureMonths || principalPayment > outstandingPrincipal) {
            principalPayment = Math.round(outstandingPrincipal * 100) / 100;
            emiPayment = Math.round((principalPayment + monthlyInterest) * 100) / 100;
          }

          outstandingPrincipal = Math.round((outstandingPrincipal - principalPayment) * 100) / 100;
          totalRegularInterest += monthlyInterest;
        }

        repaymentSchedule.push({
          month,
          phase: month <= moratoriumMonths ? 'Moratorium' : 'Repayment',
          emi: Math.round(emiPayment * 100) / 100,
          interest: Math.round(monthlyInterest * 100) / 100,
          principal: Math.round(principalPayment * 100) / 100,
          outstanding_principal: Math.round(outstandingPrincipal * 100) / 100,
        });
      }

      totalInterest = Math.round((totalRegularInterest + totalMoratoriumInterest) * 100) / 100;
      totalRepayment = Math.round((eligibleLoan + totalInterest) * 100) / 100;

      for (let quarterStart = 1; quarterStart <= loanTenureMonths; quarterStart += 3) {
        const quarterEnd = Math.min(quarterStart + 2, loanTenureMonths);
        const quarterRows = repaymentSchedule.slice(quarterStart - 1, quarterEnd);

        quarterlyRepaymentSchedule.push({
          quarter: Math.floor((quarterStart - 1) / 3) + 1,
          months: `${quarterStart}-${quarterEnd}`,
          phase:
            quarterEnd <= moratoriumMonths
              ? 'Moratorium'
              : quarterStart <= moratoriumMonths
              ? 'Mixed'
              : 'Repayment',
          emi_total: Math.round(quarterRows.reduce((s, r) => s + r.emi, 0) * 100) / 100,
          interest_total: Math.round(quarterRows.reduce((s, r) => s + r.interest, 0) * 100) / 100,
          principal_total: Math.round(quarterRows.reduce((s, r) => s + r.principal, 0) * 100) / 100,
          outstanding_principal: Math.round(quarterRows[quarterRows.length - 1].outstanding_principal * 100) / 100,
        });
      }

      if (monthlyRevenue > 0) {
        emiToIncomeRatio = Math.round(((monthlyEmi / monthlyRevenue) * 100) * 100) / 100;

        if (monthlyProfit <= 0) {
          affordabilityStatus = 'Not Affordable';
          affordabilityMessage = 'Business has no positive monthly profit.';
        } else if (monthlyEmi > monthlyCashSurplus) {
          affordabilityStatus = 'Not Affordable';
          affordabilityMessage = 'EMI is higher than monthly cash surplus.';
        } else if (emiToIncomeRatio > 40) {
          affordabilityStatus = 'High Repayment Burden';
          affordabilityMessage = 'EMI creates a significant financial burden.';
        } else if (emiToIncomeRatio > 25) {
          affordabilityStatus = 'Moderately Affordable';
          affordabilityMessage = 'Loan is possible but will put pressure on cash flow.';
        } else {
          affordabilityStatus = 'Affordable';
          affordabilityMessage = 'EMI appears manageable based on current figures.';
        }
      }
    }
  }

  // STEP 7: SMART SCHEME MATCHING
  const matchingSchemes = [];
  if (projectCost <= 140000) {
    matchingSchemes.push({
      scheme_name: 'Micro Finance Scheme',
      project_cost_limit: 'Up to ₹1.40 lakh',
      maximum_loan: 125000,
      eligible_loan: Math.round(Math.min(maximumLoan, 125000) * 100) / 100,
      interest_rate: 6.5,
      repayment_period: '3 years including 3-month moratorium',
      moratorium_months: 3,
      match_score: 95,
      reason: 'Project cost falls within the Micro Finance Scheme limit.',
    });
  } else if (projectCost <= 5000000) {
    matchingSchemes.push({
      scheme_name: 'Term Loan Scheme',
      project_cost_limit: '₹1.40 lakh to ₹50 lakh',
      maximum_loan: 4500000,
      eligible_loan: Math.round(Math.min(maximumLoan, 4500000) * 100) / 100,
      interest_rate: 8.0,
      repayment_period: '7 years including 6-month moratorium',
      moratorium_months: 6,
      match_score: 95,
      reason: 'Project cost falls within the Term Loan Scheme limit.',
    });
  }

  const recommendedScheme =
    matchingSchemes.length > 0
      ? matchingSchemes.reduce((prev, curr) => (curr.match_score > prev.match_score ? curr : prev))
      : {
          scheme_name: 'No Standard Scheme Match',
          match_score: 0,
          reason: 'No standard scheme match found.',
        };

  // HYPER-LOCAL MARKET ANALYSIS
  const category = (data.category || '').toLowerCase();
  const localDemand: string = ['dairy', 'agriculture', 'poultry', 'fishery'].includes(category)
  ? 'High'
  : 'Medium';

  let competitionLevel = 'Medium';
  if (['retail', 'service'].includes(category)) {
    competitionLevel = 'High';
  } else if (['dairy', 'poultry', 'agriculture'].includes(category)) {
    competitionLevel = 'Medium';
  } else {
    competitionLevel = 'Medium';
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

  // Market Reach
  const tehsilData = (data.district && data.district.toLowerCase() === 'meerut')
    ? getTehsilMarketReach(data.district, data.block || data.location || 'Meerut', 5)
    : null;

  const marketReach = {
    primary_radius_km: tehsilData ? tehsilData.radius_km : 5,
    extended_radius_km: tehsilData ? tehsilData.radius_km * 2 : 10,
    service_area: `5–10 km from ${data.location}, ${data.block}, ${data.district}`,
    consumer_base: tehsilData
      ? `${tehsilData.reachable_consumers.toLocaleString('en-IN')} reachable consumers (~${tehsilData.reachable_households.toLocaleString('en-IN')} households)`
      : 'Not numerically estimated: verified village/block demographic data is not currently available in the configured dataset.',
    consumer_base_status: tehsilData ? 'Verified Census & SIH Dataset' : 'Data required',
    data_source: tehsilData
      ? `SIH 2026 Hyper-Local Tehsil Dataset (${tehsilData.zone_classification})`
      : 'No verified local demographic dataset connected',
    confidence: tehsilData ? 'High (Census-calibrated)' : 'Low',
    reach_type: tehsilData
      ? `${tehsilData.zone_classification} • Clusters: ${tehsilData.dominant_local_clusters.join(', ')}`
      : 'Estimated service area; population count unavailable',
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

  if (category === 'dairy') {
    marketReach.distribution_channels = [
      'Nearby households',
      'Local milk collection centers',
      'Local grocery shops',
      'Restaurants and tea shops',
      'Direct home delivery',
    ];
  } else if (category === 'poultry') {
    marketReach.distribution_channels = [
      'Nearby households',
      'Local grocery shops',
      'Restaurants and hotels',
      'Local poultry retailers',
      'Direct local delivery',
    ];
  } else if (category === 'agriculture') {
    marketReach.distribution_channels = [
      'Local markets',
      'Nearby households',
      'Local traders',
      'Retailers and wholesalers',
      'Direct-to-consumer sales',
    ];
  } else if (category === 'fishery') {
    marketReach.distribution_channels = [
      'Local fish markets',
      'Nearby households',
      'Restaurants and hotels',
      'Local retailers',
      'Direct local delivery',
    ];
  } else if (category === 'retail') {
    marketReach.distribution_channels = [
      'Nearby households',
      'Walk-in local customers',
      'Local institutions',
      'Local delivery',
      'Repeat neighborhood customers',
    ];
  } else if (category === 'service') {
    marketReach.distribution_channels = [
      'Nearby households',
      'Local customers',
      'Local institutions',
      'Referral customers',
      'Digital/local communication channels',
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

  if (category === 'dairy') {
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
  } else if (category === 'poultry') {
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
  } else if (category === 'agriculture') {
    localOpportunities = [
      'Opportunity to select crops suitable for local conditions.',
      'Potential for direct-to-market selling.',
      'Scope for value-added agricultural products.',
    ];
    localRisks = [
      'Weather and seasonal risks.',
      'Fluctuating crop prices.',
      'Water availability and irrigation dependency.',
    ];
  } else if (category === 'fishery') {
    localOpportunities = [
      'Growing demand for fresh fish products.',
      'Opportunity to supply nearby markets and restaurants.',
      'Potential to select high-demand fish species.',
    ];
    localRisks = [
      'Water quality and availability risks.',
      'Fish disease risks.',
      'Seasonal and market price fluctuations.',
    ];
  } else if (category === 'retail') {
    localOpportunities = [
      'Opportunity to serve daily local consumer needs.',
      'Potential to build repeat customers.',
      'Possibility of adding new products based on demand.',
    ];
    localRisks = [
      'High local competition.',
      'Inventory management challenges.',
      'Changing customer preferences.',
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

  if (category === 'dairy') {
    opportunityAnalysis.identified_niches = [
      'Hygienic packaged milk for nearby households',
      'Value-added dairy products such as paneer, curd and ghee',
      'Doorstep dairy delivery for nearby customers',
      'Bulk dairy supply to tea shops, restaurants and small institutions',
    ];
  } else if (category === 'poultry') {
    opportunityAnalysis.identified_niches = [
      'Cleaned and graded egg supply for local retailers',
      'Direct household egg and poultry delivery',
      'Regular poultry supply contracts with restaurants and hotels',
      'Bundled poultry feed/essential support for nearby small producers',
    ];
  } else if (category === 'agriculture') {
    opportunityAnalysis.identified_niches = [
      'Last-mile agricultural input delivery',
      'Custom farm services for small and marginal farmers',
      'Crop aggregation, grading and local market linkage',
      'Value-added processing of locally suitable agricultural produce',
    ];
  } else if (category === 'fishery') {
    opportunityAnalysis.identified_niches = [
      'Cleaned and ready-to-cook fish for nearby households',
      'Doorstep fresh-fish delivery',
      'Regular fresh-fish supply to restaurants and local retailers',
      'Small-scale ice/cold-chain support for local fish sellers',
    ];
  } else if (category === 'retail') {
    opportunityAnalysis.identified_niches = [
      'Last-mile delivery of essential goods to nearby households',
      'Digital/phone-based ordering for repeat local customers',
      'Focused stocking of frequently requested local products',
      'Home-delivery service for elderly or mobility-limited customers',
    ];
  } else if (category === 'service') {
    opportunityAnalysis.identified_niches = [
      'Mobile repair and maintenance services',
      'Local bookkeeping and digital business support',
      'Farm equipment rental or on-demand service support',
      'Hyper-local transport, delivery or logistics assistance',
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

  const hyperLocalRecommendation = `${data.business_name} in ${data.location}, ${data.district}, ${data.state} has ${locationSuitability.toLowerCase()} market suitability. Estimated local demand is ${localDemand.toLowerCase()} with ${competitionLevel.toLowerCase()} competition.`;

  const hyperLocalProfile = {
    state: data.state,
    district: data.district,
    block: data.block,
    location: data.location,
    category: data.category,
    profile_summary: `Business analysis prepared for ${data.business_name} in ${data.location}, ${data.block}, ${data.district}, ${data.state}.`,
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
  if (feasibility === 'Not Feasible') {
    recommendation = `${data.business_name} is currently not feasible based on the provided financial information. Review expenses and revenue.`;
  } else if (feasibility === 'Highly Feasible') {
    recommendation = `${data.business_name} appears highly feasible based on the provided financial information.`;
  } else if (feasibility === 'Feasible') {
    recommendation = `${data.business_name} appears feasible. Continue monitoring expenses and market demand.`;
  } else {
    recommendation = `${data.business_name} is moderately feasible. Consider improving profit margins before major expansion.`;
  }

  return {
    business: data.business_name,
    category: data.category,
    state: data.state,
    district: data.district,
    block: data.block,
    location: data.location,
    experience: data.experience,
    hyper_local_profile: hyperLocalProfile,
    risk_analysis: riskAnalysis,
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
    recommendation,
    scheme_analysis: {
      scheme_name: schemeName,
      margin_capital: Math.round(marginCapital * 100) / 100,
      project_cost: Math.round(projectCost * 100) / 100,
      beneficiary_contribution: Math.round(beneficiaryContribution * 100) / 100,
      contribution_percentage: 10,
      maximum_loan: Math.round(maximumLoan * 100) / 100,
      eligible_loan: Math.round(eligibleLoan * 100) / 100,
      interest_rate: interestRate,
      repayment_period: repaymentPeriod,
      message: schemeMessage,
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


