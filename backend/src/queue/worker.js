import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { scrapeUrl } from '../services/scraper.js';
import { models } from '../models/index.js';

const BATCH_SIZE = 50;
let mediaBuffer = [];

// Batch insert helper
async function flushBuffer() {
    if (mediaBuffer.length > 0) {
        await models.Media.bulkCreate(mediaBuffer);
        console.log(`💾 Saved ${mediaBuffer.length} media items`);
        mediaBuffer = [];
    }
}

export function startWorker() {
    const connection = new IORedis(process.env.REDIS_URL, {
        maxRetriesPerRequest: null
    });

    const worker = new Worker('media-scrape', async (job) => {
        const { url } = job.data;
        console.log(`🔍 Scraping: ${url}`);

        try {
            // Scrape the URL
            const mediaItems = await scrapeUrl(url);

            // Add to buffer
            for (const item of mediaItems) {
                mediaBuffer.push({
                    type: item.type,
                    url: item.url,
                    sourceUrl: url,
                    altText: item.alt || null
                });

                // Flush when buffer is full
                if (mediaBuffer.length >= BATCH_SIZE) {
                    await flushBuffer();
                }
            }

            console.log(`✅ Found ${mediaItems.length} media items from ${url}`);
            return { found: mediaItems.length };
        } catch (error) {
            console.error(`❌ Error scraping ${url}:`, error.message);
            throw error; // Will trigger retry
        }
    }, {
        connection,
        concurrency: 1 // 1 CPU optimization
    });

    worker.on('completed', (job) => {
        console.log(`✅ Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        console.error(`❌ Job ${job.id} failed:`, err.message);
    });

    // Flush remaining buffer periodically
    setInterval(flushBuffer, 5000);

    return worker;
}
