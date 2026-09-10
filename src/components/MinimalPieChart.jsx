import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

function ChartTooltip({ active, payload, total, formatCurrency }) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
    return (
      <div
        style={{
          backgroundColor: "#ffffff",
          padding: "8px 12px",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          fontSize: "12px",
          color: "#1e293b",
        }}
      >
        <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: item.color,
            }}
          />
          {item.name}
        </div>
        <div style={{ marginTop: "4px", fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
          {formatCurrency ? formatCurrency(item.value) : `₹${item.value.toLocaleString("en-IN")}`}
          <span style={{ marginLeft: "6px", fontSize: "11px", fontWeight: 500, color: "#64748b" }}>
            ({pct}%)
          </span>
        </div>
        {item.sublabel && (
          <div style={{ marginTop: "2px", fontSize: "11px", color: "#64748b" }}>
            {item.sublabel}
          </div>
        )}
      </div>
    );
  }
  return null;
}

export default function MinimalPieChart({
  data = [],
  formatCurrency,
  title,
  subtitle,
  centerText,
  height = 220,
}) {
  const validData = data.filter((d) => d && Number(d.value) > 0);
  const total = validData.reduce((sum, d) => sum + Number(d.value), 0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
      }}
    >
      {(title || subtitle) && (
        <div style={{ marginBottom: "12px" }}>
          {title && (
            <h4
              style={{
                margin: 0,
                fontSize: "15px",
                fontWeight: 700,
                color: "#1e293b",
              }}
            >
              {title}
            </h4>
          )}
          {subtitle && (
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      {validData.length === 0 ? (
        <div
          style={{
            height: `${height}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#94a3b8",
            fontSize: "13px",
            backgroundColor: "#f8fafc",
            borderRadius: "8px",
            border: "1px dashed #cbd5e1",
          }}
        >
          No distribution data available
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            alignItems: "center",
            gap: "16px",
          }}
        >
          {/* Chart column */}
          <div style={{ position: "relative", width: "100%", height: `${height}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Tooltip content={<ChartTooltip total={total} formatCurrency={formatCurrency} />} />
                <Pie
                  data={validData}
                  cx="50%"
                  cy="50%"
                  innerRadius={centerText ? 52 : 42}
                  outerRadius={centerText ? 76 : 72}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {validData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Optional center label for donut */}
            {centerText && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  pointerEvents: "none",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>
                  {centerText.primary}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#0f172a",
                    lineHeight: 1.2,
                  }}
                >
                  {centerText.secondary}
                </div>
              </div>
            )}
          </div>

          {/* Legend column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {validData.map((item, idx) => {
              const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "8px",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #f1f5f9",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: item.color,
                        marginTop: "4px",
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ fontSize: "12.5px", fontWeight: 600, color: "#1e293b" }}>
                        {item.name}
                      </div>
                      {item.sublabel && (
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          {item.sublabel}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#0f172a" }}>
                      {formatCurrency
                        ? formatCurrency(item.value)
                        : `₹${item.value.toLocaleString("en-IN")}`}
                    </div>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: item.color }}>
                      {pct}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
