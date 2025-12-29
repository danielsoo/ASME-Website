import React, { useState, useEffect, useMemo } from 'react';
import { PROJECTS } from '../constants';
import { Project } from '../types';
import ProjectCard from '../components/ProjectCard';
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

  const filteredProjects = PROJECTS.filter(p => p.status === view);

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
      const project = PROJECTS.find(p => {
        const slug = p.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        return slug === projectSlug || p.id === projectSlug;
      });
      
      return project || null;
    } catch (error) {
      console.error('Error parsing project path:', error);
      return null;
    }
  };

  // Use useMemo to ensure projectDetail is recalculated when currentPath changes
  const projectDetail = useMemo(() => getProjectFromPath(currentPath), [currentPath]);

  // Log when currentPath changes for debugging
  useEffect(() => {
    console.log('Projects component - currentPath changed:', currentPath);
    console.log('Projects component - projectDetail:', projectDetail);
  }, [currentPath, projectDetail]);

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
    return <ProjectDetailPage project={projectDetail} onNavigate={onNavigate} />;
  }

  return (
    <div 
      className="min-h-screen bg-[#0f131a] py-12 relative"
      style={{
        minHeight: 'calc(100vh + 140px)',
        marginTop: '-140px',
        paddingTop: 'calc(140px + 3rem)',
      }}
    >
      <div className="container mx-auto px-4">
        
        {/* Toggle Controls */}
        <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg w-fit mb-12 mx-auto md:mx-0">
          <button
            onClick={() => {
              setView('current');
              if (onNavigate) {
                onNavigate('/projects?view=current');
              }
            }}
            className={`px-6 py-2 rounded-md font-jost text-sm font-medium transition-all ${
              view === 'current' ? 'bg-[#3b4c6b] text-white shadow' : 'text-gray-400 hover:text-white'
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
              view === 'past' ? 'bg-[#3b4c6b] text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Past Projects
          </button>
        </div>

        {/* Project List */}
        <div className="space-y-12">
            {filteredProjects.length > 0 ? (
                filteredProjects.map((project) => (
                    <ProjectCard 
                      key={project.id} 
                      project={project} 
                      onImageClick={(project) => {
                        if (onNavigate) {
                          const slug = project.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                          onNavigate(`/projects/${slug}`);
                        }
                      }}
                    />
                ))
            ) : (
                <div className="text-center text-gray-500 py-20 font-jost">
                    No projects found for this category.
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default Projects;