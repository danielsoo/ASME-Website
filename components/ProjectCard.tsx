import React, { useState } from 'react';
import { Project } from '../types';
import { GripVertical } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onImageClick?: (project: Project) => void;
  onNavigate?: (path: string) => void;
  showDragHandle?: boolean;
  onDragHandleMouseDown?: (e: React.MouseEvent) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onImageClick, onNavigate, showDragHandle, onDragHandleMouseDown }) => {
  const [showAllMembers, setShowAllMembers] = useState(false);

  return (
    <div id={`project-${project.id}`} className="bg-[#DEE7ED] border border-gray-700 rounded-lg overflow-hidden mb-8 shadow-md relative">
      {/* Drag Handle */}
      {showDragHandle && (
        <div
          onMouseDown={onDragHandleMouseDown}
          className="absolute top-4 right-4 cursor-move hover:opacity-70 transition-opacity z-10 bg-black/50 rounded p-2"
          title="드래그하여 순서 변경"
        >
          <GripVertical size={24} className="text-white" />
        </div>
      )}
      {/* Image Header Section */}
      <div className="relative h-64 w-full overflow-hidden">
        <img 
          src={project.imageUrl} 
          alt={project.title} 
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105 cursor-pointer"
          draggable={false}
          onClick={() => onImageClick?.(project)}
        />
        <div className="absolute bottom-0 left-0 p-6 bg-gradient-to-t from-black/80 to-transparent w-full">
          <h3 className="text-2xl font-bold font-jost text-white tracking-wider uppercase">{project.title}</h3>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6">
        <p className="text-gray-700 text-sm leading-relaxed mb-6 font-jost">
          {project.description}
        </p>

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
              {((project.chairs && project.chairs.length > 0) || (project.members && project.members.length > 0)) && (
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
        {((project.chairs && project.chairs.length > 0) || (project.members && project.members.length > 0)) && showAllMembers ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 border-t border-gray-700 pt-4 mt-3">
            {/* Display members from members array (Firebase managed) */}
            {project.members?.map((member, index) => (
              <div key={`member-${member.userId}-${index}`} className="flex items-center space-x-3">
                <div className="flex flex-col">
                  <span className="text-xs text-black font-medium">{member.userName}</span>
                  <span className="text-[10px] text-[#48597F]">{member.projectRole}</span>
                </div>
              </div>
            ))}
            
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
          <div className="text-sm text-gray-400 font-jost italic">
            No members assigned yet.
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ProjectCard;
