// Use ?? so an explicit empty VITE_API_URL (Docker/nginx) is not treated as missing.
export const API_BASE =
  import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "/_/backend" : "");

export const NEWS_ENDPOINT = `${API_BASE}/api/v1/news`;
export const META_ENDPOINT = `${API_BASE}/api/v1/meta`;
export const ADMIN_LOGIN_ENDPOINT = `${API_BASE}/api/v1/admin/login`;
export const ADMIN_NEWS_ENDPOINT = `${API_BASE}/api/v1/admin/news`;

export function mediaUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
}

export const CATEGORY_LABELS = {
  national: "জাতীয়",
  politics: "রাজনীতি",
  sports: "খেলাধুলা",
  entertainment: "বিনোদন",
  technology: "প্রযুক্তি",
  business: "বাণিজ্য",
  international: "আন্তর্জাতিক",
  opinion: "মতামত",
};

export const TYPE_LABELS = {
  article: "নিউজ",
  photo: "ফটো গ্যালারি",
  video: "ভিডিও নিউজ",
};
