import { useState, useEffect } from "react";
import "./App.css";
import locationData from "./locationData";
import { analyzeBusiness } from "./advisorLogic";
import { translations } from "./translations";
import { speakText, stopSpeaking } from "./utils/speech";
import i18n from "./i18n";
import LanguageSwitcher from "./components/LanguageSwitcher";

// Side Pages
import SidebarNav from "./components/SidebarNav";
import PageOverview from "./components/PageOverview";
import PageProfit from "./components/PageProfit";
import PageProjection from "./components/PageProjection";
import PageGovtLoan from "./components/PageGovtLoan";
import PageEmi from "./components/PageEmi";
import PageMarket from "./components/PageMarket";
import PageOpportunities from "./components/PageOpportunities";
import PageSwot from "./components/PageSwot";
import PageRisk from "./components/PageRisk";
import PageAdvisor from "./components/PageAdvisor";
import PageReportCard from "./components/PageReportCard";
import SmrityAssistant from "./components/SmrityAssistant";
// eslint-disable-next-line no-unused-vars
import odopData from "./odopData.json";

const PAGES = [
  {
    id: "overview",
    title: {
      en: "Overview & Verdict",
      hi: "सारांश व फैसला",
      hinglish: "Summary aur Faisla",
      mr: "आढावा आणि निष्कर्ष",
      bn: "সারসংক্ষেপ ও সিদ্ধান্ত",
      te: "సమీక్ష మరియు తీర్పు",
      ta: "கண்ணோட்டம் மற்றும் முடிவு",
    },
    subtitle: {
      en: "Feasibility, key profit & verdict",
      hi: "मुनाफा व मुख्य परिणाम",
      hinglish: "Overall profit aur natija",
      mr: "व्यवहार्यता व नफा",
      bn: "সম্ভাব্যতা ও নিট লাভ",
      te: "సాధ్యత మరియు లాభం",
      ta: "சாத்தியக்கூறு & லாபம்",
    },
  },
  {
    id: "profit",
    title: {
      en: "Profit & Money Math",
      hi: "कमाई और खर्चा",
      hinglish: "Kamai aur Kharcha",
      mr: "नफा आणि हिशोब",
      bn: "আয় এবং ব্যয়",
      te: "ఆదాయం మరియు ఖర్చులు",
      ta: "வருமானம் & செலவு",
    },
    subtitle: {
      en: "Sales, costs & break-even point",
      hi: "बिक्री, लागत व ब्रेक-ईवन",
      hinglish: "Bikri, kharcha aur bachat",
      mr: "विक्री, खर्च व नफा बिंदू",
      bn: "বিক্রয় ও সমপরিমাণ আয়",
      te: "అమ్మకాలు మరియు బ్రేక్ ఈవెన్",
      ta: "விற்பனை & சமநிலை புள்ளி",
    },
  },
  {
    id: "projection",
    title: {
      en: "12-Month Projection",
      hi: "12 महीने का हिसाब",
      hinglish: "12 Mahine Ka Hisab",
      mr: "12 महिन्यांचा अंदाज",
      bn: "১২ মাসের হিসাব",
      te: "12 నెలల అంచనా",
      ta: "12 மாத கணிப்பு",
    },
    subtitle: {
      en: "Month-by-month savings timeline",
      hi: "1 साल में कुल जमा पूँजी",
      hinglish: "Ek saal ki kul bachat",
      mr: "वार्षिक जमा भांडवल",
      bn: "১ বছরের মোট সঞ্চয়",
      te: "వార్షిక పొదుపు వివరాలు",
      ta: "வருடாந்திர சேமிப்பு விவரம்",
    },
  },
  {
    id: "loan",
    title: {
      en: "Govt Loan & Schemes",
      hi: "सरकारी लोन योजना",
      hinglish: "Sarkari Loan Scheme",
      mr: "सरकारी कर्ज योजना",
      bn: "সরকারি ঋণ প্রকল্প",
      te: "ప్రభుత్వ రుణ పథకాలు",
      ta: "அரசு கடன் திட்டங்கள்",
    },
    subtitle: {
      en: "Matched scheme & 4-step guide",
      hi: "योजना व आवेदन का तरीका",
      hinglish: "Bank loan aur apply steps",
      mr: "कर्ज योजना व अर्ज पद्धती",
      bn: "প্রকল্প ও আবেদনের নিয়ম",
      te: "పథకం మరియు దరఖాస్తు విధానం",
      ta: "திட்டம் & விண்ணப்பிக்கும் வழி",
    },
  },
  {
    id: "emi",
    title: {
      en: "Monthly EMI & Schedule",
      hi: "महीने की किश्त (EMI)",
      hinglish: "Har Mahine Ki Kist",
      mr: "मासिक हप्ता (EMI)",
      bn: "মাসিক কিস্তি (EMI)",
      te: "నెలవారీ వాయిదా (EMI)",
      ta: "மாதாந்திர தவணை (EMI)",
    },
    subtitle: {
      en: "EMI affordability & tenure",
      hi: "किश्त चुकाने की क्षमता",
      hinglish: "EMI repayment schedule",
      mr: "हप्ता फेडण्याची क्षमता",
      bn: "কিস্তি পরিশোধের ক্ষমতা",
      te: "వాయిదా చెల్లింపు సామర్థ్యం",
      ta: "தவணை செலுத்தும் திறன்",
    },
  },
  {
    id: "market",
    title: {
      en: "Local Area & Market Demand",
      hi: "गाँव का बाज़ार व माँग",
      hinglish: "Gaon Ka Bazaar aur Demand",
      mr: "स्थानिक बाजार व मागणी",
      bn: "স্থানীয় বাজার ও চাহিদা",
      te: "స్థానిక మార్కెట్ & డిమాండ్",
      ta: "உள்ளூர் சந்தை & தேவை",
    },
    subtitle: {
      en: "5-10 km radius & channels",
      hi: "ग्राहक दायरा व बिक्री के साधन",
      hinglish: "Grahak aur competition",
      mr: "ग्राहक पोहोच व विक्री मार्ग",
      bn: "ক্রেতা পরিসর ও মাধ্যম",
      te: "వినియోగదారుల పరిధి",
      ta: "வாடிக்கையாளர் எல்லை",
    },
  },
  {
    id: "opportunities",
    title: {
      en: "New Opportunities",
      hi: "नए व्यापारिक मौके",
      hinglish: "Naye Business Mauke",
      mr: "नवीन व्यावसायिक संधी",
      bn: "নতুন ব্যবসায়িক সুযোগ",
      te: "కొత్త వ్యాపార అవకాశాలు",
      ta: "புதிய வணிக வாய்ப்புகள்",
    },
    subtitle: {
      en: "Unserved niches & growth",
      hi: "खाली जगहें जहाँ कम्पटीशन कम है",
      hinglish: "Extra kamai ke raaste",
      mr: "कमी स्पर्धा असणाऱ्या संधी",
      bn: "কম প্রতিযোগিতার ক্ষেত্র",
      te: "తక్కువ పోటీ ఉన్న రంగాలు",
      ta: "குறைந்த போட்டி உள்ள பகுதிகள்",
    },
  },
  {
    id: "swot",
    title: {
      en: "Strengths & Weaknesses (SWOT)",
      hi: "ताकत और कमज़ोरी (SWOT)",
      hinglish: "Taqat aur Kamzori",
      mr: "सामर्थ्य आणि मर्यादा (SWOT)",
      bn: "শক্তি ও দুর্বলতা (SWOT)",
      te: "బలాలు మరియు బలహీనతలు (SWOT)",
      ta: "பலம் மற்றும் பலவீனம் (SWOT)",
    },
    subtitle: {
      en: "Internal power & watchouts",
      hi: "आपकी मजबूती व सावधानियाँ",
      hinglish: "Faayde aur bachav",
      mr: "तुमची ताकद व दक्षता",
      bn: "শক্তি ও সতর্কতা",
      te: "మీ బలం మరియు జాగ్రత్తలు",
      ta: "உங்கள் பலம் & முன்னெச்சரிக்கைகள்",
    },
  },
  {
    id: "risk",
    title: {
      en: "Risk & Safety Guide",
      hi: "खतरा व सुरक्षा गाइड",
      hinglish: "Khatra aur Safety",
      mr: "जोखीम व सुरक्षितता",
      bn: "ঝুঁকি ও সুরক্ষা নির্দেশিকা",
      te: "రిస్క్ మరియు భద్రత",
      ta: "ஆபத்து & பாதுகாப்பு வழிகாட்டி",
    },
    subtitle: {
      en: "Safety score & loss prevention",
      hi: "सुरक्षा स्कोर व नुकसान से बचाव",
      hinglish: "Risk meter aur backup fund",
      mr: "सुरक्षितता गुण व नुकसान बचाव",
      bn: "নিরাপত্তা স্কোর ও ক্ষতি রোধ",
      te: "భద్రతా స్కోరు & నష్ట నివారణ",
      ta: "பாதுகாப்பு & நஷ்ட தடுப்பு",
    },
  },
  {
    id: "advisor",
    title: {
      en: "AI Business Advisor",
      hi: "AI व्यापार साथी",
      hinglish: "AI Vyapar Advisor",
      mr: "AI व्यवसाय सल्लागार",
      bn: "AI ব্যবসা উপদেষ্টা",
      te: "AI వ్యాపార సలహాదారు",
      ta: "AI வணிக ஆலோசகர்",
    },
    subtitle: {
      en: "Ask any question in simple words",
      hi: "बोलकर या लिखकर सवाल पूछें",
      hinglish: "Koi bhi sawal puchhein",
      mr: "सोप्या शब्दांत प्रश्न विचारा",
      bn: "সহজ কথায় প্রশ্ন করুন",
      te: "సులభమైన మాటల్లో ప్రశ్నలు అడగండి",
      ta: "எளிய சொற்களில் கேள்வி கேளுங்கள்",
    },
  },
  {
    id: "report",
    title: {
      en: "Print Business Parcha",
      hi: "व्यापार पर्चा प्रिंट करें",
      hinglish: "Vyapar Parcha Print",
      mr: "व्यवसाय अहवाल प्रिंट करा",
      bn: "ব্যবসা রিপোর্ট প্রিন্ট করুন",
      te: "వ్యాపార నివేదిక ముద్రించండి",
      ta: "வணிக அறிக்கையை அச்சிடுக",
    },
    subtitle: {
      en: "Official 1-page report for bank",
      hi: "बैंक व पंचायत में दिखाने योग्य",
      hinglish: "Bank manager ko dikhane ke liye",
      mr: "बँकेत सादर करण्याजोगा अहवाल",
      bn: "ব্যাংকের জন্য ১ পৃষ্ঠার রিপোর্ট",
      te: "బ్యాంకు కోసం అధికారిక నివేదిక",
      ta: "வங்கி பயன்பாட்டிற்கான அறிக்கை",
    },
  },
];

