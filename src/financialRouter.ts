/**
 * Central SIH26091 Financial Router & Calculation Engine
 * 
 * Single authoritative source of truth for:
 * - Margin capital -> Project cost (10%) & Maximum loan (90%)
 * - SIH26091 Core Scheme routing (Micro Finance Scheme vs Term Loan Scheme vs Above Standard Scheme Limit)
 * - Boundary conditions (<= ₹1.4L, <= ₹50L, > ₹50L)
 * - Reducing-balance EMI calculation
 * - Moratorium treatment
 * - Repayment schedule generation
 */

export interface PsCoreSchemeResult {
  scheme_name: string;
  status: "Eligible" | "Not Eligible" | "Invalid Input";
  project_cost: number;
  maximum_loan: number;
  eligible_loan: number;
  maximum_scheme_loan: number;
  interest_rate: number | null;
  loan_tenure_months: number | null;
  repayment_period: string | null;
  moratorium_months: number | null;
  rule_source: string;
  message?: string;
}

export interface RepaymentScheduleRow {
  month: number;
  phase: "Moratorium" | "Repayment";
  emi: number;
  interest: number;
  principal: number;
  outstanding_principal: number;
}

export interface QuarterlyRepaymentRow {
  quarter: number;
  months: string;
  phase: string;
  emi_total: number;
  interest_total: number;
  principal_total: number;
  outstanding_principal: number;
}

export interface CentralFinancialResult {
  margin_capital: number;
  project_cost: number;
  beneficiary_contribution: number;
  contribution_percentage: number;
  maximum_loan: number;
  eligible_loan: number;
  maximum_scheme_loan: number;
  scheme_name: string;
  status: "Eligible" | "Not Eligible" | "Invalid Input";
  interest_rate: number | null;
  loan_tenure_months: number | null;
  repayment_period: string | null;
  moratorium_months: number | null;
  repayment_months: number | null;
  rule_source: string;
  message: string;
  monthly_emi: number;
  total_interest: number;
  total_repayment: number;
  emi_to_income_ratio: number | null;
  affordability_status: string;
  affordability_message: string;
  repayment_schedule: RepaymentScheduleRow[];
  quarterly_repayment_schedule: QuarterlyRepaymentRow[];
}

/**
 * 1. Project Cost & Maximum Loan Calculation
 * When the user's financial input represents margin capital:
 * margin_capital = user's available margin capital
 * project_cost = margin_capital / 0.10 (equivalent to margin_capital * 10)
 * maximum_loan = project_cost * 0.90 (beneficiary contribution = margin capital)
 */
export function calculateProjectCostAndMaxLoan(marginCapital: number): {
  margin_capital: number;
  project_cost: number;
  maximum_loan: number;
  beneficiary_contribution: number;
} {
  const numMargin = Number(marginCapital);
  if (isNaN(numMargin) || !isFinite(numMargin) || numMargin <= 0) {
    return {
      margin_capital: 0,
      project_cost: 0,
      maximum_loan: 0,
      beneficiary_contribution: 0,
    };
  }

  // Margin capital is exactly 10% of project cost
  const project_cost = numMargin / 0.10;
  // Maximum loan is exactly 90% of project cost
  const maximum_loan = project_cost * 0.90;

  return {
    margin_capital: numMargin,
    project_cost,
    maximum_loan,
    beneficiary_contribution: numMargin,
  };
}

/**
 * 2. Central SIH26091 Scheme Router
 * 
 * CASE 1 — MICRO FINANCE SCHEME
 * IF project_cost <= 140,000:
 *   scheme_name: "Micro Finance Scheme"
 *   interest_rate: 6.5
 *   loan_tenure_months: 36
 *   repayment_period: "3 years including 3-month moratorium"
 *   moratorium_months: 3
 *   maximum_scheme_loan: 125,000
 *   eligible_loan: MIN(maximum_loan, 125,000)
 *   status: "Eligible"
 * 
 * CASE 2 — TERM LOAN SCHEME
 * IF project_cost > 140,000 AND project_cost <= 5,000,000:
 *   scheme_name: "Term Loan Scheme"
 *   interest_rate: 8.0
 *   loan_tenure_months: 84
 *   repayment_period: "7 years including 6-month moratorium"
 *   moratorium_months: 6
 *   maximum_scheme_loan: 4,500,000
 *   eligible_loan: MIN(maximum_loan, 4,500,000)
 *   status: "Eligible"
 * 
 * CASE 3 — ABOVE STANDARD SCHEME LIMIT
 * IF project_cost > 5,000,000:
 *   scheme_name: "Above Standard Scheme Limit"
 *   interest_rate: null
 *   loan_tenure_months: null
 *   repayment_period: null
 *   moratorium_months: null
 *   maximum_scheme_loan: 0
 *   eligible_loan: 0
 *   status: "Not Eligible"
 *   message: "Project cost is above ₹50 lakh. Check other financing options."
 */
