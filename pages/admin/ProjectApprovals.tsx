import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../src/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { Project } from '../../src/types';
import { Check, X } from 'lucide-react';
import AlertModal from '../../src/components/AlertModal';
import ConfirmModal from '../../src/components/ConfirmModal';

interface ProjectApprovalsProps {
  onNavigate: (path: string) => void;
}

const ProjectApprovals: React.FC<ProjectApprovalsProps> = ({ onNavigate }) => {
  const [pendingProjects, setPendingProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [projectLeaderId, setProjectLeaderId] = useState('');
  
  // Confirm reject modal state
  const [showConfirmReject, setShowConfirmReject] = useState(false);
  const [projectToReject, setProjectToReject] = useState<string | null>(null);
  
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
    loadPendingProjects();
    loadAllUsers();

    // Get current user's role
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUserId(user.uid);
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

  const loadPendingProjects = async () => {
    try {
      setLoading(true);
      const projectsRef = collection(db, 'projects');
      const snapshot = await getDocs(projectsRef);
      const projectsList: Project[] = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.approvalStatus === 'pending') {
          projectsList.push({
            id: docSnap.id,
            ...data,
          } as Project);
        }
      });

      // Sort by creation date (newest first)
      projectsList.sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });

      setPendingProjects(projectsList);
    } catch (error) {
      console.error('Error loading pending projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const usersList: any[] = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 'approved') {
          usersList.push({
            uid: docSnap.id,
            ...data,
          });
        }
      });

      setAllUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // Check if user can approve projects
  const canApproveProjects = (): boolean => {
    return currentUserRole === 'President' || currentUserRole === 'Vice President';
  };

  const handleApprove = async () => {
    if (!selectedProject) return;

    if (!projectLeaderId) {
      showAlert('warning', 'Validation Error', 'Please assign a project leader before approving.');
      return;
    }

    const leaderUser = allUsers.find(u => u.uid === projectLeaderId);
    if (!leaderUser) {
      showAlert('error', 'Error', 'Selected leader not found.');
      return;
    }

    try {
      await updateDoc(doc(db, 'projects', selectedProject.id), {
        approvalStatus: 'approved',
        leaderId: projectLeaderId,
        leaderEmail: leaderUser.email,
        approvedBy: currentUserId,
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setShowApproveModal(false);
      setSelectedProject(null);
      setProjectLeaderId('');
      await loadPendingProjects();
      showAlert('success', 'Success', 'Project approved successfully!');
    } catch (error) {
      console.error('Error approving project:', error);
      showAlert('error', 'Error', 'Failed to approve project. Please try again.');
    }
  };

  const handleRejectClick = (projectId: string) => {
    setProjectToReject(projectId);
    setShowConfirmReject(true);
  };

  const handleReject = async () => {
    if (!projectToReject) return;

    try {
      await updateDoc(doc(db, 'projects', projectToReject), {
        approvalStatus: 'rejected',
        updatedAt: new Date().toISOString(),
      });

      setProjectToReject(null);
      await loadPendingProjects();
      showAlert('success', 'Success', 'Project rejected successfully!');
    } catch (error) {
      console.error('Error rejecting project:', error);
      showAlert('error', 'Error', 'Failed to reject project. Please try again.');
    }
  };

  const openApproveModal = (project: Project) => {
    setSelectedProject(project);
    setProjectLeaderId('');
    setShowApproveModal(true);
  };

  if (!canApproveProjects()) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center overflow-x-auto">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
          <p className="text-gray-600">Only President and Vice President can approve projects.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 overflow-x-auto">
      <div className="max-w-7xl mx-auto min-w-0">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Project Approvals</h1>
          <button
            onClick={() => onNavigate('/admin/projects')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 sm:px-4 rounded text-sm sm:text-base shrink-0"
          >
            ← Back to Projects
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : pendingProjects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg mb-2">No pending projects</p>
            <p className="text-sm">All projects have been approved.</p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {pendingProjects.map((project) => {
              const createdByUser = allUsers.find(u => u.uid === project.createdBy);
              return (
                <div key={project.id} className="bg-white rounded-lg shadow-md p-4 sm:p-6 min-w-0">
                  <div className="flex flex-wrap justify-between items-start gap-2 mb-3 sm:mb-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg sm:text-2xl font-bold text-gray-800 mb-2 break-words">{project.title}</h2>
                      {project.description && (
                        <p className="text-gray-600 mb-3">{project.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        {createdByUser && (
                          <div>
                            <span className="font-semibold">Created by:</span>{' '}
                            {createdByUser.name || createdByUser.email} ({createdByUser.role || 'member'})
                          </div>
                        )}
                        {project.createdAt && (
                          <div>
                            <span className="font-semibold">Created:</span>{' '}
                            {new Date(project.createdAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="inline-block px-3 py-1 text-xs rounded bg-yellow-100 text-yellow-800 font-semibold">
                      Pending Approval
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => openApproveModal(project)}
                      className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-2 sm:px-4 rounded text-sm sm:text-base"
                    >
                      <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                      Approve & Assign Leader
                    </button>
                    <button
                      onClick={() => handleReject(project.id)}
                      className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-2 sm:px-4 rounded text-sm sm:text-base"
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Approve Modal */}
        {showApproveModal && selectedProject && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">
                Approve Project: {selectedProject.title}
              </h2>

              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Please assign a project leader before approving this project.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Leader *
                  </label>
                  <select
                    value={projectLeaderId}
                    onChange={(e) => setProjectLeaderId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select a project leader...</option>
                    {allUsers.map((user) => (
                      <option key={user.uid} value={user.uid}>
                        {user.name || user.email} ({user.role || 'member'})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    The project leader will be able to assign members and manage project roles
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleApprove}
                  disabled={!projectLeaderId}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Approve Project
                </button>
                <button
                  onClick={() => {
                    setShowApproveModal(false);
                    setSelectedProject(null);
                    setProjectLeaderId('');
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
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
            setProjectToReject(null);
          }}
          onConfirm={handleReject}
          title="Reject Project"
          message="Are you sure you want to reject this project? It will be marked as rejected."
          confirmText="Reject"
          cancelText="Cancel"
          type="danger"
        />
      </div>
    </div>
  );
};

export default ProjectApprovals;
