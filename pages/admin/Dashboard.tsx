import React from 'react';

interface DashboardProps {
  onNavigate: (path: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Approvals Card */}
          <div 
            className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onNavigate('/admin/approvals')}
          >
            <h2 className="text-xl font-bold mb-2 text-gray-800">User Approvals</h2>
            <p className="text-gray-600 mb-4">Approve or reject pending user registrations</p>
            <button className="text-blue-600 hover:text-blue-800 font-medium">
              Manage →
            </button>
          </div>

          {/* Members Management Card */}
          <div 
            className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onNavigate('/admin/members')}
          >
            <h2 className="text-xl font-bold mb-2 text-gray-800">Members</h2>
            <p className="text-gray-600 mb-4">Manage Executive Board and Design Team members</p>
            <button className="text-blue-600 hover:text-blue-800 font-medium">
              Manage →
            </button>
          </div>

          {/* Projects Management Card */}
          <div 
            className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onNavigate('/admin/projects')}
          >
            <h2 className="text-xl font-bold mb-2 text-gray-800">Projects</h2>
            <p className="text-gray-600 mb-4">Manage current and past projects</p>
            <button className="text-blue-600 hover:text-blue-800 font-medium">
              Manage →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
