import MinimalPieChart from "./MinimalPieChart";

export default function PageOverview({ result, formatCurrency, lang, onJumpPage }) {
  const isHi = lang === "hi";

  const monthlyProfit = result.financial_analysis?.monthly_profit ?? 0;
  const yearlyProfit = result.financial_analysis?.yearly_profit ?? 0;
  const roi = result.financial_analysis?.roi_percentage ?? 0;
  const payback = result.financial_analysis?.payback_period_months;
  const feasibility = result.feasibility;

  const isGood = monthlyProfit > 0 && feasibility !== "Not Feasible";

  const margin = result.scheme_analysis?.beneficiary_contribution ?? (Number(result.investment) || 0);
  const eligibleLoan = result.scheme_analysis?.eligible_loan ?? Math.max(0, (result.scheme_analysis?.project_cost || (margin / 0.1)) - margin);
  const capitalData = [
    {
      name: isHi ? "उद्यमी अंशदान (मार्जिन)" : "Promoter Margin (Own)",
      value: margin,
      color: "#16a34a",
      sublabel: isHi ? "आपकी जेब से लगाई जाने वाली राशि" : "Self-financed owner equity",
    },
    {
      name: isHi ? "बैंक लोन सहायता (ऋण)" : "Bank Loan Component",
      value: eligibleLoan,
      color: "#2563eb",
      sublabel: isHi ? "सरकारी योजना के तहत बैंक ऋण" : "Bank loan support eligible",
    },
  ];

  const monthlyRev = Number(
    result.monthly_revenue ??
      result.financial_analysis?.monthly_revenue ??
      (monthlyProfit + (Number(result.monthly_expenses) || 0))
  );
  const monthlyExp = Number(result.monthly_expenses ?? Math.max(0, monthlyRev - monthlyProfit));
  const incomeData = [
    {
      name: isHi ? "मासिक कुल खर्च (Costs)" : "Monthly Operating Costs",
      value: monthlyExp,
      color: "#d97706",
      sublabel: isHi ? "कच्चा माल, मजदूरी व बिल" : "Operational costs & upkeep",
    },
    {
      name: isHi ? "शुद्ध मासिक बचत (Profit)" : "Net Take-Home Profit",
      value: Math.max(0, monthlyProfit),
      color: "#059669",
      sublabel: isHi ? "आपकी जेब में शुद्ध बचत" : "Clean pocket profit",
    },
  ];

  return (
    <div className="side-page-content">
      <div className="page-header-banner">
        <div className="page-header-text">
          <span className="page-badge-pill">
            {isHi ? "पेज 01 • मुख्य सारांश व फैसला" : "Page 01 • Overview & Final Verdict"}
          </span>
          <h2>
            {isHi
              ? `${result.business} का परिणाम`
              : `${result.business} - Feasibility Summary`}
          </h2>
          <p className="page-sub-desc">
            {result.location}, {result.block}, {result.district}, {result.state}
          </p>
        </div>

        <div className={`status-hero-tag ${isGood ? "positive" : "warning"}`}>
          <div>
            <strong>
              {feasibility === "Highly Feasible"
                ? isHi
                  ? "अति उत्तम व्यापार (Highly Feasible)"
                  : "Highly Feasible & Safe"
                : feasibility === "Feasible"
                ? isHi
                  ? "शुरू करने योग्य व्यापार (Feasible)"
                  : "Feasible & Recommended"
                : feasibility === "Moderately Feasible"
                ? isHi
                  ? "मध्यम - संभल कर चलें (Moderate)"
                  : "Moderately Feasible"
                : isHi
                ? "जोखिम भरा - खर्च घटाएं (Not Feasible)"
                : "High Risk - Not Feasible"}
            </strong>
            <p>
              {isGood
                ? isHi
                  ? "यह व्यापार गाँव में मुनाफा कमाने के लिए उपयुक्त है।"
                  : "This business shows positive returns for your village."
                : isHi
                ? "खर्चा ज़्यादा है, पहले खर्चे कम करने का विचार करें।"
                : "Expenses are higher than recommended. Reduce costs first."}
            </p>
          </div>
        </div>
      </div>

      {/* 4 Big KPI Cards for Low-English users */}
      <div className="kpi-hero-grid">
        <div className="kpi-hero-card kpi-green">
          <div className="kpi-top">
            <span className="kpi-tag">
              {isHi ? "जेब में बचत" : "In-Pocket Monthly"}
            </span>
          </div>
          <p className="kpi-label">
            {isHi ? "हर महीने शुद्ध मुनाफा" : "Net Monthly Profit"}
          </p>
          <h3 className="kpi-value">{formatCurrency(monthlyProfit)}</h3>
          <p className="kpi-hint">
            {isHi
              ? "सारे खर्चे निकालने के बाद आपका पैसा"
              : "Money left in your pocket after all expenses"}
          </p>
        </div>

        <div className="kpi-hero-card kpi-blue">
          <div className="kpi-top">
            <span className="kpi-tag">{isHi ? "1 साल में" : "Annual"}</span>
          </div>
          <p className="kpi-label">
            {isHi ? "1 साल की कुल बचत" : "Yearly Total Profit"}
          </p>
          <h3 className="kpi-value">{formatCurrency(yearlyProfit)}</h3>
          <p className="kpi-hint">
            {isHi
              ? "12 महीने का कुल अनुमानित फायदा"
              : "Estimated total savings after 1 full year"}
          </p>
        </div>

        <div className="kpi-hero-card kpi-purple">
          <div className="kpi-top">
            <span className="kpi-tag">{isHi ? "मुनाफे की दर" : "Return Rate"}</span>
          </div>
          <p className="kpi-label">
            {isHi ? "वार्षिक रिटर्न (ROI)" : "Annual Return on Money (ROI)"}
          </p>
          <h3 className="kpi-value">{roi != null ? `${roi}%` : "N/A"}</h3>
          <p className="kpi-hint">
            {isHi
              ? "हर ₹100 लगाने पर सालाना कितना पैसा बनेगा"
              : "Profit generated per ₹100 of money invested"}
          </p>
        </div>

        <div className="kpi-hero-card kpi-amber">
          <div className="kpi-top">
            <span className="kpi-tag">{isHi ? "लागत वापसी" : "Recovery"}</span>
          </div>
          <p className="kpi-label">
            {isHi ? "मूल धन वापसी समय" : "Payback Time Period"}
          </p>
          <h3 className="kpi-value">
            {payback != null ? `${Math.round(payback)} ${isHi ? "महीने" : "Months"}` : "N/A"}
          </h3>
          <p className="kpi-hint">
            {isHi
              ? "जितने महीने में आपकी लगाई पूँजी वापस आ जाएगी"
              : "Months needed to recover your initial margin capital"}
          </p>
        </div>
      </div>

      {/* Visual Pie Charts: Capital Financing Split & Monthly Cashflow */}
      <div className="two-column-grid" style={{ marginBottom: "24px" }}>
        <div className="detail-card">
          <MinimalPieChart
            title={isHi ? "पूँजी संरचना पाई चार्ट" : "Capital Financing Breakdown"}
            subtitle={isHi ? "उद्यमी अंशदान और बैंक ऋण सहायता" : "Owner Margin Money vs Bank Term Loan"}
            data={capitalData}
            formatCurrency={formatCurrency}
            height={200}
            centerText={{
              primary: isHi ? "कुल लागत" : "Total Cost",
              secondary: formatCurrency(margin + eligibleLoan),
            }}
          />
        </div>

        <div className="detail-card">
          <MinimalPieChart
            title={isHi ? "मासिक आमदनी पाई चार्ट" : "Monthly Cashflow Split"}
            subtitle={isHi ? "कुल बिक्री में से खर्च और शुद्ध बचत" : "Operating Costs vs Real Take-Home Margin"}
            data={incomeData}
            formatCurrency={formatCurrency}
            height={200}
            centerText={{
              primary: isHi ? "मासिक बिक्री" : "Monthly Revenue",
              secondary: formatCurrency(monthlyRev),
            }}
          />
        </div>
      </div>

      {/* Aasan Bhasha Mein Samjhein (Easy Plain English / Hindi Explanation Box) */}
      <div className="plain-speak-card">
        <div className="plain-speak-header">
          <span className="plain-speak-badge">{isHi ? "सरल भाषा में समझें" : "Simple Explanation in Plain Words"}</span>
        </div>
        <div className="plain-speak-body">
          <p className="plain-speak-lead">
            {isHi ? (
              <>
                यदि आप इस व्यापार में <strong>{formatCurrency(result.scheme_analysis?.beneficiary_contribution)}</strong> अपनी जेब से लगाते हैं,
                तो हर महीने लगभग <strong>{formatCurrency(monthlyProfit)}</strong> की शुद्ध बचत हो सकती है।
                साल भर में यह बचत लगभग <strong>{formatCurrency(yearlyProfit)}</strong> होगी।
              </>
            ) : (
              <>
                If you put in <strong>{formatCurrency(result.scheme_analysis?.beneficiary_contribution)}</strong> of your own money,
                you can expect to keep about <strong>{formatCurrency(monthlyProfit)}</strong> in your pocket every month after all expenses.
                In 1 full year, your total savings will reach approximately <strong>{formatCurrency(yearlyProfit)}</strong>.
              </>
            )}
          </p>
          <div className="plain-speak-bullets">
            <div className="bullet-point">
              <div>
                <strong>{isHi ? "सरकारी लोन सुविधा:" : "Government Loan Eligibility:"}</strong>
                <span>
                  {isHi
                    ? ` आप ${result.scheme_analysis?.scheme_name || "सरकारी योजना"} के तहत लगभग ${formatCurrency(result.scheme_analysis?.eligible_loan)} तक का बैंक लोन ले सकते हैं।`
                    : ` You are eligible for up to ${formatCurrency(result.scheme_analysis?.eligible_loan)} under the ${result.scheme_analysis?.scheme_name || "Govt Loan Scheme"}.`}
                </span>
              </div>
            </div>
            <div className="bullet-point">
              <div>
                <strong>{isHi ? "महीने की किश्त (EMI):" : "Monthly Loan EMI:"}</strong>
                <span>
                  {isHi
                    ? ` बैंक की महीने की किश्त लगभग ${formatCurrency(result.loan_affordability?.monthly_emi)} होगी, जिसे आपके मुनाफे से आसानी से भरा जा सकता है।`
                    : ` The monthly loan EMI is estimated at ${formatCurrency(result.loan_affordability?.monthly_emi)}, which is comfortably covered by your profit.`}
                </span>
              </div>
            </div>
            <div className="bullet-point">
              <div>
                <strong>{isHi ? "स्थानीय माँग:" : "Local Village Demand:"}</strong>
                <span>
                  {isHi
                    ? ` आपके इलाके में इस व्यापार की माँग '${result.hyper_local_profile?.local_demand || "अच्छी"}' स्तर पर है।`
                    : ` Local demand in your village/area is '${result.hyper_local_profile?.local_demand || "Good"}'.`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Jump Action Cards */}
      <div className="quick-nav-section">
        <h4>{isHi ? "आगे की जानकारी के लिए पेज चुनें:" : "Explore Detailed Pages:"}</h4>
        <div className="quick-jump-grid">
          <button
            type="button"
            className="quick-jump-btn"
            onClick={() => onJumpPage("profit")}
          >
            <div className="jump-text">
              <strong>{isHi ? "कमाई और खर्चा देखें" : "Profit & Money Math"}</strong>
              <span>{isHi ? "बिक्री, खर्च और ब्रेक-ईवन" : "Sales, costs & break-even"}</span>
            </div>
            <span className="jump-arrow">→</span>
          </button>

          <button
            type="button"
            className="quick-jump-btn"
            onClick={() => onJumpPage("loan")}
          >
            <div className="jump-text">
              <strong>{isHi ? "सरकारी लोन व सब्सिडी" : "Govt Loan & Schemes"}</strong>
              <span>{isHi ? "बैंक लोन और आवेदन तरीका" : "Check subsidy & apply steps"}</span>
            </div>
            <span className="jump-arrow">→</span>
          </button>

          <button
            type="button"
            className="quick-jump-btn"
            onClick={() => onJumpPage("emi")}
          >
            <div className="jump-text">
              <strong>{isHi ? "महीने की किश्त (EMI)" : "EMI & Repayment"}</strong>
              <span>{isHi ? "किश्त भरने की क्षमता" : "Schedule & affordability"}</span>
            </div>
            <span className="jump-arrow">→</span>
          </button>

          <button
            type="button"
            className="quick-jump-btn"
            onClick={() => onJumpPage("market")}
          >
            <div className="jump-text">
              <strong>{isHi ? "गाँव का बाज़ार व ग्राहक" : "Local Market & Area"}</strong>
              <span>{isHi ? "ग्राहक दूरी और कम्पटीशन" : "Customer radius & channels"}</span>
            </div>
            <span className="jump-arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
