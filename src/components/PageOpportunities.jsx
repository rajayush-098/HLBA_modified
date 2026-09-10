export default function PageOpportunities({ result, lang }) {
  const isHi = lang === "hi";

  const opp = result.hyper_local_profile?.opportunity_analysis ?? {};
  const niches = opp.identified_niches ?? [
    "Value-added packaging (e.g. bottled fresh milk, paneer, curd packets)",
    "Home delivery subscription for village teachers & government staff",
    "Seasonal festival bulk packages and weekly haat stalls",
    "Tie-up with local self-help groups (SHGs / Sakhi Mandals)",
  ];
  const evidence = opp.evidence_basis ?? [
    "High daily consumption with lack of hygienic local branded alternatives",
    "Rising disposable income among semi-urban and rural service workers",
    "Local buyers travel 8-10 km to tehsil market for better quality",
  ];
  const localOpps = result.hyper_local_profile?.local_opportunities ?? [];

  return (
    <div className="side-page-content">
      <div className="page-header-banner">
        <div className="page-header-text">
          <span className="page-badge-pill">
            {isHi ? "पेज 07 • नए व्यापारिक मौके" : "Page 07 • New Business Opportunities"}
          </span>
          <h2>{isHi ? "कमाई बढ़ाने के अनूठे मौके" : "Unserved Local Niches & Growth Avenues"}</h2>
          <p className="page-sub-desc">
            {isHi
              ? "गाँव में ऐसे क्षेत्र जहाँ अन्य दुकानदार ध्यान नहीं दे रहे हैं और आप कम खर्चे में ज़्यादा कमा सकते हैं।"
              : "Identified local gaps where customer demand exists but few or no local competitors currently operate."}
          </p>
        </div>

        <div className="govt-emblem-badge">
          <div>
            <strong>{opp.status || "Active Opportunities"}</strong>
            <small>{isHi ? `प्राथमिकता: ${opp.validation_priority || "High"}` : `Priority: ${opp.validation_priority || "High"}`}</small>
          </div>
        </div>
      </div>

      {/* Niches List */}
      <div className="detail-card">
        <div className="detail-card-head">
          <div>
            <h3>{isHi ? "पहचाने गए नए मौके (Candidate Niches)" : "High-Potential Niche Opportunities"}</h3>
            <p>{isHi ? "इन तरीकों से आप अपने साधारण व्यापार को खास बना सकते हैं" : "Smart variations to earn premium margins"}</p>
          </div>
        </div>

        <div className="niches-grid">
          {niches.map((niche, idx) => (
            <div key={idx} className="niche-card">
              <div className="niche-badge">
                <span>मौका #{idx + 1}</span>
              </div>
              <h4>{niche}</h4>
              <p className="niche-tip">
                {isHi
                  ? "कम लागत में शुरू किया जा सकता है और इससे ग्राहकों का नियमित जुड़ाव बनता है।"
                  : "Low incremental setup cost with high recurring customer loyalty."}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Evidence and Local opportunities */}
      <div className="two-column-grid">
        <div className="detail-card">
          <div className="detail-card-head">
            <div>
              <h3>{isHi ? "यह मौका क्यों सही है? (Evidence)" : "Market Evidence & Reasoning"}</h3>
              <p>{isHi ? "ज़मीनी सच्चाई के आधार पर विश्लेषण" : "Ground data backing these opportunities"}</p>
            </div>
          </div>

          <ul className="evidence-list">
            {evidence.map((item, idx) => (
              <li key={idx} className="evidence-item">
                <div>
                  <strong>{item}</strong>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="detail-card">
          <div className="detail-card-head">
            <div>
              <h3>{isHi ? "विस्तार के रास्ते (Growth Areas)" : "Future Expansion Roads"}</h3>
              <p>{isHi ? "व्यापार जमने के बाद आगे क्या करें" : "Next steps once initial business stabilizes"}</p>
            </div>
          </div>

          <ul className="evidence-list">
            {(localOpps.length > 0 ? localOpps : [
              "Supply to nearby school mid-day meal or anganwadi centers",
              "Collaborate with dairy cooperatives or agricultural FPOs",
              "Add complementary daily-use FMCG goods to store inventory",
            ]).map((oppItem, idx) => (
              <li key={idx} className="evidence-item">
                <div>
                  <strong>{oppItem}</strong>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Simple advice box */}
      <div className="village-tip-banner">
        <div>
          <h4>{isHi ? "शुरुआती सलाह:" : "First Step Advice:"}</h4>
          <p>
            {isHi
              ? "पहले मुख्य काम को 3-4 महीने अच्छे से जमा लें। जब नियमित ग्राहक बन जाएं, तब इनमें से 1 या 2 नए मौकों को धीरे-धीरे जोड़ें। एक साथ सारा पैसा न लगाएं।"
              : "Focus on your core product for the first 90 days. Once regular cash flow is steady, test one value-added niche at a time without straining your working capital."}
          </p>
        </div>
      </div>
    </div>
  );
}
