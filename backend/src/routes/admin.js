import express from 'express';
import bcrypt from 'bcryptjs';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all admin routes
router.use(authenticateToken);
router.use(requireAdmin);

// ==================== CELL GROUPS ====================

// Get all cell groups
router.get('/cell-groups', async (req, res) => {
    try {
        const cellGroups = await req.prisma.cellGroup.findMany({
            include: {
                leader: { select: { id: true, name: true, cellId: true } },
                members: { where: { isActive: true } }
            },
            orderBy: { name: 'asc' }
        });
        res.json(cellGroups);
    } catch (error) {
        console.error('Error fetching cell groups:', error);
        res.status(500).json({ error: 'Failed to fetch cell groups' });
    }
});

// Create cell group with leader
router.post('/cell-groups', async (req, res) => {
    try {
        const { name, leaderName, cellId, password } = req.body;

        if (!name || !leaderName || !cellId || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if cellId already exists
        const existingUser = await req.prisma.user.findUnique({ where: { cellId } });
        if (existingUser) {
            return res.status(400).json({ error: 'Cell ID already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create leader and cell group in transaction
        const result = await req.prisma.$transaction(async (prisma) => {
            const leader = await prisma.user.create({
                data: {
                    cellId,
                    password: hashedPassword,
                    name: leaderName,
                    role: 'leader'
                }
            });

            const cellGroup = await prisma.cellGroup.create({
                data: {
                    name,
                    leaderId: leader.id
                },
                include: {
                    leader: { select: { id: true, name: true, cellId: true } }
                }
            });

            return cellGroup;
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating cell group:', error);
        res.status(500).json({ error: 'Failed to create cell group' });
    }
});

// Update cell group
router.put('/cell-groups/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const cellGroup = await req.prisma.cellGroup.update({
            where: { id: parseInt(id) },
            data: { name },
            include: {
                leader: { select: { id: true, name: true, cellId: true } }
            }
        });

        res.json(cellGroup);
    } catch (error) {
        console.error('Error updating cell group:', error);
        res.status(500).json({ error: 'Failed to update cell group' });
    }
});

// Delete cell group
router.delete('/cell-groups/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const cellGroup = await req.prisma.cellGroup.findUnique({
            where: { id: parseInt(id) },
            include: { leader: true }
        });

        if (!cellGroup) {
            return res.status(404).json({ error: 'Cell group not found' });
        }

        // Delete cell group and leader in transaction
        await req.prisma.$transaction(async (prisma) => {
            await prisma.cellGroup.delete({ where: { id: parseInt(id) } });
            await prisma.user.delete({ where: { id: cellGroup.leaderId } });
        });

        res.json({ message: 'Cell group deleted successfully' });
    } catch (error) {
        console.error('Error deleting cell group:', error);
        res.status(500).json({ error: 'Failed to delete cell group' });
    }
});

// ==================== LEADERS ====================

// Update leader credentials
router.put('/leaders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, cellId, password } = req.body;

        const updateData = {};
        if (name) updateData.name = name;
        if (cellId) {
            // Check if new cellId is already taken
            const existing = await req.prisma.user.findFirst({
                where: { cellId, id: { not: parseInt(id) } }
            });
            if (existing) {
                return res.status(400).json({ error: 'Cell ID already exists' });
            }
            updateData.cellId = cellId;
        }
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const user = await req.prisma.user.update({
            where: { id: parseInt(id) },
            data: updateData,
            select: { id: true, name: true, cellId: true, role: true }
        });

        res.json(user);
    } catch (error) {
        console.error('Error updating leader:', error);
        res.status(500).json({ error: 'Failed to update leader' });
    }
});

// ==================== MEMBERS ====================

// Get all members
router.get('/members', async (req, res) => {
    try {
        const { cellGroupId } = req.query;

        const where = {};
        if (cellGroupId) {
            where.cellGroupId = parseInt(cellGroupId);
        }

        const members = await req.prisma.member.findMany({
            where,
            include: {
                cellGroup: { select: { id: true, name: true } }
            },
            orderBy: [{ cellGroupId: 'asc' }, { name: 'asc' }]
        });

        res.json(members);
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});

// Add member
router.post('/members', async (req, res) => {
    try {
        const { name, cellGroupId } = req.body;

        if (!name || !cellGroupId) {
            return res.status(400).json({ error: 'Name and cell group are required' });
        }

        const member = await req.prisma.member.create({
            data: {
                name,
                cellGroupId: parseInt(cellGroupId)
            },
            include: {
                cellGroup: { select: { id: true, name: true } }
            }
        });

        res.status(201).json(member);
    } catch (error) {
        console.error('Error creating member:', error);
        res.status(500).json({ error: 'Failed to create member' });
    }
});

// Update member
router.put('/members/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, isActive, cellGroupId } = req.body;

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (cellGroupId !== undefined) updateData.cellGroupId = parseInt(cellGroupId);

        const member = await req.prisma.member.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                cellGroup: { select: { id: true, name: true } }
            }
        });

        res.json(member);
    } catch (error) {
        console.error('Error updating member:', error);
        res.status(500).json({ error: 'Failed to update member' });
    }
});

