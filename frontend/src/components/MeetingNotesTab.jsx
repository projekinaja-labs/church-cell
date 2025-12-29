import { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import DatePickerInput from './DatePickerInput';
import {
    FiPlus, FiEdit2, FiTrash2, FiDownload, FiSave, FiX, FiCalendar
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

            {notes.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📝</div>
                    <h3 className="empty-state-title">{t('meetingNotes.emptyTitle')}</h3>
                    <p>{t('meetingNotes.emptyMessage')}</p>
                </div>
            ) : (
                <div className="meeting-notes-list">
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
