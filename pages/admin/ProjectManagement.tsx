import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth, storage } from '../../src/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';
import { Project, ProjectMember } from '../../src/types';
import { Plus, Edit, Trash2, Users, UserPlus } from 'lucide-react';
import AlertModal from '../../src/components/AlertModal';
import ConfirmModal from '../../src/components/ConfirmModal';
import Uploader from '@/src/components/Uploader';
import { ProjectAdminImagePreview } from '@/src/components/ProjectAdminImagePreview';
import {
  IMAGEKIT_PROJECT_NEW_UPLOAD_FOLDER,
  imageKitTagsForProject,
} from '@/src/utils/imagekitProjectUpload';
import RichTextEditor from '../../src/components/RichTextEditor';
import { useUnsavedChangesGuard } from '../../src/hooks/useUnsavedChangesGuard';
import { useExecPermissions } from '../../src/hooks/useExecPermissions';
import { richTextToPlainText } from '../../src/utils/sanitizeHtml';

interface ProjectManagementProps {
  onNavigate: (path: string) => void;
}

const ProjectManagement: React.FC<ProjectManagementProps> = ({ onNavigate }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const { ready: permReady, perms } = useExecPermissions();
  const [roleReady, setRoleReady] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [pendingProjectsCount, setPendingProjectsCount] = useState(0);
  const [deletionRequestsCount, setDeletionRequestsCount] = useState(0);

  // Form states
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectStatus, setProjectStatus] = useState<'current' | 'past'>('current');
  const [projectLeaderId, setProjectLeaderId] = useState('');
  const [projectImageUrl, setProjectImageUrl] = useState('#');
  const [projectImageFile, setProjectImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // IK Upload results from Uploader
  const [ikUrl, setIkUrl] = useState('');
  const [ikFileId, setIkFileId] = useState<string | null>(null);
  const [ikFilePath, setIkFilePath] = useState<string | null>(null);
  const [ikThumbUrl, setIkThumbUrl] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number>(0);

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
      if (!user) {
        setRoleReady(false);
        return;
      }
      setCurrentUserId(user.uid);
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUserRole(userData.role || 'member');
        } else {
          setCurrentUserRole('member');
        }
      } catch (error) {
        console.error('Error fetching current user role:', error);
        setCurrentUserRole('member');
      } finally {
        setRoleReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen for pending projects and deletion requests
  useEffect(() => {
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

    return () => {
      unsubscribePendingProjects();
      unsubscribeAllProjects();
    };
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
  const [execPositionsReady, setExecPositionsReady] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'execPositions'),
      (snapshot) => {
        const positionsList: string[] = ['admin'];
        snapshot.forEach((docSnap) => {
          const positionName = docSnap.data().name;
          if (positionName) positionsList.push(positionName);
        });
        setExecPositions(positionsList);
        setExecPositionsReady(true);
      },
      (error) => {
        console.error('execPositions subscription error:', error);
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
        setExecPositionsReady(true);
      }
    );
    return () => unsub();
  }, []);

  // Executive roles from Member Management (execPositions) + common titles
  const isExecBoardMember = (): boolean => {
    if (currentUserRole === 'President' || currentUserRole === 'Vice President') return true;
    return execPositions.includes(currentUserRole);
  };

  const canManageProjects = (): boolean => perms.projects;

  const canDeleteProjects = (): boolean => perms.projects;

  const canApproveProjects = (): boolean => perms.projects;

  const canEditProjectDetail = (): boolean => perms.projects;

  // Check if user is project leader
  const isProjectLeader = (project: Project): boolean => {
    return project.leaderId === currentUserId;
  };

  const handleCreateProject = async () => {
    const plainTitle = richTextToPlainText(projectTitle);
    if (!plainTitle) {
      showAlert('warning', 'Validation Error', 'Please enter a project title.');
      throw new Error('Validation failed');
    }

    // Executive Board members can create projects, but need approval
    // President/VP/Admin can create approved projects directly
    const needsApproval = !canManageProjects();

    try { 
      let imageUrl = ikUrl || projectImageUrl.trim() || '';

      await addDoc(collection(db, 'projects'), {
        title: projectTitle.trim(),
        description: projectDescription.trim(),
        imageUrl,
        imagekitFileId: ikFileId,
        imagekitFilePath: ikFilePath,
        imageThumbnailUrl: ikThumbUrl,
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
      setProjectImageUrl('#');
      setProjectImageFile(null);
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

  const handleDeleteClick = (projectId: string) => {
    setProjectToDelete(projectId);
    setShowConfirmDelete(true);
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    if (!canDeleteProjects()) {
      showAlert('error', 'Permission denied', 'You do not have permission to move projects to trash.');
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

  const openMemberModal = (project: Project) => {
    setSelectedProject(project);
    setShowMemberModal(true);
  };

  // Call hook unconditionally (before any early return) to satisfy Rules of Hooks
  const createModalDirty = showCreateModal && (
    projectTitle.trim() !== '' ||
    projectDescription.trim() !== '' ||
    (projectImageUrl !== '#' && projectImageUrl.trim() !== '') ||
    !!projectImageFile ||
    !!ikUrl
  );
  const saveCreateForLeave = async () => {
    await handleCreateProject();
  };
  const { safeNavigate, leaveConfirmModal } = useUnsavedChangesGuard({
    currentPath: '/admin/projects',
    dirty: createModalDirty,
    onNavigate,
    onSave: saveCreateForLeave,
  });

  if (!roleReady || !execPositionsReady || !permReady) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center overflow-x-auto">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Filter projects: full list for managers or any Executive Board role (view-only without Projects permission); otherwise only own/led projects
  let visibleProjects: Project[] = [];
  if (canManageProjects()) {
    visibleProjects = projects;
  } else if (isExecBoardMember()) {
    visibleProjects = projects;
  } else {
    visibleProjects = projects.filter(
      (p) => p.createdBy === currentUserId || isProjectLeader(p)
    );
  }

  const readOnlyProjectList = !canManageProjects() && isExecBoardMember();

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 overflow-x-auto">
      <div className="max-w-7xl mx-auto min-w-0">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Project Management</h1>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => safeNavigate('/admin')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 sm:px-4 rounded text-sm sm:text-base"
            >
              ← Back to Dashboard
            </button>
            {canManageProjects() && (
              <button
                onClick={() => {
                  setProjectTitle('');
                  setProjectDescription('');
                  setProjectStatus('current');
                  setProjectLeaderId('');
                  setShowCreateModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 sm:px-4 rounded flex items-center gap-1.5 text-sm sm:text-base"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                Create Project
              </button>
            )}
            <button
              onClick={() => safeNavigate('/admin/projects/approvals')}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 sm:px-4 rounded flex items-center gap-1.5 text-sm sm:text-base relative"
            >
              Approve
              {pendingProjectsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center px-1 shadow">
                  {pendingProjectsCount > 99 ? '99+' : pendingProjectsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => safeNavigate('/admin/projects/trash')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 sm:px-4 rounded flex items-center gap-1.5 text-sm sm:text-base relative"
            >
              Trash
              {deletionRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center px-1 shadow">
                  {deletionRequestsCount > 99 ? '99+' : deletionRequestsCount}
                </span>
              )}
            </button>
          </div>
        </div>
        {leaveConfirmModal}
        {readOnlyProjectList && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <strong>View only.</strong> You can browse all projects but cannot create, edit, approve, or delete unless the
            President grants <strong>Projects</strong> area permission in Admin Access.
          </div>
        )}
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : visibleProjects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No projects found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {visibleProjects.map((project) => (
              <div key={project.id} className="bg-white rounded-lg shadow-md p-4 sm:p-6 min-w-0">
                <div className="flex flex-wrap justify-between items-start gap-2 mb-3 sm:mb-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-1 break-words">
                      {richTextToPlainText(project.title) || project.title}
                    </h2>
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
                  {(canEditProjectDetail() || canDeleteProjects() || readOnlyProjectList) && (
                    <div className="flex gap-1.5 sm:gap-2 shrink-0">
                      {(canEditProjectDetail() || readOnlyProjectList) && (
                        <button
                          onClick={() => safeNavigate('/admin/projects/edit/' + project.id)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title={canEditProjectDetail() ? 'Edit Project' : 'View project'}
                        >
                          <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      )}
                      {canDeleteProjects() && (
                        <button
                          onClick={() => handleDeleteClick(project.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete Project"
                        >
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {richTextToPlainText(project.description) || project.description}
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
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Create New Project</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Title *
                  </label>
                  <RichTextEditor
                    value={projectTitle}
                    onChange={setProjectTitle}
                    minHeight="60px"
                    placeholder="e.g., Assistive Tech"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <RichTextEditor
                    value={projectDescription}
                    onChange={setProjectDescription}
                    minHeight="120px"
                    placeholder="Project description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Image
                  </label>
                  <div className="space-y-3">
                    {/* File Upload Option */}
                    <Uploader
                      folder={IMAGEKIT_PROJECT_NEW_UPLOAD_FOLDER}
                      tags={imageKitTagsForProject()}
                      onProgress={(pct) => {
                        setUploadPct(pct);
                        setUploadingImage(pct > 0 && pct < 100);
                      }}
                      onError={(msg) => showAlert('error', 'Image Upload', msg)}
                      onComplete={(u) => {
                        setIkUrl(u.url);
                        setIkFileId(u.fileId);
                        setIkFilePath(u.filePath);
                        setIkThumbUrl(u.thumbnailUrl ?? null);
                        setProjectImageFile(null);
                        setProjectImageUrl(u.url);
                        showAlert('success', 'Image Upload', 'Image uploaded to CDN.');
                      }}
                    />
                    {uploadPct > 0 && uploadPct < 100 && (
                      <div className="text-xs text-gray-600 mt-1">Uploading... {uploadPct}%</div>
                    )}
                    <ProjectAdminImagePreview
                      imageUrl={ikUrl || (projectImageUrl !== '#' ? projectImageUrl : '')}
                      titleHint={richTextToPlainText(projectTitle)}
                    />
                  </div>
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
                  disabled={uploadingImage}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {uploadingImage ? 'Uploading Image...' : 'Create Project'}
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
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Manage Members — {richTextToPlainText(project.title) || project.title}
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
