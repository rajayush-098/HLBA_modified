// Text to speech utility for Low-English & Rural Users
export function speakText(text, lang = "hi-IN") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }

  try {
    window.speechSynthesis.cancel(); // stop any ongoing speech

    const utterance = new SpeechSynthesisUtterance(text);
    // Try to find matching voice
    const voices = window.speechSynthesis.getVoices();
    const cleanLang = (lang || "").toLowerCase();
    let targetLocale = "hi-IN";
    if (cleanLang.startsWith("mr")) targetLocale = "mr-IN";
    else if (cleanLang.startsWith("bn")) targetLocale = "bn-IN";
    else if (cleanLang.startsWith("te")) targetLocale = "te-IN";
    else if (cleanLang.startsWith("ta")) targetLocale = "ta-IN";
    else if (cleanLang.startsWith("en")) targetLocale = "en-IN";
    else targetLocale = "hi-IN";

    const matchedVoice = voices.find((v) => v.lang.toLowerCase().includes(targetLocale.slice(0, 2)) || v.lang.toLowerCase().includes(targetLocale.toLowerCase()));
    if (matchedVoice) utterance.voice = matchedVoice;
    utterance.lang = targetLocale;
    utterance.rate = 0.95; // slightly slower for better comprehension
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.error("Speech synthesis error:", err);
    return false;
  }
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
