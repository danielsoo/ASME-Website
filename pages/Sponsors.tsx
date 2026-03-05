import React, { useState, useEffect } from 'react';
import { SPONSORS } from '../src/constants';
import { Settings } from 'lucide-react';
import { getSponsorContactEmail } from '../firebase/services';

const Sponsors: React.FC = () => {
  const [contactEmail, setContactEmail] = useState('president.asme.psu@gmail.com');

  useEffect(() => {
    getSponsorContactEmail().then(setContactEmail);
  }, []);

  return (
    <div className="min-h-screen bg-[#0f131a] text-white font-jost pb-20 relative">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-gray-200 to-gray-300 py-6 px-4">
          <div className="container mx-auto">
              <h1 className="text-[#1E2B48] font-bold text-xl mb-1">Become a Sponsor</h1>
              <p className="text-gray-700 text-sm">
                  If you're interested in becoming a sponsor, email us at <a href={`mailto:${contactEmail}`} className="text-blue-600 font-bold">{contactEmail}</a> to receive our Sponsorship packet!
              </p>
          </div>
      </div>

      {/* Get in Touch Section */}
      <div className="bg-white py-20 px-4 text-center">
          <div className="container mx-auto max-w-4xl relative">
              {/* Decorative Gears */}
              <Settings className="absolute left-4 top-1/4 -translate-y-1/2 w-32 h-32 text-[#1E2B48] hidden md:block" strokeWidth={1} />
              <Settings className="absolute right-4 top-1/4 -translate-y-1/2 w-32 h-32 text-[#1E2B48] hidden md:block" strokeWidth={1} />

              <h2 className="text-[#1E2B48] text-4xl font-bold mb-4">Get in Touch!</h2>
              <p className="text-black text-lg mb-8 max-w-xl mx-auto">
                  Looking to provide professional insight and support to ASME? Consider choosing one of the options below to help us out!
              </p>
              
              <div className="flex justify-center gap-12 flex-wrap">
                  <a href="https://secure.ddar.psu.edu/s/1218/2014/index.aspx?sid=1218&gid=1&pgid=658&cid=2321&dids=17094&bledit=1&appealcode=AZZ1K" target="_blank" rel="noopener noreferrer" className="bg-[#840131] hover:bg-[#4D021E] text-white font-bold py-3 px-8 rounded shadow-lg transition w-48 text-center">
                      Donate
                  </a>
                  <a href="https://donate.thon.org/events/4542" target="_blank" rel="noopener noreferrer" className="bg-[#4a5568] hover:bg-[#2d3748] text-white font-bold py-3 px-8 rounded shadow-lg transition w-48 text-center">
                      Donate to THON
                  </a>
              </div>
              <div className="text-black mt-2">
                <p>OR</p>
                <p>Become a guest speaker by emailing us at <a href={`mailto:${contactEmail}`} className="text-blue-600 font-bold">{contactEmail}</a></p>
              </div>
          </div>
      </div>

      {/* Special Thanks */}
      <div className="bg-[#d1d5db] py-16 px-4 text-black">
          <div className="container mx-auto max-w-5xl">
              <h3 className="text-2xl font-bold mb-6 text-[#1E2B48]">Special Thanks to our Supporters</h3>
              <p className="mb-4 text-sm leading-relaxed">
                  On behalf of the Pennsylvania State University Chapter of the American Society of Mechanical Engineers (ASME), we thank you in advance for considering a donation or Sponsorship. We appreciate the time you have taken to review this packet. With your investment, we will engage more students in Mechanical Engineering and enrich their undergraduate experiences. In tandem, we will advance our members' careers and contribute to the local community in State College.
              </p>
          </div>
      </div>

      {/* Sponsors Grid */}
      <div className="bg-white py-20 px-4">
          <div className="container mx-auto max-w-6xl">
              <h2 className="text-[#1E2B48] text-3xl font-bold mb-12">Our Sponsors</h2>
              <div className="bg-[#3b4c6b] p-8 md:p-12 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                      {SPONSORS.map(sponsor => (
                          <div key={sponsor.id} className="aspect-square bg-white rounded shadow-lg flex items-center justify-center p-4 hover:scale-105 transition-transform duration-300">
                              {/* Logo Placeholder */}
                               <div className="relative w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-xs uppercase tracking-wider text-center">
                                <a href={sponsor.link} target="_blank" className="relative block w-full h-full">
                                    <img src={sponsor.logoUrl} alt={sponsor.name} className="w-full h-full object-cover"></img>
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
                                        <span className="text-white text-sm font-bold uppercase tracking-wider text-center px-2">
                                            {sponsor.name}
                                        </span>
                                    </div>
                                </a>
                                
                               </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>

    </div>
  );
};

export default Sponsors;
