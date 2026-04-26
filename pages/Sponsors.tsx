import React, { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, query } from 'firebase/firestore';
import { db } from '../src/firebase/config';
import { Settings } from 'lucide-react';
import { getSponsorContactEmail } from '../src/firebase/services';
import type { Sponsor, SponsorsContent, SponsorTier } from '../src/types';
import { DEFAULT_SPONSORS } from '../src/types';
import { sanitizeHtml, isHtmlString } from '../src/utils/sanitizeHtml';
import { repairMidWordBreaks, normalizeParagraphText } from '../src/utils/textWrapNormalize';

const Sponsors: React.FC = () => {
  const SPONSOR_TIER_CONFIG_DOC_ID = 'tier_config_v1';
  const [content, setContent] = useState<SponsorsContent>({ ...DEFAULT_SPONSORS });
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [tiers, setTiers] = useState<SponsorTier[]>([
    { id: 'platinum', name: 'Platinum Sponsors', order: 0 },
    { id: 'gold', name: 'Gold Sponsors', order: 1 },
    { id: 'silver', name: 'Silver Sponsors', order: 2 },
  ]);
  
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
    const unsubTiers = onSnapshot(doc(db, 'sponsors', SPONSOR_TIER_CONFIG_DOC_ID), (snap) => {
      const raw = (snap.exists() ? snap.data()?.tiers : undefined) as SponsorTier[] | undefined;
      if (!Array.isArray(raw) || raw.length === 0) return;
      const next = raw
        .map((t, idx) => ({
          id: String(t?.id || `tier-${idx}`),
          name: String(t?.name || `Tier ${idx + 1}`),
          order: typeof t?.order === 'number' ? t.order : idx,
        }))
        .sort((a, b) => a.order - b.order);
      setTiers(next);
    });

    const sponsorsQuery = query(collection(db, 'sponsors'));
    const unsub = onSnapshot(sponsorsQuery, (snapshot) => {
      const sponsorsList = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Sponsor))
        .filter((sponsor) => sponsor.id !== SPONSOR_TIER_CONFIG_DOC_ID)
        .filter((sponsor) => (sponsor as unknown as Record<string, unknown>).kind !== 'tier_config')
        .filter((sponsor) => !sponsor.deletedAt)
        .sort((a, b) => {
          const aTier = a.tierId || '';
          const bTier = b.tierId || '';
          if (aTier !== bTier) return aTier.localeCompare(bTier);
          const aOrder = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
          const bOrder = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return (a.name || '').localeCompare(b.name || '');
        });

      setSponsors(sponsorsList);
    }, (e) => {
      console.error('Sponsors list subscription error:', e);
      setSponsors([]);
    });

    return () => {
      unsubTiers();
      unsub();
    };
  }, []);

  useEffect(() => {
    if (content.contactEmail) return;
    getSponsorContactEmail().then(setFallbackEmail);
  }, [content.contactEmail]);

  const displayEmail = content.contactEmail ?? fallbackEmail;

  const renderWithEmailLink = (text: string) => {
    const parts = normalizeParagraphText(text).split(/\{\{email\}\}/);
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
      const withEmail = repairMidWordBreaks(c).replace(/\{\{email\}\}/g, `<a href="mailto:${displayEmail}" class="text-blue-600 font-bold">${displayEmail}</a>`);
      const html = sanitizeHtml(withEmail);
      return <span className="sponsors-rich-content" dangerouslySetInnerHTML={{ __html: html }} />;
    }
    return asPlainParagraph ? <p className="mb-4 text-sm leading-relaxed">{renderWithEmailLink(c)}</p> : renderWithEmailLink(c);
  };

  const sponsorsByTier: Record<string, Sponsor[]> = {};
  tiers.forEach((tier) => {
    sponsorsByTier[tier.id] = [];
  });
  sponsors.forEach((s) => {
    const key = s.tierId || tiers[0]?.id || 'platinum';
    if (!sponsorsByTier[key]) sponsorsByTier[key] = [];
    sponsorsByTier[key].push(s);
  });

  return (
    <div className="min-h-screen bg-[#0f131a] text-white font-jost pb-20 relative">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-gray-200 to-gray-300 py-6 px-4">
          <div className="max-w-5xl mx-auto w-full">
              <h1 className="text-[#1E2B48] font-bold text-xl mb-1">{renderRichContent(content.bannerTitle || 'Become a Sponsor')}</h1>
              <p className="text-gray-700 text-sm">
                  {renderRichContent(content.bannerText ?? '')}
              </p>
          </div>
      </div>

      {/* Get in Touch Section */}
      <div className="bg-white py-20 px-4 text-center overflow-x-hidden">
          <div className="max-w-4xl mx-auto w-full relative overflow-visible">
              <div className="flex items-center justify-center gap-4 md:gap-8">
                  <Settings className="w-16 h-16 md:w-20 md:h-20 text-[#1E2B48] hidden md:block shrink-0" strokeWidth={1} aria-hidden />
                  <div className="min-w-0 flex-1 px-2">
                      <h2 className="text-[#1E2B48] text-4xl font-bold mb-4 break-normal whitespace-normal">{renderRichContent(content.getInTouchTitle || 'Get in Touch!')}</h2>
                      <div className="text-black text-lg mb-8 max-w-xl mx-auto sponsors-rich-content break-normal whitespace-normal leading-relaxed">
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
              <div className="text-black mt-2 break-normal whitespace-normal">
                <p>OR</p>
                <p>{renderRichContent(content.guestSpeakerText ?? '')}</p>
              </div>
          </div>
      </div>

      {/* Sponsors by Tier */}
      <div className="bg-white py-20 px-[clamp(1rem,5vw,4rem)]">
          <div className="max-w-6xl mx-auto w-full">
              <h2 className="text-[#1E2B48] text-3xl font-bold mb-12">Our Sponsors</h2>
              <div className="space-y-12">
                {tiers.map((tier) => {
                  const tierSponsors = sponsorsByTier[tier.id] || [];
                  if (tierSponsors.length === 0) return null;
                  return (
                    <section key={tier.id}>
                      <h3 className="text-[#1E2B48] text-2xl font-bold mb-6">{tier.name}</h3>
                      <div className="bg-[#3b4c6b] p-8 md:p-12 rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                          {tierSponsors.map((sponsor) => (
                            <div key={sponsor.id} className="aspect-square bg-white rounded shadow-lg overflow-hidden hover:scale-105 transition-transform duration-300">
                              <a href={sponsor.link || '#'} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                                <img src={sponsor.logoUrl} alt={sponsor.name} className="w-full h-full object-cover object-center" />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>
          </div>
      </div>

      {/* Special Thanks */}
      <div className="bg-[#d1d5db] py-16 px-4 text-black">
          <div className="max-w-5xl mx-auto w-full">
              <h3 className="text-2xl font-bold mb-6 text-[#1E2B48] break-normal whitespace-normal">{renderRichContent(content.specialThanksTitle || 'Special Thanks to our Supporters')}</h3>
              <div className="mb-4 text-sm leading-relaxed sponsors-rich-content break-normal whitespace-normal">
                  {renderRichContent(content.specialThanksParagraph ?? '', true)}
              </div>
          </div>
      </div>

    </div>
  );
};

export default Sponsors;
