export default function PageReportCard({ result, lang, formatCurrency }) {
  const isHi = lang === "hi";

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const fin = result.financial_analysis ?? {};
  const scheme = result.scheme_analysis ?? {};
  const afford = result.loan_affordability ?? {};

  // Pure deterministic Doc ID based on business name
  const docIdNum = Math.abs(
    (result.business || "ENTERPRISE")
      .split("")
      .reduce((acc, c) => acc + c.charCodeAt(0), 1234) * 53
  ) % 900000 + 100000;
  const docId = `VAI-${docIdNum}`;

  return (
    <div className="side-page-content printable-page">
      <div className="page-header-banner no-print">
        <div className="page-header-text">
          <span className="page-badge-pill">
            {isHi ? "पेज 11 • व्यापार पर्चा व रिपोर्ट" : "Page 11 • Official Project Report Card"}
          </span>
          <h2>{isHi ? "बैंक व पंचायत हेतु व्यापार पर्चा" : "Printable Business Feasibility Dossier"}</h2>
          <p className="page-sub-desc">
            {isHi
              ? "यह पर्चा आप सीधे प्रिंट करके या फोन में सेव करके बैंक मैनेजर या जन सेवा केंद्र में दिखा सकते हैं।"
              : "Formal 1-page project card designed to show to local bank managers, CSC centers, or Gram Panchayat."}
          </p>
        </div>

        <button
          type="button"
          className="print-action-btn"
          onClick={handlePrint}
        >
          {isHi ? "पर्चा प्रिंट करें (Print Parcha)" : "Print / Save PDF Report"}
        </button>
      </div>

      {/* Actual Printable Certificate Card */}
      <div className="parcha-document-container" id="printable-report">
        {/* Document Header */}
        <div className="parcha-header">
          <div className="parcha-header-emblem">
            <div>
              <p className="parcha-govt-sub">
                {isHi ? "ग्रामीण उद्योग संवर्धन मंच • भारत सरकार दिशा-निर्देश" : "Rural Micro-Enterprise Advisory Board • MSME Aligned"}
              </p>
              <h2 className="parcha-title">
                {isHi ? "व्यापार व्यवहार्यता व प्रोजेक्ट रिपोर्ट" : "Micro-Enterprise Feasibility Project Card"}
              </h2>
            </div>
          </div>

          <div className="parcha-meta-box">
            <p>
              <strong>{isHi ? "दिनांक:" : "Date:"}</strong> {today}
            </p>
            <p>
              <strong>{isHi ? "रिपोर्ट सं.:" : "Doc ID:"}</strong> {docId}
            </p>
          </div>
        </div>

        {/* Applicant & Location Table */}
        <div className="parcha-section-title">
          <span>01</span> {isHi ? "उद्यमी व व्यापार की जानकारी" : "Applicant & Proposed Enterprise Details"}
        </div>

        <div className="parcha-info-table">
          <div className="parcha-info-row">
            <span className="col-label">{isHi ? "व्यापार का नाम:" : "Enterprise Name:"}</span>
            <span className="col-val"><strong>{result.business}</strong></span>
            <span className="col-label">{isHi ? "श्रेणी (Category):" : "Sector / Category:"}</span>
            <span className="col-val">{result.category}</span>
          </div>

          <div className="parcha-info-row">
            <span className="col-label">{isHi ? "गाँव / स्थान:" : "Location / Village:"}</span>
            <span className="col-val">{result.location}</span>
            <span className="col-label">{isHi ? "ब्लॉक / तहसील:" : "Block / Tehsil:"}</span>
            <span className="col-val">{result.block}</span>
          </div>

          <div className="parcha-info-row">
            <span className="col-label">{isHi ? "जिला व राज्य:" : "District & State:"}</span>
            <span className="col-val">{result.district}, {result.state}</span>
            <span className="col-label">{isHi ? "व्यवहार्यता स्थिति:" : "Feasibility Status:"}</span>
            <span className={`col-val ${result.colorTheme ? `text-${result.colorTheme}-900` : "text-green"}`}>
              <strong>{result.feasibilityVerdict || result.feasibility}</strong>
            </span>
          </div>
        </div>

        {/* Financial Overview Table */}
        <div className="parcha-section-title">
          <span>02</span> {isHi ? "वित्तीय हिसाब-किताब (Financial Summary)" : "Financial Viability Statement"}
        </div>

        <table className="parcha-table">
          <thead>
            <tr>
              <th>{isHi ? "मद का विवरण" : "Financial Metric"}</th>
              <th>{isHi ? "राशि / मान" : "Calculated Figure"}</th>
              <th>{isHi ? "टिप्पणी" : "Benchmarking Remarks"}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{isHi ? "कुल अनुमानित मासिक बिक्री" : "Expected Monthly Sales (Revenue)"}</td>
              <td><strong>{formatCurrency(fin.monthly_revenue || ((fin.monthly_profit || 0) + (fin.monthly_expenses || 20000)))}</strong></td>
              <td>{isHi ? "गाँव व आस-पास 5 किमी में अनुमानित" : "Based on hyper-local price index"}</td>
            </tr>
            <tr>
              <td>{isHi ? "कुल अनुमानित मासिक खर्च" : "Expected Monthly Operating Costs"}</td>
              <td><strong>{formatCurrency(fin.monthly_expenses || 20000)}</strong></td>
              <td>{isHi ? "कच्चा माल, चारा, किराया व बिजली" : "Includes feed/materials, power & rent"}</td>
            </tr>
            <tr className="row-profit-highlight">
              <td><strong>{isHi ? "शुद्ध मासिक बचत (मुनाफा)" : "Net Monthly In-Pocket Profit"}</strong></td>
              <td className="text-green"><strong>{formatCurrency(fin.monthly_profit)}</strong></td>
              <td><strong>{isHi ? "सारे खर्चे घटाने के बाद शुद्ध लाभ" : "Clean margin retained by promoter"}</strong></td>
            </tr>
            <tr>
              <td>{isHi ? "सालाना अनुमानित कुल मुनाफा" : "Annual Projected Net Savings"}</td>
              <td><strong>{formatCurrency(fin.yearly_profit)}</strong></td>
              <td>{isHi ? "12 महीने का कुल योग" : "12-month accumulated surplus"}</td>
            </tr>
            <tr>
              <td>{isHi ? "वार्षिक रिटर्न ऑन इन्वेस्टमेंट (ROI)" : "Annual Return on Investment (ROI)"}</td>
              <td><strong>{fin.roi_percentage != null ? `${fin.roi_percentage}%` : "N/A"}</strong></td>
              <td>{isHi ? "पूँजी पर प्राप्त होने वाला ब्याज दर" : "Capital efficiency indicator"}</td>
            </tr>
            <tr>
              <td>{isHi ? "मूल पूँजी वापसी अवधि (Payback)" : "Payback Period"}</td>
              <td><strong>{fin.payback_period_months != null ? `${Math.round(fin.payback_period_months)} महीने` : "N/A"}</strong></td>
              <td>{isHi ? "इतने समय में आपकी लागत वापस आ जाएगी" : "Months to recover owner margin"}</td>
            </tr>
          </tbody>
        </table>

        {/* Bank Loan Scheme Table */}
        <div className="parcha-section-title">
          <span>03</span> {isHi ? "बैंक लोन व सरकारी योजना (Bank Credit Recommendation)" : "Bank Financing & Scheme Alignment"}
        </div>

        <table className="parcha-table">
          <tbody>
            <tr>
              <td style={{ width: "35%" }}><strong>{isHi ? "अनुशंसित सरकारी योजना:" : "Recommended Scheme:"}</strong></td>
              <td colSpan="2"><strong>{scheme.scheme_name || "Micro Finance Scheme"}</strong></td>
            </tr>
            <tr>
              <td>{isHi ? "कुल प्रोजेक्ट लागत:" : "Total Project Cost:"}</td>
              <td style={{ width: "30%" }}><strong>{formatCurrency(scheme.project_cost)}</strong></td>
              <td>{isHi ? "मशीनरी, शेड व शुरुआती स्टॉक" : "Initial capital expenditure & working fund"}</td>
            </tr>
            <tr>
              <td>{isHi ? "उद्यमी का अंशदान (10% Margin):" : "Promoter Contribution (Margin):"}</td>
              <td><strong>{formatCurrency(scheme.beneficiary_contribution)}</strong></td>
              <td>{isHi ? "आवेदक द्वारा स्वयं लगाई जाने वाली राशि" : "Self-financed owner margin capital"}</td>
            </tr>
            <tr>
              <td>{isHi ? "पात्र बैंक लोन राशि (90%):" : "Eligible Bank Loan Component:"}</td>
              <td className="text-green"><strong>{formatCurrency(scheme.eligible_loan)}</strong></td>
              <td>{isHi ? "बैंक द्वारा देय ऋण राशि" : "Bank term credit eligible"}</td>
            </tr>
            <tr>
              <td>{isHi ? "अनुमानित मासिक किश्त (EMI):" : "Estimated Monthly EMI:"}</td>
              <td className="text-green"><strong>{formatCurrency(afford.monthly_emi)}</strong></td>
              <td>{afford.affordability_status || "Affordable"} ({isHi ? "मुनाफे से आसानी से भर सकते हैं" : "Safe debt-service ratio"})</td>
            </tr>
            <tr>
              <td>{isHi ? "ब्याज दर व ग्रेस पीरियड:" : "Interest Rate & Moratorium:"}</td>
              <td><strong>{scheme.interest_rate || 7.5}% p.a.</strong></td>
              <td>{afford.moratorium_months || 3} {isHi ? "महीने की छूट अवधि" : "Months moratorium period"}</td>
            </tr>
          </tbody>
        </table>

        {/* Local Market Advisory Summary */}
        {(result.market_summary || result.feasibility_report) && (
          <div className="parcha-feasibility-report" style={{ marginTop: "16px", padding: "14px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "700", color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#2563eb" }}></span>
              {isHi ? "स्थानीय बाज़ार सलाह (Market Summary)" : "Local Market Advisory Summary"}
            </h4>
            <div style={{ fontSize: "12.5px", lineHeight: "1.6", color: "#334155" }}>
              {result.market_summary || result.feasibility_report}
            </div>
          </div>
        )}

        {/* Signatures and Stamp area */}
        <div className="parcha-signatures-grid">
          <div className="sign-box">
            <p className="sign-title">{isHi ? "उद्यमी / आवेदक के हस्ताक्षर" : "Applicant / Promoter Signature"}</p>
            <div className="sign-line" />
            <p className="sign-name">{result.business}</p>
          </div>

          <div className="stamp-box">
            <div className="stamp-circle">
              <span>Vyapaa₹ AI</span>
              <strong>VERIFIED</strong>
              <small>Rural Hub</small>
            </div>
          </div>

          <div className="sign-box">
            <p className="sign-title">{isHi ? "बैंक अधिकारी / शाखा प्रबंधक" : "Branch Manager / Credit Officer"}</p>
            <div className="sign-line" />
            <p className="sign-name">{isHi ? "हस्ताक्षर व शाखा मोहर" : "Signature & Seal"}</p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="parcha-doc-footer">
          <p>
            {isHi
              ? "यह पर्चा Vyapaa₹ AI द्वारा तैयार किया गया है। यह एमएसएमई व मुद्रा लोन दिशा-निर्देशों के अनुरूप अनुमानित वित्तीय गणना दर्शाता है।"
              : "Computer-generated feasibility dossier generated via Vyapaa₹ AI. Aligned with PMEGP & Mudra financing parameters."}
          </p>
        </div>
      </div>

      {/* Print Button at bottom as well */}
      <div className="parcha-bottom-actions no-print">
        <button
          type="button"
          className="print-action-btn"
          onClick={handlePrint}
        >
          {isHi ? "पर्चा प्रिंट करें (Print This Page)" : "Print Business Parcha Now"}
        </button>
      </div>
    </div>
  );
}
