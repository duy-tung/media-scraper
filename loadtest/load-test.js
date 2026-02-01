import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const requestsQueued = new Counter('requests_queued');
const queueLatency = new Trend('queue_latency');

/**
 * Load Test: 5000 Scraping Requests - Optimized for 1 CPU / 1GB RAM
 * 
 * Strategy:
 * - per-vu-iterations: 50 VUs × 100 iterations = 5000 exact requests
 * - API returns 202 Accepted immediately (async processing)
 * - Redis queue buffers all 5000 jobs
 * - Worker processes sequentially with concurrency: 10
 * 
 * Success Criteria:
 * - All 5000 requests return 202 Accepted
 * - p95 response time < 500ms (just queueing)
 * - Error rate < 1%
 */
export const options = {
    scenarios: {
        // BURST PHASE: Inject exactly 5000 requests
        burst_injection: {
            executor: 'per-vu-iterations',
            exec: 'burstInjection',
            vus: 50,              // 50 concurrent connections (safe for 1 CPU Node.js)
            iterations: 100,      // 50 × 100 = 5000 total requests
            maxDuration: '5m',
        },

        // READ PHASE: Verify API remains responsive during scraping
        background_read: {
            executor: 'constant-vus',
            exec: 'backgroundRead',
            vus: 10,
            duration: '2m',
            startTime: '5s',      // Start slightly after burst begins
        },
    },
    thresholds: {
        // Queue operations should be fast (<500ms)
        'http_req_duration{scenario:burst_injection}': ['p(95)<500', 'p(99)<2000'],
        // Read API must stay responsive
        'http_req_duration{scenario:background_read}': ['p(95)<1000'],
        // Zero tolerance for dropped requests
        'errors': ['rate<0.01'],
    },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

// Lightweight payload to minimize bandwidth
const PAYLOAD = JSON.stringify({
    urls: [
        'https://www.nps.gov/subjects/technology/nasa-collaboration.htm',
        'https://commons.wikimedia.org/wiki/Trang_Ch%C3%ADnh',
    ]
});

const PARAMS = {
    headers: { 'Content-Type': 'application/json' },
    tags: { scenario: 'burst_injection' },
};

// Burst injection function
export function burstInjection() {
    const startTime = Date.now();

    const res = http.post(`${BASE_URL}/api/scrape`, PAYLOAD, PARAMS);

    const latency = Date.now() - startTime;
    queueLatency.add(latency);

    const success = check(res, {
        'status is 202': (r) => r.status === 202,
        'job queued': (r) => {
            try {
                return JSON.parse(r.body).count > 0;
            } catch {
                return false;
            }
        },
    });

    if (success) {
        requestsQueued.add(2); // 2 URLs per request
    } else {
        errorRate.add(1);
        console.log(`Failed: ${res.status} ${res.body}`);
    }

    // Micro-sleep to prevent local socket exhaustion
    sleep(0.01);
}

// Background read function
export function backgroundRead() {
    const page = Math.floor(Math.random() * 5) + 1;
    const types = ['', 'image', 'video'];
    const type = types[Math.floor(Math.random() * types.length)];

    const url = `${BASE_URL}/api/media?page=${page}&limit=20${type ? `&type=${type}` : ''}`;

    const res = http.get(url, {
        tags: { scenario: 'background_read' },
    });

    const success = check(res, {
        'read status 200': (r) => r.status === 200,
    });

    if (!success) errorRate.add(1);
    sleep(1);
}

// Summary output
export function handleSummary(data) {
    const burstMetrics = data.metrics['http_req_duration{scenario:burst_injection}'];
    const readMetrics = data.metrics['http_req_duration{scenario:background_read}'];

    const summary = `
╔════════════════════════════════════════════════════════════╗
║           LOAD TEST: 5000 SCRAPING REQUESTS                 ║
║              Optimized for 1 CPU / 1GB RAM                  ║
╠════════════════════════════════════════════════════════════╣
║ BURST INJECTION (50 VUs × 100 iters = 5000 requests)        ║
║   Total Requests:       ${String(data.metrics.http_reqs?.values?.count || 0).padStart(8)}                     ║
║   URLs Queued:          ${String(data.metrics.requests_queued?.values?.count || 0).padStart(8)}                     ║
║   Avg Queue Latency:    ${String((burstMetrics?.values?.avg || 0).toFixed(0) + 'ms').padStart(8)}                     ║
║   p95 Queue Latency:    ${String((burstMetrics?.values?.['p(95)'] || 0).toFixed(0) + 'ms').padStart(8)}                     ║
║   p99 Queue Latency:    ${String((burstMetrics?.values?.['p(99)'] || 0).toFixed(0) + 'ms').padStart(8)}                     ║
╠════════════════════════════════════════════════════════════╣
║ BACKGROUND READ (API responsiveness)                        ║
║   Avg Response:         ${String((readMetrics?.values?.avg || 0).toFixed(0) + 'ms').padStart(8)}                     ║
║   p95 Response:         ${String((readMetrics?.values?.['p(95)'] || 0).toFixed(0) + 'ms').padStart(8)}                     ║
╠════════════════════════════════════════════════════════════╣
║ OVERALL                                                     ║
║   Error Rate:           ${String(((data.metrics.errors?.values?.rate || 0) * 100).toFixed(2) + '%').padStart(8)}                     ║
║   Requests/sec:         ${String((data.metrics.http_reqs?.values?.rate || 0).toFixed(2)).padStart(8)}                     ║
╠════════════════════════════════════════════════════════════╣
║ THRESHOLDS                                                  ║
║   Burst p95 < 500ms:    ${burstMetrics?.thresholds?.['p(95)<500']?.ok ? '✅ PASS' : '❌ FAIL'}                          ║
║   Burst p99 < 2000ms:   ${burstMetrics?.thresholds?.['p(99)<2000']?.ok ? '✅ PASS' : '❌ FAIL'}                          ║
║   Read p95 < 1000ms:    ${readMetrics?.thresholds?.['p(95)<1000']?.ok ? '✅ PASS' : '❌ FAIL'}                          ║
║   Error rate < 1%:      ${data.metrics.errors?.thresholds?.['rate<0.01']?.ok ? '✅ PASS' : '❌ FAIL'}                          ║
╚════════════════════════════════════════════════════════════╝
`;
    console.log(summary);

    return {
        stdout: textSummary(data, { indent: ' ', enableColors: true }),
        'loadtest-5000-results.json': JSON.stringify(data, null, 2),
    };
}
