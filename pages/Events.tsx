import React from 'react';
import { EVENTS } from '../constants';
import { Calendar, Clock, MapPin } from 'lucide-react';

const Events: React.FC = () => {
  const upcomingEvents = EVENTS.filter(e => e.type === 'upcoming');
  const pastEvents = EVENTS.filter(e => e.type === 'past');
  const thisWeekEvents = EVENTS.filter(e => e.type === 'this_week');

  return (
    <div className="min-h-screen bg-[#0f131a] text-[#1E2B48] font-jost pb-20 relative">
      
      {/* Calendar Section */}
      <div className="bg-white py-20 px-4">
        <div className="container mx-auto max-w-4xl relative">
            <h2 className="text-3xl font-bold mb-8">Calendar</h2>
            
            <div className="flex flex-col lg:flex-row gap-8">
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
        </div>
      </div>

      {/* Past Events Section */}
      <div className="bg-white py-20 px-4">
        <div className="container mx-auto max-w-4xl relative">
            <h2 className="text-3xl font-bold mb-8">Past Events</h2>
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
        </div>
        
      </div>

    </div>
  );
};

export default Events;