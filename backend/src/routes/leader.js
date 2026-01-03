import express from 'express';
import { authenticateToken, requireLeader } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all leader routes
router.use(authenticateToken);
router.use(requireLeader);

// Get leader's cell group with members
router.get('/my-cell-group', async (req, res) => {
    try {
        const cellGroup = await req.prisma.cellGroup.findUnique({
            where: { leaderId: req.user.id },
            include: {
                members: {
                    where: { isActive: true },
                    orderBy: { name: 'asc' }
                },
                leader: { select: { id: true, name: true } }
            }
        });

        if (!cellGroup) {
            return res.status(404).json({ error: 'Cell group not found' });
        }

        res.json(cellGroup);
    } catch (error) {
        console.error('Error fetching cell group:', error);
        res.status(500).json({ error: 'Failed to fetch cell group' });
    }
});

// Add member to cell group
router.post('/members', async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Member name is required' });
        }

        const cellGroup = await req.prisma.cellGroup.findUnique({
            where: { leaderId: req.user.id }
        });

        if (!cellGroup) {
            return res.status(404).json({ error: 'Cell group not found' });
        }

        const member = await req.prisma.member.create({
            data: {
                name,
                cellGroupId: cellGroup.id
            }
        });

        res.status(201).json(member);
    } catch (error) {
        console.error('Error adding member:', error);
        res.status(500).json({ error: 'Failed to add member' });
    }
});

// Get weekly report form data for a specific week
router.get('/reports/week/:weekStart', async (req, res) => {
    try {
        const { weekStart } = req.params;
        const weekDate = new Date(weekStart);

        const cellGroup = await req.prisma.cellGroup.findUnique({
            where: { leaderId: req.user.id },
            include: {
                members: {
                    where: { isActive: true },
                    orderBy: { name: 'asc' }
                }
            }
        });

        if (!cellGroup) {
            return res.status(404).json({ error: 'Cell group not found' });
        }

        // Get existing reports for this week
        const existingReports = await req.prisma.weeklyReport.findMany({
            where: {
                weekStart: weekDate,
                member: { cellGroupId: cellGroup.id }
            }
        });

        // Map members with their reports
        const membersWithReports = cellGroup.members.map(member => {
            const report = existingReports.find(r => r.memberId === member.id);
            return {
                ...member,
                report: report || null
            };
        });

        res.json({
            cellGroup: { id: cellGroup.id, name: cellGroup.name },
            weekStart: weekDate,
            members: membersWithReports
        });
    } catch (error) {
        console.error('Error fetching week data:', error);
        res.status(500).json({ error: 'Failed to fetch week data' });
    }
});

// Submit weekly reports (batch)
router.post('/reports/batch', async (req, res) => {
    try {
        const { weekStart, reports } = req.body;

        if (!weekStart || !reports || !Array.isArray(reports)) {
            return res.status(400).json({ error: 'Week start and reports array are required' });
        }

        const weekDate = new Date(weekStart);

        // Verify cell group ownership
        const cellGroup = await req.prisma.cellGroup.findUnique({
            where: { leaderId: req.user.id },
            include: { members: true }
        });

        if (!cellGroup) {
            return res.status(404).json({ error: 'Cell group not found' });
        }

        const memberIds = cellGroup.members.map(m => m.id);

        // Validate all reports belong to this cell group
        const invalidReports = reports.filter(r => !memberIds.includes(r.memberId));
        if (invalidReports.length > 0) {
            return res.status(400).json({ error: 'Some members do not belong to your cell group' });
        }

        // Upsert all reports
        const results = await Promise.all(
            reports.map(report =>
                req.prisma.weeklyReport.upsert({
                    where: {
                        memberId_weekStart: {
                            memberId: report.memberId,
                            weekStart: weekDate
                        }
                    },
                    update: {
                        earlySermon: report.earlySermon || false,
                        charisSermon: report.charisSermon || false,
                        cellMeeting: report.cellMeeting || false,
                        bibleChaptersRead: report.bibleChaptersRead || 0,
                        prayerCount: report.prayerCount || 0,
                        notes: report.notes || null
                    },
                    create: {
                        memberId: report.memberId,
                        weekStart: weekDate,
                        earlySermon: report.earlySermon || false,
                        charisSermon: report.charisSermon || false,
                        cellMeeting: report.cellMeeting || false,
                        bibleChaptersRead: report.bibleChaptersRead || 0,
                        prayerCount: report.prayerCount || 0,
                        notes: report.notes || null
                    }
                })
            )
        );

        res.json({ message: 'Reports saved successfully', count: results.length });
    } catch (error) {
        console.error('Error saving reports:', error);
        res.status(500).json({ error: 'Failed to save reports' });
    }
});

// Get past reports for cell group
router.get('/reports/history', async (req, res) => {
    try {
        const cellGroup = await req.prisma.cellGroup.findUnique({
            where: { leaderId: req.user.id }
        });

        if (!cellGroup) {
            return res.status(404).json({ error: 'Cell group not found' });
        }

        const reports = await req.prisma.weeklyReport.findMany({
            where: {
                member: { cellGroupId: cellGroup.id }
            },
            include: {
                member: { select: { id: true, name: true } }
            },
            orderBy: [{ weekStart: 'desc' }, { member: { name: 'asc' } }]
        });

        // Group by week
        const grouped = reports.reduce((acc, report) => {
            const week = report.weekStart.toISOString().split('T')[0];
            if (!acc[week]) acc[week] = [];
            acc[week].push(report);
            return acc;
        }, {});

        res.json(grouped);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

export default router;
