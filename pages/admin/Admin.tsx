import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../src/firebase/config';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { mergeDuplicateFirestoreUsersByEmail } from '../../src/firebase/mergeUsersByEmail';
import { useExecPermissions } from '../../src/hooks/useExecPermissions';
import Login from './Login';
import Dashboard from './Dashboard';
import UserApproval from './UserApproval';
import SetupAdmin from './SetupAdmin';
import SponsorManagement from './SponsorManagement';
import ProjectManagement from './ProjectManagement';
import ProjectApprovals from './ProjectApprovals';
import ProjectTrash from './ProjectTrash';
import ProjectEditPage from './ProjectEditPage';
import MemberManagement from './MemberManagement';
import SponsorTrash from './SponsorTrash';
import AdminAccess from './AdminAccess';
import SiteContent from './SiteContent';
import PresidentHandover from './PresidentHandover';

interface AdminProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

const DEFAULT_ALLOWED_ROLES = ['President', 'Vice President'];

/** Shown briefly while redirecting away from Projects Approve/Trash without `perms.projects`. */
const ProjectsAreaDenied: React.FC<{ onNavigate?: (path: string) => void }> = ({ onNavigate }) => {
  useEffect(() => {
    onNavigate?.('/admin/projects');
  }, [onNavigate]);
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-4 p-8">
      <p className="text-gray-600 text-center text-sm">
        Projects area permission is required. Returning to Project Management…
      </p>
      <button
        type="button"
        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm"
        onClick={() => onNavigate?.('/admin/projects')}
      >
        Back to Project Management
      </button>
    </div>
  );
};

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
    (async () => {
      try {
        await mergeDuplicateFirestoreUsersByEmail(user.uid, user.email);
      } catch (e) {
        console.error('mergeDuplicateFirestoreUsersByEmail:', e);
      }
      if (cancelled) return;
      getDoc(doc(db, 'users', user.uid))
        .then((snap) => {
          if (cancelled) return;
          if (!snap.exists()) {
            setUserStatus('pending');
            setUserRole('');
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
          }
        })
        .catch(() => {
          if (!cancelled) {
            setUserStatus(null);
            setAccessChecked(true);
          }
        });
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user || userStatus !== 'approved') return;
    const unsub = onSnapshot(
      doc(db, 'config', 'adminAccess'),
      (snap) => {
        const roles = snap.exists()
          ? (snap.data()?.allowedRoles || DEFAULT_ALLOWED_ROLES)
          : DEFAULT_ALLOWED_ROLES;
        setAllowedRoles(Array.isArray(roles) ? roles : DEFAULT_ALLOWED_ROLES);
        setAccessChecked(true);
      },
      () => {
        setAllowedRoles(DEFAULT_ALLOWED_ROLES);
        setAccessChecked(true);
      }
    );
    return () => unsub();
  }, [user?.uid, userStatus]);

  const { ready: permReady, perms } = useExecPermissions();

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

  // President and setup/system admin role always have access; others need config/adminAccess.allowedRoles
  if (userRole !== 'President' && userRole !== 'admin' && !allowedRoles.includes(userRole)) {
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

  // Site Content (President only): edit footer, home, about (main + general body + design team), sponsors
  if (currentPath === '/admin/site' || currentPath === '/admin/about') {
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

  // Project Approvals page (Projects area permission only)
  if (currentPath === '/admin/projects/approvals') {
    if (!permReady) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
          <p className="text-gray-600">Loading…</p>
        </div>
      );
    }
    if (!perms.projects) {
      return <ProjectsAreaDenied onNavigate={onNavigate} />;
    }
    return <ProjectApprovals onNavigate={onNavigate || (() => {})} />;
  }

  // Project Trash page (Projects area permission only)
  if (currentPath === '/admin/projects/trash') {
    if (!permReady) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
          <p className="text-gray-600">Loading…</p>
        </div>
      );
    }
    if (!perms.projects) {
      return <ProjectsAreaDenied onNavigate={onNavigate} />;
    }
    return <ProjectTrash onNavigate={onNavigate || (() => {})} />;
  }

  // Project Edit page (full-page edit for project detail / Join Slack section)
  if (currentPath.startsWith('/admin/projects/edit/')) {
    const projectId = currentPath.replace(/^\/admin\/projects\/edit\/?/, '').split('/')[0];
    if (projectId) {
      return <ProjectEditPage projectId={projectId} onNavigate={onNavigate || (() => {})} />;
    }
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
  return <Dashboard onNavigate={onNavigate || (() => {})} currentUserRole={userRole} />;
};

export default Admin;
