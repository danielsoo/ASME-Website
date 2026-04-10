/**
 * Keeps Firestore in sync when Executive Board position names change:
 * - users.role
 * - config/adminAccess.allowedRoles
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';

const ADMIN_ACCESS_PATH = 'config/adminAccess';

/**
 * Role names that stay in allowedRoles when pruning, even if there is no matching execPositions doc
 * (e.g. President / VP are often implicit). Must match Admin Access + Admin gate defaults — not synthetic
 * positions like the old "admin" row; users with role `admin` get panel access via Admin.tsx / Header.tsx.
 */
const ALWAYS_VALID_ALLOWED_ROLES = new Set(['President', 'Vice President']);

export async function migrateUsersRoleAfterRename(
  oldName: string,
  newName: string
): Promise<number> {
  if (!oldName || !newName || oldName === newName) return 0;
  const q = query(collection(db, 'users'), where('role', '==', oldName));
  const snap = await getDocs(q);
  if (snap.empty) return 0;

  let batch = writeBatch(db);
  let updated = 0;
  for (const d of snap.docs) {
    batch.update(d.ref, { role: newName });
    updated++;
    if (updated % 400 === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }
  if (updated % 400 !== 0) await batch.commit();
  return updated;
}

/** When a position is renamed, mirror the name in admin access toggles. */
export async function syncAdminAccessRoleRename(
  oldName: string,
  newName: string
): Promise<void> {
  if (!oldName || !newName || oldName === newName) return;
  const ref = doc(db, ADMIN_ACCESS_PATH);
  const snap = await getDoc(ref);
  const roles = snap.exists()
    ? ((snap.data()?.allowedRoles as string[]) || [])
    : [];
  const next = roles.map((r) => (r === oldName ? newName : r));
  await setDoc(ref, { allowedRoles: [...new Set(next)] }, { merge: true });
}

export async function removeRoleFromAdminAccess(roleName: string): Promise<void> {
  if (!roleName) return;
  const ref = doc(db, ADMIN_ACCESS_PATH);
  const snap = await getDoc(ref);
  const roles = snap.exists()
    ? ((snap.data()?.allowedRoles as string[]) || [])
    : [];
  const next = roles.filter((r) => r !== roleName);
  await setDoc(ref, { allowedRoles: next }, { merge: true });
}

/**
 * Drops allowedRoles entries that no longer match any exec position name (or system roles).
 * Call after execPositions changes so stale names from deleted/renamed positions are removed.
 */
export async function pruneAdminAccessToExecPositions(
  positionNames: string[]
): Promise<void> {
  const valid = new Set<string>([
    ...ALWAYS_VALID_ALLOWED_ROLES,
    ...positionNames.filter(Boolean),
  ]);
  const ref = doc(db, ADMIN_ACCESS_PATH);
  const snap = await getDoc(ref);
  const roles = snap.exists()
    ? ((snap.data()?.allowedRoles as string[]) || [])
    : [];
  const next = roles.filter((r) => valid.has(r));
  if (next.length === roles.length) return;
  await setDoc(ref, { allowedRoles: next }, { merge: true });
}
