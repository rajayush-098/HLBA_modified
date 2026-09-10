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
    if (lang.startsWith("hi")) {
      const hindiVoice = voices.find((v) => v.lang.includes("hi") || v.lang.includes("IN"));
      if (hindiVoice) utterance.voice = hindiVoice;
      utterance.lang = "hi-IN";
    } else {
      const enVoice = voices.find((v) => v.lang.includes("en-IN") || v.lang.includes("en"));
      if (enVoice) utterance.voice = enVoice;
      utterance.lang = "en-IN";
    }
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
