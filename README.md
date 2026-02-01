# Media Scraper

A full-stack web application to scrape images and videos from URLs.

## Tech Stack

- **Backend**: Node.js, Express, BullMQ, Cheerio, PostgreSQL
- **Frontend**: React, Vite
- **Infrastructure**: Docker Compose, Redis

## Quick Start

```bash
# Start all services
docker-compose up --build

# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
```

## API Endpoints

### POST /api/scrape
Queue URLs for scraping.

```bash
curl -X POST http://localhost:3001/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://www.nps.gov/subjects/technology/nasa-collaboration.htm", "https://commons.wikimedia.org/wiki/Main_Page"]}'
```

Response: `202 Accepted`
```json
{
  "message": "Scraping jobs queued",
  "count": 2
}
```

### GET /api/media
Get paginated media with filters.

```bash
curl "http://localhost:3001/api/media?page=1&limit=20&type=image&search=example"
```

Query params:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `type` - Filter: `image` or `video`
- `search` - Search in URL/alt text

## Load Testing

```bash
# Install k6
brew install k6

# Run load test (5000 requests simulation)
k6 run loadtest/load-test.js
```

### Load Test Results (1 CPU / 1GB RAM)

| Metric | Value |
|--------|-------|
| **Total Requests** | 5,000 POST (queuing) + 1,096 GET (reads) |
| **URLs Queued** | 10,000 |
| **Success Rate** | 100% (0 errors) |
| **Avg Queue Latency** | 77ms |
| **p95 Queue Latency** | 276ms |
| **Avg Read Response** | 101ms |
| **p95 Read Response** | 191ms |
| **Requests/sec** | 48.38 |

**All thresholds passed:**
- ✅ Burst p95 < 500ms
- ✅ Read p95 < 1000ms
- ✅ Error rate < 1%

## Architecture

```
Client → POST /api/scrape → BullMQ Queue → Worker (concurrency: 10) → PostgreSQL
                                                    ↓
                                             Cheerio Scraper
```

### Key Design Decisions

- **BullMQ + Redis**: Job queue with auto-retry (3 attempts, exponential backoff)
- **Batch DB Inserts**: 50 records/batch to reduce DB round trips
- **Worker Concurrency**: 10 parallel jobs (I/O-bound optimization)

### Resource Constraints (Docker)

| Service | CPU | Memory |
|---------|-----|--------|
| Backend | 0.5 | 512MB |
| PostgreSQL | 0.3 | 256MB |
| Redis | 0.1 | 128MB |
| Frontend | 0.1 | 128MB |
| **Total** | **1.0** | **1024MB** |

## Project Structure

```
media-scraper/
├── backend/
│   └── src/
│       ├── index.js           # Express server
│       ├── models/            # Sequelize models (Media)
│       ├── routes/            # API routes (/scrape, /media)
│       ├── queue/             # BullMQ queue + worker
│       └── services/          # Cheerio scraper service
├── frontend/
│   └── src/
│       ├── App.jsx            # Main app
│       ├── index.css          # Styles
│       └── components/
│           ├── FilterBar.jsx
│           ├── Lightbox.jsx
│           ├── MediaCard.jsx
│           ├── MediaGallery.jsx
│           └── Pagination.jsx
├── loadtest/
│   └── load-test.js           # k6 load test (5000 requests)
├── loadtest-results.json      # Latest test results
└── docker-compose.yml
```