export function routePsCoreScheme(
  projectCost: number,
  maximumLoan: number
): PsCoreSchemeResult {
  const pCost = Number(projectCost);
  const mLoan = Number(maximumLoan);

  if (isNaN(pCost) || !isFinite(pCost) || pCost <= 0 || isNaN(mLoan) || !isFinite(mLoan) || mLoan < 0) {
    return {
      scheme_name: "Invalid Input",
      status: "Invalid Input",
      project_cost: 0,
      maximum_loan: 0,
      eligible_loan: 0,
      maximum_scheme_loan: 0,
      interest_rate: null,
      loan_tenure_months: null,
      repayment_period: null,
      moratorium_months: null,
      rule_source: "SIH26091 Core Financial Rules",
      message: "Please enter a valid positive margin capital amount.",
    };
  }

  // CASE 1: project_cost <= 140,000
  if (pCost <= 140000) {
    const maximum_scheme_loan = 125000;
    const eligible_loan = Math.min(mLoan, maximum_scheme_loan);
    return {
      scheme_name: "Micro Finance Scheme",
      status: "Eligible",
      project_cost: pCost,
      maximum_loan: mLoan,
      eligible_loan,
      maximum_scheme_loan,
      interest_rate: 6.5,
      loan_tenure_months: 36,
      repayment_period: "3 years including 3-month moratorium",
      moratorium_months: 3,
      rule_source: "SIH26091 Core Financial Rules",
      message: "Eligible under Micro Finance Scheme (up to ₹1.25 Lakh loan with 6.5% interest).",
    };
  }

  // CASE 2: project_cost > 140,000 AND project_cost <= 5,000,000
  if (pCost <= 5000000) {
    const maximum_scheme_loan = 4500000;
    const eligible_loan = Math.min(mLoan, maximum_scheme_loan);
    return {
      scheme_name: "Term Loan Scheme",
      status: "Eligible",
      project_cost: pCost,
      maximum_loan: mLoan,
      eligible_loan,
      maximum_scheme_loan,
      interest_rate: 8.0,
      loan_tenure_months: 84,
      repayment_period: "7 years including 6-month moratorium",
      moratorium_months: 6,
      rule_source: "SIH26091 Core Financial Rules",
      message: "Eligible under Term Loan Scheme (up to ₹45 Lakh loan with 8.0% interest).",
    };
  }

  // CASE 3: project_cost > 5,000,000
  return {
    scheme_name: "Above Standard Scheme Limit",
    status: "Not Eligible",
    project_cost: pCost,
    maximum_loan: mLoan,
    eligible_loan: 0,
    maximum_scheme_loan: 0,
    interest_rate: null,
    loan_tenure_months: null,
    repayment_period: null,
    moratorium_months: null,
    rule_source: "SIH26091 Core Financial Rules",
    message: "Project cost is above ₹50 lakh. Check other financing options.",
  };
}

/**
 * 3. Reducing-balance Monthly EMI Calculation
 * EMI = P × r × (1+r)^n / ((1+r)^n - 1)
 * Where:
 * P = eligible_loan
 * r = annual interest rate / 12 / 100
 * n = repayment duration in months = loan_tenure_months - moratorium_months
 */
export function calculateEmi(
  eligibleLoan: number,
  interestRate: number | null,
  loanTenureMonths: number | null,
  moratoriumMonths: number | null
): { monthlyEmi: number; repaymentMonths: number } {
  if (
    !eligibleLoan ||
    eligibleLoan <= 0 ||
    interestRate == null ||
    interestRate <= 0 ||
    loanTenureMonths == null ||
    loanTenureMonths <= 0
  ) {
    return { monthlyEmi: 0, repaymentMonths: 0 };
  }

  const moratorium = moratoriumMonths != null && moratoriumMonths > 0 ? moratoriumMonths : 0;
  const repaymentMonths = Math.max(1, loanTenureMonths - moratorium);
  const monthlyRate = interestRate / (12 * 100);

  if (monthlyRate <= 0) {
    return {
      monthlyEmi: Math.round((eligibleLoan / repaymentMonths) * 100) / 100,
      repaymentMonths,
    };
  }

  const factor = Math.pow(1 + monthlyRate, repaymentMonths);
  const emi = (eligibleLoan * monthlyRate * factor) / (factor - 1);
  return {
    monthlyEmi: Math.round(emi * 100) / 100,
    repaymentMonths,
  };
}

