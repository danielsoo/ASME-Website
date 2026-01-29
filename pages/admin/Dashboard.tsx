import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

interface DashboardProps {
  onNavigate: (path: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [pendingProjectsCount, setPendingProjectsCount] = useState(0);
  const [deletionRequestsCount, setDeletionRequestsCount] = useState(0);
  const [sponsorDeletionRequestsCount, setSponsorDeletionRequestsCount] = useState(0);

  useEffect(() => {
    // Listen for pending users
    const usersQuery = query(collection(db, 'users'), where('status', '==', 'pending'));
    const unsubscribeUsers = onSnapshot(
      usersQuery,
      (snapshot) => {
        setPendingUsersCount(snapshot.size);
      },
      (error) => {
        console.error('Dashboard - Error fetching pending users:', error);
      }
    );

    // Listen for pending projects
    const pendingProjectsQuery = query(collection(db, 'projects'), where('approvalStatus', '==', 'pending'));
    const unsubscribePendingProjects = onSnapshot(pendingProjectsQuery, (snapshot) => {
      setPendingProjectsCount(snapshot.size);
    });

    // Listen for deletion requests (projects with permanentDeleteRequest that aren't fully approved)
    const allProjectsQuery = query(collection(db, 'projects'));
    const unsubscribeAllProjects = onSnapshot(allProjectsQuery, (snapshot) => {
      let count = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.permanentDeleteRequest) {
          const request = data.permanentDeleteRequest;
          // Count if not fully approved (either leader or exec approval is missing)
          if (!request.approvedByLeader || !request.approvedByExec) {
            count++;
          }
        }
      });
      setDeletionRequestsCount(count);
    });

    // Listen for sponsor deletion requests (sponsors with permanentDeleteRequest that aren't fully approved)
    const allSponsorsQuery = query(collection(db, 'sponsors'));
    const unsubscribeAllSponsors = onSnapshot(allSponsorsQuery, (snapshot) => {
      let count = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.permanentDeleteRequest) {
          const request = data.permanentDeleteRequest;
          // Count if not fully approved (both exec approvals are missing)
          if (!request.approvedByExec1 || !request.approvedByExec2) {
            count++;
          }
        }
      });
      setSponsorDeletionRequestsCount(count);
    });

    return () => {
      unsubscribeUsers();
      unsubscribePendingProjects();
      unsubscribeAllProjects();
      unsubscribeAllSponsors();
    };
  }, []);

  // Calculate total notifications
  const totalNotifications = pendingUsersCount + pendingProjectsCount + deletionRequestsCount + sponsorDeletionRequestsCount;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          {totalNotifications > 0 && (
            <span
              style={{
                backgroundColor: "#EF4444",
                color: "#FFF",
                borderRadius: "9999px",
                minWidth: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                fontWeight: "bold",
                padding: "0 12px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }}
            >
              {totalNotifications > 99 ? '99+' : totalNotifications}
            </span>
          )}
        </div>
        
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Approvals Card */}
          <div 
            className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
            style={{ position: "relative" }}
            onClick={() => onNavigate('/admin/approvals')}
          >
            {pendingUsersCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  backgroundColor: "#EF4444",
                  color: "#FFF",
                  borderRadius: "9999px",
                  minWidth: "24px",
                  height: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: "bold",
                  padding: "0 8px",
                  zIndex: 10,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                }}
              >
                {pendingUsersCount > 99 ? '99+' : pendingUsersCount}
              </span>
            )}
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
            style={{ position: "relative" }}
            onClick={() => onNavigate('/admin/projects')}
          >
            {(pendingProjectsCount + deletionRequestsCount) > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  backgroundColor: "#EF4444",
                  color: "#FFF",
                  borderRadius: "9999px",
                  minWidth: "24px",
                  height: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: "bold",
                  padding: "0 8px",
                  zIndex: 10,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                }}
              >
                {(pendingProjectsCount + deletionRequestsCount) > 99 ? '99+' : (pendingProjectsCount + deletionRequestsCount)}
              </span>
            )}
            <h2 className="text-xl font-bold mb-2 text-gray-800">Projects</h2>
            <p className="text-gray-600 mb-4">Manage current and past projects</p>
            <button className="text-blue-600 hover:text-blue-800 font-medium">
              Manage →
            </button>
          </div>

<<<<<<< HEAD
          {/* Sponsor Management Card */}
          <div 
            className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onNavigate('/admin/sponsors')}
          >
            <h2 className="text-xl font-bold mb-2 text-gray-800">Sponsors</h2>
            <p className="text-gray-600 mb-4">Manage sponsors</p>
=======
          {/* Sponsors Management Card */}
          <div 
            className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
            style={{ position: "relative" }}
            onClick={() => onNavigate('/admin/sponsors')}
          >
            {sponsorDeletionRequestsCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  backgroundColor: "#EF4444",
                  color: "#FFF",
                  borderRadius: "9999px",
                  minWidth: "24px",
                  height: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: "bold",
                  padding: "0 8px",
                  zIndex: 10,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                }}
              >
                {sponsorDeletionRequestsCount > 99 ? '99+' : sponsorDeletionRequestsCount}
              </span>
            )}
            <h2 className="text-xl font-bold mb-2 text-gray-800">Sponsors</h2>
            <p className="text-gray-600 mb-4">Manage sponsor information and logos</p>
>>>>>>> b94d497e4c3091d5202899d1ccfdb3637d292578
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
