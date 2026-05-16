import { useEffect, useState } from "react";

type NewsArticle = {
  id: number;
  title: string;
  content: string;
  publishedDate: string;
};

function App() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadArticles = async () => {
      try {
        const response = await fetch("/api/news");
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as NewsArticle[];
        setArticles(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    void loadArticles();
  }, []);

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">News Portal</p>
        <h1>News Portal Home</h1>
        <p className="description">
          This React frontend is bundled into the Spring Boot monolith and reads
          from the backend API at <code>/api/news</code>.
        </p>
      </section>

      <section className="panel">
        <h2>Latest Headlines</h2>

        {loading && <p>Loading latest news...</p>}
        {error && <p className="error">Failed to load news: {error}</p>}

        {!loading && !error && (
          <ul className="news-list">
            {articles.map((article) => (
              <li key={article.id} className="news-item">
                <h3>{article.title}</h3>
                <p>{article.content}</p>
                <span>{article.publishedDate}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default App;
