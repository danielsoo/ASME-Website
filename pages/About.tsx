import React, { useState, useEffect } from 'react';
import { PROJECTS } from '../src/constants';
import { getExecBoard, getDesignTeam, updateTeamMemberOrder } from '../src/firebase/services';
import { TeamMember } from '../src/types';
import TeamCard from '../src/components/TeamCard';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../src/firebase/config';
import type { AboutContent, GeneralBodyContent, DesignTeamContent } from '../src/types';
import { DEFAULT_ABOUT, DEFAULT_GENERAL_BODY, DEFAULT_DESIGN_TEAM } from '../src/types';
import { sanitizeHtml, isHtmlString } from '../src/utils/sanitizeHtml';

interface AboutProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

/** Render paragraph content: HTML (from rich editor) or plain text with optional "visit this link" link. */
function renderParagraph(content: string | undefined, linkUrl?: string): React.ReactNode {
  const c = content ?? '';
  if (isHtmlString(c)) {
    return <div className="about-rich-content prose prose-p:my-2 max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(c) }} />;
  }
  if (linkUrl && c.includes('visit this link')) {
    const parts = c.split('visit this link');
    return <>{parts[0]}<a href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">visit this link</a>{parts.slice(1).join('visit this link')}</>;
  }
  return c;
}

/** Render title that may be HTML from rich editor. */
function renderTitle(content: string | undefined, fallback: string): React.ReactNode {
  const c = content ?? fallback;
  if (!c) return fallback;
  if (isHtmlString(c)) {
    return <span className="about-rich-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(c) }} />;
  }
  return c;
}

