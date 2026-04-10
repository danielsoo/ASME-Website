import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, getDoc, deleteDoc, addDoc, onSnapshot, query } from 'firebase/firestore';
import { db, auth } from '../../src/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { Project } from '../../src/types';
import { RotateCcw, Trash2, X, Check } from 'lucide-react';
import AlertModal from '../../src/components/AlertModal';
import ConfirmModal from '../../src/components/ConfirmModal';
import { richTextToPlainText } from '../../src/utils/sanitizeHtml';

interface ProjectTrashProps {
  onNavigate: (path: string) => void;
}

const ProjectTrash: React.FC<ProjectTrashProps> = ({ onNavigate }) => {
  const [deletedProjects, setDeletedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentUserOnExecutiveBoard, setCurrentUserOnExecutiveBoard] = useState(false);
  const [roleReady, setRoleReady] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [deletionRequestsCount, setDeletionRequestsCount] = useState(0);

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

  // Confirm modal states
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);
  const [showConfirmPermanentDelete, setShowConfirmPermanentDelete] = useState(false);
  const [showConfirmCancelRequest, setShowConfirmCancelRequest] = useState(false);
  const [showConfirmReject, setShowConfirmReject] = useState(false);
  const [showConfirmRestoreAll, setShowConfirmRestoreAll] = useState(false);
  const [projectToRestore, setProjectToRestore] = useState<string | null>(null);
  const [projectToPermanentDelete, setProjectToPermanentDelete] = useState<string | null>(null);
  const [projectToCancelRequest, setProjectToCancelRequest] = useState<string | null>(null);
  const [projectToReject, setProjectToReject] = useState<Project | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setAlertModal({ isOpen: true, type, title, message });
  };

  useEffect(() => {
    loadDeletedProjects();
    loadAllUsers();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setRoleReady(false);
        setCurrentUserOnExecutiveBoard(false);
        return;
      }
      setCurrentUserId(user.uid);
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUserRole(userData.role || 'member');
          setCurrentUserOnExecutiveBoard(userData.onExecutiveBoard === true);
        } else {
          setCurrentUserRole('member');
          setCurrentUserOnExecutiveBoard(false);
        }
      } catch (error) {
        console.error('Error fetching current user role:', error);
        setCurrentUserRole('member');
        setCurrentUserOnExecutiveBoard(false);
      } finally {
        setRoleReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen for deletion requests count
  useEffect(() => {
    const projectsQuery = query(collection(db, 'projects'));
    const unsubscribe = onSnapshot(projectsQuery, (snapshot) => {
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

    return () => unsubscribe();
  }, []);

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

  const loadDeletedProjects = async () => {
    try {
      setLoading(true);
      const projectsRef = collection(db, 'projects');
      const snapshot = await getDocs(projectsRef);
      const projectsList: Project[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Only show deleted projects (deletedAt exists and is not null)
        if (data.deletedAt) {
          projectsList.push({
            id: docSnap.id,
            ...data,
          } as Project);
        }
      });

      // Sort by deletion date (newest first)
      projectsList.sort((a, b) => {
        const aDate = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
        const bDate = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
        return bDate - aDate;
      });

      setDeletedProjects(projectsList);
    } catch (error) {
      console.error('Error loading deleted projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const canManageTrash = (): boolean => {
    if (
      currentUserRole === 'President' ||
      currentUserRole === 'Vice President' ||
      currentUserOnExecutiveBoard
    ) {
      return true;
    }
    return deletedProjects.some((p) => isProjectLeader(p));
  };

  // Check if user is project leader
  const isProjectLeader = (project: Project): boolean => {
    return project.leaderId === currentUserId;
  };

  // Check if user is President or VP
  const isExec = (): boolean => {
    return currentUserRole === 'President' || currentUserRole === 'Vice President';
  };

  const handleRestoreClick = (projectId: string) => {
    setProjectToRestore(projectId);
    setShowConfirmRestore(true);
  };

  const handleRestore = async () => {
    if (!projectToRestore) return;

    try {
      await updateDoc(doc(db, 'projects', projectToRestore), {
        deletedAt: null,
        deletedBy: null,
        permanentDeleteRequest: null, // Clear any deletion requests
        updatedAt: new Date().toISOString(),
      });
      setProjectToRestore(null);
      await loadDeletedProjects();
      showAlert('success', 'Success', 'Project restored successfully!');
    } catch (error) {
      console.error('Error restoring project:', error);
      showAlert('error', 'Error', 'Failed to restore project. Please try again.');
    }
  };

  const handleRestoreAll = async () => {
    // Only restore projects that are in trash (not already permanently deleted)
    const projectsToRestore = deletedProjects.filter(p => p.deletedAt && !p.permanentDeleteRequest?.approvedByLeader || !p.permanentDeleteRequest?.approvedByExec);

    if (projectsToRestore.length === 0) {
      showAlert('info', 'No Projects', 'No projects to restore.');
      return;
    }

    try {
      const restorePromises = projectsToRestore.map(project =>
        updateDoc(doc(db, 'projects', project.id), {
          deletedAt: null,
          deletedBy: null,
          permanentDeleteRequest: null, // Clear any deletion requests
          updatedAt: new Date().toISOString(),
        })
      );

      await Promise.all(restorePromises);
      await loadDeletedProjects();
      showAlert('success', 'Success', `All ${projectsToRestore.length} project(s) have been restored successfully!`);
    } catch (error) {
      console.error('Error restoring all projects:', error);
      showAlert('error', 'Error', 'Failed to restore some projects. Please try again.');
    }
  };

  const handlePermanentDeleteClick = (projectId: string) => {
    const project = deletedProjects.find(p => p.id === projectId);
    if (!project) return;

    // Check if deletion request exists
    if (project.permanentDeleteRequest) {
      // Show approval interface instead of confirmation
      handleApprovePermanentDelete(project);
    } else {
      // Start deletion request
      setProjectToPermanentDelete(projectId);
      setShowConfirmPermanentDelete(true);
    }
  };

  const handlePermanentDelete = async () => {
    if (!projectToPermanentDelete) return;

    try {
      const project = deletedProjects.find(p => p.id === projectToPermanentDelete);
      if (!project) return;

      // Create deletion request
      await updateDoc(doc(db, 'projects', projectToPermanentDelete), {
        permanentDeleteRequest: {
          requestedBy: currentUserId,
          requestedAt: new Date().toISOString(),
          approvedByLeader: false,
          approvedByExec: false,
        },
        updatedAt: new Date().toISOString(),
      });

      setProjectToPermanentDelete(null);
      await loadDeletedProjects();
      showAlert('info', 'Deletion Request Created', 'A permanent deletion request has been created. The project leader and another President/VP must approve before the project is permanently deleted.');
    } catch (error) {
      console.error('Error creating deletion request:', error);
      showAlert('error', 'Error', 'Failed to create deletion request. Please try again.');
    }
  };

  const createNotification = async (
    userId: string,
    type: 'project_deleted' | 'project_deletion_cancelled',
    title: string,
    message: string,
    projectId: string,
    projectTitle: string,
    rejectedBy?: string,
    rejectedByName?: string
  ) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        type,
        title,
        message,
        projectId,
        projectTitle,
        read: false,
        createdAt: new Date().toISOString(),
        rejectedBy,
        rejectedByName,
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const handleApprovePermanentDelete = async (project: Project) => {
    if (!project.permanentDeleteRequest) return;

    const isLeader = isProjectLeader(project);
    const isExecUser = isExec();

    // Cannot approve if already rejected
    if (project.permanentDeleteRequest.rejectedByLeader || project.permanentDeleteRequest.rejectedByExec) {
      showAlert('error', 'Cannot Approve', 'This deletion request has been rejected and cannot be approved.');
      return;
    }

    try {
      const currentRequest = project.permanentDeleteRequest;
      let updatedRequest = { ...currentRequest };

      const currentUser = allUsers.find(u => u.uid === currentUserId);
      const currentUserName = currentUser?.name || currentUser?.email || 'Unknown';

      if (isLeader && !currentRequest.approvedByLeader && !currentRequest.rejectedByLeader) {
        // Leader approves
        updatedRequest.approvedByLeader = true;
        updatedRequest.approvedByLeaderAt = new Date().toISOString();
        updatedRequest.approvedByLeaderBy = currentUserId;
      } else if (isExecUser && !currentRequest.approvedByExec && !currentRequest.rejectedByExec) {
        // Second exec approves
        updatedRequest.approvedByExec = true;
        updatedRequest.approvedByExecAt = new Date().toISOString();
        updatedRequest.approvedByExecBy = currentUserId;
      }

      await updateDoc(doc(db, 'projects', project.id), {
        permanentDeleteRequest: updatedRequest,
        updatedAt: new Date().toISOString(),
      });

      await loadDeletedProjects();

      // Check if both approvals are complete (unanimous approval)
      if (updatedRequest.approvedByLeader && updatedRequest.approvedByExec && 
          !updatedRequest.rejectedByLeader && !updatedRequest.rejectedByExec) {
        // Unanimous approval - permanently delete
        await deleteDoc(doc(db, 'projects', project.id));

        const projectTitlePlain = richTextToPlainText(project.title) || project.title;

        // Create notifications for all involved users
        const requestorUser = allUsers.find(u => u.uid === updatedRequest.requestedBy);
        if (requestorUser) {
          await createNotification(
            requestorUser.uid,
            'project_deleted',
            'Project Permanently Deleted',
            `Project "${projectTitlePlain}" has been permanently deleted with unanimous approval.`,
            project.id,
            projectTitlePlain
          );
        }

        const leaderUser = allUsers.find(u => u.uid === project.leaderId);
        if (leaderUser && leaderUser.uid !== requestorUser?.uid) {
          await createNotification(
            leaderUser.uid,
            'project_deleted',
            'Project Permanently Deleted',
            `Project "${projectTitlePlain}" has been permanently deleted with unanimous approval.`,
            project.id,
            projectTitlePlain
          );
        }

        // Notify other exec users
        const execUsers = allUsers.filter(u => 
          (u.role === 'President' || u.role === 'Vice President') && 
          u.uid !== requestorUser?.uid
        );
        for (const execUser of execUsers) {
          await createNotification(
            execUser.uid,
            'project_deleted',
            'Project Permanently Deleted',
            `Project "${projectTitlePlain}" has been permanently deleted with unanimous approval.`,
            project.id,
            projectTitlePlain
          );
        }

        await loadDeletedProjects();
        showAlert('success', 'Success', 'Project permanently deleted. All required approvals were received.');
      } else {
        showAlert('success', 'Approval Recorded', 'Your approval has been recorded. Waiting for other required approvals.');
      }
    } catch (error) {
      console.error('Error approving deletion:', error);
      showAlert('error', 'Error', 'Failed to record approval. Please try again.');
    }
  };

  const handleRejectClick = (project: Project) => {
    setProjectToReject(project);
    setShowConfirmReject(true);
  };

  const handleRejectPermanentDelete = async () => {
    if (!projectToReject || !projectToReject.permanentDeleteRequest) return;

    const isLeader = isProjectLeader(projectToReject);
    const isExecUser = isExec();

    try {
      const currentRequest = projectToReject.permanentDeleteRequest;
      let updatedRequest = { ...currentRequest };

      const currentUser = allUsers.find(u => u.uid === currentUserId);
      const currentUserName = currentUser?.name || currentUser?.email || 'Unknown';

      if (isLeader && !currentRequest.rejectedByLeader && !currentRequest.approvedByLeader) {
        // Leader rejects
        updatedRequest.rejectedByLeader = true;
        updatedRequest.rejectedByLeaderAt = new Date().toISOString();
        updatedRequest.rejectedByLeaderBy = currentUserId;
      } else if (isExecUser && !currentRequest.rejectedByExec && !currentRequest.approvedByExec) {
        // Exec rejects
        updatedRequest.rejectedByExec = true;
        updatedRequest.rejectedByExecAt = new Date().toISOString();
        updatedRequest.rejectedByExecBy = currentUserId;
      }

      await updateDoc(doc(db, 'projects', projectToReject.id), {
        permanentDeleteRequest: updatedRequest,
        updatedAt: new Date().toISOString(),
      });

      // Create notifications for all involved users
      const requestorUser = allUsers.find(u => u.uid === updatedRequest.requestedBy);
      if (requestorUser) {
        await createNotification(
          requestorUser.uid,
          'project_deletion_cancelled',
          'Project Deletion Request Cancelled',
          `The permanent deletion request for project "${projectToReject.title}" has been cancelled because ${currentUserName} rejected it.`,
          projectToReject.id,
          projectToReject.title,
          currentUserId,
          currentUserName
        );
      }

      const leaderUser = allUsers.find(u => u.uid === projectToReject.leaderId);
      if (leaderUser && leaderUser.uid !== requestorUser?.uid && leaderUser.uid !== currentUserId) {
        await createNotification(
          leaderUser.uid,
          'project_deletion_cancelled',
          'Project Deletion Request Cancelled',
          `The permanent deletion request for project "${projectToReject.title}" has been cancelled because ${currentUserName} rejected it.`,
          projectToReject.id,
          projectToReject.title,
          currentUserId,
          currentUserName
        );
      }

      // Notify other exec users
      const execUsers = allUsers.filter(u => 
        (u.role === 'President' || u.role === 'Vice President') && 
        u.uid !== requestorUser?.uid && u.uid !== currentUserId
      );
      for (const execUser of execUsers) {
        await createNotification(
          execUser.uid,
          'project_deletion_cancelled',
          'Project Deletion Request Cancelled',
          `The permanent deletion request for project "${projectToReject.title}" has been cancelled because ${currentUserName} rejected it.`,
          projectToReject.id,
          projectToReject.title,
          currentUserId,
          currentUserName
        );
      }

      // Reset deletion request after rejection (allow new request)
      await updateDoc(doc(db, 'projects', projectToReject.id), {
        permanentDeleteRequest: null,
        updatedAt: new Date().toISOString(),
      });

      setProjectToReject(null);
      await loadDeletedProjects();
      showAlert('success', 'Request Reset', 'The deletion request has been reset. A new deletion request can be created if needed.');
    } catch (error) {
      console.error('Error rejecting deletion:', error);
      showAlert('error', 'Error', 'Failed to record rejection. Please try again.');
    }
  };

  const handleCancelRequestClick = (projectId: string) => {
    setProjectToCancelRequest(projectId);
    setShowConfirmCancelRequest(true);
  };

  const handleCancelRequest = async () => {
    if (!projectToCancelRequest) return;

    try {
      await updateDoc(doc(db, 'projects', projectToCancelRequest), {
        permanentDeleteRequest: null,
        updatedAt: new Date().toISOString(),
      });
      setProjectToCancelRequest(null);
      await loadDeletedProjects();
      showAlert('success', 'Success', 'Permanent deletion request has been cancelled.');
    } catch (error) {
      console.error('Error cancelling deletion request:', error);
      showAlert('error', 'Error', 'Failed to cancel deletion request. Please try again.');
    }
  };

  const getPermanentDeleteStatus = (project: Project) => {
    if (!project.permanentDeleteRequest) return null;

    const req = project.permanentDeleteRequest;
    const leaderApproved = req.approvedByLeader || false;
    const execApproved = req.approvedByExec || false;
    const leaderRejected = req.rejectedByLeader || false;
    const execRejected = req.rejectedByExec || false;

    // Get user names for display
    const approvedLeaderName = req.approvedByLeaderBy 
      ? allUsers.find(u => u.uid === req.approvedByLeaderBy)?.name || allUsers.find(u => u.uid === req.approvedByLeaderBy)?.email || 'Unknown'
      : null;
    const approvedExecName = req.approvedByExecBy 
      ? allUsers.find(u => u.uid === req.approvedByExecBy)?.name || allUsers.find(u => u.uid === req.approvedByExecBy)?.email || 'Unknown'
      : null;
    const rejectedLeaderName = req.rejectedByLeaderBy 
      ? allUsers.find(u => u.uid === req.rejectedByLeaderBy)?.name || allUsers.find(u => u.uid === req.rejectedByLeaderBy)?.email || 'Unknown'
      : null;
    const rejectedExecName = req.rejectedByExecBy 
      ? allUsers.find(u => u.uid === req.rejectedByExecBy)?.name || allUsers.find(u => u.uid === req.rejectedByExecBy)?.email || 'Unknown'
      : null;

    if (leaderRejected || execRejected) {
      return { 
        status: 'rejected', 
        text: 'Request cancelled - rejected',
        details: [
          leaderRejected && `Leader: ${rejectedLeaderName} rejected`,
          execRejected && `President/VP: ${rejectedExecName} rejected`,
        ].filter(Boolean)
      };
    } else if (leaderApproved && execApproved) {
      return { 
        status: 'approved', 
        text: 'Unanimous approval - will be deleted',
        details: [
          `Leader: ${approvedLeaderName} approved`,
          `President/VP: ${approvedExecName} approved`,
        ]
      };
    } else if (leaderApproved) {
      return { 
        status: 'waiting_exec', 
        text: 'Waiting for President/VP approval',
        details: [`Leader: ${approvedLeaderName} approved`]
      };
    } else if (execApproved) {
      return { 
        status: 'waiting_leader', 
        text: 'Waiting for project leader approval',
        details: [`President/VP: ${approvedExecName} approved`]
      };
    } else {
      return { 
        status: 'pending', 
        text: 'Waiting for approvals',
        details: []
      };
    }
  };

  // Check if current user requested the deletion
  const isRequestor = (project: Project): boolean => {
    return project.permanentDeleteRequest?.requestedBy === currentUserId;
  };

  // Check if deletion request can be cancelled (only if not fully approved or rejected)
  const canCancelRequest = (project: Project): boolean => {
    if (!project.permanentDeleteRequest) return false;
    if (!isRequestor(project)) return false;
    const req = project.permanentDeleteRequest;
    // Can only cancel if not fully approved and not rejected
    return !(req.approvedByLeader && req.approvedByExec) && 
           !req.rejectedByLeader && 
           !req.rejectedByExec;
  };

  const visibleProjects = deletedProjects.filter((project) => {
    if (
      currentUserRole === 'President' ||
      currentUserRole === 'Vice President' ||
      currentUserOnExecutiveBoard
    ) {
      return true;
    }
    return isProjectLeader(project);
  });

  if (!roleReady) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center overflow-x-auto">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!canManageTrash() && visibleProjects.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center overflow-x-auto">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
          <p className="text-gray-600">
            Only President, Vice President, members with Executive Board (About) enabled, or project leaders can access
            trash.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 overflow-x-auto">
      <div className="max-w-7xl mx-auto min-w-0">
        <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 inline-block">
              Project Trash
              {deletionRequestsCount > 0 && (
                <span className="ml-2 sm:ml-3 bg-red-500 text-white rounded-full min-w-[22px] h-[22px] sm:min-w-[24px] sm:h-6 inline-flex items-center justify-center px-1.5 sm:px-2 text-xs sm:text-sm font-bold align-middle">
                  {deletionRequestsCount > 99 ? '99+' : deletionRequestsCount}
                </span>
              )}
            </h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Restore or permanently delete deleted projects</p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {canManageTrash() && deletedProjects.length > 0 && (
              <button
                onClick={() => setShowConfirmRestoreAll(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 sm:px-4 rounded flex items-center gap-1.5 text-sm sm:text-base"
              >
                Restore All
              </button>
            )}
            <button
              onClick={() => onNavigate('/admin/projects')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 sm:px-4 rounded text-sm sm:text-base"
            >
              ← Back to Projects
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : visibleProjects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg mb-2">Trash is empty</p>
            <p className="text-sm">No deleted projects found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleProjects.map((project) => (
              <div key={project.id} className="bg-white rounded-lg shadow-md p-4 sm:p-6 min-w-0">
                <div className="flex flex-wrap justify-between items-start gap-2 mb-3 sm:mb-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 break-words">
                      {richTextToPlainText(project.title) || project.title}
                    </h2>
                    {project.description && (
                      <p className="text-gray-600 mb-3">
                        {richTextToPlainText(project.description) || project.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      {project.deletedAt && (
                        <div>
                          <span className="font-semibold">Deleted:</span>{' '}
                          {new Date(project.deletedAt).toLocaleString()}
                        </div>
                      )}
                      {project.createdAt && (
                        <div>
                          <span className="font-semibold">Created:</span>{' '}
                          {new Date(project.createdAt).toLocaleDateString()}
                        </div>
                      )}
                      <span className={`inline-block px-2 py-1 text-xs rounded ${
                        project.status === 'current' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status === 'current' ? 'Current' : 'Past'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Permanent Delete Request Status */}
                {project.permanentDeleteRequest && (() => {
                  const status = getPermanentDeleteStatus(project);
                  if (!status) return null;

                  const bgColor = status.status === 'rejected' 
                    ? 'bg-red-50 border-red-200' 
                    : status.status === 'approved'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-yellow-50 border-yellow-200';
                  const textColor = status.status === 'rejected'
                    ? 'text-red-800'
                    : status.status === 'approved'
                    ? 'text-green-800'
                    : 'text-yellow-800';
                  const detailColor = status.status === 'rejected'
                    ? 'text-red-700'
                    : status.status === 'approved'
                    ? 'text-green-700'
                    : 'text-yellow-700';

                  return (
                    <div className={`mb-4 p-3 ${bgColor} border rounded-lg`}>
                      <p className={`text-sm font-semibold ${textColor} mb-2`}>
                        Permanent Deletion Request
                      </p>
                      <p className={`text-sm ${detailColor} mb-2`}>{status.text}</p>
                      {status.details && status.details.length > 0 && (
                        <div className="space-y-1">
                          {status.details.map((detail, index) => (
                            <div key={index} className={`text-xs ${detailColor} flex items-center gap-2`}>
                              {status.status === 'rejected' ? (
                                <X className="w-3 h-3 text-red-600" />
                              ) : (
                                <Check className="w-3 h-3 text-green-600" />
                              )}
                              {detail}
                            </div>
                          ))}
                        </div>
                      )}
                      {status.status !== 'rejected' && status.status !== 'approved' && (
                        <div className="mt-2 space-y-1">
                          {project.leaderEmail && (
                            <p className={`text-xs ${detailColor}`}>
                              Leader: {project.leaderEmail} 
                              {project.permanentDeleteRequest.approvedByLeader ? (
                                <span className="text-green-700"> ✓ Approved</span>
                              ) : project.permanentDeleteRequest.rejectedByLeader ? (
                                <span className="text-red-700"> ✗ Rejected</span>
                              ) : (
                                <span> ⏳ Pending</span>
                              )}
                            </p>
                          )}
                          <p className={`text-xs ${detailColor}`}>
                            President/VP: 
                            {project.permanentDeleteRequest.approvedByExec ? (
                              <span className="text-green-700"> ✓ Approved</span>
                            ) : project.permanentDeleteRequest.rejectedByExec ? (
                              <span className="text-red-700"> ✗ Rejected</span>
                            ) : (
                              <span> ⏳ Pending</span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => handleRestoreClick(project.id)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Restore
                  </button>
                  {project.permanentDeleteRequest ? (
                    <>
                      {/* Show approve/reject buttons only if not rejected and not already approved by this user */}
                      {!project.permanentDeleteRequest.rejectedByLeader && 
                       !project.permanentDeleteRequest.rejectedByExec && (
                        <>
                          {(isProjectLeader(project) && 
                            !project.permanentDeleteRequest.approvedByLeader && 
                            !project.permanentDeleteRequest.rejectedByLeader) ||
                          (isExec() && 
                            !project.permanentDeleteRequest.approvedByExec && 
                            !project.permanentDeleteRequest.rejectedByExec) ? (
                            <>
                              <button
                                onClick={() => handleApprovePermanentDelete(project)}
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                              >
                                <Check className="w-5 h-5" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectClick(project)}
                                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                              >
                                <X className="w-5 h-5" />
                                Reject
                              </button>
                            </>
                          ) : (
                            <button
                              disabled
                              className="flex items-center gap-2 bg-gray-400 text-white px-4 py-2 rounded cursor-not-allowed"
                            >
                              <Trash2 className="w-5 h-5" />
                              Waiting for Approvals
                            </button>
                          )}
                        </>
                      )}
                      {canCancelRequest(project) && (
                        <button
                          onClick={() => handleCancelRequestClick(project.id)}
                          className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded"
                        >
                          Cancel Request
                        </button>
                      )}
                    </>
                  ) : (
                    canManageTrash() && (
                      <button
                        onClick={() => handlePermanentDeleteClick(project.id)}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                      >
                        <Trash2 className="w-5 h-5" />
                        Request Permanent Delete
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
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

        {/* Confirm Restore Modal */}
        <ConfirmModal
          isOpen={showConfirmRestore}
          onClose={() => {
            setShowConfirmRestore(false);
            setProjectToRestore(null);
          }}
          onConfirm={handleRestore}
          title="Restore Project"
          message="Are you sure you want to restore this project? It will be moved back to the projects list."
          confirmText="Restore"
          cancelText="Cancel"
          type="info"
        />

        {/* Confirm Permanent Delete Request Modal */}
        <ConfirmModal
          isOpen={showConfirmPermanentDelete}
          onClose={() => {
            setShowConfirmPermanentDelete(false);
            setProjectToPermanentDelete(null);
          }}
          onConfirm={handlePermanentDelete}
          title="Request Permanent Deletion"
          message="This will create a permanent deletion request. Both the project leader and another President/VP must approve before the project is permanently deleted. Are you sure you want to proceed?"
          confirmText="Create Request"
          cancelText="Cancel"
          type="warning"
        />

        {/* Confirm Cancel Request Modal */}
        <ConfirmModal
          isOpen={showConfirmCancelRequest}
          onClose={() => {
            setShowConfirmCancelRequest(false);
            setProjectToCancelRequest(null);
          }}
          onConfirm={handleCancelRequest}
          title="Cancel Deletion Request"
          message="Are you sure you want to cancel this permanent deletion request? The project will remain in trash and can be restored or a new deletion request can be created later."
          confirmText="Cancel Request"
          cancelText="Keep Request"
          type="warning"
        />

        {/* Confirm Reject Modal */}
        <ConfirmModal
          isOpen={showConfirmReject}
          onClose={() => {
            setShowConfirmReject(false);
            setProjectToReject(null);
          }}
          onConfirm={handleRejectPermanentDelete}
          title="Reject Deletion Request"
          message="Are you sure you want to reject this permanent deletion request? This will cancel the deletion and notify all involved parties. The project will remain in trash."
          confirmText="Reject"
          cancelText="Cancel"
          type="danger"
        />

        {/* Confirm Restore All Modal */}
        <ConfirmModal
          isOpen={showConfirmRestoreAll}
          onClose={() => setShowConfirmRestoreAll(false)}
          onConfirm={() => {
            handleRestoreAll();
            setShowConfirmRestoreAll(false);
          }}
          title="Restore All Projects"
          message={`Are you sure you want to restore all ${deletedProjects.length} project(s) from trash? All projects will be moved back to the active projects list and any deletion requests will be cleared.`}
          confirmText="Restore All"
          cancelText="Cancel"
          type="info"
        />
      </div>
    </div>
  );
};

export default ProjectTrash;
