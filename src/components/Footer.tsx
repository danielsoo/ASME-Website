import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { FooterContent } from '../types';
import { DEFAULT_FOOTER } from '../types';

const FOOTER_CONFIG_PATH = 'config';
const FOOTER_DOC = 'footer';

const Footer: React.FC = () => {
  const [content, setContent] = useState<FooterContent>({ ...DEFAULT_FOOTER });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, FOOTER_CONFIG_PATH, FOOTER_DOC),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as FooterContent;
          setContent({ ...DEFAULT_FOOTER, ...data });
        }
      },
      () => {}
    );
    return () => unsubscribe();
  }, []);

  const phone = content.phone ?? DEFAULT_FOOTER.phone ?? '';
  const email1 = content.email1 ?? DEFAULT_FOOTER.email1 ?? '';
  const email2 = content.email2 ?? DEFAULT_FOOTER.email2 ?? '';
  const missionStatement = content.missionStatement ?? DEFAULT_FOOTER.missionStatement ?? '';
  const addressLine1 = content.addressLine1 ?? DEFAULT_FOOTER.addressLine1 ?? '';
  const addressLine2 = content.addressLine2 ?? DEFAULT_FOOTER.addressLine2 ?? '';
  const instagramUrl = content.instagramUrl ?? DEFAULT_FOOTER.instagramUrl ?? '';
  const groupmeUrl = content.groupmeUrl ?? DEFAULT_FOOTER.groupmeUrl ?? '';
  const slackUrl = content.slackUrl ?? DEFAULT_FOOTER.slackUrl ?? '';

  const telHref = phone ? `tel:+1${phone.replace(/\D/g, '')}` : '';
  const mapsQuery = [addressLine1, addressLine2].filter(Boolean).join(' ');
  const mapsHref = mapsQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
    : '#';

  return (
    <footer 
      className="font-jost bg-[#111828] text-white"
      style={{ 
        width: "100%",
        // Make height responsive: smallest is ~120px, biggest is 250px
        // Increased to add more vertical spacing
        height: "clamp(250px, 16.5vw, 270px)",
        display: "flex",
        flexDirection: "column",
        gap: '20px',
        alignItems: "center",
        justifyContent: "center",
        // font styles inherited by all text
        fontFamily: 'var(--font-jost, "Jost", sans-serif)', 
        fontSize: '16px', 
        fontStyle: 'normal', 
        fontWeight: 400, 
        lineHeight: 'normal',
        color: '#FFF',
        margin: 0,
        marginBottom: '4px',
      }}
    >
      {/* Inner container: keeps space on left and right sides */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          alignItems: "center",
          // Make width = full width minus padding on both sides
          // Padding is responsive: smallest is 16px, biggest is 39px on each side
          // Based on 1512px base: 39px = ~2.58vw
          width: "calc(100% - clamp(32px, 5.16vw, 78px))",
          // Gap between columns: smallest is 16px, biggest is 47.54px
          // Based on 1512px base: 47.54px = ~3.14vw
          gap: "clamp(16px, 3.14vw, 47.54px)",
          minWidth: 0,
        }}
      >
        {/* Left Column - Contact Information */}
        <div className="font-jost font-normal">
          <p 
            className="text-white mb-4" 
            style={{
              textDecorationLine: 'underline',
              marginBottom: '4px',
            }}
          >
            Contact us
          </p>
          {phone && (
            <p>
              <a href={telHref} className="text-white hover:underline">{phone}</a>
            </p>
          )}
          {email1 && (
            <p>
              <a href={`mailto:${email1}`} className="text-white hover:underline">{email1}</a>
            </p>
          )}
          {email2 && (
            <p>
              <a href={`mailto:${email2}`} className="text-white hover:underline">{email2}</a>
            </p>
          )}
        </div>

        {/* Center Column - Mission Statement */}
        <div className="font-jost font-normal text-center flex items-center justify-center">
          <div
            style={{
              // Width responsive: smallest is 200px, biggest is 549px
              // Based on 1512px base: 549px = ~36.3vw
              width: "clamp(200px, 36.3vw, 549px)",
              // Height responsive: smallest is 50px, biggest is 112.362px
              // Based on 1512px base: 112.362px = ~7.43vw
              height: "clamp(50px, 7.43vw, 112.362px)",
              color: "#FFF",
              fontFamily: "var(--font-jost, 'Jost', sans-serif)",
              // Font size responsive: smallest is 16px, biggest is 36px
              // Based on 1512px base: 36px = ~2.38vw
              fontSize: "clamp(16px, 2vw, 36px)",
              fontStyle: "normal",
              fontWeight: 400,
              lineHeight: "normal",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {missionStatement || 'Developing & Supporting the next generation of Mechanical Engineers'}
          </div>
        </div>

        {/* Right Column - Address (한 주소, 글자에만 링크) */}
        <div className="font-jost font-normal text-right">
          <p>Office:</p>
          {(addressLine1 || addressLine2) ? (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:underline cursor-pointer inline-block text-right"
            >
              {addressLine1}
              {addressLine1 && addressLine2 && <br />}
              {addressLine2}
            </a>
          ) : (
            <>
              125 Hammond
              <br />
              University Park, PA 16802
            </>
          )}
        </div>
      </div>
      <div className="flex gap-1.5">
            <a href={instagramUrl || '#'} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center" onClick={!instagramUrl ? (e) => e.preventDefault() : undefined}>
              <img src="/instagram.svg" alt="Instagram" width={24} height={24} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </a>
            <a href={groupmeUrl || '#'} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center" onClick={!groupmeUrl ? (e) => e.preventDefault() : undefined}>
              <img src="/groupmeLogo.png" alt="GroupMe" width={24} height={24} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </a>
            <a href={slackUrl || '#'} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center" onClick={!slackUrl ? (e) => e.preventDefault() : undefined}>
              <img src="/slackLogo.png" alt="Slack" width={24} height={24} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </a>
          </div>
    </footer>
  );
};

export default Footer;