import MinimalPieChart from "./MinimalPieChart";

export default function PageProfit({ result, formatCurrency, lang }) {
  const isHi = lang === "hi";

  const rev = Number(result.monthly_revenue ?? result.financial_analysis?.monthly_revenue ?? ((result.financial_analysis?.monthly_profit || 0) + (result.advanced_financial_analysis?.break_even_revenue || 0)));
  const exp = Number(result.monthly_expenses ?? ((result.financial_analysis?.monthly_revenue - result.financial_analysis?.monthly_profit) || (result.advanced_financial_analysis?.break_even_revenue || 0)));
  const profit = result.financial_analysis?.monthly_profit ?? 0;

  const profitMargin = result.advanced_financial_analysis?.profit_margin ?? 0;
  const expenseRatio = result.advanced_financial_analysis?.expense_ratio ?? 0;
  const breakEven = result.advanced_financial_analysis?.break_even_revenue ?? 0;
  const surplus = result.advanced_financial_analysis?.monthly_cash_surplus ?? profit;
  const strength = result.advanced_financial_analysis?.financial_strength ?? "Moderate";
  const finRisk = result.advanced_financial_analysis?.financial_risk ?? "Low";

  const totalSales = (exp + Math.max(0, profit)) || rev;
  const profitPieData = [
    {
      name: isHi ? "कुल परिचालन खर्च (Kharcha)" : "Operating Costs (Expenses)",
      value: exp,
      color: "#d97706",
      sublabel: isHi ? "कच्चा माल, बिजली, किराया व बिल" : "Inventory, rent, power & supplies",
    },
    {
      name: isHi ? "शुद्ध मासिक बचत (Munafa)" : "Net Profit (Savings)",
      value: Math.max(0, profit),
      color: "#16a34a",
      sublabel: isHi ? "सभी खर्चों के बाद आपकी जेब में बचत" : "Retained cash after all outlays",
    },
  ];

  return (
    <div className="side-page-content">
      <div className="page-header-banner">
        <div className="page-header-text">
          <span className="page-badge-pill">
            {isHi ? "पेज 02 • कमाई और खर्चा" : "Page 02 • Profit & Money Math"}
          </span>
          <h2>{isHi ? "हर महीने का नफ़ा-नुकसान" : "Monthly Revenue, Cost & Profit"}</h2>
          <p className="page-sub-desc">
            {isHi
              ? "सरल गणित: कुल बिक्री में से सारा खर्च घटाकर शुद्ध जेब में कितना बचेगा।"
              : "Clear money flow: Total sales minus all business expenses equals your real profit."}
          </p>
        </div>
      </div>

      {/* Visual Money Flow equation */}
      <div className="money-flow-equation">
        <div className="flow-step flow-in">
          <span className="flow-label">{isHi ? "कुल बिक्री (Bikri)" : "Total Sales (Revenue)"}</span>
          <strong className="flow-amt">+{formatCurrency(rev > 0 ? rev : profit + exp)}</strong>
          <span className="flow-sub">{isHi ? "ग्राहक से आया पैसा" : "Money in from customers"}</span>
        </div>

        <div className="flow-operator">−</div>

        <div className="flow-step flow-out">
          <span className="flow-label">{isHi ? "कुल खर्च (Kharcha)" : "Total Expenses (Costs)"}</span>
          <strong className="flow-amt">−{formatCurrency(exp)}</strong>
          <span className="flow-sub">{isHi ? "माल, बिजली, किराया आदि" : "Materials, rent, power, feed"}</span>
        </div>

        <div className="flow-operator">=</div>

        <div className="flow-step flow-result">
          <span className="flow-label">{isHi ? "शुद्ध मुनाफा (Munafa)" : "Net Monthly Profit"}</span>
          <strong className="flow-amt">{formatCurrency(profit)}</strong>
          <span className="flow-sub">{isHi ? "आपकी सीधी बचत" : "Real money in your hand"}</span>
        </div>
      </div>

      {/* Visual Pie Chart: Monthly Sales Breakdown (Expenses vs Net Profit) */}
      <div className="detail-card" style={{ marginBottom: "24px" }}>
        <MinimalPieChart
          title={isHi ? "मासिक बिक्री का पाई चार्ट (Revenue Allocation)" : "Monthly Sales Allocation Pie Chart"}
          subtitle={
            isHi
              ? "कुल बिक्री में से खर्च और शुद्ध मुनाफे का वास्तविक हिस्सा"
              : "Exact proportion of total customer sales kept as profit vs absorbed by expenses"
          }
          data={profitPieData}
          formatCurrency={formatCurrency}
          height={210}
          centerText={{
            primary: isHi ? "कुल बिक्री" : "Gross Revenue",
            secondary: formatCurrency(totalSales),
          }}
        />
      </div>

      {/* Ratios and Break-Even Cards */}
      <div className="two-column-grid">
        <div className="detail-card">
          <div className="detail-card-head">
            <div>
              <h3>{isHi ? "मुनाफे का प्रतिशत (Margin)" : "Profit Margin & Cost Ratio"}</h3>
              <p>{isHi ? "हर ₹100 की बिक्री पर कितना बचता है" : "Percentage of sales kept as profit"}</p>
            </div>
          </div>

          <div className="bar-stat-group">
            <div className="bar-header">
              <span>{isHi ? "मुनाफा मार्जिन (Profit Margin)" : "Profit Margin"}</span>
              <strong className="text-green">{profitMargin}%</strong>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill green"
                style={{ width: `${Math.min(100, Math.max(0, profitMargin))}%` }}
              />
            </div>
            <p className="bar-expl">
              {isHi
                ? `हर ₹100 का सामान बेचने पर आप लगभग ₹${profitMargin} बचा रहे हैं।`
                : `For every ₹100 worth of sales, ₹${profitMargin} is kept as your clean profit.`}
            </p>
          </div>

          <div className="bar-stat-group" style={{ marginTop: "20px" }}>
            <div className="bar-header">
              <span>{isHi ? "खर्च का अनुपात (Expense Ratio)" : "Expense Ratio"}</span>
              <strong className={expenseRatio > 70 ? "text-amber" : "text-blue"}>
                {expenseRatio}%
              </strong>
            </div>
            <div className="progress-track">
              <div
                className={`progress-fill ${expenseRatio > 70 ? "amber" : "blue"}`}
                style={{ width: `${Math.min(100, Math.max(0, expenseRatio))}%` }}
              />
            </div>
            <p className="bar-expl">
              {isHi
                ? `आपकी कमाई का ${expenseRatio}% हिस्सा लागत और खर्चे में जा रहा है।`
                : `${expenseRatio}% of gross income is spent on running costs and materials.`}
            </p>
          </div>
        </div>

        <div className="detail-card">
          <div className="detail-card-head">
            <div>
              <h3>{isHi ? "ब्रेक-ईवन बिक्री (Break-Even)" : "Break-Even Sales Target"}</h3>
              <p>{isHi ? "खर्च निकालने के लिए न्यूनतम जरूरी बिक्री" : "Sales needed just to cover costs"}</p>
            </div>
          </div>

          <div className="break-even-box">
            <span className="be-label">{isHi ? "महीने का ब्रेक-ईवन लक्ष्य" : "Monthly Break-Even Target"}</span>
            <div className="be-value">{formatCurrency(breakEven)}</div>
            <p className="be-desc">
              {isHi ? (
                <>
                  हर महीने कम से कम <strong>{formatCurrency(breakEven)}</strong> की बिक्री होना ज़रूरी है
                  ताकि आपके खर्चे निकल सकें। इस आंकड़े से जितनी ज़्यादा बिक्री होगी, वह सब आपका
                  <strong> शुद्ध मुनाफा</strong> होगा।
                </>
              ) : (
                <>
                  You must sell at least <strong>{formatCurrency(breakEven)}</strong> each month to cover
                  all fixed and operational expenses. Every rupee sold beyond this number is your
                  <strong> pure profit</strong>.
                </>
              )}
            </p>
          </div>

          <div className="quick-stats-row">
            <div className="q-stat">
              <span>{isHi ? "महीने का अधिशेष (Surplus)" : "Monthly Cash Surplus"}</span>
              <strong>{formatCurrency(surplus)}</strong>
            </div>
            <div className="q-stat">
              <span>{isHi ? "वित्तीय स्थिति (Strength)" : "Financial Strength"}</span>
              <strong className={strength === "Strong" ? "text-green" : "text-amber"}>
                {strength === "Strong" ? (isHi ? "मजबूत (Strong)" : "Strong") : strength}
              </strong>
            </div>
            <div className="q-stat">
              <span>{isHi ? "वित्तीय जोखिम (Risk)" : "Financial Risk"}</span>
              <strong className={finRisk === "Low" ? "text-green" : "text-amber"}>
                {finRisk === "Low" ? (isHi ? "कम (Low)" : "Low") : finRisk}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Practical tip for Low-English users */}
      <div className="village-tip-banner">
        <div>
          <h4>{isHi ? "गाँव के व्यापारी के लिए आसान सलाह:" : "Practical Money Tip:"}</h4>
          <p>
            {isHi
              ? "दुकान या फार्म में हमेशा अपनी कच्ची पर्ची या डायरी में रोज़ का खर्चा लिखें। कोशिश करें कि उधारी सीमित रखें और माल थोक मंडी से सीधे नकद में कम दाम पर खरीदें।"
              : "Keep a daily ledger of expenses. Limit customer credit (udhaar) to trusted buyers, and buy raw materials in bulk directly from main wholesale mandis to save 5-10% extra."}
          </p>
        </div>
      </div>
    </div>
  );
}
