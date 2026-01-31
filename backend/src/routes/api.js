import { Router } from 'express';
import { scrapeQueue } from '../queue/scrapeQueue.js';
import { models } from '../models/index.js';
import { Op } from 'sequelize';

const router = Router();

// POST /api/scrape - Accept array of URLs, queue jobs
router.post('/scrape', async (req, res) => {
    try {
        const { urls } = req.body;

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({ error: 'urls array is required' });
        }

        // Add jobs to queue in bulk
        const jobs = urls.map(url => ({
            name: 'scrape',
            data: { url }
        }));

        await scrapeQueue.addBulk(jobs);

        res.status(202).json({
            message: 'Scraping jobs queued',
            count: urls.length
        });
    } catch (error) {
        console.error('Error queuing jobs:', error);
        res.status(500).json({ error: 'Failed to queue jobs' });
    }
});

// GET /api/media - Paginated list with type filter & search
router.get('/media', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            type,
            search
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const where = {};

        // Filter by type
        if (type && ['image', 'video'].includes(type)) {
            where.type = type;
        }

        // Search by URL or alt text
        if (search) {
            where[Op.or] = [
                { url: { [Op.iLike]: `%${search}%` } },
                { altText: { [Op.iLike]: `%${search}%` } },
                { sourceUrl: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const { count, rows } = await models.Media.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset,
            order: [['created_at', 'DESC']]
        });

        res.json({
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching media:', error);
        res.status(500).json({ error: 'Failed to fetch media' });
    }
});

export default router;