/**
 * 4. Repayment Schedule Generator
 * Produces month-by-month and quarterly schedule with:
 * - Moratorium phase (interest accrual / 0 principal paid)
 * - Repayment phase (reducing balance EMI paying down principal to 0.00)
 */
export function generateRepaymentSchedule(
  eligibleLoan: number,
  interestRate: number | null,
  loanTenureMonths: number | null,
  moratoriumMonths: number | null,
  monthlyEmi: number
): {
  repaymentSchedule: RepaymentScheduleRow[];
  quarterlyRepaymentSchedule: QuarterlyRepaymentRow[];
  totalInterest: number;
  totalRepayment: number;
} {
  const repaymentSchedule: RepaymentScheduleRow[] = [];
  const quarterlyRepaymentSchedule: QuarterlyRepaymentRow[] = [];

  if (
    !eligibleLoan ||
    eligibleLoan <= 0 ||
    interestRate == null ||
    loanTenureMonths == null ||
    loanTenureMonths <= 0
  ) {
    return {
      repaymentSchedule: [],
      quarterlyRepaymentSchedule: [],
      totalInterest: 0,
      totalRepayment: 0,
    };
  }

  const moratorium = moratoriumMonths != null && moratoriumMonths > 0 ? moratoriumMonths : 0;
  const monthlyRate = interestRate / (12 * 100);
  let outstandingPrincipal = Math.round(eligibleLoan * 100) / 100;
  let totalRegularInterest = 0.0;
  let totalMoratoriumInterest = 0.0;

  for (let month = 1; month <= loanTenureMonths; month++) {
    const monthlyInterest = Math.round(outstandingPrincipal * monthlyRate * 100) / 100;
    let principalPayment = 0.0;
    let emiPayment = 0.0;

    if (month <= moratorium) {
      // Moratorium phase
      totalMoratoriumInterest += monthlyInterest;
      emiPayment = 0.0;
      principalPayment = 0.0;
    } else {
      // Repayment phase
      emiPayment = monthlyEmi;
      principalPayment = Math.round((emiPayment - monthlyInterest) * 100) / 100;

      // Final month or rounding edge-case: clear exact remaining principal
      if (month === loanTenureMonths || principalPayment > outstandingPrincipal) {
        principalPayment = Math.round(outstandingPrincipal * 100) / 100;
        emiPayment = Math.round((principalPayment + monthlyInterest) * 100) / 100;
      }

      outstandingPrincipal = Math.max(
        0,
        Math.round((outstandingPrincipal - principalPayment) * 100) / 100
      );
      totalRegularInterest += monthlyInterest;
    }

    repaymentSchedule.push({
      month,
      phase: month <= moratorium ? "Moratorium" : "Repayment",
      emi: Math.round(emiPayment * 100) / 100,
      interest: Math.round(monthlyInterest * 100) / 100,
      principal: Math.round(principalPayment * 100) / 100,
      outstanding_principal: Math.round(outstandingPrincipal * 100) / 100,
    });
  }

  const totalInterest = Math.round((totalRegularInterest + totalMoratoriumInterest) * 100) / 100;
  const totalRepayment = Math.round((eligibleLoan + totalInterest) * 100) / 100;

  for (let quarterStart = 1; quarterStart <= loanTenureMonths; quarterStart += 3) {
    const quarterEnd = Math.min(quarterStart + 2, loanTenureMonths);
    const quarterRows = repaymentSchedule.slice(quarterStart - 1, quarterEnd);

    quarterlyRepaymentSchedule.push({
      quarter: Math.floor((quarterStart - 1) / 3) + 1,
      months: `${quarterStart}-${quarterEnd}`,
      phase:
        quarterEnd <= moratorium
          ? "Moratorium"
          : quarterStart <= moratorium
          ? "Mixed"
          : "Repayment",
      emi_total: Math.round(quarterRows.reduce((s, r) => s + r.emi, 0) * 100) / 100,
      interest_total: Math.round(quarterRows.reduce((s, r) => s + r.interest, 0) * 100) / 100,
      principal_total: Math.round(quarterRows.reduce((s, r) => s + r.principal, 0) * 100) / 100,
      outstanding_principal:
        Math.round(quarterRows[quarterRows.length - 1].outstanding_principal * 100) / 100,
    });
  }

  return {
    repaymentSchedule,
    quarterlyRepaymentSchedule,
    totalInterest,
    totalRepayment,
  };
}

