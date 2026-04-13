import React from 'react';
import { Project } from '../src/types';
import { sanitizeHtml, isHtmlString } from '../src/utils/sanitizeHtml';
import { getProjectFormLinkByTitle } from '../src/formLinks';
import ImageCarousel from '../src/components/ImageCarousel';

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

          {/* Project Leader + Members */}
          {(project.leaderEmail || project.leaderId) && (
          <div className="mb-11">
            <p className="text-xs text-[#48597F] font-jost uppercase tracking-wide">Project Leader</p>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs text-black font-medium">
                  {project.leaderName || project.leaderEmail?.split('@')[0] || 'Project Leader'}
                </span>
              </div>
            </div>
            {project.members && project.members.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 border-t border-gray-700 pt-4 mt-3">
                {project.members.map((member, index) => (
                  <div key={`member-${member.userId}-${index}`} className="flex items-center space-x-3">
                    <div className="flex flex-col">
                      <span className="text-xs text-black font-medium">{member.userName}</span>
                      <span className="text-[10px] text-[#48597F]">{member.projectRole}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : project.chairs && project.chairs.length > 0 ? (
              <div className="border-t border-gray-300 pt-4 mt-3">
                <p className="text-[10px] text-[#48597F] font-jost uppercase tracking-wide mb-2">Team</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                  {project.chairs.map((chair, index) => (
                    <div key={`chair-${chair.name}-${index}`} className="flex items-center space-x-3">
                      <div className="flex flex-col">
                        <span className="text-xs text-black font-medium">{chair.name}</span>
                        <span className="text-[10px] text-[#48597F]">{chair.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

          {/* Join Section */}
          <div className="mb-8">
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

          {/* Photo gallery carousel */}
          {images.length > 0 && (
            <div className="mb-8">
              <ImageCarousel images={images} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailPage;
