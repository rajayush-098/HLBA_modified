import { useState } from "react";
import MinimalPieChart from "./MinimalPieChart";

export default function PageProjection({ result, formatCurrency, lang }) {
  const isHi = lang === "hi";
  const [pieMode, setPieMode] = useState("quarterly");
  const projection = result.profit_projection ?? [];
  const monthlyProfit = result.financial_analysis?.monthly_profit ?? 0;

  const m3 = projection[2]?.cumulative_profit ?? monthlyProfit * 3;
  const m6 = projection[5]?.cumulative_profit ?? monthlyProfit * 6;
  const m9 = projection[8]?.cumulative_profit ?? monthlyProfit * 9;
  const m12 = projection[11]?.cumulative_profit ?? monthlyProfit * 12;

  const maxCum = m12 > 0 ? m12 : 1;

  const q1 = m3;
  const q2 = Math.max(0, m6 - m3);
  const q3 = Math.max(0, m9 - m6);
  const q4 = Math.max(0, m12 - m9);

  const quarterlyData = [
    {
      name: isHi ? "तिमाही 1 (महीना 1-3)" : "Q1 (Months 1-3)",
      value: q1,
      color: "#2563eb",
      sublabel: isHi ? "शुरुआती जमा बचत" : "Initial savings accumulation",
    },
    {
      name: isHi ? "तिमाही 2 (महीना 4-6)" : "Q2 (Months 4-6)",
      value: q2,
      color: "#7c3aed",
      sublabel: isHi ? "व्यवसाय स्थिरीकरण" : "Stabilization & steady growth",
    },
    {
      name: isHi ? "तिमाही 3 (महीना 7-9)" : "Q3 (Months 7-9)",
      value: q3,
      color: "#0d9488",
      sublabel: isHi ? "स्थिर गति व ग्राहक वृद्धि" : "Consistent customer retention",
    },
    {
      name: isHi ? "तिमाही 4 (महीना 10-12)" : "Q4 (Months 10-12)",
      value: q4,
      color: "#16a34a",
      sublabel: isHi ? "सालाना शीर्ष बचत" : "Year-end accumulated wealth",
    },
  ];

  const margin = Number(result.scheme_analysis?.beneficiary_contribution || result.investment || 0);
  const recoveredCap = Math.min(margin, m12);
  const netSurplus = Math.max(0, m12 - margin);

  const recoveryData = [
    {
      name: isHi ? "लगाई गई पूँजी की वापसी" : "Initial Capital Recovered",
      value: recoveredCap,
      color: "#b45309",
      sublabel: isHi ? "आपकी जेब से लगा पैसा वापस" : "Return of your self-invested cash",
    },
    {
      name: isHi ? "अतिरिक्त शुद्ध धन निर्माण" : "Net Wealth Creation (Surplus)",
      value: netSurplus > 0 ? netSurplus : 0,
      color: "#16a34a",
      sublabel: isHi ? "पूँजी वापसी के बाद बना अतिरिक्त धन" : "Surplus retained beyond initial investment",
    },
  ];

  return (
    <div className="side-page-content">
      <div className="page-header-banner">
        <div className="page-header-text">
          <span className="page-badge-pill">
            {isHi ? "पेज 03 • 12 महीने का हिसाब" : "Page 03 • 12-Month Growth Projection"}
          </span>
          <h2>{isHi ? "1 साल में आपकी कुल बचत" : "1-Year Cumulative Profit Timeline"}</h2>
          <p className="page-sub-desc">
            {isHi
              ? "देखें कि समय के साथ हर महीने आपकी तिजोरी में कितनी बचत जमा होती जाएगी।"
              : "Track how your monthly savings accumulate into a substantial capital reserve over 12 months."}
          </p>
        </div>
      </div>

      {/* 3 Milestone Badges */}
      <div className="milestone-grid">
        <div className="milestone-card">
          <span className="milestone-flag">{isHi ? "3 महीने बाद" : "After 3 Months"}</span>
          <h3 className="milestone-val">{formatCurrency(m3)}</h3>
          <p className="milestone-note">
            {isHi ? "शुरुआती लागत और व्यवस्था संभल जाएगी" : "Early working capital stabilized"}
          </p>
        </div>

        <div className="milestone-card">
          <span className="milestone-flag">{isHi ? "6 महीने बाद" : "After 6 Months"}</span>
          <h3 className="milestone-val">{formatCurrency(m6)}</h3>
          <p className="milestone-note">
            {isHi ? "आपकी आधी से ज़्यादा पूँजी वापस आ जाएगी" : "Major portion of initial investment recovered"}
          </p>
        </div>

        <div className="milestone-card highlight">
          <span className="milestone-flag">{isHi ? "1 साल पूरा होने पर" : "After 1 Full Year"}</span>
          <h3 className="milestone-val text-green">{formatCurrency(m12)}</h3>
          <p className="milestone-note">
            {isHi ? "सालाना कुल शुद्ध बचत आपकी जेब में होगी" : "Full annual savings to expand or reinvest"}
          </p>
        </div>
      </div>

      {/* Visual Chart Bars for each month */}
      <div className="projection-visual-card">
        <div className="card-top-head">
          <div>
            <h3>{isHi ? "मासिक बचत का ग्राफ" : "Monthly Savings Growth Chart"}</h3>
            <p>{isHi ? "महीना 1 से महीना 12 तक बचत का बढ़ना" : "Progress of total accumulated money"}</p>
          </div>
        </div>

        <div className="projection-bars-container">
          {projection.map((item, idx) => {
            const pct = Math.max(8, Math.min(100, (item.cumulative_profit / maxCum) * 100));
            const isMilestone = idx === 2 || idx === 5 || idx === 11;
            return (
              <div key={idx} className={`proj-bar-col ${isMilestone ? "milestone-col" : ""}`}>
                <div className="proj-bar-tooltip">
                  {formatCurrency(item.cumulative_profit)}
                </div>
                <div className="proj-bar-track">
                  <div
                    className={`proj-bar-fill ${isMilestone ? "milestone-bar" : ""}`}
                    style={{ height: `${pct}%` }}
                  />
                </div>
                <span className="proj-bar-label">M{idx + 1}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visual Pie Chart: 12-Month Accumulation Breakdown */}
      <div className="detail-card" style={{ marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "16px",
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--text-main)",
              }}
            >
              {isHi ? "12 महीने की बचत का पाई चार्ट" : "12-Month Accumulation Pie Chart"}
            </h3>
            <p
              style={{
                margin: "2px 0 0 0",
                fontSize: "13px",
                color: "var(--text-muted)",
              }}
            >
              {isHi
                ? "देखें कि 1 वर्ष की कुल बचत किस प्रकार बनी"
                : "Visual breakdown of your 1-year accumulated annual profit"}
            </p>
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              onClick={() => setPieMode("quarterly")}
              style={{
                padding: "4px 12px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "20px",
                border: "1px solid",
                borderColor: pieMode === "quarterly" ? "#16a34a" : "#cbd5e1",
                backgroundColor: pieMode === "quarterly" ? "#dcfce7" : "#ffffff",
                color: pieMode === "quarterly" ? "#166534" : "#475569",
                cursor: "pointer",
              }}
            >
              {isHi ? "तिमाही विभाजन" : "Quarterly Share"}
            </button>
            <button
              type="button"
              onClick={() => setPieMode("recovery")}
              style={{
                padding: "4px 12px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "20px",
                border: "1px solid",
                borderColor: pieMode === "recovery" ? "#16a34a" : "#cbd5e1",
                backgroundColor: pieMode === "recovery" ? "#dcfce7" : "#ffffff",
                color: pieMode === "recovery" ? "#166534" : "#475569",
                cursor: "pointer",
              }}
            >
              {isHi ? "पूँजी वापसी vs मुनाफा" : "Recovery vs Surplus"}
            </button>
          </div>
        </div>

        <MinimalPieChart
          data={pieMode === "quarterly" ? quarterlyData : recoveryData}
          formatCurrency={formatCurrency}
          height={210}
          centerText={{
            primary: isHi ? "1 साल की कुल बचत" : "Annual Profit",
            secondary: formatCurrency(m12),
          }}
        />
      </div>

      {/* Clear Table for low-English users */}
      <div className="detail-card">
        <div className="detail-card-head">
          <div>
            <h3>{isHi ? "महीनेवार बही-खाता (Table)" : "Month-by-Month Statement"}</h3>
            <p>{isHi ? "हर महीने की बचत और कुल जमा राशि" : "Exact numbers for every month"}</p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>{isHi ? "महीना (Month)" : "Month"}</th>
                <th>{isHi ? "उस महीने की बचत (Monthly Profit)" : "Monthly Profit"}</th>
                <th>{isHi ? "कुल जमा बचत (Cumulative Profit)" : "Total Accumulated Savings"}</th>
                <th>{isHi ? "स्थिति" : "Milestone Status"}</th>
              </tr>
            </thead>
            <tbody>
              {projection.map((item, idx) => (
                <tr key={idx} className={idx === 11 ? "row-highlight" : ""}>
                  <td>
                    <strong>{isHi ? `महीना ${idx + 1}` : item.month}</strong>
                  </td>
                  <td className="text-green">{formatCurrency(item.monthly_profit)}</td>
                  <td>
                    <strong>{formatCurrency(item.cumulative_profit)}</strong>
                  </td>
                  <td>
                    {idx === 2 ? (
                      <span className="pill-badge pill-blue">3-Month Check</span>
                    ) : idx === 5 ? (
                      <span className="pill-badge pill-purple">Half-Year Mark</span>
                    ) : idx === 11 ? (
                      <span className="pill-badge pill-green">1-Year Goal</span>
                    ) : (
                      <span className="pill-badge pill-gray">Active</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
