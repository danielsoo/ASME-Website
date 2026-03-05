import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../src/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import Login from './Login';
import Dashboard from './Dashboard';
import UserApproval from './UserApproval';
import SetupAdmin from './SetupAdmin';
import SponsorManagement from './SponsorManagement';
import ProjectManagement from './ProjectManagement';
import ProjectApprovals from './ProjectApprovals';
import ProjectTrash from './ProjectTrash';
import MemberManagement from './MemberManagement';
import SponsorTrash from './SponsorTrash';
import EventManagement from './EventManagement';
import EventTrash from './EventTrash';
import AdminAccess from './AdminAccess';
import SiteContent from './SiteContent';
import PresidentHandover from './PresidentHandover';

interface AdminProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

const DEFAULT_ALLOWED_ROLES = ['President', 'Vice President'];

const Admin: React.FC<AdminProps> = ({ currentPath = '/admin', onNavigate }) => {
  const [user, setUser] = useState<any>(null);
  const [userStatus, setUserStatus] = useState<'loading' | 'approved' | 'pending' | 'rejected' | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [allowedRoles, setAllowedRoles] = useState<string[]>(DEFAULT_ALLOWED_ROLES);
  const [accessChecked, setAccessChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentPath]);

  useEffect(() => {
    if (!user) {
      setUserStatus(null);
      setUserRole('');
      setAccessChecked(false);
      return;
    }
    setUserStatus('loading');
    setAccessChecked(false);
    let cancelled = false;
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.exists()) {
          setUserStatus('pending');
          setAccessChecked(true);
          return;
        }
        const data = snap.data();
        const status = (data?.status as 'approved' | 'pending' | 'rejected') || 'pending';
        const role = data?.role || 'member';
        setUserStatus(status);
        setUserRole(role);
        if (status !== 'approved') {
          setAccessChecked(true);
          return;
        }
        return getDoc(doc(db, 'config', 'adminAccess'));
      })
      .then((configSnap) => {
        if (cancelled) return;
        if (!configSnap) return;
        const roles = configSnap.exists()
          ? (configSnap.data()?.allowedRoles || DEFAULT_ALLOWED_ROLES)
          : DEFAULT_ALLOWED_ROLES;
        setAllowedRoles(Array.isArray(roles) ? roles : DEFAULT_ALLOWED_ROLES);
        setAccessChecked(true);
      })
      .catch(() => {
        if (!cancelled) {
          setUserStatus(null);
          setAccessChecked(true);
        }
      });
    return () => { cancelled = true; };
  }, [user?.uid]);

  // Setup Admin page (accessible without login) - must be checked first
  if (currentPath === '/admin/setup' || currentPath.startsWith('/admin/setup')) {
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

  // Pending users cannot access admin → redirect to home
  if (userStatus === 'pending') {
    if (onNavigate) onNavigate('/');
    return (
      <div className="min-h-screen bg-[#0f131a] flex items-center justify-center">
        <div className="text-center text-white max-w-md px-4">
          <p className="text-red-300 mb-4">Your email is verified but waiting for admin approval.</p>
          <button
            type="button"
            onClick={() => onNavigate?.('/')}
            className="text-[#3b4c6b] hover:text-white transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Wait while loading Firestore or if not approved
  if (userStatus !== 'approved' || !accessChecked) {
    return (
      <div className="min-h-screen bg-[#0f131a] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Only Executive Board with allowed roles can access; block otherwise
  if (!allowedRoles.includes(userRole)) {
    if (onNavigate) onNavigate('/');
    return (
      <div className="min-h-screen bg-[#0f131a] flex items-center justify-center">
        <div className="text-center text-white max-w-md px-4">
          <p className="text-red-300 mb-4">Only Executive Board members with access can use the admin panel.</p>
          <button
            type="button"
            onClick={() => onNavigate?.('/')}
            className="text-[#3b4c6b] hover:text-white transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Show dashboard or specific admin pages
  if (currentPath === '/admin' || currentPath === '/admin/') {
    return <Dashboard onNavigate={onNavigate || (() => {})} currentUserRole={userRole} />;
  }

  // Admin Access (President only): grant/revoke which roles can access admin
  if (currentPath === '/admin/access') {
    return <AdminAccess onNavigate={onNavigate || (() => {})} currentUserRole={userRole} />;
  }

  // Site Content (President only): edit footer and other site content
  if (currentPath === '/admin/site') {
    return <SiteContent onNavigate={onNavigate || (() => {})} currentUserRole={userRole} />;
  }

  // President Handover (President only): memos and shared credentials for next President
  if (currentPath === '/admin/handover') {
    return <PresidentHandover onNavigate={onNavigate || (() => {})} currentUserRole={userRole} />;
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

  // Events Management page
  if (currentPath === '/admin/events') {
    return (
      <div>
        <EventManagement onNavigate={onNavigate || (() => {})} />
      </div>
    )
  }
  // Event Trash page
  if (currentPath === '/admin/events/trash') {
    return <EventTrash onNavigate={onNavigate || (() => {})} />;
  }

  // Default to dashboard
  return <Dashboard onNavigate={onNavigate || (() => {})} currentUserRole={userRole} />;
};

export default Admin;
