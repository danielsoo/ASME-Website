import React from 'react';
import { Project } from '../types';

interface ProjectCardProps {
  project: Project;
  onImageClick?: (project: Project) => void;
  onNavigate?: (path: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onImageClick, onNavigate }) => {
  return (
    <div id={`project-${project.id}`} className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden mb-8">
      {/* Image Header Section */}
      <div className="relative h-64 w-full overflow-hidden">
        <img 
          src={project.imageUrl} 
          alt={project.title} 
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105 cursor-pointer"
          onClick={() => onImageClick?.(project)}
        />
        <div className="absolute bottom-0 left-0 p-6 bg-gradient-to-t from-black/80 to-transparent w-full">
          <h3 className="text-2xl font-bold font-jost text-white tracking-wider uppercase">{project.title}</h3>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6">
        <p className="text-gray-300 text-sm leading-relaxed mb-6 font-jost">
          {project.description}
        </p>

        {/* Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {project.chairs.map((chair, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-slate-600 flex-shrink-0"></div>
              <div className="flex flex-col">
                <span className="text-xs text-white font-medium">{chair.name}</span>
                <span className="text-[10px] text-blue-300">{chair.role}</span>
              </div>
            </div>
          ))}
           <div className="flex items-center justify-end w-full col-span-1 md:col-span-2 lg:col-span-3">
               <button 
                 onClick={() => onImageClick?.(project)}
                 className="text-sm text-blue-300 hover:text-white underline decoration-blue-300/50 hover:decoration-white transition-all cursor-pointer"
               >
                 Load more...
               </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;