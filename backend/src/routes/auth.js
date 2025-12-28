import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
    try {
        const { cellId, password } = req.body;

        if (!cellId || !password) {
            return res.status(400).json({ error: 'Cell ID and password are required' });
        }

        const user = await req.prisma.user.findUnique({
            where: { cellId },
            include: {
                cellGroup: true
            }
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            {
                id: user.id,
                cellId: user.cellId,
                role: user.role,
                name: user.name,
                cellGroupId: user.cellGroup?.id
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                cellId: user.cellId,
                name: user.name,
                role: user.role,
                cellGroup: user.cellGroup
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user info
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await req.prisma.user.findUnique({
            where: { id: decoded.id },
            include: { cellGroup: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user.id,
            cellId: user.cellId,
            name: user.name,
            role: user.role,
            cellGroup: user.cellGroup
        });
    } catch (error) {
        res.status(403).json({ error: 'Invalid token' });
    }
});

export default router;
