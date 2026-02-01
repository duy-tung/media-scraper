/**
 * Scraper Performance Benchmark
 * Đo chính xác thời gian I/O vs CPU cho scraping task
 */
import { performance, PerformanceObserver } from 'perf_hooks';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Test URLs - same as production
const TEST_URLS = [
    'https://www.nps.gov/subjects/technology/nasa-collaboration.htm',
    'https://commons.wikimedia.org/wiki/Trang_Ch%C3%ADnh',
    'https://example.com',
];

// Metrics storage
const metrics = {
    httpTime: [],
    parseTime: [],
    extractTime: [],
    totalTime: [],
};

async function benchmarkScrape(url) {
    const totalStart = performance.now();

    // 1. HTTP Request (I/O-bound)
    const httpStart = performance.now();
    const response = await axios.get(url, {
        timeout: 10000,
        headers: {
            'User-Agent': 'MediaScraper/1.0',
            'Accept': 'text/html,application/xhtml+xml',
        }
    });
    const httpEnd = performance.now();
    const httpTime = httpEnd - httpStart;

    // 2. Parse HTML với Cheerio (CPU-bound)
    const parseStart = performance.now();
    const $ = cheerio.load(response.data);
    const parseEnd = performance.now();
    const parseTime = parseEnd - parseStart;

    // 3. Extract media (CPU-bound nhẹ)
    const extractStart = performance.now();
    const media = [];

    $('img').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src) media.push({ type: 'image', url: src });
    });

    $('video source, video').each((_, el) => {
        const src = $(el).attr('src');
        if (src) media.push({ type: 'video', url: src });
    });

    const extractEnd = performance.now();
    const extractTime = extractEnd - extractStart;

    const totalTime = performance.now() - totalStart;

    return {
        url,
        htmlSize: response.data.length,
        mediaFound: media.length,
        httpTime,
        parseTime,
        extractTime,
        totalTime,
        cpuTime: parseTime + extractTime,
        ioTime: httpTime,
        cpuPercent: ((parseTime + extractTime) / totalTime * 100).toFixed(2),
        ioPercent: (httpTime / totalTime * 100).toFixed(2),
    };
}

async function runBenchmark(concurrency) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`BENCHMARK: Concurrency = ${concurrency}`);
    console.log('='.repeat(70));

    const urls = [];
    // Tạo 10 URLs để test
    for (let i = 0; i < 10; i++) {
        urls.push(TEST_URLS[i % TEST_URLS.length]);
    }

    const overallStart = performance.now();
    const results = [];

    if (concurrency === 1) {
        // Sequential
        for (const url of urls) {
            try {
                const result = await benchmarkScrape(url);
                results.push(result);
            } catch (e) {
                console.log(`  Failed: ${url} - ${e.message}`);
            }
        }
    } else {
        // Concurrent with limit
        const chunks = [];
        for (let i = 0; i < urls.length; i += concurrency) {
            chunks.push(urls.slice(i, i + concurrency));
        }

        for (const chunk of chunks) {
            const chunkResults = await Promise.all(
                chunk.map(url => benchmarkScrape(url).catch(e => null))
            );
            results.push(...chunkResults.filter(r => r !== null));
        }
    }

    const overallTime = performance.now() - overallStart;

    // Summary
    console.log('\n📊 RESULTS:');
    console.log('-'.repeat(70));

    results.forEach((r, i) => {
        console.log(`[${i + 1}] ${r.url.substring(0, 50)}...`);
        console.log(`    HTML: ${(r.htmlSize / 1024).toFixed(1)}KB | Media: ${r.mediaFound}`);
        console.log(`    HTTP: ${r.httpTime.toFixed(1)}ms (${r.ioPercent}%) | Parse: ${r.parseTime.toFixed(1)}ms | Extract: ${r.extractTime.toFixed(1)}ms`);
        console.log(`    → CPU: ${r.cpuTime.toFixed(1)}ms (${r.cpuPercent}%) | I/O: ${r.ioTime.toFixed(1)}ms (${r.ioPercent}%)`);
    });

    // Aggregate
    const avgHttp = results.reduce((s, r) => s + r.httpTime, 0) / results.length;
    const avgParse = results.reduce((s, r) => s + r.parseTime, 0) / results.length;
    const avgExtract = results.reduce((s, r) => s + r.extractTime, 0) / results.length;
    const avgCpu = results.reduce((s, r) => s + r.cpuTime, 0) / results.length;
    const avgIo = results.reduce((s, r) => s + r.ioTime, 0) / results.length;

    console.log('\n' + '='.repeat(70));
    console.log('📈 SUMMARY:');
    console.log('='.repeat(70));
    console.log(`  Jobs completed: ${results.length}`);
    console.log(`  Total time: ${(overallTime / 1000).toFixed(2)}s`);
    console.log(`  Throughput: ${(results.length / (overallTime / 1000)).toFixed(2)} jobs/s`);
    console.log('-'.repeat(70));
    console.log(`  Avg HTTP (I/O):    ${avgHttp.toFixed(1)}ms (${(avgIo / (avgCpu + avgIo) * 100).toFixed(1)}%)`);
    console.log(`  Avg Parse (CPU):   ${avgParse.toFixed(1)}ms`);
    console.log(`  Avg Extract (CPU): ${avgExtract.toFixed(1)}ms`);
    console.log(`  Avg CPU Total:     ${avgCpu.toFixed(1)}ms (${(avgCpu / (avgCpu + avgIo) * 100).toFixed(1)}%)`);
    console.log('='.repeat(70));

    return { concurrency, overallTime, jobsPerSecond: results.length / (overallTime / 1000) };
}

