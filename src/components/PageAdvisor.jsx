import { useState } from "react";
import { getAdvisorAdvice } from "../advisorLogic";
import { speakText, stopSpeaking } from "../utils/speech";

export default function PageAdvisor({ result, lang }) {
  const isHi = lang === "hi";

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  const suggestedQuestions = [
    {
      en: "Is this business profitable?",
      hi: "क्या इस व्यापार में फायदा होगा?",
    },
    {
      en: "Can I afford this monthly loan EMI?",
      hi: "क्या मैं महीने की किश्त आसानी से भर पाऊंगा?",
    },
    {
      en: "How can I reduce my business expenses?",
      hi: "दुकान/फार्म का खर्च कैसे कम करूँ?",
    },
    {
      en: "What are the biggest risks?",
      hi: "इस व्यापार में सबसे बड़ा खतरा क्या है?",
    },
    {
      en: "How to get more customers in my village?",
      hi: "गाँव में ज़्यादा ग्राहक कैसे जोड़ें?",
    },
    {
      en: "Which documents do I need for a bank loan?",
      hi: "बैंक लोन के लिए कौन से कागज़ात चाहिए?",
    },
  ];

  const handleAsk = (queryText) => {
    const q = queryText || question;
    if (!q || !q.trim()) {
      setError(isHi ? "कृपया पहले अपना सवाल लिखें या नीचे से चुनें।" : "Please enter a question or click one below.");
      return;
    }

    setError("");
    setLoading(true);
    stopSpeaking();
    setIsSpeaking(false);

    try {
      const resp = getAdvisorAdvice({
        question: q,
        business_name: result.business,
        category: result.category,
        monthly_revenue: result.financial_analysis?.monthly_revenue,
        monthly_expenses: result.financial_analysis?.monthly_expenses,
        monthly_profit: result.financial_analysis?.monthly_profit,
        roi_percentage: result.financial_analysis?.roi_percentage,
        feasibility: result.feasibility,
        financial_risk: result.advanced_financial_analysis?.financial_risk,
        overall_risk_level: result.risk_analysis?.overall_risk_level,
        affordability_status: result.loan_affordability?.affordability_status,
        monthly_emi: result.loan_affordability?.monthly_emi,
        local_demand: result.hyper_local_profile?.local_demand,
        competition_level: result.hyper_local_profile?.competition_level,
      });

      setAnswer(resp.answer);
    } catch (err) {
      console.error(err);
      setError(isHi ? "सलाहकार से जवाब प्राप्त करने में समस्या आई।" : "Unable to retrieve advisor response.");
    } finally {
      setLoading(false);
    }
  };

  const handleSpeechToggle = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else if (answer) {
      const ok = speakText(answer, isHi ? "hi-IN" : "en-IN");
      if (ok) setIsSpeaking(true);
    }
  };

  return (
    <div className="side-page-content">
      <div className="page-header-banner">
        <div className="page-header-text">
          <span className="page-badge-pill">
            {isHi ? "पेज 10 • AI व्यापार साथी" : "Page 10 • AI Business Advisor"}
          </span>
          <h2>{isHi ? "अपने व्यापार का कोई भी सवाल पूछें" : "Interactive Business Advisor"}</h2>
          <p className="page-sub-desc">
            {isHi
              ? "मुनाफा, लोन, किश्त, ग्राहक या खर्चे के बारे में कोई भी सवाल सरल भाषा में पूछें और तुरंत सही जवाब पाएं।"
              : "Ask questions about your profit, EMI, costs, or growth in simple everyday language."}
          </p>
        </div>

        <div className="govt-emblem-badge">
          <div>
            <strong>{isHi ? "24x7 साथी" : "Always Ready"}</strong>
            <small>{isHi ? "तुरंत सहायता" : "Instant Guidance"}</small>
          </div>
        </div>
      </div>

      {/* Suggested 1-Click Questions for Low-English users */}
      <div className="detail-card">
        <div className="detail-card-head">
          <div>
            <h3>{isHi ? "सुझाए गए सवाल (एक क्लिक में पूछें)" : "Suggested Questions (1-Click to Ask)"}</h3>
            <p>{isHi ? "नीचे किसी भी सवाल पर क्लिक करें और तुरंत जवाब देखें" : "Tap any question pill below to get immediate insights"}</p>
          </div>
        </div>

        <div className="chips-container">
          {suggestedQuestions.map((sq, idx) => (
            <button
              key={idx}
              type="button"
              className="question-chip-btn"
              onClick={() => {
                setQuestion(isHi ? sq.hi : sq.en);
                handleAsk(isHi ? sq.hi : sq.en);
              }}
              disabled={loading}
            >
              <span>{isHi ? sq.hi : sq.en}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Question Form */}
      <div className="detail-card">
        <div className="detail-card-head">
          <div>
            <h3>{isHi ? "अपना खुद का सवाल लिखें" : "Ask Your Own Question"}</h3>
            <p>{isHi ? "जैसे: क्या मुझे यह काम शुरू करना चाहिए?" : "Type any question about your numbers"}</p>
          </div>
        </div>

        <form
          className="advisor-box-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
        >
          <textarea
            className="advisor-textarea"
            rows="3"
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              setError("");
            }}
            placeholder={
              isHi
                ? "यहाँ अपना सवाल लिखें (जैसे: क्या मुझे बैंक से लोन मिल जाएगा?)..."
                : "Type your question here (e.g., Can I afford this EMI?)..."
            }
            disabled={loading}
          />

          <div className="advisor-form-footer">
            <button
              type="submit"
              className="advisor-submit-btn"
              disabled={loading}
            >
              {loading
                ? isHi
                  ? "जवाब तैयार हो रहा है..."
                  : "Consulting Data..."
                : isHi
                ? "सलाहकार से पूछें (Ask Now)"
                : "Ask Advisor"}
            </button>

            {answer && (
              <button
                type="button"
                className={`voice-listen-btn ${isSpeaking ? "speaking" : ""}`}
                onClick={handleSpeechToggle}
              >
                {isSpeaking
                  ? isHi
                    ? "आवाज़ बंद करें"
                    : "Stop Voice"
                  : isHi
                  ? "बोलकर सुनाएं"
                  : "Read Aloud in Voice"}
              </button>
            )}
          </div>
        </form>

        {error && <div className="error-box-small">{error}</div>}
      </div>

      {/* Answer Box */}
      {answer && (
        <div className="advisor-response-card">
          <div className="resp-card-top">
            <div className="resp-tag">
              <strong>{isHi ? "व्यापार सलाहकार का परामर्श" : "Advisor Response"}</strong>
            </div>

            <button
              type="button"
              className="resp-audio-btn"
              onClick={handleSpeechToggle}
              title="Listen in speech"
            >
              {isSpeaking ? "Stop" : "Listen"}
            </button>
          </div>

          <div className="resp-body-text">
            <p>{answer}</p>
          </div>

          <div className="resp-footer-note">
            {isHi ? "यह सलाह आपके द्वारा भरे गए आंकड़ों और स्थानीय बाज़ार नियमों पर आधारित है।" : "Guidance is generated based on your inputs and hyper-local benchmark rules."}
          </div>
        </div>
      )}
    </div>
  );
}
