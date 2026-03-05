import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../src/firebase/config';

interface DashboardProps {
  onNavigate: (path: string) => void;
  currentUserRole?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, currentUserRole = '' }) => {
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [pendingProjectsCount, setPendingProjectsCount] = useState(0);
  const [deletionRequestsCount, setDeletionRequestsCount] = useState(0);
  const [sponsorDeletionRequestsCount, setSponsorDeletionRequestsCount] = useState(0);
  const [eventDeletionRequestsCount, setEventDeletionRequestsCount] = useState(0);

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

    // Listen for event deletion requests (event with permanentDeleteRequest that aren't fully approved)
    const allEventsQuery = query(collection(db, 'events'));
    const unsubscribeAllEvents = onSnapshot(allEventsQuery, (snapshot) => {
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
      setEventDeletionRequestsCount(count);
    });

    return () => {
      unsubscribeUsers();
      unsubscribePendingProjects();
      unsubscribeAllProjects();
      unsubscribeAllSponsors();
      unsubscribeAllEvents();
    };
  }, []);

  // Calculate total notifications
  const totalNotifications = pendingUsersCount + pendingProjectsCount + deletionRequestsCount + sponsorDeletionRequestsCount + eventDeletionRequestsCount;

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 overflow-x-auto">
      <div className="max-w-7xl mx-auto min-w-0">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          {totalNotifications > 0 && (
            <span className="inline-flex items-center justify-center min-w-[28px] sm:min-w-[32px] h-7 sm:h-8 rounded-full bg-red-500 text-white text-sm sm:text-base font-bold px-2 sm:px-3 shadow">
              {totalNotifications > 99 ? '99+' : totalNotifications}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {currentUserRole === 'President' && (
            <>
              <div
                className="bg-white rounded-lg shadow-md p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-amber-200 min-w-0"
                onClick={() => onNavigate('/admin/access')}
              >
                <h2 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-gray-800">Admin Access</h2>
                <p className="text-gray-600 text-sm sm:text-base mb-3 sm:mb-4">Grant or revoke admin panel access for Executive Board positions</p>
                <span className="text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base">Manage →</span>
              </div>
              <div
                className="bg-white rounded-lg shadow-md p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-amber-200 min-w-0"
                onClick={() => onNavigate('/admin/site')}
              >
                <h2 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-gray-800">Site Content</h2>
                <p className="text-gray-600 text-sm sm:text-base mb-3 sm:mb-4">Edit footer (contact, mission, address, social links) and more</p>
                <span className="text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base">Manage →</span>
              </div>
              <div
                className="bg-white rounded-lg shadow-md p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-amber-200 min-w-0"
                onClick={() => onNavigate('/admin/handover')}
              >
                <h2 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-gray-800">President Handover</h2>
                <p className="text-gray-600 text-sm sm:text-base mb-3 sm:mb-4">Memos and shared accounts (email/password) for the next President</p>
                <span className="text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base">Manage →</span>
              </div>
            </>
          )}

          <div
            className="bg-white rounded-lg shadow-md p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-shadow relative min-w-0"
            onClick={() => onNavigate('/admin/approvals')}
          >
            {pendingUsersCount > 0 && (
              <span className="absolute top-2 right-2 sm:top-4 sm:right-4 min-w-[22px] sm:min-w-[24px] h-[22px] sm:h-6 rounded-full bg-red-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center px-1 sm:px-2 z-10 shadow">
                {pendingUsersCount > 99 ? '99+' : pendingUsersCount}
              </span>
            )}
            <h2 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-gray-800">User Approvals</h2>
            <p className="text-gray-600 text-sm sm:text-base mb-3 sm:mb-4">Approve or reject pending user registrations</p>
            <span className="text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base">Manage →</span>
          </div>

          <div
            className="bg-white rounded-lg shadow-md p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-shadow min-w-0"
            onClick={() => onNavigate('/admin/members')}
          >
            <h2 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-gray-800">Members</h2>
            <p className="text-gray-600 text-sm sm:text-base mb-3 sm:mb-4">Manage Executive Board and Design Team members</p>
            <span className="text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base">Manage →</span>
          </div>

          <div
            className="bg-white rounded-lg shadow-md p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-shadow relative min-w-0"
            onClick={() => onNavigate('/admin/projects')}
          >
            {(pendingProjectsCount + deletionRequestsCount) > 0 && (
              <span className="absolute top-2 right-2 sm:top-4 sm:right-4 min-w-[22px] sm:min-w-[24px] h-[22px] sm:h-6 rounded-full bg-red-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center px-1 sm:px-2 z-10 shadow">
                {(pendingProjectsCount + deletionRequestsCount) > 99 ? '99+' : (pendingProjectsCount + deletionRequestsCount)}
              </span>
            )}
            <h2 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-gray-800">Projects</h2>
            <p className="text-gray-600 text-sm sm:text-base mb-3 sm:mb-4">Manage current and past projects</p>
            <span className="text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base">Manage →</span>
          </div>

          <div
            className="bg-white rounded-lg shadow-md p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-shadow relative min-w-0"
            onClick={() => onNavigate('/admin/sponsors')}
          >
            {sponsorDeletionRequestsCount > 0 && (
              <span className="absolute top-2 right-2 sm:top-4 sm:right-4 min-w-[22px] sm:min-w-[24px] h-[22px] sm:h-6 rounded-full bg-red-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center px-1 sm:px-2 z-10 shadow">
                {sponsorDeletionRequestsCount > 99 ? '99+' : sponsorDeletionRequestsCount}
              </span>
            )}
            <h2 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-gray-800">Sponsors</h2>
            <p className="text-gray-600 text-sm sm:text-base mb-3 sm:mb-4">Manage sponsor information and logos</p>
            <span className="text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base">Manage →</span>
          </div>

          <div
            className="bg-white rounded-lg shadow-md p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-shadow relative min-w-0"
            onClick={() => onNavigate('/admin/events')}
          >
            {eventDeletionRequestsCount > 0 && (
              <span className="absolute top-2 right-2 sm:top-4 sm:right-4 min-w-[22px] sm:min-w-[24px] h-[22px] sm:h-6 rounded-full bg-red-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center px-1 sm:px-2 z-10 shadow">
                {eventDeletionRequestsCount > 99 ? '99+' : eventDeletionRequestsCount}
              </span>
            )}
            <h2 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-gray-800">Events</h2>
            <p className="text-gray-600 text-sm sm:text-base mb-3 sm:mb-4">Manage past, current, and upcoming event information</p>
            <span className="text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base">Manage →</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
