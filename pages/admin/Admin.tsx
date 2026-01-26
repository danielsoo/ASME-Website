import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import Login from './Login';
import Dashboard from './Dashboard';
import UserApproval from './UserApproval';
import SetupAdmin from './SetupAdmin';
import ProjectManagement from './ProjectManagement';
import ProjectApprovals from './ProjectApprovals';
import ProjectTrash from './ProjectTrash';
import MemberManagement from './MemberManagement';
import SponsorManagement from './SponsorManagement';
import SponsorTrash from './SponsorTrash';

interface AdminProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

const Admin: React.FC<AdminProps> = ({ currentPath = '/admin', onNavigate }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Admin component - currentPath:', currentPath); // Debug
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentPath]);

  // Setup Admin page (accessible without login) - must be checked first
  if (currentPath === '/admin/setup' || currentPath.startsWith('/admin/setup')) {
    console.log('Rendering SetupAdmin page'); // Debug
    return <SetupAdmin />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f131a] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={() => {}} />;
  }

  // Show dashboard or specific admin pages
  if (currentPath === '/admin' || currentPath === '/admin/') {
    return <Dashboard onNavigate={onNavigate || (() => {})} />;
  }

  // User Approval page
  if (currentPath === '/admin/approvals' || currentPath === '/admin/users') {
    return <UserApproval onNavigate={onNavigate || (() => {})} />;
  }

  // Project Management page
  if (currentPath === '/admin/projects') {
    return <ProjectManagement onNavigate={onNavigate || (() => {})} />;
  }

  // Project Approvals page
  if (currentPath === '/admin/projects/approvals') {
    return <ProjectApprovals onNavigate={onNavigate || (() => {})} />;
  }

  // Project Trash page
  if (currentPath === '/admin/projects/trash') {
    return <ProjectTrash onNavigate={onNavigate || (() => {})} />;
  }

  // Members Management page
  if (currentPath === '/admin/members') {
    return <MemberManagement onNavigate={onNavigate || (() => {})} />;
  }

  // Sponsor Management page
  if (currentPath === '/admin/sponsors') {
    return <SponsorManagement onNavigate={onNavigate || (() => {})} />;
  }

  // Sponsor Trash page
  if (currentPath === '/admin/sponsors/trash') {
    return <SponsorTrash onNavigate={onNavigate || (() => {})} />;
  }

  // Default to dashboard
  return <Dashboard onNavigate={onNavigate || (() => {})} />;
};

export default Admin;
