import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { getGoogleCalendarEvents, getInstagramPosts } from '../firebase/services';
import { Event, InstagramPost } from '../types';

const Events: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [instagramPosts, setInstagramPosts] = useState<InstagramPost[]>([]);
  const [instagramLoading, setInstagramLoading] = useState(true);

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

    const loadInstagramPosts = async () => {
      try {
        setInstagramLoading(true);
        const posts = await getInstagramPosts(6);
        setInstagramPosts(posts);
      } catch (error) {
        console.error('Error loading Instagram posts:', error);
      } finally {
        setInstagramLoading(false);
      }
    };

    loadEvents();
    loadInstagramPosts();
  }, []);

  const upcomingEvents = events.filter(e => e.type === 'upcoming');
  const pastEvents = events.filter(e => e.type === 'past');
  const thisWeekEvents = events.filter(e => e.type === 'this_week');

  return (
<<<<<<< HEAD
    <div className="min-h-screen bg-[#0f131a] text-[#1E2B48] font-jost pb-20 relative">
=======
    <div 
      className="min-h-screen bg-white text-[#1E2B48] font-jost pb-20 relative"
      style={{
        minHeight: 'calc(100vh + 140px)',
        marginTop: '-140px',
        paddingTop: '140px',
      }}
    >
>>>>>>> b94d497e4c3091d5202899d1ccfdb3637d292578
      
      {/* Calendar Section */}
      <div className="bg-white py-20 px-4">
        <div className="container mx-auto max-w-4xl relative">
            <h2 className="text-3xl font-bold mb-8">Calendar</h2>
            
            <div className="flex flex-col lg:flex-row gap-8">
<<<<<<< HEAD
                {/* Big Calendar Visual */}
                <div className="bg-white rounded-xl p-6 text-black flex-grow shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex space-x-2">
                            <button className="px-3 py-1 border rounded hover:bg-gray-100">Today</button>
                            <div className="flex space-x-1">
                                <button className="p-1 hover:bg-gray-100 rounded">&lt;</button>
                                <button className="p-1 hover:bg-gray-100 rounded">&gt;</button>
                            </div>
                            <span className="font-bold text-lg ml-2">October 2025</span>
                        </div>
                        <div className="flex space-x-2 text-gray-500">
                            <button className="border rounded px-2 py-1 flex items-center gap-1">Month <span className="text-xs">▼</span></button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-7 border-t border-l border-gray-200">
                        {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(day => (
                            <div key={day} className="p-2 border-b border-r border-gray-200 text-center text-xs font-semibold text-gray-500">
                                {day}
                            </div>
                        ))}
                        {/* Calendar Days Grid */}
                        {Array.from({length: 35}).map((_, i) => (
                            <div key={i} className="h-24 p-1 border-b border-r border-gray-200 relative group hover:bg-gray-50 transition">
                                <span className={`text-sm ${i === 16 ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : 'text-gray-700'}`}>
                                    {i > 3 ? i - 3 : ''}
                                </span>
                                {/* Mock Event Dot */}
                                {i === 16 && (
                                    <div className="mt-1 w-full bg-blue-100 text-blue-800 text-[10px] px-1 rounded truncate">
                                        General Body...
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex justify-between text-xs text-gray-500">
                        <span>ASME General Body</span>
                        <span className="text-blue-500 font-bold">Google Calendar</span>
                    </div>
                </div>

                {/* This Week Sidebar */}
                <div className="w-full lg:w-1/3 flex flex-col gap-4">
                    <h3 className="text-2xl font-bold">This Week</h3>
                    {thisWeekEvents.length > 0 ? (
                        thisWeekEvents.map(event => (
                            <div key={event.id} className="bg-[#3b4c6b] rounded-xl p-4 shadow-lg border border-gray-600">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-blue-200 font-bold text-sm">{event.date}</span>
                                </div>
                                <h4 className="font-bold text-lg mb-1 text-white">{event.title}</h4>
                                <p className="text-xs text-gray-300">{event.description}</p>
                            </div>
=======
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
>>>>>>> b94d497e4c3091d5202899d1ccfdb3637d292578
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
<<<<<<< HEAD
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {upcomingEvents.map(event => (
                    <div key={event.id} className="bg-white rounded-lg p-4 text-black shadow-lg">
                        <div className="aspect-square bg-gray-200 rounded-lg mb-4 overflow-hidden">
                            <img src={event.imageUrl || "https://picsum.photos/300/300"} alt={event.title} className="w-full h-full object-cover" />
                        </div>
                        <p className="text-sm mb-3 line-clamp-2">{event.description}</p>
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-asme-red"></div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold">Instagram Handle</span>
                                <span className="text-[10px] text-gray-500">@instagram_handle</span>
                            </div>
                        </div>
                    </div>
                ))};
            </div>
=======
            {instagramLoading ? (
                <div className="text-center text-gray-500 py-8">Loading Instagram posts...</div>
            ) : instagramPosts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {instagramPosts.map((post) => (
                        <a
                            key={post.id}
                            href={post.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white rounded-lg p-4 text-black shadow-lg hover:shadow-xl transition-shadow"
                        >
                            <div className="aspect-square bg-gray-200 rounded-lg mb-4 overflow-hidden">
                                <img 
                                    src={post.thumbnailUrl || post.mediaUrl} 
                                    alt={post.caption || 'Instagram post'} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        // Fallback to placeholder if image fails to load
                                        (e.target as HTMLImageElement).src = 'https://picsum.photos/300/300';
                                    }}
                                />
                            </div>
                            {post.caption && (
                                <p className="text-sm mb-3 line-clamp-2">{post.caption}</p>
                            )}
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                    </svg>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold">ASME PSU</span>
                                    <span className="text-[10px] text-gray-500">@asmepsu</span>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Fallback placeholder if no posts are available */}
                    <div className="bg-white rounded-lg p-4 text-black shadow-lg">
                        <div className="aspect-square bg-gray-200 rounded-lg mb-4 overflow-hidden">
                            <img src="https://picsum.photos/300/300" alt="Instagram post" className="w-full h-full object-cover" />
                        </div>
                        <p className="text-sm mb-3 line-clamp-2 text-gray-500">Instagram posts will appear here once configured.</p>
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                </svg>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold">ASME PSU</span>
                                <span className="text-[10px] text-gray-500">@asmepsu</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
>>>>>>> b94d497e4c3091d5202899d1ccfdb3637d292578
        </div>
      </div>

      {/* Past Events Section */}
      <div className="bg-white py-20 px-4">
        <div className="container mx-auto max-w-4xl relative">
            <h2 className="text-3xl font-bold mb-8">Past Events</h2>
<<<<<<< HEAD
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
                            <p className="text-xs text-white/80 mb-2">{event.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                                    <Clock className="w-4 h-4 text-asme-red" />
                                </div>
                                <span className="font-semibold text-sm text-white">{event.date}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
=======
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
>>>>>>> b94d497e4c3091d5202899d1ccfdb3637d292578
        </div>
        
      </div>

    </div>
  );
};

export default Events;
