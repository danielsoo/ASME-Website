import React, { useState, useEffect, useMemo } from 'react';
import { Project } from '../src/types';
import { getProjects, updateProjectOrder } from '../src/firebase/services';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../src/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import ProjectCard from '../src/components/ProjectCard';
import ProjectDetailPage from './ProjectDetailPage';

interface ProjectsProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

const Projects: React.FC<ProjectsProps> = ({ currentPath = '/projects', onNavigate }) => {
  // Parse view from URL query parameter
  const getViewFromPath = (path: string): 'current' | 'past' => {
    if (path.includes('view=past')) return 'past';
    if (path.includes('view=current')) return 'current';
    return 'current'; // default
  };

  const [view, setView] = useState<'current' | 'past'>(() => getViewFromPath(currentPath));
  const [currentProjects, setCurrentProjects] = useState<Project[]>([]);
  const [pastProjects, setPastProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userNames, setUserNames] = useState<Record<string, string>>({}); // Map of userId/email to name
  const [userRole, setUserRole] = useState<string>('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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

  // Update view when currentPath changes
  useEffect(() => {
    const newView = getViewFromPath(currentPath);
    setView((prevView) => {
      if (newView !== prevView) {
        return newView;
      }
      return prevView;
    });
  }, [currentPath]);

  // Load user names from Firebase
  useEffect(() => {
    const loadUserNames = async () => {
      try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        const nameMap: Record<string, string> = {};
        
        snapshot.forEach((doc) => {
          const userData = doc.data();
          if (userData.email) {
            nameMap[userData.email] = userData.name || userData.email.split('@')[0];
            if (doc.id) {
              nameMap[doc.id] = userData.name || userData.email.split('@')[0];
            }
          }
        });
        
        setUserNames(nameMap);
      } catch (err) {
        console.error('Error loading user names:', err);
      }
    };

    loadUserNames();
  }, []);

  // Load projects from Firebase
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        const allProjects = await getProjects();

        // Filter: show approved projects or projects without approvalStatus (legacy projects)
        // Also exclude deleted projects
        const activeProjects = allProjects.filter(project => {
          const isNotDeleted = !project.deletedAt || project.deletedAt === null;
          const isApproved = !project.approvalStatus || project.approvalStatus === 'approved';
          
          return isNotDeleted && isApproved;
        });

        // Separate into current and past
        setCurrentProjects(activeProjects.filter(p => p.status === 'current'));
        setPastProjects(activeProjects.filter(p => p.status === 'past'));
      } catch (err: any) {
        console.error('Error loading projects:', err);
        console.error('Error details:', {
          code: err?.code,
          message: err?.message,
          stack: err?.stack
        });
        setError(`Failed to load projects: ${err?.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  const canEdit = userRole === 'President' || userRole === 'Vice President';

  // Get the projects for current view
  const filteredProjects = view === 'current' ? currentProjects : pastProjects;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const currentList = view === 'current' ? currentProjects : pastProjects;
    const newOrder = [...currentList];
    const draggedItem = newOrder[draggedIndex];
    
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);

    if (view === 'current') {
      setCurrentProjects(newOrder);
    } else {
      setPastProjects(newOrder);
    }
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;
    
    setDraggedIndex(null);
    
    // Auto-save the new order to Firebase
    try {
      const projectsToSave = view === 'current' ? currentProjects : pastProjects;
      await updateProjectOrder(projectsToSave);
    } catch (error) {
      console.error('Error saving order:', error);
      // Reload data on error
      try {
        const allProjects = await getProjects();
        const activeProjects = allProjects.filter(project => {
          const isNotDeleted = !project.deletedAt || project.deletedAt === null;
          const isApproved = !project.approvalStatus || project.approvalStatus === 'approved';
          return isNotDeleted && isApproved;
        });
        setCurrentProjects(activeProjects.filter(p => p.status === 'current'));
        setPastProjects(activeProjects.filter(p => p.status === 'past'));
      } catch (reloadError) {
        console.error('Error reloading data:', reloadError);
      }
    }
  };

  // Check if we're on a project detail page (e.g., /projects/solar-panel-optimization)
  const getProjectFromPath = (path: string): Project | null => {
    try {
      if (!path || path === '/projects' || path === '/projects/') return null;
      
      // Remove query parameters before parsing
      const pathWithoutQuery = path.split('?')[0];
      
      // Remove leading slash and split
      const cleanPath = pathWithoutQuery.startsWith('/') ? pathWithoutQuery.slice(1) : pathWithoutQuery;
      const pathParts = cleanPath.split('/').filter(p => p); // Remove empty strings
      
      if (pathParts.length < 2 || pathParts[0] !== 'projects') return null;
      
      const projectSlug = pathParts[1];
      
      // Skip if it's a view parameter (current/past)
      if (projectSlug === 'current' || projectSlug === 'past') return null;
      
      // Find project by matching slug (title converted to slug)
      // Only search in approved or legacy (no approvalStatus), non-deleted projects
      const allProjects = [...currentProjects, ...pastProjects];
      const activeProjects = allProjects.filter(p => {
        const isNotDeleted = !p.deletedAt || p.deletedAt === null;
        const isApproved = !p.approvalStatus || p.approvalStatus === 'approved';
        return isNotDeleted && isApproved;
      });
      
      const project = activeProjects.find(p => {
        const slug = (p.title || '').replace(/<[^>]*>/g, '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        return slug === projectSlug || p.id === projectSlug;
      });
      
      if (!project) {
        // Project not found for slug - return null (404 handled by UI)
      }

      return project || null;
    } catch (error) {
      console.error('Error parsing project path:', error);
      return null;
    }
  };

  // Use useMemo to ensure projectDetail is recalculated when currentPath or projects change
  const projectDetail = useMemo(() => getProjectFromPath(currentPath), [currentPath, currentProjects, pastProjects]);

  // Handle scrolling to specific project from sessionStorage or URL hash
  // IMPORTANT: This useEffect must be called before any conditional return to follow React Hooks rules
  useEffect(() => {
    // Check sessionStorage first (set from About page)
    const projectIdFromStorage = sessionStorage.getItem('scrollToProject');
    if (projectIdFromStorage) {
      sessionStorage.removeItem('scrollToProject');
      // Wait for component to render, then scroll
      setTimeout(() => {
        const projectElement = document.getElementById(`project-${projectIdFromStorage}`);
        if (projectElement) {
          projectElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Highlight the project briefly
          projectElement.style.transition = 'box-shadow 0.3s';
          projectElement.style.boxShadow = '0 0 20px rgba(59, 76, 107, 0.5)';
          setTimeout(() => {
            projectElement.style.boxShadow = '';
          }, 2000);
        }
      }, 200);
      return;
    }

    // Fallback: check URL hash
    const hash = window.location.hash.slice(1); // Remove the #
    if (hash && hash.startsWith('project-')) {
      const projectId = hash.replace('project-', '');
      // Wait for component to render, then scroll
      setTimeout(() => {
        const projectElement = document.getElementById(`project-${projectId}`);
        if (projectElement) {
          projectElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Highlight the project briefly
          projectElement.style.transition = 'box-shadow 0.3s';
          projectElement.style.boxShadow = '0 0 20px rgba(59, 76, 107, 0.5)';
          setTimeout(() => {
            projectElement.style.boxShadow = '';
          }, 2000);
        }
      }, 200);
    }
  }, [view]); // Re-run when view changes

  // If we're on a project detail page, show the detail page
  // IMPORTANT: This conditional return must come AFTER all hooks to follow React Hooks rules
  // Wait for projects to load before showing detail page
  if (!loading && currentPath && currentPath !== '/projects' && currentPath !== '/projects/' && !currentPath.includes('?view=')) {
    if (projectDetail) {
      if (!onNavigate) {
        console.error('onNavigate is required for project detail page');
        return (
          <div 
            className="min-h-screen bg-[#0f131a] flex items-center justify-center relative"
            style={{
              minHeight: 'calc(100vh + 140px)',
              marginTop: '-140px',
              paddingTop: '140px',
            }}
          >
            <p className="text-white">Error: Navigation not available</p>
          </div>
        );
      }
      // Add leader name to project for display
    const projectDetailWithLeaderName = projectDetail ? {
      ...projectDetail,
      leaderName: projectDetail.leaderId 
        ? userNames[projectDetail.leaderId] 
        : projectDetail.leaderEmail 
        ? userNames[projectDetail.leaderEmail] || projectDetail.leaderEmail.split('@')[0]
        : undefined
    } : null;
    
    return projectDetailWithLeaderName ? <ProjectDetailPage project={projectDetailWithLeaderName} onNavigate={onNavigate} /> : null;
    } else if (!loading && Projects.length > 0) {
      // Projects loaded but not found - show error
      return (
        <div 
          className="min-h-screen bg-[#0f131a] flex items-center justify-center relative"
          style={{
            minHeight: 'calc(100vh + 140px)',
            marginTop: '-140px',
            paddingTop: '140px',
          }}
        >
          <div className="text-center">
            <p className="text-white text-xl mb-4">Project not found</p>
            <button
              onClick={() => onNavigate?.('/projects')}
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Back to Projects
            </button>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#0f131a] relative">
      {/* Content */}
      <div className="bg-gray-100 min-h-screen py-12 relative">
        <div className="w-full max-w-6xl mx-auto px-[clamp(1rem,5vw,4rem)]">
          
          {/* Toggle Controls */}
          <div className="flex space-x-1 bg-[#DEE7ED] p-1 rounded-lg w-fit mb-12 mx-auto md:mx-0 shadow-md">
            <button
              onClick={() => {
                setView('current');
                if (onNavigate) {
                  onNavigate('/projects?view=current');
                }
              }}
              className={`px-6 py-2 rounded-md font-jost text-sm font-medium transition-all ${
                view === 'current' ? 'bg-[#3b4c6b] text-white shadow' : 'text-gray-400 hover:text-[#48597F]'
              }`}
            >
              Projects
            </button>
            <button
              onClick={() => {
                setView('past');
                if (onNavigate) {
                  onNavigate('/projects?view=past');
                }
              }}
              className={`px-6 py-2 rounded-md font-jost text-sm font-medium transition-all ${
                view === 'past' ? 'bg-[#3b4c6b] text-white shadow' : 'text-gray-400 hover:text-[#48597F]'
              }`}
            >
              Past Projects
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center text-gray-500 py-20 font-jost">
              Loading projects...
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="text-center text-red-500 py-20 font-jost">
              {error}
            </div>
          )}

          {/* Project List */}
          {!loading && !error && (
            <div className="px-4 md:px-8 lg:px-12">
              {filteredProjects.length > 0 ? (
                <>
                  {/* Mobile/tablet: single column in source order */}
                  <div className="lg:hidden space-y-8">
                    {filteredProjects.map((project) => {
                      const projectWithLeaderName = {
                        ...project,
                        leaderName: project.leaderId
                          ? userNames[project.leaderId]
                          : project.leaderEmail
                          ? userNames[project.leaderEmail] || project.leaderEmail.split('@')[0]
                          : undefined
                      };
                      return (
                        <ProjectCard
                          key={project.id}
                          project={projectWithLeaderName}
                          onImageClick={(project) => {
                            if (onNavigate) {
                              onNavigate(`/projects/${project.id}`);
                            }
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Desktop: fixed two columns by index to keep visual order stable */}
                  <div className="hidden lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
                    <div className="space-y-8">
                      {filteredProjects
                        .filter((_, index) => index % 2 === 0)
                        .map((project) => {
                          const projectWithLeaderName = {
                            ...project,
                            leaderName: project.leaderId
                              ? userNames[project.leaderId]
                              : project.leaderEmail
                              ? userNames[project.leaderEmail] || project.leaderEmail.split('@')[0]
                              : undefined
                          };
                          return (
                            <ProjectCard
                              key={project.id}
                              project={projectWithLeaderName}
                              onImageClick={(project) => {
                                if (onNavigate) {
                                  onNavigate(`/projects/${project.id}`);
                                }
                              }}
                            />
                          );
                        })}
                    </div>
                    <div className="space-y-8">
                      {filteredProjects
                        .filter((_, index) => index % 2 === 1)
                        .map((project) => {
                          const projectWithLeaderName = {
                            ...project,
                            leaderName: project.leaderId
                              ? userNames[project.leaderId]
                              : project.leaderEmail
                              ? userNames[project.leaderEmail] || project.leaderEmail.split('@')[0]
                              : undefined
                          };
                          return (
                            <ProjectCard
                              key={project.id}
                              project={projectWithLeaderName}
                              onImageClick={(project) => {
                                if (onNavigate) {
                                  onNavigate(`/projects/${project.id}`);
                                }
                              }}
                            />
                          );
                        })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500 py-20 font-jost">
                  No projects found for this category.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center text-gray-500 py-20 font-jost">
            Loading projects...
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center text-red-500 py-20 font-jost">
            {error}
          </div>
        )}


        {/* Project List 
        {!loading && !error && (
          <div className="space-y-12">
              {filteredProjects.length > 0 ? (
                  filteredProjects.map((project, index) => {
                    // Add leader name to project for display
                    const projectWithLeaderName = {
                      ...project,
                      leaderName: project.leaderId 
                        ? userNames[project.leaderId] 
                        : project.leaderEmail 
                        ? userNames[project.leaderEmail] || project.leaderEmail.split('@')[0]
                        : undefined
                    };
                    return (
                      <div
                        key={project.id}
                        draggable={canEdit}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        style={{ opacity: draggedIndex === index ? 0.5 : 1 }}
                      >
                        <ProjectCard 
                          project={projectWithLeaderName} 
                          onImageClick={(project) => {
                            if (onNavigate) {
                              onNavigate(`/projects/${project.id}`);
                            }
                          }}
                          showDragHandle={canEdit}
                          onDragHandleMouseDown={(e) => {
                            e.stopPropagation();
                          }}
                        />
                      </div>
                    );
                  })
              ) : (
                  <div className="text-center text-gray-500 py-20 font-jost">
                      No projects found for this category.
                  </div>
              )}
          </div>
        )}*/}

      </div>
      
    </div>
  );
};

export default Projects;