import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { UnsavedAction } from '../components/UnsavedChangesModal';
import UnsavedChangesModal from '../components/UnsavedChangesModal';

function getHashPath(): string {
  const fullHash = window.location.hash.slice(1) || '/';
  return fullHash.split('#')[0];
}

interface UseUnsavedChangesGuardOptions {
  /** Current panel path (e.g. '/admin/site'). When dirty, only use leave-confirm modal when leaving this path */
  currentPath: string;
  /** Whether there are unsaved changes */
  dirty: boolean;
  /** Actual navigation function (e.g. onNavigate from App) */
  onNavigate: (path: string) => void;
  /** Called on "Save and leave". Return a Promise that resolves after save. Reject to cancel leaving */
  onSave: () => Promise<void>;
}

/**
 * When there are unsaved changes:
 * - Browser leave (close tab, refresh): beforeunload warning
 * - In-app leave (navigate to another page): confirm modal → Save and leave / Discard / Continue editing
 */
export function useUnsavedChangesGuard({
  currentPath,
  dirty,
  onNavigate,
  onSave,
}: UseUnsavedChangesGuardOptions): {
  /** When leaving: show modal if dirty, otherwise navigate. Use on all Back/leave buttons */
  safeNavigate: (path: string) => void;
  /** Modal node (include in JSX) */
  leaveConfirmModal: React.ReactNode;
} {
  const [showModal, setShowModal] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const currentPathRef = useRef(currentPath);
  currentPathRef.current = currentPath;

  // Browser leave (close tab, refresh, etc.)
  useEffect(() => {
    if (!dirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  // On direct hash change (back button, address bar): revert and show modal
  useEffect(() => {
    if (!dirty) return;
    const handleHashChange = () => {
      const nextPath = getHashPath();
      const expected = currentPathRef.current.replace(/^#/, '');
      const normalizedNext = nextPath.startsWith('/') ? nextPath : `/${nextPath}`;
      if (normalizedNext !== expected) {
        window.location.hash = expected;
        setPendingPath(normalizedNext);
        setShowModal(true);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [dirty]);

  const handleModalAction = useCallback(
    async (action: UnsavedAction) => {
      if (action === 'cancel') {
        setShowModal(false);
        setPendingPath(null);
        return;
      }
      if (action === 'discard') {
        const path = pendingPath;
        setShowModal(false);
        setPendingPath(null);
        if (path) onNavigate(path);
        return;
      }
      // save-and-leave
      setSaving(true);
      try {
        await onSave();
        const path = pendingPath;
        setShowModal(false);
        setPendingPath(null);
        if (path) onNavigate(path);
      } catch (e) {
        console.error('Save before leave failed:', e);
        // Keep modal open so user can continue editing or retry
      } finally {
        setSaving(false);
      }
    },
    [pendingPath, onNavigate, onSave]
  );

  const safeNavigate = useCallback(
    (path: string) => {
      if (!dirty) {
        onNavigate(path);
        return;
      }
      setPendingPath(path);
      setShowModal(true);
    },
    [dirty, onNavigate]
  );

  const leaveConfirmModal = React.createElement(UnsavedChangesModal, {
    isOpen: showModal,
    onAction: handleModalAction,
    saving,
  });

  return { safeNavigate, leaveConfirmModal };
}
