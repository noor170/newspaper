import { LeadStory, NewsCard } from "./NewsCard";
import Sidebar from "./Sidebar";
import { categoryLabel } from "./utils";

function SectionBlock({ title, children }) {
  return (
    <section className="np-section">
      <h2 className="np-section-title">{title}</h2>
      {children}
    </section>
  );
}

function SkeletonGrid() {
  return (
    <div className="np-layout">
      <div className="np-main-col">
        <div className="np-skeleton np-skeleton--lead" />
        <div className="np-grid">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="np-skeleton np-skeleton--card" />
          ))}
        </div>
      </div>
      <div className="np-skeleton np-skeleton--sidebar" />
    </div>
  );
}

export default function HomePage({ articles, loading, error, activeCategory, onOpen }) {
  if (loading) return <SkeletonGrid />;
  if (error) return <div className="np-alert np-alert--error">{error}</div>;
  if (!articles.length) {
    return (
      <div className="np-empty">
        <p>এখনও কোনো সংবাদ প্রকাশিত হয়নি।</p>
        <span>অ্যাডমিন প্যানেল থেকে প্রথম খবর পোস্ট করুন।</span>
      </div>
    );
  }

  const featured = articles.filter((a) => a.is_featured);
  const lead = featured[0] || articles[0];
  const secondary = (featured.length > 1 ? featured.slice(1) : articles.slice(1, 3)).filter(
    (a) => a.id !== lead.id
  );
  const rest = articles.filter((a) => a.id !== lead.id && !secondary.some((s) => s.id === a.id));
  const videoNews = articles.filter((a) => a.news_type === "video");
  const photoNews = articles.filter((a) => a.news_type === "photo");

  const sectionTitle = activeCategory
    ? `${categoryLabel(activeCategory)} — সর্বশেষ`
    : "সর্বশেষ সংবাদ";

  return (
    <div className="np-layout">
      <div className="np-main-col">
        <LeadStory article={lead} onOpen={onOpen} />

        {secondary.length > 0 && (
          <div className="np-sub-lead-grid">
            {secondary.map((article) => (
              <NewsCard key={article.id} article={article} onOpen={onOpen} />
            ))}
          </div>
        )}

        {videoNews.length > 0 && !activeCategory && (
          <SectionBlock title="ভিডিও নিউজ">
            <div className="np-scroll-row">
              {videoNews.map((article) => (
                <NewsCard key={article.id} article={article} onOpen={onOpen} compact />
              ))}
            </div>
          </SectionBlock>
        )}

        {photoNews.length > 0 && !activeCategory && (
          <SectionBlock title="ফটো গ্যালারি">
            <div className="np-grid np-grid--3">
              {photoNews.slice(0, 6).map((article) => (
                <NewsCard key={article.id} article={article} onOpen={onOpen} />
              ))}
            </div>
          </SectionBlock>
        )}

        <SectionBlock title={sectionTitle}>
          <div className="np-grid">
            {rest.map((article) => (
              <NewsCard key={article.id} article={article} onOpen={onOpen} />
            ))}
          </div>
        </SectionBlock>
      </div>

      <Sidebar articles={articles} onOpen={onOpen} activeCategory={activeCategory} />
    </div>
  );
}
