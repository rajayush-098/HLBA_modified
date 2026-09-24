export default function PageGovtLoan({ result, formatCurrency, lang, onJumpPage }) {
  const isHi = lang === "hi";

  const scheme = result.scheme_analysis ?? {};
  const matchedScheme = result.matched_scheme ?? {};
  const projectCost = scheme.project_cost ?? 0;
  const beneficiaryCont = scheme.beneficiary_contribution ?? 0;
  const eligibleLoan = scheme.eligible_loan ?? 0;
  const interestRate = scheme.interest_rate ?? (matchedScheme.loan?.interest_rate != null ? matchedScheme.loan.interest_rate : 9);
  const repaymentPeriod = scheme.repayment_period ?? matchedScheme.loan?.repayment ?? "3 to 7 years";

  const schemeName = matchedScheme.scheme_name || scheme.scheme_name || "Government Loan Scheme";
  const schemeCategory = matchedScheme.category || result.category || "Micro Enterprise Credit";

  const applicationSteps =
    Array.isArray(matchedScheme.application_steps) && matchedScheme.application_steps.length > 0
      ? matchedScheme.application_steps
      : [
          "Prepare business/project information and feasibility report",
          "Submit application with KYC documents to eligible Member Lending Institution",
          "Undergo lender appraisal and field verification",
          "Loan sanction and fund disbursement to enterprise account",
        ];

  const documents =
    Array.isArray(matchedScheme.documents) && matchedScheme.documents.length > 0
      ? matchedScheme.documents
      : [
          "Aadhaar Card (Identity & address verification)",
          "PAN Card (Financial verification)",
          "Bank passbook statement (Last 6 months)",
          "Business Project Report / Feasibility Parcha",
          "Business premises / place proof",
          "Passport size photographs",
        ];

  // Check if matched_scheme.loan.loan_categories exists and match the user's tier
  const getMatchedTier = () => {
    const categories = matchedScheme?.loan?.loan_categories;
    if (!Array.isArray(categories) || categories.length === 0) return null;

    // Use eligible loan amount, falling back to beneficiary margin or project cost
    const amount = eligibleLoan > 0 ? eligibleLoan : (beneficiaryCont || projectCost || 0);

    // 1. Check for min/max category format (e.g., Shishu, Kishore, Tarun, Tarun Plus in MUDRA)
    const minMaxMatch = categories.find((cat) => {
      const min = cat.min !== undefined ? cat.min : 0;
      const max = cat.max !== undefined ? cat.max : Infinity;
      return amount >= min && amount <= max;
    });

    if (minMaxMatch) {
      return {
        name: minMaxMatch.category || minMaxMatch.name || "Standard",
        min: minMaxMatch.min,
        max: minMaxMatch.max,
        specialCondition: minMaxMatch.special_condition,
      };
    }

    // 2. Check for stage/amount format (e.g., PM SVANidhi Stage 1, 2, 3)
    const stageMatch = categories.find((cat) => amount <= (cat.amount || Infinity));
    if (stageMatch) {
      return {
        name: `Stage ${stageMatch.stage || 1} (Up to ₹${(stageMatch.amount || 0).toLocaleString("en-IN")})`,
        amount: stageMatch.amount,
      };
    }

    // Default to the last category tier if amount exceeds the highest range
    const lastCat = categories[categories.length - 1];
    return {
      name: lastCat.category || `Stage ${lastCat.stage || categories.length}`,
      min: lastCat.min,
      max: lastCat.max,
      specialCondition: lastCat.special_condition,
    };
  };

  const matchedTier = getMatchedTier();

  return (
    <div className="side-page-content">
      <div className="page-header-banner">
        <div className="page-header-text">
          <span className="page-badge-pill">
            {isHi ? "पेज 04 • सरकारी लोन व योजना" : "Page 04 • Government Loan & Schemes"}
          </span>
          <h2>{schemeName}</h2>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "8px", flexWrap: "wrap" }}>
            <span
              className="pill-badge pill-green"
              style={{ fontSize: "13px", padding: "4px 10px", fontWeight: "600" }}
            >
              {schemeCategory}
            </span>
            {matchedTier && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "13px",
                  fontWeight: "700",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  backgroundColor: "#eff6ff",
                  color: "#1d4ed8",
                  border: "1px solid #bfdbfe",
                }}
              >
                ★ {isHi ? `योजना श्रेणी: ${matchedTier.name}` : `Matched Tier: ${matchedTier.name}`}
              </span>
            )}
            {matchedScheme.ministry && (
              <span style={{ fontSize: "13px", color: "#475569" }}>
                • {matchedScheme.ministry}
              </span>
            )}
            {matchedScheme.implementing_agency && (
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                ({matchedScheme.implementing_agency})
              </span>
            )}
          </div>
          <p className="page-sub-desc" style={{ marginTop: "10px" }}>
            {isHi
              ? "आपके द्वारा लगाए गए पैसों और व्यापार श्रेणी के आधार पर चुनी गई सबसे सटीक सरकारी योजना व बैंक सहायता।"
              : "Best-fit government scheme and bank assistance tailored to your business category and capital contribution."}
          </p>
        </div>

        <div className="govt-emblem-badge">
          <div>
            <strong>{matchedScheme.short_name || (isHi ? "मान्यता प्राप्त योजना" : "Verified Govt Scheme")}</strong>
            {matchedTier && (
              <div
                style={{
                  display: "inline-block",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  marginTop: "4px",
                  marginBottom: "2px",
                  letterSpacing: "0.3px",
                }}
              >
                {isHi ? `श्रेणी: ${matchedTier.name}` : `Matched Tier: ${matchedTier.name}`}
              </div>
            )}
            <small>
              {matchedScheme.government_level
                ? `${matchedScheme.government_level} Government`
                : isHi
                ? "केंद्रीय सरकारी योजना"
                : "Central Government Scheme"}
            </small>
          </div>
        </div>
      </div>

      {/* Financing Breakdown 4-Cards */}
      <div className="loan-breakdown-grid">
        <div className="loan-breakdown-card card-blue" style={{ position: "relative" }}>
          {matchedTier && (
            <span
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                backgroundColor: "#dbeafe",
                color: "#1d4ed8",
                fontSize: "11px",
                fontWeight: "700",
                padding: "2px 8px",
                borderRadius: "10px",
                border: "1px solid #bfdbfe",
              }}
            >
              {isHi ? `श्रेणी: ${matchedTier.name}` : `Tier: ${matchedTier.name}`}
            </span>
          )}
          <p className="breakdown-label">
            {isHi ? "कुल प्रोजेक्ट लागत (Total Cost)" : "Total Project Cost"}
          </p>
          <h3 className="breakdown-value">{formatCurrency(projectCost)}</h3>
          <p className="breakdown-sub">
            {isHi ? "व्यापार को पूरी तरह शुरू करने की लागत" : "Full capital required for machinery & setup"}
          </p>
        </div>

        <div className="loan-breakdown-card card-amber">
          <p className="breakdown-label">
            {isHi ? "आपका हिस्सा / मार्जिन (10%)" : "Your Contribution (Margin 10%)"}
          </p>
          <h3 className="breakdown-value">{formatCurrency(beneficiaryCont)}</h3>
          <p className="breakdown-sub">
            {isHi ? "यह पैसा आपको अपनी जेब से लगाना होगा" : "Cash or savings you provide as owner margin"}
          </p>
        </div>

        <div className="loan-breakdown-card card-green">
          <p className="breakdown-label">
            {isHi ? "बैंक से मिलने योग्य लोन (Eligible Loan)" : "Eligible Bank Loan (Up to 90%)"}
          </p>
          <h3 className="breakdown-value text-green">{formatCurrency(eligibleLoan)}</h3>
          <p className="breakdown-sub">
            {isHi ? "बैंक या वित्तीय संस्थान द्वारा स्वीकृत राशि" : "Maximum loan granted by bank under scheme"}
          </p>
        </div>

        <div className="loan-breakdown-card card-purple">
          <p className="breakdown-label">
            {isHi ? "ब्याज दर व अवधि" : "Interest Rate & Tenure"}
          </p>
          <h3 className="breakdown-value">{interestRate}% p.a.</h3>
          <p className="breakdown-sub">{repaymentPeriod}</p>
        </div>
      </div>

      {/* Dynamic Step-by-Step Guide */}
      <div className="detail-card">
        <div className="detail-card-head">
          <div>
            <h3>
              {isHi
                ? `आवेदन के चरण (${applicationSteps.length} Steps to Apply)`
                : `Application Procedure (${applicationSteps.length} Steps)`}
            </h3>
            <p>
              {isHi
                ? "योजना के तहत लोन और सहायता प्राप्त करने की क्रमबद्ध प्रक्रिया"
                : "Official step-by-step procedure to apply for credit and subsidies under this scheme"}
            </p>
          </div>
        </div>

        <div className="steps-flow-grid">
          {applicationSteps.map((step, idx) => (
            <div key={idx} className="step-card">
              <span className="step-badge">{idx + 1}</span>
              <h4>{isHi ? `चरण ${idx + 1}` : `Step ${idx + 1}`}</h4>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Document Checklist */}
      <div className="detail-card">
        <div className="detail-card-head">
          <div>
            <h3>
              {isHi
                ? `ज़रूरी कागज़ातों की सूची (${documents.length} Checklist)`
                : `Required Documents Checklist (${documents.length} Items)`}
            </h3>
            <p>
              {isHi
                ? "बैंक जाने या ऑनलाइन आवेदन से पहले ये दस्तावेज़ ज़रूर तैयार रखें"
                : "Official document checklist required by financing institutions for this scheme"}
            </p>
          </div>
        </div>

        <div className="doc-checklist-grid">
          {documents.map((doc, idx) => (
            <div key={idx} className="doc-item">
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  backgroundColor: "#dcfce7",
                  color: "#15803d",
                  fontSize: "13px",
                  fontWeight: "700",
                  marginRight: "10px",
                  flexShrink: 0,
                }}
              >
                ✓
              </span>
              <div>
                <strong>{doc}</strong>
                <p>
                  {isHi
                    ? "सत्यापन एवं बैंक लोन प्रोसेसिंग हेतु आवश्यक"
                    : "Required for identity, eligibility & bank appraisal"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Official Source Link */}
      {matchedScheme.official_source && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px 18px",
            backgroundColor: "#f8fafc",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            fontSize: "13px",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div>
            <span>{isHi ? "आधिकारिक स्रोत: " : "Official Source: "}</span>
            <strong style={{ color: "#1e293b" }}>{matchedScheme.official_source.organization}</strong>
          </div>
          {matchedScheme.official_source.url && (
            <a
              href={matchedScheme.official_source.url}
              target="_blank"
              rel="noreferrer"
              style={{ color: "#2563eb", fontWeight: "600", textDecoration: "underline" }}
            >
              {isHi ? "आधिकारिक पोर्टल देखें →" : "Visit Official Portal →"}
            </a>
          )}
        </div>
      )}

      {/* Button to jump to EMI page */}
      <div className="page-action-callout">
        <div>
          <h4>{isHi ? "जानना चाहते हैं महीने की किश्त कितनी आएगी?" : "Want to check your monthly EMI?"}</h4>
          <p>
            {isHi
              ? "देखें कि लोन चुकाने के लिए हर महीने कितनी किश्त भरनी होगी और क्या आपका मुनाफा इसके लिए पर्याप्त है।"
              : "Review repayment affordability and verify that your monthly profit easily covers the EMI."}
          </p>
        </div>
        <button
          type="button"
          className="callout-action-btn"
          onClick={() => onJumpPage("emi")}
        >
          {isHi ? "किश्त व ईएमआई देखें →" : "Check EMI & Schedule →"}
        </button>
      </div>
    </div>
  );
}
