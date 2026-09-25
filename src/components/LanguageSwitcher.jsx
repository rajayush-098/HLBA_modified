import { Languages } from "lucide-react";
import i18n, { SUPPORTED_LANGUAGES } from "../i18n";

export default function LanguageSwitcher({ activeLang, onLanguageChange }) {
  const currentLang = activeLang || i18n.language || "hi";

  const handleSelect = (e) => {
    const code = e.target.value;
    i18n.changeLanguage(code);
    if (onLanguageChange) {
      onLanguageChange(code);
    }
  };

  return (
    <div className="language-switcher-wrapper" style={{ display: "inline-flex", alignItems: "center" }}>
      <label
        htmlFor="language-dropdown-select"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          background: "rgba(255, 255, 255, 0.18)",
          border: "1px solid rgba(255, 255, 255, 0.35)",
          borderRadius: "24px",
          padding: "4px 12px 4px 10px",
          color: "#ffffff",
          cursor: "pointer",
          backdropFilter: "blur(6px)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
        }}
      >
        <Languages size={16} strokeWidth={2.2} style={{ color: "#ffffff", flexShrink: 0 }} />
        <select
          id="language-dropdown-select"
          value={currentLang}
          onChange={handleSelect}
          aria-label="Select Language"
          style={{
            background: "transparent",
            border: "none",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "13px",
            outline: "none",
            cursor: "pointer",
            paddingRight: "4px",
          }}
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <option
              key={l.code}
              value={l.code}
              style={{
                color: "#1e293b",
                background: "#ffffff",
                fontWeight: 600,
              }}
            >
              {l.nativeName} ({l.name})
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
