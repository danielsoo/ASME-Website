import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User, Mail } from 'lucide-react';

interface PendingApprovalBannerProps {
  user: { uid: string; emailVerified?: boolean } | null;
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
      .then(async (snap) => {
        if (cancelled) return;
        if (!snap.exists()) { setStatus('hidden'); return; }
        const data = snap.data();
        if (data?.status !== 'pending') { setStatus('hidden'); return; }

        // Firebase Auth is the source of truth for email verification
        const authVerified = user.emailVerified === true;
        const firestoreVerified = data?.emailVerified === true;

        if (authVerified && !firestoreVerified) {
          // Sync Firestore to match Firebase Auth
          await updateDoc(doc(db, 'users', user.uid), { emailVerified: true });
        }

        if (authVerified || firestoreVerified) {
          setStatus('pending');
        } else {
          setStatus('unverified');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('hidden');
      });
    return () => { cancelled = true; };
  }, [user?.uid, user?.emailVerified]);

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
