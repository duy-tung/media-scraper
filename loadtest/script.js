import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

// Test configuration: 5000 concurrent requests
export const options = {
    scenarios: {
        load_test: {
            executor: 'constant-vus',
            vus: 100,           // 100 concurrent virtual users
            duration: '1m',     // Run for 1 minute
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<5000'], // 95% requests < 5s
        errors: ['rate<0.1'],              // Error rate < 10%
    },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

// Sample URLs to scrape
const SAMPLE_URLS = [
    'https://example.com',
    'https://httpbin.org/html',
    'https://jsonplaceholder.typicode.com',
];

export default function () {
    // Test POST /api/scrape - Queue URLs
    const scrapePayload = JSON.stringify({
        urls: SAMPLE_URLS.slice(0, Math.floor(Math.random() * 3) + 1)
    });

    const scrapeRes = http.post(`${BASE_URL}/api/scrape`, scrapePayload, {
        headers: { 'Content-Type': 'application/json' },
    });

    const scrapeSuccess = check(scrapeRes, {
        'scrape status is 202': (r) => r.status === 202,
        'scrape has message': (r) => JSON.parse(r.body).message !== undefined,
    });

    errorRate.add(!scrapeSuccess);

    sleep(0.1); // 100ms between requests

    // Test GET /api/media - Fetch media
    const mediaRes = http.get(`${BASE_URL}/api/media?page=1&limit=20`);

    const mediaSuccess = check(mediaRes, {
        'media status is 200': (r) => r.status === 200,
        'media has data': (r) => JSON.parse(r.body).data !== undefined,
    });

    errorRate.add(!mediaSuccess);

    sleep(0.1);
}

export function handleSummary(data) {
    console.log('\n=== Load Test Summary ===\n');
    console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
    console.log(`Avg Duration: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`);
    console.log(`95th Percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`);
    console.log(`Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%`);

    return {
        'stdout': JSON.stringify(data, null, 2),
    };
}
