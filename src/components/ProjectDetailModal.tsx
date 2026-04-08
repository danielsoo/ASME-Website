import React from 'react';
import { Project } from '../types';

interface ProjectDetailModalProps {
  project: Project | null;
  onClose: () => void;
}

const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ project, onClose }) => {
  if (!project) return null;

  // Mock timeline events - in real app, this would come from project data
  const timelineEvents = [
    { date: '14th of whatever', description: 'Description of event', clickable: true },
    { date: '15th of whatever', description: 'Description of event', clickable: true },
    { date: '16th of whatever', description: 'Description of event', clickable: true },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with tabs */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 z-10">
          <div className="px-4 py-2 bg-gray-100 rounded-t-lg text-sm text-gray-600">image 14</div>
          <div className="px-4 py-2 bg-white border-b-2 border-gray-800 text-sm text-gray-800 font-medium">
            PROJECT TITLE
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Main Image */}
          <div className="mb-6 max-w-4xl mx-auto rounded-lg overflow-hidden bg-[#DEE7ED] border-2 border-blue-500">
            <div className="relative w-full h-52 sm:h-60 md:h-72">
              <img
                src={project.imageUrl}
                alt={project.title}
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            </div>
          </div>

          {/* Project Title */}
          <h1 className="text-3xl font-bold font-jost text-black mb-4 uppercase">
            {project.title}
          </h1>

          {/* Description */}
          <p className="text-gray-700 font-jost mb-8 leading-relaxed">
            {project.description}
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>

          {/* Team Members and Learn More Button */}
          <div className="mb-8">
            <div className="grid grid-cols-3 gap-4 mb-4">
              {project.chairs.map((chair, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-gray-400 flex-shrink-0"></div>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-800 font-medium font-jost">{chair.name}</span>
                    <span className="text-xs text-gray-600 font-jost">{chair.role}</span>
                  </div>
                </div>
              ))}
            </div>
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

export default ProjectDetailModal;
