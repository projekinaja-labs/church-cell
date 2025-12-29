import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all week events (accessible by both admin and leader)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const events = await req.prisma.weekEvent.findMany({
            orderBy: { weekDate: 'desc' }
        });
        res.json(events);
    } catch (error) {
        console.error('Error fetching week events:', error);
        res.status(500).json({ error: 'Failed to fetch week events' });
    }
});

// Upsert week event (create or update) - admin only
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { weekDate, event } = req.body;

        if (!weekDate) {
            return res.status(400).json({ error: 'Week date is required' });
        }

        // If event is empty, delete the record
        if (!event || event.trim() === '') {
            await req.prisma.weekEvent.deleteMany({
                where: { weekDate: new Date(weekDate) }
            });
            return res.json({ message: 'Week event cleared' });
        }

        // Upsert - create or update
        const weekEvent = await req.prisma.weekEvent.upsert({
            where: { weekDate: new Date(weekDate) },
            update: { event },
            create: {
                weekDate: new Date(weekDate),
                event
            }
        });
        res.json(weekEvent);
    } catch (error) {
        console.error('Error saving week event:', error);
        res.status(500).json({ error: 'Failed to save week event' });
    }
});

export default router;
