import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageCarouselProps {
  images: string[];
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images }) => {
  const [current, setCurrent] = useState(0);
  const [fade, setFade] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = useCallback((index: number) => {
    setFade(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setCurrent((index + images.length) % images.length);
      setFade(true);
    }, 120);
  }, [images.length]);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  // Keyboard navigation
  useEffect(() => {
    if (images.length <= 1) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(current - 1);
      if (e.key === 'ArrowRight') go(current + 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [current, images.length, go]);

  if (images.length === 0) return null;

  return (
    <div className="w-full rounded-2xl overflow-hidden bg-[#1c2333] shadow-lg select-none">
      {/* Main image area */}
      <div className="relative flex items-center justify-center" style={{ minHeight: 340, maxHeight: 540 }}>
        <img
          key={current}
          src={images[current]}
          alt={`Gallery image ${current + 1}`}
          className="w-full object-contain"
          style={{
            maxHeight: 540,
            transition: 'opacity 0.15s ease',
            opacity: fade ? 1 : 0,
          }}
          draggable={false}
        />

        {/* Gradient overlays for arrows */}
        {images.length > 1 && (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-black/30 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-black/30 to-transparent" />

            <button
              onClick={() => go(current - 1)}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/65 flex items-center justify-center text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => go(current + 1)}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/65 flex items-center justify-center text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Dot indicators + counter */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-3 py-3 bg-[#1c2333]">
          <div className="flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={`Go to image ${i + 1}`}
                className={`rounded-full transition-all duration-200 focus:outline-none ${
                  i === current
                    ? 'w-5 h-2 bg-white'
                    : 'w-2 h-2 bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
          <span className="text-white/40 text-xs font-jost tabular-nums">
            {current + 1} / {images.length}
          </span>
        </div>
      )}
    </div>
  );
};

export default ImageCarousel;
