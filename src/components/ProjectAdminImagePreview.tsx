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
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-black/25 pointer-events-none flex flex-col justify-end p-4">
          <span className="text-lg font-bold font-jost text-white uppercase tracking-wide drop-shadow">
            {titleHint?.trim() || 'Project title'}
          </span>
        </div>
      </div>
    </div>
  );
};
