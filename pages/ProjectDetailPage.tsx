import React from 'react';
import { Project } from '../src/types';

interface ProjectDetailPageProps {
  project: Project;
  onNavigate: (path: string) => void;
}

const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({ project, onNavigate }) => {
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
                {project.title}
              </button>
            </div>
          </div>

          {/* Main Image */}
          <div className="mb-6 rounded-lg overflow-hidden">
            <img
              src={project.imageUrl}
              alt={project.title}
              className="w-full h-auto object-cover"
            />
          </div>

          {/* Project Title */}
          <h1 className="text-3xl font-bold font-jost text-black mb-4 uppercase">
            {project.title}
          </h1>

          {/* Description */}
          <p className="text-gray-700 font-jost mb-8 leading-relaxed">
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

          {/* Join and Placeholder Image */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Join Section */}
            {(project.status === 'current') ? (
              <div>
                <h2 className="text-xl font-bold font-jost text-black mb-4 uppercase">Want to Get Involved?</h2>
                <p className="text-gray-700 font-jost mb-4">
                  Click the link below to authenticate your email and join the slack.
                </p>
                <a href={project.slackUrl}>
                  <button className="px-6 py-2 bg-[#8B0000] text-white font-jost font-medium rounded hover:bg-[#700000] transition-colors">
                    Join the Slack
                  </button>
                </a>
                
                {project.deadline ? (
                  <>
                    <p className="text-gray-700 font-jost">
                      DEADLINE TO JOIN: 
                    </p>
                    <p className="text-black font-jost font-bold">{project.deadline}</p>
                  </>
                  
                  ) : (
                    <p>Deadline not set.</p>
                  ) 
                };
                <div className="flex flex-row mt-3">
                  
                </div>
              </div>
            ) : (
              <></>
            )
            }
            

            {/* Placeholder Image */}
            <div className="w-full h-64 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center mb-2">
              <span className="text-white text-sm font-jost">
                {/*place for image/carousel
                <img src={project.img}/>*/}
              </span>
            </div>
          </div>

          {/* Join Slack Section */}
          <div className="mb-8">
            
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailPage;
