import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import {
    FiLogOut, FiUsers, FiGrid, FiFileText, FiDownload, FiPlus,
    FiEdit2, FiTrash2, FiX, FiCheck, FiSearch, FiKey
} from 'react-icons/fi';
import DatePickerInput from '../components/DatePickerInput';
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
                    <ThemeToggle />
                    <LanguageSwitcher />
                    <button className="btn btn-ghost btn-sm" onClick={logout}>
                        <FiLogOut /> {t('common.logout')}
                    </button>
                </div>
            </div>
        </header>
    );
}

function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{title}</h3>
                    <button className="modal-close" onClick={onClose}><FiX /></button>
                </div>
                {children}
            </div>
        </div>
    );
}

// ==================== CELL GROUPS TAB ====================
function CellGroupsTab() {
    const { t } = useLanguage();
    const [cellGroups, setCellGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [formData, setFormData] = useState({ name: '', leaderName: '', cellId: '', password: '' });

    useEffect(() => {
        fetchCellGroups();
    }, []);

    const fetchCellGroups = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/cell-groups`);
            setCellGroups(response.data);
        } catch (error) {
            console.error('Error fetching cell groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingGroup) {
                await axios.put(`${API_URL}/admin/cell-groups/${editingGroup.id}`, { name: formData.name });
            } else {
                await axios.post(`${API_URL}/admin/cell-groups`, formData);
            }
            fetchCellGroups();
            closeModal();
        } catch (error) {
            alert(error.response?.data?.error || 'Operation failed');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure? This will delete the cell group, leader, and all members.')) return;
        try {
            await axios.delete(`${API_URL}/admin/cell-groups/${id}`);
            fetchCellGroups();
        } catch (error) {
            alert('Failed to delete cell group');
        }
    };

    const openCreateModal = () => {
        setEditingGroup(null);
        setFormData({ name: '', leaderName: '', cellId: '', password: '' });
        setShowModal(true);
    };

    const openEditModal = (group) => {
        setEditingGroup(group);
        setFormData({ name: group.name, leaderName: '', cellId: '', password: '' });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingGroup(null);
    };

    if (loading) return <div className="loading-container"><div className="loading-spinner"></div></div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-lg">
                <h2>{t('cellGroups.title')}</h2>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    <FiPlus /> {t('cellGroups.addButton')}
                </button>
            </div>

            {cellGroups.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <h3 className="empty-state-title">{t('cellGroups.emptyTitle')}</h3>
                    <p>{t('cellGroups.emptyMessage')}</p>
                </div>
            ) : (
                <div className="grid-3">
                    {cellGroups.map(group => (
                        <div key={group.id} className="card">
                            <div className="card-header">
                                <h4 className="card-title">{group.name}</h4>
                                <div className="flex gap-sm">
                                    <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(group)}>
                                        <FiEdit2 />
                                    </button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(group.id)}>
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </div>
                            <p className="text-muted text-sm mb-md">{t('common.leader')}: {group.leader?.name}</p>
                            <p className="text-muted text-sm mb-md">{t('login.cellId')}: {group.leader?.cellId}</p>
                            <div className="badge badge-primary">{group.members?.length || 0} {t('cellGroups.membersCount')}</div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={showModal} onClose={closeModal} title={editingGroup ? t('cellGroups.editTitle') : t('cellGroups.createTitle')}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">{t('cellGroups.groupName')}</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder={t('cellGroups.groupNamePlaceholder')}
                            required
                        />
                    </div>

                    {!editingGroup && (
                        <>
                            <div className="form-group">
                                <label className="form-label">{t('cellGroups.leaderName')}</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.leaderName}
                                    onChange={e => setFormData({ ...formData, leaderName: e.target.value })}
                                    placeholder={t('cellGroups.leaderNamePlaceholder')}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('cellGroups.cellIdLabel')}</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.cellId}
                                    onChange={e => setFormData({ ...formData, cellId: e.target.value })}
                                    placeholder={t('cellGroups.cellIdPlaceholder')}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('cellGroups.passwordLabel')}</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    placeholder={t('cellGroups.passwordPlaceholder')}
                                    required
                                />
                            </div>
                        </>
                    )}

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={closeModal}>{t('common.cancel')}</button>
                        <button type="submit" className="btn btn-primary">{editingGroup ? t('common.update') : t('common.create')}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

// ==================== MEMBERS TAB ====================
function MembersTab() {
    const { t } = useLanguage();
    const [members, setMembers] = useState([]);
    const [cellGroups, setCellGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [formData, setFormData] = useState({ name: '', cellGroupId: '' });
    const [filterCellGroup, setFilterCellGroup] = useState('');

    useEffect(() => {
        fetchData();
    }, [filterCellGroup]);

    const fetchData = async () => {
        try {
            const [membersRes, groupsRes] = await Promise.all([
                axios.get(`${API_URL}/admin/members${filterCellGroup ? `?cellGroupId=${filterCellGroup}` : ''}`),
                axios.get(`${API_URL}/admin/cell-groups`)
            ]);
            setMembers(membersRes.data);
            setCellGroups(groupsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingMember) {
                await axios.put(`${API_URL}/admin/members/${editingMember.id}`, formData);
            } else {
                await axios.post(`${API_URL}/admin/members`, formData);
            }
            fetchData();
            closeModal();
        } catch (error) {
            alert(error.response?.data?.error || 'Operation failed');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this member?')) return;
        try {
            await axios.delete(`${API_URL}/admin/members/${id}`);
            fetchData();
        } catch (error) {
            alert('Failed to delete member');
        }
    };

    const toggleActive = async (member) => {
        try {
            await axios.put(`${API_URL}/admin/members/${member.id}`, { isActive: !member.isActive });
            fetchData();
        } catch (error) {
            alert('Failed to update member');
        }
    };

    const openCreateModal = () => {
        setEditingMember(null);
        setFormData({ name: '', cellGroupId: cellGroups[0]?.id || '' });
        setShowModal(true);
    };

    const openEditModal = (member) => {
        setEditingMember(member);
        setFormData({ name: member.name, cellGroupId: member.cellGroupId });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingMember(null);
    };

    if (loading) return <div className="loading-container"><div className="loading-spinner"></div></div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-lg">
                <h2>{t('members.title')}</h2>
                <div className="flex gap-md">
                    <select
                        className="form-select"
                        style={{ width: 'auto' }}
                        value={filterCellGroup}
                        onChange={e => setFilterCellGroup(e.target.value)}
                    >
                        <option value="">{t('members.allCellGroups')}</option>
                        {cellGroups.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>
                    <button className="btn btn-primary" onClick={openCreateModal}>
                        <FiPlus /> {t('members.addButton')}
                    </button>
                </div>
            </div>

            {members.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">👥</div>
                    <h3 className="empty-state-title">{t('members.emptyTitle')}</h3>
                    <p>{t('members.emptyMessage')}</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t('table.name')}</th>
                                <th>{t('table.cellGroup')}</th>
                                <th>{t('table.status')}</th>
                                <th>{t('table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.map(member => (
                                <tr key={member.id}>
                                    <td>{member.name}</td>
                                    <td>{member.cellGroup?.name}</td>
                                    <td>
                                        <span className={`badge ${member.isActive ? 'badge-success' : 'badge-danger'}`}>
                                            {member.isActive ? t('common.active') : t('common.inactive')}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex gap-sm">
                                            <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(member)}>
                                                {member.isActive ? <FiX /> : <FiCheck />}
                                            </button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(member)}>
                                                <FiEdit2 />
                                            </button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(member.id)}>
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal isOpen={showModal} onClose={closeModal} title={editingMember ? t('members.editTitle') : t('members.addTitle')}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">{t('members.memberName')}</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder={t('members.memberNamePlaceholder')}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('members.cellGroup')}</label>
                        <select
                            className="form-select"
                            value={formData.cellGroupId}
                            onChange={e => setFormData({ ...formData, cellGroupId: parseInt(e.target.value) })}
                            required
                        >
                            <option value="">{t('members.selectCellGroup')}</option>
                            {cellGroups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={closeModal}>{t('common.cancel')}</button>
                        <button type="submit" className="btn btn-primary">{editingMember ? t('common.update') : t('common.add')}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

// ==================== REPORTS TAB ====================
function ReportsTab() {
    const { t } = useLanguage();
    const [reports, setReports] = useState([]);
    const [cellGroups, setCellGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterCellGroup, setFilterCellGroup] = useState('');
    const [filterWeek, setFilterWeek] = useState('');

    useEffect(() => {
        fetchData();
    }, [filterCellGroup, filterWeek]);

    const fetchData = async () => {
        try {
            let url = `${API_URL}/admin/reports?`;
            if (filterCellGroup) url += `cellGroupId=${filterCellGroup}&`;
            if (filterWeek) url += `weekStart=${filterWeek}`;

            const [reportsRes, groupsRes] = await Promise.all([
                axios.get(url),
                axios.get(`${API_URL}/admin/cell-groups`)
            ]);
            setReports(reportsRes.data);
            setCellGroups(groupsRes.data);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading-container"><div className="loading-spinner"></div></div>;

    // Group reports by week
    const groupedReports = reports.reduce((acc, report) => {
        const week = new Date(report.weekStart).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
        if (!acc[week]) acc[week] = [];
        acc[week].push(report);
        return acc;
    }, {});

    return (
        <div>
            <div className="flex justify-between items-center mb-lg">
                <h2>{t('reports.title')}</h2>
                <div className="flex gap-md">
                    <select
                        className="form-select"
                        style={{ width: 'auto' }}
                        value={filterCellGroup}
                        onChange={e => setFilterCellGroup(e.target.value)}
                    >
                        <option value="">{t('members.allCellGroups')}</option>
                        {cellGroups.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>
                    <DatePickerInput
                        selectedDate={filterWeek}
                        onChange={(date) => setFilterWeek(date)}
                        placeholder={t('reports.filterByWeek')}
                    />
                </div>
            </div>

            {reports.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📊</div>
                    <h3 className="empty-state-title">{t('reports.emptyTitle')}</h3>
                    <p>{t('reports.emptyMessage')}</p>
                </div>
            ) : (
                Object.entries(groupedReports).map(([week, weekReports]) => (
                    <div key={week} className="card mb-lg">
                        <h3 className="card-title mb-md">{t('reports.weekOf')} {week}</h3>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>{t('table.cellGroup')}</th>
                                        <th>{t('reports.member')}</th>
                                        <th>{t('common.present')}</th>
                                        <th>{t('reports.bibleChapters')}</th>
                                        <th>{t('reports.prayers')}</th>
                                        <th>{t('reports.notes')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {weekReports.map(report => (
                                        <tr key={report.id}>
                                            <td>{report.member?.cellGroup?.name}</td>
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
                ))
            )}
        </div>
    );
}

// ==================== EXPORT TAB ====================
function ExportTab() {
    const { t } = useLanguage();
    const [cellGroups, setCellGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [filters, setFilters] = useState({
        cellGroupId: '',
        weekStart: '',
        weekEnd: ''
    });

    useEffect(() => {
        axios.get(`${API_URL}/admin/cell-groups`)
            .then(res => setCellGroups(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleExport = async (format) => {
        setExporting(true);
        try {
            let url = `${API_URL}/export/${format}?`;
            if (filters.cellGroupId) url += `cellGroupId=${filters.cellGroupId}&`;
            if (filters.weekStart) url += `weekStart=${filters.weekStart}&`;
            if (filters.weekEnd) url += `weekEnd=${filters.weekEnd}`;

            const response = await axios.get(url, { responseType: 'blob' });

            const blob = new Blob([response.data]);
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `cell-group-reports.${format === 'excel' ? 'xlsx' : 'csv'}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            alert('Export failed');
        } finally {
            setExporting(false);
        }
    };

    const handleExportSummary = async () => {
        setExporting(true);
        try {
            let url = `${API_URL}/export/summary?`;
            if (filters.weekStart) url += `weekStart=${filters.weekStart}&`;
            if (filters.weekEnd) url += `weekEnd=${filters.weekEnd}`;

            const response = await axios.get(url, { responseType: 'blob' });

            const blob = new Blob([response.data]);
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = 'cell-group-summary.xlsx';
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            alert('Export failed');
        } finally {
            setExporting(false);
        }
    };

    if (loading) return <div className="loading-container"><div className="loading-spinner"></div></div>;

    return (
        <div>
            <h2 className="mb-lg">{t('export.title')}</h2>

            <div className="card mb-lg">
                <h3 className="card-title mb-md">{t('export.filters')}</h3>
                <div className="grid-3">
                    <div className="form-group">
                        <label className="form-label">{t('table.cellGroup')}</label>
                        <select
                            className="form-select"
                            value={filters.cellGroupId}
                            onChange={e => setFilters({ ...filters, cellGroupId: e.target.value })}
                        >
                            <option value="">{t('members.allCellGroups')}</option>
                            {cellGroups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('export.startDate')}</label>
                        <DatePickerInput
                            selectedDate={filters.weekStart}
                            onChange={(date) => setFilters({ ...filters, weekStart: date })}
                            placeholder={t('export.selectStartDate')}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('export.endDate')}</label>
                        <DatePickerInput
                            selectedDate={filters.weekEnd}
                            onChange={(date) => setFilters({ ...filters, weekEnd: date })}
                            placeholder={t('export.selectEndDate')}
                        />
                    </div>
                </div>
            </div>

            <div className="grid-3">
                <div className="card">
                    <div className="stat-icon">📊</div>
                    <h4 className="card-title">{t('export.excelTitle')}</h4>
                    <p className="text-muted text-sm mb-md">{t('export.excelDesc')}</p>
                    <button
                        className="btn btn-primary w-full"
                        onClick={() => handleExport('excel')}
                        disabled={exporting}
                    >
                        <FiDownload /> {t('export.downloadXlsx')}
                    </button>
                </div>

                <div className="card">
                    <div className="stat-icon">📄</div>
                    <h4 className="card-title">{t('export.csvTitle')}</h4>
                    <p className="text-muted text-sm mb-md">{t('export.csvDesc')}</p>
                    <button
                        className="btn btn-primary w-full"
                        onClick={() => handleExport('csv')}
                        disabled={exporting}
                    >
                        <FiDownload /> {t('export.downloadCsv')}
                    </button>
                </div>

                <div className="card">
                    <div className="stat-icon">📈</div>
                    <h4 className="card-title">{t('export.summaryTitle')}</h4>
                    <p className="text-muted text-sm mb-md">{t('export.summaryDesc')}</p>
                    <button
                        className="btn btn-primary w-full"
                        onClick={handleExportSummary}
                        disabled={exporting}
                    >
                        <FiDownload /> {t('export.downloadSummary')}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ==================== CREDENTIALS TAB ====================
