import React from 'react';
import { responsiveClamp, responsiveClampCustom } from '../utils/responsive';

const Home: React.FC = () => {
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
          marginTop: "clamp(-80px, -6vw, -96px)",
        }}
      >
        <div className="flex flex-col items-center">
            <h3 className="text-3xl font-jost font-bold mb-6 text-white text-center">Next Meeting</h3>
            
            {/* Simple Mock Calendar Card */}
            <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-4xl overflow-hidden">
                <div className="flex justify-between items-center mb-6 px-4">
                    <div className="flex gap-4 items-center">
                        <span className="text-4xl font-light text-gray-800">19</span>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-500 uppercase">Tue</span>
                            <span className="text-xl font-bold text-black">October 2025</span>
                        </div>
                    </div>
                </div>
                {/* Visual Grid for Calendar */}
                <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                    {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
                        <div key={d} className="bg-white py-2 text-center text-xs font-semibold text-gray-500">{d}</div>
                    ))}
                    {/* Mock Days */}
                    {Array.from({length: 31}).map((_, i) => (
                        <div key={i} className={`bg-white h-24 p-1 relative ${i === 20 ? 'bg-blue-50' : ''}`}>
                             <span className={`text-sm ${i===20 ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-700'}`}>{i+1}</span>
                             {i === 20 && (
                                 <div className="absolute top-1/2 left-2 right-2 h-1 bg-red-500 rounded-full"></div>
                             )}
                        </div>
                    ))}
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
