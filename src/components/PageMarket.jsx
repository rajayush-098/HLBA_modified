import { useState, useEffect, useRef } from "react";
import { Loader2, Sparkles } from "lucide-react";
import HyperLocalScanner from "./HyperLocalScanner";
import { getDistrictCoordinates, getCategoryOsmTag } from "../utils/geoUtils";
import { API_ROUTES } from "../apiRoutes";

export default function PageMarket({ 
  result, 
  lang = "hi", 
  formData, 
  userCoords, 
  onScanComplete,
  localMarketData
}) {
  const isHi = lang === "hi";

  // State to hold the dynamic AI-generated market advisory
  const [liveAdvisory, setLiveAdvisory] = useState(
    result?.market_summary || result?.feasibility_report || ""
  );
  const [isGeneratingAdvisory, setIsGeneratingAdvisory] = useState(false);
  const lastScannedKeyRef = useRef("");

  const market = result.hyper_local_profile ?? {};
  const reach = market.market_reach ?? {};
  const demand = market.local_demand ?? "Moderate";
  const score = market.market_potential_score ?? 75;
  const suitability = market.location_suitability ?? "Suitable";
  const channels = reach.distribution_channels ?? [
    "Local Village Market / Haat",
    "Direct Farm / Shop Pickup",
    "Supply to Nearest Kasba / Tehsil Mandi",
  ];

  // Resolve coordinates and OSM tag dynamically without hardcoded Meerut defaults
  const targetDistrict = (formData?.district || result?.district || "").trim();
  const targetState = (formData?.state || result?.state || "").trim();
  const defaultCoords = getDistrictCoordinates(targetDistrict, targetState);
  const userLat = userCoords?.lat || formData?.userLat || (defaultCoords ? defaultCoords[0] : null);
  const userLng = userCoords?.lng || formData?.userLng || (defaultCoords ? defaultCoords[1] : null);
  const businessCategoryTag = getCategoryOsmTag(formData?.category || result?.category || "Dairy & Milk Products");

  // Automatically trigger AI advisory generation when scan results arrive
  useEffect(() => {
    if (!localMarketData || localMarketData.status === "unavailable" || localMarketData.competitors === null || localMarketData.competitors === undefined) return;

    const compCount = Array.isArray(localMarketData.competitors) ? localMarketData.competitors.length : localMarketData.competitors;
    const bankCount = Array.isArray(localMarketData.banks) ? localMarketData.banks.length : (localMarketData.banks || 0);
    const mandiCount = Array.isArray(localMarketData.mandis) ? localMarketData.mandis.length : (localMarketData.mandis || 0);

    const scanKey = `${compCount}-${bankCount}-${mandiCount}-${targetDistrict}`;
    if (lastScannedKeyRef.current === scanKey) return;
    lastScannedKeyRef.current = scanKey;

    const generateLiveMarketAdvisory = async () => {
      setIsGeneratingAdvisory(true);
      try {
        const categoryName = formData?.category || result?.category || "Rural Enterprise";

        const promptQuery = isHi
          ? `रियल-टाइम फील्ड डेटा (10 किमी दायरा, OpenStreetMap): ${compCount} प्रतिद्वंदी, ${bankCount} बैंक, ${mandiCount} मंडी/वेयरहाउस। ${targetDistrict ? `${targetDistrict}, ` : ""}${targetState} में ${categoryName} के व्यापार की व्यावहारिकता पर 3-4 वाक्यों का संक्षिप्त बाज़ार सारांश लिखें। 
          CRITICAL: DO NOT use any Markdown formatting like *, #, or **. Write in plain text only.`
          : `Real-time field data (10km radius, OpenStreetMap): Exactly ${compCount} competitors, ${bankCount} banks, and ${mandiCount} mandis/warehouses found. Provide a concise 3-4 sentence Local Market Feasibility Summary for starting a ${categoryName} in ${targetDistrict ? `${targetDistrict}, ` : ""}${targetState}. 
          CRITICAL: DO NOT use any Markdown formatting (no asterisks, no hashes, no bolding). Write in plain text paragraphs only.`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(API_ROUTES.ADVISOR, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: promptQuery,
            question: promptQuery,
            language: lang,
            selectedLanguage: isHi ? "Hindi" : "English",
            businessContext: { businessType: categoryName, district: targetDistrict, state: targetState },
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (res.ok) {
          const data = await res.json();
          let reply = (data?.reply || data?.answer || data?.text || "").trim();
          reply = reply.replace(/[*#_`]/g, ""); 
          
          if (reply) {
            setLiveAdvisory(reply);
          }
        }
      } catch (err) {
        console.warn("Failed to generate live market advisory:", err);
      } finally {
        setIsGeneratingAdvisory(false);
      }
    };

    generateLiveMarketAdvisory();
  }, [localMarketData, targetDistrict, targetState, lang, isHi, formData, result]);

  return (
    <div className="side-page-content">
      <div className="page-header-banner">
        <div className="page-header-text">
          <span className="page-badge-pill">
            {isHi ? "पेज 06 • गाँव का बाज़ार व माँग" : "Page 06 • Local Market & Area Demand"}
          </span>
          <h2>
            {isHi
              ? `${result.location || targetDistrict || "इलाके"} में बाज़ार व ग्राहकों का विश्लेषण`
              : `Local Market Demand in ${result.location || targetDistrict || "Your Area"}`}
          </h2>
          <p className="page-sub-desc">
            {isHi
              ? "ओपनस्ट्रीटमैप (Overpass API) द्वारा आपके गाँव व आस-पास के 10-50 किमी के दायरे में बैंकों, मंडियों और प्रतिद्वंदियों का लाइव स्कैन।"
              : "Live visual scan of banks, mandis, and competitors across 10-50 km radius via OpenStreetMap (Overpass API)."}
          </p>
        </div>
      </div>

      {/* Comprehensive OpenStreetMap & Leaflet Hyper-Local Environment Scanner */}
      <HyperLocalScanner
        userLat={userLat}
        userLng={userLng}
        businessCategory={formData?.category || result?.category || "Dairy & Milk Products"}
        businessCategoryTag={businessCategoryTag}
        onScanComplete={onScanComplete}
        scannedData={localMarketData}
        businessName={formData?.business_name || result?.business || "Kisan Dairy Farm"}
        district={targetDistrict}
        state={targetState}
        lang={lang}
      />

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

        {/* Dynamic Grounded Competition Card */}
        <div className="kpi-hero-card kpi-amber">
          <div className="kpi-top">
            <span className="kpi-tag">{isHi ? "प्रतिद्वंद्विता" : "Competition"}</span>
          </div>
          <p className="kpi-label">{isHi ? "प्रतिद्वंदी (Competition)" : "Existing Competition"}</p>
          <h3 className="kpi-value">
            {localMarketData?.status === "unavailable" || (localMarketData && localMarketData.competitors === null)
              ? (isHi ? "डेटा अनुपलब्ध" : "Unavailable")
              : localMarketData?.competitors !== undefined && localMarketData?.competitors !== null
              ? (localMarketData.competitors === 0 || (Array.isArray(localMarketData.competitors) && localMarketData.competitors.length === 0)
                  ? (isHi ? "0 प्रतिद्वंदी" : "0 Competitors")
                  : `${Array.isArray(localMarketData.competitors) ? localMarketData.competitors.length : localMarketData.competitors} ${isHi ? "इकाइयाँ" : "Units"}`)
              : (isHi ? "अभी स्कैन नहीं हुआ" : "Not scanned yet")}
          </h3>
          <p className="kpi-hint">
            {localMarketData?.status === "unavailable" || (localMarketData && localMarketData.competitors === null)
              ? (isHi ? "मानचित्र सर्वर से फ़ील्ड डेटा प्राप्त नहीं हो सका" : "Field data could not be retrieved from map service")
              : localMarketData?.competitors !== undefined && localMarketData?.competitors !== null
              ? (localMarketData.competitors === 0 || (Array.isArray(localMarketData.competitors) && localMarketData.competitors.length === 0)
                  ? (isHi ? "स्कैन पूरा हुआ — 10 किमी दायरे में कोई प्रतिद्वंदी नहीं (OpenStreetMap सत्यापित)" : "Scan completed — 0 competitors found in 10 km (OpenStreetMap verified)")
                  : (isHi ? "10 किमी के दायरे में पाई गई दुकानें (OpenStreetMap)" : "Verified units detected in 10 km (OpenStreetMap)"))
              : (isHi ? "वास्तविक गणना देखने के लिए नीचे 'Scan Area' पर क्लिक करें" : "Click 'Scan Area' below to analyze your local market")}
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

      {/* Local Market Summary - Dynamic & Grounded */}
      <div style={{ marginTop: "24px", padding: "18px 20px", background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb" }}></span>
            <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
              {isHi ? "स्थानीय बाज़ार सलाह (Market Advisory Summary)" : "Local Market Advisory Summary"}
            </h4>
          </div>
          {localMarketData && (
            <span style={{ fontSize: "11px", fontWeight: "600", padding: "2px 8px", backgroundColor: "#ecfdf5", color: "#059669", borderRadius: "12px", border: "1px solid #a7f3d0", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <Sparkles size={11} />
              {isHi ? "लाइव डेटा आधारित" : "Live OSM Grounded"}
            </span>
          )}
        </div>

        <div style={{ fontSize: "14px", lineHeight: "1.7", color: "#334155", background: "#f8fafc", padding: "14px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", minHeight: "60px" }}>
          {isGeneratingAdvisory ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#0284c7" }}>
              <Loader2 size={16} className="spinning-icon" />
              <span>
                {isHi
                  ? `फ़ील्ड डेटा (${localMarketData?.competitorsCount ?? (Array.isArray(localMarketData?.competitors) ? localMarketData.competitors.length : (localMarketData?.competitors || 0))} प्रतिद्वंदी, ${localMarketData?.banksCount ?? (Array.isArray(localMarketData?.banks) ? localMarketData.banks.length : (localMarketData?.banks || 0))} बैंक) के आधार पर सलाह तैयार हो रही है...`
                  : `Generating advisory based on ${localMarketData?.competitorsCount ?? (Array.isArray(localMarketData?.competitors) ? localMarketData.competitors.length : (localMarketData?.competitors || 0))} competitors and ${localMarketData?.banksCount ?? (Array.isArray(localMarketData?.banks) ? localMarketData.banks.length : (localMarketData?.banks || 0))} banks...`}
              </span>
            </div>
          ) : (
            liveAdvisory || (isHi ? "स्कैन पूरा होने पर सलाह यहाँ प्रदर्शित होगी।" : "Advisory will display once scan finishes.")
          )}
        </div>
      </div>

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