function CredentialsTab() {
    const { t } = useLanguage();
    const [cellGroups, setCellGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingLeader, setEditingLeader] = useState(null);
    const [formData, setFormData] = useState({ name: '', cellId: '', password: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/cell-groups`);
            setCellGroups(response.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const updateData = {};
            if (formData.name) updateData.name = formData.name;
            if (formData.cellId) updateData.cellId = formData.cellId;
            if (formData.password) updateData.password = formData.password;

            await axios.put(`${API_URL}/admin/leaders/${editingLeader.id}`, updateData);
            fetchData();
            closeModal();
            alert('Credentials updated successfully');
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to update credentials');
        }
    };

    const openEditModal = (leader) => {
        setEditingLeader(leader);
        setFormData({ name: leader.name, cellId: leader.cellId, password: '' });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingLeader(null);
    };

    if (loading) return <div className="loading-container"><div className="loading-spinner"></div></div>;

    return (
        <div>
            <h2 className="mb-lg">{t('credentials.title')}</h2>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>{t('table.cellGroup')}</th>
                            <th>{t('credentials.leaderName')}</th>
                            <th>{t('login.cellId')}</th>
                            <th>{t('table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cellGroups.map(group => (
                            <tr key={group.id}>
                                <td>{group.name}</td>
                                <td>{group.leader?.name}</td>
                                <td><code>{group.leader?.cellId}</code></td>
                                <td>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => openEditModal(group.leader)}
                                    >
                                        <FiKey /> {t('credentials.changeButton')}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={showModal} onClose={closeModal} title={t('credentials.updateTitle')}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">{t('credentials.leaderName')}</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('credentials.cellIdLabel')}</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.cellId}
                            onChange={e => setFormData({ ...formData, cellId: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('credentials.newPassword')}</label>
                        <input
                            type="password"
                            className="form-input"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            placeholder={t('credentials.newPasswordPlaceholder')}
                        />
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={closeModal}>{t('common.cancel')}</button>
                        <button type="submit" className="btn btn-primary">{t('common.update')}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

// ==================== MAIN DASHBOARD ====================
export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('cell-groups');
    const { t } = useLanguage();

    const tabs = [
        { id: 'cell-groups', label: t('nav.cellGroups'), icon: <FiGrid /> },
        { id: 'members', label: t('nav.members'), icon: <FiUsers /> },
        { id: 'reports', label: t('nav.reports'), icon: <FiFileText /> },
        { id: 'export', label: t('nav.export'), icon: <FiDownload /> },
        { id: 'credentials', label: t('nav.credentials'), icon: <FiKey /> },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'cell-groups': return <CellGroupsTab />;
            case 'members': return <MembersTab />;
            case 'reports': return <ReportsTab />;
            case 'export': return <ExportTab />;
            case 'credentials': return <CredentialsTab />;
            default: return <CellGroupsTab />;
        }
    };

    return (
        <div className="app-container">
            <Header />
            <div className="dashboard-layout">
                <aside className="sidebar">
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
                    {renderContent()}
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
