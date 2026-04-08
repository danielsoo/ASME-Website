import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../src/firebase/config';
import { Lock, Unlock } from 'lucide-react';
import { pruneAdminAccessToExecPositions } from '../../src/firebase/execPositionSync';

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

    return () => {
      unsubPositions();
      unsubAccess();
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

  // President always has access, so exclude from the toggle list. Use id for key so duplicate role names (e.g. two "Design Team Director") don't cause React key warnings.
  const entries: { id: string; name: string }[] = [
    { id: 'admin', name: 'admin' },
    ...positions.filter((p) => p.name !== 'President').map((p) => ({ id: p.id, name: p.name })),
  ];

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
      </div>
    </div>
  );
};

export default AdminAccess;
