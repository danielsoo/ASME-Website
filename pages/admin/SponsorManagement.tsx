import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { Sponsor } from '../../types';
import { Plus, Edit, Trash2, Users, UserPlus } from 'lucide-react';
import AlertModal from '../../components/AlertModal';
import ConfirmModal from '../../components/ConfirmModal';

interface SponsorManagementProps {
  onNavigate: (path: string) => void;
}

const SponsorManagement: React.FC<SponsorManagementProps> = ({ onNavigate }) => {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Form states
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorLink, setSponsorLink] = useState('');
  const [sponsorLogo, setSponsorLogo] = useState('');

  // Confirm delete modal state
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [sponsorToDelete, setSponsorToDelete] = useState<string | null>(null);

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
    loadSponsors();
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

  const loadSponsors = async () => {
    try {
      setLoading(true);
      const projectsRef = collection(db, 'projects');
      const snapshot = await getDocs(projectsRef);
      const sponsorsList: Sponsor[] = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Only show sponsors that are not deleted (deletedAt is null or undefined)
        if (!data.deletedAt) {
          sponsorsList.push({
            id: docSnap.id,
            ...data,
          } as Sponsor);
        }
      });

      // Sort: by name
      sponsorsList.sort((a, b) => {
        return a.name.localeCompare(b.name);
      });

      setSponsors(sponsorsList);
    } catch (error) {
      console.error('Error loading sponsors:', error);
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

  // Check if user can manage/approve sponsors (President/VP/Admin only)
  const canManageSponsors = (): boolean => {
    return currentUserRole === 'President' || currentUserRole === 'Vice President' || currentUserRole === 'admin';
  };

  // Check if user can delete sponsors (President/VP only)
  const canDeleteSponsors = (): boolean => {
    return currentUserRole === 'President' || currentUserRole === 'Vice President';
  };

  // Check if user can approve sponsors (President/VP only)
  const canApproveSponsors = (): boolean => {
    return currentUserRole === 'President' || currentUserRole === 'Vice President';
  };

  const handleAddSponsor = async () => {
    if (!sponsorName.trim()) {
      showAlert('warning', 'Validation Error', 'Please enter a sponsor name.');
      return;
    }

    // Executive Board members can create sponsors, but need approval
    // President/VP/Admin can create approved sponsors directly
    const needsApproval = !canManageSponsors();

    try {
      await addDoc(collection(db, 'sponsors'), {
        name: sponsorName.trim(),
        link: sponsorLink.trim(),
        logoUrl: sponsorLogo.trim(),
        approvalStatus: needsApproval ? 'pending' : 'approved',
        createdBy: currentUserId,
        approvedBy: canManageSponsors() ? currentUserId : null,
        approvedAt: canManageSponsors() ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setShowCreateModal(false);
      setSponsorName('');
      setSponsorLink('');
      setSponsorLogo('');
      await loadSponsors();
      
      if (needsApproval) {
        showAlert('success', 'Sponsor Added', 'Sponsor added successfully! It is pending approval from President or Vice President.');
      } else {
        showAlert('success', 'Success', 'Sponsor added successfully!');
      }
    } catch (error) {
      console.error('Error adding sponsor:', error);
      showAlert('error', 'Error', 'Failed to add sponsor. Please try again.');
    }
  };

  const handleEditSponsor = async () => {
    if (!selectedSponsor || !sponsorName.trim()) {
      return;
    }

    // Only allow editing if user is President/VP/Admin (canManageSponsors)
    // Project leaders cannot edit sponsor details, only manage members
    if (!canManageSponsors()) {
      showAlert('error', 'Access Denied', 'Only President, Vice President, or Admin can edit sponsor details.');
      setShowEditModal(false);
      setSelectedSponsor(null);
      return;
    }

    try {
      await updateDoc(doc(db, 'sponsors', selectedSponsor.id), {
        name: sponsorName.trim(),
        link: sponsorLink.trim(),
        logoUrl: sponsorLogo.trim(),
        updatedAt: new Date().toISOString(),
      });

      setShowEditModal(false);
      setSelectedSponsor(null);
      await loadSponsors();
      showAlert('success', 'Success', 'Sponsor updated successfully!');
    } catch (error) {
      console.error('Error updating sponsor:', error);
      showAlert('error', 'Error', 'Failed to update sponsor. Please try again.');
    }
  };

  const handleDeleteClick = (sponsorId: string) => {
    setSponsorToDelete(sponsorId);
    setShowConfirmDelete(true);
  };

  const handleDeleteSponsor = async () => {
    if (!sponsorToDelete) return;

    if (!canDeleteSponsors()) {
      showAlert('error', 'Access Denied', 'Only President and Vice President can delete sponsors.');
      setSponsorToDelete(null);
      setShowConfirmDelete(false);
      return;
    }

    try {
      // Soft delete: Set deletedAt timestamp instead of actually deleting
      await updateDoc(doc(db, 'sponsors', sponsorToDelete), {
        deletedAt: new Date().toISOString(),
        deletedBy: currentUserId,
        updatedAt: new Date().toISOString(),
      });
      await loadSponsors();
      setSponsorToDelete(null);
      showAlert('success', 'Success', 'Sponsor moved to trash successfully!');
    } catch (error) {
      console.error('Error deleting sponsor:', error);
      showAlert('error', 'Error', 'Failed to delete sponsor. Please try again.');
    }
  };

  const openEditModal = (sponsor: Sponsor) => {
    // Only allow editing if user is President/VP/Admin
    if (!canManageSponsors()) {
      showAlert('error', 'Access Denied', 'Only President, Vice President, or Admin can edit sponsor details.');
      return;
    }
    setSelectedSponsor(sponsor);
    setSponsorName(sponsor.name);
    setSponsorLink(sponsor.link);
    setSponsorLogo(sponsor.logoUrl || '');
    setShowEditModal(true);
  };

  const openMemberModal = (sponsor: Sponsor) => {
    setSelectedSponsor(sponsor);
    setShowMemberModal(true);
  };

  // Check access: Executive Board can create, President/VP/Admin can manage all
  const hasSponsorAccess = isExecBoardMember() || canManageSponsors();
  
  if (!hasSponsorAccess) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
          <p className="text-gray-600">You do not have permission to manage sponsors.</p>
        </div>
      </div>
    );
  }

  // Filter projects based on user role
  let visibleSponsors: Sponsor[] = [];
  if (canManageSponsors()) {
    // President/VP/Admin: see all projects
    visibleSponsors = sponsors;
  } else {
    // Executive Board members: see projects they created or are leaders of
    visibleSponsors = sponsors.filter(s => 
      s.createdBy === currentUserId
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Sponsor Management</h1>
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
                  setSponsorName('');
                  setSponsorLink('');
                  setSponsorLogo('');
                  setShowCreateModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Sponsor
              </button>
            )}
            {canApproveSponsors() && (
              <button
                onClick={() => onNavigate('/admin/sponsors/approvals')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2"
              >
                Approve Sponsors
              </button>
            )}
            {canDeleteSponsors() && (
              <button
                onClick={() => onNavigate('/admin/sponsors/trash')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded flex items-center gap-2"
              >
                Trash
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : visibleSponsors.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No sponsors found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleSponsors.map((sponsor) => (
              <div key={sponsor.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-1">{sponsor.name}</h2>
                    <div className="flex gap-2 flex-wrap">
                      {sponsor.approvalStatus === 'pending' && (
                        <span className="inline-block px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">
                          Pending Approval
                        </span>
                      )}
                    </div>
                  </div>
                  {canManageSponsors() && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(sponsor)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit Sponsor"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      {canDeleteSponsors() && (
                        <button
                          onClick={() => handleDeleteClick(sponsor.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete Sponsor"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {sponsor.link}
                </p>

                {sponsor.approvalStatus === 'pending' && sponsor.createdBy === currentUserId && (
                  <div className="text-sm text-yellow-600 text-center">
                    Waiting for approval
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Sponsor Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Add New Sponsor</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sponsor Name *
                  </label>
                  <input
                    type="text"
                    value={sponsorName}
                    onChange={(e) => setSponsorName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    placeholder="e.g., Lockheed Martin"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sponsor Website
                  </label>
                  <textarea
                    value={sponsorLink}
                    onChange={(e) => setSponsorLink(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    rows={4}
                    placeholder="Sponsor Website Link..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sponsor Logo
                  </label>
                  <textarea
                    value={sponsorLogo}
                    onChange={(e) => setSponsorLogo(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    rows={4}
                    placeholder="Sponsor Logo Link..."
                  />
                </div>

                {!canManageSponsors() && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                    <p className="font-semibold mb-1">Note:</p>
                    <p>Your sponsor will be added and sent for approval.</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleAddSponsor}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  Add Sponsor
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

        {/* Edit Sponsor Modal */}
        {showEditModal && selectedSponsor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Edit Sponsor</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sponsor Name *
                  </label>
                  <input
                    type="text"
                    value={sponsorName}
                    onChange={(e) => setSponsorName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sponsor Website Link
                  </label>
                  <textarea
                    value={sponsorLink}
                    onChange={(e) => setSponsorLink(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sponsor Logo
                  </label>
                  <textarea
                    value={sponsorLink}
                    onChange={(e) => setSponsorLink(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    rows={4}
                  />
                </div>

              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleEditSponsor}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedSponsor(null);
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

        {/* Confirm Delete Modal */}
        <ConfirmModal
          isOpen={showConfirmDelete}
          onClose={() => {
            setShowConfirmDelete(false);
            setSponsorToDelete(null);
          }}
          onConfirm={handleDeleteSponsor}
          title="Move to Trash"
          message="Are you sure you want to delete this sponsor? It will be moved to trash and can be restored later."
          confirmText="Move to Trash"
          cancelText="Cancel"
          type="warning"
        />
      </div>
    </div>
  );
};

export default SponsorManagement;
