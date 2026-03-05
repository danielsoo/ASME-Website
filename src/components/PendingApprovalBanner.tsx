import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User } from 'lucide-react';

interface PendingApprovalBannerProps {
  user: { uid: string } | null;
}

/** Banner shown at top when user is logged in but pending admin approval */
const PendingApprovalBanner: React.FC<PendingApprovalBannerProps> = ({ user }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setShow(false);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        if (cancelled) return;
        const status = snap.exists() ? snap.data()?.status : null;
        setShow(status === 'pending');
      })
      .catch(() => {
        if (!cancelled) setShow(false);
      });
    return () => { cancelled = true; };
  }, [user?.uid]);

  if (!show) return null;

  return (
    <div className="bg-red-900/40 border-b border-red-700 text-red-200 px-4 py-2.5 flex items-center justify-center gap-2 text-sm">
      <User className="w-4 h-4 flex-shrink-0" />
      <span>Your email is verified but waiting for admin approval.</span>
    </div>
  );
};

export default PendingApprovalBanner;
