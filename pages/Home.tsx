import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../src/firebase/config';
import { responsiveClamp } from '../src/utils/responsive';
import { getGoogleCalendarEvents } from '../src/firebase/services';
import { Event } from '../src/types';
import type { HomeContent } from '../src/types';
import { DEFAULT_HOME } from '../src/types';
import { sanitizeHtml, isHtmlString } from '../src/utils/sanitizeHtml';
import { repairMidWordBreaks, normalizeParagraphText } from '../src/utils/textWrapNormalize';

const CONFIG_PATH = 'config';
const HOME_DOC = 'home';

const CALENDAR_TZ = 'America/New_York';

/** Render title/paragraph: HTML (from rich editor) or plain text. */
function renderRichContent(content: string | undefined, fallback: string): React.ReactNode {
  const c = content ?? fallback;
  if (!c) return null;
  if (isHtmlString(c)) {
    return <span className="home-rich-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(repairMidWordBreaks(c)) }} />;
  }
  return normalizeParagraphText(c);
}

/** Event pill colors (Apple Calendar style) */
const EVENT_COLORS = [
  { bg: 'bg-blue-400', text: 'text-white' },
  { bg: 'bg-emerald-500', text: 'text-white' },
  { bg: 'bg-amber-500', text: 'text-white' },
  { bg: 'bg-violet-500', text: 'text-white' },
  { bg: 'bg-rose-500', text: 'text-white' },
  { bg: 'bg-cyan-500', text: 'text-white' },
];

/** Get event's calendar day as YYYY-MM-DD in New York (for matching to grid). */
function getEventDayInNY(event: Event & { dateTime?: string }): string | null {
  try {
    const raw = (event as Event & { dateTime?: string }).dateTime || event.date;
    if (!raw) return null;
    // All-day: "2026-03-05"; timed: "2026-03-05T20:00:00-05:00" or ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw.slice(0, 10);
    const d = new Date(raw);
    return d.toLocaleDateString('en-CA', { timeZone: CALENDAR_TZ });
  } catch {
    return null;
  }
}