// Main
async function main() {
    console.log('🔬 SCRAPER PERFORMANCE BENCHMARK');
    console.log('================================');
    console.log('Mục đích: Đo % thời gian I/O vs CPU để xác định optimal concurrency\n');

    // Memory baseline
    const memStart = process.memoryUsage();
    console.log(`Memory baseline: ${(memStart.heapUsed / 1024 / 1024).toFixed(1)}MB\n`);

    const summaries = [];

    // Test với nhiều concurrency levels
    for (const concurrency of [1, 5, 10]) {
        try {
            const summary = await runBenchmark(concurrency);
            summaries.push(summary);
        } catch (e) {
            console.log(`Failed at concurrency ${concurrency}: ${e.message}`);
        }
        // Pause between tests
        await new Promise(r => setTimeout(r, 1000));
    }

    // Final comparison
    console.log('\n\n' + '█'.repeat(70));
    console.log('📊 CONCURRENCY COMPARISON:');
    console.log('█'.repeat(70));
    summaries.forEach(s => {
        console.log(`  Concurrency ${s.concurrency}: ${(s.overallTime / 1000).toFixed(2)}s total | ${s.jobsPerSecond.toFixed(2)} jobs/s`);
    });

    // Memory after
    const memEnd = process.memoryUsage();
    console.log(`\nMemory used: ${(memEnd.heapUsed / 1024 / 1024).toFixed(1)}MB (delta: +${((memEnd.heapUsed - memStart.heapUsed) / 1024 / 1024).toFixed(1)}MB)`);

    // Recommendation
    console.log('\n' + '█'.repeat(70));
    console.log('💡 RECOMMENDATION:');
    console.log('█'.repeat(70));
    if (summaries.length > 0) {
        const best = summaries.reduce((a, b) => a.jobsPerSecond > b.jobsPerSecond ? a : b);
        console.log(`  Optimal concurrency: ${best.concurrency} (${best.jobsPerSecond.toFixed(2)} jobs/s)`);
        console.log(`  Speedup vs sequential: ${(best.jobsPerSecond / summaries[0].jobsPerSecond).toFixed(2)}x`);
    }
}

main().catch(console.error);
