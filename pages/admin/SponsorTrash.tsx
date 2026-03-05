import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, getDoc, deleteDoc, onSnapshot, query } from 'firebase/firestore';
import { db, auth } from '../../src/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { Sponsor } from '../../src/types';
import { RotateCcw, Trash2, X, Check } from 'lucide-react';
import AlertModal from '../../src/components/AlertModal';
import ConfirmModal from '../../src/components/ConfirmModal';

interface SponsorTrashProps {
  onNavigate: (path: string) => void;
}

const SponsorTrash: React.FC<SponsorTrashProps> = ({ onNavigate }) => {
  const [deletedSponsors, setDeletedSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
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
  const [sponsorToRestore, setSponsorToRestore] = useState<string | null>(null);
  const [sponsorToPermanentDelete, setSponsorToPermanentDelete] = useState<string | null>(null);
  const [sponsorToCancelRequest, setSponsorToCancelRequest] = useState<string | null>(null);
  const [sponsorToReject, setSponsorToReject] = useState<Sponsor | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setAlertModal({ isOpen: true, type, title, message });
  };

  useEffect(() => {
    loadDeletedSponsors();
    loadAllUsers();

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

  // Listen for deletion requests count
  useEffect(() => {
    const sponsorsQuery = query(collection(db, 'sponsors'));
    const unsubscribe = onSnapshot(sponsorsQuery, (snapshot) => {
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

  const loadDeletedSponsors = async () => {
    try {
      setLoading(true);
      const sponsorsRef = collection(db, 'sponsors');
      const snapshot = await getDocs(sponsorsRef);
      const sponsorsList: Sponsor[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Only show deleted sponsors (deletedAt exists and is not null)
        if (data.deletedAt) {
          sponsorsList.push({
            id: docSnap.id,
            ...data,
          } as Sponsor);
        }
      });

      // Sort by deletion date (newest first)
      sponsorsList.sort((a, b) => {
        const aDate = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
        const bDate = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
        return bDate - aDate;
      });

      setDeletedSponsors(sponsorsList);
    } catch (error) {
      console.error('Error loading deleted sponsors:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if user can manage trash (President/VP only)
  const canManageTrash = (): boolean => {
    return currentUserRole === 'President' || currentUserRole === 'Vice President';
  };

  // Check if user is President or VP
  const isExec = (): boolean => {
    return currentUserRole === 'President' || currentUserRole === 'Vice President';
  };

  const handleRestoreClick = (sponsorId: string) => {
    setSponsorToRestore(sponsorId);
    setShowConfirmRestore(true);
  };

  const handleRestore = async () => {
    if (!sponsorToRestore) return;

    try {
      await updateDoc(doc(db, 'sponsors', sponsorToRestore), {
        deletedAt: null,
        deletedBy: null,
        permanentDeleteRequest: null, // Clear any deletion requests
        updatedAt: new Date().toISOString(),
      });
      setSponsorToRestore(null);
      await loadDeletedSponsors();
      showAlert('success', 'Success', 'Sponsor restored successfully!');
    } catch (error) {
      console.error('Error restoring sponsor:', error);
      showAlert('error', 'Error', 'Failed to restore sponsor. Please try again.');
    }
  };

  const handleRestoreAll = async () => {
    // Only restore sponsors that are in trash (not already permanently deleted)
    const sponsorsToRestore = deletedSponsors.filter(s => 
      s.deletedAt && (!s.permanentDeleteRequest?.approvedByExec1 || !s.permanentDeleteRequest?.approvedByExec2)
    );

    if (sponsorsToRestore.length === 0) {
      showAlert('info', 'No Sponsors', 'No sponsors to restore.');
      return;
    }

    try {
      const restorePromises = sponsorsToRestore.map(sponsor =>
        updateDoc(doc(db, 'sponsors', sponsor.id), {
          deletedAt: null,
          deletedBy: null,
          permanentDeleteRequest: null, // Clear any deletion requests
          updatedAt: new Date().toISOString(),
        })
      );

      await Promise.all(restorePromises);
      await loadDeletedSponsors();
      showAlert('success', 'Success', `All ${sponsorsToRestore.length} sponsor(s) have been restored successfully!`);
    } catch (error) {
      console.error('Error restoring all sponsors:', error);
      showAlert('error', 'Error', 'Failed to restore some sponsors. Please try again.');
    }
  };

  const handlePermanentDeleteClick = (sponsorId: string) => {
    const sponsor = deletedSponsors.find(s => s.id === sponsorId);
    if (!sponsor) return;

    // Check if deletion request exists
    if (sponsor.permanentDeleteRequest) {
      // Show approval interface instead of confirmation
      handleApprovePermanentDelete(sponsor);
    } else {
      // Start deletion request
      setSponsorToPermanentDelete(sponsorId);
      setShowConfirmPermanentDelete(true);
    }
  };

  const handlePermanentDelete = async () => {
    if (!sponsorToPermanentDelete) return;

    try {
      const sponsor = deletedSponsors.find(s => s.id === sponsorToPermanentDelete);
      if (!sponsor) return;

      // Create deletion request (needs 2 exec approvals)
      await updateDoc(doc(db, 'sponsors', sponsorToPermanentDelete), {
        permanentDeleteRequest: {
          requestedBy: currentUserId,
          requestedAt: new Date().toISOString(),
          approvedByExec1: false,
          approvedByExec2: false,
        },
        updatedAt: new Date().toISOString(),
      });

      setSponsorToPermanentDelete(null);
      await loadDeletedSponsors();
      showAlert('info', 'Deletion Request Created', 'A permanent deletion request has been created. Two President/VP members must approve before the sponsor is permanently deleted.');
    } catch (error) {
      console.error('Error creating deletion request:', error);
      showAlert('error', 'Error', 'Failed to create deletion request. Please try again.');
    }
  };

  const handleApprovePermanentDelete = async (sponsor: Sponsor) => {
    if (!sponsor.permanentDeleteRequest) return;

    const isExecUser = isExec();

    // Cannot approve if already rejected
    if (sponsor.permanentDeleteRequest.rejectedByExec1 || sponsor.permanentDeleteRequest.rejectedByExec2) {
      showAlert('error', 'Cannot Approve', 'This deletion request has been rejected and cannot be approved.');
      return;
    }

    try {
      const currentRequest = sponsor.permanentDeleteRequest;
      let updatedRequest = { ...currentRequest };

      const currentUser = allUsers.find(u => u.uid === currentUserId);
      const currentUserName = currentUser?.name || currentUser?.email || 'Unknown';

      if (isExecUser) {
        // Check if this exec already approved
        const alreadyApproved1 = currentRequest.approvedByExec1By === currentUserId;
        const alreadyApproved2 = currentRequest.approvedByExec2By === currentUserId;

        if (!alreadyApproved1 && !currentRequest.approvedByExec1) {
          // First exec approves
          updatedRequest.approvedByExec1 = true;
          updatedRequest.approvedByExec1At = new Date().toISOString();
          updatedRequest.approvedByExec1By = currentUserId;
        } else if (!alreadyApproved2 && !currentRequest.approvedByExec2 && currentRequest.approvedByExec1) {
          // Second exec approves
          updatedRequest.approvedByExec2 = true;
          updatedRequest.approvedByExec2At = new Date().toISOString();
          updatedRequest.approvedByExec2By = currentUserId;
        }
      }

      await updateDoc(doc(db, 'sponsors', sponsor.id), {
        permanentDeleteRequest: updatedRequest,
        updatedAt: new Date().toISOString(),
      });

      await loadDeletedSponsors();

      // Check if both approvals are complete (unanimous approval)
      if (updatedRequest.approvedByExec1 && updatedRequest.approvedByExec2 && 
          !updatedRequest.rejectedByExec1 && !updatedRequest.rejectedByExec2) {
        // Unanimous approval - permanently delete
        await deleteDoc(doc(db, 'sponsors', sponsor.id));
        
        await loadDeletedSponsors();
        showAlert('success', 'Success', 'Sponsor permanently deleted. All required approvals were received.');
      } else {
        showAlert('success', 'Approval Recorded', 'Your approval has been recorded. Waiting for other required approvals.');
      }
    } catch (error) {
      console.error('Error approving deletion:', error);
      showAlert('error', 'Error', 'Failed to record approval. Please try again.');
    }
  };

  const handleRejectClick = (sponsor: Sponsor) => {
    setSponsorToReject(sponsor);
    setShowConfirmReject(true);
  };

  const handleRejectPermanentDelete = async () => {
    if (!sponsorToReject || !sponsorToReject.permanentDeleteRequest) return;

    const isExecUser = isExec();

    try {
      const currentRequest = sponsorToReject.permanentDeleteRequest;
      let updatedRequest = { ...currentRequest };

      const currentUser = allUsers.find(u => u.uid === currentUserId);
      const currentUserName = currentUser?.name || currentUser?.email || 'Unknown';

      if (isExecUser) {
        if (!currentRequest.rejectedByExec1 && !currentRequest.approvedByExec1) {
          // First exec rejects
          updatedRequest.rejectedByExec1 = true;
          updatedRequest.rejectedByExec1At = new Date().toISOString();
          updatedRequest.rejectedByExec1By = currentUserId;
        } else if (!currentRequest.rejectedByExec2 && !currentRequest.approvedByExec2) {
          // Second exec rejects
          updatedRequest.rejectedByExec2 = true;
          updatedRequest.rejectedByExec2At = new Date().toISOString();
          updatedRequest.rejectedByExec2By = currentUserId;
        }
      }

      // Reset deletion request after rejection (allow new request)
      await updateDoc(doc(db, 'sponsors', sponsorToReject.id), {
        permanentDeleteRequest: null,
        updatedAt: new Date().toISOString(),
      });

      setSponsorToReject(null);
      await loadDeletedSponsors();
      showAlert('success', 'Request Reset', 'The deletion request has been reset. A new deletion request can be created if needed.');
    } catch (error) {
      console.error('Error rejecting deletion:', error);
      showAlert('error', 'Error', 'Failed to record rejection. Please try again.');
    }
  };

  const handleCancelRequestClick = (sponsorId: string) => {
    setSponsorToCancelRequest(sponsorId);
    setShowConfirmCancelRequest(true);
  };

  const handleCancelRequest = async () => {
    if (!sponsorToCancelRequest) return;

    try {
      await updateDoc(doc(db, 'sponsors', sponsorToCancelRequest), {
        permanentDeleteRequest: null,
        updatedAt: new Date().toISOString(),
      });
      setSponsorToCancelRequest(null);
      await loadDeletedSponsors();
      showAlert('success', 'Success', 'Permanent deletion request has been cancelled.');
    } catch (error) {
      console.error('Error cancelling deletion request:', error);
      showAlert('error', 'Error', 'Failed to cancel deletion request. Please try again.');
    }
  };

  const getPermanentDeleteStatus = (sponsor: Sponsor) => {
    if (!sponsor.permanentDeleteRequest) return null;

    const req = sponsor.permanentDeleteRequest;
    const exec1Approved = req.approvedByExec1 || false;
    const exec2Approved = req.approvedByExec2 || false;
    const exec1Rejected = req.rejectedByExec1 || false;
    const exec2Rejected = req.rejectedByExec2 || false;

    // Get user names for display
    const approvedExec1Name = req.approvedByExec1By 
      ? allUsers.find(u => u.uid === req.approvedByExec1By)?.name || allUsers.find(u => u.uid === req.approvedByExec1By)?.email || 'Unknown'
      : null;
    const approvedExec2Name = req.approvedByExec2By 
      ? allUsers.find(u => u.uid === req.approvedByExec2By)?.name || allUsers.find(u => u.uid === req.approvedByExec2By)?.email || 'Unknown'
      : null;
    const rejectedExec1Name = req.rejectedByExec1By 
      ? allUsers.find(u => u.uid === req.rejectedByExec1By)?.name || allUsers.find(u => u.uid === req.rejectedByExec1By)?.email || 'Unknown'
      : null;
    const rejectedExec2Name = req.rejectedByExec2By 
      ? allUsers.find(u => u.uid === req.rejectedByExec2By)?.name || allUsers.find(u => u.uid === req.rejectedByExec2By)?.email || 'Unknown'
      : null;

    if (exec1Rejected || exec2Rejected) {
      return { 
        status: 'rejected', 
        text: 'Request cancelled - rejected',
        details: [
          exec1Rejected && `President/VP 1: ${rejectedExec1Name} rejected`,
          exec2Rejected && `President/VP 2: ${rejectedExec2Name} rejected`,
        ].filter(Boolean)
      };
    } else if (exec1Approved && exec2Approved) {
      return { 
        status: 'approved', 
        text: 'Unanimous approval - will be deleted',
        details: [
          `President/VP 1: ${approvedExec1Name} approved`,
          `President/VP 2: ${approvedExec2Name} approved`,
        ]
      };
    } else if (exec1Approved) {
      return { 
        status: 'waiting_exec2', 
        text: 'Waiting for second President/VP approval',
        details: [`President/VP 1: ${approvedExec1Name} approved`]
      };
    } else if (exec2Approved) {
      return { 
        status: 'waiting_exec1', 
        text: 'Waiting for first President/VP approval',
        details: [`President/VP 2: ${approvedExec2Name} approved`]
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
  const isRequestor = (sponsor: Sponsor): boolean => {
    return sponsor.permanentDeleteRequest?.requestedBy === currentUserId;
  };

  // Check if deletion request can be cancelled (only if not fully approved or rejected)
  const canCancelRequest = (sponsor: Sponsor): boolean => {
    if (!sponsor.permanentDeleteRequest) return false;
    if (!isRequestor(sponsor)) return false;
    const req = sponsor.permanentDeleteRequest;
    // Can only cancel if not fully approved and not rejected
    return !(req.approvedByExec1 && req.approvedByExec2) && 
           !req.rejectedByExec1 && 
           !req.rejectedByExec2;
  };

  // Filter sponsors based on user role (only President/VP can see)
  const visibleSponsors = deletedSponsors.filter(sponsor => {
    if (currentUserRole === 'President' || currentUserRole === 'Vice President') {
      return true; // Exec can see all
    }
    return false;
  });

  if (!canManageTrash() && visibleSponsors.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
          <p className="text-gray-600">Only President and Vice President can access trash.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="relative">
            <h1 className="text-3xl font-bold text-gray-800 inline-block">
              Sponsor Trash
              {deletionRequestsCount > 0 && (
                <span className="ml-3 bg-red-500 text-white rounded-full min-w-[24px] h-6 inline-flex items-center justify-center px-2 text-sm font-bold align-middle">
                  {deletionRequestsCount > 99 ? '99+' : deletionRequestsCount}
                </span>
              )}
            </h1>
            <p className="text-gray-600 mt-2">Restore or permanently delete deleted sponsors</p>
          </div>
          <div className="flex gap-3">
            {canManageTrash() && deletedSponsors.length > 0 && (
              <button
                onClick={() => setShowConfirmRestoreAll(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
              >
                Restore All
              </button>
            )}
            <button
              onClick={() => onNavigate('/admin/sponsors')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
            >
              ← Back to Sponsors
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : visibleSponsors.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg mb-2">Trash is empty</p>
            <p className="text-sm">No deleted sponsors found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleSponsors.map((sponsor) => (
              <div key={sponsor.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">{sponsor.name}</h2>
                    {sponsor.logoUrl && (
                      <div className="mb-3">
                        <img
                          src={sponsor.logoUrl}
                          alt={sponsor.name}
                          className="h-20 object-contain"
                        />
                      </div>
                    )}
                    {sponsor.link && (
                      <a
                        href={sponsor.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm break-all"
                      >
                        {sponsor.link}
                      </a>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-3">
                      {sponsor.deletedAt && (
                        <div>
                          <span className="font-semibold">Deleted:</span>{' '}
                          {new Date(sponsor.deletedAt).toLocaleString()}
                        </div>
                      )}
                      {sponsor.createdAt && (
                        <div>
                          <span className="font-semibold">Created:</span>{' '}
                          {new Date(sponsor.createdAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Permanent Delete Request Status */}
                {sponsor.permanentDeleteRequest && (() => {
                  const status = getPermanentDeleteStatus(sponsor);
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
                          <p className={`text-xs ${detailColor}`}>
                            President/VP 1: 
                            {sponsor.permanentDeleteRequest.approvedByExec1 ? (
                              <span className="text-green-700"> ✓ Approved</span>
                            ) : sponsor.permanentDeleteRequest.rejectedByExec1 ? (
                              <span className="text-red-700"> ✗ Rejected</span>
                            ) : (
                              <span> ⏳ Pending</span>
                            )}
                          </p>
                          <p className={`text-xs ${detailColor}`}>
                            President/VP 2: 
                            {sponsor.permanentDeleteRequest.approvedByExec2 ? (
                              <span className="text-green-700"> ✓ Approved</span>
                            ) : sponsor.permanentDeleteRequest.rejectedByExec2 ? (
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
                    onClick={() => handleRestoreClick(sponsor.id)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Restore
                  </button>
                  {sponsor.permanentDeleteRequest ? (
                    <>
                      {/* Show approve/reject buttons only if not rejected and not already approved by this user */}
                      {!sponsor.permanentDeleteRequest.rejectedByExec1 && 
                       !sponsor.permanentDeleteRequest.rejectedByExec2 && (
                        <>
                          {isExec() && 
                           ((!sponsor.permanentDeleteRequest.approvedByExec1 && sponsor.permanentDeleteRequest.approvedByExec1By !== currentUserId) ||
                            (!sponsor.permanentDeleteRequest.approvedByExec2 && sponsor.permanentDeleteRequest.approvedByExec2By !== currentUserId && sponsor.permanentDeleteRequest.approvedByExec1)) ? (
                            <>
                              <button
                                onClick={() => handleApprovePermanentDelete(sponsor)}
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                              >
                                <Check className="w-5 h-5" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectClick(sponsor)}
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
                      {canCancelRequest(sponsor) && (
                        <button
                          onClick={() => handleCancelRequestClick(sponsor.id)}
                          className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded"
                        >
                          Cancel Request
                        </button>
                      )}
                    </>
                  ) : (
                    canManageTrash() && (
                      <button
                        onClick={() => handlePermanentDeleteClick(sponsor.id)}
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
            setSponsorToRestore(null);
          }}
          onConfirm={handleRestore}
          title="Restore Sponsor"
          message="Are you sure you want to restore this sponsor? It will be moved back to the sponsors list."
          confirmText="Restore"
          cancelText="Cancel"
          type="info"
        />

        {/* Confirm Permanent Delete Request Modal */}
        <ConfirmModal
          isOpen={showConfirmPermanentDelete}
          onClose={() => {
            setShowConfirmPermanentDelete(false);
            setSponsorToPermanentDelete(null);
          }}
          onConfirm={handlePermanentDelete}
          title="Request Permanent Deletion"
          message="This will create a permanent deletion request. Two President/VP members must approve before the sponsor is permanently deleted. Are you sure you want to proceed?"
          confirmText="Create Request"
          cancelText="Cancel"
          type="warning"
        />

        {/* Confirm Cancel Request Modal */}
        <ConfirmModal
          isOpen={showConfirmCancelRequest}
          onClose={() => {
            setShowConfirmCancelRequest(false);
            setSponsorToCancelRequest(null);
          }}
          onConfirm={handleCancelRequest}
          title="Cancel Deletion Request"
          message="Are you sure you want to cancel this permanent deletion request? The sponsor will remain in trash and can be restored or a new deletion request can be created later."
          confirmText="Cancel Request"
          cancelText="Keep Request"
          type="warning"
        />

        {/* Confirm Reject Modal */}
        <ConfirmModal
          isOpen={showConfirmReject}
          onClose={() => {
            setShowConfirmReject(false);
            setSponsorToReject(null);
          }}
          onConfirm={handleRejectPermanentDelete}
          title="Reject Deletion Request"
          message="Are you sure you want to reject this permanent deletion request? This will cancel the deletion and the sponsor will remain in trash."
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
          title="Restore All Sponsors"
          message={`Are you sure you want to restore all ${deletedSponsors.length} sponsor(s) from trash? All sponsors will be moved back to the active sponsors list and any deletion requests will be cleared.`}
          confirmText="Restore All"
          cancelText="Cancel"
          type="info"
        />
      </div>
    </div>
  );
};

export default SponsorTrash;