const About: React.FC<AboutProps> = ({ currentPath = '/about', onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'design'>('general');
  const [showPastProjects, setShowPastProjects] = useState(false);
  const [execBoard, setExecBoard] = useState<TeamMember[]>([]);
  const [designTeam, setDesignTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [aboutContent, setAboutContent] = useState<AboutContent>({ ...DEFAULT_ABOUT });
  const [generalBodyContent, setGeneralBodyContent] = useState<GeneralBodyContent>({ ...DEFAULT_GENERAL_BODY });
  const [designTeamContent, setDesignTeamContent] = useState<DesignTeamContent>({ ...DEFAULT_DESIGN_TEAM });

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

  // Load data from Firebase
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [execData, designData] = await Promise.all([
          getExecBoard(),
          getDesignTeam()
        ]);
        setExecBoard(execData);
        setDesignTeam(designData);
      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to constants if Firebase fails
        const { EXEC_BOARD, DESIGN_TEAM } = await import('../src/constants');
        setExecBoard(EXEC_BOARD);
        setDesignTeam(DESIGN_TEAM);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const canEdit = userRole === 'President' || userRole === 'Vice President';

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    // Determine which team to reorder based on current path
    const currentTeam = (currentPath === '/about/designteam') ? designTeam : execBoard;
    const newOrder = [...currentTeam];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);

    if (currentPath === '/about/designteam') {
      setDesignTeam(newOrder);
    } else {
      setExecBoard(newOrder);
    }
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;
    
    setDraggedIndex(null);
    
    // Auto-save the new order to Firebase
    try {
      if (currentPath === '/about/designteam') {
        await updateTeamMemberOrder(designTeam, 'designTeam');
      } else {
        await updateTeamMemberOrder(execBoard, 'execBoard');
      }
    } catch (error) {
      console.error('Error saving order:', error);
      // Reload data on error
      try {
        const [execData, designData] = await Promise.all([
          getExecBoard(),
          getDesignTeam()
        ]);
        setExecBoard(execData);
        setDesignTeam(designData);
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

  // If on /about/generalbody route, show only About Us section with Executive Board
  if (currentPath === '/about/generalbody') {
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
            ) : execBoard.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-gray-600">No members found.</div>
            ) : (
              execBoard.map((member, index) => (
                <div
                  key={member.id}
                  draggable={canEdit}
                  onDragStart={(e) => handleDragStart(e, index)}
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
  if (currentPath === '/about/designteam') {
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
                  src={designTeamContent.leftImageUrl || 'https://picsum.photos/seed/designteam/800/600'} 
                  className="w-full h-auto rounded-lg border-2 border-blue-300" 
                  alt="Our Design Team" 
                />
              </div>
              <h2
                className="text-3xl font-bold text-black mb-6 underline"
                style={{
                  fontFamily: designTeamContent.sectionTitleFontFamily || undefined,
                  fontWeight: designTeamContent.sectionTitleFontWeight ? Number(designTeamContent.sectionTitleFontWeight) : undefined,
                }}
              >
                {renderTitle(designTeamContent.sectionTitle ?? aboutContent.aboutTitle, 'Our Design Team')}
              </h2>
              <div
                className="space-y-4 text-gray-800 leading-relaxed"
                style={{
                  fontFamily: designTeamContent.introFontFamily || undefined,
                  fontWeight: designTeamContent.introFontWeight ? Number(designTeamContent.introFontWeight) : undefined,
                }}
              >
                {designTeamContent.introParagraph1 != null && designTeamContent.introParagraph1 !== '' ? (
                  <>
                    <div className="font-jost">
                      {isHtmlString(designTeamContent.introParagraph1)
                        ? <div className="about-rich-content prose prose-p:my-2 max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(designTeamContent.introParagraph1) }} />
                        : designTeamContent.introParagraph1.includes('85,000 members')
                          ? designTeamContent.introParagraph1.split('85,000 members').reduce<React.ReactNode[]>((acc, part, i, arr) => {
                              acc.push(part);
                              if (i < arr.length - 1) acc.push(<span key={i} className="text-asme-red font-bold">85,000 members</span>);
                              return acc;
                            }, [])
                          : designTeamContent.introParagraph1}
                    </div>
                    {designTeamContent.introParagraph2 != null && designTeamContent.introParagraph2 !== '' && (
                      <div className="font-jost">{renderParagraph(designTeamContent.introParagraph2)}</div>
                    )}
                    {designTeamContent.introParagraph3 != null && designTeamContent.introParagraph3 !== '' && (
                      <div className="font-jost">{renderParagraph(designTeamContent.introParagraph3, designTeamContent.introLinkUrl)}</div>
                    )}
                    {designTeamContent.introParagraph4 != null && designTeamContent.introParagraph4 !== '' && (
                      <div className="font-jost">{renderParagraph(designTeamContent.introParagraph4)}</div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="font-jost">{renderParagraph(aboutContent.aboutParagraph1)}</div>
                    <div className="font-jost">{renderParagraph(aboutContent.aboutParagraph2, aboutContent.aboutLinkUrl)}</div>
                  </>
                )}
              </div>
              
              {/* Past Projects Dropdown */}
              <div className="mt-8">
                <button
                  onClick={() => setShowPastProjects(!showPastProjects)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-200 border border-gray-300 rounded-lg hover:bg-gray-300 transition-colors font-jost"
                >
                  <span className="text-gray-800 font-medium">{renderTitle(designTeamContent.pastProjectsTitle, 'Past Projects')}</span>
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
              <h2 className="text-3xl font-jost font-bold text-[#1E2B48] mb-6 underline">{renderTitle(designTeamContent.currentProjectsTitle, 'Fall 2025 Projects')}</h2>
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
                  onDragStart={(e) => handleDragStart(e, index)}
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
             <div className="w-full md:w-1/3 h-64 bg-slate-700 rounded-lg">
                 {/* Placeholder for About Image */}
                 <img src="https://picsum.photos/seed/about/800/600" className="w-full h-full object-cover rounded-lg opacity-80" alt="About Us" />
             </div>
             
             <div className="w-full md:w-2/3 text-white font-jost">
                 <h2 className="text-[#1E2B48] text-3xl font-bold mb-6">{renderTitle(aboutContent.aboutTitle, 'About Us')}</h2>
                 <div
                     className="text-gray-800 leading-relaxed mb-4"
                     style={{
                       fontFamily: aboutContent.paragraphFontFamily || undefined,
                       fontWeight: aboutContent.paragraphFontWeight ? Number(aboutContent.paragraphFontWeight) : undefined,
                     }}
                 >
                     {renderParagraph(aboutContent.aboutParagraph1)}
                 </div>
                 <div
                     className="text-gray-800 leading-relaxed"
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

      {/* Our Teams Section */}
      <div className="bg-[#e5e7eb] py-16 px-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-jost font-bold text-[#1E2B48] text-center mb-12">
            Our Teams
          </h2>

          <div className="space-y-8 ">
          {/* General Body */}
          <div
            className="relative group cursor-pointer overflow-hidden rounded-xl h-48 w-full shadow-md"
            onClick={navigateToGeneralBody}
          >
            <img
              src="https://picsum.photos/seed/team1/800/600"
              alt="General Body"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <h3 className="text-3xl font-bold font-jost text-white">
                General Body
              </h3>
            </div>
          </div>

          {/* Design Team */}
          <div
            className="relative group cursor-pointer overflow-hidden rounded-xl h-48 w-full shadow-md"
            onClick={navigateToDesignTeam}
          >
            <img
              src="https://picsum.photos/seed/team2/800/600"
              alt="Design Team"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <h3 className="text-3xl font-bold font-jost text-white">
                Design Team
              </h3>
            </div>
          </div>
        </div>
      </div>
    </div>


    </div>
  );
};

export default About;
