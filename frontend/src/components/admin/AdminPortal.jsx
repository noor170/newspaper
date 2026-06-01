import { useCallback, useEffect, useState } from "react";
import {
  ADMIN_LOGIN_ENDPOINT,
  ADMIN_NEWS_ENDPOINT,
  CATEGORY_LABELS,
  TYPE_LABELS,
  mediaUrl,
} from "../../constants/api";

const ADMIN_TOKEN_KEY = "bangla_news_24_admin_token";

const emptyForm = {
  title: "",
  summary: "",
  content: "",
  category: "national",
  news_type: "article",
  author: "Bangla News 24 Desk",
  is_featured: false,
  is_published: true,
};

const Sidebar = ({ activeTab, setActiveTab, onHome }) => (
  <aside className="admin-sidebar">
    <div className="admin-sidebar-brand" onClick={onHome} style={{ cursor: 'pointer' }}>
      <h2>বাংলা নিউজ ২৪</h2>
      <span>অ্যাডমিন পোর্টাল</span>
    </div>
    <nav className="admin-sidebar-nav">
      <button
        className={activeTab === "dashboard" ? "active" : ""}
        onClick={() => setActiveTab("dashboard")}
      >
        📊 ড্যাশবোর্ড
      </button>
      <button
        className={activeTab === "add" ? "active" : ""}
        onClick={() => setActiveTab("add")}
      >
        ➕ নতুন খবর
      </button>
      <button
        className={activeTab === "manage" ? "active" : ""}
        onClick={() => setActiveTab("manage")}
      >
        📰 খবর ব্যবস্থাপনা
      </button>
      <button
        className={activeTab === "media" ? "active" : ""}
        onClick={() => setActiveTab("media")}
      >
        🖼️ মিডিয়া লাইব্রেরি
      </button>
      <button
        onClick={onHome}
        style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)' }}
      >
        🏠 সাইটে ফিরুন
      </button>
    </nav>
  </aside>
);

