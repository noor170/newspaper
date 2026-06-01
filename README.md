# Bangla News 24 — Online Newspaper

**Bangla News 24** is a full-stack online newspaper built with **FastAPI** (backend) and **React + Vite** (frontend).

## Features

<<<<<<< Updated upstream
## Detailed Features

- **Operations KPI dashboard**
  - Surfaces gross revenue, net profit, ad spend efficiency, warning count, and LTV/CAC health in a single view.
  - Uses a compact management-style layout intended for repeated operational review rather than a marketing presentation.

- **Date range filtering**
  - Filters analytics by `start_date` and `end_date`.
  - Recomputes dashboard metrics and exports against the selected reporting window.

- **Revenue and profitability trend analysis**
  - Displays time-series performance with a mode switch between gross sales and net profit.
  - Aggregates operational data into chart-friendly weekly trend output for the frontend.

- **Inventory risk detection**
  - Calculates sales velocity and estimated days of inventory left.
  - Flags products with critical reorder risk and surfaces them in a low-stock table.

- **Category return-rate analysis**
  - Breaks down return performance by product category.
  - Highlights categories exceeding a return-rate threshold so operational issues are visible quickly.

- **Exportable operational reports**
  - Supports report export from the API in `csv` and `xlsx` formats.
  - Combines order, inventory, marketing, KPI, and alert-oriented data into a downloadable operations summary.

- **Managed MySQL and local SQLite support**
  - Runs against MySQL for deployed environments.
  - Falls back to local SQLite for simple local development and demo usage.
  - Supports managed MySQL options such as connection timeouts, TLS, and credential-based `DATABASE_URL` configuration.

- **Automatic demo data seeding**
  - Creates schema objects on startup and seeds sample operational data when the database is empty.
  - Provides a ready-to-demo dataset covering orders, inventory, and marketing spend.

- **Frontend resilience for API routing issues**
  - Uses a production-safe backend route fallback for Vercel service routing.
  - Detects non-JSON API responses and shows clearer runtime errors instead of crashing on HTML payloads.

- **Containerized local stack**
  - Includes Dockerfiles for backend and frontend plus Compose-based local orchestration.
  - Supports a local MySQL service seeded from `database/init.sql`.

- **CI/CD workflow**
  - Validates backend imports and compilation.
  - Runs frontend lint and production build.
  - Verifies Docker Compose configuration and image builds.
  - Supports optional SSH-based deployment when secrets are configured.

---

## Architecture Overview

```
workspace/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app — routes & CORS
│   │   ├── database.py      # SQLAlchemy models + SQLite/MySQL config
│   │   └── analytics.py     # Pandas/NumPy analytics + Matplotlib charts
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── main.jsx         # React entry point
│   │   ├── App.jsx          # Root component
│   │   ├── Dashboard.jsx    # Main dashboard UI
│   │   └── index.css        # Global dark theme styles
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── .github/
│   └── workflows/
│       └── ci-cd.yml        # CI/CD pipeline
└── README.md
```

---

## Running Inside Replit

Two workflows are configured — they start automatically when you open the project.

| Workflow | Command | Port |
|---|---|---|
| **Backend** | `cd backend && pip install -r requirements.txt && python app/main.py` | 8000 |
| **Frontend** | `cd frontend && npm install && npm run dev` | 5173 |

The Vite dev server proxies `/api` requests to the FastAPI backend, so both services communicate seamlessly inside the preview.

---

## Environment Variables (Optional)

See [`.env.example`](/Users/macbookairm1/Documents/GitHub/LuminousLikelyVerification/.env.example) for a complete template you can use for Vercel or local development.

To connect to an **AWS RDS MySQL** instance instead of the local SQLite fallback, set:

| Variable | Description |
|---|---|
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `DB_HOST` | RDS endpoint hostname |
| `DB_NAME` | Database name |

If any of these are absent, the app automatically uses a local `ecommerce.db` SQLite file and seeds it with 240 demo orders.

For managed MySQL providers such as Aiven, you can also set:

| Variable | Description |
|---|---|
| `DB_CONNECT_TIMEOUT` | Connection timeout in seconds |
| `DB_READ_TIMEOUT` | Read timeout in seconds |
| `DB_WRITE_TIMEOUT` | Write timeout in seconds |
| `DB_SSL_MODE` | Set to `require` to enable TLS |
| `DB_SSL_CA` | Optional CA certificate path when your platform provides one |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health root |
| `GET` | `/health` | Health check |
| `GET` | `/api/v1/operations/dashboard` | Full metrics payload |
| `GET` | `/api/v1/operations/export` | Export operations report as `csv` or `xlsx` |
=======
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
python app/main.py
```

### Frontend (port 5000)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5000** for the newspaper. The Vite dev server proxies `/api` and `/uploads` to the backend.

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
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
- **Top KPI cards** — Revenue, profit, warning, and acquisition-efficiency indicators.
- **Trend visualization** — Interactive line chart powered by `react-chartjs-2`.
- **Return-rate analysis** — Horizontal category comparison for return performance.
- **Operational tables** — Low-stock product visibility with velocity and days-left context.
- **Export workflow** — Direct CSV export from the dashboard UI.
- **API-aware error handling** — Better messaging when the frontend receives HTML or invalid API responses.

---

## CI/CD Pipeline

`.github/workflows/ci-cd.yml` provides:

1. **Backend CI** — installs Python dependencies, compiles the FastAPI app, and runs a backend import smoke test
2. **Frontend CI** — installs Node dependencies, runs ESLint, and builds the Vite app
3. **Docker CI** — validates `docker-compose.yml` and builds the backend and frontend images
4. **Deploy** — runs only for pushes to `main` or manual dispatch after all CI jobs pass and the deploy secrets are configured

### Required GitHub Secrets

If these repository secrets are not configured, the deploy job is skipped:

- `HOST`
- `USER`
- `SSH_PRIVATE_KEY`
=======
frontend/src/
  BanglaNewsApp.jsx   # Public site + admin UI
  bangla-news.css     # Newspaper styling
  constants/api.js    # API helpers
```
>>>>>>> Stashed changes
