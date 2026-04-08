import React from 'react';
import Uploader from './Uploader';

const PLACEHOLDER = 'https://picsum.photos/seed/about/800/600';

export type AboutSiteImagePreview =
  | 'main-hero'
  /** Left column on team / general-body pages: half width, bordered photo */
  | 'two-col-left'
  /** Full-width band on main About “Our Teams” */
  | 'team-tile'
  /** Two previews: column + tile (same URL) */
  | 'dual-column-and-tile';

export interface AboutSiteImageFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  preview: AboutSiteImagePreview;
  folder?: string;
  description?: string;
  onUploadError?: (message: string) => void;
}

/**
 * Admin-only: ImageKit upload + live preview boxes sized to match public About layouts
 * (main hero, two-column left image, Our Teams tile).
 */
const AboutSiteImageField: React.FC<AboutSiteImageFieldProps> = ({
  label,
  value,
  onChange,
  preview,
  folder = '/site/about',
  description,
  onUploadError,
}) => {
  const src = value?.trim() ? value.trim() : PLACEHOLDER;

  const handleError = (msg: string) => {
    onUploadError?.(msg);
    if (!onUploadError) window.alert(msg);
  };

  const TwoColPreview = () => (
    <div className="rounded-lg border border-gray-200 bg-gray-100 p-4">
      <div className="flex flex-col md:flex-row gap-12 items-start max-w-5xl mx-auto">
        <div className="w-full md:w-1/2">
          <div className="mb-6">
            <img src={src} alt="" className="w-full h-auto rounded-lg border-2 border-blue-300" />
          </div>
        </div>
        <div className="hidden md:flex w-full md:w-1/2 items-start justify-center min-h-[120px] rounded border border-dashed border-gray-300 text-gray-400 text-xs p-4">
          Activities / text column
        </div>
      </div>
    </div>
  );

  const TilePreview = () => (
    <div className="rounded-lg border border-gray-200 bg-[#e5e7eb] p-4">
      <div className="relative overflow-hidden rounded-xl h-48 w-full shadow-md max-w-3xl mx-auto">
        <img src={src} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/35 flex items-center justify-center pointer-events-none">
          <span className="text-white text-sm font-jost font-semibold drop-shadow">Team name</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {description ? <p className="text-xs text-gray-500 mb-2">{description}</p> : null}
      </div>
      <Uploader
        folder={folder}
        tags={['about-site']}
        buttonLabel={value?.trim() ? 'Replace image' : 'Upload image'}
        onComplete={(u) => onChange(u.url)}
        onError={handleError}
      />
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm"
        placeholder="Or paste image URL"
      />

      {preview === 'main-hero' && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-gray-600">Preview — main About (/about) top row (same as site)</p>
          <div className="rounded-lg border border-gray-200 bg-white p-4 max-w-5xl">
            <div className="flex flex-col md:flex-row gap-12 items-start">
              <div className="w-full md:w-1/3 h-64 bg-slate-700 rounded-lg overflow-hidden">
                <img src={src} alt="" className="w-full h-full object-cover rounded-lg" />
              </div>
              <div className="hidden md:flex w-full md:w-2/3 items-center justify-center min-h-[8rem] rounded border border-dashed border-gray-300 text-gray-400 text-xs">
                Title and paragraphs
              </div>
            </div>
          </div>
        </div>
      )}

      {preview === 'two-col-left' && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-gray-600">Preview — team / General Body page, left column</p>
          <TwoColPreview />
        </div>
      )}

      {preview === 'team-tile' && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-gray-600">Preview — “Our Teams” strip on main About</p>
          <TilePreview />
        </div>
      )}

      {preview === 'dual-column-and-tile' && (
        <div className="mt-3 space-y-3">
          <p className="text-xs font-medium text-gray-600">Preview — same image on the site in two places</p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Team / General Body page (left column)</p>
              <TwoColPreview />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Main About — Our Teams tile</p>
              <TilePreview />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AboutSiteImageField;
