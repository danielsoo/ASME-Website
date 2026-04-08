import React, { useMemo, useState } from 'react';
import type { AboutContent, DesignTeamContent, GeneralBodyContent } from '../types';
import { DEFAULT_ABOUT, DEFAULT_DESIGN_TEAM, DEFAULT_GENERAL_BODY } from '../types';
import { PROJECTS } from '../constants';
import { renderAboutParagraph, renderAboutTitle, renderDesignTeamIntroBlock } from '../utils/aboutRichRender';
import Uploader from './Uploader';
import AboutCropEditor from './AboutCropEditor';

export const ABOUT_SITE_IMAGE_PLACEHOLDER = 'https://picsum.photos/seed/about/800/600';

/** Main /about hero image display size in admin live preview (matches public visual weight). */
export const MAIN_ABOUT_HERO_DISPLAY_W = 344;

export type AboutSiteImagePreview =
  | 'main-hero'
  /** Left column on team / general-body pages: half width, bordered photo */
  | 'two-col-left'
  /** Full-width band on main About “Our Teams” */
  | 'team-tile'
  /** Two previews: column + tile (same URL) */
  | 'dual-column-and-tile';

/** Optional live copy for the layout preview (same HTML as public About). */
export interface AboutSitePreviewContext {
  /** Main About hero row: title + paragraphs + font */
  mainAbout?: Pick<
    AboutContent,
    'aboutTitle' | 'aboutParagraph1' | 'aboutParagraph2' | 'aboutLinkUrl' | 'paragraphFontFamily' | 'paragraphFontWeight'
  >;
  /** Design Team page: image column (stacked image + title + intro) */
  designTeam?: Pick<
    DesignTeamContent,
    | 'leftImageUrl'
    | 'sectionTitle'
    | 'sectionTitleFontFamily'
    | 'sectionTitleFontWeight'
    | 'introParagraph1'
    | 'introParagraph2'
    | 'introParagraph3'
    | 'introParagraph4'
    | 'introLinkUrl'
    | 'introFontFamily'
    | 'introFontWeight'
  >;
  /** Team / General Body page + dual tile: activities, body, past events */
  generalBody?: GeneralBodyContent;
  /** Our Teams tile overlay */
  teamNameLabel?: string;
  /** Public /about/team/:name body H2 fallback when titles empty (team name, or "Our General Body" on /about/generalbody). */
  teamBoardBodyTitleFallback?: string;
}

export interface AboutSiteLayoutPreviewProps {
  preview: AboutSiteImagePreview;
  previewSrc: string;
  context?: AboutSitePreviewContext;
  /** Tighter padding for sticky side panel */
  compact?: boolean;
}

const EMPTY_GB: GeneralBodyContent = { activitiesList: [], pastEventsList: [] };

