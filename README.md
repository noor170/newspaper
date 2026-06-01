# Bangla News 24 — Online Newspaper

**Bangla News 24** is a full-stack online newspaper built with **FastAPI** (backend) and **React + Vite** (frontend).

## Features

### Public site
- Homepage with featured and latest news
- Category navigation (national, politics, sports, entertainment, technology, business, international, opinion)
- Article pages with full text, photo galleries, and embedded video players

### Admin panel
- Secure admin login
- **Article news** — publish text stories
- **Photo news** — upload **multiple photos** with article text
- **Video news** — upload a **video file** with article text
- Mark stories as featured or draft
- Edit and delete existing posts

## Quick start

### Backend (port 8000)

```bash
cd backend
pip install -r requirements.txt
python server.py
```

### Frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** for the newspaper. The Vite dev server proxies `/api` and `/uploads` to the backend.

## Admin access

| Setting | Default |
|--------|---------|
| URL | Click **Admin** in the header |
| Password | `bangla-news-admin` |

Set a production password with the environment variable:

```bash
export ADMIN_PASSWORD="your-secure-password"
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/news` | List published news |
| `GET` | `/api/v1/news/{slug}` | Single article |
| `GET` | `/api/v1/meta` | Site metadata and categories |
| `POST` | `/api/v1/admin/login` | Admin login |
| `GET` | `/api/v1/admin/news` | Admin list (all posts) |
| `POST` | `/api/v1/admin/news` | Create news (multipart) |
| `PUT` | `/api/v1/admin/news/{id}` | Update news |
| `DELETE` | `/api/v1/admin/news/{id}` | Delete news |

Uploaded files are stored under `backend/app/uploads/` and served at `/uploads/...`.

## Environment variables

| Variable | Description |
|----------|-------------|
| `ADMIN_PASSWORD` | Admin login password (default: `bangla-news-admin`) |
| `SQLITE_DB_PATH` | SQLite file path (default: `./bangla_news_24.db`) |
| `DATABASE_URL` | Optional full database URL |
| `DB_*` | MySQL connection settings (optional) |

## Project structure

```
backend/app/
  main.py       # News API + file uploads
  database.py   # NewsArticle & NewsMedia models
  uploads/      # Stored images and videos

frontend/src/
  BanglaNewsApp.jsx   # Public site + admin UI
  bangla-news.css     # Newspaper styling
  constants/api.js    # API helpers
```

## Deployment

### Frontend (Vercel)

The frontend is configured for deployment on Vercel.

1. **Connect Repository**: Import this repository in Vercel
2. **Configure Environment Variables**:
   ```bash
   VITE_API_URL=https://your-backend-url.com  # Your backend URL
   ```
3. **Deploy**: Vercel will automatically build and deploy on pushes to `main`

### Backend

The backend can be deployed to:
- **Railway** / **Render** — Recommended for FastAPI support
- **AWS EC2** / **DigitalOcean** — Manual deployment
- **Vercel Serverless** — Limited support (no file uploads)

#### Example: Deploy to Railway

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Set environment variables:
   ```bash
   ADMIN_PASSWORD=your-secure-password
   DATABASE_URL=your-database-url  # Optional
   ```
4. Deploy

## CI/CD Pipeline

`.github/workflows/deploy-vercel.yml`:

1. **Lint** — Runs ESLint on the frontend
2. **Build** — Builds the frontend for production
3. **Deploy** — Automatically deploys to Vercel on pushes to `main`

### Required GitHub Secrets

Create these secrets in your GitHub repository settings:

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

Get these values from your Vercel dashboard → Settings → Tokens.
