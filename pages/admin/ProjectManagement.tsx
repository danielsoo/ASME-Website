import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { Project, ProjectMember } from '../../types';
import { Plus, Edit, Trash2, Users, UserPlus } from 'lucide-react';
import AlertModal from '../../components/AlertModal';
import ConfirmModal from '../../components/ConfirmModal';

interface ProjectManagementProps {
  onNavigate: (path: string) => void;
}

const ProjectManagement: React.FC<ProjectManagementProps> = ({ onNavigate }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Form states
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectStatus, setProjectStatus] = useState<'current' | 'past'>('current');
  const [projectLeaderId, setProjectLeaderId] = useState('');

  // Confirm delete modal state
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

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
    loadProjects();
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

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectsRef = collection(db, 'projects');
      const snapshot = await getDocs(projectsRef);
      const projectsList: Project[] = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Only show projects that are not deleted (deletedAt is null or undefined)
        if (!data.deletedAt) {
          projectsList.push({
            id: docSnap.id,
            ...data,
          } as Project);
        }
      });

      // Sort: current first, then by title
      projectsList.sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'current' ? -1 : 1;
        }
        return a.title.localeCompare(b.title);
      });

      setProjects(projectsList);
    } catch (error) {
      console.error('Error loading projects:', error);
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

  const [execPositions, setExecPositions] = useState<string[]>([]);

  useEffect(() => {
    loadExecPositions();
  }, []);

  const loadExecPositions = async () => {
    try {
      const positionsRef = collection(db, 'execPositions');
      const snapshot = await getDocs(positionsRef);
      const positionsList: string[] = ['admin']; // Always include admin
      
      snapshot.forEach((docSnap) => {
        const positionName = docSnap.data().name;
        if (positionName) {
          positionsList.push(positionName);
        }
      });

      setExecPositions(positionsList);
    } catch (error) {
      console.error('Error loading exec positions:', error);
      // Fallback to default positions if collection doesn't exist
      setExecPositions([
        'President',
        'Vice President',
        'Treasurer',
        'Secretary',
        'Corporate Outreach Lead',
        'THON Chair',
        'Design Director',
        'Internal Outreach',
        'Events Coordinator',
        'Logistics Officer',
        'admin',
      ]);
    }
  };

  // Check if user is Executive Board member
  const isExecBoardMember = (): boolean => {
    return execPositions.includes(currentUserRole);
  };

  // Check if user can manage/approve projects (President/VP/Admin only)
  const canManageProjects = (): boolean => {
    return currentUserRole === 'President' || currentUserRole === 'Vice President' || currentUserRole === 'admin';
  };

  // Check if user can delete projects (President/VP only)
  const canDeleteProjects = (): boolean => {
    return currentUserRole === 'President' || currentUserRole === 'Vice President';
  };

  // Check if user can approve projects (President/VP only)
  const canApproveProjects = (): boolean => {
    return currentUserRole === 'President' || currentUserRole === 'Vice President';
  };

  // Check if user is project leader
  const isProjectLeader = (project: Project): boolean => {
    const isLeader = project.leaderId === currentUserId;
    // Debug logging
    if (project.title === 'Assistive Tech' || project.leaderId) {
      console.log('Project Leader Check:', {
        projectTitle: project.title,
        projectLeaderId: project.leaderId,
        currentUserId: currentUserId,
        isLeader: isLeader
      });
    }
    return isLeader;
  };

  const handleCreateProject = async () => {
    if (!projectTitle.trim()) {
      showAlert('warning', 'Validation Error', 'Please enter a project title.');
      return;
    }

    // Executive Board members can create projects, but need approval
    // President/VP/Admin can create approved projects directly
    const needsApproval = !canManageProjects();

    try {
      await addDoc(collection(db, 'projects'), {
        title: projectTitle.trim(),
        description: projectDescription.trim(),
        imageUrl: '',
        chairs: [],
        status: projectStatus,
        // Only President/VP/Admin can assign leader directly
        leaderId: canManageProjects() ? (projectLeaderId || null) : null,
        leaderEmail: canManageProjects() && projectLeaderId
          ? allUsers.find(u => u.uid === projectLeaderId)?.email || ''
          : '',
        members: [],
        approvalStatus: needsApproval ? 'pending' : 'approved',
        createdBy: currentUserId,
        approvedBy: canManageProjects() ? currentUserId : null,
        approvedAt: canManageProjects() ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setShowCreateModal(false);
      setProjectTitle('');
      setProjectDescription('');
      setProjectStatus('current');
      setProjectLeaderId('');
      await loadProjects();
      
      if (needsApproval) {
        showAlert('success', 'Project Created', 'Project created successfully! It is pending approval from President or Vice President.');
      } else {
        showAlert('success', 'Success', 'Project created successfully!');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      showAlert('error', 'Error', 'Failed to create project. Please try again.');
    }
  };

  const handleEditProject = async () => {
    if (!selectedProject || !projectTitle.trim()) {
      return;
    }

    // Only allow editing if user is President/VP/Admin (canManageProjects)
    // Project leaders cannot edit project details, only manage members
    if (!canManageProjects()) {
      showAlert('error', 'Access Denied', 'Only President, Vice President, or Admin can edit project details.');
      setShowEditModal(false);
      setSelectedProject(null);
      return;
    }

    try {
      const leaderUser = projectLeaderId ? allUsers.find(u => u.uid === projectLeaderId) : null;
      
      await updateDoc(doc(db, 'projects', selectedProject.id), {
        title: projectTitle.trim(),
        description: projectDescription.trim(),
        status: projectStatus,
        leaderId: projectLeaderId || null,
        leaderEmail: leaderUser?.email || '',
        updatedAt: new Date().toISOString(),
      });

      setShowEditModal(false);
      setSelectedProject(null);
      await loadProjects();
      showAlert('success', 'Success', 'Project updated successfully!');
    } catch (error) {
      console.error('Error updating project:', error);
      showAlert('error', 'Error', 'Failed to update project. Please try again.');
    }
  };

  const handleDeleteClick = (projectId: string) => {
    setProjectToDelete(projectId);
    setShowConfirmDelete(true);
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    if (!canDeleteProjects()) {
      showAlert('error', 'Access Denied', 'Only President and Vice President can delete projects.');
      setProjectToDelete(null);
      setShowConfirmDelete(false);
      return;
    }

    try {
      // Soft delete: Set deletedAt timestamp instead of actually deleting
      await updateDoc(doc(db, 'projects', projectToDelete), {
        deletedAt: new Date().toISOString(),
        deletedBy: currentUserId,
        updatedAt: new Date().toISOString(),
      });
      await loadProjects();
      setProjectToDelete(null);
      showAlert('success', 'Success', 'Project moved to trash successfully!');
    } catch (error) {
      console.error('Error deleting project:', error);
      showAlert('error', 'Error', 'Failed to delete project. Please try again.');
    }
  };

  const openEditModal = (project: Project) => {
    // Only allow editing if user is President/VP/Admin
    if (!canManageProjects()) {
      showAlert('error', 'Access Denied', 'Only President, Vice President, or Admin can edit project details.');
      return;
    }
    setSelectedProject(project);
    setProjectTitle(project.title);
    setProjectDescription(project.description);
    setProjectStatus(project.status);
    setProjectLeaderId(project.leaderId || '');
    setShowEditModal(true);
  };

  const openMemberModal = (project: Project) => {
    setSelectedProject(project);
    setShowMemberModal(true);
  };

  // Check access: Executive Board can create, President/VP/Admin can manage all, leaders can manage their projects
  const hasProjectAccess = isExecBoardMember() || canManageProjects() || projects.some(p => isProjectLeader(p));
  
  if (!hasProjectAccess) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
          <p className="text-gray-600">You do not have permission to manage projects.</p>
        </div>
      </div>
    );
  }

  // Filter projects based on user role
  let visibleProjects: Project[] = [];
  if (canManageProjects()) {
    // President/VP/Admin: see all projects
    visibleProjects = projects;
  } else {
    // Executive Board members: see projects they created or are leaders of
    visibleProjects = projects.filter(p => 
      p.createdBy === currentUserId || isProjectLeader(p)
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Project Management</h1>
          <div className="flex gap-2">
            <button
              onClick={() => onNavigate('/admin')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
            >
              ← Back to Dashboard
            </button>
            {isExecBoardMember() && (
              <button
                onClick={() => {
                  setProjectTitle('');
                  setProjectDescription('');
                  setProjectStatus('current');
                  setProjectLeaderId('');
                  setShowCreateModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Project
              </button>
            )}
            {canApproveProjects() && (
              <button
                onClick={() => onNavigate('/admin/projects/approvals')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2"
              >
                Approve Projects
              </button>
            )}
            {canDeleteProjects() && (
              <button
                onClick={() => onNavigate('/admin/projects/trash')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded flex items-center gap-2"
              >
                Trash
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : visibleProjects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No projects found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleProjects.map((project) => (
              <div key={project.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-1">{project.title}</h2>
                    <div className="flex gap-2 flex-wrap">
                      <span className={`inline-block px-2 py-1 text-xs rounded ${
                        project.status === 'current' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status === 'current' ? 'Current' : 'Past'}
                      </span>
                      {project.approvalStatus === 'pending' && (
                        <span className="inline-block px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">
                          Pending Approval
                        </span>
                      )}
                    </div>
                  </div>
                  {canManageProjects() && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(project)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit Project"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      {canDeleteProjects() && (
                        <button
                          onClick={() => handleDeleteClick(project.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete Project"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {project.description}
                </p>

                <div className="space-y-2 mb-4">
                  {(project.leaderEmail || project.leaderId) && (() => {
                    const leaderUser = project.leaderId 
                      ? allUsers.find(u => u.uid === project.leaderId)
                      : project.leaderEmail 
                      ? allUsers.find(u => u.email === project.leaderEmail)
                      : null;
                    const leaderName = leaderUser?.name || project.leaderEmail?.split('@')[0] || 'Unknown';
                    return (
                      <div className="text-sm">
                        <span className="font-semibold text-gray-700">Leader:</span>{' '}
                        <span className="text-gray-600">{leaderName}</span>
                        {project.leaderEmail && (
                          <span className="text-xs text-gray-500 ml-1">({project.leaderEmail})</span>
                        )}
                      </div>
                    );
                  })()}
                  <div className="text-sm">
                    <span className="font-semibold text-gray-700">Members:</span>{' '}
                    <span className="text-gray-600">
                      {(project.members?.length || 0) + (project.chairs?.length || 0)}
                    </span>
                    {project.chairs?.length > 0 && project.members?.length > 0 && (
                      <span className="text-xs text-gray-500 ml-1">
                        ({project.members.length} managed, {project.chairs.length} legacy)
                      </span>
                    )}
                  </div>
                </div>

                {(project.approvalStatus === 'approved' || !project.approvalStatus) && isProjectLeader(project) && (
                  <button
                    onClick={() => openMemberModal(project)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center justify-center gap-2 text-sm"
                  >
                    <Users className="w-4 h-4" />
                    Manage Members
                  </button>
                )}
                {project.approvalStatus === 'pending' && project.createdBy === currentUserId && (
                  <div className="text-sm text-yellow-600 text-center">
                    Waiting for approval
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Project Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Create New Project</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Title *
                  </label>
                  <input
                    type="text"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    placeholder="e.g., Assistive Tech"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    rows={4}
                    placeholder="Project description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={projectStatus}
                    onChange={(e) => setProjectStatus(e.target.value as 'current' | 'past')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    style={{ color: '#111827', backgroundColor: '#ffffff', appearance: 'menulist' }}
                  >
                    <option value="current" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Current</option>
                    <option value="past" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Past</option>
                  </select>
                </div>

                {canManageProjects() && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Leader (Optional)
                    </label>
                    <select
                      value={projectLeaderId}
                      onChange={(e) => setProjectLeaderId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                      style={{ color: '#111827', backgroundColor: '#ffffff', appearance: 'menulist' }}
                    >
                      <option value="" style={{ color: '#111827', backgroundColor: '#ffffff' }}>No Leader</option>
                      {allUsers.map((user) => (
                        <option key={user.uid} value={user.uid} style={{ color: '#111827', backgroundColor: '#ffffff' }}>
                          {user.name || user.email} ({user.role || 'member'})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      The project leader can assign members and manage project roles
                    </p>
                  </div>
                )}
                {!canManageProjects() && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                    <p className="font-semibold mb-1">Note:</p>
                    <p>Your project will be created and sent for approval. President or Vice President will assign a project leader upon approval.</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleCreateProject}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  Create Project
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Project Modal */}
        {showEditModal && selectedProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Edit Project</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Title *
                  </label>
                  <input
                    type="text"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={projectStatus}
                    onChange={(e) => setProjectStatus(e.target.value as 'current' | 'past')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    style={{ color: '#111827', backgroundColor: '#ffffff', appearance: 'menulist' }}
                  >
                    <option value="current" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Current</option>
                    <option value="past" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Past</option>
                  </select>
                </div>

                {canManageProjects() && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Leader
                    </label>
                    <select
                      value={projectLeaderId}
                      onChange={(e) => setProjectLeaderId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                      style={{ color: '#111827', backgroundColor: '#ffffff', appearance: 'menulist' }}
                    >
                      <option value="" style={{ color: '#111827', backgroundColor: '#ffffff' }}>No Leader</option>
                      {allUsers.map((user) => (
                        <option key={user.uid} value={user.uid} style={{ color: '#111827', backgroundColor: '#ffffff' }}>
                          {user.name || user.email} ({user.role || 'member'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleEditProject}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedProject(null);
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Project Member Management Modal */}
        {showMemberModal && selectedProject && (
          <ProjectMemberManagement
            project={selectedProject}
            allUsers={allUsers}
            currentUserId={currentUserId}
            canManageProjects={canManageProjects()}
            isProjectLeader={isProjectLeader(selectedProject)}
            onClose={() => {
              setShowMemberModal(false);
              setSelectedProject(null);
            }}
            onUpdate={loadProjects}
          />
        )}

        {/* Alert Modal */}
        <AlertModal
          isOpen={alertModal.isOpen}
          onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
          type={alertModal.type}
          title={alertModal.title}
          message={alertModal.message}
        />

        {/* Confirm Delete Modal */}
        <ConfirmModal
          isOpen={showConfirmDelete}
          onClose={() => {
            setShowConfirmDelete(false);
            setProjectToDelete(null);
          }}
          onConfirm={handleDeleteProject}
          title="Move to Trash"
          message="Are you sure you want to delete this project? It will be moved to trash and can be restored later."
          confirmText="Move to Trash"
          cancelText="Cancel"
          type="warning"
        />
      </div>
    </div>
  );
};

// Project Member Management Component
interface ProjectMemberManagementProps {
  project: Project;
  allUsers: any[];
  currentUserId: string;
  canManageProjects: boolean;
  isProjectLeader: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const ProjectMemberManagement: React.FC<ProjectMemberManagementProps> = ({
  project,
  allUsers,
  currentUserId,
  canManageProjects,
  isProjectLeader,
  onClose,
  onUpdate,
}) => {
  const [members, setMembers] = useState<ProjectMember[]>(project.members || []);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserRole, setSelectedUserRole] = useState('');
  const [showConfirmRemoveMember, setShowConfirmRemoveMember] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  
  // Project roles management
  const [projectRoles, setProjectRoles] = useState<string[]>(
    project.projectRoles || [
      'Software Lead',
      'Hardware Lead',
      'Design Lead',
      'Mechanical Lead',
      'Electrical Lead',
      'Firmware Lead',
      'Designer',
      'Developer',
      'Engineer',
      'Member',
    ]
  );
  const [showManageRoles, setShowManageRoles] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
  const [showConfirmDeleteRole, setShowConfirmDeleteRole] = useState(false);

  // Combine default roles with custom project roles
  const projectRoleOptions = projectRoles;

  const [memberAlertModal, setMemberAlertModal] = useState<{
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

  const showMemberAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setMemberAlertModal({ isOpen: true, type, title, message });
  };

  const handleAddMember = async () => {
    if (!selectedUserId) {
      showMemberAlert('warning', 'Validation Error', 'Please select a user.');
      return;
    }

    const user = allUsers.find(u => u.uid === selectedUserId);
    if (!user) {
      showMemberAlert('error', 'Error', 'User not found.');
      return;
    }

    // Check if already a member
    if (members.some(m => m.userId === selectedUserId)) {
      showMemberAlert('warning', 'Already Added', 'User is already a project member.');
      return;
    }

    const newMember: ProjectMember = {
      userId: selectedUserId,
      userEmail: user.email,
      userName: user.name || user.email,
      projectRole: selectedUserRole || 'Member',
      assignedBy: currentUserId,
      assignedAt: new Date().toISOString(),
    };

    try {
      const updatedMembers = [...members, newMember];
      await updateDoc(doc(db, 'projects', project.id), {
        members: updatedMembers,
        updatedAt: new Date().toISOString(),
      });

      setMembers(updatedMembers);
      setSelectedUserId('');
      setSelectedUserRole('');
      setShowAddMember(false);
      onUpdate();
      showMemberAlert('success', 'Success', 'Member added to project successfully!');
    } catch (error) {
      console.error('Error adding member:', error);
      showMemberAlert('error', 'Error', 'Failed to add member. Please try again.');
    }
  };

  const handleRemoveMemberClick = (userId: string) => {
    setMemberToRemove(userId);
    setShowConfirmRemoveMember(true);
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      const updatedMembers = members.filter(m => m.userId !== memberToRemove);
      await updateDoc(doc(db, 'projects', project.id), {
        members: updatedMembers,
        updatedAt: new Date().toISOString(),
      });

      setMembers(updatedMembers);
      setMemberToRemove(null);
      onUpdate();
      showMemberAlert('success', 'Success', 'Member removed from project successfully!');
    } catch (error) {
      console.error('Error removing member:', error);
      showMemberAlert('error', 'Error', 'Failed to remove member. Please try again.');
    }
  };

  const handleUpdateMemberRole = async (userId: string, newRole: string) => {
    try {
      const updatedMembers = members.map(m =>
        m.userId === userId ? { ...m, projectRole: newRole } : m
      );
      await updateDoc(doc(db, 'projects', project.id), {
        members: updatedMembers,
        updatedAt: new Date().toISOString(),
      });

      setMembers(updatedMembers);
      onUpdate();
      showMemberAlert('success', 'Success', 'Member role updated successfully!');
    } catch (error) {
      console.error('Error updating member role:', error);
      showMemberAlert('error', 'Error', 'Failed to update member role. Please try again.');
    }
  };

  // Get available users (not already members)
  const availableUsers = allUsers.filter(
    user => !members.some(m => m.userId === user.uid)
  );

  // Handle add project role
  const handleAddProjectRole = async () => {
    if (!newRoleName.trim()) {
      showMemberAlert('warning', 'Validation Error', 'Please enter a role name.');
      return;
    }

    if (projectRoles.includes(newRoleName.trim())) {
      showMemberAlert('warning', 'Duplicate Role', 'This role already exists.');
      return;
    }

    try {
      const updatedRoles = [...projectRoles, newRoleName.trim()];
      await updateDoc(doc(db, 'projects', project.id), {
        projectRoles: updatedRoles,
        updatedAt: new Date().toISOString(),
      });

      setProjectRoles(updatedRoles);
      setNewRoleName('');
      showMemberAlert('success', 'Success', 'Project role added successfully!');
    } catch (error) {
      console.error('Error adding project role:', error);
      showMemberAlert('error', 'Error', 'Failed to add project role. Please try again.');
    }
  };

  // Handle delete project role
  const handleDeleteRoleClick = (role: string) => {
    // Check if role is being used by any member
    const isUsed = members.some(m => m.projectRole === role);
    if (isUsed) {
      showMemberAlert('warning', 'Cannot Delete', `Cannot delete role "${role}" because it is currently assigned to one or more members. Please reassign members before deleting.`);
      return;
    }

    setRoleToDelete(role);
    setShowConfirmDeleteRole(true);
  };

  const handleDeleteProjectRole = async () => {
    if (!roleToDelete) return;

    try {
      const updatedRoles = projectRoles.filter(r => r !== roleToDelete);
      await updateDoc(doc(db, 'projects', project.id), {
        projectRoles: updatedRoles,
        updatedAt: new Date().toISOString(),
      });

      setProjectRoles(updatedRoles);
      setRoleToDelete(null);
      setShowConfirmDeleteRole(false);
      showMemberAlert('success', 'Success', 'Project role deleted successfully!');
    } catch (error) {
      console.error('Error deleting project role:', error);
      showMemberAlert('error', 'Error', 'Failed to delete project role. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Manage Members - {project.title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {(canManageProjects || isProjectLeader) && (
          <div className="mb-6 space-y-3">
            <div className="flex gap-2">
              {!showAddMember ? (
                <button
                  onClick={() => setShowAddMember(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
                >
                  <UserPlus className="w-5 h-5" />
                  Add Member
                </button>
              ) : (
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select User
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    style={{ color: '#111827', backgroundColor: '#ffffff', appearance: 'menulist' }}
                  >
                    <option value="" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Choose a user...</option>
                    {availableUsers.map((user) => (
                      <option key={user.uid} value={user.uid} style={{ color: '#111827', backgroundColor: '#ffffff' }}>
                        {user.name || user.email} ({user.role || 'member'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Role
                  </label>
                  <select
                    value={selectedUserRole}
                    onChange={(e) => setSelectedUserRole(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    style={{ color: '#111827', backgroundColor: '#ffffff', appearance: 'menulist' }}
                  >
                    {projectRoleOptions.map((role) => (
                      <option key={role} value={role} style={{ color: '#111827', backgroundColor: '#ffffff' }}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleAddMember}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  >
                    Add Member
                  </button>
                  <button
                    onClick={() => {
                      setShowAddMember(false);
                      setSelectedUserId('');
                      setSelectedUserRole('');
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              )}
              
              {/* Manage Project Roles Button */}
              <button
                onClick={() => setShowManageRoles(!showManageRoles)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center gap-2"
              >
                <Users className="w-5 h-5" />
                Manage Roles
              </button>
            </div>
            
            {/* Project Roles Management Section */}
            {showManageRoles && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-800">Project Roles</h4>
                </div>
                
                {/* Add New Role */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="Enter new role name (e.g., Software Lead)"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddProjectRole();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddProjectRole}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                  >
                    Add Role
                  </button>
                </div>
                
                {/* List of Roles */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Current Roles:</p>
                  <div className="flex flex-wrap gap-2">
                    {projectRoles.map((role) => {
                      const isUsed = members.some(m => m.projectRole === role);
                      return (
                        <div
                          key={role}
                          className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 ${
                            isUsed
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-gray-100 text-gray-800 border border-gray-300'
                          }`}
                        >
                          <span>{role}</span>
                          {isUsed && (
                            <span className="text-xs text-blue-600">(in use)</span>
                          )}
                          {!isUsed && (
                            <button
                              onClick={() => handleDeleteRoleClick(role)}
                              className="text-red-600 hover:text-red-800 text-xs font-semibold"
                              title="Delete role"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {projectRoles.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No custom roles defined. Default roles will be used.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Project Members ({members.length})
          </h3>

          {members.length === 0 ? (
            <p className="text-gray-500">No members assigned to this project.</p>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Project Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {members.map((member) => {
                    const user = allUsers.find(u => u.uid === member.userId);
                    return (
                      <tr key={member.userId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {member.userName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.userEmail}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {(canManageProjects || isProjectLeader) ? (
                            <select
                              value={member.projectRole}
                              onChange={(e) => handleUpdateMemberRole(member.userId, e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900"
                              style={{ color: '#111827', backgroundColor: '#ffffff' }}
                            >
                              {projectRoleOptions.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-gray-700">{member.projectRole}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {(canManageProjects || isProjectLeader) && (
                            <button
                              onClick={() => handleRemoveMemberClick(member.userId)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Member Alert Modal */}
        <AlertModal
          isOpen={memberAlertModal.isOpen}
          onClose={() => setMemberAlertModal({ ...memberAlertModal, isOpen: false })}
          type={memberAlertModal.type}
          title={memberAlertModal.title}
          message={memberAlertModal.message}
        />

        {/* Confirm Delete Role Modal */}
        <ConfirmModal
          isOpen={showConfirmDeleteRole}
          onClose={() => {
            setShowConfirmDeleteRole(false);
            setRoleToDelete(null);
          }}
          onConfirm={handleDeleteProjectRole}
          title="Delete Project Role"
          message={`Are you sure you want to delete the role "${roleToDelete}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="warning"
        />
      </div>
    </div>
  );
};

export default ProjectManagement;
