import express from 'express';
import * as XLSX from 'xlsx';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Export reports to Excel (Admin only)
router.get('/excel', requireAdmin, async (req, res) => {
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

// Export reports to CSV (Admin only)
router.get('/csv', requireAdmin, async (req, res) => {
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

// Export summary by cell group (Admin only)
router.get('/summary', requireAdmin, async (req, res) => {
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

// Export meeting note to PDF (Available to all authenticated users)
router.get('/meeting-note/:id/pdf', async (req, res) => {
    try {
        const note = await req.prisma.meetingNote.findUnique({
            where: { id: parseInt(req.params.id) }
        });

        if (!note) {
            return res.status(404).json({ error: 'Meeting note not found' });
        }

        const weekDate = new Date(note.weekDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Create HTML content for PDF
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            line-height: 1.6;
            color: #333;
        }
        .header {
            border-bottom: 2px solid #6366f1;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .title {
            font-size: 28px;
            font-weight: bold;
            color: #1e1e2f;
            margin-bottom: 10px;
        }
        .date {
            color: #64748b;
            font-size: 14px;
        }
        .content {
            font-size: 14px;
        }
        .content h1 { font-size: 24px; margin-top: 20px; }
        .content h2 { font-size: 20px; margin-top: 18px; }
        .content h3 { font-size: 16px; margin-top: 16px; }
        .content ul, .content ol {
            margin-left: 20px;
            margin-bottom: 15px;
        }
        .content li { margin-bottom: 8px; }
        .content p { margin-bottom: 12px; }
        .content strong { font-weight: 600; }
        .content em { font-style: italic; }
        .content mark, .content span[style*="background"] {
            background-color: #fef08a;
            padding: 2px 4px;
            border-radius: 2px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #94a3b8;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">${note.title}</div>
        <div class="date">Week of ${weekDate}</div>
    </div>
    <div class="content">
        ${note.content}
    </div>
    <div class="footer">
        Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
    </div>
</body>
</html>`;

        // For now, return HTML that can be printed to PDF by the browser
        // A proper PDF generation would require puppeteer or similar
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename=meeting-note-${note.id}.html`);
        res.send(htmlContent);
    } catch (error) {
        console.error('Error exporting meeting note PDF:', error);
        res.status(500).json({ error: 'Failed to export meeting note' });
    }
});

export default router;
