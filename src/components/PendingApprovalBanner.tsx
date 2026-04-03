import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User, Mail } from 'lucide-react';

interface PendingApprovalBannerProps {
  user: { uid: string } | null;
}

/** Banner shown at top when user is logged in but pending admin approval */
const PendingApprovalBanner: React.FC<PendingApprovalBannerProps> = ({ user }) => {
  const [status, setStatus] = useState<'hidden' | 'unverified' | 'pending'>('hidden');

  useEffect(() => {
    if (!user?.uid) {
      setStatus('hidden');
      return;
    }
    let cancelled = false;
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.exists()) { setStatus('hidden'); return; }
        const data = snap.data();
        if (data?.status === 'pending' && !data?.emailVerified) {
          setStatus('unverified');
        } else if (data?.status === 'pending') {
          setStatus('pending');
        } else {
          setStatus('hidden');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('hidden');
      });
    return () => { cancelled = true; };
  }, [user?.uid]);

  if (status === 'hidden') return null;

  if (status === 'unverified') {
    return (
      <div className="bg-yellow-900/40 border-b border-yellow-700 text-yellow-200 px-4 py-2.5 flex items-center justify-center gap-2 text-sm">
        <Mail className="w-4 h-4 flex-shrink-0" />
        <span>
          Verification email sent! Please check your inbox and <strong>spam/junk folder</strong>, then click the link to verify your email.
        </span>
      </div>
    );
  }

  return (
    <div className="bg-red-900/40 border-b border-red-700 text-red-200 px-4 py-2.5 flex items-center justify-center gap-2 text-sm">
      <User className="w-4 h-4 flex-shrink-0" />
      <span>Your email is verified but waiting for admin approval.</span>
    </div>
  );
};

export default PendingApprovalBanner;
