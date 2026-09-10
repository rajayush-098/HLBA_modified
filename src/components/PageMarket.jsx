export default function PageMarket({ result, lang }) {
  const isHi = lang === "hi";

  const market = result.hyper_local_profile ?? {};
  const reach = market.market_reach ?? {};
  const demand = market.local_demand ?? "Moderate";
  const competition = market.competition_level ?? "Moderate";
  const score = market.market_potential_score ?? 75;
  const suitability = market.location_suitability ?? "Suitable";
  const channels = reach.distribution_channels ?? [
    "Local Village Market / Haat",
    "Direct Farm / Shop Pickup",
    "Supply to Nearest Kasba / Tehsil Mandi",
  ];

  return (
    <div className="side-page-content">
      <div className="page-header-banner">
        <div className="page-header-text">
          <span className="page-badge-pill">
            {isHi ? "पेज 06 • गाँव का बाज़ार व माँग" : "Page 06 • Local Market & Area Demand"}
          </span>
          <h2>
            {isHi
              ? `${result.location || "इलाके"} में बाज़ार व ग्राहकों का विश्लेषण`
              : `Local Market Demand in ${result.location || "Your Area"}`}
          </h2>
          <p className="page-sub-desc">
            {isHi
              ? "आपके गाँव और आस-पास के 5 से 10 किलोमीटर के दायरे में ग्राहक और प्रतिद्वंदी (कम्पटीशन) की स्थिति।"
              : "Hyper-local customer reach, competing shops, and demand strength across a 5-10 km radius."}
          </p>
        </div>
      </div>

      {/* 4 Market Highlight Cards */}
      <div className="kpi-hero-grid">
        <div className="kpi-hero-card kpi-green">
          <div className="kpi-top">
            <span className="kpi-tag">{isHi ? "माँग स्तर" : "Demand"}</span>
          </div>
          <p className="kpi-label">{isHi ? "स्थानीय माँग (Demand)" : "Local Customer Demand"}</p>
          <h3 className="kpi-value text-green">{demand}</h3>
          <p className="kpi-hint">
            {isHi ? "गाँव व कस्बे में इस उत्पाद की जरूरत" : "Appetite for this product or service locally"}
          </p>
        </div>

        <div className="kpi-hero-card kpi-amber">
          <div className="kpi-top">
            <span className="kpi-tag">{isHi ? "प्रतिद्वंद्विता" : "Competition"}</span>
          </div>
          <p className="kpi-label">{isHi ? "प्रतिद्वंदी (Competition)" : "Existing Competition"}</p>
          <h3 className="kpi-value">{competition}</h3>
          <p className="kpi-hint">
            {isHi ? "पहले से चल रही दुकानों व फर्मों की संख्या" : "Number of existing providers nearby"}
          </p>
        </div>

        <div className="kpi-hero-card kpi-purple">
          <div className="kpi-top">
            <span className="kpi-tag">{isHi ? "बाज़ार स्कोर" : "Score"}</span>
          </div>
          <p className="kpi-label">{isHi ? "बाज़ार क्षमता (Potential)" : "Market Potential Score"}</p>
          <h3 className="kpi-value text-purple">{score}/100</h3>
          <p className="kpi-hint">
            {isHi ? "व्यापार के सफल होने की संभावना" : "Overall local viability index out of 100"}
          </p>
        </div>

        <div className="kpi-hero-card kpi-blue">
          <div className="kpi-top">
            <span className="kpi-tag">{isHi ? "स्थान उपयुक्तता" : "Location"}</span>
          </div>
          <p className="kpi-label">{isHi ? "जगह का चयन" : "Location Suitability"}</p>
          <h3 className="kpi-value">{suitability}</h3>
          <p className="kpi-hint">
            {isHi ? "आपके चुने हुए गाँव/स्थान की अनुकूलता" : "Strategic suitability of selected site"}
          </p>
        </div>
      </div>

      {/* Customer Radius & Distribution */}
      <div className="two-column-grid">
        <div className="detail-card">
          <div className="detail-card-head">
            <div>
              <h3>{isHi ? "ग्राहक पहुँच का दायरा (Radius)" : "Customer Radius & Coverage"}</h3>
              <p>{isHi ? "आप कहाँ-कहाँ तक सामान बेच सकते हैं" : "Primary and extended village reach"}</p>
            </div>
          </div>

          <div className="radius-display-row">
            <div className="radius-box rad-primary">
              <span className="rad-circle">5 KM</span>
              <div>
                <strong>{isHi ? "प्राथमिक दायरा (Primary)" : "Primary Reach (5 km)"}</strong>
                <p>
                  {isHi
                    ? "रोज़ाना आने वाले स्थानीय ग्रामीण व पास के पड़ोस के ग्राहक"
                    : "Core village residents & regular footfall within 5 km"}
                </p>
              </div>
            </div>

            <div className="radius-box rad-extended">
              <span className="rad-circle">10 KM</span>
              <div>
                <strong>{isHi ? "विस्तारित दायरा (Extended)" : "Extended Reach (10 km)"}</strong>
                <p>
                  {isHi
                    ? "सप्ताहिक हाट, आस-पास के 4-5 गाँव और मुख्य संपर्क सड़क"
                    : "Weekly haat bazaars, connecting villages & road transit"}
                </p>
              </div>
            </div>
          </div>

          <div className="market-meta-list">
            <div className="meta-item">
              <span>{isHi ? "उपभोक्ता आधार:" : "Consumer Base:"}</span>
              <strong>{reach.consumer_base || (isHi ? "ग्रामीण परिवार व किसान" : "Rural households & farming families")}</strong>
            </div>
            <div className="meta-item">
              <span>{isHi ? "पहुँच का प्रकार:" : "Market Reach Type:"}</span>
              <strong>{reach.reach_type || (isHi ? "हाइपर-लोकल ग्रामीण क्लस्टर" : "Hyper-local rural cluster")}</strong>
            </div>
            <div className="meta-item">
              <span>{isHi ? "डेटा विश्वसनीयता:" : "Data Confidence:"}</span>
              <strong className="text-green">{reach.confidence || "High (85%+)"}</strong>
            </div>
          </div>
        </div>

        <div className="detail-card">
          <div className="detail-card-head">
            <div>
              <h3>{isHi ? "बिक्री के प्रमुख माध्यम (Channels)" : "Best Selling & Distribution Channels"}</h3>
              <p>{isHi ? "गाँव में माल आसानी से बेचने के तरीके" : "Where & how to distribute your products"}</p>
            </div>
          </div>

          <ul className="channel-list">
            {channels.map((ch, idx) => (
              <li key={idx} className="channel-item">
                <span className="ch-num">{idx + 1}</span>
                <div>
                  <strong>{ch}</strong>
                  <p>
                    {idx === 0
                      ? isHi
                        ? "दुकान या फार्म से सीधे नकद बिक्री, बिना किसी बिचौलिए के।"
                        : "Direct retail sales to end consumers without middlemen."
                      : idx === 1
                      ? isHi
                        ? "गाँव के साप्ताहिक हाट व पैठ बाज़ार में स्टॉल लगाकर बिक्री।"
                        : "Weekly haat bazaar stalls and community market days."
                      : isHi
                      ? "नज़दीकी होटल, डेयरी या थोक व्यापारी को बल्क सप्लाई।"
                      : "Bulk supply partnerships with local retailers & eateries."}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Gemini 6-Point Feasibility Report */}
      {result.feasibility_report && (
        <div style={{ marginTop: "24px", padding: "18px 20px", background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb" }}></span>
            <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
              {isHi ? "AI व्यापार व्यवहार्यता रिपोर्ट (सरकारी सलाहकार मूल्यांकन)" : "Gemini 6-Point Business Feasibility Report"}
            </h4>
          </div>
          <div style={{ fontSize: "13.5px", lineHeight: "1.7", color: "#334155", whiteSpace: "pre-line", background: "#f8fafc", padding: "14px 16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            {result.feasibility_report}
          </div>
        </div>
      )}

      {/* Local Recommendation advice */}
      <div className="village-tip-banner">
        <div>
          <h4>{isHi ? "स्थानीय बाज़ार की विशेष सलाह:" : "Local Market Strategy Recommendation:"}</h4>
          <p>
            {market.recommendation ||
              (isHi
                ? "गाँव के बाज़ार में भरोसा सबसे बड़ी पूँजी है। अच्छी गुणवत्ता और सही तौल रखें। शुरुआती 3 महीनों में ग्राहकों को अपने उत्पाद का प्रचार करने के लिए माउथ-टू-माउथ पब्लिसिटी और मोबाइल व्हाट्सएप ग्रुप का उपयोग करें।"
                : "Trust and fair pricing build the strongest rural moat. Maintain consistent quality, offer transparent weight, and utilize local WhatsApp groups and word-of-mouth among panchayat members.")}
          </p>
        </div>
      </div>
    </div>
  );
}
