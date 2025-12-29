import { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import {
    FiDownload, FiCalendar, FiChevronLeft, FiChevronRight,
    FiCheck, FiSearch, FiX
} from 'react-icons/fi';

const API_URL = '/api';

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Get weeks of a month based on Sundays
function getWeeksOfMonth(year, month) {
    const weeks = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Find all Sundays in this month
    let current = new Date(firstDay);
    while (current.getDay() !== 0) {
        current.setDate(current.getDate() + 1);
    }

    let weekNum = 1;
    while (current.getMonth() === month) {
        const sunday = new Date(current);
        // Week starts on Monday (6 days before Sunday)
        const weekStart = new Date(sunday);
        weekStart.setDate(weekStart.getDate() - 6);

        // Always show full date range (Mon - Sun) even if Monday is in previous month
        const startLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endLabel = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        weeks.push({
            num: weekNum,
            sunday,
            start: weekStart,
            end: sunday,
            label: `${startLabel} - ${endLabel}`
        });

        current.setDate(current.getDate() + 7);
        weekNum++;
    }

    return weeks;
}

// Read-only Monthly Calendar Component for Leaders
function MonthlyCalendarReadOnly({ notes, weekEvents, onWeekFilter, selectedFilter, t }) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const weeks = getWeeksOfMonth(year, month);

    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const getNotesForWeek = (weekStart, weekEnd) => {
        return notes.filter(note => {
            const noteDate = new Date(note.weekDate);
            return noteDate >= weekStart && noteDate <= weekEnd;
        });
    };

    const getEventForWeek = (sunday) => {
        return weekEvents.find(e => {
            const eventDate = new Date(e.weekDate);
            return eventDate.toDateString() === sunday.toDateString();
        });
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
                    const weekNotes = getNotesForWeek(week.start, week.end);
                    const hasNotes = weekNotes.length > 0;
                    const weekEvent = getEventForWeek(week.sunday);
                    const isFiltered = selectedFilter &&
                        selectedFilter.sunday.toDateString() === week.sunday.toDateString();

                    return (
                        <div
                            key={idx}
                            className={`monthly-calendar-week ${hasNotes ? 'has-note' : ''} ${isFiltered ? 'is-filtered' : ''}`}
                        >
                            <div
                                className="week-header clickable"
                                onClick={() => onWeekFilter && onWeekFilter(isFiltered ? null : week)}
                                title={isFiltered ? t('meetingNotes.showAll') : t('meetingNotes.filterWeek')}
                            >
                                <span className="week-number">{t('meetingNotes.week')} {week.num}</span>
                                <span className="week-dates">{week.label}</span>
                            </div>
                            <div className="week-content">
                                {/* Event display (read-only) */}
                                {weekEvent && weekEvent.event && (
                                    <div className="week-event-display">
                                        {weekEvent.event}
                                    </div>
                                )}
                                {/* Notes list (read-only) */}
                                {weekNotes.map(note => (
                                    <div key={note.id} className="week-note-link readonly">
                                        <FiCheck className="week-check" />
                                        <span>{note.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function MeetingNotesView() {
    const { t } = useLanguage();
    const [notes, setNotes] = useState([]);
    const [weekEvents, setWeekEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterWeek, setFilterWeek] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [notesRes, eventsRes] = await Promise.all([
                axios.get(`${API_URL}/meeting-notes`),
                axios.get(`${API_URL}/week-events`)
            ]);
            setNotes(notesRes.data);
            setWeekEvents(eventsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
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

            {/* Monthly Calendar (Read-only) */}
            <MonthlyCalendarReadOnly
                notes={notes}
                weekEvents={weekEvents}
                onWeekFilter={setFilterWeek}
                selectedFilter={filterWeek}
                t={t}
            />

            {notes.length === 0 ? (
                <div className="empty-state mt-xl">
                    <div className="empty-state-icon">📝</div>
                    <h3 className="empty-state-title">{t('meetingNotes.emptyTitle')}</h3>
                    <p>{t('meetingNotes.noNotesYet')}</p>
                </div>
            ) : (
                <div className="meeting-notes-list mt-xl">
                    <div className="flex justify-between items-center mb-lg mt-xl">
                        <h3 className="mt-lg">
                            {filterWeek
                                ? `${t('meetingNotes.week')} ${filterWeek.num} ${t('meetingNotes.notes')}`
                                : t('meetingNotes.allNotes')
                            }
                        </h3>
                        {filterWeek && (
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setFilterWeek(null)}
                            >
                                <FiX /> {t('meetingNotes.showAll')}
                            </button>
                        )}
                    </div>

                    {/* Search Input */}
                    <div className="search-input-container mb-lg">
                        <FiSearch className="search-icon" />
                        <input
                            type="text"
                            className="form-input search-input"
                            placeholder={t('meetingNotes.searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                className="btn btn-ghost btn-xs search-clear"
                                onClick={() => setSearchQuery('')}
                            >
                                <FiX />
                            </button>
                        )}
                    </div>

                    {notes
                        .filter(note => {
                            // Week filter
                            if (filterWeek) {
                                const noteDate = new Date(note.weekDate);
                                if (!(noteDate >= filterWeek.start && noteDate <= filterWeek.end)) return false;
                            }
                            // Text search filter
                            if (searchQuery.trim()) {
                                const query = searchQuery.toLowerCase();
                                const titleMatch = note.title.toLowerCase().includes(query);
                                const contentMatch = note.content.toLowerCase().includes(query);
                                return titleMatch || contentMatch;
                            }
                            return true;
                        })
                        .map(note => (
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
