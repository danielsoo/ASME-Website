import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { getGoogleCalendarEvents } from '../firebase/services';
import { Event } from '../types';

const Events: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div 
      className="min-h-screen bg-white text-[#1E2B48] font-jost pb-20 relative"
      style={{
        minHeight: 'calc(100vh + 140px)',
        marginTop: '-140px',
        paddingTop: '140px',
      }}
    >
      
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
                          href="https://calendar.google.com/calendar/u/2?cid=ODJlM2NhNzNlYjEzZGZhNDk1Y2YxOGQyMjNhYWYxNDE0MjBkYzg3ZWE4NjcwMDRjOWI4MGY5NzhkMzNiNjBhYUBncm91cC5jYWxlbmRhci5nb29nbGUuY29t"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700 font-bold text-sm underline"
                        >
                          Open in Google Calendar
                        </a>
                    </div>
                    
                    <div className="relative w-full" style={{ paddingBottom: '75%', height: 0, overflow: 'hidden' }}>
                        <iframe
                          src="https://calendar.google.com/calendar/embed?src=ODJlM2NhNzNlYjEzZGZhNDk1Y2YxOGQyMjNhYWYxNDE0MjBkYzg3ZWE4NjcwMDRjOWI4MGY5NzhkMzNiNjBhYUBncm91cC5jYWxlbmRhci5nb29nbGUuY29t&ctz=America%2FNew_York"
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
                                <h4 className="font-bold text-lg mb-1 text-white">{event.title}</h4>
                                <p className="text-xs text-gray-300 line-clamp-2">{event.description}</p>
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
                
                    {/* Mini Calendar Widgets Mockup */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="bg-[#3b4c6b] h-32 rounded-xl opacity-50"></div>
                        <div className="bg-[#3b4c6b] h-32 rounded-xl opacity-50"></div>
                    </div>
                </div>
            </div>
        </div>
        
      </div>

      {/* Coming Up Section */}
      <div className="bg-[#e5e7eb] py-20 px-4">
        <div className="container mx-auto max-w-4xl relative">
            <h2 className="text-3xl font-bold mb-8">Coming Up</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* This section is for Instagram posts - placeholder cards */}
                <div className="bg-white rounded-lg p-4 text-black shadow-lg">
                    <div className="aspect-square bg-gray-200 rounded-lg mb-4 overflow-hidden">
                        <img src="https://picsum.photos/300/300" alt="Instagram post" className="w-full h-full object-cover" />
                    </div>
                    <p className="text-sm mb-3 line-clamp-2">{/* Instagram post description */}</p>
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-asme-red"></div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold">Instagram Handle</span>
                            <span className="text-[10px] text-gray-500">@instagram_handle</span>
                        </div>
                    </div>
                </div>
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
                    {pastEvents.map(event => (
                        <div key={event.id} className="bg-asme-red rounded-xl p-6 flex flex-row gap-6 shadow-md items-center">
                            <div className="bg-white/20 rounded-lg w-24 h-24 flex-shrink-0 flex items-center justify-center">
                                <Calendar className="text-white w-10 h-10 opacity-70" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                                        <div className="w-2 h-2 bg-asme-red rounded-full"></div>
                                    </div>
                                    <h3 className="font-bold text-lg text-white">{event.title}</h3>
                                </div>
                                <p className="text-xs text-white/80 mb-2 line-clamp-2">{event.description}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                                        <Clock className="w-4 h-4 text-asme-red" />
                                    </div>
                                    <span className="font-semibold text-sm text-white">{event.date}</span>
                                    {event.location && (
                                        <>
                                            <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                                                <MapPin className="w-4 h-4 text-asme-red" />
                                            </div>
                                            <span className="font-semibold text-sm text-white/90 truncate max-w-[150px]">{event.location}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
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
