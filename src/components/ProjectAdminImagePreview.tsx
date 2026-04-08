import React from 'react';

/** Matches public `ProjectCard` header: `h-48`, full-width strip, `object-cover`. */
export const ProjectAdminImagePreview: React.FC<{
  imageUrl: string;
  /** Plain-text title for overlay demo (optional) */
  titleHint?: string;
}> = ({ imageUrl, titleHint }) => {
  const src = imageUrl?.trim();
  if (!src || src === '#') {
    return (
      <p className="text-xs text-gray-500 mt-2">
        Upload or paste a URL to see a live preview (same height as the public Projects page cards).
      </p>
    );
  }
  return (
    <div className="mt-3 rounded-lg border border-gray-200 overflow-hidden bg-white max-w-3xl">
      <p className="text-xs font-medium text-gray-600 px-3 py-2 bg-gray-50 border-b border-gray-200">
        Preview — public Projects page card (top image)
      </p>
      <div className="relative h-48 w-full overflow-hidden bg-[#DEE7ED]">
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover object-center"
          decoding="async"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        {/* Bottom gradient only — full-surface overlay made the preview look blurry/milky */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none bg-gradient-to-t from-black/75 via-black/25 to-transparent pt-16 pb-4 px-4 flex flex-col justify-end">
          <span className="text-lg font-bold font-jost text-white uppercase tracking-wide drop-shadow-md">
            {titleHint?.trim() || 'Project title'}
          </span>
        </div>
      </div>
    </div>
  );
};
