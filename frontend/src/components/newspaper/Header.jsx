import { Menu, X } from "lucide-react";
import { useState } from "react";
import { CATEGORY_LABELS } from "../../constants/api";

export default function Header({
  categories,
  activeCategory,
  onCategory,
  onHome,
  onAdmin,
  view,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const selectCategory = (cat) => {
    onCategory(cat);
    setMenuOpen(false);
  };

  return (
    <header className="np-header">
      <div className="np-header-utility">
        <div className="np-container np-header-utility-inner">
          <span className="np-date">
            {new Date().toLocaleDateString("bn-BD", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
          <div className="np-header-links">
            <button type="button" className="np-link-btn" onClick={onHome}>
              প্রচ্ছদ
            </button>
            <button type="button" className="np-link-btn np-admin-link" onClick={onAdmin}>
              {view === "admin" ? "সাইটে ফিরুন" : "অ্যাডমিন"}
            </button>
          </div>
        </div>
      </div>

      <div className="np-masthead" onClick={onHome} role="presentation">
        <div className="np-container np-masthead-inner">
          <div className="np-masthead-rule" />
          <p className="np-tagline">বাংলাদেশ ও বিশ্বের সর্বশেষ খবর</p>
          <h1 className="np-logo">
            <span className="np-logo-bangla">বাংলা নিউজ</span>
            <span className="np-logo-num">২৪</span>
          </h1>
          <p className="np-logo-en">Bangla News 24 — Online Newspaper</p>
          <div className="np-masthead-rule" />
        </div>
      </div>

      {view === "home" && (
        <nav className="np-nav" aria-label="Categories">
          <div className="np-container np-nav-inner">
            <button
              type="button"
              className="np-nav-toggle"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
              <span>বিভাগ</span>
            </button>
            <ul className={`np-nav-list ${menuOpen ? "open" : ""}`}>
              <li>
                <button
                  type="button"
                  className={!activeCategory ? "active" : ""}
                  onClick={() => selectCategory(null)}
                >
                  সব খবর
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat}>
                  <button
                    type="button"
                    className={activeCategory === cat ? "active" : ""}
                    onClick={() => selectCategory(cat)}
                  >
                    {CATEGORY_LABELS[cat] || cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}
    </header>
  );
}
