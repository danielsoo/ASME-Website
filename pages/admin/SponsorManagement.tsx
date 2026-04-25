import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../src/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { Sponsor, SponsorTier } from '../../src/types';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import AlertModal from '../../src/components/AlertModal';
import ConfirmModal from '../../src/components/ConfirmModal';
import Uploader from '../../src/components/Uploader';
import { useUnsavedChangesGuard } from '../../src/hooks/useUnsavedChangesGuard';
import { useExecPermissions } from '../../src/hooks/useExecPermissions';

interface SponsorManagementProps {
  onNavigate: (path: string) => void;
}

const DEFAULT_SPONSOR_TIERS: SponsorTier[] = [
  { id: 'platinum', name: 'Platinum Sponsors', order: 0 },
  { id: 'gold', name: 'Gold Sponsors', order: 1 },
  { id: 'silver', name: 'Silver Sponsors', order: 2 },
];
const SPONSOR_TIER_CONFIG_DOC_ID = 'tier_config_v1';

function slugifyTierId(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function normalizeTiers(raw: unknown): SponsorTier[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_SPONSOR_TIERS;
  return raw
    .map((t, idx) => {
      const tier = t as Partial<SponsorTier>;
      return {
        id: String(tier.id || `tier-${idx}`),
        name: String(tier.name || `Tier ${idx + 1}`),
        order: typeof tier.order === 'number' ? tier.order : idx,
      };
    })
    .sort((a, b) => a.order - b.order)
    .map((t, i) => ({ ...t, order: i }));
}

const SponsorManagement: React.FC<SponsorManagementProps> = ({ onNavigate }) => {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [sponsorTiers, setSponsorTiers] = useState<SponsorTier[]>(DEFAULT_SPONSOR_TIERS);
  const [tierNameDrafts, setTierNameDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const { ready: permReady, perms } = useExecPermissions();
  const [roleReady, setRoleReady] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null);
  const [deletionRequestsCount, setDeletionRequestsCount] = useState(0);
  const [draggedSponsorId, setDraggedSponsorId] = useState<string | null>(null);
  const [newTierName, setNewTierName] = useState('');
  const dragScrollFrameRef = useRef<number | null>(null);

  const [sponsorName, setSponsorName] = useState('');
  const [sponsorLink, setSponsorLink] = useState('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [sponsorTierId, setSponsorTierId] = useState<string>('');

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [sponsorToDelete, setSponsorToDelete] = useState<string | null>(null);
  const [showConfirmDeleteTier, setShowConfirmDeleteTier] = useState(false);
  const [tierToDeleteId, setTierToDeleteId] = useState<string | null>(null);

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'info', title: '', message: '' });

  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setAlertModal({ isOpen: true, type, title, message });
  };

  const canManageSponsors = (): boolean => perms.sponsors;
  const canDeleteSponsors = (): boolean => perms.sponsors;

  const sortedTiers = useMemo(
    () => [...sponsorTiers].sort((a, b) => a.order - b.order),
    [sponsorTiers]
  );

  const defaultTierId = sortedTiers[0]?.id || DEFAULT_SPONSOR_TIERS[0].id;

  const sortedSponsors = useMemo(() => {
    const tierOrderMap = new Map(sortedTiers.map((t, idx) => [t.id, idx]));
    return [...sponsors].sort((a, b) => {
      const aTier = a.tierId || defaultTierId;
      const bTier = b.tierId || defaultTierId;
      const tierDiff = (tierOrderMap.get(aTier) ?? 999) - (tierOrderMap.get(bTier) ?? 999);
      if (tierDiff !== 0) return tierDiff;
      const orderA = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
      const orderB = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [sponsors, sortedTiers, defaultTierId]);

  const sponsorsByTier = useMemo(() => {
    const grouped: Record<string, Sponsor[]> = {};
    sortedTiers.forEach((tier) => {
      grouped[tier.id] = [];
    });
    sortedSponsors.forEach((s) => {
      const key = s.tierId || defaultTierId;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    });
    return grouped;
  }, [sortedSponsors, sortedTiers, defaultTierId]);

  const saveTierConfig = async (nextTiers: SponsorTier[]) => {
    await setDoc(
      doc(db, 'sponsors', SPONSOR_TIER_CONFIG_DOC_ID),
      { kind: 'tier_config', tiers: nextTiers, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    setSponsorTiers(nextTiers);
  };

  const loadSponsors = async () => {
    try {
      setLoading(true);
      const sponsorsRef = collection(db, 'sponsors');
      const snapshot = await getDocs(sponsorsRef);
      const sponsorsList: Sponsor[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Sponsor;
        if (docSnap.id === SPONSOR_TIER_CONFIG_DOC_ID || (data as Record<string, unknown>).kind === 'tier_config') return;
        if (data.deletedAt) return;

        const normalizedTierId = data.tierId || slugifyTierId(data.tier || '') || defaultTierId;
        sponsorsList.push({
          id: docSnap.id,
          ...data,
          tierId: normalizedTierId,
          order: typeof data.order === 'number' ? data.order : undefined,
        });
      });

      setSponsors(sponsorsList);
    } catch (error) {
      console.error('Error loading sponsors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSponsors();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setRoleReady(false);
        return;
      }
      setCurrentUserId(user.uid);
      try {
        await getDoc(doc(db, 'users', user.uid));
      } catch (error) {
        console.error('Error fetching current user role:', error);
      } finally {
        setRoleReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'sponsors', SPONSOR_TIER_CONFIG_DOC_ID),
      (snap) => {
        const data = snap.exists() ? snap.data() : {};
        const tiers = normalizeTiers((data as { tiers?: unknown }).tiers);
        setSponsorTiers(tiers);
        setTierNameDrafts((prev) => {
          const next = { ...prev };
          tiers.forEach((t) => {
            if (next[t.id] === undefined) next[t.id] = t.name;
          });
          return next;
        });
      },
      (e) => {
        console.error('Sponsor tiers subscription error:', e);
        setSponsorTiers(DEFAULT_SPONSOR_TIERS);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const sponsorsQuery = query(collection(db, 'sponsors'));
    const unsubscribe = onSnapshot(sponsorsQuery, (snapshot) => {
      let count = 0;
      const liveSponsors: Sponsor[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Sponsor;
        if (docSnap.id === SPONSOR_TIER_CONFIG_DOC_ID || (data as Record<string, unknown>).kind === 'tier_config') {
          return;
        }
        if (data.permanentDeleteRequest) {
          const request = data.permanentDeleteRequest;
          if (!request.approvedByExec1 || !request.approvedByExec2) count++;
        }
        if (data.deletedAt) return;
        liveSponsors.push({
          id: docSnap.id,
          ...data,
          tierId: data.tierId || slugifyTierId(data.tier || '') || defaultTierId,
          order: typeof data.order === 'number' ? data.order : undefined,
        });
      });

      setDeletionRequestsCount(count);
      setSponsors(liveSponsors);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [defaultTierId]);

  const handleAddTier = async () => {
    try {
      const name = newTierName.trim();
      if (!name) {
        showAlert('warning', 'Validation Error', 'Please enter a tier name.');
        return;
      }
      const baseId = slugifyTierId(name) || `tier-${Date.now()}`;
      let nextId = baseId;
      let suffix = 2;
      const existingIds = new Set(sortedTiers.map((t) => t.id));
      while (existingIds.has(nextId)) {
        nextId = `${baseId}-${suffix++}`;
      }
      const nextTiers = [...sortedTiers, { id: nextId, name, order: sortedTiers.length }];
      await saveTierConfig(nextTiers);
      setTierNameDrafts((prev) => ({ ...prev, [nextId]: name }));
      setNewTierName('');
      showAlert('success', 'Tier Added', `"${name}" tier was added.`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      showAlert('error', 'Failed to Add Tier', `Could not add tier. ${message}`);
    }
  };

  const handleRenameTier = async (tierId: string) => {
    try {
      const nextName = (tierNameDrafts[tierId] || '').trim();
      if (!nextName) {
        showAlert('warning', 'Validation Error', 'Tier name cannot be empty.');
        return;
      }
      const nextTiers = sortedTiers.map((t) => (t.id === tierId ? { ...t, name: nextName } : t));
      await saveTierConfig(nextTiers);
      showAlert('success', 'Tier Updated', 'Tier name updated.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      showAlert('error', 'Failed to Rename Tier', `Could not rename tier. ${message}`);
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    try {
      if (sortedTiers.length <= 1) {
        showAlert('warning', 'Cannot Delete Tier', 'At least one sponsor tier must remain.');
        return;
      }
      const tier = sortedTiers.find((t) => t.id === tierId);
      if (!tier) return;

      const fallbackTier = sortedTiers.find((t) => t.id !== tierId);
      if (!fallbackTier) return;

      const affected = sponsors.filter((s) => (s.tierId || defaultTierId) === tierId);
      if (affected.length > 0) {
        await Promise.all(
          affected.map((s, idx) =>
            updateDoc(doc(db, 'sponsors', s.id), {
              tierId: fallbackTier.id,
              order: idx,
              updatedAt: new Date().toISOString(),
            })
          )
        );
      }

      const nextTiers = sortedTiers
        .filter((t) => t.id !== tierId)
        .map((t, idx) => ({ ...t, order: idx }));
      await saveTierConfig(nextTiers);
      showAlert('success', 'Tier Deleted', `Tier "${tier.name}" was deleted.`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      showAlert('error', 'Failed to Delete Tier', `Could not delete tier. ${message}`);
    }
  };

  const requestDeleteTier = (tierId: string) => {
    if (sortedTiers.length <= 1) {
      showAlert('warning', 'Cannot Delete Tier', 'At least one sponsor tier must remain.');
      return;
    }
    setTierToDeleteId(tierId);
    setShowConfirmDeleteTier(true);
  };

  const resetSponsorModalFields = () => {
    setSponsorName('');
    setSponsorLink('');
    setLogoUrl('');
    setSponsorTierId(defaultTierId);
  };

  const handleAddSponsor = async () => {
    if (!sponsorName.trim()) {
      showAlert('warning', 'Validation Error', 'Please enter a sponsor name.');
      throw new Error('Validation failed');
    }
    if (!logoUrl) {
      showAlert('warning', 'Validation Error', 'Please upload a sponsor logo.');
      throw new Error('Validation failed');
    }

    const targetTier = sponsorTierId || defaultTierId;
    const nextOrder = (sponsorsByTier[targetTier]?.length ?? 0);

    await setDoc(doc(collection(db, 'sponsors')), {
      name: sponsorName.trim(),
      link: sponsorLink.trim() || '',
      logoUrl,
      tierId: targetTier,
      order: nextOrder,
      approvalStatus: 'approved',
      createdBy: currentUserId,
      approvedBy: currentUserId,
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setShowCreateModal(false);
    resetSponsorModalFields();
    showAlert('success', 'Success', 'Sponsor added successfully!');
  };

  const handleEditSponsor = async () => {
    if (!selectedSponsor || !sponsorName.trim()) {
      showAlert('warning', 'Validation Error', 'Please enter a sponsor name.');
      throw new Error('Validation failed');
    }
    const nextTierId = sponsorTierId || defaultTierId;
    const movedTier = nextTierId !== (selectedSponsor.tierId || defaultTierId);
    const nextOrder = movedTier ? (sponsorsByTier[nextTierId]?.length ?? 0) : selectedSponsor.order;

    await updateDoc(doc(db, 'sponsors', selectedSponsor.id), {
      name: sponsorName.trim(),
      link: sponsorLink.trim() || '',
      logoUrl: logoUrl || selectedSponsor.logoUrl,
      tierId: nextTierId,
      order: typeof nextOrder === 'number' ? nextOrder : 0,
      updatedAt: new Date().toISOString(),
    });

    setShowEditModal(false);
    setSelectedSponsor(null);
    resetSponsorModalFields();
    showAlert('success', 'Success', 'Sponsor updated successfully!');
  };

  const handleDeleteClick = (sponsorId: string) => {
    setSponsorToDelete(sponsorId);
    setShowConfirmDelete(true);
  };

  const handleDeleteSponsor = async () => {
    if (!sponsorToDelete) return;
    if (!canDeleteSponsors()) {
      showAlert('error', 'Permission denied', 'You do not have permission to move sponsors to trash.');
      setSponsorToDelete(null);
      setShowConfirmDelete(false);
      return;
    }

    await updateDoc(doc(db, 'sponsors', sponsorToDelete), {
      deletedAt: new Date().toISOString(),
      deletedBy: currentUserId,
      updatedAt: new Date().toISOString(),
    });
    setSponsorToDelete(null);
    showAlert('success', 'Success', 'Sponsor moved to trash successfully!');
  };

  const openEditModal = (sponsor: Sponsor) => {
    if (!canManageSponsors()) {
      showAlert('error', 'Permission denied', 'You do not have permission to edit sponsors.');
      return;
    }
    setSelectedSponsor(sponsor);
    setSponsorName(sponsor.name);
    setSponsorLink(sponsor.link || '');
    setLogoUrl('');
    setSponsorTierId(sponsor.tierId || defaultTierId);
    setShowEditModal(true);
  };

  const reorderWithinAndAcrossTiers = async (targetTierId: string, targetIndex: number) => {
    if (!draggedSponsorId) return;
    const dragged = sponsors.find((s) => s.id === draggedSponsorId);
    if (!dragged) return;

    const sourceTierId = dragged.tierId || defaultTierId;
    const nextSponsors = [...sponsors];
    const sourceList = nextSponsors
      .filter((s) => (s.tierId || defaultTierId) === sourceTierId && s.id !== dragged.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const targetList = nextSponsors
      .filter((s) => (s.tierId || defaultTierId) === targetTierId && s.id !== dragged.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const insertAt = Math.max(0, Math.min(targetIndex, targetList.length));
    const moved = { ...dragged, tierId: targetTierId };
    targetList.splice(insertAt, 0, moved);

    const updates: Array<{ id: string; tierId: string; order: number }> = [];
    sourceList.forEach((s, idx) => updates.push({ id: s.id, tierId: sourceTierId, order: idx }));
    targetList.forEach((s, idx) => updates.push({ id: s.id, tierId: targetTierId, order: idx }));

    setSponsors((prev) =>
      prev.map((s) => {
        const u = updates.find((x) => x.id === s.id);
        return u ? { ...s, tierId: u.tierId, order: u.order } : s;
      })
    );

    await Promise.all(
      updates.map((u) =>
        updateDoc(doc(db, 'sponsors', u.id), {
          tierId: u.tierId,
          order: u.order,
          updatedAt: new Date().toISOString(),
        })
      )
    );
  };

  const stopAutoScroll = () => {
    if (dragScrollFrameRef.current != null) {
      cancelAnimationFrame(dragScrollFrameRef.current);
      dragScrollFrameRef.current = null;
    }
  };

  const startAutoScroll = (deltaY: number) => {
    stopAutoScroll();
    const tick = () => {
      window.scrollBy({ top: deltaY, behavior: 'auto' });
      dragScrollFrameRef.current = requestAnimationFrame(tick);
    };
    dragScrollFrameRef.current = requestAnimationFrame(tick);
  };

  const handleDragViewportScroll = (e: React.DragEvent) => {
    if (!draggedSponsorId) return;
    const threshold = 110;
    const topZone = e.clientY < threshold;
    const bottomZone = e.clientY > window.innerHeight - threshold;

    if (topZone) {
      startAutoScroll(-12);
    } else if (bottomZone) {
      startAutoScroll(12);
    } else {
      stopAutoScroll();
    }
  };

  const createModalDirty =
    showCreateModal &&
    (sponsorName.trim() !== '' || sponsorLink.trim() !== '' || !!logoUrl || sponsorTierId !== defaultTierId);
  const editModalDirty =
    showEditModal &&
    !!selectedSponsor &&
    (sponsorName.trim() !== (selectedSponsor.name || '').trim() ||
      sponsorLink.trim() !== (selectedSponsor.link || '').trim() ||
      !!logoUrl ||
      sponsorTierId !== (selectedSponsor.tierId || defaultTierId));
  const dirty = createModalDirty || editModalDirty;
  const saveForLeave = async () => {
    if (showEditModal && selectedSponsor) await handleEditSponsor();
    else if (showCreateModal) await handleAddSponsor();
  };
  const { safeNavigate, leaveConfirmModal } = useUnsavedChangesGuard({
    currentPath: '/admin/sponsors',
    dirty,
    onNavigate,
    onSave: saveForLeave,
  });

  if (!roleReady || !permReady) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center overflow-x-auto">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const readOnlySponsors = !canManageSponsors();

  useEffect(() => {
    if (!draggedSponsorId) stopAutoScroll();
    return () => stopAutoScroll();
  }, [draggedSponsorId]);

  return (
    <div
      className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 overflow-x-auto"
      onDragOver={handleDragViewportScroll}
      onDrop={() => {
        setDraggedSponsorId(null);
        stopAutoScroll();
      }}
      onDragEnd={() => {
        setDraggedSponsorId(null);
        stopAutoScroll();
      }}
    >
      <div className="max-w-7xl mx-auto min-w-0">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Sponsor Management</h1>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => safeNavigate('/admin')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 sm:px-4 rounded text-sm sm:text-base"
            >
              ← Back to Dashboard
            </button>
            {canManageSponsors() && (
              <button
                onClick={() => {
                  resetSponsorModalFields();
                  setShowCreateModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 sm:px-4 rounded flex items-center gap-1.5 text-sm sm:text-base"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                Add Sponsor
              </button>
            )}
            {canManageSponsors() && (
              <button
                onClick={() => safeNavigate('/admin/sponsors/trash')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 sm:px-4 rounded flex items-center gap-1.5 text-sm sm:text-base relative"
              >
                Trash
                {deletionRequestsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center px-1 shadow">
                    {deletionRequestsCount > 99 ? '99+' : deletionRequestsCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {leaveConfirmModal}

        {readOnlySponsors && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <strong>View only.</strong> You can browse sponsors but cannot add, edit, delete, or open Trash.
          </div>
        )}

        {/* Tier management */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Sponsor Tiers</h2>
          <div className="space-y-3">
            {sortedTiers.map((tier) => (
              <div key={tier.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={tierNameDrafts[tier.id] ?? tier.name}
                  onChange={(e) => setTierNameDrafts((prev) => ({ ...prev, [tier.id]: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                  disabled={!canManageSponsors()}
                />
                {canManageSponsors() && (
                  <>
                    <button
                      onClick={() => handleRenameTier(tier.id)}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => requestDeleteTier(tier.id)}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            ))}
            {canManageSponsors() && (
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                <input
                  type="text"
                  value={newTierName}
                  onChange={(e) => setNewTierName(e.target.value)}
                  placeholder="New tier name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                />
                <button
                  onClick={handleAddTier}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm"
                >
                  Add Tier
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : sponsors.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No sponsors found.</div>
        ) : (
          <div className="space-y-8">
            {sortedTiers.map((tier) => {
              const tierSponsors = sponsorsByTier[tier.id] || [];
              return (
                <div key={tier.id} className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">{tier.name}</h2>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={async () => {
                      if (!canManageSponsors()) return;
                      await reorderWithinAndAcrossTiers(tier.id, tierSponsors.length);
                      setDraggedSponsorId(null);
                    }}
                    className="rounded-md"
                  >
                    {tierSponsors.length === 0 ? (
                      <div className="border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                        No sponsors in this tier. Drag a sponsor here.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {tierSponsors.map((sponsor, index) => (
                        <div
                          key={sponsor.id}
                          draggable={canManageSponsors()}
                          onDragStart={() => setDraggedSponsorId(sponsor.id)}
                          onDragEnd={() => {
                            setDraggedSponsorId(null);
                            stopAutoScroll();
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={async (e) => {
                            e.stopPropagation();
                            if (!canManageSponsors()) return;
                            await reorderWithinAndAcrossTiers(tier.id, index);
                            setDraggedSponsorId(null);
                          }}
                          className="relative aspect-square bg-gray-50 rounded border overflow-hidden group"
                        >
                          {canManageSponsors() && (
                            <div className="absolute top-2 left-2 z-10 bg-black/60 rounded p-1 text-white">
                              <GripVertical className="w-4 h-4" />
                            </div>
                          )}
                          <img src={sponsor.logoUrl} alt={sponsor.name} className="w-full h-full object-cover object-center" />
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-xs p-2 truncate">
                            {sponsor.name}
                          </div>
                          {canManageSponsors() && (
                            <div className="absolute top-2 right-2 z-10 flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(sponsor);
                                }}
                                className="bg-white/90 rounded p-1 text-blue-700 hover:text-blue-900"
                                title="Edit Sponsor"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {canDeleteSponsors() && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(sponsor.id);
                                  }}
                                  className="bg-white/90 rounded p-1 text-red-700 hover:text-red-900"
                                  title="Delete Sponsor"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Add New Sponsor</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sponsor Name *</label>
                  <input
                    type="text"
                    value={sponsorName}
                    onChange={(e) => setSponsorName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    placeholder="e.g., Lockheed Martin"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tier *</label>
                  <select
                    value={sponsorTierId || defaultTierId}
                    onChange={(e) => setSponsorTierId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                  >
                    {sortedTiers.map((tier) => (
                      <option key={tier.id} value={tier.id}>
                        {tier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sponsor Website</label>
                  <input
                    type="text"
                    value={sponsorLink}
                    onChange={(e) => setSponsorLink(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sponsor Logo *</label>
                  <Uploader
                    folder="/sponsors"
                    tags={['sponsor']}
                    buttonLabel="Upload Logo"
                    onComplete={(u) => setLogoUrl(u.url)}
                    onError={(msg) => showAlert('error', 'Upload Error', msg)}
                  />
                  {logoUrl && (
                    <div className="mt-4 w-32 aspect-square border rounded overflow-hidden bg-gray-100">
                      <img src={logoUrl} alt="Logo preview" className="w-full h-full object-cover object-center" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button onClick={handleAddSponsor} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                  Add Sponsor
                </button>
                <button onClick={() => setShowCreateModal(false)} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditModal && selectedSponsor && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Edit Sponsor</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sponsor Name *</label>
                  <input
                    type="text"
                    value={sponsorName}
                    onChange={(e) => setSponsorName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tier *</label>
                  <select
                    value={sponsorTierId || defaultTierId}
                    onChange={(e) => setSponsorTierId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                  >
                    {sortedTiers.map((tier) => (
                      <option key={tier.id} value={tier.id}>
                        {tier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sponsor Website Link</label>
                  <input
                    type="text"
                    value={sponsorLink}
                    onChange={(e) => setSponsorLink(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sponsor Logo</label>
                  <Uploader
                    folder="/sponsors"
                    tags={['sponsor']}
                    buttonLabel="Replace Logo"
                    onComplete={(u) => setLogoUrl(u.url)}
                    onError={(msg) => showAlert('error', 'Upload Error', msg)}
                  />
                  {(logoUrl || selectedSponsor?.logoUrl) && (
                    <div className="mt-4 w-32 aspect-square border rounded overflow-hidden bg-gray-100">
                      <img
                        src={logoUrl || selectedSponsor?.logoUrl}
                        alt="Logo preview"
                        className="w-full h-full object-cover object-center"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button onClick={handleEditSponsor} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
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

        <AlertModal
          isOpen={alertModal.isOpen}
          onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
          type={alertModal.type}
          title={alertModal.title}
          message={alertModal.message}
        />

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

        <ConfirmModal
          isOpen={showConfirmDeleteTier}
          onClose={() => {
            setShowConfirmDeleteTier(false);
            setTierToDeleteId(null);
          }}
          onConfirm={async () => {
            if (!tierToDeleteId) return;
            await handleDeleteTier(tierToDeleteId);
            setShowConfirmDeleteTier(false);
            setTierToDeleteId(null);
          }}
          title={`Delete tier "${sortedTiers.find((t) => t.id === tierToDeleteId)?.name || ''}"`}
          message={`Sponsors in this tier will be moved to "${
            sortedTiers.find((t) => t.id !== tierToDeleteId)?.name || ''
          }".`}
          confirmText="Delete Tier"
          cancelText="Cancel"
          type="warning"
        />
      </div>
    </div>
  );
};

export default SponsorManagement;