const Home: React.FC = () => {
  const [homeContent, setHomeContent] = useState<HomeContent>({ ...DEFAULT_HOME });
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextMeeting, setNextMeeting] = useState<Event | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, CONFIG_PATH, HOME_DOC),
      (snap) => {
        if (snap.exists()) {
          setHomeContent({ ...DEFAULT_HOME, ...(snap.data() as HomeContent) });
        }
      },
      () => {}
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        const googleEvents = await getGoogleCalendarEvents();
        setEvents(googleEvents);
        
        // Find next meeting (first upcoming or this_week event)
        const upcoming = googleEvents
          .filter(e => e.type === 'upcoming' || 'this_week')
          .sort((a, b) => {
            const dateA = (a as Event & { dateTime?: string }).dateTime || a.date;
            const dateB = (b as Event & { dateTime?: string }).dateTime || b.date;
            return new Date(dateA).getTime() - new Date(dateB).getTime();
          });
        
        if (upcoming.length > 0) {
          setNextMeeting(upcoming[0]);
        }
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  // Get current month and year (calendar month)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Get first day of month and number of days
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  /** Events that fall on (currentYear, currentMonth, day) in New York. */
  const getEventsForDate = (day: number): (Event & { dateTime?: string })[] => {
    const targetStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(event => getEventDayInNY(event as Event & { dateTime?: string }) === targetStr) as (Event & { dateTime?: string })[];
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  // Get next meeting date info
  const getNextMeetingInfo = () => {
    if (nextMeeting) {
      try {
        // Use dateTime if available (from Google Calendar API), otherwise parse date string
        const dateStr = (nextMeeting as any).dateTime || nextMeeting.date;
        const meetingDate = new Date(dateStr);
        return {
          day: meetingDate.getDate(),
          dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][meetingDate.getDay()],
          month: ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'][meetingDate.getMonth()],
          year: meetingDate.getFullYear()
        };
      } catch {
        return null;
      }
    }
    return null;
  };

  const meetingInfo = getNextMeetingInfo();

  return (
    <div className="flex flex-col min-h-screen min-w-0 w-full overflow-x-hidden">
      {/* Hero Section with Background Image - overflow-y visible so WE ARE / @ PENN STATE don't get clipped when narrow */}
      <div
        className="min-w-0 w-full overflow-x-hidden"
        style={{
          minHeight: "clamp(400px, 54.03vw, 1000px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: "clamp(24px, 4vw, 60px)",
          paddingLeft: "clamp(16px, 5.23vw, 80px)",
          paddingRight: "clamp(16px, 5.23vw, 80px)",
          paddingBottom: "clamp(80px, 8vw, 200px)",
          position: "relative",
        }}
      >
        <div
          className="min-w-0 w-full max-w-full flex flex-col justify-center items-center text-center"
          style={{
            margin: "auto",
          }}
        >
          <h2
            className="break-words"
            style={{
              fontSize: responsiveClamp(48, 24, 72),
              fontWeight: "bold",
              marginBottom: responsiveClamp(24, 12, 36),
              color: "#ffffff",
              maxWidth: "100%",
              overflowWrap: "break-word",
              wordBreak: "break-word",
            }}
          >
            {renderRichContent(homeContent.heroLine1 ?? DEFAULT_HOME.heroLine1, 'WE ARE')}
          </h2>
          <h1
            className="break-words"
            style={{
              fontSize: responsiveClamp(64, 32, 96),
              fontWeight: "bold",
              marginBottom: responsiveClamp(24, 12, 36),
              color: "#ffffff",
              maxWidth: "100%",
              overflowWrap: "break-word",
              wordBreak: "break-word",
            }}
          >
            {renderRichContent(homeContent.heroLine2 ?? DEFAULT_HOME.heroLine2, 'THE AMERICAN SOCIETY OF MECHANICAL ENGINEERS')}
          </h1>
          <p
            className="break-words"
            style={{
              fontSize: responsiveClamp(36, 18, 54),
              fontWeight: "bold",
              color: "#ffffff",
              maxWidth: "100%",
              overflowWrap: "break-word",
              wordBreak: "break-word",
            }}
          >
            {renderRichContent(homeContent.heroLine3 ?? DEFAULT_HOME.heroLine3, '@ PENN STATE')}
          </p>
        </div>
      </div>

      {/* Next Meeting Section (Calendar Visual) */}
      <div 
        className="relative z-20 container mx-auto px-4 mb-24 min-w-0 w-full max-w-full overflow-hidden"
        style={{
          marginTop: "clamp(-90px, -10vw, -96px)",
        }}
      >
        <div className="flex flex-col items-center">
            <h3 className="text-3xl font-jost font-bold mb-6 text-white text-center break-words">{renderRichContent(homeContent.nextMeetingTitle ?? DEFAULT_HOME.nextMeetingTitle, 'Next Meeting')}</h3>
            
            {/* Simple Mock Calendar Card */}
            <div className="bg-white rounded-2xl p-4 shadow-2xl w-full md:w-3/4 max-w-4xl overflow-hidden">
                <div className="flex justify-between items-center mb-6 px-4">
                    <div className="flex gap-4 items-center">
                        {loading ? (
                            <span className="text-4xl font-light text-gray-800">...</span>
                        ) : meetingInfo ? (
                            <>
                                <span className="text-4xl font-light text-gray-800">{meetingInfo.day}</span>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-500 uppercase">{meetingInfo.dayName}</span>
                                    <span className="text-xl font-bold text-black">{meetingInfo.month} {meetingInfo.year}</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <span className="text-4xl font-light text-gray-800">{now.getDate()}</span>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-500 uppercase">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()]}
                                    </span>
                                    <span className="text-xl font-bold text-black">
                                        {['January', 'February', 'March', 'April', 'May', 'June', 
                                          'July', 'August', 'September', 'October', 'November', 'December'][currentMonth]} {currentYear}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                {/* Visual Grid for Calendar */}
                <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                    {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
                        <div key={d} className="bg-white py-2 text-center text-xs font-semibold text-gray-500">{d}</div>
                    ))}
                    {/* Empty cells for days before month starts */}
                    {Array.from({length: firstDay}).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-white h-24"></div>
                    ))}
                    {/* Calendar Days */}
                    {Array.from({length: daysInMonth}).map((_, i) => {
                        const day = i + 1;
                        const dayEvents = getEventsForDate(day);
                        const hasEvent = dayEvents.length > 0;
                        
                        // Check if this day is today (in NY for consistency)
                        const todayStr = now.toLocaleDateString('en-CA', { timeZone: CALENDAR_TZ });
                        const cellStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isToday = cellStr === todayStr;
                        
                        // Check if this day is the next meeting
                        const nextMeetingDay = nextMeeting ? getEventDayInNY(nextMeeting as Event & { dateTime?: string }) : null;
                        const isNextMeeting = Boolean(nextMeeting && nextMeetingDay === cellStr);
                        
                        return (
                            <div key={i} className={`bg-white h-24 p-1 relative flex flex-col ${isNextMeeting ? 'bg-blue-50' : ''}`}>
                                <span className={`text-sm shrink-0 ${
                                    isNextMeeting 
                                        ? 'bg-blue-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center font-bold' 
                                        : isToday 
                                            ? 'bg-red-500 text-white w-6 h-6 rounded-full inline-flex items-center justify-center font-bold' 
                                            : 'text-gray-700'
                                }`}>
                                    {day}
                                </span>
                                {/* Stacked event pills (Apple Calendar style) - click navigates to Events */}
                                <div className="mt-0.5 flex flex-col gap-0.5 overflow-hidden flex-1 min-h-0">
                                    {dayEvents.slice(0, 3).map((ev, j) => {
                                        const color = EVENT_COLORS[j % EVENT_COLORS.length];
                                        return (
                                            <a
                                                key={ev.id}
                                                href="#/events"
                                                className={`${color.bg} ${color.text} text-[10px] font-medium rounded px-1 py-0.5 truncate leading-tight shrink-0 block hover:opacity-90 cursor-pointer`}
                                                title={ev.title}
                                            >
                                                {ev.title}
                                            </a>
                                        );
                                    })}
                                    {dayEvents.length > 3 && (
                                        <a href="#/events" className="text-[10px] text-gray-500 shrink-0 hover:underline cursor-pointer">+{dayEvents.length - 3}</a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                
            </div>
        </div>
      </div>

      {/* What we do Section */}
      <div className="container mx-auto px-4 sm:px-8 md:px-20 mb-24 min-w-0 max-w-full overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 items-center min-w-0">
            <div className="space-y-6 min-w-0">
                <div className="flex items-center bg-gray-200/90 rounded-r-full p-4 w-full md:w-3/4 min-w-0">
                    <div className="w-10 h-10 shrink-0 rounded-full border-2 border-asme-dark flex items-center justify-center font-bold text-asme-dark mr-4">1</div>
                    <span className="font-jost font-bold text-asme-dark tracking-widest text-lg truncate">PROJECTS</span>
                </div>
                <div className="flex items-center bg-gray-200/90 rounded-r-full p-4 w-full md:w-3/4 min-w-0">
                    <div className="w-10 h-10 shrink-0 rounded-full border-2 border-asme-dark flex items-center justify-center font-bold text-asme-dark mr-4">2</div>
                    <span className="font-jost font-bold text-asme-dark tracking-widest text-lg truncate">WORKSHOPS</span>
                </div>
                <div className="flex items-center bg-gray-200/90 rounded-r-full p-4 w-full md:w-3/4 min-w-0">
                    <div className="w-10 h-10 shrink-0 rounded-full border-2 border-asme-dark flex items-center justify-center font-bold text-asme-dark mr-4">3</div>
                    <span className="font-jost font-bold text-asme-dark tracking-widest text-lg truncate">SOCIALS</span>
                </div>
            </div>
            
            <div className="font-jost text-gray-300 space-y-6 min-w-0 max-w-full overflow-hidden break-normal whitespace-normal">
                <h2 className="text-3xl font-bold text-white break-normal whitespace-normal">{renderRichContent(homeContent.whatWeDoTitle ?? DEFAULT_HOME.whatWeDoTitle, 'What we do')}</h2>
                <div className="home-rich-content break-normal whitespace-normal leading-relaxed">
                  {isHtmlString(homeContent.whatWeDoParagraph1 ?? '') ? (
                    <div className="break-normal whitespace-normal max-w-full w-full" dangerouslySetInnerHTML={{ __html: sanitizeHtml(repairMidWordBreaks(homeContent.whatWeDoParagraph1 ?? '')) }} />
                  ) : (
                    <p className="break-normal whitespace-normal">{normalizeParagraphText(homeContent.whatWeDoParagraph1 ?? DEFAULT_HOME.whatWeDoParagraph1 ?? 'The Penn State Chapter of ASME provides members with opportunities for professional development, hands-on design experience, and outreach within and beyond Penn State. If you are interested in growing professionally, getting in contact with employers, or working on cool projects, you are in the right spot!')}</p>
                  )}
                </div>
                <div className="home-rich-content break-normal whitespace-normal leading-relaxed">
                  {isHtmlString(homeContent.whatWeDoParagraph2 ?? '') ? (
                    <div className="break-normal whitespace-normal max-w-full w-full" dangerouslySetInnerHTML={{ __html: sanitizeHtml(repairMidWordBreaks(homeContent.whatWeDoParagraph2 ?? '')) }} />
                  ) : (
                    <p className="break-normal whitespace-normal">{normalizeParagraphText(homeContent.whatWeDoParagraph2 ?? DEFAULT_HOME.whatWeDoParagraph2 ?? 'Everyone is welcome (not just Mechanical engineers), and there are no membership requirements or dues. Just show up!')}</p>
                  )}
                </div>
                {(homeContent.whatWeDoButtonText ?? DEFAULT_HOME.whatWeDoButtonText) && (
                  (homeContent.whatWeDoButtonUrl ?? DEFAULT_HOME.whatWeDoButtonUrl) ? (
                    <a href={homeContent.whatWeDoButtonUrl ?? DEFAULT_HOME.whatWeDoButtonUrl ?? '#'} target="_blank" rel="noopener noreferrer" className="inline-block bg-[#212C47] hover:bg-[#111828] text-white font-bold py-2 px-6 rounded shadow transition break-words">
                      {homeContent.whatWeDoButtonText ?? DEFAULT_HOME.whatWeDoButtonText}
                    </a>
                  ) : (
                    <span className="inline-block bg-[#212C47] text-white font-bold py-2 px-6 rounded shadow break-words">
                      {homeContent.whatWeDoButtonText ?? DEFAULT_HOME.whatWeDoButtonText}
                    </span>
                  )
                )}
            </div>
        </div>
      </div>

    </div>
  );
};

export default Home;
