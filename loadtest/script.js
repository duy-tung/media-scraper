import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const requestsQueued = new Counter('requests_queued');

/**
 * Load Test: 5000 concurrent scraping requests
 * 
 * Strategy:
 * - Ramp up to simulate 5000 total requests hitting the queue
 * - API should accept all requests immediately (202 Accepted)
 * - Worker processes them sequentially (concurrency: 1)
 * 
 * Target: 1 CPU, 1GB RAM environment
 */
export const options = {
    scenarios: {
        // Scenario 1: Burst 5000 scrape requests
        burst_scrape: {
            executor: 'shared-iterations',
            exec: 'burstScrape',
            vus: 50,              // 50 concurrent VUs
            iterations: 5000,     // Total 5000 requests
            maxDuration: '5m',
        },
        // Scenario 2: Continuous media queries during scraping
        query_media: {
            executor: 'constant-vus',
            exec: 'queryMedia',
            vus: 10,
            duration: '2m',
            startTime: '10s',     // Start after scraping begins
        },
    },
    thresholds: {
        'http_req_duration{scenario:burst_scrape}': ['p(95)<2000'],  // 95% < 2s for queueing
        'http_req_duration{scenario:query_media}': ['p(95)<1000'],   // 95% < 1s for queries
        'errors': ['rate<0.05'],  // Error rate < 5%
    },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

// Real URLs with media content
const SCRAPE_URLS = [
    'https://www.nps.gov/subjects/technology/nasa-collaboration.htm',
    'https://commons.wikimedia.org/wiki/Trang_Ch%C3%ADnh',
];

// Burst scenario: Queue scraping jobs
export function burstScrape() {
    // Send both URLs per request
    const urls = SCRAPE_URLS;

    const res = http.post(`${BASE_URL}/api/scrape`, JSON.stringify({ urls }), {
        headers: { 'Content-Type': 'application/json' },
        tags: { scenario: 'burst_scrape' },
    });

    const success = check(res, {
        'scrape accepted (202)': (r) => r.status === 202,
        'has count': (r) => {
            try {
                return JSON.parse(r.body).count > 0;
            } catch {
                return false;
            }
        },
    });

    if (success) {
        requestsQueued.add(urls.length);
    }
    errorRate.add(!success);
}

// Query scenario: Read media while scraping
export function queryMedia() {
    const page = Math.floor(Math.random() * 5) + 1;
    const types = ['', 'image', 'video'];
    const type = types[Math.floor(Math.random() * types.length)];

    const url = `${BASE_URL}/api/media?page=${page}&limit=20${type ? `&type=${type}` : ''}`;

    const res = http.get(url, {
        tags: { scenario: 'query_media' },
    });

    const success = check(res, {
        'media status 200': (r) => r.status === 200,
        'has pagination': (r) => {
            try {
                return JSON.parse(r.body).pagination !== undefined;
            } catch {
                return false;
            }
        },
    });

    errorRate.add(!success);
    sleep(0.5);
}

// Summary
export function handleSummary(data) {
    const summary = `
╔════════════════════════════════════════════════════════════╗
║                    LOAD TEST RESULTS                        ║
║              5000 Concurrent Scraping Requests              ║
╠════════════════════════════════════════════════════════════╣
║ Total HTTP Requests:  ${String(data.metrics.http_reqs?.values?.count || 0).padStart(10)}                     ║
║ URLs Queued:          ${String(data.metrics.requests_queued?.values?.count || 0).padStart(10)}                     ║
║                                                             ║
║ Avg Response Time:    ${String((data.metrics.http_req_duration?.values?.avg || 0).toFixed(0) + 'ms').padStart(10)}                     ║
║ 95th Percentile:      ${String((data.metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(0) + 'ms').padStart(10)}                     ║
║ Max Response Time:    ${String((data.metrics.http_req_duration?.values?.max || 0).toFixed(0) + 'ms').padStart(10)}                     ║
║                                                             ║
║ Error Rate:           ${String(((data.metrics.errors?.values?.rate || 0) * 100).toFixed(2) + '%').padStart(10)}                     ║
║ Requests/sec:         ${String((data.metrics.http_reqs?.values?.rate || 0).toFixed(2)).padStart(10)}                     ║
╚════════════════════════════════════════════════════════════╝
`;
    console.log(summary);

    return {
        'loadtest-results.json': JSON.stringify(data, null, 2),
    };
}
