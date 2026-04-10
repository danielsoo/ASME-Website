import React, { useState, useEffect, useRef } from 'react';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../src/firebase/config';
import { Lock, Unlock, ChevronDown, ChevronRight } from 'lucide-react';
import { pruneAdminAccessToExecPositions } from '../../src/firebase/execPositionSync';
import {
  CONFIG_COLLECTION,
  EXEC_PERMISSIONS_DOC,
  EXEC_PERMISSION_KEYS,
  EXEC_PERMISSION_LABELS_EN,
  getEffectiveExecPermissions,
  saveFullExecPermissionsByRole,
  type ExecPermissionKey,
  type ExecPermissionsByRole,
} from '../../src/firebase/execPermissions';

interface RoleHolder {
  name: string;
  email: string;
}

const DEFAULT_ALLOWED_ROLES = ['President', 'Vice President'];
const CONFIG_PATH = 'config';
const ADMIN_ACCESS_DOC = 'adminAccess';

interface AdminAccessProps {
  onNavigate: (path: string) => void;
  currentUserRole: string;
}

interface ExecPosition {
  id: string;
  name: string;
  team?: string;
}

const AdminAccess: React.FC<AdminAccessProps> = ({ onNavigate, currentUserRole }) => {
  const [positions, setPositions] = useState<ExecPosition[]>([]);
  const [allowedRoles, setAllowedRoles] = useState<string[]>(DEFAULT_ALLOWED_ROLES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [localByRole, setLocalByRole] = useState<ExecPermissionsByRole>({});
  const [permDirty, setPermDirty] = useState(false);
  const permDirtyRef = useRef(false);
  const [expandedDetailId, setExpandedDetailId] = useState<string | null>(null);
  const [savingPermissions, setSavingPermissions] = useState(false);
  /** After first successful execPermissions snapshot — avoids saving before full byRole is loaded. */
  const [execPermLoaded, setExecPermLoaded] = useState(false);
  /** Approved users grouped by `users.role` (matches Executive Board position names). */
  const [holdersByRole, setHoldersByRole] = useState<Record<string, RoleHolder[]>>({});

  const isPresident = currentUserRole === 'President';

  useEffect(() => {
    if (!isPresident) return;

    setLoading(true);

    const unsubPositions = onSnapshot(
      collection(db, 'execPositions'),
      (snapshot) => {
        const positionsList: ExecPosition[] = [];
        snapshot.forEach((d) => {
          positionsList.push({ id: d.id, ...d.data() } as ExecPosition);
        });
        positionsList.sort((a, b) => a.name.localeCompare(b.name));
        setPositions(positionsList);
        setLoading(false);
        pruneAdminAccessToExecPositions(positionsList.map((p) => p.name)).catch((e) =>
          console.error('pruneAdminAccessToExecPositions:', e)
        );
      },
      (e) => {
        console.error('AdminAccess execPositions subscription:', e);
        setLoading(false);
      }
    );

    const unsubAccess = onSnapshot(
      doc(db, CONFIG_PATH, ADMIN_ACCESS_DOC),
      (snap) => {
        const roles = snap.exists()
          ? (snap.data()?.allowedRoles || DEFAULT_ALLOWED_ROLES)
          : DEFAULT_ALLOWED_ROLES;
        setAllowedRoles(Array.isArray(roles) ? roles : DEFAULT_ALLOWED_ROLES);
        setLoading(false);
      },
      (e) => {
        console.error('AdminAccess config subscription:', e);
        setAllowedRoles(DEFAULT_ALLOWED_ROLES);
        setLoading(false);
      }
    );

    const unsubExecPerm = onSnapshot(
      doc(db, CONFIG_COLLECTION, EXEC_PERMISSIONS_DOC),
      (snap) => {
        const br = snap.exists() ? (snap.data()?.byRole as ExecPermissionsByRole | undefined) : undefined;
        const next = br && typeof br === 'object' ? br : {};
        if (!permDirtyRef.current) {
          setLocalByRole(next);
        }
        setExecPermLoaded(true);
      },
      (e) => {
        console.error('AdminAccess execPermissions subscription:', e);
        if (!permDirtyRef.current) {
          setLocalByRole({});
        }
        setExecPermLoaded(true);
      }
    );

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const map: Record<string, RoleHolder[]> = {};
        snapshot.forEach((d) => {
          const data = d.data();
          if (data.status !== 'approved') return;
          const role = String(data.role ?? '').trim();
          if (!role) return;
          const nameRaw = String(data.name ?? '').trim();
          const email = String(data.email ?? '').trim();
          const displayName = nameRaw || email || d.id;
          if (!map[role]) map[role] = [];
          map[role].push({ name: displayName, email });
        });
        for (const k of Object.keys(map)) {
          map[k].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        }
        setHoldersByRole(map);
      },
      (e) => {
        console.error('AdminAccess users subscription:', e);
      }
    );

    return () => {
      unsubPositions();
      unsubAccess();
      unsubExecPerm();
      unsubUsers();
    };
  }, [isPresident]);

  const toggleRole = async (positionName: string) => {
    if (!isPresident || saving) return;
    const next = allowedRoles.includes(positionName)
      ? allowedRoles.filter((r) => r !== positionName)
      : [...allowedRoles, positionName];
    setSaving(positionName);
    try {
      await setDoc(doc(db, CONFIG_PATH, ADMIN_ACCESS_DOC), { allowedRoles: next });
      setAllowedRoles(next);
    } catch (e) {
      console.error('Failed to update admin access:', e);
    } finally {
      setSaving(null);
    }
  };

  const toggleExecPermission = (roleName: string, key: (typeof EXEC_PERMISSION_KEYS)[number]) => {
    if (!isPresident || savingPermissions || !execPermLoaded) return;
    const effective = getEffectiveExecPermissions(roleName, { byRole: localByRole });
    const nextVal = !effective[key];
    const row = { ...(localByRole[roleName] || {}), [key]: nextVal };
    setLocalByRole({ ...localByRole, [roleName]: row });
    permDirtyRef.current = true;
    setPermDirty(true);
  };

  /** Set all four areas to allowed (explicit true so merged Firestore data does not keep old denials). */
  const allowAllAreasForRole = (roleName: string) => {
    if (!isPresident || savingPermissions || !execPermLoaded) return;
    const row = EXEC_PERMISSION_KEYS.reduce(
      (acc, k) => {
        acc[k] = true;
        return acc;
      },
      {} as Record<ExecPermissionKey, boolean>
    );
    setLocalByRole({ ...localByRole, [roleName]: row });
    permDirtyRef.current = true;
    setPermDirty(true);
  };

  const denyAllAreasForRole = (roleName: string) => {
    if (!isPresident || savingPermissions || !execPermLoaded) return;
    const row = EXEC_PERMISSION_KEYS.reduce(
      (acc, k) => {
        acc[k] = false;
        return acc;
      },
      {} as Record<ExecPermissionKey, boolean>
    );
    setLocalByRole({ ...localByRole, [roleName]: row });
    permDirtyRef.current = true;
    setPermDirty(true);
  };

  const confirmExecPermissions = async () => {
    if (!isPresident || savingPermissions || !permDirty || !execPermLoaded) return;
    setSavingPermissions(true);
    try {
      await saveFullExecPermissionsByRole(localByRole);
      permDirtyRef.current = false;
      setPermDirty(false);
    } catch (e) {
      console.error('Failed to save exec permissions:', e);
    } finally {
      setSavingPermissions(false);
    }
  };

  if (!isPresident) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 overflow-x-auto">
        <div className="max-w-7xl mx-auto min-w-0">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Admin Access</h1>
            <button
              type="button"
              onClick={() => onNavigate('/admin')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 sm:px-4 rounded text-sm sm:text-base shrink-0"
            >
              ← Back to Dashboard
            </button>
          </div>
          <p className="text-gray-600">Only the President can manage admin access.</p>
        </div>
      </div>
    );
  }

  // Same documents as Member Management → Executive Board Positions (execPositions). Use id for key when names duplicate.
  const entries: { id: string; name: string }[] = positions.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 overflow-x-auto">
      <div className="max-w-7xl mx-auto min-w-0">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Admin Access</h1>
          <button
            type="button"
            onClick={() => onNavigate('/admin')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 sm:px-4 rounded text-sm sm:text-base shrink-0"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-6">
            Enable or disable admin panel access for each Executive Board position. Only enabled roles can open the admin panel.
            Position names come from <strong>Member Management → Executive Board Positions</strong> (same <code className="text-xs bg-gray-100 px-1 rounded">execPositions</code> collection).
            When you add, rename, or remove a position there, this list and the header admin link update automatically.
          </p>

          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {entries.map((entry) => {
                const enabled = allowedRoles.includes(entry.name);
                const isSaving = saving === entry.name;
                return (
                  <div
                    key={entry.id}
                    className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-wrap justify-between items-center gap-2 min-w-0 bg-gray-50"
                  >
                    <span className="font-semibold text-gray-800 text-sm sm:text-base break-words">{entry.name}</span>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => toggleRole(entry.name)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium text-sm transition shrink-0 ${
                        enabled
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      } ${isSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
                      title={enabled ? 'Revoke access' : 'Grant access'}
                    >
                      {enabled ? (
                        <>
                          <Unlock className="w-4 h-4" />
                          Enabled
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          Disabled
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mt-6 sm:mt-8">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Area permissions by role</h2>
          <p className="text-gray-600 text-sm sm:text-base mb-4">
            For each role that can open the admin panel (enabled above), you can turn four <strong>areas</strong> on or
            off. When an area is on, all related actions are allowed for that topic—<strong>create, edit, delete,
            approve, trash,</strong> and similar—not split into smaller toggles. For example, enabling{' '}
            <strong>Sponsors</strong> applies to the sponsor list, trash, and permanent delete the same way.{' '}
            <strong>President</strong> and accounts with the <strong>admin</strong> user role always have all four
            areas (not configured here). Roles you have never configured default to <strong>everything allowed</strong>.
          </p>
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            Security note: To enforce this on the server, update Firebase security rules in addition to this UI.
          </p>

          {permDirty && (
            <p className="text-sm text-amber-900 bg-amber-100 border border-amber-300 rounded-lg px-3 py-2 mb-4">
              You have unsaved changes. Click <strong>Confirm</strong> to save them.
            </p>
          )}

          {!execPermLoaded ? (
            <div className="text-gray-500">Loading permissions...</div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => {
                const open = expandedDetailId === entry.id;
                const effective = getEffectiveExecPermissions(entry.name, { byRole: localByRole });
                const holders = holdersByRole[entry.name] ?? [];
                return (
                  <div key={`detail-${entry.id}`} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => setExpandedDetailId(open ? null : entry.id)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-3 sm:px-4 text-left hover:bg-gray-50"
                    >
                      <span className="font-semibold text-gray-800 break-words">{entry.name}</span>
                      <span className="flex items-center gap-2 shrink-0 text-sm text-gray-500">
                        {open ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </span>
                    </button>
                    {open && (
                      <div className="border-t border-gray-100">
                        <div className="px-3 sm:px-4 pt-3 pb-3 bg-gray-50/90">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                            Members with this role
                          </p>
                          {holders.length === 0 ? (
                            <p className="text-sm text-gray-500">
                              No approved members are assigned this role in Member Management.
                            </p>
                          ) : (
                            <ul className="text-sm text-gray-800 space-y-1">
                              {holders.map((h, idx) => (
                                <li key={`${entry.id}-${h.email}-${idx}`} className="pl-1">
                                  <span className="font-medium">{h.name}</span>
                                  {h.email && h.name !== h.email ? (
                                    <span className="text-gray-600 font-normal"> — {h.email}</span>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        {entry.name === 'President' ? (
                          <div className="px-3 sm:px-4 py-3 border-t border-gray-100 bg-white">
                            <p className="text-sm text-gray-600">
                              The President role always has all four areas. This cannot be changed here.
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="px-3 sm:px-4 py-2 border-t border-gray-100 flex flex-wrap gap-2 bg-white">
                              <button
                                type="button"
                                disabled={savingPermissions}
                                onClick={() => allowAllAreasForRole(entry.name)}
                                className="text-sm px-3 py-1.5 rounded-md border border-green-200 bg-green-50 text-green-900 hover:bg-green-100 disabled:opacity-50"
                              >
                                Allow all areas
                              </button>
                              <button
                                type="button"
                                disabled={savingPermissions}
                                onClick={() => denyAllAreasForRole(entry.name)}
                                className="text-sm px-3 py-1.5 rounded-md border border-red-200 bg-red-50 text-red-900 hover:bg-red-100 disabled:opacity-50"
                              >
                                Deny all areas
                              </button>
                            </div>
                            <div className="px-3 pb-3 sm:px-4 sm:pb-4 pt-2 space-y-2">
                              {EXEC_PERMISSION_KEYS.map((key) => {
                                const on = effective[key];
                                return (
                                  <label
                                    key={key}
                                    className="flex items-start gap-3 cursor-pointer rounded-md px-2 py-1.5 hover:bg-gray-50"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={on}
                                      disabled={savingPermissions}
                                      onChange={() => toggleExecPermission(entry.name, key)}
                                      className="mt-1 rounded border-gray-300"
                                    />
                                    <span className="text-sm text-gray-800 leading-snug">{EXEC_PERMISSION_LABELS_EN[key]}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3 justify-end border-t border-gray-100 pt-4">
            <button
              type="button"
              disabled={!permDirty || savingPermissions || loading || !execPermLoaded}
              onClick={() => void confirmExecPermissions()}
              className="px-5 py-2.5 rounded-lg font-medium text-sm sm:text-base bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingPermissions ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAccess;
