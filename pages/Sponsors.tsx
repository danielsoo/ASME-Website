import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../src/firebase/config';
import { SPONSORS } from '../src/constants';
import { Settings } from 'lucide-react';
import { getSponsorContactEmail } from '../src/firebase/services';
import type { SponsorsContent } from '../src/types';
import { DEFAULT_SPONSORS } from '../src/types';
import { sanitizeHtml, isHtmlString } from '../src/utils/sanitizeHtml';

const Sponsors: React.FC = () => {
  const [content, setContent] = useState<SponsorsContent>({ ...DEFAULT_SPONSORS });
  
  // NOTE:: do we need this if the default is already handled in firebase services.tsx?
  const [fallbackEmail, setFallbackEmail] = useState('president.asme.psu@gmail.com');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'sponsors'), (snap) => {
      const data = snap.exists() ? { ...DEFAULT_SPONSORS, ...(snap.data() as SponsorsContent) } : { ...DEFAULT_SPONSORS };
      setContent(data);
    }, (e) => {
      console.error('Sponsors config subscription error:', e);
      setContent({ ...DEFAULT_SPONSORS });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (content.contactEmail) return;
    getSponsorContactEmail().then(setFallbackEmail);
  }, [content.contactEmail]);

  const displayEmail = content.contactEmail ?? fallbackEmail;

  const renderWithEmailLink = (text: string) => {
    const parts = text.split(/\{\{email\}\}/);
    return parts.reduce<React.ReactNode[]>((acc, part, i) => {
      acc.push(part);
      if (i < parts.length - 1) acc.push(<a key={i} href={`mailto:${displayEmail}`} className="text-blue-600 font-bold">{displayEmail}</a>);
      return acc;
    }, []);
  };

  /** Render title/paragraph: HTML (from rich editor) or plain text. For HTML with {{email}}, substitute mailto link. */
  const renderRichContent = (raw: string | undefined, asPlainParagraph = false): React.ReactNode => {
    const c = raw ?? '';
    if (!c) return null;
    if (isHtmlString(c)) {
      const withEmail = c.replace(/\{\{email\}\}/g, `<a href="mailto:${displayEmail}" class="text-blue-600 font-bold">${displayEmail}</a>`);
      const html = sanitizeHtml(withEmail);
      return <span className="sponsors-rich-content" dangerouslySetInnerHTML={{ __html: html }} />;
    }
    return asPlainParagraph ? <p className="mb-4 text-sm leading-relaxed">{renderWithEmailLink(c)}</p> : renderWithEmailLink(c);
  };

  return (
    <div className="min-h-screen bg-[#0f131a] text-white font-jost pb-20 relative">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-gray-200 to-gray-300 py-6 px-4">
          <div className="container mx-auto">
              <h1 className="text-[#1E2B48] font-bold text-xl mb-1">{renderRichContent(content.bannerTitle || 'Become a Sponsor')}</h1>
              <p className="text-gray-700 text-sm">
                  {renderRichContent(content.bannerText ?? '')}
              </p>
          </div>
      </div>

      {/* Get in Touch Section */}
      <div className="bg-white py-20 px-4 text-center overflow-x-hidden">
          <div className="container mx-auto max-w-4xl relative overflow-visible">
              <div className="flex items-center justify-center gap-4 md:gap-8">
                  <Settings className="w-16 h-16 md:w-20 md:h-20 text-[#1E2B48] hidden md:block shrink-0" strokeWidth={1} aria-hidden />
                  <div className="min-w-0 flex-1 px-2">
                      <h2 className="text-[#1E2B48] text-4xl font-bold mb-4 break-words">{renderRichContent(content.getInTouchTitle || 'Get in Touch!')}</h2>
                      <div className="text-black text-lg mb-8 max-w-xl mx-auto sponsors-rich-content break-words">
                          {renderRichContent(content.getInTouchParagraph ?? '')}
                      </div>
                  </div>
                  <Settings className="w-16 h-16 md:w-20 md:h-20 text-[#1E2B48] hidden md:block shrink-0" strokeWidth={1} aria-hidden />
              </div>
              
              <div className="flex justify-center gap-12 flex-wrap mt-4">
                  <a href={content.donateUrl ?? '#'} target="_blank" rel="noopener noreferrer" className="bg-[#840131] hover:bg-[#4D021E] text-white font-bold py-3 px-8 rounded shadow-lg transition w-48 text-center">
                      {content.donateLabel ?? 'Donate'}
                  </a>
                  <a href={content.thonUrl ?? '#'} target="_blank" rel="noopener noreferrer" className="bg-[#4a5568] hover:bg-[#2d3748] text-white font-bold py-3 px-8 rounded shadow-lg transition w-48 text-center">
                      {content.thonLabel ?? 'Donate to THON'}
                  </a>
              </div>
              <div className="text-black mt-2 break-words">
                <p>OR</p>
                <p>{renderRichContent(content.guestSpeakerText ?? '')}</p>
              </div>
          </div>
      </div>

      {/* Special Thanks */}
      <div className="bg-[#d1d5db] py-16 px-4 text-black">
          <div className="container mx-auto max-w-5xl">
              <h3 className="text-2xl font-bold mb-6 text-[#1E2B48]">{renderRichContent(content.specialThanksTitle || 'Special Thanks to our Supporters')}</h3>
              <div className="mb-4 text-sm leading-relaxed sponsors-rich-content">
                  {renderRichContent(content.specialThanksParagraph ?? '', true)}
              </div>
          </div>
      </div>

      {/* Sponsors Grid */}
      <div className="bg-white py-20 px-16">
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
