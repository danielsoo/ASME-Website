import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../../firebase/config';
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

interface AdminProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

const Admin: React.FC<AdminProps> = ({ currentPath = '/admin', onNavigate }) => {
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Admin component - currentPath:', currentPath); // Debug
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      // Load user name from Firestore
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserName(userData.name || user.email?.split('@')[0] || 'User');
          } else {
            setUserName(user.email?.split('@')[0] || 'User');
          }
        } catch (error) {
          console.error('Error loading user name:', error);
          setUserName(user.email?.split('@')[0] || 'User');
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentPath]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      if (onNavigate) {
        onNavigate('/admin');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

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

  const AdminHeader = () => (
    <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <button
          onClick={() => onNavigate && onNavigate('/')}
          className="text-white hover:text-gray-300 transition text-lg font-semibold"
        >
          ← Home
        </button>
        <span className="text-gray-400">|</span>
        <h1 className="text-xl font-bold">Admin Panel</h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">{userName || user.email?.split('@')[0] || 'User'}</span>
        <button
          onClick={() => onNavigate && onNavigate('/profile')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
        >
          Profile
        </button>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>
    </div>
  );

  // Show dashboard or specific admin pages
  if (currentPath === '/admin' || currentPath === '/admin/') {
    return (
      <div>
        <AdminHeader />
        <Dashboard onNavigate={onNavigate || (() => {})} />
      </div>
    );
  }

  // User Approval page
  if (currentPath === '/admin/approvals' || currentPath === '/admin/users') {
    return (
      <div>
        <AdminHeader />
        <UserApproval onNavigate={onNavigate || (() => {})} />
      </div>
    );
  }

  // Project Management page
  if (currentPath === '/admin/projects') {
    return (
      <div>
        <AdminHeader />
        <ProjectManagement onNavigate={onNavigate || (() => {})} />
      </div>
    );
  }

  // Project Approvals page
  if (currentPath === '/admin/projects/approvals') {
    return (
      <div>
        <AdminHeader />
        <ProjectApprovals onNavigate={onNavigate || (() => {})} />
      </div>
    );
  }

  // Project Trash page
  if (currentPath === '/admin/projects/trash') {
    return (
      <div>
        <AdminHeader />
        <ProjectTrash onNavigate={onNavigate || (() => {})} />
      </div>
    );
  }

  // Members Management page
  if (currentPath === '/admin/members') {
    return (
      <div>
        <AdminHeader />
        <MemberManagement onNavigate={onNavigate || (() => {})} />
      </div>
    );
  }

  // Sponsors Management page
  if (currentPath === '/admin/sponsors') {
    return (
      <div>
        <AdminHeader/>
        
      </div>
    )
  }

  // Default to dashboard
  return (
    <div>
      <AdminHeader />
      <Dashboard onNavigate={onNavigate || (() => {})} />
    </div>
  );
};

export default Admin;
