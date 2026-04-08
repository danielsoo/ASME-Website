import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, getDoc, addDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db, auth } from '../../src/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import AlertModal from '../../src/components/AlertModal';
import ConfirmModal from '../../src/components/ConfirmModal';
import { TeamMember } from '../../src/types';
import { useUnsavedChangesGuard } from '../../src/hooks/useUnsavedChangesGuard';

interface MemberManagementProps {
  onNavigate: (path: string) => void;
}

interface ExecPosition {
  id: string;
  name: string;
  team?: 'Design Team' | 'General Body';
}

const MemberManagement: React.FC<MemberManagementProps> = ({ onNavigate }) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [execPositions, setExecPositions] = useState<ExecPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Position management states
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState<ExecPosition | null>(null);
  const [positionName, setPositionName] = useState('');
  const [positionTeam, setPositionTeam] = useState<'Design Team' | 'General Body' | ''>('');
  
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Delete confirmation modal states
  const [showDeleteErrorModal, setShowDeleteErrorModal] = useState(false);
  const [deleteErrorPosition, setDeleteErrorPosition] = useState<ExecPosition | null>(null);
  const [assignedMembersForDeletion, setAssignedMembersForDeletion] = useState<TeamMember[]>([]);

  // Duplicate member modal states
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateUser, setDuplicateUser] = useState<TeamMember | null>(null);
  const [pendingAddData, setPendingAddData] = useState<{ name: string; email: string; major: string; year: string; role: string; team: string } | null>(null);
  
  // Confirm delete modal state
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [positionToDelete, setPositionToDelete] = useState<string | null>(null);

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

  // Member role assignment states
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<'Design Team' | 'General Body' | ''>('');

  // Add member modal (President/Vice President only)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberMajor, setNewMemberMajor] = useState('');
  const [newMemberYear, setNewMemberYear] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('member');
  const [newMemberTeam, setNewMemberTeam] = useState<'Design Team' | 'General Body' | ''>('');
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    loadMembers();
    loadExecPositions();

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

  const loadMembers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const membersList: TeamMember[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 'approved') {
          membersList.push({
            id: docSnap.id,
            name: data.name || '',
            email: data.email || '',
            major: data.major || '',
            year: data.year || '',
            hometown: data.hometown || '',
            imageUrl: data.imageUrl || '',
            isExec: data.role !== 'member' && data.role !== 'admin',
            position: data.role || 'member',
            team: data.team || undefined,
            status: data.status,
          });
        }
      });

      // Sort: Executive Board first, then by name
      membersList.sort((a, b) => {
        const aIsExec = a.position !== 'member' && a.position !== 'admin';
        const bIsExec = b.position !== 'member' && b.position !== 'admin';
        if (aIsExec !== bIsExec) return aIsExec ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      setMembers(membersList);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExecPositions = async () => {
    try {
      const positionsRef = collection(db, 'execPositions');
      const snapshot = await getDocs(positionsRef);
      const positionsList: ExecPosition[] = [];

      snapshot.forEach((docSnap) => {
        positionsList.push({
          id: docSnap.id,
          ...docSnap.data(),
        } as ExecPosition);
      });

      // Sort by name
      positionsList.sort((a, b) => a.name.localeCompare(b.name));
      setExecPositions(positionsList);
    } catch (error) {
      console.error('Error loading exec positions:', error);
    }
  };

  // Check if user can manage positions/members
  const canManage = (): boolean => {
    return currentUserRole === 'President' || currentUserRole === 'Vice President';
  };

  const handleAddPosition = async () => {
    if (!positionName.trim()) {
      showAlert('warning', 'Validation Error', 'Please enter a position name.');
      throw new Error('Validation failed');
    }

    try {
      await addDoc(collection(db, 'execPositions'), {
        name: positionName.trim(),
        team: positionTeam || null,
      });

      setShowPositionModal(false);
      setPositionName('');
      setPositionTeam('');
      await loadExecPositions();
      showAlert('success', 'Success', 'Position added successfully!');
    } catch (error) {
      console.error('Error adding position:', error);
      showAlert('error', 'Error', 'Failed to add position. Please try again.');
    }
  };

  const handleEditPosition = async () => {
    if (!editingPosition || !positionName.trim()) {
      showAlert('warning', 'Validation Error', 'Please enter a position name.');
      throw new Error('Validation failed');
    }

    try {
      await updateDoc(doc(db, 'execPositions', editingPosition.id), {
        name: positionName.trim(),
        team: positionTeam || null,
      });

      setEditingPosition(null);
      setPositionName('');
      setPositionTeam('');
      await loadExecPositions();
      showAlert('success', 'Success', 'Position updated successfully!');
    } catch (error) {
      console.error('Error updating position:', error);
      showAlert('error', 'Error', 'Failed to update position. Please try again.');
    }
  };

  const handleDeleteClick = (positionId: string) => {
    // Get the position name to check for assigned members
    const position = execPositions.find(p => p.id === positionId);
    if (!position) {
      showAlert('error', 'Error', 'Position not found.');
      return;
    }

    // Check if any members are assigned to this position
    const assignedMembers = members.filter(m => m.position === position.name);
    
    if (assignedMembers.length > 0) {
      // Show custom error modal instead of alert
      setDeleteErrorPosition(position);
      setAssignedMembersForDeletion(assignedMembers);
      setShowDeleteErrorModal(true);
      return;
    }

    // Show confirm modal
    setPositionToDelete(positionId);
    setShowConfirmDelete(true);
  };

  const handleDeletePosition = async () => {
    if (!positionToDelete) return;

    try {
      await deleteDoc(doc(db, 'execPositions', positionToDelete));
      await loadExecPositions();
      setPositionToDelete(null);
      showAlert('success', 'Success', 'Position deleted successfully!');
    } catch (error) {
      console.error('Error deleting position:', error);
      showAlert('error', 'Error', 'Failed to delete position. Please try again.');
    }
  };

  const openEditPosition = (position: ExecPosition) => {
    setEditingPosition(position);
    setPositionName(position.name);
    setPositionTeam(position.team || '');
    setShowPositionModal(true);
  };

  const handleMemberRoleChange = async () => {
    if (!editingMember) {
      throw new Error('No member selected');
    }

    // If role is 'member', no team assignment needed
    if (selectedRole === 'member') {
      try {
        await updateDoc(doc(db, 'users', editingMember.id), {
          role: 'member',
          team: null,
        });
        setEditingMember(null);
        setSelectedRole('');
        setSelectedTeam('');
        await loadMembers();
        showAlert('success', 'Success', 'Member role updated successfully!');
      } catch (error) {
        console.error('Error updating member:', error);
        showAlert('error', 'Error', 'Failed to update member. Please try again.');
      }
      return;
    }

    // If role is Executive Board position, team is required
    if (!selectedTeam) {
      showAlert('warning', 'Validation Error', 'Please select a team (Design Team or General Body) for Executive Board positions.');
      throw new Error('Validation failed');
    }

    try {
      await updateDoc(doc(db, 'users', editingMember.id), {
        role: selectedRole,
        team: selectedTeam,
      });
      setEditingMember(null);
      setSelectedRole('');
      setSelectedTeam('');
      await loadMembers();
      showAlert('success', 'Success', 'Member role and team updated successfully!');
    } catch (error) {
      console.error('Error updating member:', error);
      showAlert('error', 'Error', 'Failed to update member. Please try again.');
    }
  };

  const openMemberEdit = (member: TeamMember) => {
    setEditingMember(member);
    setSelectedRole(member.position || 'member');
    setSelectedTeam(member.team || '');
  };

  const positionModalDirty = showPositionModal && (
    editingPosition
      ? positionName.trim() !== (editingPosition.name || '').trim() || (positionTeam || '') !== (editingPosition.team || '')
      : positionName.trim() !== '' || positionTeam !== ''
  );
  const memberEditDirty = editingMember !== null && (
    selectedRole !== (editingMember.position || 'member') || selectedTeam !== (editingMember.team || '')
  );
  const addMemberDirty = showAddMemberModal && (
    newMemberName.trim() !== '' || newMemberEmail.trim() !== '' || newMemberMajor.trim() !== '' || newMemberYear.trim() !== ''
  );
  const dirty = positionModalDirty || memberEditDirty || addMemberDirty;
  const saveForLeave = async () => {
    if (showPositionModal) {
      if (editingPosition) await handleEditPosition();
      else await handleAddPosition();
    } else if (editingMember) await handleMemberRoleChange();
    else if (showAddMemberModal) await handleAddMember();
  };
  const { safeNavigate, leaveConfirmModal } = useUnsavedChangesGuard({
    currentPath: '/admin/members',
    dirty,
    onNavigate,
    onSave: saveForLeave,
  });

  const handleAddMember = async () => {
    const name = newMemberName.trim();
    const email = newMemberEmail.trim().toLowerCase();
    if (!name || !email) {
      showAlert('warning', 'Validation Error', 'Please enter name and email.');
      throw new Error('Validation failed');
    }
    if (newMemberRole !== 'member' && !newMemberTeam) {
      showAlert('warning', 'Validation Error', 'Please select a team (Design Team or General Body) for executive positions.');
      throw new Error('Validation failed');
    }
    setAddingMember(true);
    try {
      // Check for duplicate email
      const emailQuery = query(collection(db, 'users'), where('email', '==', email));
      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        const existingDoc = emailSnapshot.docs[0];
        const existingData = existingDoc.data();
        const existingMember: TeamMember = {
          id: existingDoc.id,
          name: existingData.name || '',
          email: existingData.email || '',
          major: existingData.major || '',
          year: existingData.year || '',
          hometown: existingData.hometown || '',
          imageUrl: existingData.imageUrl || '',
          position: existingData.role || 'member',
          team: existingData.team || undefined,
          status: existingData.status,
        };
        setDuplicateUser(existingMember);
        setPendingAddData({ name, email, major: newMemberMajor.trim() || '', year: newMemberYear.trim() || '', role: newMemberRole, team: newMemberTeam });
        setAddingMember(false);
        setShowDuplicateModal(true);
        return;
      }

      await doAddMember({ name, email, major: newMemberMajor.trim() || '', year: newMemberYear.trim() || '', role: newMemberRole, team: newMemberTeam });
    } catch (error) {
      console.error('Error adding member:', error);
      showAlert('error', 'Error', 'Failed to add member. Please try again.');
    } finally {
      setAddingMember(false);
    }
  };

  const doAddMember = async (data: { name: string; email: string; major: string; year: string; role: string; team: string }) => {
    await addDoc(collection(db, 'users'), {
      name: data.name,
      email: data.email,
      major: data.major,
      year: data.year,
      role: data.role,
      team: data.role === 'member' ? null : data.team || null,
      status: 'approved',
      isManualAdd: true,
    });
    setShowAddMemberModal(false);
    setNewMemberName(''); setNewMemberEmail(''); setNewMemberMajor(''); setNewMemberYear('');
    setNewMemberRole('member'); setNewMemberTeam('');
    await loadMembers();
    showAlert('success', 'Success', 'Member has been added to the list.');
  };

  const handleDuplicateUpdate = async () => {
    if (!duplicateUser || !pendingAddData) return;
    try {
      await updateDoc(doc(db, 'users', duplicateUser.id), {
        name: pendingAddData.name,
        major: pendingAddData.major,
        year: pendingAddData.year,
        role: pendingAddData.role,
        team: pendingAddData.role === 'member' ? null : pendingAddData.team || null,
        status: 'approved',
      });
      setShowDuplicateModal(false);
      setDuplicateUser(null);
      setPendingAddData(null);
      setShowAddMemberModal(false);
      setNewMemberName(''); setNewMemberEmail(''); setNewMemberMajor(''); setNewMemberYear('');
      setNewMemberRole('member'); setNewMemberTeam('');
      await loadMembers();
      showAlert('success', 'Success', 'Existing member record has been updated.');
    } catch (error) {
      console.error('Error updating duplicate member:', error);
      showAlert('error', 'Error', 'Failed to update member. Please try again.');
    }
  };

  const openAddMemberModal = () => {
    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberMajor('');
    setNewMemberYear('');
    setNewMemberRole('member');
    setNewMemberTeam('');
    setShowAddMemberModal(true);
  };

  // Get available roles: member + all Executive Board positions (use id for key to avoid duplicate name keys)
  const roleOptions: { id: string; value: string; label: string }[] = [
    { id: 'member', value: 'member', label: 'Member' },
    ...execPositions.map((p) => ({ id: p.id, value: p.name, label: p.name })),
  ];

  if (!canManage()) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center overflow-x-auto">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
          <p className="text-gray-600">Only President and Vice President can manage members.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 overflow-x-auto">
      <div className="max-w-7xl mx-auto min-w-0">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Member Management</h1>
          <button
            onClick={() => safeNavigate('/admin')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 sm:px-4 rounded text-sm sm:text-base shrink-0"
          >
            ← Back to Dashboard
          </button>
        </div>
        {leaveConfirmModal}
        {/* Exec Position Management Section */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Executive Board Positions</h2>
            <button
              onClick={() => {
                setEditingPosition(null);
                setPositionName('');
                setPositionTeam('');
                setShowPositionModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 sm:px-4 rounded flex items-center gap-1.5 text-sm sm:text-base shrink-0"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              Add Position
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {execPositions.map((position) => (
              <div key={position.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-wrap justify-between items-center gap-2 min-w-0">
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-800 text-sm sm:text-base break-words">{position.name}</h3>
                  {position.team && (
                    <p className="text-sm text-gray-500">{position.team}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditPosition(position)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Edit"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(position.id)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Members List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-wrap justify-between items-center gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Members</h2>
              <p className="text-sm text-gray-500 mt-1 max-w-3xl">
                Assign roles and teams here. The About page Executive Board and Design Team read from the same user
                profiles: photo, email, year, major, and fun fact are edited by each member under Profile settings.
              </p>
            </div>
            <button
              onClick={openAddMemberModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 sm:px-4 rounded flex items-center gap-1.5 text-sm sm:text-base shrink-0"
              title="Add member manually (President / Vice President only)"
            >
              <Plus className="w-5 h-5" />
              Add Member
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No members found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Major</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{member.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.major}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.year}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingMember?.id === member.id ? (
                          <select
                            value={selectedRole}
                            onChange={(e) => {
                              setSelectedRole(e.target.value);
                              if (e.target.value === 'member') {
                                setSelectedTeam('');
                              }
                            }}
                            className="px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900"
                          >
                            {roleOptions.map((opt) => (
                              <option key={opt.id} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-gray-700">{member.position === 'member' ? 'Member' : member.position}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingMember?.id === member.id ? (
                          selectedRole !== 'member' ? (
                            <select
                              value={selectedTeam}
                              onChange={(e) => setSelectedTeam(e.target.value as 'Design Team' | 'General Body')}
                              className="px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900"
                            >
                              <option value="">Select team...</option>
                              <option value="Design Team">Design Team</option>
                              <option value="General Body">General Body</option>
                            </select>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )
                        ) : (
                          <span className="text-gray-700">{member.team || '—'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingMember?.id === member.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={handleMemberRoleChange}
                              className="text-green-600 hover:text-green-800"
                              title="Save"
                            >
                              <Save className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingMember(null);
                                setSelectedRole('');
                                setSelectedTeam('');
                              }}
                              className="text-red-600 hover:text-red-800"
                              title="Cancel"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => openMemberEdit(member)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Position Modal */}
        {showPositionModal && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">
                {editingPosition ? 'Edit Position' : 'Add New Position'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position Name *
                  </label>
                  <input
                    type="text"
                    value={positionName}
                    onChange={(e) => setPositionName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    placeholder="e.g., Treasurer, Design Director"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team (Optional)
                  </label>
                  <select
                    value={positionTeam}
                    onChange={(e) => setPositionTeam(e.target.value as 'Design Team' | 'General Body' | '')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    style={{ 
                      color: '#111827', 
                      backgroundColor: '#ffffff',
                      WebkitAppearance: 'menulist',
                      appearance: 'menulist'
                    }}
                  >
                    <option value="" style={{ color: '#111827', backgroundColor: '#ffffff' }}>No specific team</option>
                    <option value="Design Team" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Design Team</option>
                    <option value="General Body" style={{ color: '#111827', backgroundColor: '#ffffff' }}>General Body</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={editingPosition ? handleEditPosition : handleAddPosition}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  {editingPosition ? 'Save Changes' : 'Add Position'}
                </button>
                <button
                  onClick={() => {
                    setShowPositionModal(false);
                    setEditingPosition(null);
                    setPositionName('');
                    setPositionTeam('');
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Member Modal */}
        {showAddMemberModal && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Add Member</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                  <input
                    type="text"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <input
                    type="text"
                    value={newMemberYear}
                    onChange={(e) => setNewMemberYear(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    placeholder="e.g., Freshman, Sophomore, Junior, Senior"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Major</label>
                  <input
                    type="text"
                    value={newMemberMajor}
                    onChange={(e) => setNewMemberMajor(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    placeholder="e.g., Mechanical Engineering"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => {
                      setNewMemberRole(e.target.value);
                      if (e.target.value === 'member') setNewMemberTeam('');
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                  >
                    {roleOptions.map((opt) => (
                      <option key={opt.id} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                {newMemberRole !== 'member' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Team *</label>
                    <select
                      value={newMemberTeam}
                      onChange={(e) => setNewMemberTeam(e.target.value as 'Design Team' | 'General Body')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    >
                      <option value="">Select team...</option>
                      <option value="Design Team">Design Team</option>
                      <option value="General Body">General Body</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleAddMember}
                  disabled={addingMember}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded"
                >
                  {addingMember ? 'Adding...' : 'Add Member'}
                </button>
                <button
                  onClick={() => setShowAddMemberModal(false)}
                  disabled={addingMember}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Error Modal */}
        {showDeleteErrorModal && deleteErrorPosition && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <X className="w-6 h-6 text-yellow-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Cannot Delete Position</h2>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  Cannot delete the position <span className="font-semibold">"{deleteErrorPosition.name}"</span> because{' '}
                  <span className="font-semibold">{assignedMembersForDeletion.length}</span> member(s) are currently assigned to this position.
                </p>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-yellow-800 mb-2">Assigned Members:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {assignedMembersForDeletion.map((member) => (
                      <li key={member.id} className="text-sm text-yellow-900">
                        {member.name || member.email}
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="text-gray-600 text-sm mt-4">
                  Please change their position first before deleting this position.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowDeleteErrorModal(false);
                    setDeleteErrorPosition(null);
                    setAssignedMembersForDeletion([]);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
                >
                  OK
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
            setPositionToDelete(null);
          }}
          onConfirm={handleDeletePosition}
          title="Delete Position"
          message="Are you sure you want to delete this position?"
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />

        {/* Duplicate Email Modal */}
        <ConfirmModal
          isOpen={showDuplicateModal}
          onClose={() => {
            setShowDuplicateModal(false);
            setDuplicateUser(null);
            setPendingAddData(null);
          }}
          onConfirm={handleDuplicateUpdate}
          title="Duplicate Email Found"
          message={`A member with this email already exists:\n\nName: ${duplicateUser?.name || '—'}\nEmail: ${duplicateUser?.email || '—'}\nRole: ${duplicateUser?.position || 'member'}\nStatus: ${duplicateUser?.status || '—'}\n\nDo you want to update their record with the new information instead of creating a duplicate?`}
          confirmText="Update Existing"
          cancelText="Cancel"
          type="warning"
        />
      </div>
    </div>
  );
};

export default MemberManagement;
