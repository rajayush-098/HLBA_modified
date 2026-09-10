import { useState, useRef, useEffect } from "react";

let msgCounter = 1;
function getNextId(prefix) {
  msgCounter += 1;
  return `${prefix}-${msgCounter}`;
}

export default function SmrityAssistant({ currentResult, lang }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome-1",
      sender: "sahyogi",
      text:
        lang === "hi"
          ? "नमस्ते! मैं सहयोगी (SAHYOGI) हूँ। आप मुझसे इस बिज़नेस के बारे में, सरकारी लोन, मुनाफ़े का गणित या कोई भी सामान्य सवाल पूछ सकते हैं। बताइए मैं क्या मदद करूँ?"
          : "Hello! I am SAHYOGI, your business companion. You can ask me anything about your business feasibility, govt loans, profits, or any general question. How can I help you?",
      time: "Online",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const quickQuestions =
    lang === "hi"
      ? [
          "दुकान में बिक्री कैसे बढ़ाएं?",
          "मुद्रा लोन के नियम क्या हैं?",
          "कम पूँजी में कौन सा काम अच्छा रहेगा?",
          "सहयोगी, तुम कौन हो?",
        ]
      : [
          "How to increase shop sales?",
          "What are Mudra loan rules?",
          "Best business with low investment?",
          "Sahyogi, who are you?",
        ];

  const handleSend = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    const userMsg = {
      id: getNextId("user"),
      sender: "user",
      text,
      time: "Sent",
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText("");
    setLoading(true);

    try {
      // Pass business context if user is analyzing one
      const context = currentResult
        ? {
            business_name: currentResult.business || "Micro Enterprise",
            category: currentResult.category,
            district: currentResult.district,
            monthly_profit: currentResult.financial_analysis?.monthly_profit,
            feasibility: currentResult.feasibility,
          }
        : null;

      const res = await fetch("/api/sahyogi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          context,
        }),
      });

      const data = await res.json();
      const replyText =
        data.reply ||
        (lang === "hi"
          ? "माफ़ कीजिए, मुझे उत्तर देने में परेशानी हुई। कृपया दोबारा पूछें।"
          : "Sorry, I had trouble answering. Please ask again.");

      setMessages((prev) => [
        ...prev,
        {
          id: getNextId("sahyogi"),
          sender: "sahyogi",
          text: replyText,
          time: "Replied",
        },
      ]);
    } catch (err) {
      console.error("Sahyogi fetch error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: getNextId("sahyogi-err"),
          sender: "sahyogi",
          text:
            lang === "hi"
              ? "नेटवर्क में थोड़ी दिक्कत लग रही है। कृपया एक बार दोबारा पूछें।"
              : "Network glitch. Please try asking again.",
          time: "Notice",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="smrity-container" id="smrity-widget">
      {/* Chat Popup Box */}
      {isOpen && (
        <div className="smrity-popup" role="dialog" aria-label="SAHYOGI Assistant">
          {/* Header - Student project feel */}
          <div className="smrity-header">
            <div className="smrity-header-left">
              <div className="smrity-avatar">S</div>
              <div>
                <h4 className="smrity-title">{lang === "hi" ? "सहयोगी (SAHYOGI)" : "SAHYOGI (सहयोगी)"}</h4>
                <p className="smrity-subtitle">
                  {lang === "hi" ? "आपका व्यापार साथी • कुछ भी पूछें" : "Business Sathi • Ask Anything"}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="smrity-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close SAHYOGI"
            >
              ✕
            </button>
          </div>

          {/* Messages Body */}
          <div className="smrity-messages">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`smrity-msg-row ${m.sender === "user" ? "user-row" : "smrity-row"}`}
              >
                {m.sender !== "user" && <div className="smrity-mini-avatar">S</div>}
                <div className={`smrity-bubble ${m.sender === "user" ? "user-bubble" : "smrity-bubble-ai"}`}>
                  <p className="smrity-text">{m.text}</p>
                  <span className="smrity-time">{m.time}</span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="smrity-msg-row smrity-row">
                <div className="smrity-mini-avatar">S</div>
                <div className="smrity-bubble smrity-bubble-ai loading-bubble">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Question suggestions */}
          <div className="smrity-chips-scroll">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                className="smrity-chip"
                onClick={() => handleSend(q)}
                disabled={loading}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="smrity-footer">
            <input
              type="text"
              className="smrity-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={lang === "hi" ? "सहयोगी से सवाल पूछें..." : "Ask SAHYOGI anything..."}
              disabled={loading}
            />
            <button
              type="button"
              className="smrity-send-btn"
              onClick={() => handleSend()}
              disabled={!inputText.trim() || loading}
            >
              {lang === "hi" ? "भेजें" : "Send"}
            </button>
          </div>
        </div>
      )}

      {/* Floating Trigger Button (Bottom Right Circle) */}
      <button
        type="button"
        id="smrity-trigger-btn"
        className={`smrity-trigger-button ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        title={isOpen ? (lang === "hi" ? "सहयोगी बंद करें" : "Close SAHYOGI") : (lang === "hi" ? "सहयोगी से सवाल पूछें" : "Ask SAHYOGI")}
      >
        <span className="smrity-trigger-badge">{isOpen ? "✕" : "S"}</span>
        <span className="smrity-trigger-subtext">SAHYOGI</span>
      </button>
    </div>
  );
}
