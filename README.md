# SocketHub ☕

**Find your next coding spot.**

SocketHub is a cafe map application for digital nomads, students, and remote workers. It combines real-time Google Places data with a community-contributed database to help you find workspaces with reliable WiFi, power outlets, and the right atmosphere.

**Live:** [SocketHub](https://d20u7fby0bngts.cloudfront.net/)

![License](https://img.shields.io/badge/License-MIT-green)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-EC2%20%2B%20S3%20%2B%20CloudFront-FF9900?logo=amazon-web-services&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ECR-2496ED?logo=docker&logoColor=white)
![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=github-actions&logoColor=white)
![Gemini](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-8E75B2?logo=google-gemini&logoColor=white)

---

## Cloud Deployment

SocketHub uses a fully automated AWS deployment pipeline, with separate hosting strategies for the frontend and backend to optimize cost and performance.

### Architecture Overview

```
User
 │
 ▼
CloudFront CDN  ──────────────────────────────────────────────────────
 │ (HTTPS, global edge caching)                                       │
 ▼                                                                    │
S3 (Static Assets)        EC2 (Docker Container: Node.js API)         │
 │  React SPA              │  Express + Mongoose                      │
 └──────── Browser ────────┘                                          │
                │                                                     │
                ▼                                                     │
         MongoDB Atlas (Cloud)    Google Places API    Gemini AI API  │
```

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
3. `aws s3 sync dist/ s3://$S3_BUCKET_NAME --delete`
4. `aws cloudfront create-invalidation` to flush stale cache

**Required GitHub Secrets:**

| Secret | Purpose |
|--------|---------|
| `AWS_ACCESS_KEY_ID` | AWS IAM credentials |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM credentials |
| `S3_BUCKET_NAME` | Target S3 bucket name |
| `VITE_API_URL` | Backend API URL injected at build time |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API key injected at build time |

---

### Backend — AWS ECR + EC2

The Node.js API is containerized with Docker, stored in Amazon ECR, and runs on an EC2 instance. The CI/CD pipeline rebuilds and redeploys the container on every push.

| Resource | Detail |
|----------|--------|
| Region | `ap-southeast-2` (Sydney) |
| ECR Repository | `sockethub-backend` |
| EC2 | Docker host; exposes port `3000` |
| Image Tagging | Git commit SHA (immutable, traceable) |

**Deployment flow (GitHub Actions `backend.yml`):**
1. Push to `main` branch with changes under `backend/`
2. Build Docker image tagged with the commit SHA
3. Push image to Amazon ECR
4. SSH into EC2; pull the new image
5. Stop the old container, start the new one on port `3000`
6. Prune unused Docker images

**Backend Dockerfile (summary):**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

**Required GitHub Secrets:**

| Secret | Purpose |
|--------|---------|
| `AWS_ACCESS_KEY_ID` | AWS IAM credentials |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM credentials |
| `EC2_HOST` | EC2 public IP or hostname |
| `EC2_SSH_KEY` | Private SSH key for EC2 access |
| `MONGO_URI` | MongoDB Atlas connection string |
| `GOOGLE_MAPS_API_KEY` | Google Places API key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `ALLOWED_ORIGINS` | Comma-separated allowed CORS origins |

---

### Infrastructure as Code (Terraform)

Both `frontend/terraform/` and `backend/terraform/` contain Terraform configurations to provision the AWS resources above (S3 bucket, CloudFront distribution, EC2 security group, ECR repository). Run `terraform init && terraform apply` in either directory to recreate the infrastructure from scratch.

---

## Local Development

### Prerequisites

- Node.js v18+
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
| Runtime | Node.js 20 |
| Framework | Express 5 |
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
│   ├── backend.yml        # Docker build → ECR push → EC2 deploy
│   └── frontend.yml       # Vite build → S3 sync → CloudFront invalidation
│
├── backend/
│   ├── controllers/       # Express route handlers
│   ├── models/            # Mongoose schemas (Cafe, ResolutionLog)
│   ├── routes/            # Route definitions
│   ├── services/          # Business logic (CafeService, AIService)
│   ├── terraform/         # AWS EC2 + ECR infrastructure
│   ├── Dockerfile
│   └── server.js
│
└── frontend/
    ├── src/
    │   ├── components/    # TopBar, CafeDetailPanel, ContributePanel, FilterPanel
    │   ├── App.jsx        # Main state, map logic, search orchestration
    │   └── i18n.js        # i18next config + translation resources
    ├── terraform/         # AWS S3 + CloudFront infrastructure
    └── vite.config.js
```
