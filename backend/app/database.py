import os
import re
import unicodedata
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
    inspect,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("DB_NAME", "bangla_news_24")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_DIALECT = os.getenv("DB_DIALECT", "sqlite").lower()
SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", "./bangla_news_24.db")
DB_CONNECT_TIMEOUT = int(os.getenv("DB_CONNECT_TIMEOUT", "10"))
DB_READ_TIMEOUT = int(os.getenv("DB_READ_TIMEOUT", "10"))
DB_WRITE_TIMEOUT = int(os.getenv("DB_WRITE_TIMEOUT", "10"))
DB_SSL_MODE = os.getenv("DB_SSL_MODE", "").lower()
DB_SSL_CA = os.getenv("DB_SSL_CA")

if DB_DIALECT == "mysql" or all([DB_USER, DB_PASSWORD, DB_HOST, DB_NAME]):
    from urllib.parse import quote_plus

    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://"
        f"{quote_plus(DB_USER or '')}:{quote_plus(DB_PASSWORD or '')}"
        f"@{DB_HOST}:{DB_PORT}/{DB_NAME}",
    )
else:
    DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{SQLITE_DB_PATH}")


def _build_connect_args():
    if DATABASE_URL.startswith("sqlite"):
        return {"check_same_thread": False}

    connect_args = {
        "charset": "utf8mb4",
        "connect_timeout": DB_CONNECT_TIMEOUT,
        "read_timeout": DB_READ_TIMEOUT,
        "write_timeout": DB_WRITE_TIMEOUT,
    }

    if DB_SSL_MODE in {"1", "true", "enabled", "require", "required"} or DB_SSL_CA:
        ssl_config = {}
        if DB_SSL_CA:
            ssl_config["ca"] = DB_SSL_CA
        connect_args["ssl"] = ssl_config

    return connect_args


engine = create_engine(
    DATABASE_URL,
    connect_args=_build_connect_args(),
    pool_pre_ping=not DATABASE_URL.startswith("sqlite"),
    pool_recycle=3600 if not DATABASE_URL.startswith("sqlite") else -1,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

NEWS_CATEGORIES = (
    "national",
    "politics",
    "sports",
    "entertainment",
    "technology",
    "business",
    "international",
    "opinion",
)

NEWS_TYPES = ("article", "photo", "video")


class NewsArticle(Base):
    __tablename__ = "news_articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    slug = Column(String(320), nullable=False, unique=True, index=True)
    summary = Column(String(500), nullable=False, default="")
    content = Column(Text, nullable=False)
    category = Column(String(40), nullable=False, index=True, default="national")
    news_type = Column(String(20), nullable=False, default="article")
    author = Column(String(120), nullable=False, default="Bangla News 24 Desk")
    is_featured = Column(Boolean, nullable=False, default=False)
    is_published = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    media = relationship(
        "NewsMedia",
        back_populates="article",
        cascade="all, delete-orphan",
        order_by="NewsMedia.sort_order",
    )


class NewsMedia(Base):
    __tablename__ = "news_media"

    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(
        Integer, ForeignKey("news_articles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    media_type = Column(String(20), nullable=False)
    file_path = Column(String(500), nullable=False)
    caption = Column(String(300), nullable=False, default="")
    sort_order = Column(Integer, nullable=False, default=0)

    article = relationship("NewsArticle", back_populates="media")


EXPECTED_COLUMNS = {
    "news_articles": {
        "id",
        "title",
        "slug",
        "summary",
        "content",
        "category",
        "news_type",
        "author",
        "is_featured",
        "is_published",
        "created_at",
        "updated_at",
    },
    "news_media": {
        "id",
        "article_id",
        "media_type",
        "file_path",
        "caption",
        "sort_order",
    },
}


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value)
    value = value.encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^\w\s-]", "", value.lower())
    value = re.sub(r"[-\s]+", "-", value).strip("-")
    return value or "news"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    _ensure_schema()
    Base.metadata.create_all(bind=engine)
    seed_demo_news()


def _ensure_schema():
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    schema_matches = True

    for table_name, columns in EXPECTED_COLUMNS.items():
        if table_name not in existing_tables:
            schema_matches = False
            break
        existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
        if existing_columns != columns:
            schema_matches = False
            break

    if schema_matches:
        return

    if not DATABASE_URL.startswith("sqlite"):
        return

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def seed_demo_news():
    db = SessionLocal()
    try:
        if db.query(NewsArticle).count() > 0:
            return

        samples = [
            {
                "title": "Dhaka Metro Expansion Opens New Line for Commuters",
                "slug": "dhaka-metro-expansion-opens-new-line",
                "summary": "Thousands welcomed the new metro segment connecting northern suburbs to central Dhaka.",
                "content": (
                    "The government inaugurated a new stretch of the Dhaka Metro on Sunday, "
                    "promising faster commutes and reduced traffic congestion. Officials said the "
                    "line will initially operate from 6 AM to 10 PM with expanded service planned "
                    "within three months.\n\n"
                    "Passengers praised cleaner stations and digital ticketing, while urban planners "
                    "called the project a milestone for sustainable public transport in Bangladesh."
                ),
                "category": "national",
                "news_type": "article",
                "is_featured": True,
            },
            {
                "title": "Bangladesh Cricket Team Secures Series Win Against Visiting Side",
                "slug": "bangladesh-cricket-team-series-win",
                "summary": "A commanding performance in the final ODI sealed a 3-1 series victory at home.",
                "content": (
                    "The Tigers delivered a clinical all-round display to clinch the series in front "
                    "of a packed stadium. The captain credited younger players for stepping up under "
                    "pressure and vowed to carry momentum into the upcoming T20 tour.\n\n"
                    "Fans flooded social media with celebrations as highlights trended nationwide."
                ),
                "category": "sports",
                "news_type": "photo",
                "is_featured": True,
            },
            {
                "title": "Tech Startups in Bangladesh Attract Record Foreign Investment",
                "slug": "tech-startups-bangladesh-record-investment",
                "summary": "Fintech and logistics platforms led a surge in venture funding this quarter.",
                "content": (
                    "Industry analysts reported that Bangladeshi startups raised more venture capital "
                    "in the first quarter than in the same period last year. Investors cited improved "
                    "digital payments infrastructure and a growing mobile-first consumer base.\n\n"
                    "Several founders announced plans to expand into regional markets by 2027."
                ),
                "category": "technology",
                "news_type": "article",
                "is_featured": False,
            },
            {
                "title": "Evening Bulletin: Markets, Weather, and Traffic Updates",
                "slug": "evening-bulletin-markets-weather-traffic",
                "summary": "Watch our nightly roundup covering economy, weather alerts, and city traffic.",
                "content": (
                    "Bangla News 24 presents the evening bulletin with the latest business headlines, "
                    "regional weather warnings, and live traffic camera highlights from major cities.\n\n"
                    "Subscribe for daily video briefings and breaking news alerts on our platform."
                ),
                "category": "business",
                "news_type": "video",
                "is_featured": False,
            },
        ]

        for item in samples:
            article = NewsArticle(**item)
            db.add(article)

        db.commit()
    finally:
        db.close()