/**
 * 5. Comprehensive SIH26091 Financial Calculation
 * Consumes user's margin capital and generates the complete, centralized financial plan.
 */
export function calculateSih26091Financials(
  marginCapital: number,
  monthlyRevenue: number = 0,
  monthlyExpenses: number = 0
): CentralFinancialResult {
  const { margin_capital, project_cost, maximum_loan, beneficiary_contribution } =
    calculateProjectCostAndMaxLoan(marginCapital);

  const route = routePsCoreScheme(project_cost, maximum_loan);

  let monthlyEmi = 0;
  let repaymentMonths: number | null = null;
  let scheduleResult = {
    repaymentSchedule: [] as RepaymentScheduleRow[],
    quarterlyRepaymentSchedule: [] as QuarterlyRepaymentRow[],
    totalInterest: 0,
    totalRepayment: 0,
  };

  if (route.status === "Eligible" && route.eligible_loan > 0) {
    const emiCalc = calculateEmi(
      route.eligible_loan,
      route.interest_rate,
      route.loan_tenure_months,
      route.moratorium_months
    );
    monthlyEmi = emiCalc.monthlyEmi;
    repaymentMonths = emiCalc.repaymentMonths;

    scheduleResult = generateRepaymentSchedule(
      route.eligible_loan,
      route.interest_rate,
      route.loan_tenure_months,
      route.moratorium_months,
      monthlyEmi
    );
  }

  const monthlyProfit = monthlyRevenue - monthlyExpenses;
  let emiToIncomeRatio: number | null = null;
  let affordabilityStatus = "Not Available";
  let affordabilityMessage = "Loan affordability could not be calculated.";

  if (route.status === "Not Eligible") {
    affordabilityStatus = "Not Eligible";
    affordabilityMessage = route.message || "Project cost is above ₹50 lakh. Check other financing options.";
  } else if (route.status === "Invalid Input") {
    affordabilityStatus = "Invalid Input";
    affordabilityMessage = "Please provide valid financial figures.";
  } else if (monthlyEmi > 0 && monthlyRevenue > 0) {
    emiToIncomeRatio = Math.round(((monthlyEmi / monthlyRevenue) * 100) * 100) / 100;
    if (monthlyProfit <= 0) {
      affordabilityStatus = "Not Affordable";
      affordabilityMessage = "Business has no positive monthly profit to service the loan.";
    } else if (monthlyEmi > monthlyProfit) {
      affordabilityStatus = "Not Affordable";
      affordabilityMessage = "EMI exceeds total monthly profit buffer.";
    } else if (emiToIncomeRatio > 40) {
      affordabilityStatus = "High Repayment Burden";
      affordabilityMessage = "EMI creates a significant financial burden on monthly turnover.";
    } else if (emiToIncomeRatio > 25) {
      affordabilityStatus = "Moderately Affordable";
      affordabilityMessage = "Loan is manageable but will put pressure on daily operational cash flow.";
    } else {
      affordabilityStatus = "Affordable";
      affordabilityMessage = "EMI appears manageable and comfortably covered by projected profits.";
    }
  } else if (route.status === "Eligible") {
    affordabilityStatus = "Eligible";
    affordabilityMessage = "Eligible for credit assistance under SIH26091 scheme rules.";
  }

  return {
    margin_capital,
    project_cost: Math.round(project_cost * 100) / 100,
    beneficiary_contribution: Math.round(beneficiary_contribution * 100) / 100,
    contribution_percentage: 10,
    maximum_loan: Math.round(maximum_loan * 100) / 100,
    eligible_loan: Math.round(route.eligible_loan * 100) / 100,
    maximum_scheme_loan: route.maximum_scheme_loan,
    scheme_name: route.scheme_name,
    status: route.status,
    interest_rate: route.interest_rate,
    loan_tenure_months: route.loan_tenure_months,
    repayment_period: route.repayment_period,
    moratorium_months: route.moratorium_months,
    repayment_months: repaymentMonths,
    rule_source: route.rule_source,
    message: route.message || "",
    monthly_emi: monthlyEmi,
    total_interest: scheduleResult.totalInterest,
    total_repayment: scheduleResult.totalRepayment,
    emi_to_income_ratio: emiToIncomeRatio,
    affordability_status: affordabilityStatus,
    affordability_message: affordabilityMessage,
    repayment_schedule: scheduleResult.repaymentSchedule,
    quarterly_repayment_schedule: scheduleResult.quarterlyRepaymentSchedule,
  };
}
