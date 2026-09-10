export default function PageEmi({ result, formatCurrency, lang }) {
  const isHi = lang === "hi";

  const loanAfford = result.loan_affordability ?? {};
  const monthlyEmi = loanAfford.monthly_emi ?? 0;
  const tenureMonths = loanAfford.loan_tenure_months ?? 36;
  const totalInterest = loanAfford.total_interest ?? 0;
  const emiRatio = loanAfford.emi_to_income_ratio ?? 0;
  const status = loanAfford.affordability_status ?? "Affordable";
  const moratorium = loanAfford.moratorium_months ?? 3;
  const schedule = loanAfford.quarterly_repayment_schedule ?? [];

  const isAffordable = status === "Affordable" || emiRatio < 40;

  return (
    <div className="side-page-content">
      <div className="page-header-banner">
        <div className="page-header-text">
          <span className="page-badge-pill">
            {isHi ? "पेज 05 • महीने की किश्त (EMI)" : "Page 05 • Monthly EMI & Loan Schedule"}
          </span>
          <h2>{isHi ? "लोन चुकाने का आसान प्लान" : "Loan Repayment & EMI Breakdown"}</h2>
          <p className="page-sub-desc">
            {isHi
              ? "हर महीने बैंक को कितनी किश्त देनी होगी और क्या आपका मुनाफा इस किश्त को आसानी से संभाल सकता है।"
              : "Clear calculation of your monthly installment, interest cost, and repayment schedule."}
          </p>
        </div>

        <div className={`status-hero-tag ${isAffordable ? "positive" : "warning"}`}>
          <div>
            <strong>
              {isAffordable
                ? isHi
                  ? "किश्त भरना आसान व सुरक्षित है"
                  : "Comfortable & Affordable EMI"
                : isHi
                ? "किश्त पर नजर रखें"
                : "Manage EMI with Care"}
            </strong>
            <p>
              {isHi
                ? `आपकी कमाई का केवल ${emiRatio}% हिस्सा किश्त में जाएगा।`
                : `Only ${emiRatio}% of your net earnings is required for EMI.`}
            </p>
          </div>
        </div>
      </div>

      {/* Big EMI Highlight Cards */}
      <div className="kpi-hero-grid">
        <div className="kpi-hero-card kpi-green">
          <div className="kpi-top">
            <span className="kpi-tag">{isHi ? "हर माह देय" : "Monthly Due"}</span>
          </div>
          <p className="kpi-label">{isHi ? "महीने की किश्त (EMI)" : "Estimated Monthly EMI"}</p>
          <h3 className="kpi-value text-green">{formatCurrency(monthlyEmi)}</h3>
          <p className="kpi-hint">
            {isHi ? "प्रति माह बैंक में जमा करने योग्य राशि" : "Fixed installment per month"}
          </p>
        </div>

        <div className="kpi-hero-card kpi-blue">
          <div className="kpi-top">
            <span className="kpi-tag">{isHi ? "कुल अवधि" : "Loan Term"}</span>
          </div>
          <p className="kpi-label">{isHi ? "लोन चुकाने का समय" : "Total Repayment Tenure"}</p>
          <h3 className="kpi-value">
            {tenureMonths} {isHi ? "महीने" : "Months"} ({Math.round(tenureMonths / 12)} {isHi ? "साल" : "Years"})
          </h3>
          <p className="kpi-hint">
            {isHi ? "इतने समय में पूरा कर्ज चुकता हो जाएगा" : "Total duration until loan is 100% paid off"}
          </p>
        </div>

        <div className="kpi-hero-card kpi-amber">
          <div className="kpi-top">
            <span className="kpi-tag">{isHi ? "ब्याज लागत" : "Interest Cost"}</span>
          </div>
          <p className="kpi-label">{isHi ? "कुल ब्याज (Total Interest)" : "Total Interest Paid"}</p>
          <h3 className="kpi-value">{formatCurrency(totalInterest)}</h3>
          <p className="kpi-hint">
            {isHi ? "पूरी अवधि में कुल अतिरिक्त ब्याज" : "Cost of credit across the entire loan period"}
          </p>
        </div>

        <div className="kpi-hero-card kpi-purple">
          <div className="kpi-top">
            <span className="kpi-tag">{isHi ? "छूट अवधि" : "Moratorium"}</span>
          </div>
          <p className="kpi-label">{isHi ? "शुरुआती ग्रेस पीरियड" : "Grace / Moratorium Period"}</p>
          <h3 className="kpi-value">
            {moratorium} {isHi ? "महीने" : "Months"}
          </h3>
          <p className="kpi-hint">
            {isHi
              ? "शुरुआत के इन महीनों में मूलधन की किश्त नहीं देनी होती"
              : "Initial grace period before regular principal repayment"}
          </p>
        </div>
      </div>

      {/* EMI Safety Gauge */}
      <div className="detail-card">
        <div className="detail-card-head">
          <div>
            <h3>{isHi ? "किश्त सुरक्षा मीटर (EMI Affordability)" : "EMI Affordability Meter"}</h3>
            <p>
              {isHi
                ? "यह बताता है कि आपकी बचत में से कितना हिस्सा किश्त में जा रहा है।"
                : "Proportion of your income used to service the monthly installment."}
            </p>
          </div>
        </div>

        <div className="meter-container">
          <div className="meter-info-row">
            <span>
              {isHi ? "कमाई पर किश्त का भार:" : "EMI to Profit Burden:"}{" "}
              <strong>{emiRatio}%</strong>
            </span>
            <span className={emiRatio <= 30 ? "tag-green" : emiRatio <= 50 ? "tag-amber" : "tag-red"}>
              {emiRatio <= 30
                ? isHi
                  ? "बहुत सुरक्षित (Very Safe)"
                  : "Very Safe & Light"
                : emiRatio <= 50
                ? isHi
                  ? "सामान्य (Manageable)"
                  : "Manageable"
                : isHi
                ? "भारी किश्त (High Burden)"
                : "High Burden"}
            </span>
          </div>

          <div className="progress-track" style={{ height: "14px" }}>
            <div
              className={`progress-fill ${
                emiRatio <= 30 ? "green" : emiRatio <= 50 ? "amber" : "red"
              }`}
              style={{ width: `${Math.min(100, Math.max(5, emiRatio))}%` }}
            />
          </div>

          <div className="meter-scale-markers">
            <span>0% (आसान / Easy)</span>
            <span>30% (सुरक्षित सीमा / Safe)</span>
            <span>50% (अधिकतम / Upper Limit)</span>
            <span>100%</span>
          </div>
        </div>

        <p className="meter-explanation">
          {loanAfford.affordability_message ||
            (isHi
              ? "आपकी शुद्ध मासिक बचत किश्त से काफी अधिक है, इसलिए आप बैंक को समय पर किश्त चुकाने में पूरी तरह सक्षम हैं।"
              : "Your net monthly profit comfortably exceeds the EMI obligation, giving you ample safety margin.")}
        </p>
      </div>

      {/* Full Quarterly Repayment Schedule Table */}
      <div className="detail-card">
        <div className="detail-card-head">
          <div>
            <h3>{isHi ? "तिमाही किश्त सारणी (Repayment Schedule)" : "Quarterly Repayment Schedule"}</h3>
            <p>
              {isHi
                ? "हर 3 महीने (तिमाही) के अनुसार किश्त, ब्याज और बचा हुआ लोन देखें"
                : "Quarter-by-quarter breakdown of installment, interest, and outstanding principal"}
            </p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>{isHi ? "तिमाही (Quarter)" : "Quarter"}</th>
                <th>{isHi ? "महीने (Months)" : "Months"}</th>
                <th>{isHi ? "दौर (Phase)" : "Phase"}</th>
                <th>{isHi ? "कुल किश्त (EMI)" : "Total EMI"}</th>
                <th>{isHi ? "ब्याज (Interest)" : "Interest Part"}</th>
                <th>{isHi ? "मूलधन (Principal)" : "Principal Part"}</th>
                <th>{isHi ? "बाकी लोन (Outstanding)" : "Balance Left"}</th>
              </tr>
            </thead>
            <tbody>
              {schedule.length > 0 ? (
                schedule.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <strong>{item.quarter}</strong>
                    </td>
                    <td>{item.months}</td>
                    <td>
                      <span
                        className={`pill-badge ${
                          item.phase?.includes("Moratorium") ? "pill-amber" : "pill-green"
                        }`}
                      >
                        {item.phase}
                      </span>
                    </td>
                    <td className="text-green">
                      <strong>{formatCurrency(item.emi_total)}</strong>
                    </td>
                    <td>{formatCurrency(item.interest_total)}</td>
                    <td>{formatCurrency(item.principal_total)}</td>
                    <td>{formatCurrency(item.outstanding_principal)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center">
                    {isHi
                      ? "किश्त सारणी उपलब्ध नहीं है।"
                      : "No quarterly repayment schedule available."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
