import React, { useRef, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../src/firebase/config';
import { User, Mail, GraduationCap, Calendar, Save, LogOut, MessageSquare, Image as ImageIcon } from 'lucide-react';
import Uploader from '../src/components/Uploader';

interface ProfileProps {
  onNavigate: (path: string) => void;
}

const Profile: React.FC<ProfileProps> = ({ onNavigate }) => {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Editable fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [major, setMajor] = useState('');
  const [year, setYear] = useState('');
  const [funFact, setFunFact] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFocusX, setImageFocusX] = useState(50);
  const [imageFocusY, setImageFocusY] = useState(50);
  const [imageZoom, setImageZoom] = useState(1);
  const dragStartRef = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData(data);
            setName(data.name || '');
            setEmail(data.email || firebaseUser.email || '');
            setMajor(data.major || '');
            setYear(data.year || '');
            setFunFact(data.funFact || '');
            setImageUrl(data.imageUrl || '');
            setImageFocusX(typeof data.imageFocusX === 'number' ? data.imageFocusX : 50);
            setImageFocusY(typeof data.imageFocusY === 'number' ? data.imageFocusY : 50);
            setImageZoom(typeof data.imageZoom === 'number' && data.imageZoom >= 1 ? data.imageZoom : 1);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setError('An error occurred while loading profile information.');
        }
      } else {
        onNavigate('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [onNavigate]);

  const handleSave = async () => {
    if (!user) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Email is required.');
      return;
    }
    
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
        email: normalizedEmail,
        major: major.trim(),
        year: year.trim(),
        funFact: funFact.trim(),
        imageUrl: imageUrl.trim(),
        imageFocusX,
        imageFocusY,
        imageZoom,
        updatedAt: new Date().toISOString(),
      });

      setSuccess('Profile updated successfully!');
      // Update local state
      setUserData({
        ...userData,
        name: name.trim(),
        email: normalizedEmail,
        major: major.trim(),
        year: year.trim(),
        funFact: funFact.trim(),
        imageUrl: imageUrl.trim(),
        imageFocusX,
        imageFocusY,
        imageZoom,
      });
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError('An error occurred while updating profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

  const beginDrag = (clientX: number, clientY: number) => {
    dragStartRef.current = { x: clientX, y: clientY, fx: imageFocusX, fy: imageFocusY };
  };

  const moveDrag = (clientX: number, clientY: number) => {
    if (!dragStartRef.current || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dxPct = ((clientX - dragStartRef.current.x) / rect.width) * 100;
    const dyPct = ((clientY - dragStartRef.current.y) / rect.height) * 100;
    setImageFocusX(clamp(dragStartRef.current.fx - dxPct, 0, 100));
    setImageFocusY(clamp(dragStartRef.current.fy - dyPct, 0, 100));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onNavigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f131a] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || !userData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0f131a] pb-20">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Profile Settings</h1>
          <p className="text-gray-400">Edit and manage your personal information</p>
        </div>

        {/* Profile Card */}
        <div className="bg-[#1a1f2e] rounded-lg shadow-xl p-8 mb-6">
          {/* Profile Photo */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
              <ImageIcon className="w-5 h-5" />
              Profile Photo
            </label>
            <Uploader
              folder="/members"
              tags={['member-profile']}
              buttonLabel={imageUrl ? 'Replace Photo' : 'Upload Photo'}
              onComplete={(u) => setImageUrl(u.url)}
              onError={(msg) => setError(msg)}
            />
            {imageUrl && (
              <div className="mt-4">
                <div className="relative w-full max-w-sm aspect-square rounded-lg overflow-hidden border-2 border-white/80 bg-[#0f131a]">
                  <img
                    src={imageUrl}
                    alt="Profile crop preview"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ objectPosition: `${imageFocusX}% ${imageFocusY}%`, transform: `scale(${imageZoom})`, transformOrigin: 'center' }}
                  />
                  {/* Subtle edge fade for focus, while keeping full-frame drag */}
                  <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 9999px rgba(255,255,255,0.08)' }} />
                  <div
                    ref={previewRef}
                    className="absolute inset-0 z-20 cursor-grab active:cursor-grabbing"
                    onMouseDown={(e) => beginDrag(e.clientX, e.clientY)}
                    onMouseMove={(e) => {
                      if ((e.buttons & 1) === 1) moveDrag(e.clientX, e.clientY);
                    }}
                    onMouseUp={() => {
                      dragStartRef.current = null;
                    }}
                    onMouseLeave={() => {
                      dragStartRef.current = null;
                    }}
                    onTouchStart={(e) => {
                      const t = e.touches[0];
                      if (!t) return;
                      beginDrag(t.clientX, t.clientY);
                    }}
                    onTouchMove={(e) => {
                      const t = e.touches[0];
                      if (!t) return;
                      moveDrag(t.clientX, t.clientY);
                    }}
                    onTouchEnd={() => {
                      dragStartRef.current = null;
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  이 정사각형 전체가 실제 프로필 영역입니다. 카톡/아이클라우드처럼 안에서 드래그+확대/축소로 맞춰 주세요.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setImageZoom((z) => clamp(Number((z - 0.1).toFixed(2)), 1, 3))}
                    className="px-3 py-1.5 rounded bg-[#2d3a52] text-white text-sm hover:bg-[#3b4c6b]"
                  >
                    -
                  </button>
                  <div className="text-xs text-gray-300 min-w-[72px] text-center">
                    Zoom {Math.round(imageZoom * 100)}%
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageZoom((z) => clamp(Number((z + 0.1).toFixed(2)), 1, 3))}
                    className="px-3 py-1.5 rounded bg-[#2d3a52] text-white text-sm hover:bg-[#3b4c6b]"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Name */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
              <User className="w-5 h-5" />
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-[#0f131a] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3b4c6b] focus:border-transparent transition"
              placeholder="Enter your name"
            />
          </div>

          {/* Display Email */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
              <Mail className="w-5 h-5" />
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#0f131a] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3b4c6b] focus:border-transparent transition"
              placeholder="Enter your contact email"
            />
            <p className="mt-1 text-xs text-gray-500">Shown on the About board card when you are assigned to a board role.</p>
          </div>

          {/* Major */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
              <GraduationCap className="w-5 h-5" />
              Major
            </label>
            <input
              type="text"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              className="w-full px-4 py-3 bg-[#0f131a] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3b4c6b] focus:border-transparent transition"
              placeholder="Enter your major"
            />
          </div>

          {/* Year */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
              <Calendar className="w-5 h-5" />
              Year
            </label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full px-4 py-3 bg-[#0f131a] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3b4c6b] focus:border-transparent transition"
            >
              <option value="">Select Year</option>
              <option value="Freshman">Freshman</option>
              <option value="Sophomore">Sophomore</option>
              <option value="Junior">Junior</option>
              <option value="Senior">Senior</option>
              <option value="Graduate">Graduate</option>
            </select>
          </div>

          {/* Fun Fact */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
              <MessageSquare className="w-5 h-5" />
              Fun Fact
            </label>
            <input
              type="text"
              value={funFact}
              onChange={(e) => setFunFact(e.target.value)}
              className="w-full px-4 py-3 bg-[#0f131a] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3b4c6b] focus:border-transparent transition"
              placeholder="Share a short fun fact"
            />
          </div>

          {/* Role & Status (Read-only) */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Role
              </label>
              <div className="px-4 py-3 bg-[#0f131a] border border-gray-700 rounded-lg text-gray-400">
                {userData.role || 'Member'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Status
              </label>
              <div className="px-4 py-3 bg-[#0f131a] border border-gray-700 rounded-lg text-gray-400">
                {userData.status === 'approved' ? 'Approved' : 
                 userData.status === 'pending' ? 'Pending Approval' : 
                 userData.status || 'Unknown'}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-bold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #3b4c6b 0%, #2d3a52 100%)',
              boxShadow: '0 4px 15px rgba(59, 76, 107, 0.4)',
            }}
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Logout Button */}
        <div className="bg-[#1a1f2e] rounded-lg shadow-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Account</h2>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
