import { CATEGORY_LABELS, TYPE_LABELS, mediaUrl } from "../../constants/api";

export function formatDate(iso, short = false) {
  if (!iso) return "";
  const opts = short
    ? { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
    : { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" };
  return new Date(iso).toLocaleDateString("bn-BD", opts);
}

export function categoryLabel(cat) {
  return CATEGORY_LABELS[cat] || cat;
}

export function typeLabel(type) {
  return TYPE_LABELS[type] || type;
}

export function firstImage(article) {
  const img = article?.media?.find((m) => m.media_type === "image");
  return img ? mediaUrl(img.url) : null;
}

export function hasVideo(article) {
  return article?.media?.some((m) => m.media_type === "video");
}

export function excerpt(text, max = 120) {
  if (!text) return "";
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max)}…`;
}
