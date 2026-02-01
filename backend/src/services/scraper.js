import axios from 'axios';
import * as cheerio from 'cheerio';

const TIMEOUT = 10000; // 10 seconds

export async function scrapeUrl(url) {
    const media = [];

    try {
        const response = await axios.get(url, {
            timeout: TIMEOUT,
            headers: {
                // Simple UA - some sites block browser-like UAs
                'User-Agent': 'MediaScraper/1.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });

        const $ = cheerio.load(response.data);

        // Extract images
        $('img').each((_, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src');
            const alt = $(el).attr('alt') || '';

            if (src && isValidUrl(src, url)) {
                media.push({
                    type: 'image',
                    url: normalizeUrl(src, url),
                    alt
                });
            }
        });

        // Extract videos
        $('video source, video').each((_, el) => {
            const src = $(el).attr('src');

            if (src && isValidUrl(src, url)) {
                media.push({
                    type: 'video',
                    url: normalizeUrl(src, url),
                    alt: ''
                });
            }
        });

        // Extract video iframes (YouTube, Vimeo, etc.)
        $('iframe').each((_, el) => {
            const src = $(el).attr('src') || '';

            if (src.includes('youtube.com') || src.includes('vimeo.com') || src.includes('player')) {
                media.push({
                    type: 'video',
                    url: src,
                    alt: ''
                });
            }
        });

    } catch (error) {
        throw new Error(`Failed to scrape ${url}: ${error.message}`);
    }

    return media;
}

// Check if URL is valid (not data URI, not empty)
function isValidUrl(src, baseUrl) {
    if (!src) return false;
    if (src.startsWith('data:')) return false;
    if (src.length < 5) return false;
    return true;
}

// Convert relative URLs to absolute
function normalizeUrl(src, baseUrl) {
    try {
        return new URL(src, baseUrl).href;
    } catch {
        return src;
    }
}
