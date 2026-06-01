import os
import secrets
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    Header,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import desc, func
from sqlalchemy.orm import Session, selectinload

sys.path.insert(0, os.path.dirname(__file__))

try:
    from .database import (
        NEWS_CATEGORIES,
        NEWS_TYPES,
        NewsArticle,
        NewsMedia,
        get_db,
        init_db,
        slugify,
    )
except ImportError:
    from database import (
        NEWS_CATEGORIES,
        NEWS_TYPES,
        NewsArticle,
        NewsMedia,
        get_db,
        init_db,
        slugify,
    )

APP_DIR = Path(__file__).resolve().parent
UPLOAD_ROOT = APP_DIR / "uploads"
IMAGE_DIR = UPLOAD_ROOT / "images"
VIDEO_DIR = UPLOAD_ROOT / "videos"

for directory in (IMAGE_DIR, VIDEO_DIR):
    directory.mkdir(parents=True, exist_ok=True)

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "bangla-news-admin")
_active_admin_tokens: set[str] = set()

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}
ALLOWED_VIDEO_TYPES = {
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".avi"}

app = FastAPI(
    title="Bangla News 24 API",
    description="Online newspaper API for articles, photo galleries, and video news",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")


def require_admin(x_admin_token: str | None = Header(default=None)):
    if not x_admin_token or x_admin_token not in _active_admin_tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin authentication required.",
        )


def _unique_slug(db: Session, title: str, exclude_id: int | None = None) -> str:
    base = slugify(title)[:280]
    candidate = base
    counter = 1
    while True:
        query = db.query(NewsArticle).filter(NewsArticle.slug == candidate)
        if exclude_id is not None:
            query = query.filter(NewsArticle.id != exclude_id)
        if not query.first():
            return candidate
        counter += 1
        candidate = f"{base}-{counter}"


def _serialize_media(media: NewsMedia) -> dict:
    return {
        "id": media.id,
        "media_type": media.media_type,
        "url": f"/uploads/{media.file_path}",
        "caption": media.caption,
        "sort_order": media.sort_order,
    }


def _serialize_article(article: NewsArticle, include_content: bool = True) -> dict:
    payload = {
        "id": article.id,
        "title": article.title,
        "slug": article.slug,
        "summary": article.summary,
        "category": article.category,
        "news_type": article.news_type,
        "author": article.author,
        "is_featured": article.is_featured,
        "is_published": article.is_published,
        "created_at": article.created_at.isoformat() if article.created_at else None,
        "updated_at": article.updated_at.isoformat() if article.updated_at else None,
        "media": [_serialize_media(item) for item in article.media],
    }
    if include_content:
        payload["content"] = article.content
    return payload


def _save_upload(file: UploadFile, media_kind: str) -> str:
    suffix = Path(file.filename or "").suffix.lower()
    if media_kind == "image":
        allowed_ext = IMAGE_EXTENSIONS
        allowed_types = ALLOWED_IMAGE_TYPES
    else:
        allowed_ext = VIDEO_EXTENSIONS
        allowed_types = ALLOWED_VIDEO_TYPES

    if file.content_type not in allowed_types and suffix not in allowed_ext:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported {media_kind} file type.",
        )

    extension = suffix if suffix in allowed_ext else (
        ".jpg" if media_kind == "image" else ".mp4"
    )
    filename = f"{uuid.uuid4().hex}{extension}"
    relative_path = f"{media_kind}s/{filename}"
    destination = UPLOAD_ROOT / relative_path

    with destination.open("wb") as output:
        while chunk := file.file.read(1024 * 1024):
            output.write(chunk)

    return relative_path


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/")
def root():
    return {"status": "ok", "message": "Bangla News 24 API is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/api/v1/meta")
def get_meta():
    return {
        "site_name": "Bangla News 24",
        "categories": list(NEWS_CATEGORIES),
        "news_types": list(NEWS_TYPES),
    }


@app.post("/api/v1/admin/login")
def admin_login(password: str = Form(...)):
    if password != ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin password.",
        )
    token = secrets.token_urlsafe(32)
    _active_admin_tokens.add(token)
    return {"success": True, "token": token}


@app.post("/api/v1/admin/logout")
def admin_logout(_: None = Depends(require_admin), x_admin_token: str = Header()):
    _active_admin_tokens.discard(x_admin_token)
    return {"success": True}