/** Public /about/designteam — two columns; stable component so past-projects toggle state persists. */
function AboutDesignTeamLayoutPreview({
  pad,
  previewSrc,
  designTeam,
  mainAbout,
}: {
  pad: string;
  previewSrc: string;
  designTeam?: AboutSitePreviewContext['designTeam'];
  mainAbout?: AboutSitePreviewContext['mainAbout'];
}) {
  const [showPastProjects, setShowPastProjects] = useState(false);
  const merged = { ...DEFAULT_DESIGN_TEAM, ...designTeam };
  const ab = mainAbout ?? {};
  const currentProjects = PROJECTS.filter((p) => p.status === 'current');
  const pastProjects = PROJECTS.filter((p) => p.status === 'past');
  const fallbackAbout = {
    aboutParagraph1: ab.aboutParagraph1,
    aboutParagraph2: ab.aboutParagraph2,
    aboutLinkUrl: ab.aboutLinkUrl,
  };
  return (
    <div className={`rounded-lg border border-gray-200 bg-gray-100 ${pad}`}>
      <div className="max-w-5xl mx-auto min-w-0">
        <div className="container mx-auto px-4 pt-4">
          <div className="flex flex-col md:flex-row gap-12 items-start">
            <div className="w-full md:w-1/2 min-w-0">
              <div className="mb-6">
                <img src={previewSrc} alt="" className="w-full h-auto rounded-lg border-2 border-blue-300" />
              </div>
              <h2
                className="text-3xl font-bold text-black mb-6 underline"
                style={{
                  fontFamily: merged.sectionTitleFontFamily || undefined,
                  fontWeight: merged.sectionTitleFontWeight ? Number(merged.sectionTitleFontWeight) : undefined,
                }}
              >
                {renderAboutTitle(merged.sectionTitle ?? ab.aboutTitle, 'Our Design Team')}
              </h2>
              <div
                className="space-y-4 text-gray-800 leading-relaxed"
                style={{
                  fontFamily: merged.introFontFamily || undefined,
                  fontWeight: merged.introFontWeight ? Number(merged.introFontWeight) : undefined,
                }}
              >
                {renderDesignTeamIntroBlock(merged, fallbackAbout)}
              </div>
              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => setShowPastProjects(!showPastProjects)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-200 border border-gray-300 rounded-lg hover:bg-gray-300 transition-colors font-jost"
                >
                  <span className="text-gray-800 font-medium">
                    {renderAboutTitle(merged.pastProjectsTitle, 'Past Projects')}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-600 transition-transform ${showPastProjects ? 'transform rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showPastProjects ? (
                  <div className="mt-2 bg-white border border-gray-300 rounded-lg p-4">
                    <ul className="space-y-2 font-jost text-gray-800">
                      {pastProjects.map((project) => (
                        <li key={project.id}>• {project.title}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="w-full md:w-1/2 min-w-0">
              <h2 className="text-3xl font-jost font-bold text-[#1E2B48] mb-6 underline">
                {renderAboutTitle(merged.currentProjectsTitle, 'Fall 2025 Projects')}
              </h2>
              <div className="space-y-3">
                {currentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-600 text-white rounded-lg font-jost"
                  >
                    <span className="font-medium">{project.title}</span>
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Read-only layout preview (image + title/paragraphs) matching public About.
 */
export const AboutSiteLayoutPreview: React.FC<AboutSiteLayoutPreviewProps> = ({
  preview,
  previewSrc,
  context,
  compact,
}) => {
  const pad = compact ? 'p-3' : 'p-4';
  const about = context?.mainAbout;
  const ab = about ?? {};
  const gb = context?.generalBody;
  const teamLabel = context?.teamNameLabel?.trim() || 'Team name';
  const teamBodyFallback = context?.teamBoardBodyTitleFallback?.trim() || 'Our General Body';

  const MainHeroBlock = () => (
    <div className={`rounded-lg border border-gray-200 bg-white ${pad} w-full max-w-5xl`}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-6 sm:gap-8">
        <div className="mx-auto sm:mx-0 shrink-0 bg-slate-700 rounded-lg overflow-hidden w-full max-w-[344px] aspect-[344/259] sm:w-[344px]">
          <img src={previewSrc} alt="" className="w-full h-full object-cover rounded-lg" />
        </div>
        <div className="min-w-0 flex-1 text-white font-jost break-words">
          <h2 className="text-[#1E2B48] text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">{renderAboutTitle(ab.aboutTitle, 'About Us')}</h2>
          <div
            className="text-gray-800 leading-relaxed mb-4"
            style={{
              fontFamily: ab.paragraphFontFamily || undefined,
              fontWeight: ab.paragraphFontWeight ? Number(ab.paragraphFontWeight) : undefined,
            }}
          >
            {renderAboutParagraph(ab.aboutParagraph1)}
          </div>
          <div
            className="text-gray-800 leading-relaxed"
            style={{
              fontFamily: ab.paragraphFontFamily || undefined,
              fontWeight: ab.paragraphFontWeight ? Number(ab.paragraphFontWeight) : undefined,
            }}
          >
            {renderAboutParagraph(ab.aboutParagraph2, ab.aboutLinkUrl)}
          </div>
        </div>
      </div>
    </div>
  );

  /** General Body: same block as public /about/team/:name (non–exec board) and /about/generalbody top section */
  const GeneralBodyDualBlock = () => {
    const g = gb ?? { ...EMPTY_GB };
    const actTitle = g.activitiesTitle?.trim() ? g.activitiesTitle : DEFAULT_GENERAL_BODY.activitiesTitle;
    const activities = (g.activitiesList ?? []).filter((x) => String(x).trim() !== '');
    const pastTitle = g.pastEventsTitle?.trim() ? g.pastEventsTitle : DEFAULT_GENERAL_BODY.pastEventsTitle;
    const pastList = (g.pastEventsList ?? []).filter((x) => String(x).trim() !== '');

    return (
      <div className={`rounded-lg border border-gray-200 bg-gray-100 ${pad}`}>
        <div className="max-w-5xl mx-auto min-w-0">
          <div className="container mx-auto px-4 pt-4">
            <div className="flex flex-col md:flex-row gap-12 items-start">
              <div className="w-full md:w-1/2 min-w-0">
                <div className="mb-6">
                  <img
                    src={previewSrc}
                    alt=""
                    className="w-full h-auto rounded-lg border-2 border-blue-300"
                  />
                </div>
              </div>
              <div className="w-full md:w-1/2 min-w-0">
                <h2 className="text-3xl font-jost font-bold text-black mb-6 underline">
                  {renderAboutTitle(actTitle, 'Our Activities')}
                </h2>
                <ul className="space-y-4 font-jost">
                  {(activities.length ? activities : DEFAULT_GENERAL_BODY.activitiesList ?? []).map((item, idx) => (
                    <li key={idx} className="text-gray-800 text-lg">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-8">
              <h2 className="text-3xl font-jost font-bold text-black mb-6 underline">
                {renderAboutTitle(g.bodySectionTitle ?? ab.aboutTitle, teamBodyFallback)}
              </h2>
              <div className="space-y-4 text-gray-800 leading-relaxed font-jost">
                <div>{renderAboutParagraph(ab.aboutParagraph1 ?? DEFAULT_ABOUT.aboutParagraph1)}</div>
                <div>{renderAboutParagraph(ab.aboutParagraph2 ?? DEFAULT_ABOUT.aboutParagraph2, ab.aboutLinkUrl)}</div>
              </div>
              <div className="mt-8">
                <h3 className="text-xl font-jost font-bold text-black mb-4">{renderAboutTitle(pastTitle, 'Past Events')}</h3>
                <div className="bg-white border border-gray-300 rounded-lg p-4">
                  <ul className="space-y-2 font-jost text-gray-800">
                    {(pastList.length ? pastList : DEFAULT_GENERAL_BODY.pastEventsList ?? []).map((item, idx) => (
                      <li key={idx}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TileBlock = () => (
    <div className={`rounded-lg border border-gray-200 bg-[#e5e7eb] ${pad} min-w-0`}>
      <div className="relative overflow-hidden rounded-xl h-48 w-full shadow-md">
        <img src={previewSrc} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/35 flex items-center justify-center pointer-events-none">
          <span className="text-white text-sm font-jost font-semibold drop-shadow">{teamLabel}</span>
        </div>
      </div>
    </div>
  );

  if (preview === 'main-hero') {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-600">Preview — main About (/about) top row (same as site)</p>
        <MainHeroBlock />
      </div>
    );
  }

  if (preview === 'two-col-left') {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-600">Preview — Design Team page (/about/designteam), same layout as site</p>
        <AboutDesignTeamLayoutPreview
          pad={pad}
          previewSrc={previewSrc}
          designTeam={context?.designTeam}
          mainAbout={about}
        />
      </div>
    );
  }

  if (preview === 'team-tile') {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-600">Preview — “Our Teams” strip on main About</p>
        <TileBlock />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-gray-600">Preview — same image on the site in two places</p>
      <div className="space-y-6 min-w-0">
        <div className="space-y-2 min-w-0">
          <p className="text-xs text-gray-500">Team board page (/about/team/…)</p>
          <GeneralBodyDualBlock />
        </div>
        <div className="space-y-2 min-w-0">
          <p className="text-xs text-gray-500">Main About — Our Teams tile</p>
          <TileBlock />
        </div>
      </div>
    </div>
  );
};

export interface AboutSiteImageFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  preview: AboutSiteImagePreview;
  folder?: string;
  description?: string;
  onUploadError?: (message: string) => void;
  previewContext?: AboutSitePreviewContext;
  /** When false, omit the layout preview here (e.g. render &lt;AboutSiteLayoutPreview /&gt; in a sticky column beside editors). */
  showLayoutPreview?: boolean;
}

function cropConfig(preview: AboutSiteImagePreview): {
  aspectW: number;
  aspectH: number;
  outputLongEdge: number;
  containerClassName: string;
} {
  switch (preview) {
    case 'main-hero':
      return {
        aspectW: 4,
        aspectH: 3,
        outputLongEdge: 1600,
        /** Match live preview / public hero frame (344×259). */
        containerClassName: 'w-full max-w-[344px] aspect-[344/259] mx-auto',
      };
    case 'two-col-left':
      return {
        aspectW: 4,
        aspectH: 3,
        outputLongEdge: 1400,
        containerClassName: 'h-80 w-full max-w-2xl',
      };
    case 'team-tile':
      return {
        aspectW: 4,
        aspectH: 1,
        outputLongEdge: 1920,
        containerClassName: 'h-44 w-full max-w-4xl',
      };
    case 'dual-column-and-tile':
      return {
        aspectW: 4,
        aspectH: 3,
        outputLongEdge: 1400,
        containerClassName: 'h-80 w-full max-w-2xl',
      };
  }
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
  previewContext,
  showLayoutPreview = true,
}) => {
  const [cropSource, setCropSource] = useState<string | null>(null);
  const cfg = useMemo(() => cropConfig(preview), [preview]);

  const storedUrl = value?.trim() ?? '';
  const previewSrc = (cropSource ?? storedUrl) || ABOUT_SITE_IMAGE_PLACEHOLDER;

  const handleError = (msg: string) => {
    onUploadError?.(msg);
    if (!onUploadError) window.alert(msg);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {description ? <p className="text-xs text-gray-500 mb-2">{description}</p> : null}
      </div>

      {cropSource ? (
        <AboutCropEditor
          sourceUrl={cropSource}
          aspectW={cfg.aspectW}
          aspectH={cfg.aspectH}
          folder={folder}
          tags={['about-site', 'cropped']}
          outputLongEdge={cfg.outputLongEdge}
          containerClassName={cfg.containerClassName}
          onComplete={(url) => {
            onChange(url);
            setCropSource(null);
          }}
          onCancel={() => setCropSource(null)}
          onError={handleError}
        />
      ) : (
        <>
          <Uploader
            folder={folder}
            tags={['about-site']}
            buttonLabel={storedUrl ? 'Replace image' : 'Upload image'}
            onComplete={(u) => setCropSource(u.url)}
            onError={handleError}
          />
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm"
            placeholder="Or paste image URL"
          />
          {storedUrl ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCropSource(storedUrl)}
                className="text-sm text-blue-700 hover:text-blue-900 underline underline-offset-2"
              >
                Adjust framing (crop & zoom)
              </button>
            </div>
          ) : null}
        </>
      )}

      {showLayoutPreview ? (
        <div className="mt-3">
          <AboutSiteLayoutPreview preview={preview} previewSrc={previewSrc} context={previewContext} />
        </div>
      ) : null}
    </div>
  );
};

export default AboutSiteImageField;
