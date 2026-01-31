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
  -d '{"urls": ["https://example.com", "https://httpbin.org/html"]}'
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

# Run load test
k6 run loadtest/script.js
```

## Architecture

```
Client → POST /api/scrape → BullMQ Queue → Worker (concurrency:1) → PostgreSQL
                                                    ↓
                                              Cheerio Scraper
```

### Key Design Decisions

- **BullMQ + Redis**: Job queue with auto-retry (3 attempts, exponential backoff)
- **Concurrency: 1**: Optimized for 1 CPU, avoids context switching
- **Batch DB Inserts**: 50 records/batch to reduce DB round trips
- **Cheerio**: 50x lighter than Puppeteer (~5MB vs ~250MB)

## Project Structure

```
media-scraper/
├── backend/
│   └── src/
│       ├── index.js          # Express server
│       ├── models/           # Sequelize models
│       ├── routes/           # API routes
│       ├── queue/            # BullMQ queue + worker
│       └── services/         # Scraper service
├── frontend/
│   └── src/
│       ├── App.jsx           # Main app
│       └── components/       # React components
├── loadtest/
│   └── script.js             # k6 load test
└── docker-compose.yml
```
