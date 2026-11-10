# SocketHub ☕

**Find your next coding spot.**

SocketHub is a cafe map application for digital nomads, students, and remote workers. It combines real-time Google Places data with a community-contributed database to help you find workspaces with reliable WiFi, power outlets, and the right atmosphere.

**Live:** [SocketHub](https://d20u7fby0bngts.cloudfront.net/)

![License](https://img.shields.io/badge/License-MIT-green)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-Lambda%20%2B%20S3%20%2B%20CloudFront-FF9900?logo=amazon-web-services&logoColor=white)
![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=github-actions&logoColor=white)
![Gemini](https://img.shields.io/badge/AI-Gemini%202.5%20Flash%20Lite-8E75B2?logo=google-gemini&logoColor=white)

---

## Features

- **Map-based search** — drag the map or use current location to find nearby cafes
- **Hybrid results** — merges Google Places data with community-contributed workspace ratings
- **Workspace filters** — filter by WiFi stability, power outlets, quietness, seating comfort, and more
- **Community contributions** — submit ratings or add new cafes directly from the app
- **AI reconciliation** — Gemini AI matches local records to Google Places entries by name similarity
- **Multilingual UI** — supports English and Traditional Chinese (i18next)

---

## Cloud Deployment

SocketHub uses a fully automated, serverless AWS deployment pipeline. Nothing runs when nobody is using the site, so hosting costs stay near zero at low traffic.

### Architecture Overview

```
User
 │  https://d20u7fby0bngts.cloudfront.net
 ▼
CloudFront CDN (HTTPS, global edge caching)
 │
 ├── /*      ──▶ S3 (private, OAC)        React SPA static assets
 │
 └── /api/*  ──▶ Lambda Function URL      Express + Mongoose (serverless-http)
                    │
                    ├──▶ MongoDB Atlas
                    ├──▶ Google Places API
                    └──▶ Gemini AI API
```

The frontend calls the API with a relative path (`/api/cafes`), so the browser only ever talks to one origin — no CORS needed in production.

### Frontend — AWS S3 + CloudFront

The React SPA is built by Vite and deployed as static files to an S3 bucket, served globally via CloudFront CDN.

| Resource | Detail |
|----------|--------|
| Region | `ap-southeast-2` (Sydney) |
| S3 | Private bucket (public access blocked; OAC enforced) |
| CloudFront | HTTPS distribution, global edge caching |
| Cache Invalidation | Triggered automatically on each deployment |

**Deployment flow (GitHub Actions `frontend.yml`):**
1. Push to `main` branch with changes under `frontend/`
2. `npm install` → `npm run build` (Vite bundles assets with injected env vars)
3. Sync `frontend/dist/` to S3 via `jakejarvis/s3-sync-action` with `--delete` (removes stale files)
4. Invalidate the CloudFront cache (`/*`) so visitors get the new build immediately

**Required GitHub Secrets:**

| Secret | Purpose |
|--------|---------|
| `AWS_ACCESS_KEY_ID` | AWS IAM credentials |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM credentials |
| `AWS_S3_BUCKET_NAME` | Target S3 bucket name |
| `CLOUDFRONT_DISTRIBUTION_ID` | Distribution to invalidate after deploy |
| `VITE_API_URL` | Backend API URL injected at build time (`/api/cafes`) |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API key injected at build time |

---

### Backend — AWS Lambda

The Express app runs unchanged inside a Lambda function, wrapped by [`serverless-http`](https://github.com/dougmoscrop/serverless-http) (`backend/lambda.js`). CloudFront routes `/api/*` to the function's Function URL. The MongoDB connection is cached at module scope so warm invocations reuse it.

| Resource | Detail |
|----------|--------|
| Region | `ap-southeast-2` (Sydney) |
| Function | `sockethub-api` — Node.js 22, arm64, 512 MB, 29 s timeout |
| Entry point | `lambda.handler` |
| Invocation | Function URL (public), fronted by CloudFront |
| Logs | CloudWatch `/aws/lambda/sockethub-api` (14-day retention) |
| Latency | ~3–4 s on a cold start, ~0.2 s warm |

**Deployment flow (GitHub Actions `backend.yml`):**
1. Push to `main` branch with changes under `backend/`
2. `backend/scripts/package-lambda.sh` zips the source with production dependencies
3. `aws lambda update-function-code` uploads the new package
4. Smoke test: `GET /api/cafes` must return 200

**Required GitHub Secrets:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.

Runtime secrets (`MONGO_URI`, `GOOGLE_MAPS_API_KEY`, `GEMINI_API_KEY`, optional `ALLOWED_ORIGINS`) are Lambda environment variables managed by Terraform, not by CI.

> **Note:** MongoDB Atlas must allow `0.0.0.0/0` in Network Access, since Lambda has no fixed IP. Free (M0) clusters pause after 60 days without connections — resume the cluster in the Atlas UI if the API starts failing with DNS errors.

---

### Infrastructure as Code (Terraform)

| Directory | Provisions |
|-----------|-----------|
| `backend/terraform/` | Lambda function, Function URL + public-access permissions, IAM role, CloudWatch log group |
| `frontend/terraform/` | S3 bucket, OAC, CloudFront distribution (looks up the Lambda Function URL by name) |

Apply the backend first, since the frontend stack reads the Function URL:

```bash
cd backend && ./scripts/package-lambda.sh          # build the initial lambda.zip
cd terraform && terraform init
export TF_VAR_mongo_uri=... TF_VAR_google_maps_api_key=... TF_VAR_gemini_api_key=...
terraform apply

cd ../../frontend/terraform && terraform init && terraform apply
```

---

## Local Development

### Prerequisites

- Node.js v20+
- MongoDB Atlas account (or local MongoDB)
- Google Cloud Platform account with **Maps JavaScript API**, **Places API (New)**, and **Gemini API** enabled

### Setup

```bash
# Clone the repo
git clone https://github.com/your-username/SocketHub.git
cd SocketHub

# Install dependencies
cd backend && npm install
cd ../frontend && npm install
```

### Environment Variables

**`backend/.env`**
```env
PORT=8080
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/?appName=SocketHub
GOOGLE_MAPS_API_KEY=<your_key>
GEMINI_API_KEY=<your_key>
ALLOWED_ORIGINS=http://localhost:5173
```

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:8080/api/cafes
VITE_GOOGLE_MAPS_API_KEY=<your_key>
```

### Run

```bash
# Terminal 1 — backend
cd backend && node server.js

# Terminal 2 — frontend
cd frontend && npm run dev
```

---

## Stack Details

### Frontend

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build tool | Vite 7 |
| Styling | Tailwind CSS 3.4 |
| Maps | `@vis.gl/react-google-maps` 1.7 |
| HTTP client | Axios |
| Notifications | React Hot Toast |
| i18n | i18next (English + Traditional Chinese) |

**Key design decisions:**
- Vite's `import.meta.env` injects API keys and URLs at build time — no runtime config server needed.
- All map interactions (drag-to-search, click-to-detail) are handled in `App.jsx` via shared state passed to child components.
- Distance is calculated client-side using the Haversine formula to avoid extra API calls.

### Backend

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 on AWS Lambda |
| Framework | Express 5 (via serverless-http) |
| ODM | Mongoose 9 |
| Database | MongoDB Atlas |
| AI | Google Gemini 2.5 Flash Lite |
| External API | Google Places API (New) |

### Database — MongoDB Atlas

**`cafes` collection** — community-contributed workspace data with geospatial indexing (`2dsphere` on `location`):

```
location.coordinates  [lng, lat]
ratings               { wifiStability, quietness, seatComfort, ... }
features              { timeLimit, hasManySockets, hasDessert, ... }
tags                  [String]
comments              [{ text, createdAt }]
openingTime           { Mon–Sun: String }
```

**`resolutionlogs` collection** — caches AI reconciliation results between local records and Google Places entries to minimize Gemini API usage.

### API Endpoints

Base path: `/api/cafes`

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/` | Return all cafes in the local database |
| `POST` | `/search` | Hybrid search by coordinates `{ lat, lng, radius? }` |
| `POST` | `/contribute` | Submit a rating or new cafe details |

**Hybrid search logic (`CafeService.js`):**
1. Fetch nearby places from Google Places API
2. For each Google result, look up a matching local record by:
   - Exact `googlePlaceId` match
   - Distance proximity (< 30 m)
   - Gemini AI name-similarity check (cached in `ResolutionLog`)
3. Merge Google data (name, rating, address) with local community data (WiFi score, sockets, tags)
4. Return enriched array with `source: "hybrid" | "google" | "local"`

---

## Project Structure

```
SocketHub/
├── .github/workflows/
│   ├── backend.yml        # Package zip → Lambda update → smoke test
│   └── frontend.yml       # Vite build → S3 sync → CloudFront invalidation
│
├── backend/
│   ├── controllers/       # Express route handlers
│   ├── models/            # Mongoose schemas (Cafe, ResolutionLog)
│   ├── routes/            # Route definitions
│   ├── services/          # Business logic (CafeService, AIService)
│   ├── scripts/           # package-lambda.sh
│   ├── terraform/         # AWS Lambda infrastructure
│   ├── lambda.js          # Lambda entry point (serverless-http)
│   └── server.js          # Express app; listens on PORT when run locally
│
└── frontend/
    ├── src/
    │   ├── components/    # TopBar, CafeDetailPanel, ContributePanel, FilterPanel
    │   ├── App.jsx        # Main state, map logic, search orchestration
    │   └── i18n.js        # i18next config + translation resources
    ├── terraform/         # AWS S3 + CloudFront infrastructure
    └── vite.config.js
```
