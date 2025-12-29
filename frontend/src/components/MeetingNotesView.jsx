import { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { FiDownload, FiCalendar } from 'react-icons/fi';

const API_URL = '/api';

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

export default function MeetingNotesView() {
    const { t } = useLanguage();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);

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

    if (loading) {
        return <div className="loading-container"><div className="loading-spinner"></div></div>;
    }

    return (
        <div>
            <h2 className="mb-lg">{t('meetingNotes.title')}</h2>

            {notes.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📝</div>
                    <h3 className="empty-state-title">{t('meetingNotes.emptyTitle')}</h3>
                    <p>{t('meetingNotes.noNotesYet')}</p>
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
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleDownload(note)}
                                >
                                    <FiDownload /> {t('meetingNotes.download')}
                                </button>
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