@app.get("/api/v1/news")
def list_news(
    category: str | None = Query(default=None),
    news_type: str | None = Query(default=None),
    featured_only: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=12, ge=1, le=50),
    db: Session = Depends(get_db),
):
    query = (
        db.query(NewsArticle)
        .options(selectinload(NewsArticle.media))
        .filter(NewsArticle.is_published.is_(True))
    )

    if category:
        query = query.filter(NewsArticle.category == category)
    if news_type:
        query = query.filter(NewsArticle.news_type == news_type)
    if featured_only:
        query = query.filter(NewsArticle.is_featured.is_(True))

    total = query.count()
    articles = (
        query.order_by(desc(NewsArticle.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "success": True,
        "data": {
            "items": [_serialize_article(a, include_content=False) for a in articles],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": max(1, (total + limit - 1) // limit),
            },
        },
    }


@app.get("/api/v1/news/{slug}")
def get_news_article(slug: str, db: Session = Depends(get_db)):
    article = (
        db.query(NewsArticle)
        .options(selectinload(NewsArticle.media))
        .filter(NewsArticle.slug == slug, NewsArticle.is_published.is_(True))
        .first()
    )
    if not article:
        raise HTTPException(status_code=404, detail="News article not found.")
    return {"success": True, "data": _serialize_article(article)}


@app.get("/api/v1/admin/news")
def admin_list_news(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(NewsArticle).options(selectinload(NewsArticle.media))
    total = query.count()
    articles = (
        query.order_by(desc(NewsArticle.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return {
        "success": True,
        "data": {
            "items": [_serialize_article(a) for a in articles],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": max(1, (total + limit - 1) // limit),
            },
        },
    }


@app.post("/api/v1/admin/news", status_code=status.HTTP_201_CREATED)
async def create_news(
    title: str = Form(...),
    summary: str = Form(""),
    content: str = Form(...),
    category: str = Form("national"),
    news_type: str = Form("article"),
    author: str = Form("Bangla News 24 Desk"),
    is_featured: bool = Form(False),
    is_published: bool = Form(True),
    images: list[UploadFile] = File(default=[]),
    video: UploadFile | None = File(default=None),
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if category not in NEWS_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category.")
    if news_type not in NEWS_TYPES:
        raise HTTPException(status_code=400, detail="Invalid news type.")

    article = NewsArticle(
        title=title.strip(),
        slug=_unique_slug(db, title),
        summary=summary.strip(),
        content=content.strip(),
        category=category,
        news_type=news_type,
        author=author.strip() or "Bangla News 24 Desk",
        is_featured=is_featured,
        is_published=is_published,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(article)
    db.flush()

    sort_order = 0
    for image in images:
        if not image.filename:
            continue
        path = _save_upload(image, "image")
        db.add(
            NewsMedia(
                article_id=article.id,
                media_type="image",
                file_path=path,
                sort_order=sort_order,
            )
        )
        sort_order += 1

    if video and video.filename:
        path = _save_upload(video, "video")
        db.add(
            NewsMedia(
                article_id=article.id,
                media_type="video",
                file_path=path,
                sort_order=sort_order,
            )
        )

    db.commit()
    db.refresh(article)
    article = (
        db.query(NewsArticle)
        .options(selectinload(NewsArticle.media))
        .filter(NewsArticle.id == article.id)
        .first()
    )
    return {"success": True, "data": _serialize_article(article)}


@app.put("/api/v1/admin/news/{article_id}")
async def update_news(
    article_id: int,
    title: str = Form(...),
    summary: str = Form(""),
    content: str = Form(...),
    category: str = Form("national"),
    news_type: str = Form("article"),
    author: str = Form("Bangla News 24 Desk"),
    is_featured: bool = Form(False),
    is_published: bool = Form(True),
    images: list[UploadFile] = File(default=[]),
    video: UploadFile | None = File(default=None),
    remove_media_ids: str = Form(""),
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    article = db.query(NewsArticle).filter(NewsArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="News article not found.")

    if category not in NEWS_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category.")
    if news_type not in NEWS_TYPES:
        raise HTTPException(status_code=400, detail="Invalid news type.")

    article.title = title.strip()
    article.slug = _unique_slug(db, title, exclude_id=article.id)
    article.summary = summary.strip()
    article.content = content.strip()
    article.category = category
    article.news_type = news_type
    article.author = author.strip() or "Bangla News 24 Desk"
    article.is_featured = is_featured
    article.is_published = is_published
    article.updated_at = datetime.now(timezone.utc)

    if remove_media_ids.strip():
        ids = [
            int(value)
            for value in remove_media_ids.split(",")
            if value.strip().isdigit()
        ]
        if ids:
            media_rows = (
                db.query(NewsMedia)
                .filter(NewsMedia.article_id == article.id, NewsMedia.id.in_(ids))
                .all()
            )
            for row in media_rows:
                file_path = UPLOAD_ROOT / row.file_path
                if file_path.exists():
                    file_path.unlink()
                db.delete(row)

    sort_order = (
        db.query(func.max(NewsMedia.sort_order))
        .filter(NewsMedia.article_id == article.id)
        .scalar()
        or -1
    ) + 1

    for image in images:
        if not image.filename:
            continue
        path = _save_upload(image, "image")
        db.add(
            NewsMedia(
                article_id=article.id,
                media_type="image",
                file_path=path,
                sort_order=sort_order,
            )
        )
        sort_order += 1

    if video and video.filename:
        path = _save_upload(video, "video")
        db.add(
            NewsMedia(
                article_id=article.id,
                media_type="video",
                file_path=path,
                sort_order=sort_order,
            )
        )

    db.commit()
    article = (
        db.query(NewsArticle)
        .options(selectinload(NewsArticle.media))
        .filter(NewsArticle.id == article.id)
        .first()
    )
    return {"success": True, "data": _serialize_article(article)}


@app.delete("/api/v1/admin/news/{article_id}")
def delete_news(
    article_id: int,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    article = (
        db.query(NewsArticle)
        .options(selectinload(NewsArticle.media))
        .filter(NewsArticle.id == article_id)
        .first()
    )
    if not article:
        raise HTTPException(status_code=404, detail="News article not found.")

    for media in article.media:
        file_path = UPLOAD_ROOT / media.file_path
        if file_path.exists():
            file_path.unlink()

    db.delete(article)
    db.commit()
    return {"success": True, "message": "News article deleted."}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("BACKEND_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
