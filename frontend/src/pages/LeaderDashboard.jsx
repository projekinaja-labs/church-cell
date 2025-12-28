import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import {
    FiLogOut, FiUsers, FiCalendar, FiClock, FiPlus,
    FiCheck, FiSave, FiChevronLeft, FiChevronRight, FiBook, FiHeart
} from 'react-icons/fi';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ThemeToggle from '../components/ThemeToggle';

const API_URL = '/api';

function Header() {
    const { user, logout } = useAuth();
    const { t } = useLanguage();

    return (
        <header className="header">
            <div className="header-content">
                <div className="header-logo">
                    <div className="header-logo-icon">⛪</div>
                    <span>{t('common.appName')}</span>
                </div>
                <div className="header-user">
                    <span className="header-user-name">{user?.name}</span>
                    <span className="badge badge-primary" style={{ marginLeft: '8px' }}>{t('common.leader')}</span>
                    <ThemeToggle />
                    <LanguageSwitcher />
                    <button className="btn btn-ghost btn-sm" onClick={logout} style={{ marginLeft: '12px' }}>
                        <FiLogOut /> {t('common.logout')}
                    </button>
                </div>
            </div>
        </header>
    );
}

// Get the Sunday (end) of the current week - this is what we save
function getWeekStart(date) {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0); // Use noon to avoid timezone edge cases
    const day = d.getDay();
    // Calculate days to add to get to Sunday
    // If already Sunday (0), stay on Sunday. Otherwise, add days to reach Sunday.
    const daysToSunday = day === 0 ? 0 : 7 - day;
    d.setDate(d.getDate() + daysToSunday);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Get the Saturday (end) of the week - not used but keeping for reference
