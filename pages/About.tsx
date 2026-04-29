import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PROJECTS } from '../src/constants';
import {
  subscribeMembersForTeam,
  subscribeExecutiveBoardMembers,
  getExecBoard,
  getDesignTeam,
  updateTeamMemberOrder,
} from '../src/firebase/services';
import {
  subscribeTeamSettings,
  DEFAULT_TEAM_SETTINGS,
  type TeamSettings,
} from '../src/firebase/teamSettings';
import { TeamMember } from '../src/types';
import TeamCard from '../src/components/TeamCard';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../src/firebase/config';
import type { AboutContent, AboutTeamBlocksDoc, GeneralBodyContent, DesignTeamContent } from '../src/types';
import { DEFAULT_ABOUT, DEFAULT_GENERAL_BODY, DEFAULT_DESIGN_TEAM, EMPTY_GENERAL_BODY_FORM } from '../src/types';
import {
  renderAboutParagraph as renderParagraph,
  renderAboutTitle as renderTitle,
  renderDesignTeamIntroBlock,
} from '../src/utils/aboutRichRender';
import { repairMidWordBreaks, normalizeParagraphText } from '../src/utils/textWrapNormalize';
/** Public page: empty stored fields fall back to defaults so new/blank team blocks still look reasonable. */
function mergeTeamBlockForDisplay(
  stored: DesignTeamContent | undefined,
  base: DesignTeamContent = DEFAULT_DESIGN_TEAM
): DesignTeamContent {
  const out = { ...base };
  if (!stored) return out;
  (Object.keys(stored) as (keyof DesignTeamContent)[]).forEach((k) => {
    const v = stored[k];
    if (v !== undefined && String(v).trim() !== '') {
      (out as Record<string, unknown>)[k] = v;
    }
  });
  return out;
}

function normalizeTeamBlockFromFirestore(raw: unknown): GeneralBodyContent {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_GENERAL_BODY_FORM };
  const o = raw as Record<string, unknown>;
  if ('introParagraph1' in o || 'introParagraph2' in o) {
    return {
      ...EMPTY_GENERAL_BODY_FORM,
      leftImageUrl: typeof o.leftImageUrl === 'string' ? o.leftImageUrl : '',
    };
  }
  return { ...EMPTY_GENERAL_BODY_FORM, ...(raw as GeneralBodyContent) };
}

/** Public About: unfilled team fields use DEFAULT_GENERAL_BODY sample content. */
function mergeGeneralBodyForDisplay(
  stored: GeneralBodyContent | undefined,
  base: GeneralBodyContent = DEFAULT_GENERAL_BODY
): GeneralBodyContent {
  const out = { ...base };
  if (!stored) return out;
  (['activitiesTitle', 'leftImageUrl', 'pastEventsTitle', 'bodySectionTitle'] as const).forEach((k) => {
    const v = stored[k];
    if (v !== undefined && String(v).trim() !== '') {
      out[k] = v;
    }
  });
  const al = stored.activitiesList;
  if (Array.isArray(al) && al.length > 0 && al.some((x) => String(x).trim() !== '')) {
    out.activitiesList = al.map((x) => String(x)).filter((x) => x.trim() !== '');
  }
  const pl = stored.pastEventsList;
  if (Array.isArray(pl) && pl.length > 0 && pl.some((x) => String(x).trim() !== '')) {
    out.pastEventsList = pl.map((x) => String(x)).filter((x) => x.trim() !== '');
  }
  return out;
}

interface AboutProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

const TEAM_PATH_PREFIX = '/about/team/';
/** Reorder key for Executive Board drag on /about and /about/generalbody (not a real team name). */
const EXEC_REORDER_KEY = '__executive_board__';

function normalizeAboutPath(path: string): string {
  return path.split('#')[0] ?? path;
}

/** e.g. `/about/team/Design%20Team` → `Design Team` */
export function parseTeamFromAboutPath(path: string): string | null {
  const p = normalizeAboutPath(path);
  if (!p.startsWith(TEAM_PATH_PREFIX)) return null;
  const rest = p.slice(TEAM_PATH_PREFIX.length);
  if (!rest) return null;
  try {
    return decodeURIComponent(rest);
  } catch {
    return null;
  }
}

export function teamAboutPath(teamName: string): string {
  return `${TEAM_PATH_PREFIX}${encodeURIComponent(teamName.trim())}`;
}