const businessTypes = [
  "Dairy & Milk Products",
  "Poultry & Bird Farming",
  "Agriculture, Seeds & Farming",
  "Fishery & Fish Farming",
  "Retail, Kirana & General Store",
  "Service, Repair & Mobile Shop",
  "Small Manufacturing & Flour Mill",
  "Pickles, Papad, Bakery & Food Processing",
  "Carpenter, Blacksmith, Potter & Artisan",
  "Tailoring, Garments & Handloom Weaving",
  "Street Vendor, Hawker & Food Cart",
  "Cold Storage, Warehouse & Post-Harvest Setup",
  "Agri-Clinic, Nursery & Farm Advisory Centre",
  "Solar Rooftop Installation & Green Energy Services",
  "Sanitation, Waste Recycling & Cleaning Services"
];

function App() {
  const [lang, setLang] = useState("hi"); // Default to Hindi for rural accessibility
  const [activePageId, setActivePageId] = useState("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // ---> PASTE IT RIGHT HERE <---
  const [detectedLocation, setDetectedLocation] = useState({ district: '', pin: '' });

  const [formData, setFormData] = useState({
    udyam_number: "",
    business_name: "किसान डेयरी फार्म (Kisan Dairy Farm)",
    category: "Dairy & Milk Products",
    state: "Uttar Pradesh",
    district: "Meerut",
    block: "Sardhana",
    location: "Sardhana",
    pin: "",
    experience: "Beginner",
    investment: "100000",
    monthly_revenue: "45000",
    monthly_expenses: "22000",
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [blocksMap, setBlocksMap] = useState({});
  const [udyamLoading, setUdyamLoading] = useState(false);
  const [udyamStatus, setUdyamStatus] = useState(null);

  const t = translations[lang] || translations.en;

  // Handle Udyam Verification & Auto-fill
  const handleVerifyUdyam = async () => {
    if (!formData.udyam_number || !formData.udyam_number.trim()) {
      setError(
        lang === "hi"
          ? "कृपया पहले उद्यम रजिस्ट्रेशन नंबर दर्ज करें।"
          : "Please enter your Udyam Registration Number first."
      );
      return;
    }

    setUdyamLoading(true);
    setUdyamStatus(null);
    setError("");

    try {
      const res = await fetch("/api/verify-udyam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ udyamNumber: formData.udyam_number.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to verify Udyam registration");
      }

      setFormData((prev) => ({
        ...prev,
        business_name: data.enterpriseName || prev.business_name,
        state: data.state || prev.state,
        district: data.district || prev.district,
        pin: data.pincode || prev.pin,
      }));

      if (data.district) {
        setDetectedLocation((prev) => ({
          ...prev,
          district: data.district,
          pin: data.pincode || prev.pin,
        }));
      }

      setUdyamStatus({
        type: "success",
        message:
          lang === "hi"
            ? `सफलतापूर्वक सत्यापित! ${data.enterpriseName} का विवरण भर दिया गया है।`
            : `Verified successfully! Details auto-filled for ${data.enterpriseName}.`,
      });
    } catch (err) {
      console.error("Udyam verification failed:", err);
      setUdyamStatus({
        type: "error",
        message: err?.message || "Failed to verify Udyam registration number.",
      });
    } finally {
      setUdyamLoading(false);
    }
  };

  // Fetch Pan-India district blocks dataset on mount
  useEffect(() => {
    fetch("https://gist.githubusercontent.com/Keshava11/aace79cf260e7955ac1768d3ad6e24bd/raw")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch blocks data");
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) return;
        const mapped = {};
        data.forEach((districtObj) => {
          if (districtObj && districtObj.name) {
            const key = districtObj.name.toLowerCase().trim();
            const blocks = Array.isArray(districtObj.blockList)
              ? districtObj.blockList.map((b) => {
                  const name = typeof b === "string" ? b : (b.name || "");
                  return name
                    .toLowerCase()
                    .split(" ")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ");
                })
              : [];
            mapped[key] = blocks;
          }
        });
        setBlocksMap(mapped);
      })
      .catch((err) => {
        console.warn("Error fetching blocks dataset:", err);
      });
  }, []);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  // Format currency in Indian notation
  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === "") {
      return "₹0";
    }
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return "₹0";
    }
    return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setError("");

    if (name === "state") {
      setFormData((prev) => ({
        ...prev,
        state: value,
        district: "",
        block: "",
        location: "",
      }));
      return;
    }

    if (name === "district") {
      setFormData((prev) => ({
        ...prev,
        district: value,
        block: "",
        location: "",
      }));
      return;
    }

    if (name === "block") {
      setFormData((prev) => ({
        ...prev,
        block: value,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Quick preset loader for low-English users
  const applyPreset = (presetKey) => {
    setError("");
    if (presetKey === "dairy") {
      setFormData({
        business_name: "किसान दूध डेयरी फार्म (Dairy Farm)",
        category: "Dairy & Milk Products",
        state: "Uttar Pradesh",
        district: "Meerut",
        block: "Sardhana",
        location: "Sardhana",
        experience: "Beginner",
        investment: "100000",
        monthly_revenue: "45000",
        monthly_expenses: "22000",
      });
    } else if (presetKey === "retail") {
      setFormData({
        business_name: "शर्मा किराना व जनरल स्टोर (Kirana Store)",
        category: "Retail, Kirana & General Store",
        state: "Bihar",
        district: "Patna",
        block: "Danapur",
        location: "Main Market Danapur",
        experience: "Intermediate",
        investment: "80000",
        monthly_revenue: "42000",
        monthly_expenses: "26000",
      });
    } else if (presetKey === "agri") {
      setFormData({
        business_name: "ग्राम बीज व खाद भंडार (Seed & Agri Store)",
        category: "Agriculture, Seeds & Farming",
        state: "Madhya Pradesh",
        district: "Indore",
        block: "Sanwer",
        location: "Khadia Village",
        experience: "Experienced",
        investment: "150000",
        monthly_revenue: "65000",
        monthly_expenses: "42000",
      });
    } else if (presetKey === "poultry") {
      setFormData({
        business_name: "जय जवान मुर्गी पालन (Poultry Farm)",
        category: "Poultry & Bird Farming",
        state: "Rajasthan",
        district: "Jaipur",
        block: "Amber",
        location: "Kukas Village",
        experience: "Beginner",
        investment: "120000",
        monthly_revenue: "52000",
        monthly_expenses: "31000",
      });
    } else if (presetKey === "tailor") {
      setFormData({
        business_name: "लक्ष्मी सिलाई व बुटीक केंद्र (Tailoring)",
        category: "Tailoring, Garments & Handloom Weaving",
        state: "Uttar Pradesh",
        district: "Gorakhpur",
        block: "Pipraich",
        location: "Ramgarh Tal",
        experience: "Experienced",
        investment: "50000",
        monthly_revenue: "28000",
        monthly_expenses: "12000",
      });
    }
  };

  const handleLanguageChange = (newLang) => {
    setLang(newLang);
    if (i18n.language !== newLang) {
      i18n.changeLanguage(newLang);
    }
    stopSpeaking();
    setIsSpeaking(false);
  };

  const validateForm = () => {
    if (!formData.business_name.trim()) {
      return lang === "hi"
        ? "कृपया व्यापार का नाम दर्ज करें।"
        : "Please enter your business name.";
    }
    if (!formData.category) {
      return lang === "hi"
        ? "कृपया व्यापार का प्रकार (Category) चुनें।"
        : "Please select a business category.";
    }
    if (!formData.state) {
      return lang === "hi"
        ? "कृपया अपना राज्य चुनें।"
        : "Please select your state.";
    }
    if (!formData.district) {
      return lang === "hi"
        ? "कृपया अपना जिला चुनें।"
        : "Please select your district.";
    }
    if (!formData.block.trim()) {
      return lang === "hi"
        ? "कृपया अपने ब्लॉक या तहसील का नाम चुनें/लिखें।"
        : "Please select or enter your block/tehsil.";
    }
    const finalLocation = formData.location.trim() || formData.block.trim();
    if (!finalLocation) {
      return lang === "hi"
        ? "कृपया अपने गाँव या कस्बे का नाम लिखें।"
        : "Please enter your village or town name.";
    }

    const inv = Number(formData.investment);
    const rev = Number(formData.monthly_revenue);
    const exp = Number(formData.monthly_expenses);

    if (!Number.isFinite(inv) || inv <= 0) {
      return lang === "hi"
        ? "अपनी जेब से लगाने वाली पूँजी ₹0 से अधिक होनी चाहिए।"
        : "Margin capital must be greater than ₹0.";
    }
    if (!Number.isFinite(rev) || rev <= 0) {
      return lang === "hi"
        ? "अनुमानित मासिक बिक्री ₹0 से अधिक होनी चाहिए।"
        : "Expected monthly revenue must be greater than ₹0.";
    }
    if (!Number.isFinite(exp) || exp < 0) {
      return lang === "hi"
        ? "मासिक खर्च शून्य से कम नहीं हो सकता।"
        : "Monthly expenses cannot be negative.";
    }

    return "";
  };

 const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const selectedOrTypedLocation = formData.block.trim();
      
      // --> NEW: Use detected map data if available, otherwise fall back to form inputs
      const finalDistrict = detectedLocation.district || formData.district;
      const finalPin = detectedLocation.pin || formData.pin || "";

      // Analyze using local advisor logic
      const analysisOutput = analyzeBusiness({
        business_name: formData.business_name.trim(),
        category: formData.category,
        state: formData.state,
        district: finalDistrict, // Inject map district
        block: selectedOrTypedLocation,
        location: formData.location.trim() || selectedOrTypedLocation,
        pin: finalPin, // Inject map PIN
        experience: formData.experience,
        investment: Number(formData.investment),
        monthly_revenue: Number(formData.monthly_revenue),
        monthly_expenses: Number(formData.monthly_expenses),
      });

      let finalOutput = analysisOutput;
      
      // Send the complete data package to the Node.js backend
      try {
        const languageNames = {
          hi: "Hindi",
          en: "English",
          hinglish: "Hinglish",
          mr: "Marathi",
          bn: "Bengali",
          te: "Telugu",
          ta: "Tamil",
        };
        const activeLanguage = languageNames[lang] || lang || "Hindi";

        const apiRes = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            business_name: formData.business_name.trim(),
            category: formData.category,
            state: formData.state,
            district: finalDistrict, // Inject map district
            block: selectedOrTypedLocation,
            location: formData.location.trim() || selectedOrTypedLocation,
            village: formData.location.trim(),
            pin: finalPin, // Inject map PIN
            experience: formData.experience,
            investment: Number(formData.investment),
            monthly_revenue: Number(formData.monthly_revenue),
            monthly_expenses: Number(formData.monthly_expenses),
            language: lang,
            selectedLanguage: activeLanguage,
          }),
        });
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          finalOutput = { ...analysisOutput, ...apiData };
        }
      } catch (apiErr) {
        console.warn("Backend /api/analyze fallback:", apiErr);
      }

      setResult({
        ...finalOutput,
        pin: finalPin,
        monthly_revenue: Number(formData.monthly_revenue),
        monthly_expenses: Number(formData.monthly_expenses),
        investment: Number(formData.investment),
      });

      // Default to overview page
      setActivePageId("overview");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      setError(
        lang === "hi"
          ? "विश्लेषण करते समय कोई त्रुटि हुई। कृपया दोबारा प्रयास करें।"
          : "An error occurred while analyzing the business. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Voice playback of the current side page
  const handleToggleVoice = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    if (!result) return;

    const mProfit = result.financial_analysis?.monthly_profit ?? 0;
    const yProfit = result.financial_analysis?.yearly_profit ?? 0;
    const scheme = result.scheme_analysis?.scheme_name ?? "सरकारी योजना";
    const loan = result.scheme_analysis?.eligible_loan ?? 0;
    const emi = result.loan_affordability?.monthly_emi ?? 0;

    const textToRead =
      lang === "hi"
        ? `नमस्ते! आपके व्यापार ${result.business} का विश्लेषण पूरा हो चुका है। यह व्यापार शुरू करने के लिए उपयुक्त है। हर महीने लगभग ${mProfit} रुपये की शुद्ध बचत होगी, और साल भर में लगभग ${yProfit} रुपये की कुल बचत बनेगी। आपको ${scheme} के तहत लगभग ${loan} रुपये तक का बैंक लोन मिल सकता है, जिसकी महीने की किश्त लगभग ${emi} रुपये होगी।`
        : `Hello! Analysis for ${result.business} is complete. This enterprise is feasible. Estimated net monthly profit is ${mProfit} rupees, and annual savings will be around ${yProfit} rupees. You are eligible for up to ${loan} rupees under the ${scheme}, with an estimated monthly EMI of ${emi} rupees.`;

    const ok = speakText(textToRead, lang === "hi" ? "hi-IN" : "en-IN");
    if (ok) setIsSpeaking(true);
  };

  // Side Page sequential navigation
  const currentIndex = PAGES.findIndex((p) => p.id === activePageId);
  const handlePrevPage = () => {
    if (currentIndex > 0) {
      setActivePageId(PAGES[currentIndex - 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const handleNextPage = () => {
    if (currentIndex < PAGES.length - 1) {
      setActivePageId(PAGES[currentIndex + 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="app">
      {/* ================= HEADER ================= */}
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-eyebrow">
            <span>{t.badge}</span>
          </div>
          <h1 className="brand-logo-title">
            <span className="brand-name">
              Vyapaa<span className="brand-rupee" aria-label="Rupee">₹</span>
            </span>
            <span className="brand-ai">AI</span>
          </h1>
          <p className="subtitle">{t.tagline}</p>
        </div>

        <div className="topbar-right">
          {/* Multilingual language dropdown switcher */}
          <LanguageSwitcher activeLang={lang} onLanguageChange={handleLanguageChange} />

          {result && (
            <button
              type="button"
              className={`voice-topbar-btn ${isSpeaking ? "speaking" : ""}`}
              onClick={handleToggleVoice}
              title="Listen to summary in audio"
            >
              {isSpeaking ? t.stopAudio : t.listenAloud}
            </button>
          )}
        </div>
      </header>

      {/* ================= MAIN CONTAINER ================= */}
      <main className="container">
        {!result ? (
          <section className="form-section">
            <div className="section-heading">
              <div className="heading-content">
                <h2>{t.formHeading}</h2>
                <p>{t.formSub}</p>
              </div>

              {/* Sample Quick Preset Pills */}
              <div className="presets-bar">
                <span className="preset-title">{t.samplePresetLabel}</span>
                <div className="preset-buttons">
                  <button
                    type="button"
                    className="preset-chip"
                    onClick={() => applyPreset("dairy")}
                  >
                    {t.presetDairy}
                  </button>
                  <button
                    type="button"
                    className="preset-chip"
                    onClick={() => applyPreset("retail")}
                  >
                    {t.presetRetail}
                  </button>
                  <button
                    type="button"
                    className="preset-chip"
                    onClick={() => applyPreset("agri")}
                  >
                    {t.presetAgri}
                  </button>
                  <button
                    type="button"
                    className="preset-chip"
                    onClick={() => applyPreset("poultry")}
                  >
                    {t.presetPoultry}
                  </button>
                  <button
                    type="button"
                    className="preset-chip"
                    onClick={() => applyPreset("tailor")}
                  >
                    {t.presetTailor}
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-grid">
                {/* BUSINESS NAME */}
                <div className="input-group">
                  <label htmlFor="business_name">
                    {t.businessName} <span className="req">*</span>
                  </label>
                  <input
                    id="business_name"
                    type="text"
                    name="business_name"
                    placeholder={t.businessNamePlaceholder}
                    value={formData.business_name}
                    onChange={handleChange}
                  />
                  <small className="input-help-text">
                    {lang === "hi"
                      ? "अपनी दुकान या काम का कोई भी आसान नाम लिखें।"
                      : "Name of your proposed farm, store or service."}
                  </small>
                </div>

                {/* CATEGORY */}
                <div className="input-group">
                  <label htmlFor="category">
                    {t.category} <span className="req">*</span>
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                  >
                    <option value="">{t.selectCategory}</option>
                    {businessTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* STATE */}
                <div className="input-group">
                  <label htmlFor="state">
                    {t.state} <span className="req">*</span>
                  </label>
                  <select
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                  >
                    <option value="">{t.selectState}</option>
                    {Object.keys(locationData)
                      .sort()
                      .map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                  </select>
                </div>

                {/* DISTRICT */}
                <div className="input-group">
                  <label htmlFor="district">
                    {t.district} <span className="req">*</span>
                    {(detectedLocation.pin || formData.pin) && (
                      <span
                        style={{
                          marginLeft: "8px",
                          fontSize: "11px",
                          fontWeight: "600",
                          padding: "2px 8px",
                          backgroundColor: "#e0f2fe",
                          color: "#0369a1",
                          borderRadius: "12px",
                          border: "1px solid #bae6fd",
                          display: "inline-block",
                        }}
                      >
                        PIN: {detectedLocation.pin || formData.pin}
                      </span>
                    )}
                  </label>
                  <select
                    id="district"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    disabled={!formData.state}
                  >
                    <option value="">
                      {formData.state ? t.selectDistrict : t.firstSelectState}
                    </option>
                    {formData.state &&
                      locationData[formData.state]?.map((dst) => (
                        <option key={dst} value={dst}>
                          {dst}
                        </option>
                      ))}
                  </select>
                </div>

                {/* BLOCK */}
                <div className="input-group">
                  <label htmlFor="block">
                    {t.block} <span className="req">*</span>
                  </label>
                  {(() => {
                    const districtKey = formData.district ? formData.district.toLowerCase().trim() : "";
                    const districtBlocks = districtKey && blocksMap[districtKey] ? blocksMap[districtKey] : null;

                    if (districtBlocks && districtBlocks.length > 0) {
                      const sortedBlocks = [...districtBlocks].sort((a, b) => a.localeCompare(b));
                      return (
                        <select
                          id="block"
                          name="block"
                          value={formData.block}
                          onChange={handleChange}
                          required
                        >
                          <option value="">-- Select Block/Tehsil --</option>
                          {sortedBlocks.map((blk) => (
                            <option key={blk} value={blk}>
                              {blk}
                            </option>
                          ))}
                        </select>
                      );
                    }

                    return (
                      <input
                        id="block"
                        type="text"
                        name="block"
                        placeholder={t.blockPlaceholder}
                        value={formData.block}
                        onChange={handleChange}
                        required
                      />
                    );
                  })()}
                </div>

                {/* LOCATION */}
                <div className="input-group">
                  <label htmlFor="location">
                    {t.location} <span className="req">*</span>
                  </label>
                  <input
                    id="location"
                    type="text"
                    name="location"
                    placeholder={t.locationPlaceholder}
                    value={formData.location}
                    onChange={handleChange}
                  />
                </div>

                {/* EXPERIENCE */}
                <div className="input-group">
                  <label htmlFor="experience">{t.experience}</label>
                  <select
                    id="experience"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                  >
                    <option value="Beginner">{t.expBeginner}</option>
                    <option value="Intermediate">{t.expInter}</option>
                    <option value="Experienced">{t.expExpert}</option>
                  </select>
                </div>

                {/* INVESTMENT */}
                <div className="input-group">
                  <label htmlFor="investment">
                    {t.investment} <span className="req">*</span>
                  </label>
                  <div className="input-currency-wrapper">
                    <span className="currency-prefix">₹</span>
                    <input
                      id="investment"
                      type="number"
                      name="investment"
                      placeholder={t.investmentPlaceholder}
                      min="1"
                      value={formData.investment}
                      onChange={handleChange}
                    />
                  </div>
                  <small className="input-help-text">{t.investmentHelp}</small>
                </div>

                {/* MONTHLY REVENUE */}
                <div className="input-group">
                  <label htmlFor="monthly_revenue">
                    {t.revenue} <span className="req">*</span>
                  </label>
                  <div className="input-currency-wrapper">
                    <span className="currency-prefix">₹</span>
                    <input
                      id="monthly_revenue"
                      type="number"
                      name="monthly_revenue"
                      placeholder={t.revenuePlaceholder}
                      min="1"
                      value={formData.monthly_revenue}
                      onChange={handleChange}
                    />
                  </div>
                  <small className="input-help-text">{t.revenueHelp}</small>
                </div>

                {/* MONTHLY EXPENSES */}
                <div className="input-group">
                  <label htmlFor="monthly_expenses">
                    {t.expenses} <span className="req">*</span>
                  </label>
                  <div className="input-currency-wrapper">
                    <span className="currency-prefix">₹</span>
                    <input
                      id="monthly_expenses"
                      type="number"
                      name="monthly_expenses"
                      placeholder={t.expensesPlaceholder}
                      min="0"
                      value={formData.monthly_expenses}
                      onChange={handleChange}
                    />
                  </div>
                  <small className="input-help-text">{t.expensesHelp}</small>
                </div>
              </div>

              {error && <div className="error-box">{error}</div>}

              <button
                type="submit"
                className="analyze-btn"
                disabled={loading}
              >
                {loading ? t.btnAnalyzing : t.btnAnalyze}
              </button>

              {/* SUBTLE UDYAM AUTO-FILL (DEMOTED TO BOTTOM) */}
              <div
                style={{
                  marginTop: "20px",
                  paddingTop: "14px",
                  borderTop: "1px dashed #cbd5e1",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    fontSize: "13px",
                    color: "#64748b",
                  }}
                >
                  <span>
                    {lang === "hi"
                      ? "उद्यम रजिस्ट्रेशन है? (वैकल्पिक):"
                      : "Have an Udyam Number? (Optional):"}
                  </span>
                  <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                    <input
                      id="udyam_number"
                      type="text"
                      name="udyam_number"
                      placeholder="UDYAM-XX-00-0000000"
                      value={formData.udyam_number}
                      onChange={handleChange}
                      style={{
                        padding: "4px 8px",
                        fontSize: "12px",
                        height: "30px",
                        width: "190px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#f8fafc",
                        color: "#334155",
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleVerifyUdyam}
                      disabled={udyamLoading}
                      style={{
                        padding: "3px 10px",
                        height: "30px",
                        fontSize: "12px",
                        fontWeight: 500,
                        backgroundColor: "#f1f5f9",
                        color: "#475569",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        cursor: udyamLoading ? "not-allowed" : "pointer",
                        opacity: udyamLoading ? 0.6 : 1,
                        transition: "all 0.15s ease",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = "#e2e8f0";
                        e.currentTarget.style.color = "#0f172a";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = "#f1f5f9";
                        e.currentTarget.style.color = "#475569";
                      }}
                    >
                      {udyamLoading
                        ? lang === "hi"
                          ? "जाँच..."
                          : "Checking..."
                        : lang === "hi"
                        ? "ऑटो-भरें"
                        : "Auto-fill"}
                    </button>
                  </div>
                </div>

                {udyamStatus && (
                  <div
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 500,
                      backgroundColor:
                        udyamStatus.type === "success" ? "#dcfce7" : "#fee2e2",
                      color:
                        udyamStatus.type === "success" ? "#15803d" : "#b91c1c",
                      border: `1px solid ${
                        udyamStatus.type === "success" ? "#86efac" : "#fca5a5"
                      }`,
                    }}
                  >
                    {udyamStatus.message}
                  </div>
                )}
              </div>
            </form>
          </section>
        ) : (
          /* ================= BUSINESS ANALYSIS HUB WITH MANY SIDE PAGES ================= */
          <div className="analysis-hub-layout">
            {/* Top Navigation Bar inside Results View */}
            <div className="hub-top-strip no-print">
              <div className="hub-top-left">
                <button
                  type="button"
                  className="mobile-sidebar-toggle-btn"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  aria-label="Toggle Side Pages Menu"
                >
                  <span className="toggle-label">
                    {lang === "hi" ? "पेज मेन्यू (Menu)" : "Side Pages"}
                  </span>
                </button>

                <div className="hub-breadcrumbs">
                  <span className="hub-tag">
                    {result.business}
                  </span>
                  <span className="hub-crumb-sep">/</span>
                  <span className="hub-current-page">
                    {PAGES[currentIndex]?.title[lang] || PAGES[currentIndex]?.title.en}
                  </span>
                </div>
              </div>

              <div className="hub-top-right">
                <span className="page-indicator-pill">
                  {t.page} {currentIndex + 1} {t.of} {PAGES.length}
                </span>

                <button
                  type="button"
                  className="hub-back-edit-btn"
                  onClick={() => {
                    stopSpeaking();
                    setIsSpeaking(false);
                    setResult(null);
                  }}
                >
                  {t.editDetails}
                </button>
              </div>
            </div>

            {/* Sidebar + Main Content Area */}
            <div className="analysis-body-container">
              {/* Sidebar Navigation */}
              <SidebarNav
                pages={PAGES}
                activePageId={activePageId}
                onSelectPage={(pageId) => {
                  setActivePageId(pageId);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                result={result}
                lang={lang}
                t={t}
                onEditDetails={() => {
                  stopSpeaking();
                  setIsSpeaking(false);
                  setResult(null);
                }}
              />

              {/* Dynamic Side Page Content Container */}
              <div className="analysis-main-viewport">
                {activePageId === "overview" && (
                  <PageOverview
                    result={result}
                    formatCurrency={formatCurrency}
                    lang={lang}
                    onJumpPage={(pId) => {
                      setActivePageId(pId);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                )}

                {activePageId === "profit" && (
                  <PageProfit
                    result={result}
                    formatCurrency={formatCurrency}
                    lang={lang}
                  />
                )}

                {activePageId === "projection" && (
                  <PageProjection
                    result={result}
                    formatCurrency={formatCurrency}
                    lang={lang}
                  />
                )}

                {activePageId === "loan" && (
                  <PageGovtLoan
                    result={result}
                    formatCurrency={formatCurrency}
                    lang={lang}
                    onJumpPage={(pId) => {
                      setActivePageId(pId);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                )}

                {activePageId === "emi" && (
                  <PageEmi
                    result={result}
                    formatCurrency={formatCurrency}
                    lang={lang}
                  />
                )}

                {activePageId === "market" && (
                  <PageMarket
                    result={result}
                    lang={lang}
                    formData={formData}
                  />
                )}

                {activePageId === "opportunities" && (
                  <PageOpportunities
                    result={result}
                    lang={lang}
                  />
                )}

                {activePageId === "swot" && (
                  <PageSwot
                    result={result}
                    lang={lang}
                    formatCurrency={formatCurrency}
                  />
                )}

                {activePageId === "risk" && (
                  <PageRisk
                    result={result}
                    lang={lang}
                    formatCurrency={formatCurrency}
                  />
                )}

                {activePageId === "advisor" && (
                  <PageAdvisor
                    result={result}
                    lang={lang}
                    formatCurrency={formatCurrency}
                  />
                )}

                {activePageId === "report" && (
                  <PageReportCard
                    result={result}
                    lang={lang}
                    formatCurrency={formatCurrency}
                  />
                )}

                {/* Sequential Bottom Navigation Bar */}
                <div className="page-bottom-nav no-print">
                  <button
                    type="button"
                    className="nav-page-btn prev"
                    onClick={handlePrevPage}
                    disabled={currentIndex === 0}
                  >
                    {t.prevPage}
                  </button>

                  <div className="nav-page-center">
                    <span>
                      {t.page} {currentIndex + 1} {t.of} {PAGES.length}:{" "}
                      <strong>
                        {PAGES[currentIndex]?.title[lang] || PAGES[currentIndex]?.title.en}
                      </strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    className="nav-page-btn next"
                    onClick={handleNextPage}
                    disabled={currentIndex === PAGES.length - 1}
                  >
                    {t.nextPage}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating SAHYOGI Assistant in Corner */}
      <SmrityAssistant currentResult={result} lang={lang} />
    </div>
  );
}

export default App;
