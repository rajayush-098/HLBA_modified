// Text to speech utility for Low-English & Rural Users
let activeUtterance = null;
let keepAliveTimer = null;

export function speakText(text, lang = "hi-IN", onEnd = null) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    if (typeof onEnd === "function") {
      try { onEnd(); } catch { /* ignore */ }
    }
    return false;
  }

  const cleanText = (text || "").trim();
  if (!cleanText) {
    if (typeof onEnd === "function") {
      try { onEnd(); } catch { /* ignore */ }
    }
    return false;
  }

  try {
    stopSpeaking(); // stop any ongoing speech and timers

    const utterance = new SpeechSynthesisUtterance(cleanText);
    activeUtterance = utterance;

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

    const matchedVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().includes(targetLocale.slice(0, 2)) ||
        v.lang.toLowerCase().includes(targetLocale.toLowerCase())
    );
    if (matchedVoice) utterance.voice = matchedVoice;
    utterance.lang = targetLocale;
    utterance.rate = 0.95; // slightly slower for better comprehension
    utterance.pitch = 1.0;

    let hasEnded = false;
    const finish = () => {
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }
      if (activeUtterance === utterance) {
        activeUtterance = null;
      }
      if (!hasEnded) {
        hasEnded = true;
        if (typeof onEnd === "function") {
          try {
            onEnd();
          } catch (callbackErr) {
            console.warn("TTS onEnd callback error:", callbackErr);
          }
        }
      }
    };

    utterance.onend = finish;
    utterance.onerror = finish;

    // Chromium keep-alive mechanism to prevent long speech synthesis pausing
    keepAliveTimer = setInterval(() => {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      } else {
        finish();
      }
    }, 10000);

    // Fallback safety timeout based on text length (~120ms per character)
    const maxSpeechDurationMs = Math.max(4000, cleanText.length * 150 + 2000);
    setTimeout(() => {
      if (!hasEnded && activeUtterance === utterance) {
        finish();
      }
    }, maxSpeechDurationMs);

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.error("Speech synthesis error:", err);
    if (typeof onEnd === "function") {
      try { onEnd(); } catch { /* ignore */ }
    }
    return false;
  }
}

export function stopSpeaking() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
  activeUtterance = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch { /* ignore */ }
  }
}
