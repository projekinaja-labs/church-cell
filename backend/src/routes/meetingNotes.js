import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all meeting notes (accessible by both admin and leader)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const notes = await req.prisma.meetingNote.findMany({
            orderBy: { weekDate: 'desc' }
        });
        res.json(notes);
    } catch (error) {
        console.error('Error fetching meeting notes:', error);
        res.status(500).json({ error: 'Failed to fetch meeting notes' });
    }
});

// Get single meeting note (accessible by both admin and leader)
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const note = await req.prisma.meetingNote.findUnique({
            where: { id: parseInt(req.params.id) }
        });
        if (!note) {
            return res.status(404).json({ error: 'Meeting note not found' });
        }
        res.json(note);
    } catch (error) {
        console.error('Error fetching meeting note:', error);
        res.status(500).json({ error: 'Failed to fetch meeting note' });
    }
});

// Create meeting note (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { weekDate, title, content } = req.body;

        if (!weekDate || !title) {
            return res.status(400).json({ error: 'Week date and title are required' });
        }

        const note = await req.prisma.meetingNote.create({
            data: {
                weekDate: new Date(weekDate),
                title,
                content: content || ''
            }
        });
        res.status(201).json(note);
    } catch (error) {
        console.error('Error creating meeting note:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'A meeting note for this week already exists' });
        }
        res.status(500).json({ error: 'Failed to create meeting note' });
    }
});

// Update meeting note (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { weekDate, title, content } = req.body;

        const updateData = {};
        if (weekDate) updateData.weekDate = new Date(weekDate);
        if (title !== undefined) updateData.title = title;
        if (content !== undefined) updateData.content = content;

        const note = await req.prisma.meetingNote.update({
            where: { id: parseInt(req.params.id) },
            data: updateData
        });
        res.json(note);
    } catch (error) {
        console.error('Error updating meeting note:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Meeting note not found' });
        }
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'A meeting note for this week already exists' });
        }
        res.status(500).json({ error: 'Failed to update meeting note' });
    }
});

// Delete meeting note (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await req.prisma.meetingNote.delete({
            where: { id: parseInt(req.params.id) }
        });
        res.json({ message: 'Meeting note deleted successfully' });
    } catch (error) {
        console.error('Error deleting meeting note:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Meeting note not found' });
        }
        res.status(500).json({ error: 'Failed to delete meeting note' });
    }
});

export default router;
