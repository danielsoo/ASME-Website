import React from 'react';
import { Project } from '../src/types';
import { sanitizeHtml, isHtmlString } from '../src/utils/sanitizeHtml';
import { getProjectFormLinkByTitle } from '../src/formLinks';

function renderRichContent(content: string | undefined, fallback: string): React.ReactNode {
  const c = content ?? fallback;
  if (!c) return null;
  if (isHtmlString(c)) return <span className="project-rich-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(c) }} />;
  return c;
}

interface ProjectDetailPageProps {
  project: Project;
  onNavigate: (path: string) => void;
}

const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({ project, onNavigate }) => {
  const joinLink = project.slack || getProjectFormLinkByTitle(project.title);
  const images = project.imgs?.filter(Boolean) ?? (project.img ? [project.img] : []);
  // Mock timeline events - in real app, this would come from project data
  const timelineEvents = [
    { date: '14th of whatever', description: 'Description of event', clickable: true },
    { date: '15th of whatever', description: 'Description of event', clickable: true },
    { date: '16th of whatever', description: 'Description of event', clickable: true },
  ];

  return (
    <div className="min-h-screen bg-[#0f131a] relative">

      {/* Content */}
      <div className="bg-gray-100 min-h-screen py-12 relative">
        <div className="container mx-auto px-16">
          {/* Sub-Navigation Tabs */}
          <div className="flex space-x-1 bg-[#DEE7ED] p-1 rounded-lg w-fit mb-12 mx-auto md:mx-0 shadow-md">
            <div className="container mx-auto flex items-center gap-2">
              <button
                onClick={() => onNavigate('/projects?view=current')}
                className="px-6 py-2 rounded-md font-jost text-sm font-medium transition-all text-gray-400 hover:text-[#48597F]"
              >
                Projects
              </button>
              <button
                onClick={() => onNavigate('/projects?view=past')}
                className="px-6 py-2 rounded-md font-jost text-sm font-medium transition-all text-gray-400 hover:text-[#48597F]"
              >
                Past Projects
              </button>
              <button
                className="px-6 py-2 rounded-md font-jost text-sm font-medium transition-all bg-[#3b4c6b] text-white shadow"
                disabled
              >
                {renderRichContent(project.title, '')}
              </button>
            </div>
          </div>

          {/* Main Image — capped size (full w-full h-auto was huge on tall uploads) */}
          <div className="mb-6 max-w-4xl mx-auto rounded-lg overflow-hidden bg-[#DEE7ED] shadow-md">
            <div className="relative w-full h-52 sm:h-60 md:h-72">
              <img
                src={project.imageUrl}
                alt={(project.title || '').replace(/<[^>]*>/g, '').trim() || 'Project'}
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            </div>
          </div>

          {/* Project Title */}
          <h1 className="text-3xl font-bold font-jost text-black mb-4 uppercase">
            {renderRichContent(project.title, '')}
          </h1>

          {/* Description */}
          <div className="text-gray-700 font-jost mb-8 leading-relaxed project-rich-content">
            {project.description && isHtmlString(project.description) ? (
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(project.description) }} />
            ) : (
              <p>{project.description}</p>
            )}
          </div>

          {/* Project Leader Section */}
          {(project.leaderEmail || project.leaderId) && (
          <div>
            <p className="text-xs text-[#48597F] font-jost uppercase tracking-wide">Project Leader</p>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs text-black font-medium">
                  {project.leaderName || project.leaderEmail?.split('@')[0] || 'Project Leader'}
                </span>
              </div>
            </div>
          </div>
        )}
          {/* Members Grid */}
        {(project.chairs && project.chairs.length > 0) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 border-t border-gray-700 pt-4 mt-3 mb-11">
            {/* Display chairs (legacy data) */}
            {project.chairs?.map((chair, index) => (
              <div key={`chair-${index}`} className="flex items-center space-x-3">
                <div className="flex flex-col">
                  <span className="text-xs text-black font-medium">{chair.name}</span>
                  <span className="text-[10px] text-[#48597F]">{chair.role}</span>
                </div>
              </div>
            ))}  
          </div>
        ) : !(project.leaderEmail || project.leaderId) ? (
          <div className="text-sm text-gray-400 font-jost italic mb-11">
            No members assigned yet.
          </div>
        ) : null}

          {/* Join Section + optional gallery */}
          <div className={`mb-8 ${images.length === 1 ? 'grid grid-cols-1 md:grid-cols-2 gap-8' : ''}`}>
            {/* Join Section */}
            <div>
              <h2 className="text-xl font-bold font-jost text-black mb-4 uppercase">
                {renderRichContent(project.joinSectionTitle, 'Want to Get Involved?')}
              </h2>
              <div className="text-gray-700 font-jost mb-4 project-rich-content">
                {project.joinSectionDescription && isHtmlString(project.joinSectionDescription) ? (
                  <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(project.joinSectionDescription) }} />
                ) : (
                  <p>{project.joinSectionDescription ?? "Click the link below to authenticate your email and join the slack."}</p>
                )}
              </div>
              {joinLink ? (
                <a
                  href={joinLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-2 bg-[#8B0000] text-white font-jost font-medium rounded hover:bg-[#700000] transition-colors"
                >
                  {project.joinButtonLabel ?? 'Join the Slack'}
                </a>
              ) : (
                <span className="inline-block px-6 py-2 bg-gray-400 text-white font-jost font-medium rounded cursor-not-allowed">
                  {project.joinButtonLabel ?? 'Join the Slack'}
                </span>
              )}
              {(project.timeline != null && project.timeline !== '') && (
                <div className="flex flex-row mt-3 gap-2">
                  <p className="text-gray-700 font-jost">DEADLINE TO JOIN:</p>
                  <p className="text-black font-jost font-bold">{project.timeline}</p>
                </div>
              )}
            </div>

            {/* Single image: right column */}
            {images.length === 1 && (
              <div className="w-full h-64 rounded-xl overflow-hidden shadow-md">
                <img src={images[0]} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Gallery for 2+ images */}
          {images.length >= 2 && (
            <div className="mb-8">
              {images.length === 2 && (
                <div className="grid grid-cols-2 gap-3">
                  {images.map((src, i) => (
                    <div key={i} className="rounded-xl overflow-hidden shadow-md h-56">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
              {images.length === 3 && (
                <div className="grid grid-cols-3 grid-rows-2 gap-3 h-72">
                  <div className="col-span-2 row-span-2 rounded-xl overflow-hidden shadow-md">
                    <img src={images[0]} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="rounded-xl overflow-hidden shadow-md">
                    <img src={images[1]} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="rounded-xl overflow-hidden shadow-md">
                    <img src={images[2]} alt="" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
              {images.length === 4 && (
                <div className="grid grid-cols-2 gap-3">
                  {images.map((src, i) => (
                    <div key={i} className="rounded-xl overflow-hidden shadow-md h-48">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
              {images.length >= 5 && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 rounded-xl overflow-hidden shadow-md h-56">
                    <img src={images[0]} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex-1 rounded-xl overflow-hidden shadow-md">
                      <img src={images[1]} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 rounded-xl overflow-hidden shadow-md">
                      <img src={images[2]} alt="" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  {images.slice(3).map((src, i) => (
                    <div key={i + 3} className="rounded-xl overflow-hidden shadow-md h-44">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Join Slack Section */}
          <div className="mb-8">
            
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailPage;
