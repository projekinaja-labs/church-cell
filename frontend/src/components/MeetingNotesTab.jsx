import { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import DatePickerInput from './DatePickerInput';
import {
    FiPlus, FiEdit2, FiTrash2, FiDownload, FiSave, FiX, FiCalendar,
    FiChevronLeft, FiChevronRight, FiCheck
} from 'react-icons/fi';

const API_URL = '/api';

// Quill editor modules configuration
const quillModules = {
    toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        ['blockquote'],
        ['clean']
    ]
};

const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'indent',
    'blockquote'
];

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Get weeks of a month
function getWeeksOfMonth(year, month) {
    const weeks = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Start from the Monday of the first week
    let current = new Date(firstDay);
    const dayOfWeek = current.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday = 1
    current.setDate(current.getDate() + diff);

    let weekNum = 1;
    while (current <= lastDay || weeks.length < 4) {
        const weekStart = new Date(current);
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);

        weeks.push({
            num: weekNum,
            start: weekStart,
            end: weekEnd,
            label: `${weekStart.getDate()}–${weekEnd.getDate()}`
        });

        weekNum++;
        current.setDate(current.getDate() + 7);

        // Stop if we've gone too far past the month
        if (weekStart.getMonth() > month && weeks.length >= 4) break;
        if (weeks.length >= 6) break; // Max 6 weeks
    }

    return weeks;
}

