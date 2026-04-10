import { doc, setDoc } from 'firebase/firestore';
import { db } from './config';

export const EXEC_PERMISSIONS_DOC = 'execPermissions';
export const CONFIG_COLLECTION = 'config';

/**
 * Coarse admin areas (President configures per role). Each flag allows that area’s
 * create / update / delete flows (approve, reject, trash, permanent delete, etc.).
 */
export const EXEC_PERMISSION_KEYS = ['users', 'members', 'projects', 'sponsors'] as const;

export type ExecPermissionKey = (typeof EXEC_PERMISSION_KEYS)[number];

export type ExecPermissionMap = Record<ExecPermissionKey, boolean>;

export type ExecPermissionsByRole = Record<string, Partial<Record<ExecPermissionKey, boolean>>>;

export interface ExecPermissionsDocument {
  byRole?: ExecPermissionsByRole;
}

/** Labels for admin UI (area-level permissions). */
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

function allFalse(): ExecPermissionMap {
  return EXEC_PERMISSION_KEYS.reduce((acc, k) => {
    acc[k] = false;
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

function normalizeRoleKey(role: string): string {
  return role.trim();
}

export function getEffectiveExecPermissions(
  role: string,
  raw: ExecPermissionsDocument | null | undefined
): ExecPermissionMap {
  const r = normalizeRoleKey(role);
  if (r === 'President' || r === 'admin') {
    return { ...ALL_TRUE };
  }
  let rowRaw = raw?.byRole?.[r];
  if (rowRaw === undefined && raw?.byRole) {
    const key = Object.keys(raw.byRole).find((k) => normalizeRoleKey(k) === r);
    if (key !== undefined) rowRaw = raw.byRole[key];
  }
  const row =
    rowRaw && typeof rowRaw === 'object' ? (rowRaw as Record<string, unknown>) : null;

  /**
   * If there is any stored row for this role, missing coarse keys mean "not granted" (false), not default-allow.
   *
   * Important: rows may mix **new** coarse keys (`users`, `members`, `projects`, `sponsors`) with **old**
   * granular fields (`projectsEdit`, `membersManage`, …). If we fill gaps from legacy after some coarse
   * keys exist, **Projects** was the worst offender: `everyTrueOrMissing` over a single leftover
   * `projectsEdit: true` could force `projects: true` while Members/Sponsors looked correctly off from
   * their coarse booleans. Once any coarse key is present, trust only coarse keys + default-deny.
   */
  if (row) {
    const hasAnyCoarseKey = EXEC_PERMISSION_KEYS.some((k) => typeof row[k] === 'boolean');
    const legacy = hasAnyCoarseKey ? {} : legacyRowToCoarse(row);
    const base = allFalse();
    for (const k of EXEC_PERMISSION_KEYS) {
      if (typeof row[k] === 'boolean') {
        base[k] = row[k] as boolean;
      } else if (typeof legacy[k] === 'boolean') {
        base[k] = legacy[k] as boolean;
      }
    }
    return base;
  }

  /**
   * Legacy: before any `byRole` data exists, non-President roles effectively had full admin-area access.
   * Once at least one role row is stored, roles with **no** row must not inherit allow-all — otherwise
   * configuring e.g. one officer's "deny Projects" leaves every other exec position with implicit full access.
   */
  const byRole = raw?.byRole;
  const hasAnyConfiguredRole =
    byRole !== null &&
    byRole !== undefined &&
    typeof byRole === 'object' &&
    Object.keys(byRole).length > 0;
  if (hasAnyConfiguredRole) {
    return allFalse();
  }

  return { ...ALL_TRUE };
}

export async function saveFullExecPermissionsByRole(byRole: ExecPermissionsByRole): Promise<void> {
  await setDoc(doc(db, CONFIG_COLLECTION, EXEC_PERMISSIONS_DOC), { byRole }, { merge: true });
}
