import express from 'express';
import * as XLSX from 'xlsx';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

// Export reports to Excel
router.get('/excel', async (req, res) => {
    try {
        const { cellGroupId, weekStart, weekEnd } = req.query;

        const where = {};
        if (cellGroupId) {
            where.member = { cellGroupId: parseInt(cellGroupId) };
        }
        if (weekStart && weekEnd) {
            where.weekStart = {
                gte: new Date(weekStart),
                lte: new Date(weekEnd)
            };
        } else if (weekStart) {
            where.weekStart = new Date(weekStart);
        }

        const reports = await req.prisma.weeklyReport.findMany({
            where,
            include: {
                member: {
                    include: {
                        cellGroup: true
                    }
                }
            },
            orderBy: [{ weekStart: 'desc' }, { member: { cellGroup: { name: 'asc' } } }, { member: { name: 'asc' } }]
        });

        // Transform data for Excel
        const data = reports.map(report => ({
            'Week': report.weekStart.toISOString().split('T')[0],
            'Cell Group': report.member.cellGroup.name,
            'Member': report.member.name,
            'Present': report.isPresent ? 'Yes' : 'No',
            'Bible Chapters': report.bibleChaptersRead,
            'Prayers': report.prayerCount,
            'Notes': report.notes || ''
        }));

        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);

        // Set column widths
        ws['!cols'] = [
            { wch: 12 }, // Week
            { wch: 20 }, // Cell Group
            { wch: 20 }, // Member
            { wch: 10 }, // Present
            { wch: 15 }, // Bible Chapters
            { wch: 10 }, // Prayers
            { wch: 40 }  // Notes
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Reports');

        // Generate buffer
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=cell-group-reports.xlsx');
        res.send(buffer);
    } catch (error) {
        console.error('Error exporting Excel:', error);
        res.status(500).json({ error: 'Failed to export Excel' });
    }
});

// Export reports to CSV
router.get('/csv', async (req, res) => {
    try {
        const { cellGroupId, weekStart, weekEnd } = req.query;

        const where = {};
        if (cellGroupId) {
            where.member = { cellGroupId: parseInt(cellGroupId) };
        }
        if (weekStart && weekEnd) {
            where.weekStart = {
                gte: new Date(weekStart),
                lte: new Date(weekEnd)
            };
        } else if (weekStart) {
            where.weekStart = new Date(weekStart);
        }

        const reports = await req.prisma.weeklyReport.findMany({
            where,
            include: {
                member: {
                    include: {
                        cellGroup: true
                    }
                }
            },
            orderBy: [{ weekStart: 'desc' }, { member: { cellGroup: { name: 'asc' } } }, { member: { name: 'asc' } }]
        });

        // Create CSV content
        const headers = ['Week', 'Cell Group', 'Member', 'Present', 'Bible Chapters', 'Prayers', 'Notes'];
        const rows = reports.map(report => [
            report.weekStart.toISOString().split('T')[0],
            report.member.cellGroup.name,
            report.member.name,
            report.isPresent ? 'Yes' : 'No',
            report.bibleChaptersRead,
            report.prayerCount,
            (report.notes || '').replace(/,/g, ';').replace(/\n/g, ' ')
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=cell-group-reports.csv');
        res.send(csv);
    } catch (error) {
        console.error('Error exporting CSV:', error);
        res.status(500).json({ error: 'Failed to export CSV' });
    }
});

// Export summary by cell group
router.get('/summary', async (req, res) => {
    try {
        const { weekStart, weekEnd } = req.query;

        const where = {};
        if (weekStart && weekEnd) {
            where.weekStart = {
                gte: new Date(weekStart),
                lte: new Date(weekEnd)
            };
        } else if (weekStart) {
            where.weekStart = new Date(weekStart);
        }

        const cellGroups = await req.prisma.cellGroup.findMany({
            include: {
                leader: { select: { name: true } },
                members: {
                    where: { isActive: true },
                    include: {
                        weeklyReports: { where }
                    }
                }
            }
        });

        // Calculate summary
        const summary = cellGroups.map(cg => {
            const allReports = cg.members.flatMap(m => m.weeklyReports);
            const presentCount = allReports.filter(r => r.isPresent).length;
            const totalBible = allReports.reduce((sum, r) => sum + r.bibleChaptersRead, 0);
            const totalPrayers = allReports.reduce((sum, r) => sum + r.prayerCount, 0);

            return {
                'Cell Group': cg.name,
                'Leader': cg.leader.name,
                'Members': cg.members.length,
                'Total Attendance': presentCount,
                'Total Bible Chapters': totalBible,
                'Total Prayers': totalPrayers,
                'Avg Bible/Member': cg.members.length ? (totalBible / cg.members.length).toFixed(1) : 0,
                'Avg Prayer/Member': cg.members.length ? (totalPrayers / cg.members.length).toFixed(1) : 0
            };
        });

        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(summary);
        XLSX.utils.book_append_sheet(wb, ws, 'Summary');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=cell-group-summary.xlsx');
        res.send(buffer);
    } catch (error) {
        console.error('Error exporting summary:', error);
        res.status(500).json({ error: 'Failed to export summary' });
    }
});

export default router;