function getWeekEnd(weekStartDate) {
    const d = new Date(weekStartDate);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + 5);
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatWeekRange(weekEnd) {
    // weekEnd is Sunday, calculate Monday (start) by going back 6 days
    const end = new Date(weekEnd);
    end.setHours(12, 0, 0, 0); // Avoid timezone issues
    const start = new Date(end);
    start.setDate(start.getDate() - 6); // Sunday - 6 = Monday

    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

// Format date as YYYY-MM-DD without timezone shift
function formatDateForAPI(date) {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0); // Use noon to avoid timezone issues
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ==================== WEEKLY REPORT FORM ====================
function WeeklyReportForm() {
    const { t } = useLanguage();
    const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
    const [cellGroup, setCellGroup] = useState(null);
    const [members, setMembers] = useState([]);
    const [reports, setReports] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetchWeekData();
    }, [weekStart]);

    const fetchWeekData = async () => {
        setLoading(true);
        setSaved(false);
        try {
            const response = await axios.get(`${API_URL}/leader/reports/week/${formatDateForAPI(weekStart)}`);
            setCellGroup(response.data.cellGroup);
            setMembers(response.data.members);

            // Initialize reports state
            const initialReports = {};
            response.data.members.forEach(member => {
                initialReports[member.id] = member.report || {
                    memberId: member.id,
                    isPresent: false,
                    bibleChaptersRead: 0,
                    prayerCount: 0,
                    notes: ''
                };
            });
            setReports(initialReports);
        } catch (error) {
            console.error('Error fetching week data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReportChange = (memberId, field, value) => {
        setSaved(false);
        setReports(prev => ({
            ...prev,
            [memberId]: {
                ...prev[memberId],
                [field]: value
            }
        }));
    };

    const handleSubmit = async () => {
        setSaving(true);
        try {
            const reportsArray = Object.values(reports).map(r => ({
                memberId: r.memberId,
                isPresent: r.isPresent,
                bibleChaptersRead: parseInt(r.bibleChaptersRead) || 0,
                prayerCount: parseInt(r.prayerCount) || 0,
                notes: r.notes
            }));

            await axios.post(`${API_URL}/leader/reports/batch`, {
                weekStart: formatDateForAPI(weekStart),
                reports: reportsArray
            });

            setSaved(true);
        } catch (error) {
            alert('Failed to save reports');
        } finally {
            setSaving(false);
        }
    };

    const navigateWeek = (direction) => {
        const newDate = new Date(weekStart);
        newDate.setDate(newDate.getDate() + (direction * 7));
        setWeekStart(newDate);
    };

    if (loading) {
        return <div className="loading-container"><div className="loading-spinner"></div></div>;
    }

    return (
        <div>
            {/* Week Navigation */}
            <div className="card mb-lg">
                <div className="flex justify-between items-center">
                    <button className="btn btn-ghost" onClick={() => navigateWeek(-1)}>
                        <FiChevronLeft /> {t('reports.previousWeek')}
                    </button>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-sm mb-sm">
                            <FiCalendar />
                            <span className="text-muted">{t('reports.weekOf')}</span>
                        </div>
                        <h3>{formatWeekRange(weekStart)}</h3>
                    </div>
                    <button className="btn btn-ghost" onClick={() => navigateWeek(1)}>
                        {t('reports.nextWeek')} <FiChevronRight />
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon"><FiUsers /></div>
                    <div className="stat-value">{Object.values(reports).filter(r => r.isPresent).length}</div>
                    <div className="stat-label">{t('reports.presentThisWeek')}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><FiBook /></div>
                    <div className="stat-value">{Object.values(reports).reduce((sum, r) => sum + (parseInt(r.bibleChaptersRead) || 0), 0)}</div>
                    <div className="stat-label">{t('reports.bibleChapters')}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><FiHeart /></div>
                    <div className="stat-value">{Object.values(reports).reduce((sum, r) => sum + (parseInt(r.prayerCount) || 0), 0)}</div>
                    <div className="stat-label">{t('reports.prayerCount')}</div>
                </div>
            </div>

            {/* Member Reports */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">{cellGroup?.name} - {t('nav.weeklyReport')}</h3>
                    <button
                        className={`btn ${saved ? 'btn-success' : 'btn-primary'}`}
                        onClick={handleSubmit}
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <div className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                                {t('common.saving')}
                            </>
                        ) : saved ? (
                            <>
                                <FiCheck /> {t('common.saved')}
                            </>
                        ) : (
                            <>
                                <FiSave /> {t('reports.saveReports')}
                            </>
                        )}
                    </button>
                </div>

                {members.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">👥</div>
                        <h3 className="empty-state-title">{t('members.noMembersYet')}</h3>
                        <p>{t('members.addFirstMember')}</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{t('reports.member')}</th>
                                    <th style={{ width: '100px', textAlign: 'center' }}>{t('common.present')}</th>
                                    <th style={{ width: '140px' }}>{t('reports.bibleChapters')}</th>
                                    <th style={{ width: '140px' }}>{t('reports.prayerCount')}</th>
                                    <th>{t('reports.notes')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.map(member => (
                                    <tr key={member.id}>
                                        <td>
                                            <strong>{member.name}</strong>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <label className="form-checkbox" style={{ justifyContent: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={reports[member.id]?.isPresent || false}
                                                    onChange={e => handleReportChange(member.id, 'isPresent', e.target.checked)}
                                                />
                                            </label>
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                className="form-input"
                                                value={reports[member.id]?.bibleChaptersRead || ''}
                                                onChange={e => handleReportChange(member.id, 'bibleChaptersRead', e.target.value)}
                                                placeholder="0"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                className="form-input"
                                                value={reports[member.id]?.prayerCount || ''}
                                                onChange={e => handleReportChange(member.id, 'prayerCount', e.target.value)}
                                                placeholder="0"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={reports[member.id]?.notes || ''}
                                                onChange={e => handleReportChange(member.id, 'notes', e.target.value)}
                                                placeholder={t('reports.addNotes')}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

// ==================== ADD MEMBER FORM ====================
function AddMemberForm({ onMemberAdded }) {
    const { t } = useLanguage();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            await axios.post(`${API_URL}/leader/members`, { name: name.trim() });
            setName('');
            onMemberAdded();
        } catch (error) {
            alert('Failed to add member');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-md">
            <input
                type="text"
                className="form-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('members.newMemberPlaceholder')}
                style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
                <FiPlus /> {t('members.addButton')}
            </button>
        </form>
    );
}

// ==================== HISTORY VIEW ====================
function HistoryView() {
    const { t } = useLanguage();
    const [history, setHistory] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const response = await axios.get(`${API_URL}/leader/reports/history`);
            setHistory(response.data);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading-container"><div className="loading-spinner"></div></div>;
    }

    const weeks = Object.keys(history).sort((a, b) => new Date(b) - new Date(a));

    if (weeks.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">📅</div>
                <h3 className="empty-state-title">{t('history.emptyTitle')}</h3>
                <p>{t('history.emptyMessage')}</p>
            </div>
        );
    }

    return (
        <div>
            {weeks.map(week => (
                <div key={week} className="card mb-lg">
                    <h3 className="card-title mb-md">
                        <FiClock style={{ marginRight: '8px' }} />
                        {new Date(week).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'long', day: 'numeric'
                        })}
                    </h3>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{t('reports.member')}</th>
                                    <th>{t('common.present')}</th>
                                    <th>{t('reports.bibleChapters')}</th>
                                    <th>{t('reports.prayers')}</th>
                                    <th>{t('reports.notes')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history[week].map(report => (
                                    <tr key={report.id}>
                                        <td>{report.member?.name}</td>
                                        <td>
                                            <span className={`badge ${report.isPresent ? 'badge-success' : 'badge-danger'}`}>
                                                {report.isPresent ? t('common.yes') : t('common.no')}
                                            </span>
                                        </td>
                                        <td>{report.bibleChaptersRead}</td>
                                        <td>{report.prayerCount}</td>
                                        <td>{report.notes || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ==================== MAIN DASHBOARD ====================
export default function LeaderDashboard() {
    const [activeTab, setActiveTab] = useState('report');
    const [cellGroup, setCellGroup] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const { t } = useLanguage();

    useEffect(() => {
        fetchCellGroup();
    }, []);

    const fetchCellGroup = async () => {
        try {
            const response = await axios.get(`${API_URL}/leader/my-cell-group`);
            setCellGroup(response.data);
        } catch (error) {
            console.error('Error fetching cell group:', error);
        }
    };

    const handleMemberAdded = () => {
        fetchCellGroup();
        setRefreshKey(prev => prev + 1);
    };

    const tabs = [
        { id: 'report', label: t('nav.weeklyReport'), icon: <FiCalendar /> },
        { id: 'members', label: t('nav.members'), icon: <FiUsers /> },
        { id: 'history', label: t('nav.history'), icon: <FiClock /> },
    ];

    return (
        <div className="app-container">
            <Header />
            <div className="dashboard-layout">
                <aside className="sidebar">
                    <div className="card mb-lg" style={{ padding: 'var(--space-md)' }}>
                        <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('nav.myCellGroup')}</h4>
                        <p style={{ fontWeight: 600, fontSize: '1.125rem' }}>{cellGroup?.name || t('common.loading')}</p>
                        <p className="text-sm text-muted">{cellGroup?.members?.length || 0} {t('nav.members').toLowerCase()}</p>
                    </div>

                    <nav className="sidebar-nav">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`sidebar-link ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </aside>

                <main className="dashboard-main">
                    {activeTab === 'report' && <WeeklyReportForm key={refreshKey} />}

                    {activeTab === 'members' && (
                        <div>
                            <h2 className="mb-lg">{t('members.title')}</h2>

                            <div className="card mb-lg">
                                <h3 className="card-title mb-md">{t('members.addNewMember')}</h3>
                                <AddMemberForm onMemberAdded={handleMemberAdded} />
                            </div>

                            <div className="card">
                                <h3 className="card-title mb-md">{t('members.currentMembers')}</h3>
                                {cellGroup?.members?.length === 0 ? (
                                    <div className="empty-state">
                                        <div className="empty-state-icon">👥</div>
                                        <h3 className="empty-state-title">{t('members.noMembersYet')}</h3>
                                        <p>{t('members.addFirstMember')}</p>
                                    </div>
                                ) : (
                                    <div className="grid-3">
                                        {cellGroup?.members?.map(member => (
                                            <div key={member.id} className="glass-card">
                                                <div className="flex items-center gap-md">
                                                    <div
                                                        style={{
                                                            width: '40px',
                                                            height: '40px',
                                                            borderRadius: 'var(--radius-full)',
                                                            background: 'var(--accent-gradient)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        {member.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <strong>{member.name}</strong>
                                                        <p className="text-sm text-muted">
                                                            {member.isActive ? t('common.active') : t('common.inactive')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div>
                            <h2 className="mb-lg">{t('history.title')}</h2>
                            <HistoryView />
                        </div>
                    )}
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <nav className="mobile-nav">
                <div className="mobile-nav-items">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`mobile-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </nav>
        </div>
    );
}