// Monthly Calendar Component
function MonthlyCalendar({ notes, onWeekClick, onEventSave, t }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [eventInputs, setEventInputs] = useState({});

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const weeks = getWeeksOfMonth(year, month);

    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
        setEventInputs({});
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
        setEventInputs({});
    };

    // Check if a note exists for a week
    const getNoteForWeek = (weekStart, weekEnd) => {
        return notes.find(note => {
            const noteDate = new Date(note.weekDate);
            return noteDate >= weekStart && noteDate <= weekEnd;
        });
    };

    const handleEventChange = (weekKey, value) => {
        setEventInputs(prev => ({ ...prev, [weekKey]: value }));
    };

    const handleEventBlur = async (week, note) => {
        const weekKey = week.start.toISOString();
        const newEvent = eventInputs[weekKey];

        if (newEvent !== undefined && note) {
            // Update existing note with new event
            await onEventSave(note.id, newEvent, null);
        }
    };

    return (
        <div className="card">
            <div className="flex justify-between items-center mb-lg">
                <button className="btn btn-ghost btn-sm" onClick={prevMonth}>
                    <FiChevronLeft />
                </button>
                <h3 className="card-title">
                    <FiCalendar style={{ marginRight: '8px' }} />
                    {monthName}
                </h3>
                <button className="btn btn-ghost btn-sm" onClick={nextMonth}>
                    <FiChevronRight />
                </button>
            </div>

            <div className="monthly-calendar-grid">
                {weeks.map((week, idx) => {
                    const note = getNoteForWeek(week.start, week.end);
                    const hasNote = !!note;
                    const weekKey = week.start.toISOString();
                    const eventValue = eventInputs[weekKey] !== undefined
                        ? eventInputs[weekKey]
                        : (note?.event || '');

                    return (
                        <div
                            key={idx}
                            className={`monthly-calendar-week ${hasNote ? 'has-note' : ''}`}
                        >
                            <div className="week-header">
                                <span className="week-number">{t('meetingNotes.week')} {week.num}</span>
                                <span className="week-dates">{week.label}</span>
                            </div>
                            <div className="week-content">
                                {hasNote ? (
                                    <>
                                        <input
                                            type="text"
                                            className="week-event-input"
                                            value={eventValue}
                                            onChange={(e) => handleEventChange(weekKey, e.target.value)}
                                            onBlur={() => handleEventBlur(week, note)}
                                            placeholder={t('meetingNotes.eventPlaceholder')}
                                        />
                                        <div
                                            className="week-note-link"
                                            onClick={() => onWeekClick && onWeekClick(note)}
                                        >
                                            <FiCheck className="week-check" />
                                            <span>{note.title}</span>
                                        </div>
                                    </>
                                ) : (
                                    <span className="week-empty">{t('meetingNotes.noNote')}</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function MeetingNotesTab() {
    const { t } = useLanguage();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        weekDate: '',
        title: '',
        content: ''
    });

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        try {
            const response = await axios.get(`${API_URL}/meeting-notes`);
            setNotes(response.data);
        } catch (error) {
            console.error('Error fetching meeting notes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingNote(null);
        setFormData({
            weekDate: new Date().toISOString().split('T')[0],
            title: '',
            content: ''
        });
        setShowEditor(true);
    };

    const handleEdit = (note) => {
        setEditingNote(note);
        setFormData({
            weekDate: note.weekDate.split('T')[0],
            title: note.title,
            content: note.content
        });
        setShowEditor(true);
    };

    const handleDelete = async (id) => {
        if (!confirm(t('meetingNotes.deleteConfirm'))) return;
        try {
            await axios.delete(`${API_URL}/meeting-notes/${id}`);
            fetchNotes();
        } catch (error) {
            alert(t('meetingNotes.deleteFailed'));
        }
    };

    const handleSave = async () => {
        if (!formData.weekDate || !formData.title) {
            alert(t('meetingNotes.requiredFields'));
            return;
        }

        setSaving(true);
        try {
            if (editingNote) {
                await axios.put(`${API_URL}/meeting-notes/${editingNote.id}`, formData);
            } else {
                await axios.post(`${API_URL}/meeting-notes`, formData);
            }
            fetchNotes();
            setShowEditor(false);
        } catch (error) {
            alert(error.response?.data?.error || t('meetingNotes.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    const handleDownload = async (note) => {
        try {
            const response = await axios.get(`${API_URL}/export/meeting-note/${note.id}/pdf`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `meeting-note-${formatDate(note.weekDate)}.html`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert(t('meetingNotes.downloadFailed'));
        }
    };

    const handleCancel = () => {
        setShowEditor(false);
        setEditingNote(null);
    };

    const handleWeekClick = (note) => {
        handleEdit(note);
    };

    const handleEventSave = async (noteId, event) => {
        try {
            await axios.put(`${API_URL}/meeting-notes/${noteId}`, { event });
            fetchNotes();
        } catch (error) {
            console.error('Error saving event:', error);
        }
    };

    if (loading) {
        return <div className="loading-container"><div className="loading-spinner"></div></div>;
    }

    if (showEditor) {
        return (
            <div>
                <div className="flex justify-between items-center mb-lg">
                    <h2>{editingNote ? t('meetingNotes.editNote') : t('meetingNotes.createNote')}</h2>
                    <div className="flex gap-md">
                        <button className="btn btn-secondary" onClick={handleCancel}>
                            <FiX /> {t('common.cancel')}
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            <FiSave /> {saving ? t('common.saving') : t('common.save')}
                        </button>
                    </div>
                </div>

                <div className="card">
                    <div className="grid-2 mb-lg">
                        <div className="form-group">
                            <label className="form-label">{t('meetingNotes.weekDate')}</label>
                            <DatePickerInput
                                selectedDate={formData.weekDate}
                                onChange={(date) => setFormData({ ...formData, weekDate: date })}
                                placeholder={t('meetingNotes.selectDate')}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('meetingNotes.title')}</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder={t('meetingNotes.titlePlaceholder')}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('meetingNotes.content')}</label>
                        <div className="quill-container">
                            <ReactQuill
                                theme="snow"
                                value={formData.content}
                                onChange={(value) => setFormData({ ...formData, content: value })}
                                modules={quillModules}
                                formats={quillFormats}
                                placeholder={t('meetingNotes.contentPlaceholder')}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-lg">
                <h2>{t('meetingNotes.title')}</h2>
                <button className="btn btn-primary" onClick={handleCreate}>
                    <FiPlus /> {t('meetingNotes.addNote')}
                </button>
            </div>

            {/* Monthly Calendar */}
            <MonthlyCalendar notes={notes} onWeekClick={handleWeekClick} onEventSave={handleEventSave} t={t} />

            {notes.length === 0 ? (
                <div className="empty-state mt-xl">
                    <div className="empty-state-icon">📝</div>
                    <h3 className="empty-state-title">{t('meetingNotes.emptyTitle')}</h3>
                    <p>{t('meetingNotes.emptyMessage')}</p>
                </div>
            ) : (
                <div className="meeting-notes-list mt-xl">
                    <h3 className="mb-lg">{t('meetingNotes.allNotes')}</h3>
                    {notes.map(note => (
                        <div key={note.id} className="card mb-lg">
                            <div className="card-header">
                                <div>
                                    <h3 className="card-title">{note.title}</h3>
                                    <p className="text-muted text-sm">
                                        <FiCalendar style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                                        {formatDate(note.weekDate)}
                                    </p>
                                </div>
                                <div className="flex gap-sm">
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => handleDownload(note)}
                                        title={t('meetingNotes.download')}
                                    >
                                        <FiDownload />
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => handleEdit(note)}
                                        title={t('common.edit')}
                                    >
                                        <FiEdit2 />
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => handleDelete(note.id)}
                                        title={t('common.delete')}
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </div>
                            <div
                                className="meeting-note-content"
                                dangerouslySetInnerHTML={{ __html: note.content }}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
