import { useEffect, useState } from "react";
import { ChevronLeft, Share2 } from "lucide-react";
import { NEWS_ENDPOINT, mediaUrl } from "../../constants/api";
import { NewsCard } from "./NewsCard";
import { categoryLabel, firstImage, formatDate, typeLabel } from "./utils";

export default function ArticlePage({ slug, onBack, onOpen, allArticles }) {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`${NEWS_ENDPOINT}/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("খবরটি পাওয়া যায়নি।");
        return r.json();
      })
      .then((json) => {
        if (!cancelled) setArticle(json.data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="np-article-wrap">
        <div className="np-skeleton np-skeleton--article" />
      </div>
    );
  }
  if (error) return <div className="np-alert np-alert--error">{error}</div>;
  if (!article) return null;

  const images = article.media?.filter((m) => m.media_type === "image") || [];
  const videos = article.media?.filter((m) => m.media_type === "video") || [];
  const leadImage = firstImage(article) || (images[0] ? mediaUrl(images[0].url) : null);
  const related = (allArticles || [])
    .filter((a) => a.slug !== slug && (a.category === article.category || a.is_featured))
    .slice(0, 3);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: article.title, url });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert("লিংক কপি হয়েছে");
    }
  };

  return (
    <div className="np-article-wrap">
      <nav className="np-breadcrumb">
        <button type="button" className="np-back" onClick={onBack}>
          <ChevronLeft size={18} />
          প্রচ্ছদে ফিরুন
        </button>
        <span>{categoryLabel(article.category)}</span>
      </nav>

      <article className="np-article">
        <header className="np-article-header">
          <span className={`np-badge np-badge--${article.news_type}`}>
            {typeLabel(article.news_type)}
          </span>
          <h1>{article.title}</h1>
          {article.summary && <p className="np-article-deck">{article.summary}</p>}
          <div className="np-article-meta">
            <span className="np-article-author">{article.author}</span>
            <span className="np-article-date">{formatDate(article.created_at)}</span>
            <button type="button" className="np-share-btn" onClick={handleShare} aria-label="Share">
              <Share2 size={16} />
              শেয়ার
            </button>
          </div>
        </header>

        {leadImage && !videos.length && (
          <figure className="np-article-figure">
            <img src={leadImage} alt="" />
          </figure>
        )}

        {videos.map((v) => (
          <div key={v.id} className="np-video">
            <video controls src={mediaUrl(v.url)} poster={leadImage || undefined}>
              <track kind="captions" />
            </video>
          </div>
        ))}

        <div className="np-article-body">
          {article.content.split("\n\n").map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        {images.length > 0 && (
          <figure className="np-gallery">
            <figcaption>ফটো গ্যালারি</figcaption>
            <div className="np-gallery-grid">
              {images.map((img) => (
                <img key={img.id} src={mediaUrl(img.url)} alt={img.caption || article.title} />
              ))}
            </div>
          </figure>
        )}
      </article>

      {related.length > 0 && (
        <section className="np-related">
          <h2 className="np-section-title">সম্পর্কিত খবর</h2>
          <div className="np-grid np-grid--3">
            {related.map((a) => (
              <NewsCard key={a.id} article={a} onOpen={onOpen} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
