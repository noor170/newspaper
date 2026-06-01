import { HeadlineRow } from "./NewsCard";
import { categoryLabel } from "./utils";

export default function Sidebar({ articles, onOpen, activeCategory }) {
  return (
    <aside className="np-sidebar">
      <div className="np-sidebar-block">
        <h3 className="np-sidebar-title">প্রধান শিরোনাম</h3>
        <div className="np-headline-list">
          {articles.slice(0, 8).map((a, i) => (
            <HeadlineRow key={a.id} article={a} onOpen={onOpen} index={i} />
          ))}
        </div>
      </div>

      {activeCategory && (
        <div className="np-sidebar-block np-sidebar-block--muted">
          <p className="np-sidebar-filter">
            বিভাগ: <strong>{categoryLabel(activeCategory)}</strong>
          </p>
        </div>
      )}

      <div className="np-sidebar-block np-sidebar-ad">
        <p>বাংলা নিউজ ২৪</p>
        <span>আপনার বিশ্বস্ত অনলাইন পত্রিকা</span>
      </div>
    </aside>
  );
}
