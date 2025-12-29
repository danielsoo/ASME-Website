import React from 'react';
import { Project } from '../types';

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
    <div 
      className="min-h-screen bg-[#0f131a] relative"
      style={{
        minHeight: 'calc(100vh + 140px)',
        marginTop: '-140px',
        paddingTop: '140px',
      }}
    >
      {/* Sub-Navigation Tabs */}
      <div className="bg-[#0f131a] border-b border-gray-700 px-6 py-4">
        <div className="container mx-auto flex items-center gap-2">
          <button
            onClick={() => onNavigate('/projects?view=current')}
            className="px-4 py-2 bg-gray-700 text-gray-300 font-jost text-sm rounded hover:bg-gray-600 transition-colors"
          >
            Projects
          </button>
          <button
            onClick={() => onNavigate('/projects?view=past')}
            className="px-4 py-2 bg-gray-700 text-gray-300 font-jost text-sm rounded hover:bg-gray-600 transition-colors"
          >
            Past Projects
          </button>
          <button
            className="px-4 py-2 bg-gray-800 text-white font-jost text-sm rounded"
            disabled
          >
            {project.title}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white min-h-screen">
        <div className="container mx-auto px-4 py-6">
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
            <div className="mb-6 pb-6 border-b border-gray-300">
              <p className="text-sm text-gray-600 font-jost mb-3 uppercase tracking-wide font-semibold">Project Leader</p>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gray-400 flex-shrink-0"></div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-800 font-medium font-jost">
                    {project.leaderName || project.leaderEmail?.split('@')[0] || 'Project Leader'}
                  </span>
                  <span className="text-xs text-gray-600 font-jost">Project Leader</span>
                </div>
              </div>
            </div>
          )}

          {/* Team Members and Learn More Button */}
          <div className="mb-8">
            {(project.chairs && project.chairs.length > 0) || (project.members && project.members.length > 0) ? (
              <div className="grid grid-cols-3 gap-4 mb-4">
                {/* Display members from members array (Firebase managed) */}
                {project.members?.map((member, index) => (
                  <div key={`member-${member.userId}-${index}`} className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-gray-400 flex-shrink-0"></div>
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-800 font-medium font-jost">{member.userName}</span>
                      <span className="text-xs text-gray-600 font-jost">{member.projectRole}</span>
                    </div>
                  </div>
                ))}
                
                {/* Display chairs (legacy data) */}
                {project.chairs?.map((chair, index) => (
                  <div key={`chair-${index}`} className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-gray-400 flex-shrink-0"></div>
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-800 font-medium font-jost">{chair.name}</span>
                      <span className="text-xs text-gray-600 font-jost">{chair.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : !(project.leaderEmail || project.leaderId) ? (
              <div className="text-sm text-gray-500 font-jost italic mb-4">
                No members assigned yet.
              </div>
            ) : null}
            <div className="flex justify-end">
              <button className="px-6 py-2 bg-[#8B0000] text-white font-jost font-medium rounded hover:bg-[#700000] transition-colors">
                Learn More
              </button>
            </div>
          </div>

          {/* Timeline and Placeholder Image */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Timeline Section */}
            <div>
              <h2 className="text-xl font-bold font-jost text-black mb-4 uppercase">TIMELINE</h2>
              <ul className="space-y-3">
                {timelineEvents.map((event, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-gray-800 font-jost mr-2">•</span>
                    <span className="text-gray-700 font-jost">
                      Event on this date {event.date} – clickable
                      {event.description && (
                        <>
                          <br />
                          <span className="text-sm text-gray-600">{event.description}</span>
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Placeholder Image */}
            <div>
              <div className="w-full h-64 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center mb-2">
                <span className="text-white text-sm font-jost">Placeholder Image</span>
              </div>
              <p className="text-sm text-gray-600 font-jost text-center">placeholder image</p>
            </div>
          </div>

          {/* Join Slack Section */}
          <div className="mb-8">
            <p className="text-gray-700 font-jost mb-4">
              Want to get involved? Click the link below to authenticate your email and join the slack
            </p>
            <button className="px-6 py-2 bg-[#8B0000] text-white font-jost font-medium rounded hover:bg-[#700000] transition-colors">
              Join the Slack
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailPage;
