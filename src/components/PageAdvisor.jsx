import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RotateCcw,
  Building2,
  HelpCircle,
  Mic,
  MicOff,
  AlertCircle,
} from "lucide-react";
import { getAdvisorAdvice } from "../advisorLogic";
import { speakText, stopSpeaking } from "../utils/speech";
import { API_ROUTES } from "../apiRoutes";

const languageNames = {
  hi: "Hindi",
  en: "English",
  hinglish: "Hinglish",
  mr: "Marathi",
  bn: "Bengali",
  te: "Telugu",
  ta: "Tamil",
};

export default function PageAdvisor({ result, lang = "hi", formatCurrency, businessContext }) {
  const isHi = lang === "hi";
  const chatBottomRef = useRef(null);
  const msgCounterRef = useRef(1);

  // Use businessContext fallback if not passed directly
  const ctx = businessContext || {
    businessType: result?.category || "",
    businessName: result?.business || result?.business_name || (lang === "hi" ? "आपका व्यवसाय" : "Your Business"),
    district: result?.district || (lang === "hi" ? "स्थानीय क्षेत्र" : "Local Area"),
    state: result?.state || "",
    block: result?.block || "",
    totalInvestment: result?.financial_analysis?.initial_investment ?? null,
    promoterMargin: result?.scheme_analysis?.margin_capital ?? result?.scheme_analysis?.beneficiary_contribution ?? null,
    eligibleLoan: result?.scheme_analysis?.eligible_loan ?? null,
    matchedScheme: result?.scheme_analysis?.scheme_name || (lang === "hi" ? "क्रेडिट लिंक्ड योजना" : "Credit Scheme"),
    interestRate: result?.scheme_analysis?.interest_rate || null,
    monthlyEmi: result?.loan_affordability?.monthly_emi ?? null,
    totalProjectCost: result?.scheme_analysis?.project_cost ?? result?.financial_analysis?.initial_investment ?? null,
    monthlyProfit: result?.financial_analysis?.monthly_profit ?? null,
    feasibility: result?.feasibilityVerdict || result?.feasibility || "Feasible",
  };

  const getInitialGreeting = () => {
    const bName = ctx.businessName || (lang === "hi" ? "आपके व्यापार" : "Your Business");
    const bScheme = ctx.matchedScheme || (lang === "hi" ? "सरकारी योजना" : "Government Scheme");
    const formatAmount = (val) => {
      if (val == null) return lang === "hi" ? "अनिर्धारित" : "Pending";
      return formatCurrency ? formatCurrency(val) : `₹${Number(val).toLocaleString("en-IN")}`;
    };
    const bMargin = formatAmount(ctx.promoterMargin);
    const bLoan = formatAmount(ctx.eligibleLoan);
    const bEmi = formatAmount(ctx.monthlyEmi);
    const rateStr = ctx.interestRate ? `(@ ${ctx.interestRate})` : "";
    const locationStr = [ctx.district, ctx.state].filter(Boolean).join(", ") || (lang === "hi" ? "स्थानीय क्षेत्र" : "your area");

    switch (lang) {
      case "en":
        return `Hello! I am your AI Rural Business Advisor. I have loaded your complete business profile for **${bName}** (${ctx.businessType || "Enterprise"}) in ${locationStr}.
• Matched Scheme: **${bScheme}**
• Your Margin: **${bMargin}** | Bank Loan: **${bLoan}** ${rateStr}
• Estimated Monthly EMI: **${bEmi}**
How can I assist you with your equipment costs, scheme documents, market strategy, or profit margins?`;
      case "hinglish":
        return `Namaste! Main aapka AI Business Advisor hoon. Maine **${bName}** (${ctx.businessType || "Enterprise"}) ka poora hisab check kar liya hai.
• Matched Scheme: **${bScheme}**
• Aapka Margin (Apna Paisa): **${bMargin}** | Bank Loan: **${bLoan}** ${rateStr}
• Har Mahine Ki EMI: **${bEmi}**
Aap mujhse setup cost kam karne, machine khareedne ya gaon me bikri badhane ke baare me koi bhi sawal poochh sakte hain!`;
      case "mr":
        return `नमस्कार! मी तुमचा AI ग्रामीण व्यवसाय सल्लागार आहे. मी **${bName}** (${ctx.businessType || "व्यवसाय"}) चे संपूर्ण आकडे तपासले आहेत.
• शिफारस केलेली योजना: **${bScheme}**
• तुमचे भांडवल: **${bMargin}** | बँक कर्ज: **${bLoan}** ${rateStr}
• अंदाजे मासिक हप्ता (EMI): **${bEmi}**
तुम्ही मला खर्च कसा कमी करावा, यंत्रसामग्री कशी घ्यावी किंवा विक्री कशी वाढवावी याविषयी विचारू शकता.`;
      case "bn":
        return `নমস্কার! আমি আপনার AI গ্রামীণ ব্যবসা উপদেষ্টা। আমি **${bName}** (${ctx.businessType || "ব্যবসা"}) এর সমস্ত হিসাব পরীক্ষা করেছি।
• নির্বাচিত প্রকল্প: **${bScheme}**
• আপনার বিনিয়োগ: **${bMargin}** | ব্যাংক ঋণ: **${bLoan}** ${rateStr}
• আনুমানিক মাসিক কিস্তি (EMI): **${bEmi}**
খরচ কমানো, সরঞ্জাম ক্রয় বা স্থানীয় বাজারে বিক্রি বাড়ানোর বিষয়ে যেকোনো প্রশ্ন করুন।`;
      case "te":
        return `నమస్కారం! నేను మీ AI వ్యాపార సలహాదారుని. **${bName}** (${ctx.businessType || "వ్యాపారం"}) పూర్తి వివరాలు పరిశీలించాను.
• సిఫార్సు చేసిన పథకం: **${bScheme}**
• మీ పెట్టుబడి: **${bMargin}** | బ్యాంక్ రుణం: **${bLoan}** ${rateStr}
• నెలవారీ EMI: **${bEmi}**
సెటప్ ఖర్చు తగ్గించడం, పరికరాల కొనుగోలు లేదా అమ్మకాలు పెంచడం గురించి నన్ను అడగండి.`;
      case "ta":
        return `வணக்கம்! நான் உங்கள் AI கிராமப்புற வணிக ஆலோசகர். **${bName}** (${ctx.businessType || "வணிகம்"}) இன் அனைத்து விவரங்களையும் ஆய்வு செய்துள்ளேன்.
• தேர்ந்தெடுக்கப்பட்ட திட்டம்: **${bScheme}**
• உங்கள் முதலீடு: **${bMargin}** | வங்கி கடன்: **${bLoan}** ${rateStr}
• மாதாந்திர EMI: **${bEmi}**
செலவைக் குறைப்பது, இயந்திரங்கள் வாங்குவது அல்லது விற்பனையை அதிகரிப்பது குறித்து ஏதேனும் கேள்விகளைக் கேளுங்கள்.`;
      default:
        return `नमस्ते! मैं आपका AI ग्रामीण व्यापार सलाहकार हूँ। मैंने **${bName}** (${ctx.businessType || "व्यवसाय"}) के लिए आपके आंकड़े और सरकारी योजना का पूरा विश्लेषण तैयार किया है।
• अनुशंसित सरकारी योजना: **${bScheme}**
• आपका अंशदान (मार्जिन): **${bMargin}** | पात्र बैंक लोन: **${bLoan}** ${rateStr}
• अनुमानित मासिक किश्त (EMI): **${bEmi}**
आप मुझसे सेटअप लागत कम करने, मशीनरी बजट, बाज़ार की मांग या सरकारी सब्सिडी के नियम पर कोई भी सवाल पूछ सकते हैं।`;
    }
  };

  const [messages, setMessages] = useState(() => [
    {
      id: "initial",
      sender: "advisor",
      text: getInitialGreeting(),
      timestamp: "Just now",
    },
  ]);

  const [inputQuestion, setInputQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Speech Recognition State for Voice Input
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const recognitionRef = useRef(null);
  const baseTextRef = useRef("");
  const isStartingRef = useRef(false);

  // Safe detection of Web Speech API
  const isSpeechSupported = typeof window !== "undefined" && Boolean(
    window.SpeechRecognition || window.webkitSpeechRecognition
  );

  // Map application language to speech recognition locale
  const getRecognitionLang = useCallback((currentLang) => {
    switch (currentLang) {
      case "en":
        return "en-IN";
      case "mr":
        return "mr-IN";
      case "bn":
        return "bn-IN";
      case "te":
        return "te-IN";
      case "ta":
        return "ta-IN";
      case "hi":
      case "hinglish":
      default:
        return "hi-IN";
    }
  }, []);

  // Clean up recognition session when component unmounts
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore abort errors on unmount
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    isStartingRef.current = false;
  }, []);

  const toggleListening = () => {
    if (isListening || recognitionRef.current) {
      stopListening();
      return;
    }

    if (isStartingRef.current) return;
    isStartingRef.current = true;

    if (!isSpeechSupported) {
      isStartingRef.current = false;
      setSpeechError(
        isHi
          ? "इस ब्राउज़र में वॉयस इनपुट समर्थित नहीं है। कृपया टाइप करके सवाल पूछें।"
          : "Voice input isn't supported in this browser. Please type your question instead."
      );
      return;
    }

    try {
      const SpeechRecognitionClass =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = getRecognitionLang(lang);
      recognition.maxAlternatives = 1;

      // Preserve any existing typed text before recognition starts
      baseTextRef.current = inputQuestion;

      recognition.onstart = () => {
        isStartingRef.current = false;
        setIsListening(true);
        setSpeechError("");
      };

      recognition.onresult = (event) => {
        let sessionFinal = "";
        let sessionInterim = "";

        for (let i = 0; i < event.results.length; ++i) {
          const piece = event.results[i][0]?.transcript || "";
          if (event.results[i].isFinal) {
            sessionFinal += piece;
          } else {
            sessionInterim += piece;
          }
        }

        const base = (baseTextRef.current || "").trim();
        const spoken = (sessionFinal + sessionInterim).trim();

        if (!spoken) return;

        const combined = base ? `${base} ${spoken}` : spoken;
        setInputQuestion(combined);
        setErrorMsg("");
        setSpeechError("");
      };

      recognition.onerror = (event) => {
        isStartingRef.current = false;
        setIsListening(false);
        recognitionRef.current = null;

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setSpeechError(
            isHi
              ? "माइक्रोफ़ोन अनुमति अस्वीकृत कर दी गई। कृपया माइक्रोफ़ोन की अनुमति दें या अपना सवाल टाइप करें।"
              : "Microphone permission was denied. Please allow microphone access or type your question instead."
          );
        } else if (event.error === "no-speech") {
          setSpeechError(
            isHi
              ? "कोई आवाज़ नहीं सुनी गई। कृपया पुनः प्रयास करें।"
              : "No speech detected. Please try again."
          );
        } else if (event.error === "network") {
          setSpeechError(
            isHi
              ? "वॉयस सेवा से संपर्क नहीं हो सका। कृपया अपना नेटवर्क जांचें या सवाल टाइप करें।"
              : "Could not connect to speech service. Please check your connection or type your question."
          );
        } else if (event.error === "aborted") {
          // Normal user abort, no error required
        } else {
          setSpeechError(
            isHi
              ? "वॉयस पहचान में समस्या आई। कृपया पुनः प्रयास करें या सवाल टाइप करें।"
              : "Voice recognition error. Please try again or type your question."
          );
        }
      };

      recognition.onend = () => {
        isStartingRef.current = false;
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognition.start();
    } catch (err) {
      isStartingRef.current = false;
      setIsListening(false);
      recognitionRef.current = null;
      console.warn("Speech recognition initialization error:", err);
      setSpeechError(
        isHi
          ? "वॉयस पहचान शुरू नहीं हो सकी। कृपया अपना सवाल टाइप करें।"
          : "Failed to start voice recognition. Please type your question."
      );
    }
  };

  // Pre-suggested prompts matching user requirements exactly
  const suggestedPrompts = [
    {
      id: "lower-cost",
      en: "How can I lower my initial setup cost?",
      hi: "मैं अपनी शुरुआती सेटअप लागत कैसे कम करूँ?",
      hinglish: "Apna shuruati setup kharcha kaise kam karein?",
      mr: "सुरुवातीचा सेटअप खर्च कसा कमी करावा?",
      bn: "প্রাথমিক সেটআপ খরচ কিভাবে কমাব?",
      te: "ప్రారంభ సెటప్ ఖర్చును ఎలా తగ్గించగలను?",
      ta: "ஆரம்ப அமைவு செலவை எவ்வாறு குறைக்கலாம்?",
    },
    {
      id: "equipment-loan",
      en: "Is this loan amount enough for equipment?",
      hi: "क्या यह लोन राशि मशीनरी/सामान के लिए पर्याप्त है?",
      hinglish: "Kya ye loan amount machine aur saman ke liye kaafi hai?",
      mr: "ही कर्ज रक्कम यंत्रसामग्रीसाठी पुरेशी आहे का?",
      bn: "এই ঋণ কি মেশিনারির জন্য যথেষ্ট?",
      te: "ఈ రుణ మొత్తం పరికరాలకు సరిపోతుందా?",
      ta: "இந்த கடன் தொகை உபகரணங்களுக்கு போதுமானதா?",
    },
    {
      id: "main-risks",
      en: "What are the main risks for this business here?",
      hi: "यहाँ इस व्यापार में मुख्य खतरे और जोखिम क्या हैं?",
      hinglish: "Is business me sabse bada risk kya hai?",
      mr: "येथे या व्यवसायासाठी मुख्य जोखीम काय आहेत?",
      bn: "এখানে এই ব্যবসার মূল ঝুঁকিগুলি কী কী?",
      te: "ఇక్కడ ఈ వ్యాపారంలో ప్రధాన ప్రమాదాలు ఏమిటి?",
      ta: "இங்கு இந்த தொழிலுக்கான முக்கிய ஆபத்துகள் என்ன?",
    },
    {
      id: "emi-affordability",
      en: "Can I afford this monthly loan EMI?",
      hi: "क्या मैं हर महीने की किश्त (EMI) आसानी से भर पाऊंगा?",
      hinglish: "Kya main har mahine ki EMI aasani se nikal paunga?",
      mr: "मी दरमहा हप्ता (EMI) सहज फेडू शकेन का?",
      bn: "আমি কি সহজেই প্রতি মাসে কিস্তি দিতে পারব?",
      te: "నేను ప్రతి నెలా EMI సులభంగా చెల్లించగలనా?",
      ta: "மாதாந்திர தவணையை (EMI) நான் எளிதாக செலுத்த முடியுமா?",
    },
    {
      id: "local-customers",
      en: "How to get more customers in my village?",
      hi: "गाँव और स्थानीय बाज़ार में ज़्यादा ग्राहक कैसे जोड़ें?",
      hinglish: "Gaon aur bazaar me zyada customer kaise layein?",
      mr: "स्थानिक बाजारपेठेत अधिक ग्राहक कसे मिळवावेत?",
      bn: "গ্রামের বাজারে বেশি ক্রেতা কিভাবে আকর্ষণ করব?",
      te: "స్థానిక మార్కెట్‌లో ఎక్కువ మంది కస్టమర్లను ఎలా పొందాలి?",
      ta: "கிராமப்புற சந்தையில் அதிக வாடிக்கையாளர்களை ஈர்ப்பது எப்படி?",
    },
    {
      id: "scheme-documents",
      en: "What documents do I need for this government scheme?",
      hi: "इस सरकारी योजना के लिए मुझे कौन से कागज़ात चाहिए?",
      hinglish: "Is sarkari loan ke liye kaun se documents chahiye?",
      mr: "या सरकारी योजनेसाठी कोणती कागदपत्रे लागतील?",
      bn: "এই সরকারি ঋণের জন্য কী কী নথিপত্র লাগবে?",
      te: "ఈ ప్రభుత్వ రుణానికి ఏ పత్రాలు అవసరం?",
      ta: "இந்த அரசு கடனுதவிக்கு என்னென்ன ஆவணங்கள் தேவை?",
    },
  ];

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatBottomRef.current) {
        chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 80);
  };

  const handleSend = async (queryText) => {
    stopListening();
    const q = (queryText || inputQuestion).trim();
    if (!q) {
      setErrorMsg(isHi ? "कृपया अपना सवाल लिखें या नीचे से चुनें।" : "Please type a question or pick one from below.");
      return;
    }

    setErrorMsg("");
    setInputQuestion("");
    stopSpeaking();
    setSpeakingId(null);

    msgCounterRef.current += 1;
    const userMsgId = `user-msg-${msgCounterRef.current}`;
    msgCounterRef.current += 1;
    const advisorMsgId = `adv-msg-${msgCounterRef.current}`;
    const timeStr = "Now";

    // Append user message and loading advisor response with real loading state
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: "user", text: q, timestamp: timeStr },
      { id: advisorMsgId, sender: "advisor", text: "", isLoading: true, isStreaming: false, timestamp: timeStr },
    ]);

    setLoading(true);
    scrollToBottom();

    try {
      const activeLanguage = languageNames[lang] || lang || "Hindi";
      const bName = ctx.businessName || result?.business || (isHi ? "व्यवसाय" : "Enterprise");
      const bDistrict = ctx.district || result?.district || (isHi ? "स्थानीय क्षेत्र" : "Local Area");
      const bState = ctx.state || result?.state || "";
      const bScheme = ctx.matchedScheme || result?.scheme_analysis?.scheme_name || (isHi ? "क्रेडिट योजना" : "Credit Scheme");
      const bMargin = ctx.promoterMargin ?? result?.scheme_analysis?.margin_capital ?? null;
      const bLoan = ctx.eligibleLoan ?? result?.scheme_analysis?.eligible_loan ?? null;
      const bEmi = ctx.monthlyEmi ?? result?.loan_affordability?.monthly_emi ?? null;

      // 1. Safely extract live map data
      const mData = ctx.localMarketData || {};
      const compCount = mData.competitors !== undefined && mData.competitors !== null
        ? (Array.isArray(mData.competitors) ? mData.competitors.length : mData.competitors)
        : null;
      const bankCount = mData.banks !== undefined && mData.banks !== null ? mData.banks : null;
      const mandiCount = mData.mandis !== undefined && mData.mandis !== null ? mData.mandis : null;
      
      const localMarketStr = ctx.localMarketData
        ? `REAL-TIME MARKET DATA (10km radius): ${compCount !== null ? `${compCount} competitors detected` : "Competitor data pending/unavailable"}, ${bankCount !== null ? `${bankCount} banks nearby` : "Bank location scan pending"}${mandiCount !== null ? `, ${mandiCount} mandis/markets` : ""}.`
        : "Local Market Context: Standard rural/semi-urban environment. Live map scan data pending.";

      // 2. Build the AI system prompt
      const profileSummary = `Profile: ${bName}, ${[bDistrict, bState].filter(Boolean).join(", ")}
Matched Scheme: ${bScheme}
Margin: ${bMargin != null ? `₹${Number(bMargin).toLocaleString("en-IN")}` : "Not specified"} | Loan: ${bLoan != null ? `₹${Number(bLoan).toLocaleString("en-IN")}` : "Not specified"} | EMI: ${bEmi != null ? `₹${Number(bEmi).toLocaleString("en-IN")}` : "Not specified"}

${localMarketStr}

CRITICAL AI INSTRUCTION: 
When advising the user, actively use the real-time market data. If they ask about strategy or risks, reference the verified field scan facts without inventing fabricated competitor shops. If they ask about loans, mention approaching the ${bankCount != null ? bankCount : "local"} nearby banks for the ${bScheme}.`;

      // 3. Package the payload for the backend
      const payload = {
        message: q,
        question: q,
        businessContext: {
          ...ctx,
          businessName: bName,
          district: bDistrict,
          state: bState,
          matchedScheme: bScheme,
          promoterMargin: bMargin,
          eligibleLoan: bLoan,
          monthlyEmi: bEmi,
          localMarketContext: localMarketStr,
          profileSummary,
        },
        language: lang,
        selectedLanguage: activeLanguage,
      };

      // Real Gemini API call to the backend proxy with timeout handling
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(API_ROUTES.ADVISOR, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const generatedReply = (data?.reply || data?.answer || data?.text || "").trim();

      if (!generatedReply) {
        throw new Error("No response content returned from advisor");
      }

      // Append the actual generated content string into the chat message state
      setMessages((prev) =>
        prev.map((m) =>
          m.id === advisorMsgId
            ? { ...m, text: generatedReply, isLoading: false, isStreaming: false }
            : m
        )
      );
    } catch (err) {
      console.warn("API error, generating real contextual guidance:", err);
      // Fallback to local rule-based advisor logic so user never gets broken state or static placeholder
      try {
        const fallbackResp = getAdvisorAdvice({
          question: q,
          business_name: ctx.businessName || (isHi ? "व्यवसाय" : "Business"),
          category: ctx.businessType || (isHi ? "लघु उद्योग" : "Enterprise"),
          monthly_revenue: ctx.monthlyRevenue,
          monthly_expenses: ctx.monthlyExpenses,
          monthly_profit: ctx.monthlyProfit,
          monthly_emi: ctx.monthlyEmi,
          scheme_name: ctx.matchedScheme,
          eligible_loan: ctx.eligibleLoan,
          project_cost: ctx.totalProjectCost,
          promoter_margin: ctx.promoterMargin,
          interest_rate: ctx.interestRate,
          loan_tenure_months: ctx.loanTenureMonths,
          moratorium_months: ctx.moratoriumMonths,
          roi_percentage: result?.financial_analysis?.roi_percentage,
          affordability_status: result?.loan_affordability?.affordability_status,
          local_demand: ctx.localDemand,
          competition_level: ctx.competitionLevel,
          feasibility: ctx.feasibility,
        });

        const locationLabel = [ctx.district, ctx.state].filter(Boolean).join(", ") || (isHi ? "स्थानीय क्षेत्र" : "Local Area");
        const fallbackAnswer =
          fallbackResp?.answer ||
          (isHi
            ? `प्रोफाइल: ${ctx.businessName || "व्यवसाय"}, ${locationLabel}\nयोजना: ${ctx.matchedScheme || "सरकारी योजना"}\n${ctx.promoterMargin != null ? `मार्जिन: ₹${Number(ctx.promoterMargin).toLocaleString("en-IN")} | ` : ""}${ctx.eligibleLoan != null ? `बैंक लोन: ₹${Number(ctx.eligibleLoan).toLocaleString("en-IN")} | ` : ""}${ctx.monthlyEmi != null ? `EMI: ₹${Number(ctx.monthlyEmi).toLocaleString("en-IN")}` : ""}\n\nव्यापार सलाह: अपने शुरुआती निवेश को सीमित रखने के लिए उपकरण चरणबद्ध तरीके से खरीदें। क्रेडिट लिंक्ड सरकारी योजना के तहत मिलने वाली पूंजीगत सहायता से अपने कार्यशील पूंजी मार्जिन को सुरक्षित रखें।`
            : `Profile: ${ctx.businessName || "Business"}, ${locationLabel}\nMatched Scheme: ${ctx.matchedScheme || "Credit Scheme"}\n${ctx.promoterMargin != null ? `Margin: ₹${Number(ctx.promoterMargin).toLocaleString("en-IN")} | ` : ""}${ctx.eligibleLoan != null ? `Loan: ₹${Number(ctx.eligibleLoan).toLocaleString("en-IN")} | ` : ""}${ctx.monthlyEmi != null ? `EMI: ₹${Number(ctx.monthlyEmi).toLocaleString("en-IN")}` : ""}\n\nBusiness Advice: Phase your machinery procurement to reduce upfront capital requirements, and leverage credit-linked capital assistance to maintain positive cash flow.`);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === advisorMsgId
              ? {
                  ...m,
                  text: fallbackAnswer,
                  isLoading: false,
                  isStreaming: false,
                }
              : m
          )
        );
      } catch (fbErr) {
        console.error("Fallback error:", fbErr);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === advisorMsgId
              ? {
                  ...m,
                  text:
                    isHi
                      ? "माफ़ कीजिए, अभी जवाब प्राप्त करने में थोड़ी समस्या आई। कृपया दोबारा प्रयास करें।"
                      : "Sorry, could not generate advice at this moment. Please try again.",
                  isLoading: false,
                  isStreaming: false,
                  isError: true,
                }
              : m
          )
        );
      }
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const handleSendMessage = handleSend;
  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    handleSend();
  };

  const handleVoiceToggle = (msgId, text) => {
    if (speakingId === msgId) {
      stopSpeaking();
      setSpeakingId(null);
    } else {
      stopSpeaking();
      const ok = speakText(text, lang);
      if (ok) {
        setSpeakingId(msgId);
      }
    }
  };

  const handleCopy = (msgId, text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleResetChat = () => {
    stopSpeaking();
    setSpeakingId(null);
    setMessages([
      {
        id: "initial",
        sender: "advisor",
        text: getInitialGreeting(),
        timestamp: "Just now",
      },
    ]);
  };

  return (
    <div className="side-page-content" style={{ padding: "0 0 24px 0" }}>
      {/* Header Banner */}
      <div className="page-header-banner">
        <div className="page-header-text">
          <span className="page-badge-pill">
            <Sparkles size={14} style={{ marginRight: "4px" }} />
            {isHi ? "पेज 10 • AI व्यापार साथी" : "Page 10 • AI Business Advisor"}
          </span>
          <h2>{isHi ? "व्यापार सलाहकार से सीधी बातचीत" : "AI Business Mentor & Advisor"}</h2>
          <p className="page-sub-desc">
            {isHi
              ? "आपके प्रोजेक्ट बजट, सरकारी योजना और मुनाफे के आंकड़ों पर आधारित व्यक्तिगत परामर्श।"
              : "Direct guidance powered by Gemini with full context of your investment, bank loan, and local demand."}
          </p>
        </div>

        <div className="govt-emblem-badge" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div>
            <strong>{isHi ? "AI मेंटॉर" : "Gemini AI"}</strong>
            <small>{isHi ? "सक्रिय व सटीक" : "Context-Aware"}</small>
          </div>
        </div>
      </div>

      {/* Active Business Context Bar */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          borderRadius: "12px",
          padding: "14px 18px",
          color: "#ffffff",
          marginBottom: "16px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          border: "1px solid #334155",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "8px",
              backgroundColor: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              flexShrink: 0,
            }}
          >
            <Building2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#f8fafc" }}>
              {ctx.businessName} <span style={{ color: "#93c5fd", fontWeight: 500 }}>({ctx.businessType})</span>
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>
              {ctx.block ? `${ctx.block}, ` : ""}{ctx.district}, {ctx.state} • {isHi ? "अनुशंसित योजना:" : "Scheme:"}{" "}
              <strong style={{ color: "#38bdf8" }}>{ctx.matchedScheme}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "12px" }}>
          <div style={{ background: "rgba(255,255,255,0.08)", padding: "6px 10px", borderRadius: "6px" }}>
            <span style={{ color: "#cbd5e1" }}>{isHi ? "मार्जिन:" : "Margin:"}</span>{" "}
            <strong style={{ color: "#4ade80" }}>
              ₹{formatCurrency ? formatCurrency(ctx.promoterMargin) : ctx.promoterMargin?.toLocaleString("en-IN")}
            </strong>
          </div>
          <div style={{ background: "rgba(255,255,255,0.08)", padding: "6px 10px", borderRadius: "6px" }}>
            <span style={{ color: "#cbd5e1" }}>{isHi ? "बैंक लोन:" : "Loan:"}</span>{" "}
            <strong style={{ color: "#60a5fa" }}>
              ₹{formatCurrency ? formatCurrency(ctx.eligibleLoan) : ctx.eligibleLoan?.toLocaleString("en-IN")}
            </strong>
          </div>
          <div style={{ background: "rgba(255,255,255,0.08)", padding: "6px 10px", borderRadius: "6px" }}>
            <span style={{ color: "#cbd5e1" }}>{isHi ? "मासिक EMI:" : "EMI:"}</span>{" "}
            <strong style={{ color: "#facc15" }}>
              ₹{formatCurrency ? formatCurrency(ctx.monthlyEmi) : ctx.monthlyEmi?.toLocaleString("en-IN")}
            </strong>
          </div>
        </div>
      </div>

      {/* Pre-suggested Prompts Bar */}
      <div className="detail-card" style={{ marginBottom: "16px", padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, color: "#334155" }}>
            <HelpCircle size={15} style={{ color: "#2563eb" }} />
            <span>{isHi ? "सुझाए गए प्रमुख सवाल (एक क्लिक में पूछें):" : "Suggested Quick Prompts (Click to ask):"}</span>
          </div>
          <button
            type="button"
            onClick={handleResetChat}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              padding: "2px 6px",
              borderRadius: "4px",
            }}
            title={isHi ? "चैट साफ़ करें" : "Reset Chat"}
          >
            <RotateCcw size={13} />
            <span>{isHi ? "नया सवाल" : "Clear Chat"}</span>
          </button>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          {suggestedPrompts.map((sp) => {
            const promptText = sp[lang] || sp.en;
            return (
              <button
                key={sp.id}
                type="button"
                onClick={() => handleSend(promptText)}
                disabled={loading}
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "20px",
                  padding: "6px 14px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#1e293b",
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                  textAlign: "left",
                }}
                onMouseOver={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = "#e0f2fe";
                    e.currentTarget.style.borderColor = "#38bdf8";
                    e.currentTarget.style.color = "#0369a1";
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "#f1f5f9";
                  e.currentTarget.style.borderColor = "#cbd5e1";
                  e.currentTarget.style.color = "#1e293b";
                }}
              >
                <span>{promptText}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Thread */}
      <div
        style={{
          background: "#ffffff",
          border: "1.5px solid #e2e8f0",
          borderRadius: "14px",
          padding: "18px",
          minHeight: "360px",
          maxHeight: "520px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          marginBottom: "16px",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: isUser ? "flex-end" : "flex-start",
                maxWidth: "100%",
              }}
            >
              {/* Sender label & Timestamp */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "4px",
                  fontSize: "11.5px",
                  color: "#64748b",
                  padding: "0 4px",
                }}
              >
                {isUser ? (
                  <>
                    <span>{msg.timestamp}</span>
                    <strong style={{ color: "#334155" }}>{isHi ? "आप" : "You"}</strong>
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        backgroundColor: "#cbd5e1",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <User size={11} color="#334155" />
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        backgroundColor: "#059669",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Bot size={11} color="#ffffff" />
                    </div>
                    <strong style={{ color: "#059669" }}>
                      {isHi ? "AI व्यापार सलाहकार" : "AI Business Mentor"}
                    </strong>
                    <span>{msg.timestamp}</span>
                  </>
                )}
              </div>

              {/* Message Bubble */}
              <div
                style={{
                  maxWidth: "85%",
                  backgroundColor: isUser ? "#1e40af" : msg.isError ? "#fef2f2" : "#f8fafc",
                  color: isUser ? "#ffffff" : msg.isError ? "#991b1b" : "#0f172a",
                  border: isUser
                    ? "none"
                    : msg.isError
                    ? "1px solid #fecaca"
                    : "1.5px solid #e2e8f0",
                  borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  padding: "14px 18px",
                  boxShadow: isUser
                    ? "0 2px 6px rgba(30, 64, 175, 0.2)"
                    : "0 1px 3px rgba(0,0,0,0.05)",
                  fontSize: "14px",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {(msg.isLoading || (msg.isStreaming && !msg.text) || (!msg.text && !msg.isError)) ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      color: "#0369a1",
                      backgroundColor: "#f0f9ff",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #bae6fd",
                    }}
                  >
                    <div className="spinner-dots" style={{ display: "inline-flex", gap: "4px" }}>
                      <span style={{ animation: "pulse 1s infinite" }}>●</span>
                      <span style={{ animation: "pulse 1s infinite 0.2s" }}>●</span>
                      <span style={{ animation: "pulse 1s infinite 0.4s" }}>●</span>
                    </div>
                    <span style={{ fontStyle: "italic", fontSize: "13.5px", fontWeight: 600 }}>
                      Analyzing your numbers...
                    </span>
                  </div>
                ) : (
                  <div>{msg.text}</div>
                )}

                {/* Advisor Message Actions */}
                {!isUser && msg.text && !msg.isStreaming && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginTop: "10px",
                      paddingTop: "8px",
                      borderTop: "1px dashed #cbd5e1",
                      fontSize: "12px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleVoiceToggle(msg.id, msg.text)}
                      style={{
                        background: speakingId === msg.id ? "#fef08a" : "#ffffff",
                        border: "1px solid #cbd5e1",
                        color: speakingId === msg.id ? "#854d0e" : "#475569",
                        borderRadius: "16px",
                        padding: "3px 10px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontWeight: 600,
                        fontSize: "11.5px",
                        transition: "all 0.15s ease",
                      }}
                      title={speakingId === msg.id ? "Stop voice" : "Listen in voice"}
                    >
                      {speakingId === msg.id ? (
                        <>
                          <VolumeX size={13} />
                          <span>{isHi ? "आवाज़ रोकें" : "Stop"}</span>
                        </>
                      ) : (
                        <>
                          <Volume2 size={13} />
                          <span>{isHi ? "बोलकर सुनें" : "Listen"}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.text)}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        color: "#475569",
                        borderRadius: "16px",
                        padding: "3px 10px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontWeight: 600,
                        fontSize: "11.5px",
                      }}
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check size={12} color="#16a34a" />
                          <span style={{ color: "#16a34a" }}>{isHi ? "कॉपी हो गया" : "Copied"}</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>{isHi ? "कॉपी करें" : "Copy"}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={chatBottomRef} />
      </div>

      {/* Input Form Bar - Styled with Light Warm Color Palette (#FFFBEB / #FCD34D) & Dark Text (#1F2937) */}
      <form
        onSubmit={handleSubmit}
        className="advisor-query-form"
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "flex-end",
          backgroundColor: "#FFFBEB",
          borderRadius: "12px",
          padding: "10px 12px",
          border: "1.5px solid #FCD34D",
          boxShadow: "0 2px 8px rgba(217, 119, 6, 0.08)",
          transition: "all 0.2s ease",
        }}
      >
        <textarea
          rows={2}
          value={inputQuestion}
          className="advisor-query-textarea"
          onChange={(e) => {
            setInputQuestion(e.target.value);
            setErrorMsg("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder={
            isListening
              ? isHi
                ? "सुन रहे हैं... कृपया अपना सवाल बोलें..."
                : "Listening... please speak your question..."
              : isHi
              ? "यहाँ अपने व्यापार के बारे में कोई भी सवाल लिखें या बोलें..."
              : "Ask any question about your numbers (type or click microphone to speak)..."
          }
          disabled={loading}
          style={{
            flex: 1,
            backgroundColor: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            fontSize: "14.5px",
            color: "#1F2937",
            caretColor: "#1F2937",
            padding: "6px 8px",
            lineHeight: 1.5,
            fontFamily: "inherit",
          }}
        />

        {/* Action Buttons: Voice Input Microphone + Send / Ask Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {/* Microphone Voice Button */}
          <button
            type="button"
            onClick={toggleListening}
            disabled={loading || !isSpeechSupported}
            aria-label={
              isListening
                ? isHi
                  ? "आवाज़ सुनना बंद करें"
                  : "Stop listening"
                : isHi
                ? "वॉयस से सवाल पूछें"
                : "Ask the AI Business Advisor using voice"
            }
            title={
              !isSpeechSupported
                ? isHi
                  ? "इस ब्राउज़र में वॉयस इनपुट समर्थित नहीं है। कृपया टाइप करके सवाल पूछें।"
                  : "Voice input isn't supported in this browser. Please type your question instead."
                : isListening
                ? isHi
                  ? "सुनना रोकें (Click to stop listening)"
                  : "Click to stop listening"
                : isHi
                ? "बोलकर पूछें (Ask by voice)"
                : "Ask by voice"
            }
            style={{
              height: "44px",
              padding: isListening ? "0 14px" : "0 12px",
              borderRadius: "8px",
              border: isListening
                ? "1.5px solid #EF4444"
                : !isSpeechSupported
                ? "1.5px solid #E5E7EB"
                : "1.5px solid #F59E0B",
              backgroundColor: isListening
                ? "#FEE2E2"
                : !isSpeechSupported
                ? "#F3F4F6"
                : "#FEF3C7",
              color: isListening
                ? "#DC2626"
                : !isSpeechSupported
                ? "#9CA3AF"
                : "#92400E",
              cursor: loading || !isSpeechSupported ? "not-allowed" : "pointer",
              fontWeight: 700,
              fontSize: "13px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.15s ease",
            }}
          >
            {isListening ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: "9px",
                    height: "9px",
                    borderRadius: "50%",
                    backgroundColor: "#DC2626",
                    animation: "pulse 1s infinite",
                  }}
                />
                <MicOff size={16} />
                <span>{isHi ? "सुन रहे हैं..." : "Listening..."}</span>
              </>
            ) : (
              <>
                <Mic size={17} style={{ opacity: isSpeechSupported ? 1 : 0.5 }} />
                <span className="hidden sm:inline" style={{ fontSize: "12.5px" }}>
                  {isHi ? "बोलकर पूछें" : "Ask by voice"}
                </span>
              </>
            )}
          </button>

          {/* Submit / Ask Button */}
          <button
            type="submit"
            onClick={(e) => {
              if (!loading && inputQuestion.trim()) {
                handleSubmit(e);
              }
            }}
            disabled={loading || !inputQuestion.trim()}
            style={{
              backgroundColor: loading ? "#0284c7" : !inputQuestion.trim() ? "#94a3b8" : "#1e40af",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "10px 18px",
              fontWeight: 700,
              fontSize: "13.5px",
              cursor: loading || !inputQuestion.trim() ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              flexShrink: 0,
              transition: "all 0.15s ease",
              height: "44px",
            }}
          >
            {loading ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span className="spinner-dots" style={{ display: "inline-flex", gap: "2px" }}>
                  <span>●</span>
                  <span>●</span>
                  <span>●</span>
                </span>
                <span>Analyzing your numbers...</span>
              </span>
            ) : (
              <>
                <span>{isHi ? "पूछें" : "Ask"}</span>
                <Send size={15} />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Active Listening Indicator Banner */}
      {isListening && (
        <div
          style={{
            marginTop: "8px",
            padding: "8px 14px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FCA5A5",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12.5px",
            color: "#DC2626",
            fontWeight: 600,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#DC2626",
              animation: "pulse 1s infinite",
            }}
          />
          <span>
            {isHi
              ? "🎙️ माइक्रोफ़ोन सक्रिय है... अपना सवाल बोलें (समाप्त होने पर 'सुन रहे हैं...' बटन दबाएँ, फिर 'पूछें' पर क्लिक करें)"
              : "🎙️ Microphone active... Speak your question (Click 'Listening...' to finish speaking, review/edit, then press Ask)"}
          </span>
        </div>
      )}

      {/* Speech Recognition Error Banner */}
      {speechError && (
        <div
          style={{
            marginTop: "8px",
            padding: "9px 14px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#B91C1C",
            borderRadius: "8px",
            fontSize: "12.5px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{speechError}</span>
        </div>
      )}

      {loading && (
        <div
          style={{
            marginTop: "8px",
            padding: "8px 14px",
            backgroundColor: "#f0f9ff",
            border: "1px solid #bae6fd",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12.5px",
            color: "#0369a1",
            fontWeight: 600,
          }}
        >
          <div className="spinner-dots" style={{ display: "inline-flex", gap: "3px" }}>
            <span style={{ animation: "pulse 1s infinite" }}>●</span>
            <span style={{ animation: "pulse 1s infinite 0.2s" }}>●</span>
            <span style={{ animation: "pulse 1s infinite 0.4s" }}>●</span>
          </div>
          <span>Analyzing your numbers... (Gemini Rural Mentor)</span>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            marginTop: "8px",
            padding: "8px 14px",
            backgroundColor: "#fef2f2",
            color: "#b91c1c",
            borderRadius: "6px",
            fontSize: "12.5px",
          }}
        >
          {errorMsg}
        </div>
      )}
    </div>
  );
}
