import { useEffect, useRef } from "react";

function EmbedSocialHashtag() {
  const containerRef = useRef(null);

  useEffect(() => {
    const SCRIPT_ID = "EmbedSocialHashtagScript";

    // Only run in the browser
    if (typeof document === "undefined") return;

    // Function to trigger EmbedSocial scan if available
    const initEmbedSocial = () => {
      // The EmbedSocial hashtag script auto-scans the DOM.
    };

    // load script if not loaded
    if (!document.getElementById(SCRIPT_ID)) {
        const js = document.createElement("script");
        js.id = SCRIPT_ID;
        js.src = "https://embedsocial.com/cdn/ht.js";
        js.async = true;
        js.onload = initEmbedSocial;
        document.head.appendChild(js);
    }
    
  }, []);

  return (
    <div
      ref={containerRef}
      className="embedsocial-hashtag "
      data-ref="39066d33b043ff54bfb67a70d0480466c9972dcc"
      data-lazyload="yes"
    />
  );
}

export default EmbedSocialHashtag;