const About: React.FC<AboutProps> = ({ currentPath = '/about', onNavigate }) => {
  const [showPastProjects, setShowPastProjects] = useState(false);
  const [membersByTeam, setMembersByTeam] = useState<Record<string, TeamMember[]>>({});
  const [aboutTeamBlocks, setAboutTeamBlocks] = useState<Record<string, GeneralBodyContent>>({});
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [aboutContent, setAboutContent] = useState<AboutContent>({ ...DEFAULT_ABOUT });
  const [generalBodyContent, setGeneralBodyContent] = useState<GeneralBodyContent>({ ...DEFAULT_GENERAL_BODY });
  const [designTeamContent, setDesignTeamContent] = useState<DesignTeamContent>({ ...DEFAULT_DESIGN_TEAM });
  const [teamSettings, setTeamSettings] = useState<TeamSettings>(DEFAULT_TEAM_SETTINGS);
  const [executiveBoardMembers, setExecutiveBoardMembers] = useState<TeamMember[]>([]);
  /** Main About: which team board tab is visible (index into teamNames). */
  const [activeBoardTabIndex, setActiveBoardTabIndex] = useState(0);
  /** Which list is being reordered (EXEC_REORDER_KEY or a team name). Set on drag start. */
  const reorderContextRef = useRef<string | null>(null);

  // Check user permissions
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role || 'member');
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        }
      } else {
        setUserRole('');
      }
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to config/about for main About Us block
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'about'), (snap) => {
      const data = snap.exists() ? { ...DEFAULT_ABOUT, ...(snap.data() as AboutContent) } : { ...DEFAULT_ABOUT };
      setAboutContent(data);
    }, (e) => {
      console.error('About config subscription error:', e);
      setAboutContent({ ...DEFAULT_ABOUT });
    });
    return () => unsub();
  }, []);

  // Subscribe to config/aboutGeneralBody and config/aboutDesignTeam
  useEffect(() => {
    const unsubGb = onSnapshot(doc(db, 'config', 'aboutGeneralBody'), (snap) => {
      const data = snap.exists() ? { ...DEFAULT_GENERAL_BODY, ...(snap.data() as GeneralBodyContent) } : { ...DEFAULT_GENERAL_BODY };
      setGeneralBodyContent(data);
    }, (e) => {
      console.error('General Body config subscription error:', e);
      setGeneralBodyContent({ ...DEFAULT_GENERAL_BODY });
    });
    const unsubDt = onSnapshot(doc(db, 'config', 'aboutDesignTeam'), (snap) => {
      const data = snap.exists() ? { ...DEFAULT_DESIGN_TEAM, ...(snap.data() as DesignTeamContent) } : { ...DEFAULT_DESIGN_TEAM };
      setDesignTeamContent(data);
    }, (e) => {
      console.error('Design Team config subscription error:', e);
      setDesignTeamContent({ ...DEFAULT_DESIGN_TEAM });
    });
    return () => {
      unsubGb();
      unsubDt();
    };
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'aboutTeamBlocks'), (snap) => {
      const raw = snap.exists() ? (snap.data() as AboutTeamBlocksDoc).blocks : undefined;
      if (!raw) {
        setAboutTeamBlocks({});
        return;
      }
      const next: Record<string, GeneralBodyContent> = {};
      Object.keys(raw).forEach((k) => {
        next[k] = normalizeTeamBlockFromFirestore(raw[k]);
      });
      setAboutTeamBlocks(next);
    }, (e) => {
      console.error('aboutTeamBlocks subscription error:', e);
      setAboutTeamBlocks({});
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    return subscribeTeamSettings(
      setTeamSettings,
      (e) => console.error('teamSettings subscription error:', e)
    );
  }, []);

  useEffect(() => {
    return subscribeExecutiveBoardMembers(
      setExecutiveBoardMembers,
      (e) => console.error('subscribeExecutiveBoardMembers error:', e)
    );
  }, []);

  // Live sync: each team label gets its own member list (order: designOrder for design team, execOrder otherwise)
  useEffect(() => {
    const names = teamSettings.teamNames ?? [];
    if (names.length === 0) {
      setMembersByTeam({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const pending = new Set(names);
    const unsubs = names.map((teamName) => {
      const orderField =
        teamName === teamSettings.designTeamTeamName ? 'designOrder' : 'execOrder';
      return subscribeMembersForTeam(
        teamName,
        orderField,
        (list) => {
          setMembersByTeam((prev) => ({ ...prev, [teamName]: list }));
          pending.delete(teamName);
          if (pending.size === 0) setLoading(false);
        },
        (err) => {
          console.error('subscribeMembersForTeam error:', teamName, err);
          setMembersByTeam((prev) => ({ ...prev, [teamName]: [] }));
          pending.delete(teamName);
          if (pending.size === 0) setLoading(false);
        }
      );
    });
    return () => {
      unsubs.forEach((u) => u());
    };
  }, [JSON.stringify(teamSettings.teamNames), teamSettings.designTeamTeamName]);

  useEffect(() => {
    const n = teamSettings.teamNames?.length ?? 0;
    if (n === 0) return;
    setActiveBoardTabIndex((i) => Math.min(Math.max(0, i), n - 1));
  }, [JSON.stringify(teamSettings.teamNames)]);

  const designTeam = membersByTeam[teamSettings.designTeamTeamName] ?? [];
  const mergedDesignBlock = useMemo(
    () => mergeTeamBlockForDisplay(designTeamContent, DEFAULT_DESIGN_TEAM),
    [designTeamContent]
  );

  const mergedTeamGeneralBody = (teamName: string): GeneralBodyContent =>
    mergeGeneralBodyForDisplay(aboutTeamBlocks[teamName], DEFAULT_GENERAL_BODY);

  /** Our Teams tile + /about/team/:name hero: Design Team falls back to aboutDesignTeam image when team block has no photo. */
  const heroOrTileImageForTeam = (teamName: string): string => {
    const fallback = 'https://picsum.photos/seed/about/800/600';
    if (teamName === teamSettings.execBoardTeamName) {
      return generalBodyContent.leftImageUrl?.trim() || fallback;
    }
    if (teamName === teamSettings.designTeamTeamName) {
      const fromBlock = aboutTeamBlocks[teamName]?.leftImageUrl?.trim();
      const fromDesignPage = mergedDesignBlock.leftImageUrl?.trim();
      return fromBlock || fromDesignPage || DEFAULT_GENERAL_BODY.leftImageUrl || fallback;
    }
    return mergedTeamGeneralBody(teamName).leftImageUrl?.trim() || DEFAULT_GENERAL_BODY.leftImageUrl || fallback;
  };

  /** Team board tabs: Executive (exec team) always first, then others in config order. */
  const boardTabTeamOrder = useMemo(() => {
    const names = teamSettings.teamNames ?? [];
    const exec = teamSettings.execBoardTeamName;
    if (names.length === 0) return [];
    if (!names.includes(exec)) return names;
    return [exec, ...names.filter((t) => t !== exec)];
  }, [JSON.stringify(teamSettings.teamNames), teamSettings.execBoardTeamName]);

  const path = normalizeAboutPath(currentPath);

  const canEdit = userRole === 'President' || userRole === 'Vice President';

  const handleDragStart = (e: React.DragEvent, index: number, reorderKey: string) => {
    reorderContextRef.current = reorderKey;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const teamKey = reorderContextRef.current;
    if (!teamKey) return;

    if (teamKey === EXEC_REORDER_KEY) {
      const currentTeam = executiveBoardMembers;
      const newOrder = [...currentTeam];
      const draggedItem = newOrder[draggedIndex];
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(index, 0, draggedItem);
      setExecutiveBoardMembers(newOrder);
      setDraggedIndex(index);
      return;
    }

    const currentTeam = membersByTeam[teamKey] ?? [];
    const newOrder = [...currentTeam];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);

    setMembersByTeam((prev) => ({ ...prev, [teamKey]: newOrder }));
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;
    const teamKey = reorderContextRef.current;
    reorderContextRef.current = null;
    setDraggedIndex(null);
    if (!teamKey) return;

    if (teamKey === EXEC_REORDER_KEY) {
      try {
        await updateTeamMemberOrder(executiveBoardMembers, 'execBoard');
      } catch (error) {
        console.error('Error saving order:', error);
        try {
          setExecutiveBoardMembers(await getExecBoard());
        } catch (reloadError) {
          console.error('Error reloading data:', reloadError);
        }
      }
      return;
    }

    const list = membersByTeam[teamKey] ?? [];
    const orderKind =
      teamKey === teamSettings.designTeamTeamName ? 'designTeam' : 'execBoard';

    try {
      await updateTeamMemberOrder(list, orderKind);
    } catch (error) {
      console.error('Error saving order:', error);
      try {
        const [execData, designData] = await Promise.all([
          getExecBoard(),
          getDesignTeam(),
        ]);
        setExecutiveBoardMembers(execData);
        setMembersByTeam((prev) => ({
          ...prev,
          [teamSettings.designTeamTeamName]: designData,
        }));
      } catch (reloadError) {
        console.error('Error reloading data:', reloadError);
      }
    }
  };

  const navigateToAbout = () => {
    if (onNavigate) {
      onNavigate('/about');
    }
  };
  const navigateToGeneralBody = () => {
    if (onNavigate) {
      onNavigate('/about/generalbody');
    }
  };
  
  const navigateToDesignTeam = () => {
    if (onNavigate) {
      onNavigate('/about/designteam');
    }
  };

  const routeTeam = parseTeamFromAboutPath(path);

  if (routeTeam != null) {
    if (!teamSettings.teamNames.includes(routeTeam)) {
      return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-8">
          <p className="text-lg font-jost text-gray-700 mb-8">Team not found.</p>
          <button
            type="button"
            onClick={navigateToAbout}
            className="px-6 py-2 rounded-lg font-jost text-sm font-medium bg-[#3b4c6b] text-white hover:opacity-90"
          >
            Back to About
          </button>
        </div>
      );
    }

    const isExec = routeTeam === teamSettings.execBoardTeamName;
    const isDesign = routeTeam === teamSettings.designTeamTeamName;
    const gb = mergedTeamGeneralBody(routeTeam);
    const members = membersByTeam[routeTeam] ?? [];
    const boardHeading = isExec ? 'Executive Board' : isDesign ? 'Design Board' : `${routeTeam} Board`;

    return (
      <div className="min-h-screen bg-white pb-20">
        <div className="container mx-auto px-16 pt-8">
          <div className="flex flex-wrap gap-1 bg-[#DEE7ED] p-1 rounded-lg w-fit max-w-full mb-12 mx-auto md:mx-0 shadow-md">
            <button
              type="button"
              onClick={navigateToAbout}
              className="px-6 py-2 rounded-md font-jost text-sm font-medium transition-all text-gray-400 hover:text-[#48597F]"
            >
              Back
            </button>
            {teamSettings.teamNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onNavigate?.(teamAboutPath(name))}
                className={`px-6 py-2 rounded-md font-jost text-sm font-medium transition-all ${
                  name === routeTeam
                    ? 'bg-[#3b4c6b] text-white shadow'
                    : 'text-gray-400 hover:text-[#48597F]'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {isExec ? (
          <>
            <div className="bg-gray-100 pb-16 px-16">
              <div className="container mx-auto px-4 pt-4">
                <div className="flex flex-col md:flex-row gap-12 items-start">
                  <div className="w-full md:w-1/2">
                    <div className="mb-6">
                      <img
                        src={generalBodyContent.leftImageUrl || 'https://picsum.photos/seed/about/800/600'}
                        className="w-full h-auto rounded-lg border-2 border-blue-300"
                        alt="Our General Body"
                      />
                    </div>
                  </div>
                  <div className="w-full md:w-1/2">
                    <h2 className="text-3xl font-jost font-bold text-black mb-6 underline">
                      {renderTitle(generalBodyContent.activitiesTitle, 'Our Activities')}
                    </h2>
                    <ul className="space-y-4 font-jost">
                      {(generalBodyContent.activitiesList ?? []).map((item, idx) => (
                        <li key={idx} className="text-gray-800 text-lg">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="mt-8">
                  <h2 className="text-3xl font-jost font-bold text-black mb-6 underline">
                    {renderTitle(generalBodyContent.bodySectionTitle ?? aboutContent.aboutTitle, 'Our General Body')}
                  </h2>
                  <div className="space-y-4 text-gray-800 leading-relaxed font-jost">
                    <p className="break-words">{renderParagraph(aboutContent.aboutParagraph1)}</p>
                    <p className="break-words">{renderParagraph(aboutContent.aboutParagraph2, aboutContent.aboutLinkUrl)}</p>
                  </div>
                  <div className="mt-8">
                    <h3 className="text-xl font-jost font-bold text-black mb-4">
                      {renderTitle(generalBodyContent.pastEventsTitle, 'Past Events')}
                    </h3>
                    <div className="bg-white border border-gray-300 rounded-lg p-4">
                      <ul className="space-y-2 font-jost text-gray-800">
                        {(generalBodyContent.pastEventsList ?? []).map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-gray-100 pb-16 px-16">
              <div className="container mx-auto px-4 pt-4">
                <div className="flex flex-col md:flex-row gap-12 items-start">
                  <div className="w-full md:w-1/2">
                    <div className="mb-6">
                      <img
                        src={heroOrTileImageForTeam(routeTeam)}
                        className="w-full h-auto rounded-lg border-2 border-blue-300"
                        alt={routeTeam}
                      />
                    </div>
                  </div>
                  <div className="w-full md:w-1/2">
                    <h2 className="text-3xl font-jost font-bold text-black mb-6 underline">{renderTitle(gb.activitiesTitle, 'Our Activities')}</h2>
                    <ul className="space-y-4 font-jost">
                      {(gb.activitiesList ?? []).map((item, idx) => (
                        <li key={idx} className="text-gray-800 text-lg">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="mt-8">
                  <h2 className="text-3xl font-jost font-bold text-black mb-6 underline">
                    {renderTitle(gb.bodySectionTitle ?? aboutContent.aboutTitle, routeTeam)}
                  </h2>
                  <div className="space-y-4 text-gray-800 leading-relaxed font-jost">
                    <div>{renderParagraph(aboutContent.aboutParagraph1)}</div>
                    <div>{renderParagraph(aboutContent.aboutParagraph2, aboutContent.aboutLinkUrl)}</div>
                  </div>
                  <div className="mt-8">
                    <h3 className="text-xl font-jost font-bold text-black mb-4">{renderTitle(gb.pastEventsTitle, 'Past Events')}</h3>
                    <div className="bg-white border border-gray-300 rounded-lg p-4">
                      <ul className="space-y-2 font-jost text-gray-800">
                        {(gb.pastEventsList ?? []).map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-[#e5e7eb] py-16">
              <div className="container mx-auto px-16">
                <h2 className="text-3xl font-jost font-bold text-black mb-10 pl-2">{boardHeading}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                  {loading ? (
                    <div className="col-span-2 text-center py-8">Loading...</div>
                  ) : members.length === 0 ? (
                    <div className="col-span-2 text-center py-8 text-gray-600">No members found.</div>
                  ) : (
                    members.map((member, index) => (
                      <div
                        key={member.id}
                        draggable={canEdit}
                        onDragStart={(e) => handleDragStart(e, index, routeTeam)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        style={{ opacity: draggedIndex === index ? 0.5 : 1 }}
                      >
                        <TeamCard
                          member={member}
                          showDragHandle={canEdit}
                          onDragHandleMouseDown={(e) => {
                            e.stopPropagation();
                          }}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // If on /about/generalbody route, show only About Us section with Executive Board
  if (path === '/about/generalbody') {
    return (
      <div className="min-h-screen bg-gray-100 py-12">
        {/* About Us Section - Full page view */}
        <div className="container mx-auto px-16">
                
          {/* Toggle Controls */}
          <div className="flex space-x-1 bg-[#DEE7ED] p-1 rounded-lg w-fit mb-12 mx-auto md:mx-0 shadow-md">
            <button
              onClick={navigateToAbout}
              className={`px-6 py-2 rounded-md font-jost text-sm font-medium transition-all text-gray-400 hover:text-[#48597F]`}
            >
            Back
            </button>
            <button
              onClick={navigateToGeneralBody}
              className={`px-6 py-2 rounded-md font-jost text-sm font-medium transition-all bg-[#3b4c6b] text-white shadow`}
            >
            General Body
            </button>
            <button
              onClick={navigateToDesignTeam}
              className={`px-6 py-2 rounded-md font-jost text-sm font-medium transition-all text-gray-400 hover:text-[#48597F]`}
            >
            Design Team
            </button>
          </div>
        </div>

        <div id="about-us-section" className="bg-gray-100 pb-16 px-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-12 items-start">
            {/* Left Column - Our General Body */}
            <div className="w-full md:w-1/2">
              <div className="mb-6">
                <img 
                  src={generalBodyContent.leftImageUrl || 'https://picsum.photos/seed/about/800/600'} 
                  className="w-full h-auto rounded-lg border-2 border-blue-300" 
                  alt="Our General Body" 
                />
              </div>

            </div>

            {/* Right Column - Our Activities */}
            <div className="w-full md:w-1/2">
              <h2 className="text-3xl font-jost font-bold text-black mb-6 underline">{renderTitle(generalBodyContent.activitiesTitle, 'Our Activities')}</h2>
              <ul className="space-y-4 font-jost">
                {(generalBodyContent.activitiesList ?? []).map((item, i) => (
                  <li key={i} className="text-gray-800 text-lg">• {item}</li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-jost font-bold text-black mb-6 underline">{renderTitle(generalBodyContent.bodySectionTitle ?? aboutContent.aboutTitle, 'Our General Body')}</h2>
              <div className="space-y-4 text-gray-800 leading-relaxed font-jost">
                <div>{renderParagraph(aboutContent.aboutParagraph1)}</div>
                <div>{renderParagraph(aboutContent.aboutParagraph2, aboutContent.aboutLinkUrl)}</div>
              </div>
              
              {/* Past Events - Always visible list (not dropdown) */}
              <div className="mt-8">
                <h3 className="text-xl font-jost font-bold text-black mb-4">{renderTitle(generalBodyContent.pastEventsTitle, 'Past Events')}</h3>
                <div className="bg-white border border-gray-300 rounded-lg p-4">
                  <ul className="space-y-2 font-jost text-gray-800">
                    {(generalBodyContent.pastEventsList ?? []).map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
          </div>
        </div>
      </div>

      {/* Executive Board Section - Same as regular About page */}
      <div className="bg-[#e5e7eb] py-16">
        <div className="container mx-auto px-16">
          <h2 className="text-3xl font-jost font-bold text-black mb-10 pl-4">
            Executive Board
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {loading ? (
              <div className="col-span-2 text-center py-8">Loading...</div>
            ) : executiveBoardMembers.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-gray-600">No members found.</div>
            ) : (
              executiveBoardMembers.map((member, index) => (
                <div
                  key={member.id}
                  draggable={canEdit}
                  onDragStart={(e) => handleDragStart(e, index, EXEC_REORDER_KEY)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  style={{ opacity: draggedIndex === index ? 0.5 : 1 }}
                >
                  <TeamCard
                    member={member}
                    showDragHandle={canEdit}
                    onDragHandleMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      </div>
    );
  }

  // If on /about/designteam route, show Design Team specific content
  if (path === '/about/designteam') {
    // Get current projects (Fall 2025)
    const currentProjects = PROJECTS.filter(p => p.status === 'current');
    const pastProjects = PROJECTS.filter(p => p.status === 'past');

    return (
      <div className="min-h-screen bg-gray-100 py-12">
        {/* Design Team Section - Full page view */}
        <div className="container mx-auto px-16">
                
          {/* Toggle Controls */}
          <div className="flex space-x-1 bg-[#DEE7ED] p-1 rounded-lg w-fit mb-12 mx-auto md:mx-0 shadow-md">
            <button
              onClick={navigateToAbout}
              className={`px-6 py-2 rounded-md font-jost text-sm font-medium transition-all text-gray-400 hover:text-[#48597F]`}
            >
            Back
            </button>
            <button
              onClick={navigateToGeneralBody}
              className={`px-6 py-2 rounded-md font-jost text-sm font-medium transition-all text-gray-400 hover:text-[#48597F]`}
            >
            General Body
            </button>
            <button
              onClick={navigateToDesignTeam}
              className={`px-6 py-2 rounded-md font-jost text-sm font-medium transition-all bg-[#3b4c6b] text-white shadow`}
            >
            Design Team
            </button>
          </div>
        </div> 

        <div id="about-us-section" className="bg-gray-100 pb-16 px-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-12 items-start">
            {/* Left Column - Our Design Team */}
            <div className="w-full md:w-1/2">
              <div className="mb-6">
                <img 
                  src={mergedDesignBlock.leftImageUrl || 'https://picsum.photos/seed/designteam/800/600'} 
                  className="w-full h-auto rounded-lg border-2 border-blue-300" 
                  alt="Our Design Team" 
                />
              </div>
              <h2
                className="text-3xl font-bold text-black mb-6 underline"
                style={{
                  fontFamily: mergedDesignBlock.sectionTitleFontFamily || undefined,
                  fontWeight: mergedDesignBlock.sectionTitleFontWeight ? Number(mergedDesignBlock.sectionTitleFontWeight) : undefined,
                }}
              >
                {renderTitle(mergedDesignBlock.sectionTitle ?? aboutContent.aboutTitle, 'Our Design Team')}
              </h2>
              <div
                className="space-y-4 text-gray-800 leading-relaxed"
                style={{
                  fontFamily: mergedDesignBlock.introFontFamily || undefined,
                  fontWeight: mergedDesignBlock.introFontWeight ? Number(mergedDesignBlock.introFontWeight) : undefined,
                }}
              >
                {renderDesignTeamIntroBlock(mergedDesignBlock, aboutContent)}
              </div>
              
              {/* Past Projects Dropdown */}
              <div className="mt-8">
                <button
                  onClick={() => setShowPastProjects(!showPastProjects)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-200 border border-gray-300 rounded-lg hover:bg-gray-300 transition-colors font-jost"
                >
                  <span className="text-gray-800 font-medium">{renderTitle(mergedDesignBlock.pastProjectsTitle, 'Past Projects')}</span>
                  <svg
                    className={`w-5 h-5 text-gray-600 transition-transform ${showPastProjects ? 'transform rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showPastProjects && (
                  <div className="mt-2 bg-white border border-gray-300 rounded-lg p-4">
                    <ul className="space-y-2 font-jost text-gray-800">
                      {pastProjects.map((project) => (
                        <li key={project.id}>• {project.title}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Current Projects */}
            <div className="w-full md:w-1/2">
              <h2 className="text-3xl font-jost font-bold text-[#1E2B48] mb-6 underline">{renderTitle(mergedDesignBlock.currentProjectsTitle, 'Fall 2025 Projects')}</h2>
              <div className="space-y-3">
                {currentProjects.map((project) => (
                  <button
                    key={project.id}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-jost"
                    onClick={() => {
                      if (onNavigate) {
                        // Navigate to projects page
                        onNavigate('/projects');
                        // Store project ID in sessionStorage for Projects page to read
                        sessionStorage.setItem('scrollToProject', project.id);
                      }
                    }}
                  >
                    <span className="font-medium">{project.title}</span>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Design Board Section - Same as regular About page */}
      <div className="bg-[#e5e7eb] py-16 ">
        <div className="container mx-auto px-16">
          <h2 className="text-3xl font-jost font-bold text-black mb-10 pl-2">
            Design Board
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {loading ? (
              <div className="col-span-2 text-center py-8">Loading...</div>
            ) : designTeam.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-gray-600">No members found.</div>
            ) : (
              designTeam.map((member, index) => (
                <div
                  key={member.id}
                  draggable={canEdit}
                  onDragStart={(e) => handleDragStart(e, index, teamSettings.designTeamTeamName)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  style={{ opacity: draggedIndex === index ? 0.5 : 1 }}
                >
                  <TeamCard
                    member={member}
                    showDragHandle={canEdit}
                    onDragHandleMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      </div>
    );
  }

  // Regular About page view
  return (
    <div className="min-h-screen bg-white pb-20 relative">
      
      {/* Hero / About Us Text */}
      <div className="container mx-auto px-16 py-16">
         <div className="flex flex-col md:flex-row gap-12 items-start">
             <div className="w-full max-w-[344px] aspect-[344/259] shrink-0 bg-slate-700 rounded-lg overflow-hidden mx-auto md:mx-0 md:w-[344px]">
                 <img
                   src={aboutContent.heroImageUrl?.trim() || 'https://picsum.photos/seed/about/800/600'}
                   className="w-full h-full object-cover rounded-lg"
                   alt="About Us"
                 />
             </div>
             
             <div className="w-full min-w-0 flex-1 text-white font-jost overflow-x-hidden">
                 <h2 className="text-[#1E2B48] text-3xl font-bold mb-6">{renderTitle(aboutContent.aboutTitle, 'About Us')}</h2>
                <div
                    className="about-copy text-gray-800 leading-relaxed mb-4"
                     style={{
                       fontFamily: aboutContent.paragraphFontFamily || undefined,
                       fontWeight: aboutContent.paragraphFontWeight ? Number(aboutContent.paragraphFontWeight) : undefined,
                     }}
                 >
                     {renderParagraph(aboutContent.aboutParagraph1)}
                 </div>
                <div
                    className="about-copy text-gray-800 leading-relaxed"
                     style={{
                       fontFamily: aboutContent.paragraphFontFamily || undefined,
                       fontWeight: aboutContent.paragraphFontWeight ? Number(aboutContent.paragraphFontWeight) : undefined,
                     }}
                 >
                     {renderParagraph(aboutContent.aboutParagraph2, aboutContent.aboutLinkUrl)}
                 </div>
             </div>
         </div>
      </div>

      {/* Our Teams — tiles link to full team pages */}
      <div className="bg-[#e5e7eb] py-16 px-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-jost font-bold text-[#1E2B48] text-center mb-12">
            Our Teams
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {teamSettings.teamNames.map((teamName) => {
              const tileImg = heroOrTileImageForTeam(teamName);
              return (
                <div
                  key={teamName}
                  className="relative group cursor-pointer overflow-hidden rounded-xl h-56 md:h-48 w-full shadow-md"
                  onClick={() => onNavigate?.(teamAboutPath(teamName))}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onNavigate?.(teamAboutPath(teamName));
                    }
                  }}
                >
                  <img
                    src={tileImg}
                    alt={teamName}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <h3 className="text-3xl font-bold font-jost text-white">{teamName}</h3>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Team boards: segmented tabs (same classes as General Body / Design Team route toggles) */}
      {boardTabTeamOrder.length > 0 && (
        <div className="border-t border-gray-200 bg-[#e5e7eb] py-10 px-4 sm:px-8">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-2xl sm:text-3xl font-jost font-bold text-[#1E2B48] text-center mb-6">
              Team boards
            </h2>
            <div
              className="flex flex-wrap gap-1 bg-[#DEE7ED] p-1 rounded-lg w-fit max-w-full mb-10 mx-auto md:mx-0 shadow-md justify-center md:justify-start"
              role="tablist"
              aria-label="Team boards"
            >
              {boardTabTeamOrder.map((teamName, i) => {
                const isExecTeam = teamName === teamSettings.execBoardTeamName;
                const isDesignTeam = teamName === teamSettings.designTeamTeamName;
                const tabLabel = isExecTeam
                  ? 'Executive Board'
                  : isDesignTeam
                    ? 'Design Board'
                    : `${teamName} Board`;
                const selected = activeBoardTabIndex === i;
                return (
                  <button
                    key={teamName}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    id={`about-board-tab-${i}`}
                    className={`px-6 py-2 rounded-md font-jost text-sm font-medium transition-all ${
                      selected
                        ? 'bg-[#3b4c6b] text-white shadow'
                        : 'text-gray-400 hover:text-[#48597F]'
                    }`}
                    onClick={() => setActiveBoardTabIndex(i)}
                  >
                    {tabLabel}
                  </button>
                );
              })}
            </div>

            {(() => {
              const teamName = boardTabTeamOrder[activeBoardTabIndex];
              if (!teamName) return null;
              const isExecTeam = teamName === teamSettings.execBoardTeamName;
              const isDesignTeam = teamName === teamSettings.designTeamTeamName;
              const members = membersByTeam[teamName] ?? [];
              const boardHeading = isExecTeam
                ? 'Executive Board'
                : isDesignTeam
                  ? 'Design Board'
                  : `${teamName} Board`;
              const roster = isExecTeam ? executiveBoardMembers : members;
              const reorderKey = isExecTeam ? EXEC_REORDER_KEY : teamName;
              const i = activeBoardTabIndex;

              return (
                <div
                  key={teamName}
                  id={`about-team-${i}`}
                  role="tabpanel"
                  aria-labelledby={`about-board-tab-${i}`}
                >
                  <h3 className="text-xl font-jost font-bold text-black mb-6 text-center sm:text-left pl-0 sm:pl-1">
                    {boardHeading}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {loading ? (
                      <div className="col-span-2 text-center py-8">Loading...</div>
                    ) : roster.length === 0 ? (
                      <div className="col-span-2 text-center py-8 text-gray-600">No members found.</div>
                    ) : (
                      roster.map((member, index) => (
                        <div
                          key={member.id}
                          draggable={canEdit}
                          onDragStart={(e) => handleDragStart(e, index, reorderKey)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragEnd={handleDragEnd}
                          style={{ opacity: draggedIndex === index ? 0.5 : 1 }}
                        >
                          <TeamCard
                            member={member}
                            showDragHandle={canEdit}
                            onDragHandleMouseDown={(e) => {
                              e.stopPropagation();
                            }}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default About;
