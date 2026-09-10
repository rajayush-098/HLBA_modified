export default function PageSwot({ result, lang, formatCurrency }) {
  const isHi = lang === "hi";

  const swot = result.hyper_local_profile?.swot_analysis ?? {};
  const strengths = swot.strengths ?? [
    "Direct personal relationship with village community & elders",
    "Lower fixed overhead expenses compared to urban establishments",
    "Availability of local raw materials within walking distance",
  ];
  const weaknesses = swot.weaknesses ?? [
    "Limited initial cash reserve for unexpected equipment breakdown",
    "Reliance on seasonal agricultural harvest payment cycles",
    "Limited formal bookkeeping or computer invoice systems",
  ];
  const opportunities = swot.opportunities ?? [
    "Expanding to adjacent gram panchayats through weekly haats",
    "Tapping government subsidy programs (PMEGP / Mudra / KCC)",
    "Bundling complementary products for village families",
  ];
  const threats = swot.threats ?? [
    "Sudden price inflation in input raw materials / animal feed",
    "Weather interruptions or localized power cuts",
    "Credit demands (udhaar) from relatives and neighbors",
  ];

  const marginCap = swot.budget_context?.available_margin_capital;

  return (
    <div className="side-page-content">
      <div className="page-header-banner">
        <div className="page-header-text">
          <span className="page-badge-pill">
            {isHi ? "पेज 08 • ताकत और कमज़ोरी (SWOT)" : "Page 08 • Strengths, Weaknesses, Opportunities & Threats"}
          </span>
          <h2>{isHi ? "व्यापार की असली ताकत व सावधानियाँ" : "SWOT Analysis for Micro-Enterprise"}</h2>
          <p className="page-sub-desc">
            {isHi
              ? "जानिए आपकी मजबूत बातें क्या हैं और किन कमज़ोरियों पर पहले से सतर्क रहना है।"
              : "Clear audit of your business advantages, internal gaps, market opportunities, and external risks."}
          </p>
        </div>

        {marginCap != null && (
          <div className="govt-emblem-badge">
            <div>
              <strong>{isHi ? "पूँजी संदर्भ" : "Capital Baseline"}</strong>
              <small>{formatCurrency(marginCap)} {isHi ? "मार्जिन" : "Margin"}</small>
            </div>
          </div>
        )}
      </div>

      {/* 4 Big SWOT Cards Grid */}
      <div className="swot-cards-grid">
        {/* STRENGTHS */}
        <div className="swot-card swot-strengths">
          <div className="swot-card-head">
            <div>
              <h3>{isHi ? "ताकत (Strengths)" : "Strengths (Your Advantages)"}</h3>
              <p>{isHi ? "आपकी खासियत जो आपको आगे रखेगी" : "Key assets & local advantages"}</p>
            </div>
          </div>
          <ul className="swot-list">
            {strengths.map((item, idx) => (
              <li key={idx} className="swot-item">
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* WEAKNESSES */}
        <div className="swot-card swot-weaknesses">
          <div className="swot-card-head">
            <div>
              <h3>{isHi ? "कमज़ोरी (Weaknesses)" : "Weaknesses (Areas to Improve)"}</h3>
              <p>{isHi ? "जहाँ आपको सुधार करने की ज़रूरत है" : "Internal limitations to watch out for"}</p>
            </div>
          </div>
          <ul className="swot-list">
            {weaknesses.map((item, idx) => (
              <li key={idx} className="swot-item">
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* OPPORTUNITIES */}
        <div className="swot-card swot-opportunities">
          <div className="swot-card-head">
            <div>
              <h3>{isHi ? "नए रास्ते (Opportunities)" : "Opportunities (Growth Roads)"}</h3>
              <p>{isHi ? "भविष्य में और ज़्यादा कमाने के मौके" : "External chances for higher revenue"}</p>
            </div>
          </div>
          <ul className="swot-list">
            {opportunities.map((item, idx) => (
              <li key={idx} className="swot-item">
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* THREATS */}
        <div className="swot-card swot-threats">
          <div className="swot-card-head">
            <div>
              <h3>{isHi ? "बाहरी खतरे (Threats)" : "Threats (Risks to Guard Against)"}</h3>
              <p>{isHi ? "मौसम, मंडी या उधारी जैसे खतरे" : "External factors that could hurt profit"}</p>
            </div>
          </div>
          <ul className="swot-list">
            {threats.map((item, idx) => (
              <li key={idx} className="swot-item">
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Practical Action Takeaway */}
      <div className="village-tip-banner">
        <div>
          <h4>{isHi ? "व्यापारी के लिए महत्वपूर्ण नियम:" : "Golden Rule for Village Enterprise:"}</h4>
          <p>
            {isHi
              ? "अपनी 'ताकत' (जैसे ग्राहकों से मधुर संबंध और अच्छी क्वालिटी) का पूरा लाभ उठाएं। 'कमज़ोरी' (जैसे उधारी) को सख्त नियम बनाकर रोकें — 'आज नकद, कल उधार' का बोर्ड दुकान पर ज़रूर लगाएं।"
              : "Double down on your strengths (trust & freshness). Protect against threats by strictly limiting informal customer credit—post a polite 'Cash Preferred' reminder to keep daily working capital safe."}
          </p>
        </div>
      </div>
    </div>
  );
}
