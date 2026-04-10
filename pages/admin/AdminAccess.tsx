import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../src/firebase/config';
import { Lock, Unlock, ChevronDown, ChevronRight } from 'lucide-react';
import { pruneAdminAccessToExecPositions } from '../../src/firebase/execPositionSync';
import {
  CONFIG_COLLECTION,
  EXEC_PERMISSIONS_DOC,
  EXEC_PERMISSION_KEYS,
  EXEC_PERMISSION_LABELS_KO,
  getEffectiveExecPermissions,
  saveFullExecPermissionsByRole,
  type ExecPermissionsByRole,
} from '../../src/firebase/execPermissions';

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
  const [execByRole, setExecByRole] = useState<ExecPermissionsByRole>({});
  const [expandedDetailRole, setExpandedDetailRole] = useState<string | null>(null);
  const [savingPerm, setSavingPerm] = useState<string | null>(null);

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
        setExecByRole(br && typeof br === 'object' ? br : {});
      },
      (e) => {
        console.error('AdminAccess execPermissions subscription:', e);
        setExecByRole({});
      }
    );

    return () => {
      unsubPositions();
      unsubAccess();
      unsubExecPerm();
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

  const toggleExecPermission = async (roleName: string, key: (typeof EXEC_PERMISSION_KEYS)[number]) => {
    if (!isPresident || savingPerm) return;
    const effective = getEffectiveExecPermissions(roleName, { byRole: execByRole });
    const nextVal = !effective[key];
    const row = { ...(execByRole[roleName] || {}), [key]: nextVal };
    const nextByRole = { ...execByRole, [roleName]: row };
    setSavingPerm(`${roleName}:${key}`);
    try {
      await saveFullExecPermissionsByRole(nextByRole);
      setExecByRole(nextByRole);
    } catch (e) {
      console.error('Failed to update exec permission:', e);
    } finally {
      setSavingPerm(null);
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

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mt-6 sm:mt-8">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">직책별 영역 권한</h2>
          <p className="text-gray-600 text-sm sm:text-base mb-4">
            어드민 패널에 들어올 수 있는 직책(위에서 허용된 역할)마다, 아래 네 가지 <strong>영역</strong>을 켜거나 끌 수
            있습니다. 각 영역이 켜져 있으면 해당 주제의 <strong>생성·수정·삭제·승인·휴지통</strong> 등 관련 동작이
            모두 허용됩니다(세부 항목으로 나누지 않습니다). 예: 스폰서를 허용하면 스폰서 목록·휴지통·완전삭제까지
            동일하게 적용됩니다. <strong>회장(President)</strong>과 <strong>admin</strong>은 항상 네 영역 모두
            허용입니다. 저장한 적 없는 직책은 기본값 <strong>전부 허용</strong>입니다.
          </p>
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            보안 참고: 브라우저 UI만 바뀌는 것이 아니라, 실제 데이터 변경을 막으려면 Firebase 보안 규칙도 함께 조정하는 것이
            좋습니다.
          </p>

          <div className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50 mb-4">
            <span className="font-semibold text-gray-800">President (회장)</span>
            <p className="text-sm text-gray-600 mt-1">네 영역 모두 항상 허용됩니다. (변경 불가)</p>
          </div>

          {loading ? (
            <div className="text-gray-500">Loading…</div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => {
                const open = expandedDetailRole === entry.name;
                const effective = getEffectiveExecPermissions(entry.name, { byRole: execByRole });
                return (
                  <div key={`detail-${entry.id}`} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => setExpandedDetailRole(open ? null : entry.name)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-3 sm:px-4 text-left hover:bg-gray-50"
                    >
                      <span className="font-semibold text-gray-800 break-words">{entry.name}</span>
                      <span className="flex items-center gap-2 shrink-0 text-sm text-gray-500">
                        {open ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </span>
                    </button>
                    {open && (
                      <div className="px-3 pb-3 sm:px-4 sm:pb-4 border-t border-gray-100 pt-3 space-y-2">
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
                                disabled={savingPerm !== null}
                                onChange={() => void toggleExecPermission(entry.name, key)}
                                className="mt-1 rounded border-gray-300"
                              />
                              <span className="text-sm text-gray-800 leading-snug">{EXEC_PERMISSION_LABELS_KO[key]}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
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
