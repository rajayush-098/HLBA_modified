export default function PageRisk({ result, lang }) {
  const isHi = lang === "hi";

  const risk = result.risk_analysis ?? {};
  const score = risk.risk_score ?? 25;
  const level = risk.overall_risk_level || risk.risk_level || "Low";
  const finRisk = risk.financial_risk || result.advanced_financial_analysis?.financial_risk || "Low";
  const mktRisk = risk.market_risk || result.hyper_local_profile?.competition_level || "Moderate";

  const factors = risk.risk_factors ?? [
    "Vulnerability to input feed or raw material price increases",
    "Seasonal drop in footfall during peak harvest or monsoon weeks",
    "High dependence on key repeat village customers",
  ];

  const recommendations = risk.risk_recommendations ?? [
    "Maintain a cash reserve equivalent to at least 1-2 months of operational expenses.",
    "Form relationships with at least 2 alternate wholesale suppliers to avoid supply squeeze.",
    "Limit informal customer credit (udhaar) and encourage UPI / digital instant payments.",
  ];

  const isSafe = score <= 35 || level.toLowerCase().includes("low");

  return (
    <div className="side-page-content">
      <div className="page-header-banner">
        <div className="page-header-text">
          <span className="page-badge-pill">
            {isHi ? "पेज 09 • खतरा व सुरक्षा गाइड" : "Page 09 • Risk & Safety Guide"}
          </span>
          <h2>{isHi ? "व्यापार की सुरक्षा व जोखिम मीटर" : "Risk Assessment & Loss Prevention"}</h2>
          <p className="page-sub-desc">
            {isHi
              ? "यह जांचें कि आपके व्यापार में नुकसान होने की कितनी संभावना है और किन सावधानियों से नुकसान से बचा जा सकता है।"
              : "Clear audit of operational risks, financial safety buffers, and practical ways to protect your capital."}
          </p>
        </div>

        <div className={`status-hero-tag ${isSafe ? "positive" : "warning"}`}>
          <div>
            <strong>
              {isSafe
                ? isHi
                  ? "कम जोखिम - सुरक्षित व्यापार (Low Risk)"
                  : "Low Risk - Safe Proposition"
                : isHi
                ? "मध्यम जोखिम - संभल कर चलें (Moderate Risk)"
                : "Moderate Risk - Caution Advised"}
            </strong>
            <p>
              {isSafe
                ? isHi
                  ? "मुनाफा और खर्चे का संतुलन अच्छा है।"
                  : "Balanced operational margin with manageable downside."
                : isHi
                ? "खर्चे और बिक्री पर नियमित निगरानी रखें।"
                : "Tight control required over monthly operational costs."}
            </p>
          </div>
        </div>
      </div>

      {/* 4 Risk KPI Cards */}
      <div className="kpi-hero-grid">
        <div className={`kpi-hero-card ${isSafe ? "kpi-green" : "kpi-amber"}`}>
          <div className="kpi-top">
            <span className="kpi-tag">{isHi ? "स्कोर" : "Risk Score"}</span>
          </div>
          <p className="kpi-label">{isHi ? "कुल जोखिम स्कोर" : "Overall Risk Index"}</p>
          <h3 className="kpi-value">{score}/100</h3>
          <p className="kpi-hint">
            {isHi ? "जितना कम स्कोर, उतना ज़्यादा सुरक्षित व्यापार" : "Lower number means safer enterprise"}
          </p>
        </div>

        <div className="kpi-hero-card kpi-blue">
          <div className="kpi-top">
            <span className="kpi-tag">{isHi ? "स्तर" : "Risk Level"}</span>
          </div>
          <p className="kpi-label">{isHi ? "जोखिम का स्तर" : "Primary Risk Level"}</p>
          <h3 className="kpi-value">
            {level === "Low" ? (isHi ? "कम (Low)" : "Low") : level}
          </h3>
          <p className="kpi-hint">
            {isHi ? "वर्तमान आंकड़ों के अनुसार स्तर" : "Assessed from revenue vs fixed obligations"}
          </p>
        </div>

        <div className="kpi-hero-card kpi-purple">
          <div className="kpi-top">
            <span className="kpi-tag">{isHi ? "वित्तीय" : "Financial"}</span>
          </div>
          <p className="kpi-label">{isHi ? "पैसे का जोखिम (Financial)" : "Financial Stress Risk"}</p>
          <h3 className="kpi-value">
            {finRisk === "Low" ? (isHi ? "कम (Low)" : "Low") : finRisk}
          </h3>
          <p className="kpi-hint">
            {isHi ? "किश्त और खर्च भरने में खतरा" : "Likelihood of repayment strain"}
          </p>
        </div>

        <div className="kpi-hero-card kpi-amber">
          <div className="kpi-top">
            <span className="kpi-tag">{isHi ? "बाज़ार" : "Market"}</span>
          </div>
          <p className="kpi-label">{isHi ? "बाज़ार का जोखिम (Market)" : "Market & Demand Risk"}</p>
          <h3 className="kpi-value">
            {mktRisk === "Moderate" ? (isHi ? "मध्यम (Moderate)" : "Moderate") : mktRisk}
          </h3>
          <p className="kpi-hint">
            {isHi ? "प्रतिद्वंदियों व ग्राहक पसंद का असर" : "Competition and customer churn impact"}
          </p>
        </div>
      </div>

      {/* Visual Risk Gauge Meter */}
      <div className="detail-card">
        <div className="detail-card-head">
          <div>
            <h3>{isHi ? "सुरक्षा थर्मामीटर (Risk Meter)" : "Enterprise Safety Gauge"}</h3>
            <p>{isHi ? "देखें कि आपका व्यापार किस जोन में आता है" : "Visual safety zone classification"}</p>
          </div>
        </div>

        <div className="meter-container">
          <div className="meter-info-row">
            <span>
              {isHi ? "वर्तमान रिस्क स्कोर:" : "Calculated Risk Score:"}{" "}
              <strong>{score}/100</strong>
            </span>
            <span className={isSafe ? "tag-green" : "tag-amber"}>
              {isSafe
                ? isHi
                  ? "सुरक्षित जोन (Green Safe Zone)"
                  : "Safe & Protected Zone"
                : isHi
                ? "मध्यम जोन (Caution Zone)"
                : "Caution Zone"}
            </span>
          </div>

          <div className="progress-track" style={{ height: "16px" }}>
            <div
              className={`progress-fill ${isSafe ? "green" : "amber"}`}
              style={{ width: `${Math.min(100, Math.max(8, score))}%` }}
            />
          </div>

          <div className="meter-scale-markers">
            <span className="text-green">0-35: सुरक्षित (Safe)</span>
            <span className="text-amber">36-65: मध्यम (Moderate)</span>
            <span className="text-red">66-100: जोखिम भरा (High Risk)</span>
          </div>
        </div>
      </div>

      {/* Risk factors vs Recommendations */}
      <div className="two-column-grid">
        <div className="detail-card">
          <div className="detail-card-head">
            <div>
              <h3>{isHi ? "मुख्य खतरे (Key Risk Factors)" : "Primary Risk Factors"}</h3>
              <p>{isHi ? "इन बातों पर विशेष ध्यान देने की जरूरत है" : "Specific elements that could cause friction"}</p>
            </div>
          </div>

          <ul className="channel-list">
            {factors.map((item, idx) => (
              <li key={idx} className="channel-item">
                <span className="ch-num ch-amber">{idx + 1}</span>
                <div>
                  <strong>{item}</strong>
                  <p>
                    {isHi
                      ? "इसके लिए पहले से सतर्क रहें और अतिरिक्त स्टॉक या बैकअप तैयार रखें।"
                      : "Prepare proactive countermeasures before launching operations."}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="detail-card">
          <div className="detail-card-head">
            <div>
              <h3>{isHi ? "बचाव के उपाय (Safety Steps)" : "Protective Recommendations"}</h3>
              <p>{isHi ? "नुकसान से बचने के लिए क्या करें" : "Proven actions to safeguard your enterprise"}</p>
            </div>
          </div>

          <ul className="channel-list">
            {recommendations.map((item, idx) => (
              <li key={idx} className="channel-item">
                <span className="ch-num ch-green">{idx + 1}</span>
                <div>
                  <strong>{item}</strong>
                  <p>
                    {isHi
                      ? "यह नियम अपनाने से आपका व्यापार हर मौसम में सुरक्षित रहेगा।"
                      : "Strict adherence protects working capital during slow seasons."}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Emergency fund tip */}
      <div className="village-tip-banner">
        <div>
          <h4>{isHi ? "आपातकालीन तिजोरी नियम (Emergency Cash Buffer):" : "Emergency Reserve Rule:"}</h4>
          <p>
            {isHi
              ? "हर महीने मुनाफे का 10% हिस्सा अलग बैंक खाते या गुल्लक में 'आपातकालीन फंड' के रूप में रखें। जब कभी मंदी, बीमारी या मशीन में खराबी आए, तो आपको किसी साहूकार से ब्याज पर कर्ज नहीं लेना पड़ेगा।"
              : "Always retain 10% of monthly profit in a separate savings account as an emergency buffer. If a machine breaks down or sales dip during heavy monsoons, you will never need high-interest local private loans."}
          </p>
        </div>
      </div>
    </div>
  );
}
