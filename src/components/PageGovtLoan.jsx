export default function PageGovtLoan({ result, formatCurrency, lang, onJumpPage }) {
  const isHi = lang === "hi";

  const scheme = result.scheme_analysis ?? {};
  const projectCost = scheme.project_cost ?? 0;
  const beneficiaryCont = scheme.beneficiary_contribution ?? 0;
  const eligibleLoan = scheme.eligible_loan ?? 0;
  const interestRate = scheme.interest_rate ?? 7.5;
  const repaymentPeriod = scheme.repayment_period ?? "3 to 7 years";

  return (
    <div className="side-page-content">
      <div className="page-header-banner">
        <div className="page-header-text">
          <span className="page-badge-pill">
            {isHi ? "पेज 04 • सरकारी लोन व योजना" : "Page 04 • Government Loan & Schemes"}
          </span>
          <h2>{scheme.scheme_name || "Government Loan Scheme"}</h2>
          <p className="page-sub-desc">
            {isHi
              ? "आपके द्वारा लगाए गए पैसों के आधार पर चुनी गई सबसे सटीक सरकारी योजना व बैंक सहायता।"
              : "Best-fit government scheme and bank assistance tailored to your initial capital contribution."}
          </p>
        </div>

        <div className="govt-emblem-badge">
          <div>
            <strong>{isHi ? "मान्यता प्राप्त योजना" : "Verified Govt Framework"}</strong>
            <small>{isHi ? "मुद्रा व ग्रामीण क्रेडिट मानक" : "Mudra & Rural Credit Aligned"}</small>
          </div>
        </div>
      </div>

      {/* Financing Breakdown 4-Cards */}
      <div className="loan-breakdown-grid">
        <div className="loan-breakdown-card card-blue">
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

      {/* 4 Simple Steps to Apply */}
      <div className="detail-card">
        <div className="detail-card-head">
          <div>
            <h3>{isHi ? "लोन लेने के 4 आसान चरण (How to Apply)" : "4 Easy Steps to Apply for Bank Loan"}</h3>
            <p>
              {isHi
                ? "गाँव के किसी भी बैंक या जन सेवा केंद्र (CSC) में जाकर इस प्रकार आवेदन करें"
                : "Simple step-by-step procedure at your nearest bank branch or CSC center"}
            </p>
          </div>
        </div>

        <div className="steps-flow-grid">
          <div className="step-card">
            <span className="step-badge">1</span>
            <h4>{isHi ? "कागज़ात तैयार करें" : "Collect Documents"}</h4>
            <p>
              {isHi
                ? "आधार कार्ड, पैन कार्ड, बैंक पासबुक की 6 महीने की कॉपी और गाँव में दुकान/ज़मीन का पता प्रमाण।"
                : "Keep Aadhaar card, PAN card, 6-month bank passbook statement, and address proof ready."}
            </p>
          </div>

          <div className="step-card">
            <span className="step-badge">2</span>
            <h4>{isHi ? "व्यापार पर्चा प्रिंट करें" : "Print Business Report"}</h4>
            <p>
              {isHi
                ? "इस वेबसाइट के 'पर्चा प्रिंट करें' पेज पर जाकर अपने प्रोजेक्ट की रिपोर्ट प्रिंट कर लें।"
                : "Go to the 'Print Report' page on this app and print your detailed project summary."}
            </p>
          </div>

          <div className="step-card">
            <span className="step-badge">3</span>
            <h4>{isHi ? "बैंक मैनेजर से मिलें" : "Visit Bank Branch"}</h4>
            <p>
              {isHi
                ? "अपने नज़दीकी ग्रामीण बैंक या PMEGP/Mudra नोडल बैंक में लोन अधिकारी को यह रिपोर्ट दिखाएं।"
                : "Meet the loan officer at your local Gramin / Public Sector Bank and present this project proposal."}
            </p>
          </div>

          <div className="step-card">
            <span className="step-badge">4</span>
            <h4>{isHi ? "खाते में राशि प्राप्त करें" : "Disbursement & Setup"}</h4>
            <p>
              {isHi
                ? "मंजूरी के बाद लोन राशि सीधे आपके खाते या सामान सप्लायर को ट्रांसफर कर दी जाएगी।"
                : "Upon quick branch verification, the loan funds will be disbursed to your enterprise account."}
            </p>
          </div>
        </div>
      </div>

      {/* Document Checklist */}
      <div className="detail-card">
        <div className="detail-card-head">
          <div>
            <h3>{isHi ? "ज़रूरी कागज़ातों की सूची (Checklist)" : "Required Documents Checklist"}</h3>
            <p>{isHi ? "बैंक जाने से पहले इन्हें ज़रूर साथ रखें" : "Keep these ready before visiting the bank"}</p>
          </div>
        </div>

        <div className="doc-checklist-grid">
          <div className="doc-item">
            <div>
              <strong>{isHi ? "आधार कार्ड (Aadhaar Card)" : "Aadhaar Card"}</strong>
              <p>{isHi ? "पहचान व पते के सत्यापन हेतु" : "For identity & address verification"}</p>
            </div>
          </div>

          <div className="doc-item">
            <div>
              <strong>{isHi ? "पैन कार्ड (PAN Card)" : "PAN Card"}</strong>
              <p>{isHi ? "टैक्स व बैंकिंग रिकॉर्ड हेतु" : "For financial & credit verification"}</p>
            </div>
          </div>

          <div className="doc-item">
            <div>
              <strong>{isHi ? "बैंक पासबुक (Bank Passbook)" : "Bank Passbook Statement"}</strong>
              <p>{isHi ? "पिछले 6 महीने के लेन-देन की कॉपी" : "Last 6 months account transaction record"}</p>
            </div>
          </div>

          <div className="doc-item">
            <div>
              <strong>{isHi ? "दुकान / फार्म का प्रमाण" : "Place / Land Proof"}</strong>
              <p>{isHi ? "किरायानामा या खतौनी / बिजली बिल" : "Electricity bill, rent agreement or village land record"}</p>
            </div>
          </div>

          <div className="doc-item">
            <div>
              <strong>{isHi ? "व्यापार रिपोर्ट (Project Report)" : "Business Project Report"}</strong>
              <p>{isHi ? "हमारी वेबसाइट से प्रिंट किया गया पर्चा" : "Printed copy of this feasibility report"}</p>
            </div>
          </div>

          <div className="doc-item">
            <div>
              <strong>{isHi ? "पासपोर्ट साइज फोटो (2 फोटो)" : "2 Passport Size Photos"}</strong>
              <p>{isHi ? "फॉर्म पर चिपकाने हेतु" : "For application forms & signature card"}</p>
            </div>
          </div>
        </div>
      </div>

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
