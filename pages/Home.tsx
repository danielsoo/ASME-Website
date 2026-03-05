import React, { useState, useEffect } from 'react';
import { responsiveClamp, responsiveClampCustom } from '../src/utils/responsive';
import { getGoogleCalendarEvents } from '../src/firebase/services';
import { Event } from '../src/types';

const Home: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextMeeting, setNextMeeting] = useState<Event | null>(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        const googleEvents = await getGoogleCalendarEvents();
        setEvents(googleEvents);
        
        // Find next meeting (first upcoming event)
        const upcoming = googleEvents
          .filter(e => e.type === 'upcoming')
          .sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA.getTime() - dateB.getTime();
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

  // Get current month and year
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Get first day of month and number of days
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  // Get events for current month
  const getEventsForDate = (day: number): (Event & { dateTime?: string })[] => {
    return events.filter(event => {
      try {
        // Use dateTime if available (from Google Calendar API), otherwise parse date string
        const dateStr = (event as any).dateTime || event.date;
        const eventDate = new Date(dateStr);
        return eventDate.getDate() === day && 
               eventDate.getMonth() === currentMonth && 
               eventDate.getFullYear() === currentYear;
      } catch {
        return false;
      }
    }) as (Event & { dateTime?: string })[];
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
    <div className="flex flex-col min-h-screen">
      {/* Hero Section with Background Image */}
      <div
        style={{
          height: "54.03vw",
          minHeight: "clamp(400px, 54.03vw, 1000px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: "0vw",
          paddingLeft: "clamp(16px, 5.23vw, 80px)",
          paddingRight: "clamp(16px, 5.23vw, 80px)",
          paddingBottom: "clamp(120px, 8vw, 200px)",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            aspectRatio: "1512 / 568",
            textAlign: "center",
            margin: "auto",
          }}
        >
          <h2
            style={{
              fontSize: responsiveClamp(48, 24, 72),
              fontWeight: "bold",
              marginBottom: responsiveClamp(24, 12, 36),
              color: "#ffffff",
            }}
          >
            WE ARE
          </h2>
          <h1
            style={{
              fontSize: responsiveClamp(64, 32, 96),
              fontWeight: "bold",
              marginBottom: responsiveClamp(24, 12, 36),
              color: "#ffffff",
            }}
          >
            THE AMERICAN SOCIETY OF MECHANICAL ENGINEERS
          </h1>
          <p
            style={{
              fontSize: responsiveClamp(36, 18, 54),
              fontWeight: "bold",
              color: "#ffffff",
            }}
          >
            @ PENN STATE
          </p>
        </div>
      </div>

      {/* Next Meeting Section (Calendar Visual) - Keep your version */}
      <div 
        className="relative z-20 container mx-auto px-4 mb-24"
        style={{
          marginTop: "clamp(-90px, -10vw, -96px)",
        }}
      >
        <div className="flex flex-col items-center">
            <h3 className="text-3xl font-jost font-bold mb-6 text-white text-center">Next Meeting</h3>
            
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
                        
                        // Check if this day is today
                        const isToday = day === now.getDate() && 
                                       currentMonth === now.getMonth() && 
                                       currentYear === now.getFullYear();
                        
                        // Check if this day is the next meeting
                        let isNextMeeting = false;
                        if (meetingInfo && nextMeeting) {
                          try {
                            const dateStr = (nextMeeting as any).dateTime || nextMeeting.date;
                            const meetingDate = new Date(dateStr);
                            isNextMeeting = day === meetingDate.getDate() && 
                                          currentMonth === meetingDate.getMonth() && 
                                          currentYear === meetingDate.getFullYear();
                          } catch {
                            isNextMeeting = false;
                          }
                        }
                        
                        return (
                            <div key={i} className={`bg-white h-24 p-1 relative ${isNextMeeting ? 'bg-blue-50' : ''}`}>
                                <span className={`text-sm ${
                                    isNextMeeting 
                                        ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold' 
                                        : isToday 
                                            ? 'bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold' 
                                            : 'text-gray-700'
                                }`}>
                                    {day}
                                </span>
                                {isNextMeeting && (
                                    <div className="absolute top-1/2 left-2 right-2 h-1 bg-red-500 rounded-full"></div>
                                )}
                                {hasEvent && !isNextMeeting && !isToday && (
                                    <div className="absolute bottom-1 left-1 right-1">
                                        <div className="w-full h-1 bg-blue-400 rounded-full"></div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                
            </div>
        </div>
      </div>

      {/* What we do Section */}
      <div className="container mx-auto px-4 mb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 items-center">
            <div className="space-y-6">
                <div className="flex items-center bg-gray-200/90 rounded-r-full p-4 w-full md:w-3/4">
                    <div className="w-10 h-10 rounded-full border-2 border-asme-dark flex items-center justify-center font-bold text-asme-dark mr-4">1</div>
                    <span className="font-jost font-bold text-asme-dark tracking-widest text-lg">PROJECTS</span>
                </div>
                <div className="flex items-center bg-gray-200/90 rounded-r-full p-4 w-full md:w-3/4">
                    <div className="w-10 h-10 rounded-full border-2 border-asme-dark flex items-center justify-center font-bold text-asme-dark mr-4">2</div>
                    <span className="font-jost font-bold text-asme-dark tracking-widest text-lg">WORKSHOPS</span>
                </div>
                <div className="flex items-center bg-gray-200/90 rounded-r-full p-4 w-full md:w-3/4">
                    <div className="w-10 h-10 rounded-full border-2 border-asme-dark flex items-center justify-center font-bold text-asme-dark mr-4">3</div>
                    <span className="font-jost font-bold text-asme-dark tracking-widest text-lg">SOCIALS</span>
                </div>
            </div>
            
            <div className="font-jost text-gray-300 space-y-6">
                <h2 className="text-3xl font-bold text-white">What we do</h2>
                <p>
                    The Penn State Chapter of ASME provides members with opportunities for professional development, hands-on design experience, and outreach within and beyond Penn State. If you are interested in growing professionally, getting in contact with employers, or working on cool projects, you are in the right spot!
                </p>
                <p>
                    Everyone is welcome (not just Mechanical engineers), and there are no membership requirements or dues. Just show up!
                </p>
                <button className="bg-[#212C47] hover:bg-[#111828] text-white font-bold py-2 px-6 rounded shadow transition">
                    Join our GroupMe
                </button>
            </div>
        </div>
      </div>

      {/* Embedded Linktree Placeholder
      <div className="container mx-auto px-4 mb-24">
          <div className="w-full h-64 bg-asme-red flex items-center justify-center rounded-lg shadow-inner">
              <span className="text-white font-jost font-bold text-xl tracking-widest uppercase">Embedded Linktree</span>
          </div>
      </div>*/}

    </div>
  );
};

export default Home;
