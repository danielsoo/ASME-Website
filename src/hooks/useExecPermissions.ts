import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import {
  CONFIG_COLLECTION,
  EXEC_PERMISSIONS_DOC,
  getEffectiveExecPermissions,
  type ExecPermissionMap,
  type ExecPermissionsDocument,
} from '../firebase/execPermissions';

export function useExecPermissions(): {
  ready: boolean;
  role: string;
  perms: ExecPermissionMap;
} {
  const [role, setRole] = useState('');
  const [permDoc, setPermDoc] = useState<ExecPermissionsDocument | null>(null);

  useEffect(() => {
    let unsubPerm: (() => void) | undefined;
    let alive = true;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubPerm?.();
      if (!alive) return;
      setPermDoc(null);

      if (!user) {
        setRole('');
        setPermDoc({});
        return;
      }

      void (async () => {
        let r = 'member';
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) r = String(snap.data()?.role ?? 'member');
        } catch {
          r = 'member';
        }
        if (!alive) return;
        setRole(r);
        unsubPerm = onSnapshot(
          doc(db, CONFIG_COLLECTION, EXEC_PERMISSIONS_DOC),
          (s) => {
            if (!alive) return;
            setPermDoc(s.exists() ? (s.data() as ExecPermissionsDocument) : {});
          },
          () => {
            if (!alive) return;
            setPermDoc({});
          }
        );
      })();
    });

    return () => {
      alive = false;
      unsubAuth();
      unsubPerm?.();
    };
  }, []);

  const ready = permDoc !== null;
  const perms = useMemo(
    () => getEffectiveExecPermissions(role, permDoc ?? undefined),
    [role, permDoc]
  );

  return { ready, role, perms };
}
