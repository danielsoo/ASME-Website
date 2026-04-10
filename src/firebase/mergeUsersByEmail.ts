import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './config';

/**
 * Admin "Add Member" uses addDoc → random Firestore id, but the real account is users/{auth.uid}.
 * Same email can therefore exist on two documents. Merge club/admin fields from duplicates into the
 * canonical Auth uid document and remove the extra rows so About + admin checks see one profile.
 */
export async function mergeDuplicateFirestoreUsersByEmail(
  canonicalUid: string,
  email: string | null | undefined
): Promise<void> {
  const normalized = (email ?? '').trim().toLowerCase();
  if (!normalized) return;

  const q = query(collection(db, 'users'), where('email', '==', normalized));
  const snap = await getDocs(q);
  if (snap.size <= 1) return;

  const canonicalRef = doc(db, 'users', canonicalUid);
  const canonicalSnap = await getDoc(canonicalRef);
  if (!canonicalSnap.exists()) return;

  const duplicates = snap.docs.filter((d) => d.id !== canonicalUid);
  if (duplicates.length === 0) return;

  const patch: Record<string, unknown> = {};

  for (const d of duplicates) {
    const o = d.data();
    const role = o.role;
    if (typeof role === 'string' && role.trim() !== '' && role !== 'member') {
      patch.role = role;
    }
    if (o.team !== undefined && o.team !== null && String(o.team).trim() !== '') {
      patch.team = o.team;
    }
    if (o.onExecutiveBoard === true) {
      patch.onExecutiveBoard = true;
    }
    if (typeof o.execOrder === 'number') {
      patch.execOrder = o.execOrder;
    }
    if (typeof o.designOrder === 'number') {
      patch.designOrder = o.designOrder;
    }
    if (o.isManualAdd === true) {
      patch.isManualAdd = true;
    }
    if (o.status === 'approved') {
      patch.status = 'approved';
    }
  }

  const cur = canonicalSnap.data();
  if (cur?.status === 'approved') {
    patch.status = 'approved';
  }

  if (Object.keys(patch).length > 0) {
    await updateDoc(canonicalRef, patch);
  }

  for (const d of duplicates) {
    try {
      await deleteDoc(doc(db, 'users', d.id));
    } catch {
      try {
        await updateDoc(doc(db, 'users', d.id), {
          onExecutiveBoard: false,
          mergedIntoUid: canonicalUid,
        });
      } catch (e2) {
        console.error(
          'mergeDuplicateFirestoreUsersByEmail: could not remove duplicate user doc',
          d.id,
          e2
        );
      }
    }
  }
}
