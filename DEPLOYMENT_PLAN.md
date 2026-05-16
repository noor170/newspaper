# Fly.io Deployment Plan

## Objective

Deploy the News Portal monolith as a single container image on Fly.io. The image contains:

- React + TypeScript frontend compiled by Vite
- Spring Boot 3.x backend packaged as a single executable jar
- Firebase configuration injected at runtime through Fly secrets

## 1. Install Flyctl

macOS:

```bash
brew install flyctl
```

Linux / macOS script:

```bash
curl -L https://fly.io/install.sh | sh
```

Verify:

```bash
flyctl version
flyctl auth login
```

## 2. Prepare the Application

Build and test locally before launch:

```bash
cd frontend
npm install
npm run build

cd ../backend
mvn clean test
```

Return to the repository root before Fly commands:

```bash
cd ..
```

## 3. Initialize the Fly Application

Launch the app from the repository root:

```bash
fly launch --name news-portal-monolith --region sin --no-deploy
```

Recommended responses during `fly launch`:

- Use the existing `Dockerfile`: `Yes`
- Internal port: `8080`
- PostgreSQL attachment: `No` unless persistent relational storage is added later

This generates a `fly.toml`. Verify the generated service section points to internal port `8080`.

## 4. Right-Size JVM Memory

Spring Boot on a small container needs explicit room for heap, metaspace, and native memory.

Scale VM memory to 512 MB:

```bash
fly scale memory 512
```

Recommended JVM tuning secret:

```bash
fly secrets set JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0 -XX:+UseContainerSupport -Djava.security.egd=file:/dev/./urandom"
```

## 5. Configure Runtime Secrets

Set Spring and Firebase runtime values with encrypted Fly secrets:

```bash
fly secrets set \
  PORT=8080 \
  FIREBASE_PROJECT_ID="bangladb-200ed" \
  FIREBASE_CLIENT_EMAIL="firebase-adminsdk@bangladb-200ed.iam.gserviceaccount.com" \
  FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_LINE_1\nYOUR_PRIVATE_KEY_LINE_2\n-----END PRIVATE KEY-----" \
  SPRING_DATASOURCE_URL="jdbc:postgresql://your-host:5432/news_portal" \
  SPRING_DATASOURCE_USERNAME="news_portal" \
  SPRING_DATASOURCE_PASSWORD="strong-password"

```

Notes:

- Keep the Firebase private key newline escaped with `\n`.
- If no database is used yet, you may still set the datasource values to a safe placeholder or remove the related environment variables from the app configuration before production.

## 6. Zero-Downtime Rolling Deployment

Deploy the current commit:

```bash
fly deploy
```

For explicit rolling behavior, confirm `fly.toml` contains a rolling strategy such as:

```toml
[deploy]
  strategy = "rolling"
```

This allows Fly.io to start a new machine before stopping the old one when capacity permits.

## 7. Post-Deployment Verification

Inspect release status:

```bash
fly status
fly releases
```

Stream logs:

```bash
fly logs
```

Smoke test the deployed API:

```bash
curl https://news-portal-monolith.fly.dev/api/news
```

Smoke test the frontend:

```bash
open https://news-portal-monolith.fly.dev
```

## 8. Operational Checklist

- `fly scale memory 512` applied
- Firebase secrets stored with `fly secrets set`
- `JAVA_TOOL_OPTIONS` configured for container-aware JVM sizing
- `fly deploy` completed successfully
- `/api/news` returns HTTP `200`
- Browser reload on deep frontend routes resolves to `index.html`

## 9. Recommended Next Hardening Steps

1. Add a managed Postgres instance only when persistence is introduced.
2. Add Fly health checks in `fly.toml` for `/api/news`.
3. Add GitHub Actions CI to run frontend build and backend tests before `fly deploy`.
