import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../src/firebase/config';
import RichTextEditor from '../../src/components/RichTextEditor';
import { useUnsavedChangesGuard } from '../../src/hooks/useUnsavedChangesGuard';

const CONFIG_PATH = 'config';
const HANDOVER_DOC = 'presidentHandover';
const HISTORY_MAX = 5;
const TRASH_EXPIRE_DAYS = 30;

interface PresidentHandoverProps {
  onNavigate: (path: string) => void;
  currentUserRole: string;
  currentPath?: string;
}

interface HandoverData {
  memo: string;
  credentials: string;
}

interface HistoryEntry {
  memo: string;
  credentials: string;
  updatedAt: string;
  updatedBy: string;
  updatedByName: string;
}

interface LegacyEntry {
  authorName: string;
  authorId?: string;
  createdAt: string;
  memo: string;
  credentials: string;
}

/** Deleted by previous president; passed to next president. Restore or permanently delete within 30 days. */
interface TrashEntry {
  authorName: string;
  authorId?: string;
  createdAt: string;
  memo: string;
  credentials: string;
}

interface HandoverDoc {
  memo: string;
  credentials: string;
  updatedAt?: string;
  updatedBy?: string;
  updatedByName?: string;
  history?: HistoryEntry[];
  legacy?: LegacyEntry[];
  trash?: TrashEntry[];
}

const EMPTY: HandoverData = { memo: '', credentials: '' };

type TabId = 'write' | 'legacy' | 'trash';

