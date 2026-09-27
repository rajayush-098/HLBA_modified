import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Store,
  Landmark,
  Truck,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Compass,
  AlertCircle
} from "lucide-react";

// Haversine formula to calculate straight-line distance in kilometers
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Helper to center and adjust zoom on radius change
function MapRecenter({ center, radius }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      const zoom = radius >= 50000 ? 9 : radius >= 25000 ? 10 : 12;
      map.setView(center, zoom, { animate: true });
    }
  }, [center, radius, map]);
  return null;
}

// Create custom DOM markers using Leaflet DivIcon
function createCustomMarkerIcon(type) {
  let bgGradient = "linear-gradient(135deg, #ef4444, #b91c1c)";
  let borderColor = "#ffffff";
  let iconSvg = "";

  if (type === "competitor") {
    // Red Storefront icon for Competitors
    bgGradient = "linear-gradient(135deg, #ef4444, #dc2626)";
    iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>`;
  } else if (type === "bank") {
    // Green Rupee / Bank Landmark icon for Financial Infrastructure
    bgGradient = "linear-gradient(135deg, #10b981, #059669)";
    iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18"/><line x1="10" x2="10" y1="18"/><line x1="14" x2="14" y1="18"/><line x1="18" x2="18" y1="18"/><polygon points="12 2 20 7 4 7"/><line x1="1" x2="23" y1="7" y2="7"/></svg>`;
  } else if (type === "market") {
    // Blue Truck / Marketplace Mandi icon for Marketplaces & Logistics
    bgGradient = "linear-gradient(135deg, #3b82f6, #1d4ed8)";
    iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`;
  } else if (type === "user") {
    // Amber / Emerald Beacon for User's Business location
    bgGradient = "linear-gradient(135deg, #f59e0b, #d97706)";
    borderColor = "#ffffff";
    iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff" stroke="#ffffff" stroke-width="1.5"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/></svg>`;
  }

  const html = `
    <div style="
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: ${bgGradient};
      border: 2px solid ${borderColor};
      box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      cursor: pointer;
      transform: translate(-50%, -50%);
    ">
      ${type === "user" ? '<span style="position: absolute; width: 44px; height: 44px; border-radius: 50%; border: 2px solid #f59e0b; opacity: 0.6; animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>' : ""}
      ${iconSvg}
    </div>
  `;

  return L.divIcon({
    className: `custom-overpass-marker custom-marker-${type}`,
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

export default function HyperLocalScanner({
  userLat,
  userLng,
  onScanComplete,
  businessName = "Kisan Dairy Farm",
  district = "Meerut",
  state = "Uttar Pradesh",
  lang = "hi",
}) {
  const isHi = lang === "hi";

  // Force Default Coordinates: fallback immediately to Lucknow coordinates (26.8467, 80.9462) if missing
  const scanLat = userLat || 26.8467;
  const scanLng = userLng || 80.9462;
  const activeLat = scanLat;
  const activeLng = scanLng;

  // 1. Data Architecture & Overpass API State
  const [searchRadius, setSearchRadius] = useState(10000); // Stable 10km radius
  const [isDeepRural, setIsDeepRural] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanningBanks, setScanningBanks] = useState(false);
  const [scanningMandis, setScanningMandis] = useState(false);
  const [scanStatusMessage, setScanStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [scanError, setScanError] = useState(null);

  // Scan items
  const [competitors, setCompetitors] = useState([]);
  const [financialNodes, setFinancialNodes] = useState([]);
  const [logisticsNodes, setLogisticsNodes] = useState([]);

  // Metric summaries
  const [nearestBank, setNearestBank] = useState(null);
  const [nearestMarket, setNearestMarket] = useState(null);
  const [marketSaturationScore, setMarketSaturationScore] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'competitors' | 'banks' | 'markets'

  // Ref to prevent duplicate scan runs and breaking infinite loops
  const isScanningRef = useRef(false);
  const lastEmittedSummaryRef = useRef("");
  const onScanCompleteRef = useRef(onScanComplete);

  useEffect(() => {
    onScanCompleteRef.current = onScanComplete;
  }, [onScanComplete]);

  // Process raw elements and calculate distances
  const processElements = useCallback(
    (elements, centerLat, centerLng) => {
      const parsedCompetitors = [];
      const parsedBanks = [];
      const parsedMarkets = [];

      elements.forEach((el, index) => {
        const itemLat = el.lat ?? el.center?.lat;
        const itemLng = el.lon ?? el.center?.lon;
        if (!itemLat || !itemLng) return;

        const distance = calculateHaversineDistance(centerLat, centerLng, itemLat, itemLng);
        const tags = el.tags || {};
        const name = tags.name || tags["name:en"] || tags["name:hi"] || el.name || "Unnamed Local Resource";

        const item = {
          id: el.id ? String(el.id) : `res-${index}`,
          name,
          lat: itemLat,
          lng: itemLng,
          distKm: distance,
          tags,
          type: el.type,
          category: el.category,
        };

        if (el.type === "competitor" || (!el.type && tags.shop) || (!el.type && tags.craft)) {
          item.type = "competitor";
          parsedCompetitors.push(item);
        } else if (el.type === "bank" || (!el.type && tags.amenity === "bank")) {
          item.type = "bank";
          parsedBanks.push(item);
        } else if (
          el.type === "market" ||
          (!el.type && (tags.amenity === "marketplace" || tags.building === "warehouse"))
        ) {
          item.type = "market";
          parsedMarkets.push(item);
        }
      });

      parsedCompetitors.sort((a, b) => a.distKm - b.distKm);
      parsedBanks.sort((a, b) => a.distKm - b.distKm);
      parsedMarkets.sort((a, b) => a.distKm - b.distKm);

      setCompetitors(parsedCompetitors);
      setFinancialNodes(parsedBanks);
      setLogisticsNodes(parsedMarkets);

      const closestBank = parsedBanks.length > 0 ? parsedBanks[0] : null;
      const closestMarket = parsedMarkets.length > 0 ? parsedMarkets[0] : null;
      setNearestBank(closestBank);
      setNearestMarket(closestMarket);

      const compCount = parsedCompetitors.length;
      let calculatedSatScore = isHi
        ? `अधिक कम्पटीशन - ${compCount} समान दुकानें मिलीं`
        : `High Competition - ${compCount} similar shops found`;

      if (compCount === 0) {
        calculatedSatScore = isHi
          ? `शून्य कम्पटीशन - 10km दायरे में कोई समान दुकान नहीं`
          : `No Competition - 0 similar shops found`;
      } else if (compCount <= 2) {
        calculatedSatScore = isHi
          ? `कम कम्पटीशन - ${compCount} समान दुकानें मिलीं`
          : `Low Competition - ${compCount} similar shops found`;
      } else if (compCount <= 5) {
        calculatedSatScore = isHi
          ? `मध्यम कम्पटीशन - ${compCount} समान दुकानें मिलीं`
          : `Moderate Competition - ${compCount} similar shops found`;
      }

      setMarketSaturationScore(calculatedSatScore);

      return {
        competitors: parsedCompetitors,
        banks: parsedBanks,
        markets: parsedMarkets,
        closestBank,
        closestMarket,
        calculatedSatScore,
      };
    },
    [isHi]
  );

  // Dynamic Radius Fetching from Overpass API - Real fetch with hardcoded test coordinates & visible error state
  const executeScan = useCallback(
    async (currentRadius = searchRadius, force = false) => {
      // Remove any blocking guard clauses; use force or proceed directly
      console.log("executeScan called with radius:", currentRadius, "force:", force);
      isScanningRef.current = true;
      setIsLoading(true);
      setIsScanning(true);
      setScanningBanks(true);
      setScanningMandis(true);
      setErrorMessage("");
      setScanError(null);

      const radius = 10000; // Use stable 10km radius
      if (currentRadius > 25000) {
        setIsDeepRural(true);
      } else {
        setIsDeepRural(false);
      }

      try {
        setScanStatusMessage(
          isHi
            ? "10 किमी के दायरे में स्थानीय बाज़ार स्कैन हो रहा है (Overpass API)..."
            : "Scanning local market in 10km radius via Overpass API..."
        );

        // Exact Overpass QL query string with hardcoded Lucknow coordinates
        const query = `
[out:json][timeout:25];
(
  nwr["shop"](around:10000, 26.8467, 80.9462);
  nwr["amenity"="bank"](around:10000, 26.8467, 80.9462);
  nwr["amenity"="marketplace"](around:10000, 26.8467, 80.9462);
);
out center;
        `.trim();

        console.log("Initiating Overpass Fetch at hardcoded Lucknow coordinates (26.8467, 80.9462) with radius 10000");

        const encodedQuery = encodeURIComponent(query);
        const targetUrl = `https://overpass-api.de/api/interpreter?data=${encodedQuery}`;

        let response = null;

        // Try direct GET request first
        try {
          response = await fetch(targetUrl, { method: "GET" });
        } catch (directErr) {
          console.warn("Direct GET fetch encountered network/CORS error:", directErr);
        }

        // If direct fetch threw an error or returned not ok, retry using allorigins CORS proxy
        if (!response || !response.ok) {
          console.log("Direct fetch failed due to CORS. Attempting Proxy...");
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
          response = await fetch(proxyUrl, { method: "GET" });
        }

        console.log("Response Status:", response?.status);

        if (!response || !response.ok) {
          const errText = response ? await response.text().catch(() => "") : "No response";
          throw new Error(`HTTP Error ${response?.status || "Unknown"}: ${response?.statusText || ""} ${errText.slice(0, 100)}`);
        }

        const data = await response.json();
        const rawElements = Array.isArray(data.elements) ? data.elements : [];
        console.log("Overpass Elements Received:", rawElements.length);

        // Process elements array in try block
        const processed = processElements(rawElements, 26.8467, 80.9462);

        // Export data to parent through ref callback
        if (typeof onScanCompleteRef.current === "function" && processed) {
          const radiusKmNum = 10;
          const competitorsCount = processed.competitors.length;
          const nearestBankDist = processed.closestBank ? `${processed.closestBank.distKm}km` : "unknown";
          const nearestMarketDist = processed.closestMarket ? `${processed.closestMarket.distKm}km` : "unknown";

          const summaryString = `Local Market Context: ${competitorsCount} competitors within ${radiusKmNum}km, nearest bank is ${nearestBankDist} away${
            processed.closestMarket ? `, nearest marketplace/warehouse is ${nearestMarketDist} away (${processed.closestMarket.name})` : ""
          }.`;

          if (lastEmittedSummaryRef.current !== summaryString) {
            lastEmittedSummaryRef.current = summaryString;
            onScanCompleteRef.current({
              searchRadiusMeters: radius,
              radiusKm: radiusKmNum,
              isDeepRural: false,
              competitorsCount,
              competitors: processed.competitors.map((c) => ({ name: c.name, distKm: c.distKm })),
              nearestBank: processed.closestBank ? { name: processed.closestBank.name, distKm: processed.closestBank.distKm } : null,
              nearestMarket: processed.closestMarket ? { name: processed.closestMarket.name, distKm: processed.closestMarket.distKm } : null,
              marketSaturationScore: processed.calculatedSatScore,
              summaryString,
              scannedAt: new Date().toISOString(),
            });
          }
        }
      } catch (err) {
        console.error("HyperLocalScanner executeScan error:", err);
        const detailedError = err?.message || "Unknown Fetch Error";
        setScanError(detailedError);
        setErrorMessage(
          isHi
            ? `त्रुटि: ${detailedError}`
            : `Error: ${detailedError}`
        );
      } finally {
        setIsLoading(false);
        setIsScanning(false);
        setScanningBanks(false);
        setScanningMandis(false);
        isScanningRef.current = false;
        setScanStatusMessage("");
      }
    },
    [searchRadius, isHi, processElements]
  );

  const executeScanRef = useRef(executeScan);

  useEffect(() => {
    executeScanRef.current = executeScan;
  }, [executeScan]);

  // Single safe trigger effect on mount or genuine location/radius change only
  // CRITICAL: Dependency array ONLY contains [userLat, userLng, searchRadius]
  // Never include competitors, banks, isScanning, map, or object callbacks
  useEffect(() => {
    const timer = setTimeout(() => {
      if (executeScanRef.current) {
        executeScanRef.current(searchRadius);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [userLat, userLng, searchRadius]);

  const displayedCompetitors = activeFilter === "all" || activeFilter === "competitors" ? competitors : [];
  const displayedBanks = activeFilter === "all" || activeFilter === "banks" ? financialNodes : [];
  const displayedMarkets = activeFilter === "all" || activeFilter === "markets" ? logisticsNodes : [];

  return (
    <div
      className="hyperlocal-scanner-container"
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "16px",
        border: "1.5px solid #e2e8f0",
        padding: "20px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        marginBottom: "24px",
      }}
    >
      {/* Header bar with Status & Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "14px",
          marginBottom: "16px",
          paddingBottom: "14px",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                backgroundColor: "#eff6ff",
                color: "#1d4ed8",
                padding: "3px 10px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 700,
                border: "1px solid #bfdbfe",
              }}
            >
              <Compass size={13} />
              <span>OpenStreetMap Overpass Engine</span>
            </span>

            {isDeepRural && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  backgroundColor: "#ecfdf5",
                  color: "#059669",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 800,
                  border: "1px solid #a7f3d0",
                }}
              >
                <Sparkles size={13} />
                <span>{isHi ? "प्रथम प्रस्तावक लाभ (First-Mover)" : "First-Mover Advantage"}</span>
              </span>
            )}
          </div>

          <h3 style={{ margin: "4px 0", fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
            {isHi ? "हाइपर-लोकल बाज़ार व बुनियादी ढाँचा स्कैनर" : "Hyper-Local Market & Infrastructure Scanner"}
          </h3>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
            {isHi
              ? `इलाका: ${district}, ${state} (${activeLat.toFixed(4)}, ${activeLng.toFixed(4)}) • दायरा: ${searchRadius / 1000} किमी`
              : `Area: ${district}, ${state} (${activeLat.toFixed(4)}, ${activeLng.toFixed(4)}) • Search Radius: ${searchRadius / 1000} km`}
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {/* Radius selector */}
          <div
            style={{
              display: "flex",
              backgroundColor: "#f1f5f9",
              borderRadius: "8px",
              padding: "2px",
              border: "1px solid #cbd5e1",
            }}
          >
            {[10000, 25000, 50000].map((rad) => (
              <button
                key={rad}
                type="button"
                onClick={() => {
                  if (searchRadius !== rad) {
                    setSearchRadius(rad);
                  } else {
                    isScanningRef.current = false;
                    executeScan(rad, true);
                  }
                }}
                disabled={isLoading}
                style={{
                  backgroundColor: searchRadius === rad ? "#ffffff" : "transparent",
                  color: searchRadius === rad ? "#1e40af" : "#64748b",
                  border: "none",
                  borderRadius: "6px",
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: searchRadius === rad ? 700 : 500,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  boxShadow: searchRadius === rad ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {rad / 1000} km
              </button>
            ))}
          </div>

          {/* Rescan Button */}
          <button
            type="button"
            onClick={() => {
              isScanningRef.current = false;
              executeScan(searchRadius, true);
            }}
            disabled={isLoading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: isLoading ? "#94a3b8" : "#1e40af",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "7px 14px",
              fontSize: "12.5px",
              fontWeight: 700,
              cursor: isLoading ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <RefreshCw size={13} style={{ animation: isLoading ? "spin 1s linear infinite" : "none" }} />
            <span>{isLoading ? (isHi ? "स्कैन जारी..." : "Scanning...") : (isHi ? "पुनः स्कैन करें" : "Rescan")}</span>
          </button>
        </div>
      </div>

      {/* Status banner when loading */}
      {isLoading && (
        <div
          style={{
            padding: "8px 14px",
            backgroundColor: "#eff6ff",
            color: "#1d4ed8",
            border: "1px solid #bfdbfe",
            borderRadius: "8px",
            fontSize: "12.5px",
            fontWeight: 600,
            marginBottom: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⚙️</span>
          <span>{scanStatusMessage || (isHi ? "स्कैनिंग जारी है..." : "Scanning OpenStreetMap Overpass...")}</span>
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            padding: "8px 14px",
            backgroundColor: "#fef2f2",
            color: "#dc2626",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            fontSize: "12.5px",
            marginBottom: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertCircle size={15} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filter Tabs & Map Legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "12px",
        }}
      >
        {/* Filter buttons */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              border: activeFilter === "all" ? "1.5px solid #1e40af" : "1px solid #cbd5e1",
              backgroundColor: activeFilter === "all" ? "#eff6ff" : "#ffffff",
              color: activeFilter === "all" ? "#1e40af" : "#475569",
            }}
          >
            {isHi ? "सभी दिखाएँ" : "All Resources"} ({competitors.length + financialNodes.length + logisticsNodes.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("competitors")}
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              border: activeFilter === "competitors" ? "1.5px solid #dc2626" : "1px solid #cbd5e1",
              backgroundColor: activeFilter === "competitors" ? "#fef2f2" : "#ffffff",
              color: activeFilter === "competitors" ? "#dc2626" : "#475569",
            }}
          >
            <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#dc2626", marginRight: "5px" }}></span>
            {isHi ? "प्रतिद्वंदी" : "Competitors"} ({competitors.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("banks")}
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              border: activeFilter === "banks" ? "1.5px solid #16a34a" : "1px solid #cbd5e1",
              backgroundColor: activeFilter === "banks" ? "#f0fdf4" : "#ffffff",
              color: activeFilter === "banks" ? "#16a34a" : "#475569",
            }}
          >
            <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#16a34a", marginRight: "5px" }}></span>
            {isHi ? "बैंक व वित्त" : "Banks"} ({financialNodes.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("markets")}
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              border: activeFilter === "markets" ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
              backgroundColor: activeFilter === "markets" ? "#eff6ff" : "#ffffff",
              color: activeFilter === "markets" ? "#2563eb" : "#475569",
            }}
          >
            <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#2563eb", marginRight: "5px" }}></span>
            {isHi ? "मंडी व गोदाम" : "Mandis / Warehouses"} ({logisticsNodes.length})
          </button>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: "12px", fontSize: "11.5px", color: "#64748b" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#f59e0b" }}></span>
            <span>{isHi ? "आपका उद्यम" : "Your Business"}</span>
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#dc2626" }}></span>
            <span>{isHi ? "समान दुकानें" : "Competitors"}</span>
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#16a34a" }}></span>
            <span>{isHi ? "बैंक शाखा" : "Banks"}</span>
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#2563eb" }}></span>
            <span>{isHi ? "मंडी / गोदाम" : "Mandi/Warehouse"}</span>
          </span>
        </div>
      </div>

      {/* 2. Visual Integration (react-leaflet map container) */}
      <div
        style={{
          width: "100%",
          height: "400px",
          borderRadius: "14px",
          overflow: "hidden",
          border: "1.5px solid #cbd5e1",
          position: "relative",
          zIndex: 1,
        }}
      >
        <MapContainer
          center={[activeLat, activeLng]}
          zoom={searchRadius >= 50000 ? 9 : searchRadius >= 25000 ? 10 : 12}
          scrollWheelZoom={false}
          style={{ width: "100%", height: "100%" }}
        >
          <MapRecenter center={[activeLat, activeLng]} radius={searchRadius} />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Dynamic Radius Visualization Circle with semi-transparent blue fill */}
          <Circle
            center={[activeLat, activeLng]}
            radius={searchRadius}
            pathOptions={{
              color: "#2563eb",
              fillColor: "#3b82f6",
              fillOpacity: 0.12,
              weight: 2,
              dashArray: "6, 6",
            }}
          />

          {/* User's Business Center Marker */}
          <Marker
            position={[activeLat, activeLng]}
            icon={createCustomMarkerIcon("user")}
          >
            <Popup>
              <div style={{ padding: "4px 2px", minWidth: "160px" }}>
                <strong style={{ color: "#d97706", fontSize: "13px" }}>📍 {businessName}</strong>
                <p style={{ margin: "4px 0 2px 0", fontSize: "11.5px", color: "#475569" }}>
                  {district}, {state}
                </p>
                <div style={{ fontSize: "11px", color: "#059669", fontWeight: 700 }}>
                  {isHi ? "स्कैन का केंद्र बिंदु (Center Point)" : "Scan Center (0.0 km)"}
                </div>
              </div>
            </Popup>
          </Marker>

          {/* Competitor Markers (Red Storefront Icon) */}
          {displayedCompetitors.map((item) => (
            <Marker
              key={item.id}
              position={[item.lat, item.lng]}
              icon={createCustomMarkerIcon("competitor")}
            >
              <Popup>
                <div style={{ padding: "4px 2px", minWidth: "180px" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#dc2626", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>
                    <Store size={12} />
                    <span>{isHi ? "प्रतिद्वंदी दुकान" : "Competitor"}</span>
                  </div>
                  <strong style={{ display: "block", color: "#0f172a", fontSize: "13px", marginTop: "2px" }}>
                    {item.name}
                  </strong>
                  <div style={{ marginTop: "6px", fontSize: "12px", color: "#2563eb", fontWeight: 700 }}>
                    📏 {item.distKm} km {isHi ? "दूर (सीधी दूरी)" : "straight-line distance"}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Financial Infrastructure Markers (Green Rupee / Bank Icon) */}
          {displayedBanks.map((item) => (
            <Marker
              key={item.id}
              position={[item.lat, item.lng]}
              icon={createCustomMarkerIcon("bank")}
            >
              <Popup>
                <div style={{ padding: "4px 2px", minWidth: "180px" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#16a34a", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>
                    <Landmark size={12} />
                    <span>{isHi ? "बैंक / वित्तीय शाखा" : "Bank / Financial Service"}</span>
                  </div>
                  <strong style={{ display: "block", color: "#0f172a", fontSize: "13px", marginTop: "2px" }}>
                    {item.name}
                  </strong>
                  <div style={{ marginTop: "6px", fontSize: "12px", color: "#16a34a", fontWeight: 700 }}>
                    🏦 {item.distKm} km {isHi ? "दूरी" : "distance"}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Marketplace / Warehouse Markers (Blue Truck / Market Icon) */}
          {displayedMarkets.map((item) => (
            <Marker
              key={item.id}
              position={[item.lat, item.lng]}
              icon={createCustomMarkerIcon("market")}
            >
              <Popup>
                <div style={{ padding: "4px 2px", minWidth: "180px" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#2563eb", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>
                    <Truck size={12} />
                    <span>{isHi ? "मंडी / गोदाम" : "Marketplace / Logistics"}</span>
                  </div>
                  <strong style={{ display: "block", color: "#0f172a", fontSize: "13px", marginTop: "2px" }}>
                    {item.name}
                  </strong>
                  <div style={{ marginTop: "6px", fontSize: "12px", color: "#2563eb", fontWeight: 700 }}>
                    📦 {item.distKm} km {isHi ? "दूरी" : "distance"}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Error Banner: Visible exact error state */}
      {scanError && (
        <div style={{ color: "red", padding: "10px", background: "#ffe6e6", borderRadius: "8px", border: "1px solid #ffcccc", marginBottom: "12px", fontSize: "13px", fontWeight: "600" }}>
          ⚠️ {scanError}
        </div>
      )}

      {/* 3. Analytics Dashboard UI: Three Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "14px",
          marginTop: "16px",
        }}
      >
        {/* Metric 1: Market Saturation Score */}
        <div
          style={{
            backgroundColor: "#f8fafc",
            border: "1.5px solid #e2e8f0",
            borderRadius: "12px",
            padding: "16px",
            position: "relative",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {isHi ? "बाज़ार में प्रतिस्पर्धा" : "Market Saturation Score"}
            </span>
            <span
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor: "#fee2e2",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Store size={14} />
            </span>
          </div>

          <div style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a", marginBottom: "6px" }}>
            {isLoading || isScanning
              ? isHi
                ? "प्रतिस्पर्धा जांची जा रही है..."
                : "Scanning competition..."
              : marketSaturationScore || (isHi ? "प्रतिस्पर्धा का स्तर सामान्य" : "Moderate Competition")}
          </div>

          <div style={{ fontSize: "12px", color: "#64748b" }}>
            {isLoading || isScanning ? (
              <span>{isHi ? "स्थानीय दुकानों का विवरण खोजा जा रहा है..." : "Scanning local businesses..."}</span>
            ) : isHi ? (
              `${searchRadius / 1000} किमी के दायरे में ${competitors.length} प्रतिस्पर्धी इकाइयाँ सक्रिय हैं।`
            ) : (
              `${competitors.length} similar businesses operating within ${searchRadius / 1000}km radius.`
            )}
          </div>

          {/* First-Mover Advantage Badge */}
          {isDeepRural && (
            <div
              style={{
                marginTop: "10px",
                padding: "6px 10px",
                backgroundColor: "#ecfdf5",
                border: "1px solid #6ee7b7",
                borderRadius: "8px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "#065f46",
                fontSize: "11.5px",
                fontWeight: 700,
              }}
            >
              <Sparkles size={13} style={{ color: "#059669" }} />
              <span>{isHi ? "विशेष: प्रथम प्रस्तावक लाभ (First-Mover Advantage)" : "First-Mover Advantage"}</span>
            </div>
          )}
        </div>

        {/* Metric 2: Financial Access */}
        <div
          style={{
            backgroundColor: "#f8fafc",
            border: "1.5px solid #e2e8f0",
            borderRadius: "12px",
            padding: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {isHi ? "वित्तीय पहुँच (Financial Access)" : "Financial Access"}
            </span>
            <span
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor: "#dcfce7",
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Landmark size={14} />
            </span>
          </div>

          <div style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a", marginBottom: "6px" }}>
            {scanningBanks || isLoading
              ? isHi
                ? "बैंक शाखा खोजी जा रही है..."
                : "Scanning nearby branches..."
              : nearestBank
              ? isHi
                ? `निकटतम बैंक: ${nearestBank.distKm} किमी`
                : `Nearest Bank: ${nearestBank.distKm} km`
              : isHi
              ? "बैंक शाखा उपलब्ध (ग्रामीण केंद्र)"
              : "Bank branch accessible in cluster"}
          </div>

          <div style={{ fontSize: "12px", color: "#64748b" }}>
            {nearestBank ? (
              <span>🏦 {nearestBank.name}</span>
            ) : (
              <span>{isHi ? "10-25 किमी में बैंक शाखाएँ उपलब्ध हैं।" : "Bank branches available within radius."}</span>
            )}
          </div>

          <div style={{ marginTop: "10px", fontSize: "11.5px", color: "#059669", fontWeight: 600 }}>
            ✓ {isHi ? "सरकारी मुद्रा / PM FME ऋण प्रक्रिया के अनुकूल" : "Ideal for Mudra / PM FME loan documentation"}
          </div>
        </div>

        {/* Metric 3: Supply Chain */}
        <div
          style={{
            backgroundColor: "#f8fafc",
            border: "1.5px solid #e2e8f0",
            borderRadius: "12px",
            padding: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {isHi ? "सप्लाई चेन व माल ढुलाई" : "Supply Chain & Logistics"}
            </span>
            <span
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor: "#dbeafe",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Truck size={14} />
            </span>
          </div>

          <div style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a", marginBottom: "6px" }}>
            {scanningMandis || isLoading
              ? isHi
                ? "मंडी व गोदाम खोज जारी..."
                : "Scanning local mandis..."
              : nearestMarket
              ? isHi
                ? `निकटतम मंडी / गोदाम: ${nearestMarket.distKm} किमी`
                : `Nearest Mandi/Warehouse: ${nearestMarket.distKm} km`
              : isHi
              ? "तहसील मंडी व गोदाम केंद्र उपलब्ध"
              : "Tehsil mandi & storage hub accessible"}
          </div>

          <div style={{ fontSize: "12px", color: "#64748b" }}>
            {nearestMarket ? (
              <span>📦 {nearestMarket.name}</span>
            ) : (
              <span>{isHi ? "कृषि उपज मंडी समिति व गोदाम" : "Agricultural APMC & storage yard"}</span>
            )}
          </div>

          <div style={{ marginTop: "10px", fontSize: "11.5px", color: "#2563eb", fontWeight: 600 }}>
            ✓ {isHi ? "कच्चा माल मंगाने व तैयार उत्पाद बेचने का मुख्य केंद्र" : "Key hub for raw materials & product distribution"}
          </div>
        </div>
      </div>

      {/* Actionable Gemini Mentor Insights Bar */}
      <div
        style={{
          marginTop: "14px",
          padding: "12px 16px",
          backgroundColor: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "13px",
          color: "#166534",
        }}
      >
        <TrendingUp size={16} style={{ color: "#16a34a", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <strong>{isHi ? "AI व्यापार साथी के लिए विश्लेषण:" : "Actionable Intelligence for AI Mentor:"}</strong>{" "}
          <span>
            {competitors.length <= 2
              ? isHi
                ? "इलाके में कम दुकानें हैं, इसलिए सीधे ग्राहक सेवा और ताज़गी के दम पर बाज़ार में एकाधिकार बनाया जा सकता है।"
                : "Low competition density gives strong pricing power and room for rapid customer acquisition."
              : isHi
                ? "प्रतिद्वंदियों की मौजूदगी को देखते हुए बेहतर पैकेजिंग और गाँव-गाँव आपूर्ति पर ध्यान दें।"
                : "Given existing competition, focus on differentiated packaging and doorstep village delivery."}
          </span>
        </div>
      </div>
    </div>
  );
}
