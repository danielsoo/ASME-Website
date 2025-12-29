import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, Timestamp, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import AlertModal from '../../components/AlertModal';
import ConfirmModal from '../../components/ConfirmModal';

interface UserApprovalProps {
  onNavigate: (path: string) => void;
}

interface PendingUser {
  uid: string;
  name: string;
  email: string;
  major: string;
  year: string;
  createdAt: Timestamp;
  emailVerified: boolean;
  status: 'pending' | 'approved' | 'rejected';
  role?: string; // 'admin', 'member', or position name (e.g., 'President', 'Treasurer', 'Design Director')
}

const UserApproval: React.FC<UserApprovalProps> = ({ onNavigate }) => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<PendingUser[]>([]);
  const [rejectedUsers, setRejectedUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  
  // Alert modal states
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setAlertModal({ isOpen: true, type, title, message });
  };

  useEffect(() => {
    loadUsers();
    
    // Get current user's role
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setCurrentUserRole(userData.role || 'member');
          }
        } catch (error) {
          console.error('Error fetching current user role:', error);
        }
      }
    });
    
    return () => unsubscribe();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      const allUsers: PendingUser[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const userData = {
          uid: docSnap.id,
          ...data,
          role: data.role || 'member', // Ensure role field exists
        } as PendingUser;
        
        // Debug: Log user role for troubleshooting
        if (data.email === 'yqp5187@psu.edu') {
          console.log('User role data:', {
            uid: docSnap.id,
            email: data.email,
            role: data.role,
            status: data.status,
            allData: data
          });
        }
        
        allUsers.push(userData);
      });

      setPendingUsers(allUsers.filter(u => u.status === 'pending'));
      setApprovedUsers(allUsers.filter(u => u.status === 'approved'));
      setRejectedUsers(allUsers.filter(u => u.status === 'rejected'));
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (uid: string) => {
    try {
      const currentUser = auth.currentUser;
      await updateDoc(doc(db, 'users', uid), {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: currentUser?.email || 'admin',
      });
      await loadUsers();
      showAlert('success', 'Success', 'User approved successfully!');
    } catch (error) {
      console.error('Error approving user:', error);
      showAlert('error', 'Error', 'An error occurred while approving user. Please try again.');
    }
  };

  const handleRejectClick = (uid: string) => {
    setUserToReject(uid);
    setShowConfirmReject(true);
  };

  const handleReject = async () => {
    if (!userToReject) return;

    try {
      const currentUser = auth.currentUser;
      await updateDoc(doc(db, 'users', userToReject), {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: currentUser?.email || 'admin',
      });
      setUserToReject(null);
      await loadUsers();
      showAlert('success', 'Success', 'User rejected successfully!');
    } catch (error) {
      console.error('Error rejecting user:', error);
      showAlert('error', 'Error', 'An error occurred while rejecting user. Please try again.');
    }
  };


  const currentUsers = activeTab === 'pending' ? pendingUsers : activeTab === 'approved' ? approvedUsers : rejectedUsers;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">User Approval</h1>
          <button
            onClick={() => onNavigate('/admin')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-2 rounded font-medium ${
              activeTab === 'pending' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Pending ({pendingUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-6 py-2 rounded font-medium ${
              activeTab === 'approved' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Approved ({approvedUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-6 py-2 rounded font-medium ${
              activeTab === 'rejected' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Rejected ({rejectedUsers.length})
          </button>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : currentUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No users found.</div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Major</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentUsers.map((user) => (
                  <tr key={user.uid}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.major}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.year}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {activeTab === 'pending' && (
                        <span className="inline-block px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">Pending</span>
                      )}
                      {activeTab === 'approved' && (
                        <span className="inline-block px-2 py-1 text-xs rounded bg-green-100 text-green-800">Approved</span>
                      )}
                      {activeTab === 'rejected' && (
                        <span className="inline-block px-2 py-1 text-xs rounded bg-red-100 text-red-800">Rejected</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {activeTab === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApprove(user.uid)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(user.uid)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {activeTab === 'approved' && (
                        <span className="text-green-600">✓ Approved</span>
                      )}
                      {activeTab === 'rejected' && (
                        <span className="text-red-600">✗ Rejected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Alert Modal */}
        <AlertModal
          isOpen={alertModal.isOpen}
          onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
          type={alertModal.type}
          title={alertModal.title}
          message={alertModal.message}
        />

        {/* Confirm Reject Modal */}
        <ConfirmModal
          isOpen={showConfirmReject}
          onClose={() => {
            setShowConfirmReject(false);
            setUserToReject(null);
          }}
          onConfirm={handleReject}
          title="Reject User"
          message="Are you sure you want to reject this user?"
          confirmText="Reject"
          cancelText="Cancel"
          type="danger"
        />
      </div>
    </div>
  );
};

export default UserApproval;
