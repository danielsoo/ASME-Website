import { AlignCenter, TextAlignCenter } from 'lucide-react';
import React from 'react';

const Footer: React.FC = () => {
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
          <p>484-268-3741</p>
          <p>
            <a href="mailto:gmk5561@psu.edu" className="text-white hover:underline">gmk5561@psu.edu</a>
          </p>
          <p>
            <a href="mailto:president.asme.psu@gmail.com" className="text-white hover:underline">president.asme.psu@gmail.com</a>
          </p>
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
            Developing & Supporting the next generation of Mechanical Engineers
          </div>
        </div>

        {/* Right Column - Address */}
        <div className="font-jost font-normal text-right">
          <p>Office:</p>
          <p>125 Hammond</p>
          <p>University Park, PA 16802</p>
        </div>
      </div>
      <div className="flex gap-1.5">
            {/* Instagram */}
            <a href="https://www.instagram.com/asmepsu/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center">
              <img src="/instagram.svg" alt="Instagram" width={24} height={24} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </a>
            {/* GroupMe - TODO: Add link URL when found */}
            <a href="#" target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center">
              <img src="/groupmeLogo.png" alt="GroupMe" width={24} height={24} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </a>
            {/* Slack - TODO: Add link URL when found */}
            <a href="#" target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center">
              <img src="/slackLogo.png" alt="Slack" width={24} height={24} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </a>
          </div>
    </footer>
  );
};

export default Footer;