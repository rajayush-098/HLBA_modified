import {
  HelpCircle,
  Compass,
  Store,
  TrendingUp,
  Coins,
  FileText,
  MapPin,
  Mic,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ChevronUp,
  X,
  Lightbulb,
} from "lucide-react";

export default function AboutUsSection({ lang = "hi", onClose }) {
  const isHi = lang === "hi";

  const practicalQuestions = isHi
    ? [
        "क्या यह व्यवसाय मेरे इलाके और गाँव के लिए उपयुक्त है?",
        "यहाँ किस प्रकार की स्थानीय माँग या बाज़ार के अवसर उपलब्ध हैं?",
        "इस काम को शुरू करने के लिए कुल कितनी पूँजी की आवश्यकता होगी?",
        "अपनी जेब से (मार्जिन पूँजी) कितना लगाना पड़ सकता है?",
        "मेरे लिए कौन सी सरकारी ऋण योजनाएँ या सब्सिडी प्रासंगिक हो सकती हैं?",
        "बैंक ऋण की संभावित मासिक किश्त (EMI) और भुगतान शर्तें क्या हो सकती हैं?",
        "आस-पास कौन से बाज़ार संसाधन, मंडियाँ व बुनियादी ढाँचा उपलब्ध हैं?",
        "अपनी मेहनत की पूँजी लगाने से पहले किन मुख्य जोखिमों पर विचार करना चाहिए?",
      ]
    : [
        "Is this business suitable for my location?",
        "What kind of local demand or market opportunity exists?",
        "How much money will I need to start?",
        "How much of my own capital may be required?",
        "What financing options or government schemes may be relevant?",
        "What could my repayment obligations look like?",
        "What local infrastructure and market resources are available?",
        "What factors should I consider before investing my money?",
      ];

  const helpCapabilities = [
    {
      icon: <HelpCircle className="w-5 h-5 text-emerald-600" />,
      title: isHi ? "AI व्यापार सलाहकार" : "AI Business Advisor",
      badge: isHi ? "संवादात्मक मार्गदर्शन" : "Conversational Support",
      desc: isHi
        ? "उपयोगकर्ताओं को अपने व्यावसायिक विचार, वित्त, संचालन और योजना के बारे में स्वाभाविक बातचीत के माध्यम से प्रश्न पूछने की सुविधा देता है। यह स्थिति को सरल शब्दों में समझने के लिए एक निर्णय-सहयोग उपकरण है, न कि किसी पेशेवर वित्तीय सलाहकार या बैंक का विकल्प।"
        : "Allows users to ask questions about their business idea, finances, operations, and planning in a conversational way. Designed as a decision-support tool to understand business situations in simpler terms, not as a replacement for qualified financial advisors or authorities.",
      disclaimer: isHi
        ? "निर्णय-सहयोग टूल • पेशेवर सलाह का विकल्प नहीं"
        : "Decision-support tool • Not a substitute for formal banking appraisal",
    },
    {
      icon: <Coins className="w-5 h-5 text-amber-600" />,
      title: isHi ? "वित्तीय व ऋण नियोजन" : "Financial & Loan Planning",
      badge: isHi ? "पारदर्शी गणना" : "Deterministic Math",
      desc: isHi
        ? "उपलब्ध पूँजी, अनुमानित प्रोजेक्ट लागत, संभावित बिक्री, परिचालन खर्च और ऋण आवश्यकताओं का विश्लेषण कर संभावित फंडिंग और किश्त परिदृश्यों को समझने में मदद करता है ताकि पूँजी लगाने से पहले वित्तीय तस्वीर स्पष्ट हो सके।"
        : "Uses available capital, estimated project cost, expected sales, and expenses to help users understand possible funding requirements and repayment scenarios before committing money or taking debt.",
      disclaimer: isHi
        ? "कोई ऋण गारंटी या स्वीकृति का दावा नहीं करता"
        : "Does not guarantee loans, loan approvals, or provide lending directly",
    },
    {
      icon: <FileText className="w-5 h-5 text-blue-600" />,
      title: isHi ? "सरकारी योजना व सहायता खोज" : "Government Scheme & Support Discovery",
      badge: isHi ? "प्रारंभिक स्क्रीनिंग" : "Preliminary Screening",
      desc: isHi
        ? "प्रदान की गई जानकारी के आधार पर मुद्रा, PMEGP, PMFME, स्टैंड-अप इंडिया जैसी संभावित प्रासंगिक सरकारी योजनाओं व दिशानिर्देशों की पहचान करता है ताकि उद्यमी सही पोर्टल या बैंक शाखा से संपर्क कर सकें।"
        : "Helps users identify potentially relevant government schemes and credit support options based on business profiles, guiding users toward appropriate official portals and member lending institutions.",
      disclaimer: isHi
        ? "अंतिम पात्रता व शर्तें बैंक/मंत्रालय सत्यापन पर निर्भर हैं"
        : "Eligibility, limits, interest rates, and rules require official bank verification",
    },
    {
      icon: <MapPin className="w-5 h-5 text-rose-600" />,
      title: isHi ? "हाइपर-लोकल बाज़ार व इंफ्रास्ट्रक्चर विश्लेषण" : "Hyper-Local Market & Infrastructure Insights",
      badge: isHi ? "भू-स्थानिक अनुसंधान" : "Spatial Research",
      desc: isHi
        ? "हाइपर-लोकल स्कैनर के माध्यम से चयनित स्थान के 10-50 किमी दायरे में बैंकों, मंडियों, वेयरहाउस और मौजूद व्यापारिक माहौल को समझने में सहायता करता है ताकि ज़मीनी परिवेश की स्पष्ट जानकारी मिल सके।"
        : "The Hyper-Local Market & Infrastructure Scanner helps users investigate their chosen location, exploring local market surroundings, nearby infrastructure, financial institutions, and business density.",
      disclaimer: isHi
        ? "स्थानीय परिवेश को समझने का टूल • लाभ या सफलता की गारंटी नहीं"
        : "A research tool for local business environments • Does not predict demand or success",
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-indigo-600" />,
      title: isHi ? "बाज़ार व मंडी जानकारी" : "Market / Mandi Information",
      badge: isHi ? "लाइव डेटा संदर्भ" : "External Data Insights",
      desc: isHi
        ? "जहाँ लाइव या बाहरी डेटा स्रोत उपलब्ध हैं, वहाँ कृषि उपज, डेयरी व आवश्यक वस्तुओं की संदर्भ कीमतों तक पहुँचने में मदद करता है ताकि उद्यमी बाज़ार के रुख को समझ सकें।"
        : "Where live or external data sources are available, the platform helps users access relevant commodity benchmarks and mandi price series to better comprehend prevailing market trends.",
      disclaimer: isHi
        ? "डेटा की उपलब्धता व ताज़गी बाहरी स्रोतों पर निर्भर है"
        : "External data depends on the freshness and availability of source datasets",
    },
    {
      icon: <Mic className="w-5 h-5 text-teal-600" />,
      title: isHi ? "आवाज़ आधारित संवाद" : "Voice-Based Interaction",
      badge: isHi ? "सुलभता व पहुंच" : "Accessibility & Ease",
      desc: isHi
        ? "व्यवसाय सहायता को आवाज़ के माध्यम से आसान बनाता है, जो विशेष रूप से उन उपयोगकर्ताओं के लिए उपयोगी है जो टाइप करने के बजाय बोलकर जानकारी प्राप्त करना अधिक सुविधाजनक मानते हैं।"
        : "Aims to make business assistance accessible through voice interaction, particularly beneficial for entrepreneurs who are more comfortable speaking than typing complex queries.",
      disclaimer: isHi
        ? "सुलभता व उपयोगिता हेतु निर्मित"
        : "Built for accessibility and user convenience",
    },
  ];

  const differentiators = [
    {
      icon: <Layers className="w-5 h-5 text-emerald-600" />,
      title: isHi ? "बिखरी जानकारी के बजाय एक एकीकृत मंच" : "One Platform Instead of Scattered Information",
      desc: isHi
        ? "अलग-अलग वेबसाइटों, कैलकुलेटरों, सरकारी पोर्टलों और बाज़ार सूचियों के बीच भटकने के बजाय उद्यमी को महत्वपूर्ण निर्णय-सहायता एक ही सहज इंटरफ़ेस में मिलती है।"
        : "Entrepreneurs otherwise need to navigate between disparate websites, loan calculators, scheme portals, and market datasets. Vyapaar AI brings these critical parts into a single coherent interface.",
    },
    {
      icon: <Compass className="w-5 h-5 text-sky-600" />,
      title: isHi ? "संदर्भ-आधारित मार्गदर्शन" : "Context-Aware Assistance",
      desc: isHi
        ? "केवल सामान्य किताबी ज्ञान देने के बजाय यह उद्यमी द्वारा दर्ज व्यवसाय प्रकार, पूँजी, अपेक्षित बिक्री, खर्च और स्थान को ध्यान में रखकर प्रासंगिक गणनाएँ प्रस्तुत करता है।"
        : "Instead of generic boilerplates, Vyapaar AI factors in user-entered business type, capital, expected revenue, operating expenses, and local geography to deliver grounded calculations.",
    },
    {
      icon: <Store className="w-5 h-5 text-amber-600" />,
      title: isHi ? "स्थानीय व ग्रामीण व्यापार पर केंद्रित" : "Local & Rural Business Focus",
      desc: isHi
        ? "बड़े कॉरपोरेट विश्लेषण के स्थान पर यह सूक्ष्म, छोटे और ग्रामीण उद्यमियों के व्यावहारिक सवालों—जैसे कम पूँजी में शुरुआत, गाँव की माँग और दैनिक नकदी प्रवाह—पर ध्यान देता है।"
        : "Designed specifically around small businesses, rural enterprises, and aspiring grassroots founders, addressing practical questions rather than only corporate-scale analytics.",
    },
    {
      icon: <Sparkles className="w-5 h-5 text-purple-600" />,
      title: isHi ? "स्वाभाविक बातचीत (Conversational AI)" : "Conversational AI in Natural Language",
      desc: isHi
        ? "जटिल वित्तीय शब्दावली के बिना सीधे प्रश्न पूछें, जैसे: 'मेरे पास ₹1 लाख हैं, क्या मैं यह काम शुरू कर सकता हूँ?' और सरल भाषा में विश्लेषण प्राप्त करें।"
        : "Users interact using natural-language questions (e.g. 'I have ₹1 lakh available, can I start this business?') without needing prior mastery of complex financial jargon.",
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-emerald-700" />,
      title: isHi ? "जानकारी से निर्णय सहयोग तक" : "From Information to Decision Support",
      desc: isHi
        ? "मंच का उद्देश्य केवल डेटा दिखाना नहीं है, बल्कि उस डेटा को व्यवसाय के संदर्भ में समझाना है ताकि उद्यमी स्वयं सोच-समझकर आत्मनिर्भर निर्णय ले सकें। अंतिम निर्णय उद्यमी का ही होता है।"
        : "The platform does not merely display static metrics; it helps entrepreneurs understand the numbers in the context of their venture so they can make their own informed choices. The founder remains fully responsible for their final decision.",
    },
  ];

  return (
    <section className="about-us-section-root" style={{ width: "100%", margin: "24px 0 0 0" }}>
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #cbd5e1",
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.04)",
          overflow: "hidden",
        }}
      >
        {/* Header Ribbon */}
        <div
          style={{
            padding: "24px 28px",
            background: "linear-gradient(135deg, #0f382a 0%, #15573f 100%)",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  color: "#a7f3d0",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  border: "1px solid rgba(167, 243, 208, 0.3)",
                }}
              >
                {isHi ? "हमारे बारे में • प्लेटफॉर्म परिचय" : "About Us • Platform Overview"}
              </span>
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: "26px",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>Vyapaa<span style={{ color: "#fbbf24" }}>₹</span> AI</span>
            </h2>
            <p
              style={{
                margin: "6px 0 0 0",
                fontSize: "14px",
                color: "#d1fae5",
                fontWeight: 500,
              }}
            >
              {isHi
                ? "व्यावसायिक जानकारी को समझने और निर्णय लेने में आसान बनाना।"
                : "Making business information easier to understand and act upon."}
            </p>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                color: "#ffffff",
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.25)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.12)";
              }}
              aria-label="Collapse About Us"
            >
              <X size={15} />
              <span>{isHi ? "बंद करें" : "Close"}</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div style={{ padding: "28px", color: "#1e293b", lineHeight: 1.65 }}>
          {/* 1. Introductory Core Statement */}
          <div
            style={{
              padding: "18px 20px",
              backgroundColor: "#f8fafc",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              marginBottom: "28px",
            }}
          >
            <p
              style={{
                margin: "0 0 12px 0",
                fontSize: "15px",
                fontWeight: 600,
                color: "#0f172a",
              }}
            >
              {isHi
                ? "Vyapaar AI एक AI-संचालित व्यावसायिक सहायता प्लेटफ़ॉर्म है, जिसे छोटे, ग्रामीण और महत्वाकांक्षी उद्यमियों को सोच-समझकर बेहतर व्यावसायिक निर्णय लेने में मदद करने के लिए डिज़ाइन किया गया है।"
                : "Vyapaar AI is an AI-powered business assistance platform designed to help small, rural, and aspiring entrepreneurs make better-informed business decisions."}
            </p>
            <p style={{ margin: "0 0 12px 0", fontSize: "13.5px", color: "#475569" }}>
              {isHi
                ? "कोई भी नया व्यापार शुरू करना या चलाना केवल एक अच्छे विचार तक सीमित नहीं होता। उद्यमियों को रोज़मर्रा के व्यावहारिक सवालों के जवाब ढूँढने पड़ते हैं:"
                : "Starting or running a business is not only about having a good idea. Entrepreneurs frequently need to resolve practical questions such as:"}
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "8px 16px",
                margin: "12px 0",
              }}
            >
              {practicalQuestions.map((q, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "12.5px",
                    color: "#334155",
                  }}
                >
                  <CheckCircle2 size={15} style={{ color: "#16a34a", flexShrink: 0, marginTop: "2px" }} />
                  <span>{q}</span>
                </div>
              ))}
            </div>

            <p style={{ margin: "14px 0 0 0", fontSize: "13.5px", color: "#0f382a", fontWeight: 600 }}>
              {isHi
                ? "कई छोटे उद्यमियों के लिए इन जानकारियों को विभिन्न स्रोतों से जुटाना कठिन, समय लेने वाला और भ्रमित करने वाला होता है। व्यापार AI इन्हीं निर्णय-सहायता क्षमताओं को एक सुलभ मंच पर साथ लाता है।"
                : "For many small entrepreneurs, gathering all this information from different sources can be difficult, time-consuming, and confusing. Vyapaar AI brings several of these decision-support capabilities together in one platform."}
            </p>
          </div>

          {/* 2. The Problem & Our Approach in Two Columns */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "20px",
              marginBottom: "32px",
            }}
          >
            {/* The Problem */}
            <div
              style={{
                backgroundColor: "#fff7ed",
                padding: "20px",
                borderRadius: "12px",
                border: "1px solid #fed7aa",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <div
                  style={{
                    padding: "6px",
                    backgroundColor: "#ffedd5",
                    borderRadius: "8px",
                    color: "#c2410c",
                  }}
                >
                  <Lightbulb size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#9a3412" }}>
                  {isHi ? "समस्या (The Problem)" : "The Problem"}
                </h3>
              </div>
              <p style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#7c2d12", lineHeight: 1.6 }}>
                {isHi
                  ? "छोटे और ग्रामीण उद्यमी अक्सर एक बिखरे हुए सूचना परिदृश्य का सामना करते हैं। व्यापार योजना, वित्त पोषण, सरकारी सहायता, स्थानीय बाज़ार की माँग और इंफ्रास्ट्रक्चर से जुड़ी महत्वपूर्ण जानकारी अलग-अलग पोर्टलों और फाइलों में बिखरी होती है।"
                  : "Small entrepreneurs often face a fragmented information landscape. Crucial details regarding business planning, financing, government support, local markets, and infrastructure exist scattered across multiple sources."}
              </p>
              <p style={{ margin: 0, fontSize: "13px", color: "#7c2d12", lineHeight: 1.6 }}>
                {isHi
                  ? "पहली बार व्यवसाय शुरू करने वाले व्यक्ति के लिए इस जानकारी को खोजना, समझना और जोड़ना चुनौतीपूर्ण होता है। व्यापार AI इसी जटिलता को कम करने का एक ईमानदार प्रयास है।"
                  : "For first-time founders, finding, comprehending, and synthesizing these moving pieces can be daunting. Vyapaar AI attempts to reduce this friction by bringing relevant capabilities into one accessible interface."}
              </p>
            </div>

            {/* Our Approach */}
            <div
              style={{
                backgroundColor: "#ecfdf5",
                padding: "20px",
                borderRadius: "12px",
                border: "1px solid #a7f3d0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <div
                  style={{
                    padding: "6px",
                    backgroundColor: "#d1fae5",
                    borderRadius: "8px",
                    color: "#047857",
                  }}
                >
                  <Compass size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#065f46" }}>
                  {isHi ? "हमारा दृष्टिकोण (Our Approach)" : "Our Approach"}
                </h3>
              </div>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#047857",
                  marginBottom: "8px",
                  letterSpacing: "0.02em",
                }}
              >
                {isHi ? "“सरल बनाएं • जोड़ें • सहायता करें”" : "“Simplify. Connect. Assist.”"}
              </div>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12.8px", color: "#064e3b" }}>
                <li style={{ marginBottom: "6px" }}>
                  <strong>{isHi ? "सरल बनाएं (Simplify)" : "Simplify"}</strong> —{" "}
                  {isHi
                    ? "जटिल व्यावसायिक और वित्तीय गणनाओं को समझने में आसान बनाना।"
                    : "Make complicated business and financial information easier to understand."}
                </li>
                <li style={{ marginBottom: "6px" }}>
                  <strong>{isHi ? "जोड़ें (Connect)" : "Connect"}</strong> —{" "}
                  {isHi
                    ? "व्यापार, वित्त, बाज़ार, इंफ्रास्ट्रक्चर और सरकारी सहायता की कड़ियों को एक मंच पर लाना।"
                    : "Bring relevant business, financial, market, infrastructure, and support information together."}
                </li>
                <li>
                  <strong>{isHi ? "सहायता करें (Assist)" : "Assist"}</strong> —{" "}
                  {isHi
                    ? "उद्यमी को अपने प्रश्नों का विश्लेषण करने और निर्णय लेने से पूर्व परिदृश्य समझने में AI द्वारा सहयोग देना।"
                    : "Use AI to help users explore their questions and understand possible scenarios before making important business decisions."}
                </li>
              </ul>
            </div>
          </div>

          {/* 3. How Vyapaar AI Can Help */}
          <div style={{ marginBottom: "36px" }}>
            <div style={{ marginBottom: "16px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "#059669",
                  letterSpacing: "0.05em",
                }}
              >
                {isHi ? "मुख्य क्षमताएँ" : "Core Capabilities"}
              </span>
              <h3 style={{ margin: "2px 0 0 0", fontSize: "20px", fontWeight: 800, color: "#0f172a" }}>
                {isHi ? "व्यापार AI कैसे मदद कर सकता है?" : "How Can Vyapaar AI Help?"}
              </h3>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
                gap: "16px",
              }}
            >
              {helpCapabilities.map((cap, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    padding: "18px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "12px",
                      }}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          backgroundColor: "#f1f5f9",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {cap.icon}
                      </div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          backgroundColor: "#f8fafc",
                          color: "#475569",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        {cap.badge}
                      </span>
                    </div>

                    <h4 style={{ margin: "0 0 8px 0", fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                      {cap.title}
                    </h4>

                    <p style={{ margin: 0, fontSize: "12.8px", color: "#475569", lineHeight: 1.6 }}>
                      {cap.desc}
                    </p>
                  </div>

                  <div
                    style={{
                      marginTop: "14px",
                      paddingTop: "10px",
                      borderTop: "1px solid #f1f5f9",
                      fontSize: "11px",
                      color: "#64748b",
                      fontStyle: "italic",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span>ℹ️</span>
                    <span>{cap.disclaimer}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. What Makes Vyapaar AI Different? */}
          <div style={{ marginBottom: "32px" }}>
            <div style={{ marginBottom: "16px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "#0284c7",
                  letterSpacing: "0.05em",
                }}
              >
                {isHi ? "विशिष्ट दृष्टिकोण" : "Distinctive Design"}
              </span>
              <h3 style={{ margin: "2px 0 6px 0", fontSize: "20px", fontWeight: 800, color: "#0f172a" }}>
                {isHi ? "व्यापार AI को क्या अलग बनाता है?" : "What Makes Vyapaar AI Different?"}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "13.5px",
                  color: "#334155",
                  fontWeight: 500,
                }}
              >
                {isHi
                  ? "कई मौजूदा प्लेटफॉर्म केवल एक ही कार्य पर ध्यान केंद्रित करते हैं (जैसे केवल लोन कैलकुलेटर या केवल सामान्य जानकारी)। व्यापार AI को छोटे उद्यमी की निर्णय लेने की पूरी यात्रा को ध्यान में रखकर तैयार किया गया है।"
                  : "Many existing business, finance, or information platforms focus on one particular function. Vyapaar AI is designed around the broader decision-making journey of a small entrepreneur."}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
                gap: "14px",
              }}
            >
              {differentiators.map((diff, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: "#f8fafc",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    padding: "16px 18px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <div
                      style={{
                        padding: "4px",
                        backgroundColor: "#ffffff",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0",
                        display: "flex",
                      }}
                    >
                      {diff.icon}
                    </div>
                    <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                      {diff.title}
                    </h4>
                  </div>
                  <p style={{ margin: "6px 0 0 0", fontSize: "12.5px", color: "#475569", lineHeight: 1.6 }}>
                    {diff.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Important Transparency Statement / Disclaimer */}
          <div
            style={{
              padding: "16px 20px",
              backgroundColor: "#f1f5f9",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
            }}
          >
            <ShieldCheck size={20} style={{ color: "#475569", flexShrink: 0, marginTop: "2px" }} />
            <div style={{ fontSize: "12px", color: "#334155", lineHeight: 1.6 }}>
              <strong>{isHi ? "महत्वपूर्ण सूचना व पारदर्शिता अस्वीकरण:" : "Important Transparency Statement:"}</strong>{" "}
              {isHi
                ? "व्यापार AI एक निर्णय-सहयोग और सूचना मंच है। इसके परिणाम उपयोगकर्ता द्वारा प्रदान की गई जानकारी और बाहरी डेटा स्रोतों पर निर्भर करते हैं और इन्हें गारंटीकृत वित्तीय, कानूनी, निवेश, ऋण या सरकारी सलाह नहीं माना जाना चाहिए। उपयोगकर्ताओं को कोई भी वित्तीय या व्यावसायिक निर्णय लेने से पहले संबंधित आधिकारिक या पेशेवर स्रोत से महत्वपूर्ण जानकारी, पात्रता शर्तों, ब्याज दरों, सीमाओं और अन्य नियमों का सत्यापन स्वयं करना चाहिए।"
                : "Vyapaar AI is a decision-support and information platform. Its outputs may depend on user-provided information and external data sources and should not be treated as guaranteed financial, legal, investment, loan, or government advice. Users should verify important information, eligibility requirements, rates, limits, and other conditions with the relevant official or professional source before making financial or business decisions."}
            </div>
          </div>

          {/* Bottom Close Button */}
          {onClose && (
            <div style={{ marginTop: "20px", textAlign: "center" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "8px 24px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#475569",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#f8fafc";
                  e.currentTarget.style.color = "#0f172a";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                  e.currentTarget.style.color = "#475569";
                }}
              >
                <ChevronUp size={16} />
                <span>{isHi ? "हमारे बारे में बंद करें (ऊपर जाएं)" : "Close About Us Section (Collapse)"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
