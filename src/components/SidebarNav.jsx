import { useEffect } from "react";
import { X, Layers } from "lucide-react";

export default function SidebarNav({
  pages,
  activePageId,
  onSelectPage,
  isOpen,
  onClose,
  result,
  lang,
  t,
  onEditDetails,
}) {
  // Listen for Escape key to close the menu
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Smooth Backdrop with blur */}
      <div
        className={`sidebar-backdrop ${isOpen ? "open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`analysis-sidebar ${isOpen ? "open" : ""}`}
        aria-label="Side Pages Menu"
      >
        <div className="sidebar-header">
          {/* Top Row with Badge & Close Button */}
          <div className="sidebar-header-top-row">
            <div className="sidebar-drawer-badge">
              <Layers size={13} style={{ color: "var(--primary)" }} />
              <span>{lang === "hi" ? "11 चरण नेविगेशन" : "11 Steps Navigation"}</span>
            </div>

            <button
              type="button"
              className="sidebar-close-btn"
              onClick={onClose}
              aria-label="Close menu"
              title={lang === "hi" ? "मेन्यू बंद करें (Esc)" : "Close menu (Esc)"}
            >
              <X size={18} />
            </button>
          </div>

          <div className="sidebar-business-info">
            <div>
              <h3 className="sidebar-biz-name" title={result?.business}>
                {result?.business || "Business"}
              </h3>
              <p className="sidebar-biz-loc">
                {result?.location || "Area"}, {result?.district || "District"}
              </p>
            </div>
          </div>

          <div
            className="sidebar-feasibility-tag"
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "600",
              textAlign: "center",
              marginBottom: "8px",
            }}
          >
            {result?.feasibilityVerdict || result?.feasibility || "Feasible"}
          </div>

          <button
            type="button"
            className="sidebar-back-btn"
            onClick={onEditDetails}
            title="Edit input numbers"
          >
            {t.editDetails}
          </button>
        </div>

        <div className="sidebar-nav-title">
          <span>{lang === "hi" ? "पेज चुनें (Side Pages)" : "Select Side Page"}</span>
          <span className="page-count-badge">
            {pages.length} {lang === "hi" ? "पेज" : "Pages"}
          </span>
        </div>

        <nav className="sidebar-menu" aria-label="Analysis Side Pages">
          {pages.map((p, idx) => {
            const isActive = activePageId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className={`sidebar-menu-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  onSelectPage(p.id);
                  if (onClose) onClose();
                }}
              >
                <span className="menu-num">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div className="menu-text-wrap">
                  <span className="menu-title">{p.title[lang] || p.title.en}</span>
                  {p.subtitle && (
                    <span className="menu-sub">{p.subtitle[lang] || p.subtitle.en}</span>
                  )}
                </div>
                {isActive && <span className="menu-active-dot" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer-card">
          <p className="sidebar-tip-title">
            {lang === "hi" ? "मदद चाहिए?" : "Need Help?"}
          </p>
          <p className="sidebar-tip-desc">
            {lang === "hi"
              ? "ऊपर 'बोलकर सुनाएं' बटन दबाकर हर पेज की बात अपनी भाषा में सुनें।"
              : "Click 'Listen in Voice' to hear explanations in simple speech."}
          </p>
        </div>
      </aside>
    </>
  );
}
