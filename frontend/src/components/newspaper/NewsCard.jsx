import { Camera, FileText, Play } from "lucide-react";
import { categoryLabel, excerpt, firstImage, formatDate, hasVideo, typeLabel } from "./utils";

function TypeIcon({ type }) {
  if (type === "video") return <Play size={14} />;
  if (type === "photo") return <Camera size={14} />;
  return <FileText size={14} />;
}

export function LeadStory({ article, onOpen }) {
  const image = firstImage(article);

  return (
    <article
      className="np-lead"
      onClick={() => onOpen(article.slug)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(article.slug)}
      role="button"
      tabIndex={0}
    >
      <div className="np-lead-media">
        {image ? (
          <img src={image} alt="" />
        ) : (
          <div className="np-placeholder np-placeholder--lead">
            <TypeIcon type={article.news_type} />
          </div>
        )}
        <div className="np-lead-overlay" />
      </div>
      <div className="np-lead-content">
        <span className={`np-badge np-badge--${article.news_type}`}>
          <TypeIcon type={article.news_type} />
          {typeLabel(article.news_type)}
        </span>
        <h2>{article.title}</h2>
        <p>{article.summary || excerpt(article.content, 160)}</p>
        <div className="np-byline">
          {categoryLabel(article.category)} · {article.author} · {formatDate(article.created_at, true)}
        </div>
      </div>
    </article>
  );
}

export function NewsCard({ article, onOpen, compact }) {
  const image = firstImage(article);
  const video = hasVideo(article);

  return (
    <article
      className={`np-card ${compact ? "np-card--compact" : ""}`}
      onClick={() => onOpen(article.slug)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(article.slug)}
      role="button"
      tabIndex={0}
    >
      <div className="np-card-media">
        {image ? (
          <img src={image} alt="" loading="lazy" />
        ) : (
          <div className="np-placeholder">
            <TypeIcon type={article.news_type} />
          </div>
        )}
        {video && <span className="np-play-badge"><Play size={16} fill="currentColor" /></span>}
      </div>
      <div className="np-card-body">
        <span className={`np-badge np-badge--${article.news_type}`}>{typeLabel(article.news_type)}</span>
        <h3>{article.title}</h3>
        {!compact && <p>{article.summary || excerpt(article.content)}</p>}
        <div className="np-byline">{categoryLabel(article.category)} · {formatDate(article.created_at, true)}</div>
      </div>
    </article>
  );
}

export function HeadlineRow({ article, onOpen, index }) {
  return (
    <button type="button" className="np-headline-row" onClick={() => onOpen(article.slug)}>
      <span className="np-headline-num">{String(index + 1).padStart(2, "0")}</span>
      <span className="np-headline-text">{article.title}</span>
    </button>
  );
}
