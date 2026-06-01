const FOOTER_SECTIONS = [
  {
    title: "বিভাগ",
    links: [
      ["জাতীয়", "national"],
      ["রাজনীতি", "politics"],
      ["খেলাধুলা", "sports"],
      ["বিনোদন", "entertainment"],
    ],
  },
  {
    title: "আরও",
    links: [
      ["প্রযুক্তি", "technology"],
      ["বাণিজ্য", "business"],
      ["আন্তর্জাতিক", "international"],
      ["মতামত", "opinion"],
    ],
  },
];

export default function Footer({ onCategory, onHome }) {
  return (
    <footer className="np-footer">
      <div className="np-container np-footer-grid">
        <div className="np-footer-brand">
          <h3>বাংলা নিউজ ২৪</h3>
          <p>বাংলাদেশ ও বিশ্বের সর্বশেষ খবর — নির্ভরযোগ্য অনলাইন পত্রিকা।</p>
        </div>
        {FOOTER_SECTIONS.map((section) => (
          <div key={section.title} className="np-footer-col">
            <h4>{section.title}</h4>
            <ul>
              {section.links.map(([label, cat]) => (
                <li key={cat}>
                  <button type="button" onClick={() => onCategory(cat)}>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="np-footer-col">
          <h4>যোগাযোগ</h4>
          <p>news@banglanews24.com</p>
          <p>ঢাকা, বাংলাদেশ</p>
        </div>
      </div>
      <div className="np-footer-bottom">
        <div className="np-container">
          <button type="button" className="np-footer-home" onClick={onHome}>
            © {new Date().getFullYear()} Bangla News 24
          </button>
          <span>সর্বস্বত্ব সংরক্ষিত</span>
        </div>
      </div>
    </footer>
  );
}
