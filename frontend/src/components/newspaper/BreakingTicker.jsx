export default function BreakingTicker({ headlines, onOpen }) {
  if (!headlines?.length) return null;

  const items = [...headlines, ...headlines];

  return (
    <div className="np-breaking">
      <div className="np-container np-breaking-inner">
        <span className="np-breaking-label">ব্রেকিং</span>
        <div className="np-breaking-track-wrap">
          <div className="np-breaking-track">
            {items.map((article, i) => (
              <button
                key={`${article.id}-${i}`}
                type="button"
                className="np-breaking-item"
                onClick={() => onOpen(article.slug)}
              >
                {article.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