const Dashboard = ({ articles, stats }) => (
  <div className="admin-dashboard">
    <h1>ড্যাশবোর্ড</h1>
    <div className="admin-stats">
      <div className="admin-stat-card">
        <h3>মোট খবর</h3>
        <span className="admin-stat-number">{stats.total}</span>
      </div>
      <div className="admin-stat-card">
        <h3>প্রকাশিত</h3>
        <span className="admin-stat-number">{stats.published}</span>
      </div>
      <div className="admin-stat-card">
        <h3>খসড়া</h3>
        <span className="admin-stat-number">{stats.draft}</span>
      </div>
      <div className="admin-stat-card">
        <h3>প্রধান শিরোনাম</h3>
        <span className="admin-stat-number">{stats.featured}</span>
      </div>
    </div>
    <div className="admin-recent">
      <h2>সর্বশেষ খবর</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>শিরোনাম</th>
            <th>বিভাগ</th>
            <th>ধরন</th>
            <th>স্ট্যাটাস</th>
            <th>তারিখ</th>
          </tr>
        </thead>
        <tbody>
          {articles.slice(0, 5).map((a) => (
            <tr key={a.id}>
              <td>{a.title}</td>
              <td>{CATEGORY_LABELS[a.category]}</td>
              <td>{TYPE_LABELS[a.news_type]}</td>
              <td>
                <span className={`admin-badge ${a.is_published ? "published" : "draft"}`}>
                  {a.is_published ? "প্রকাশিত" : "খসড়া"}
                </span>
              </td>
              <td>{new Date(a.created_at).toLocaleDateString("bn-BD")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const AddArticle = ({ onSuccess, token }) => {
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState([]);
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const body = new FormData();
    body.append("title", form.title);
    body.append("summary", form.summary);
    body.append("content", form.content);
    body.append("category", form.category);
    body.append("news_type", form.news_type);
    body.append("author", form.author);
    body.append("is_featured", form.is_featured);
    body.append("is_published", form.is_published);
    images.forEach((file) => body.append("images", file));
    if (video) body.append("video", video);

    try {
      const res = await fetch(ADMIN_NEWS_ENDPOINT, {
        method: "POST",
        headers: { "X-Admin-Token": token },
        body,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "প্রকাশ করতে ব্যর্থ।");
      setMessage("খবর সফলভাবে প্রকাশিত হয়েছে!");
      setForm(emptyForm);
      setImages([]);
      setVideo(null);
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-add-article">
      <h1>নতুন খবর প্রকাশ করুন</h1>
      {error && <div className="np-alert np-alert--error">{error}</div>}
      {message && <div className="np-alert np-alert--success">{message}</div>}

      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="admin-form-group">
          <label>শিরোনাম *</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="খবরের শিরোনাম লিখুন..."
          />
        </div>

        <div className="admin-form-group">
          <label>সারাংশ</label>
          <input
            type="text"
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            placeholder="ছোট সারাংশ লিখুন..."
          />
        </div>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>বিভাগ</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="admin-form-group">
            <label>ধরন</label>
            <select
              value={form.news_type}
              onChange={(e) => setForm({ ...form, news_type: e.target.value })}
            >
              <option value="article">নিউজ (লেখা)</option>
              <option value="photo">ফটো + লেখা</option>
              <option value="video">ভিডিও + লেখা</option>
            </select>
          </div>
        </div>

        <div className="admin-form-group">
          <label>বিস্তারিত বিবরণ *</label>
          <textarea
            required
            rows={10}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="খবরের বিস্তারিত বিবরণ লিখুন..."
          />
        </div>

        <div className="admin-form-group">
          <label>লেখক</label>
          <input
            type="text"
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
          />
        </div>

        <div className="admin-form-group">
          <label>ছবি আপলোড (একাধিক)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setImages(Array.from(e.target.files || []))}
          />
          {images.length > 0 && (
            <div className="np-preview-grid">
              {images.map((f, i) => (
                <img key={i} src={URL.createObjectURL(f)} alt="" />
              ))}
            </div>
          )}
        </div>

        {(form.news_type === "video" || form.news_type === "photo") && (
          <div className="admin-form-group">
            <label>ভিডিও ফাইল</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideo(e.target.files?.[0] || null)}
            />
          </div>
        )}

        <div className="admin-form-options">
          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
            />
            প্রধান শিরোনাম
          </label>
          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
            />
            অবিলম্বে প্রকাশ করুন
          </label>
        </div>

        <button type="submit" className="np-btn np-btn--primary admin-submit" disabled={loading}>
          {loading ? "প্রকাশ করা হচ্ছে..." : "খবর প্রকাশ করুন"}
        </button>
      </form>
    </div>
  );
};

const ManageArticles = ({ articles, token, onRefresh }) => {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState([]);
  const [video, setVideo] = useState(null);
  const [removeMediaIds, setRemoveMediaIds] = useState([]);
  const [existingMedia, setExistingMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const startEdit = (article) => {
    setEditingId(article.id);
    setForm({
      title: article.title,
      summary: article.summary,
      content: article.content,
      category: article.category,
      news_type: article.news_type,
      author: article.author,
      is_featured: article.is_featured,
      is_published: article.is_published,
    });
    setExistingMedia(article.media || []);
    setImages([]);
    setVideo(null);
    setRemoveMediaIds([]);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setImages([]);
    setVideo(null);
    setRemoveMediaIds([]);
    setExistingMedia([]);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const body = new FormData();
    body.append("title", form.title);
    body.append("summary", form.summary);
    body.append("content", form.content);
    body.append("category", form.category);
    body.append("news_type", form.news_type);
    body.append("author", form.author);
    body.append("is_featured", form.is_featured);
    body.append("is_published", form.is_published);
    images.forEach((file) => body.append("images", file));
    if (video) body.append("video", video);
    if (removeMediaIds.length) {
      body.append("remove_media_ids", removeMediaIds.join(","));
    }

    try {
      const res = await fetch(`${ADMIN_NEWS_ENDPOINT}/${editingId}`, {
        method: "PUT",
        headers: { "X-Admin-Token": token },
        body,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "আপডেট ব্যর্থ।");
      setMessage("খবর আপডেট হয়েছে!");
      cancelEdit();
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("এই খবর মুছে ফেলবেন?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${ADMIN_NEWS_ENDPOINT}/${id}`, {
        method: "DELETE",
        headers: { "X-Admin-Token": token },
      });
      if (!res.ok) throw new Error("মুছতে ব্যর্থ।");
      setMessage("খবর মুছে ফেলা হয়েছে।");
      if (editingId === id) cancelEdit();
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-manage">
      <h1>খবর ব্যবস্থাপনা</h1>
      {error && <div className="np-alert np-alert--error">{error}</div>}
      {message && <div className="np-alert np-alert--success">{message}</div>}

      {editingId ? (
        <div className="admin-edit-form">
          <div className="admin-edit-header">
            <h2>খবর সম্পাদনা</h2>
            <button className="np-btn np-btn--ghost" onClick={cancelEdit}>বাতিল</button>
          </div>
          <form onSubmit={handleUpdate}>
            <div className="admin-form-group">
              <label>শিরোনাম *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="admin-form-group">
              <label>সারাংশ</label>
              <input
                type="text"
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
              />
            </div>
            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>বিভাগ</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="admin-form-group">
                <label>ধরন</label>
                <select
                  value={form.news_type}
                  onChange={(e) => setForm({ ...form, news_type: e.target.value })}
                >
                  <option value="article">নিউজ (লেখা)</option>
                  <option value="photo">ফটো + লেখা</option>
                  <option value="video">ভিডিও + লেখা</option>
                </select>
              </div>
            </div>
            <div className="admin-form-group">
              <label>বিস্তারিত *</label>
              <textarea
                required
                rows={8}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>
            <div className="admin-form-group">
              <label>লেখক</label>
              <input
                type="text"
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
              />
            </div>
            <div className="admin-form-group">
              <label>নতুন ছবি যোগ করুন</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setImages(Array.from(e.target.files || []))}
              />
            </div>
            {existingMedia.length > 0 && (
              <div className="admin-existing-media">
                <label>বিদ্যমান মিডিয়া</label>
                <div className="np-preview-grid">
                  {existingMedia.map((m) => (
                    <div key={m.id} className="admin-media-item">
                      {m.media_type === "image" ? (
                        <img src={mediaUrl(m.url)} alt="" />
                      ) : (
                        <video src={mediaUrl(m.url)} />
                      )}
                      <label>
                        <input
                          type="checkbox"
                          checked={removeMediaIds.includes(m.id)}
                          onChange={() =>
                            setRemoveMediaIds((prev) =>
                              prev.includes(m.id)
                                ? prev.filter((x) => x !== m.id)
                                : [...prev, m.id]
                            )
                          }
                        />
                        মুছুন
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="admin-form-options">
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                />
                প্রধান শিরোনাম
              </label>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                />
                প্রকাশিত
              </label>
            </div>
            <button type="submit" className="np-btn np-btn--primary" disabled={loading}>
              {loading ? "আপডেট হচ্ছে..." : "আপডেট করুন"}
            </button>
          </form>
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>শিরোনাম</th>
              <th>বিভাগ</th>
              <th>ধরন</th>
              <th>স্ট্যাটাস</th>
              <th>তারিখ</th>
              <th>অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr key={a.id}>
                <td>{a.id}</td>
                <td>{a.title}</td>
                <td>{CATEGORY_LABELS[a.category]}</td>
                <td>{TYPE_LABELS[a.news_type]}</td>
                <td>
                  <span className={`admin-badge ${a.is_published ? "published" : "draft"}`}>
                    {a.is_published ? "প্রকাশিত" : "খসড়া"}
                  </span>
                  {a.is_featured && <span className="admin-badge featured">প্রধান</span>}
                </td>
                <td>{new Date(a.created_at).toLocaleDateString("bn-BD")}</td>
                <td>
                  <div className="admin-actions">
                    <button className="np-btn np-btn--ghost" onClick={() => startEdit(a)}>
                      সম্পাদনা
                    </button>
                    <button className="np-btn np-btn--danger" onClick={() => handleDelete(a.id)} disabled={loading}>
                      মুছুন
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default function AdminPortal({ onHome }) {
  const [token, setToken] = useState(() => localStorage.getItem(ADMIN_TOKEN_KEY) || "");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [articles, setArticles] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mediaItems, setMediaItems] = useState([]);

  const loadArticles = useCallback(() => {
    const h = { "X-Admin-Token": token };
    fetch(ADMIN_NEWS_ENDPOINT, { headers: h })
      .then((r) => r.json())
      .then((json) => {
        const items = json.data?.items || [];
        setArticles(items);
        // Extract media from all articles
        const allMedia = items.flatMap((a) => a.media || []);
        setMediaItems(allMedia);
      })
      .catch(console.error);
  }, [token]);

  useEffect(() => {
    if (token) loadArticles();
  }, [token, loadArticles]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    const body = new FormData();
    body.append("password", password);
    try {
      const res = await fetch(ADMIN_LOGIN_ENDPOINT, { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "লগইন ব্যর্থ।");
      localStorage.setItem(ADMIN_TOKEN_KEY, json.token);
      setToken(json.token);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken("");
    setArticles([]);
  };

  if (!token) {
    return (
      <div className="admin-login">
        <div className="admin-login-card">
          <h1>বাংলা নিউজ ২৪</h1>
          <h2>অ্যাডমিন লগইন</h2>
          {authError && <div className="np-alert np-alert--error">{authError}</div>}
          <form onSubmit={handleLogin}>
            <div className="admin-form-group">
              <label>পাসওয়ার্ড</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="অ্যাডমিন পাসওয়ার্ড দিন..."
              />
            </div>
            <button type="submit" className="np-btn np-btn--primary admin-submit" disabled={authLoading}>
              {authLoading ? "লগইন হচ্ছে..." : "লগইন"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const stats = {
    total: articles.length,
    published: articles.filter((a) => a.is_published).length,
    draft: articles.filter((a) => !a.is_published).length,
    featured: articles.filter((a) => a.is_featured).length,
  };

  return (
    <div className="admin-portal">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onHome={onHome} />
      <main className="admin-main">
        <header className="admin-header">
          <h1>অ্যাডমিন ড্যাশবোর্ড</h1>
          <button className="np-btn np-btn--ghost" onClick={handleLogout}>
            লগ আউট
          </button>
        </header>
        <div className="admin-content">
          {activeTab === "dashboard" && <Dashboard articles={articles} stats={stats} />}
          {activeTab === "add" && <AddArticle onSuccess={loadArticles} token={token} />}
          {activeTab === "manage" && (
            <ManageArticles articles={articles} token={token} onRefresh={loadArticles} />
          )}
          {activeTab === "media" && (
            <div className="admin-media-library">
              <h1>মিডিয়া লাইব্রেরি</h1>
              <div className="admin-media-grid">
                {mediaItems.map((m) => (
                  <div key={m.id} className="admin-media-card">
                    {m.media_type === "image" ? (
                      <img src={mediaUrl(m.url)} alt="" />
                    ) : (
                      <video src={mediaUrl(m.url)} />
                    )}
                    <span>{m.media_type}</span>
                  </div>
                ))}
                {mediaItems.length === 0 && (
                  <p className="np-empty">কোনো মিডিয়া পাওয়া যায়নি।</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