// Delete member
router.delete('/members/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await req.prisma.member.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Member deleted successfully' });
    } catch (error) {
        console.error('Error deleting member:', error);
        res.status(500).json({ error: 'Failed to delete member' });
    }
});

// ==================== REPORTS ====================

// Get all reports (with filters)
router.get('/reports', async (req, res) => {
    try {
        const { cellGroupId, weekStart, memberId } = req.query;

        const where = {};
        if (cellGroupId) {
            where.member = { cellGroupId: parseInt(cellGroupId) };
        }
        if (weekStart) {
            where.weekStart = new Date(weekStart);
        }
        if (memberId) {
            where.memberId = parseInt(memberId);
        }

        const reports = await req.prisma.weeklyReport.findMany({
            where,
            include: {
                member: {
                    include: {
                        cellGroup: { select: { id: true, name: true } }
                    }
                }
            },
            orderBy: [{ weekStart: 'desc' }, { memberId: 'asc' }]
        });

        res.json(reports);
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

// Get reports summary by week
router.get('/reports/summary', async (req, res) => {
    try {
        const weeks = await req.prisma.weeklyReport.groupBy({
            by: ['weekStart'],
            _count: { id: true },
            _sum: { bibleChaptersRead: true, prayerCount: true },
            orderBy: { weekStart: 'desc' },
            take: 12 // Last 12 weeks
        });

        res.json(weeks);
    } catch (error) {
        console.error('Error fetching summary:', error);
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
});

// ==================== ATTENDANCE ====================

// Get all members with their attendance for a specific week
router.get('/attendance/week/:weekStart', async (req, res) => {
    try {
        const { weekStart } = req.params;
        const weekDate = new Date(weekStart);

        const cellGroups = await req.prisma.cellGroup.findMany({
            include: {
                leader: { select: { id: true, name: true } },
                members: {
                    where: { isActive: true },
                    orderBy: { name: 'asc' }
                }
            },
            orderBy: { name: 'asc' }
        });

        // Get existing reports for this week
        const existingReports = await req.prisma.weeklyReport.findMany({
            where: { weekStart: weekDate }
        });

        // Map cell groups with member attendance
        const groupsWithAttendance = cellGroups.map(group => ({
            ...group,
            members: group.members.map(member => {
                const report = existingReports.find(r => r.memberId === member.id);
                return {
                    ...member,
                    attendance: report ? {
                        earlySermon: report.earlySermon,
                        charisSermon: report.charisSermon,
                        cellMeeting: report.cellMeeting
                    } : {
                        earlySermon: false,
                        charisSermon: false,
                        cellMeeting: false
                    }
                };
            })
        }));

        res.json({
            weekStart: weekDate,
            cellGroups: groupsWithAttendance
        });
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ error: 'Failed to fetch attendance' });
    }
});

// Batch update attendance for multiple members
router.post('/attendance/batch', async (req, res) => {
    try {
        const { weekStart, attendance } = req.body;

        if (!weekStart || !attendance || !Array.isArray(attendance)) {
            return res.status(400).json({ error: 'Week start and attendance array are required' });
        }

        const weekDate = new Date(weekStart);

        // Upsert all attendance records
        const results = await Promise.all(
            attendance.map(record =>
                req.prisma.weeklyReport.upsert({
                    where: {
                        memberId_weekStart: {
                            memberId: record.memberId,
                            weekStart: weekDate
                        }
                    },
                    update: {
                        earlySermon: record.earlySermon || false,
                        charisSermon: record.charisSermon || false,
                        cellMeeting: record.cellMeeting || false
                    },
                    create: {
                        memberId: record.memberId,
                        weekStart: weekDate,
                        earlySermon: record.earlySermon || false,
                        charisSermon: record.charisSermon || false,
                        cellMeeting: record.cellMeeting || false,
                        bibleChaptersRead: 0,
                        prayerCount: 0
                    }
                })
            )
        );

        res.json({ message: 'Attendance saved successfully', count: results.length });
    } catch (error) {
        console.error('Error saving attendance:', error);
        res.status(500).json({ error: 'Failed to save attendance' });
    }
});

export default router;