const PresidentHandover: React.FC<PresidentHandoverProps> = ({ onNavigate, currentUserRole, currentPath = '/admin/handover' }) => {
  const [data, setData] = useState<HandoverData>(EMPTY);
  const [initialData, setInitialData] = useState<HandoverData>(EMPTY);
  const [lastSavedMeta, setLastSavedMeta] = useState<{ updatedAt: string; updatedByName: string } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [tab, setTab] = useState<TabId>('write');
  const [legacy, setLegacy] = useState<LegacyEntry[]>([]);
  const [trash, setTrash] = useState<TrashEntry[]>([]);
  const [trashShowCredentials, setTrashShowCredentials] = useState<Record<number, boolean>>({});
  const [legacyShowCredentials, setLegacyShowCredentials] = useState<Record<number, boolean>>({});
  const [confirmPopup, setConfirmPopup] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const isPresident = currentUserRole === 'President';
  const hasChanges = data.memo !== initialData.memo || data.credentials !== initialData.credentials;
  const currentUid = auth.currentUser?.uid ?? '';
  /** Items deleted by current president (visible only to self, read-only) */
  const myTrash = trash
    .map((t, i) => ({ ...t, realIndex: i }))
    .filter((t) => t.authorId === currentUid);
  /** Items deleted by previous president → next president can restore or permanently delete within 30 days */
  const pendingTrash = trash
    .map((t, i) => ({ ...t, realIndex: i }))
    .filter((t) => t.authorId !== currentUid);

  useEffect(() => {
    if (!isPresident) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    getDoc(doc(db, CONFIG_PATH, HANDOVER_DOC))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.exists()) {
          setData(EMPTY);
          setInitialData(EMPTY);
          setLastSavedMeta(null);
          setHistory([]);
          setLegacy([]);
          setTrash([]);
          return;
        }
        const d = snap.data() as HandoverDoc;
        const next: HandoverData = {
          memo: d.memo ?? '',
          credentials: d.credentials ?? '',
        };
        setData(next);
        setInitialData(next);
        if (d.updatedAt || d.updatedByName) {
          setLastSavedMeta({
            updatedAt: d.updatedAt ?? '',
            updatedByName: d.updatedByName ?? '',
          });
        } else {
          setLastSavedMeta(null);
        }
        setHistory(d.history ?? []);
        setLegacy(d.legacy ?? []);
        setTrash(d.trash ?? []);
      })
      .catch((e) => {
        if (!cancelled) console.error('PresidentHandover load error:', e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isPresident]);

  const save = async () => {
    if (!isPresident || saving || !hasChanges) return;
    const user = auth.currentUser;
    const uid = user?.uid ?? '';
    const updatedByName = user?.displayName || user?.email || uid || 'Unknown';

    setSaving(true);
    setSavedMessage(false);
    try {
      const now = new Date().toISOString();
      const hadPreviousContent = initialData.memo || initialData.credentials || lastSavedMeta;
      const previousEntry: HistoryEntry = {
        memo: initialData.memo,
        credentials: initialData.credentials,
        updatedAt: lastSavedMeta?.updatedAt ?? now,
        updatedBy: '',
        updatedByName: lastSavedMeta?.updatedByName ?? 'Previous',
      };
      const newHistory = hadPreviousContent
        ? [previousEntry, ...history].slice(0, HISTORY_MAX)
        : history;

      await setDoc(doc(db, CONFIG_PATH, HANDOVER_DOC), {
        memo: data.memo,
        credentials: data.credentials,
        updatedAt: now,
        updatedBy: uid,
        updatedByName,
        history: newHistory,
        legacy,
        trash: trash.length > 0 ? trash : undefined,
      });
      setInitialData(data);
      setLastSavedMeta({ updatedAt: now, updatedByName });
      setHistory(newHistory);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (e) {
      console.error('Failed to save handover:', e);
    } finally {
      setSaving(false);
    }
  };

  const { safeNavigate, leaveConfirmModal } = useUnsavedChangesGuard({
    currentPath,
    dirty: hasChanges,
    onNavigate,
    onSave: save,
  });

  const restoreVersion = (entry: HistoryEntry) => {
    setData({ memo: entry.memo, credentials: entry.credentials });
    setShowHistory(false);
  };

  const isTrashExpired = (createdAt: string) => {
    const age = Date.now() - new Date(createdAt).getTime();
    return age > TRASH_EXPIRE_DAYS * 24 * 60 * 60 * 1000;
  };

  /** Default: pass content to next president → add to legacy directly */
  const handoverToNext = async () => {
    if (!isPresident || saving) return;
    const user = auth.currentUser;
    const uid = user?.uid ?? '';
    const authorName = user?.displayName || user?.email || uid || 'Unknown';
    const now = new Date().toISOString();
    const entry: LegacyEntry = {
      authorName,
      authorId: uid,
      createdAt: now,
      memo: data.memo,
      credentials: data.credentials,
    };
    const newLegacy = [entry, ...legacy];

    setSaving(true);
    try {
      await setDoc(doc(db, CONFIG_PATH, HANDOVER_DOC), {
        memo: '',
        credentials: '',
        updatedAt: now,
        updatedBy: uid,
        updatedByName: authorName,
        history: [],
        legacy: newLegacy,
        trash: trash.length > 0 ? trash : undefined,
      });
      setData(EMPTY);
      setInitialData(EMPTY);
      setLastSavedMeta(null);
      setHistory([]);
      setLegacy(newLegacy);
    } catch (e) {
      console.error('Failed to hand over:', e);
    } finally {
      setSaving(false);
    }
  };

  /** Next president: restore one trash item to legacy */
  const restoreTrashToLegacy = async (trashIndex: number) => {
    if (!isPresident || saving || trashIndex < 0 || trashIndex >= trash.length) return;
    const t = trash[trashIndex];
    const entry: LegacyEntry = {
      authorName: t.authorName,
      authorId: t.authorId,
      createdAt: t.createdAt,
      memo: t.memo,
      credentials: t.credentials,
    };
    const newLegacy = [entry, ...legacy];
    const newTrash = trash.filter((_, i) => i !== trashIndex);
    setSaving(true);
    try {
      await setDoc(doc(db, CONFIG_PATH, HANDOVER_DOC), {
        memo: data.memo,
        credentials: data.credentials,
        updatedAt: lastSavedMeta?.updatedAt ?? new Date().toISOString(),
        updatedBy: '',
        updatedByName: lastSavedMeta?.updatedByName ?? '',
        history,
        legacy: newLegacy,
        trash: newTrash.length > 0 ? newTrash : undefined,
      });
      setLegacy(newLegacy);
      setTrash(newTrash);
    } catch (e) {
      console.error('Failed to restore trash:', e);
    } finally {
      setSaving(false);
    }
  };

  /** Next president: permanently delete one trash item */
  const permanentlyDeleteTrash = async (trashIndex: number) => {
    if (!isPresident || saving || trashIndex < 0 || trashIndex >= trash.length) return;
    const newTrash = trash.filter((_, i) => i !== trashIndex);
    setSaving(true);
    try {
      await setDoc(doc(db, CONFIG_PATH, HANDOVER_DOC), {
        memo: data.memo,
        credentials: data.credentials,
        updatedAt: lastSavedMeta?.updatedAt ?? new Date().toISOString(),
        updatedBy: '',
        updatedByName: lastSavedMeta?.updatedByName ?? '',
        history,
        legacy,
        trash: newTrash.length > 0 ? newTrash : undefined,
      });
      setTrash(newTrash);
    } catch (e) {
      console.error('Failed to delete trash:', e);
    } finally {
      setSaving(false);
    }
  };

  const toggleLegacyCredentials = (index: number) => {
    setLegacyShowCredentials((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  /** "Clear" current content → move to trash (not deleted yet). Next president decides restore or permanent delete within 30 days */
  const clearCurrentContent = async () => {
    if (!isPresident || saving) return;
    const user = auth.currentUser;
    const uid = user?.uid ?? '';
    const authorName = user?.displayName || user?.email || uid || 'Unknown';
    const now = new Date().toISOString();
    const trashEntry: TrashEntry = {
      authorName,
      authorId: uid,
      createdAt: now,
      memo: data.memo,
      credentials: data.credentials,
    };
    const newTrash = [trashEntry, ...trash];
    setSaving(true);
    try {
      await setDoc(doc(db, CONFIG_PATH, HANDOVER_DOC), {
        memo: '',
        credentials: '',
        updatedAt: now,
        updatedBy: uid,
        updatedByName: authorName,
        history,
        legacy,
        trash: newTrash,
      });
      setData(EMPTY);
      setInitialData(EMPTY);
      setLastSavedMeta({ updatedAt: now, updatedByName });
      setTrash(newTrash);
    } catch (e) {
      console.error('Failed to move to trash:', e);
    } finally {
      setSaving(false);
    }
  };

  /** "Delete" legacy entry → move to trash (not deleted yet). Next president decides restore or permanent delete within 30 days */
  const deleteLegacyEntry = async (index: number) => {
    if (!isPresident || saving) return;
    const removed = legacy[index];
    const trashEntry: TrashEntry = {
      authorName: removed.authorName,
      authorId: removed.authorId,
      createdAt: removed.createdAt,
      memo: removed.memo,
      credentials: removed.credentials,
    };
    const newLegacy = legacy.filter((_, i) => i !== index);
    const newTrash = [trashEntry, ...trash];
    setSaving(true);
    try {
      await setDoc(doc(db, CONFIG_PATH, HANDOVER_DOC), {
        memo: data.memo,
        credentials: data.credentials,
        updatedAt: lastSavedMeta?.updatedAt ?? new Date().toISOString(),
        updatedBy: '',
        updatedByName: lastSavedMeta?.updatedByName ?? '',
        history,
        legacy: newLegacy,
        trash: newTrash,
      });
      setLegacy(newLegacy);
      setTrash(newTrash);
      setLegacyShowCredentials({});
    } catch (e) {
      console.error('Failed to move legacy to trash:', e);
    } finally {
      setSaving(false);
    }
  };

  if (!isPresident) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 overflow-x-auto">
        <div className="max-w-7xl mx-auto min-w-0">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">President Handover</h1>
            <button
              type="button"
              onClick={() => safeNavigate('/admin')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 sm:px-4 rounded text-sm sm:text-base shrink-0"
            >
              ← Back to Dashboard
            </button>
          </div>
          <p className="text-gray-600">Only the President can access the handover notes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 overflow-x-auto">
      <div className="max-w-4xl mx-auto min-w-0">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">President Handover</h1>
          <button
            type="button"
            onClick={() => safeNavigate('/admin')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 sm:px-4 rounded text-sm sm:text-base shrink-0"
          >
            ← Back to Dashboard
          </button>
        </div>
        {leaveConfirmModal}
        <p className="text-gray-600 text-sm mb-2">
          Leave memos and shared account info (e.g. club email, passwords) for the next President. Only the President can view and edit this.
        </p>

        <div className="flex border-b border-gray-200 mb-6">
          <button
            type="button"
            onClick={() => setTab('write')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === 'write'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Write / Edit
          </button>
          <button
            type="button"
            onClick={() => setTab('legacy')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === 'legacy'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            From past presidents
            {legacy.length > 0 && (
              <span className="ml-1.5 text-gray-400">({legacy.length})</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab('trash')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === 'trash'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Trash
            {trash.length > 0 && (
              <span className="ml-1.5 text-gray-400">({trash.length})</span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="text-gray-500">Loading...</div>
        ) : tab === 'trash' ? (
          <div className="space-y-6">
            <p className="text-gray-500 text-sm">
              Items deleted by you or a previous president. The next president can restore or permanently delete within 30 days.
            </p>

            {myTrash.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800">Items I deleted</h3>
                <p className="text-gray-600 text-sm">
                  The items below were sent to trash. The next president can restore or permanently delete them within 30 days.
                </p>
                {myTrash.map((t) => (
                  <div key={t.realIndex} className="bg-amber-50 border border-amber-200 rounded-lg p-4 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="font-semibold text-gray-800">{t.authorName}</span>
                      <span className="text-gray-500 text-sm">
                        {t.createdAt ? new Date(t.createdAt).toLocaleString() : ''}
                        {isTrashExpired(t.createdAt) && (
                          <span className="text-red-600 ml-1">(Expired)</span>
                        )}
                      </span>
                    </div>
                    {t.memo ? (
                      <div className="mb-3 whitespace-pre-wrap text-gray-700 text-sm">{t.memo}</div>
                    ) : null}
                    {t.credentials ? (
                      <div className="mb-2">
                        <button
                          type="button"
                          onClick={() => setTrashShowCredentials((prev) => ({ ...prev, [t.realIndex]: !prev[t.realIndex] }))}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          {trashShowCredentials[t.realIndex] ? 'Hide' : 'Show'} shared accounts
                        </button>
                        {trashShowCredentials[t.realIndex] && (
                          <pre className="mt-1 p-3 bg-white rounded font-mono text-xs text-gray-800 whitespace-pre-wrap break-all border border-amber-200">
                            {t.credentials}
                          </pre>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            {pendingTrash.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800">Items deleted by previous president (restore or permanently delete within 30 days)</h3>
                {pendingTrash.map((t) => (
                  <div key={t.realIndex} className="bg-amber-50 border border-amber-200 rounded-lg p-4 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="font-semibold text-gray-800">{t.authorName}</span>
                      <span className="text-gray-500 text-sm">
                        {t.createdAt ? new Date(t.createdAt).toLocaleString() : ''}
                        {isTrashExpired(t.createdAt) && (
                          <span className="text-red-600 ml-1">(Expired)</span>
                        )}
                      </span>
                    </div>
                    {!isTrashExpired(t.createdAt) ? (
                      <>
                        {t.memo ? (
                          <div className="mb-3 whitespace-pre-wrap text-gray-700 text-sm">{t.memo}</div>
                        ) : null}
                        {t.credentials ? (
                          <div className="mb-3">
                            <button
                              type="button"
                              onClick={() => setTrashShowCredentials((prev) => ({ ...prev, [t.realIndex]: !prev[t.realIndex] }))}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              {trashShowCredentials[t.realIndex] ? 'Hide' : 'Show'} shared accounts
                            </button>
                            {trashShowCredentials[t.realIndex] && (
                              <pre className="mt-1 p-3 bg-white rounded font-mono text-xs text-gray-800 whitespace-pre-wrap break-all border border-amber-200">
                                {t.credentials}
                              </pre>
                            )}
                          </div>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => restoreTrashToLegacy(t.realIndex)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium text-sm disabled:opacity-50"
                          >
                            Restore (keep in legacy)
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => setConfirmPopup({
                              message: 'Permanently delete this item? It cannot be recovered.',
                              onConfirm: () => { setConfirmPopup(null); permanentlyDeleteTrash(t.realIndex); },
                            })}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium text-sm disabled:opacity-50"
                          >
                            Permanently delete
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-gray-600 text-sm">Not restored within 30 days.</span>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => setConfirmPopup({
                            message: 'Clear this expired item?',
                            onConfirm: () => { setConfirmPopup(null); permanentlyDeleteTrash(t.realIndex); },
                          })}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                        >
                          Clear expired
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {trash.length === 0 && (
              <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center text-gray-500">
                No items in trash.
              </div>
            )}
          </div>
        ) : tab === 'legacy' ? (
          <div className="space-y-6">
            <p className="text-gray-500 text-sm">
              Messages and info left by past presidents. Scroll to read.
            </p>
            {legacy.length === 0 ? (
              <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center text-gray-500">
                No entries yet. Use &quot;Hand over to next president&quot; in Write / Edit to leave a message for the next President.
              </div>
            ) : (
              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                {legacy.map((entry, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-gray-100">
                      <span className="font-semibold text-gray-800">{entry.authorName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm">
                          {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ''}
                        </span>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => setConfirmPopup({
                            message: 'This will move the item to trash. The next president can restore or permanently delete it within 30 days. Continue?',
                            onConfirm: () => { setConfirmPopup(null); deleteLegacyEntry(index); },
                          })}
                          className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {entry.memo ? (
                      <div className="mb-4 whitespace-pre-wrap text-gray-700 text-sm">{entry.memo}</div>
                    ) : null}
                    {entry.credentials ? (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => toggleLegacyCredentials(index)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          {legacyShowCredentials[index] ? 'Hide' : 'Show'} shared accounts
                        </button>
                        {legacyShowCredentials[index] && (
                          <pre className="mt-1 p-3 bg-gray-50 rounded font-mono text-xs text-gray-800 whitespace-pre-wrap break-all">
                            {entry.credentials}
                          </pre>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Memo</label>
              <RichTextEditor
                value={data.memo}
                onChange={(v) => setData((prev) => ({ ...prev, memo: v }))}
                minHeight="180px"
                placeholder="Work summary, ongoing tasks, notes for the next president..."
              />
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700">Shared accounts (email / passwords)</label>
                <button
                  type="button"
                  onClick={() => setShowCredentials((v) => !v)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {showCredentials ? 'Hide' : 'Show'}
                </button>
              </div>
              {showCredentials ? (
                <textarea
                  value={data.credentials}
                  onChange={(e) => setData((prev) => ({ ...prev, credentials: e.target.value }))}
                  rows={6}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800 resize-y font-mono"
                  placeholder="e.g. club@example.com / password123"
                  autoComplete="off"
                />
              ) : (
                <div
                  className="w-full border border-gray-300 rounded px-3 py-2 min-h-[120px] bg-gray-50 text-gray-500 font-mono flex items-center justify-center cursor-pointer"
                  onClick={() => setShowCredentials(true)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setShowCredentials(true)}
                >
                  Click Show to view or edit
                </div>
              )}
              <p className="text-gray-500 text-xs mt-2">
                This is stored in Firebase and only accessible by the President. Use for shared club accounts only.
              </p>
            </div>

            {lastSavedMeta && (
              <p className="text-gray-500 text-sm">
                Last saved by <span className="font-medium">{lastSavedMeta.updatedByName}</span>
                {lastSavedMeta.updatedAt && (
                  <> at {new Date(lastSavedMeta.updatedAt).toLocaleString()}</>
                )}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={saving || !hasChanges}
                onClick={save}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                disabled={saving || (!data.memo && !data.credentials)}
                onClick={() => setConfirmPopup({
                  message: 'This will move the item to trash. The next president can restore or permanently delete it within 30 days. Continue?',
                  onConfirm: () => { setConfirmPopup(null); clearCurrentContent(); },
                })}
                className="bg-gray-500 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium"
              >
                Clear current content
              </button>
              {savedMessage && <span className="text-green-600 font-medium">Saved.</span>}
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className="text-gray-600 hover:text-gray-800 text-sm"
              >
                {showHistory ? 'Hide version history' : 'Version history'}
              </button>
            </div>

            {showHistory && history.length > 0 && (
              <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 mb-2">Past versions (restore to use as current)</h3>
                <ul className="space-y-2">
                  {history.map((entry, i) => (
                    <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-sm border-b border-gray-100 pb-2 last:border-0">
                      <span className="text-gray-600">
                        {entry.updatedByName} · {entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => restoreVersion(entry)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Restore
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <p className="text-gray-500 text-sm mb-2">
                Pass this content to the next president. It will be added to &quot;From past presidents&quot; so they can read it there.
              </p>
              <button
                type="button"
                disabled={saving || (!data.memo && !data.credentials)}
                onClick={handoverToNext}
                className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium"
              >
                Hand over to next president
              </button>
            </div>
          </div>
        )}

        {confirmPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setConfirmPopup(null)}>
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
              <p className="text-red-600 font-medium">{confirmPopup.message}</p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmPopup(null)}
                  className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => confirmPopup.onConfirm()}
                  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PresidentHandover;
