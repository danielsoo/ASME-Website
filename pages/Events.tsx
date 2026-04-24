import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { getGoogleCalendarEvents } from '../src/firebase/services';
import { Event } from '../src/types';
import EmbedSocialHashtag from '@/src/components/EmbedSocial';
import { sanitizeHtml, isHtmlString } from '../src/utils/sanitizeHtml';

type EventWithDateTime = Event & { dateTime?: string };

function escapeIcsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function renderEventContent(content: string | undefined, fallback: string): React.ReactNode {
  const c = content ?? fallback;
  if (!c) return null;
  if (isHtmlString(c)) return <span className="event-rich-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(c) }} />;
  return c;
}

function eventsToIcs(events: EventWithDateTime[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ASME PSU//Events//EN',
    'CALSCALE:GREGORIAN',
  ];
  events.forEach((ev) => {
    const raw = ev.dateTime || ev.date;
    const isAllDay = /^\d{4}-\d{2}-\d{2}$/.test(raw);
    const start = new Date(raw);
    if (isNaN(start.getTime())) return;
    const uid = `asme-${ev.id.replace(/[^a-zA-Z0-9]/g, '')}@asmepsu`;
    const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    const summary = escapeIcsText((ev.title || 'Event').replace(/<[^>]*>/g, '').trim() || 'Event');
    const description = escapeIcsText((ev.description || '').replace(/<[^>]*>/g, '').trim());

    let dtStart: string;
    let dtEnd: string;
    if (isAllDay) {
      const d = raw.slice(0, 10).replace(/-/g, '');
      dtStart = `DTSTART;VALUE=DATE:${d}`;
      const endDate = new Date(start);
      endDate.setDate(endDate.getDate() + 1);
      const endStr = endDate.toISOString().slice(0, 10).replace(/-/g, '');
      dtEnd = `DTEND;VALUE=DATE:${endStr}`;
    } else {
      dtStart = `DTSTART:${start.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      dtEnd = `DTEND:${end.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
    }

    lines.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${stamp}`, dtStart, dtEnd, `SUMMARY:${summary}`);
    if (description) lines.push(`DESCRIPTION:${description}`);
    if (ev.location) lines.push(`LOCATION:${escapeIcsText(ev.location)}`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function downloadIcs(events: EventWithDateTime[], filename: string) {
  const ics = eventsToIcs(events);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const Events: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Same calendar(s) as event list: from env so iframe and list stay in sync.
  // Set VITE_GOOGLE_CALENDAR_IDS=id1,id2 (e.g. Leadership, General Body) so both are fetched via API and shown in iframe.
  const calendarIds = (import.meta.env.VITE_GOOGLE_CALENDAR_IDS || import.meta.env.VITE_GOOGLE_CALENDAR_ID || '')
    .toString()
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
  const firstCalendarId = calendarIds[0] || 'k1n8agb7ecfitks2jflr6qrfjs@group.calendar.google.com';
  const embedSrc =
    calendarIds.length > 1
      ? `https://calendar.google.com/calendar/embed?${calendarIds.map((id) => `src=${encodeURIComponent(id)}`).join('&')}&ctz=America%2FNew_York`
      : `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(firstCalendarId)}&ctz=America%2FNew_York`;
  const openInCalendarUrl = `https://calendar.google.com/calendar/u/0?cid=${encodeURIComponent(firstCalendarId)}`;

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        const googleEvents = await getGoogleCalendarEvents();
        setEvents(googleEvents);
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  const upcomingEvents = events.filter(e => e.type === 'upcoming');
  const pastEvents = events.filter(e => e.type === 'past');
  const thisWeekEvents = events.filter(e => e.type === 'this_week');
  const [expandedPastEventId, setExpandedPastEventId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#0f131a] text-[#1E2B48] font-jost pb-20 relative">
      
      {/* Calendar Section */}
      <div className="bg-white py-20 px-4">
        <div className="container mx-auto max-w-4xl relative">
            <h2 className="text-3xl font-bold mb-8">Calendar</h2>
            
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Google Calendar Embed */}
                <div className="bg-white rounded-xl p-6 text-black flex-grow shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg">ASME Events Calendar</h3>
                        <a 
                          href={openInCalendarUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700 font-bold text-sm underline"
                        >
                          Open in Google Calendar
                        </a>
                    </div>
                    
                    <div className="relative w-full" style={{ paddingBottom: '75%', height: 0, overflow: 'hidden' }}>
                        <iframe
                          src={embedSrc}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            border: 0
                          }}
                          width="800"
                          height="600"
                          frameBorder="0"
                          scrolling="no"
                          title="ASME Events Calendar"
                        ></iframe>
                    </div>
                    <div className="flex justify-end mt-3">
                        <button
                          type="button"
                          onClick={() => downloadIcs(events as EventWithDateTime[], 'ASME-Events.ics')}
                          disabled={loading || events.length === 0}
                          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Download size={16} />
                          Copy to my calendar
                        </button>
                    </div>
                </div>

                {/* This Week Sidebar */}
                <div className="w-full lg:w-1/3 flex flex-col gap-4">
                    <h3 className="text-2xl font-bold">This Week</h3>
                    {loading ? (
                        <div className="text-gray-500">Loading events...</div>
                    ) : thisWeekEvents.length > 0 ? (
                        thisWeekEvents.map(event => (
                            <div key={event.id} className="bg-[#3b4c6b] rounded-xl p-4 shadow-lg border border-gray-600">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-blue-200 font-bold text-sm">{event.date}</span>
                                </div>
                                <h4 className="font-bold text-lg mb-1 text-white">{renderEventContent(event.title, '')}</h4>
                                <p className="text-xs text-gray-300 line-clamp-2">{renderEventContent(event.description, '')}</p>
                                {event.location && (
                                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                                        <MapPin size={12} />
                                        <span>{event.location}</span>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-gray-500">No events this week.</div>
                    )}

                    <h3 className="text-2xl font-bold mt-6">Past Events</h3>
                    {loading ? (
                        <div className="text-gray-500 text-sm">Loading...</div>
                    ) : pastEvents.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            {pastEvents.slice(0, 5).map(event => (
                                <div key={event.id} className="bg-[#3b4c6b] rounded-lg p-3 border border-gray-600">
                                    <span className="text-blue-200 text-xs font-medium">{event.date}</span>
                                    <h4 className="font-bold text-sm text-white truncate" title={(event.title || '').replace(/<[^>]*>/g, '')}>{renderEventContent(event.title, '')}</h4>
                                </div>
                            ))}
                            {pastEvents.length > 5 && (
                                <p className="text-gray-400 text-xs">+ {pastEvents.length - 5} more below</p>
                            )}
                        </div>
                    ) : (
                        <div className="text-gray-500 text-sm">No past events.</div>
                    )}
                </div>
            </div>
        </div>
        
      </div>

      {/* Coming Up Section (Instagram) */}
      <div className="bg-[#e5e7eb] py-20 px-4">
        <div className="container mx-auto max-w-4xl relative">
            <h2 className="text-3xl font-bold mb-8">Coming Up</h2>
            <div className="mt-8 min-h-[200px]" aria-hidden="true">
              <EmbedSocialHashtag />
            </div>
        </div>
      </div>

      {/* Past Events Section */}
      <div className="bg-white py-20 px-4">
        <div className="container mx-auto max-w-4xl relative">
            <h2 className="text-3xl font-bold mb-8">Past Events</h2>
            {loading ? (
                <div className="text-center text-gray-500 py-8">Loading events...</div>
            ) : pastEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pastEvents.map(event => {
                        const isExpanded = expandedPastEventId === event.id;
                        return (
                            <div key={event.id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-row gap-4 shadow-sm hover:shadow-md transition-shadow min-w-0">
                                <div className="bg-slate-100 rounded-lg w-20 h-20 flex-shrink-0 flex items-center justify-center">
                                    <Calendar className="text-slate-500 w-8 h-8" />
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col">
                                    <div className="flex items-start gap-2 mb-2">
                                        <div className="w-8 h-8 bg-slate-100 rounded flex-shrink-0 flex items-center justify-center">
                                            <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                                        </div>
                                        <h3 className={`font-bold text-lg text-slate-900 ${isExpanded ? 'break-words' : 'line-clamp-1'}`}>{renderEventContent(event.title, '')}</h3>
                                    </div>
                                    {isExpanded ? (
                                        <>
                                            <div className="text-sm text-slate-600 mb-2 break-words event-rich-content">{renderEventContent(event.description, '')}</div>
                                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                                <div className="w-8 h-8 bg-slate-100 rounded flex-shrink-0 flex items-center justify-center">
                                                    <Clock className="w-4 h-4 text-slate-600" />
                                                </div>
                                                <span className="font-semibold text-sm text-slate-800">{event.date}</span>
                                                {event.location && (
                                                    <>
                                                        <div className="w-8 h-8 bg-slate-100 rounded flex-shrink-0 flex items-center justify-center">
                                                            <MapPin className="w-4 h-4 text-slate-600" />
                                                        </div>
                                                        <span className="font-semibold text-sm text-slate-700 break-words">{event.location}</span>
                                                    </>
                                                )}
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => setExpandedPastEventId(null)}
                                              className="mt-4 inline-flex items-center gap-1 text-slate-600 hover:text-slate-800 text-sm font-medium"
                                            >
                                              <ChevronUp size={16} />
                                              Close
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="text-sm text-slate-600 mb-2 line-clamp-2 event-rich-content">{renderEventContent(event.description, '')}</div>
                                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                                <Clock className="w-4 h-4 text-slate-600 flex-shrink-0" />
                                                <span className="font-semibold text-sm text-slate-800">{event.date}</span>
                                                {event.location && (
                                                    <>
                                                        <div className="w-8 h-8 bg-slate-100 rounded flex-shrink-0 flex items-center justify-center ml-2">
                                                            <MapPin className="w-4 h-4 text-slate-600" />
                                                        </div>
                                                        <span className="font-semibold text-sm text-slate-700 break-words">{event.location}</span>
                                                    </>
                                                )}
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => setExpandedPastEventId(event.id)}
                                              className="mt-3 inline-flex items-center gap-1 text-slate-600 hover:text-slate-800 text-sm font-medium"
                                            >
                                              View details
                                              <ChevronDown size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center text-gray-500 py-8">No past events.</div>
            )}
        </div>
        
      </div>

    </div>
  );
};

export default Events;
