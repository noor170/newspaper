import { useEffect, useState } from "react";
import {
  META_ENDPOINT,
  NEWS_ENDPOINT,
} from "./constants/api";
import AdminPortal from "./components/admin/AdminPortal";
import ArticlePage from "./components/newspaper/ArticlePage";
import BreakingTicker from "./components/newspaper/BreakingTicker";
import Footer from "./components/newspaper/Footer";
import Header from "./components/newspaper/Header";
import HomePage from "./components/newspaper/HomePage";
import "./bangla-news.css";

export default function BanglaNewsApp() {
  const [view, setView] = useState("home");
  const [articleSlug, setArticleSlug] = useState(null);
  const [category, setCategory] = useState(null);
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(META_ENDPOINT)
      .then((r) => r.json())
      .then((json) => setCategories(json.categories || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (view !== "home" && view !== "article") return;
    let cancelled = false;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ limit: "30" });
    if (category) params.set("category", category);
    fetch(`${NEWS_ENDPOINT}?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setArticles(json.data?.items || []);
      })
      .catch(() => {
        if (!cancelled) setError("খবর লোড করা যায়নি। ব্যাকএন্ড চালু আছে কিনা দেখুন (পোর্ট ৮০০০)।");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [view, category]);

  const openArticle = (slug) => {
    setArticleSlug(slug);
    setView("article");
    window.scrollTo(0, 0);
  };

  const goHome = () => {
    setView("home");
    setArticleSlug(null);
    window.scrollTo(0, 0);
  };

  const selectCategory = (cat) => {
    setCategory(cat);
    setView("home");
    setArticleSlug(null);
  };

  const tickerHeadlines = articles.filter((a) => a.is_featured).length
    ? articles.filter((a) => a.is_featured)
    : articles.slice(0, 5);

  if (view === "admin") {
    return (
      <AdminPortal onHome={goHome} categories={categories} />
    );
  }

  return (
    <div className="np-app">
      <Header
        categories={categories}
        activeCategory={category}
        onCategory={selectCategory}
        onHome={goHome}
        onAdmin={() => (setView("admin"), setArticleSlug(null))}
        view={view}
      />

      {view === "home" && (
        <BreakingTicker headlines={tickerHeadlines} onOpen={openArticle} />
      )}

      <main className="np-container np-main">
        {view === "home" && (
          <HomePage
            articles={articles}
            loading={loading}
            error={error}
            activeCategory={category}
            onOpen={openArticle}
          />
        )}
        {view === "article" && articleSlug && (
          <ArticlePage
            slug={articleSlug}
            onBack={goHome}
            onOpen={openArticle}
            allArticles={articles}
          />
        )}
      </main>

      <Footer onCategory={selectCategory} onHome={goHome} />
    </div>
  );
}
