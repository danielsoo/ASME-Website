import React, { useState } from 'react';
import { Project } from '../types';
import { GripVertical } from 'lucide-react';
import { sanitizeHtml, isHtmlString } from '../utils/sanitizeHtml';

interface ProjectCardProps {
  project: Project;
  onImageClick?: (project: Project) => void;
  onNavigate?: (path: string) => void;
  showDragHandle?: boolean;
  onDragHandleMouseDown?: (e: React.MouseEvent) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onImageClick, onNavigate }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [showAllMembers, setShowAllMembers] = React.useState(false);


  return (
    <div id={`project-${project.id}`} className="bg-[#DEE7ED] border border-gray-700 rounded-lg overflow-hidden mb-8 shadow-md"
    onClick={() => onImageClick?.(project)}>
      {/* Image Header Section */}
      <div className="relative h-48 w-full overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img 
          src={project.imageUrl} 
          alt={(project.title || '').replace(/<[^>]*>/g, '').trim() || 'Project'} 
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105 cursor-pointer"
          onClick={() => onImageClick?.(project)}
        />
        <div className="absolute bottom-0 left-0 p-6 bg-black/25 w-full h-full hover:bg-black/50 transition-all ease-in-out cursor-pointer">
          <h3 className="flex text-2xl font-bold font-jost text-white tracking-wider uppercase cursor-pointer">
            {project.title && isHtmlString(project.title) ? (
              <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(project.title) }} />
            ) : (
              project.title
            )}
            <span className={`block pl-2 transition-all duration-300 ease-in-out
              ${isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}>
                ➜
            </span>
          </h3>
          <p className="text-white text-sm leading-relaxed mb-6 font-jost pt-2">
            {project.description && isHtmlString(project.description) ? (
              <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(project.description) }} />
            ) : (
              project.description
            )}
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6">
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
              {(project.members && project.members.length > 0) && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllMembers(!showAllMembers);
                  }}
                  className="text-xs text-[#48597F] hover:underline decoration-[#48597F] transition-all cursor-pointer"
                >
                  {showAllMembers ? "Show less" : "Load more..."}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Members Grid */}
        {(project.members && project.members.length > 0) && showAllMembers ? (
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
        ) : null}
      </div>
    </div>
  );
};


export default ProjectCard;
