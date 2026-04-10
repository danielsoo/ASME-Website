import { doc, setDoc } from 'firebase/firestore';
import { db } from './config';

export const EXEC_PERMISSIONS_DOC = 'execPermissions';
export const CONFIG_COLLECTION = 'config';

/**
 * Coarse admin areas (President configures per role). Each flag allows that area’s
 * create / update / delete flows (승인·거절·휴지통·완전삭제 등 포함).
 */
export const EXEC_PERMISSION_KEYS = ['users', 'members', 'projects', 'sponsors'] as const;

export type ExecPermissionKey = (typeof EXEC_PERMISSION_KEYS)[number];

export type ExecPermissionMap = Record<ExecPermissionKey, boolean>;

export type ExecPermissionsByRole = Record<string, Partial<Record<ExecPermissionKey, boolean>>>;

export interface ExecPermissionsDocument {
  byRole?: ExecPermissionsByRole;
}

export const EXEC_PERMISSION_LABELS_KO: Record<ExecPermissionKey, string> = {
  users: '가입·사용자 (승인·거절·복원·삭제 등 전체)',
  members: '멤버 관리 (직책·팀·멤버 추가·수정 등 전체)',
  projects: '프로젝트 (생성·수정·승인·휴지통·완전삭제 등 전체)',
  sponsors: '스폰서 (추가·수정·휴지통·완전삭제 등 전체)',
};

/** English labels for admin UI (area-level permissions). */
export const EXEC_PERMISSION_LABELS_EN: Record<ExecPermissionKey, string> = {
  users: 'Users & signup (approve, reject, restore, delete — full access)',
  members: 'Members (roles, teams, manual adds, edits — full access)',
  projects: 'Projects (create, edit, approve, trash, permanent delete — full access)',
  sponsors: 'Sponsors (add, edit, trash, permanent delete — full access)',
};

function allTrue(): ExecPermissionMap {
  return EXEC_PERMISSION_KEYS.reduce((acc, k) => {
    acc[k] = true;
    return acc;
  }, {} as ExecPermissionMap);
}

const ALL_TRUE = allTrue();

/** Map pre-v2 granular keys → coarse flags (best-effort for existing Firestore data). */
function legacyRowToCoarse(row: Record<string, unknown>): Partial<ExecPermissionMap> {
  const out: Partial<ExecPermissionMap> = {};

  const everyTrueOrMissing = (keys: string[]): boolean | undefined => {
    const present = keys.filter((k) => typeof row[k] === 'boolean');
    if (present.length === 0) return undefined;
    return present.every((k) => row[k] !== false);
  };

  const u = everyTrueOrMissing(['usersApprove', 'usersReject', 'usersRestore', 'usersDelete']);
  if (u !== undefined) out.users = u;

  if (typeof row.membersManage === 'boolean') out.members = row.membersManage;

  const p = everyTrueOrMissing([
    'projectsFullManage',
    'projectsApprovePending',
    'projectsSoftDelete',
    'projectsEdit',
    'projectTrashExec',
    'projectPermanentDeleteVote',
  ]);
  if (p !== undefined) out.projects = p;

  const s = everyTrueOrMissing([
    'sponsorsManage',
    'sponsorsSoftDelete',
    'sponsorTrashExec',
    'sponsorPermanentDeleteVote',
  ]);
  if (s !== undefined) out.sponsors = s;

  return out;
}

export function getEffectiveExecPermissions(
  role: string,
  raw: ExecPermissionsDocument | null | undefined
): ExecPermissionMap {
  if (role === 'President' || role === 'admin') {
    return { ...ALL_TRUE };
  }
  const base = allTrue();
  const rowRaw = raw?.byRole?.[role];
  const row =
    rowRaw && typeof rowRaw === 'object' ? (rowRaw as Record<string, unknown>) : null;
  const legacy = row ? legacyRowToCoarse(row) : {};

  for (const k of EXEC_PERMISSION_KEYS) {
    if (row && typeof row[k] === 'boolean') {
      base[k] = row[k] as boolean;
    } else if (typeof legacy[k] === 'boolean') {
      base[k] = legacy[k] as boolean;
    }
  }
  return base;
}

export async function saveFullExecPermissionsByRole(byRole: ExecPermissionsByRole): Promise<void> {
  await setDoc(doc(db, CONFIG_COLLECTION, EXEC_PERMISSIONS_DOC), { byRole }, { merge: true });
}
