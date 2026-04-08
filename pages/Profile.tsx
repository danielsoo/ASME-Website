import React, { useRef, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../src/firebase/config';
import { User, Mail, GraduationCap, Calendar, Save, LogOut, MessageSquare, Image as ImageIcon, Check } from 'lucide-react';
import Uploader from '../src/components/Uploader';
import { cropFrameToSquareJpegBlob } from '../src/utils/cropFrameToSquareBlob';
import { uploadImageKitBlob } from '../src/utils/imagekitUploadBlob';

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
  /** Fixed image + movable crop frame (pixels inside crop container) */
  const cropContainerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [displayRect, setDisplayRect] = useState<{
    offX: number;
    offY: number;
    dw: number;
    dh: number;
  } | null>(null);
  const [frameSize, setFrameSize] = useState(0);
  const [frameLeft, setFrameLeft] = useState(0);
  const [frameTop, setFrameTop] = useState(0);
  const frameDragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cropConfirming, setCropConfirming] = useState(false);

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

  /** Map frame (px) + display rect → focus % + zoom (same convention as TeamCard). */
  const frameToCrop = useCallback(
    (
      fs: number,
      fl: number,
      ft: number,
      rect: { offX: number; offY: number; dw: number; dh: number }
    ) => {
      const { offX, offY, dw, dh } = rect;
      const zoom = Math.min(dw, dh) / fs;
      const cx = fl + fs / 2;
      const cy = ft + fs / 2;
      const focusX = ((cx - offX) / dw) * 100;
      const focusY = ((cy - offY) / dh) * 100;
      return {
        focusX: clamp(focusX, 0, 100),
        focusY: clamp(focusY, 0, 100),
        zoom: clamp(zoom, 1, 3),
      };
    },
    []
  );

  const applyFrameToState = useCallback(
    (
      fs: number,
      fl: number,
      ft: number,
      rect: { offX: number; offY: number; dw: number; dh: number } | null
    ) => {
      if (!rect) return;
      const { focusX, focusY, zoom } = frameToCrop(fs, fl, ft, rect);
      setImageFocusX(focusX);
      setImageFocusY(focusY);
      setImageZoom(zoom);
    },
    [frameToCrop]
  );

  const restoreFrameFromCrop = useCallback(
    (
      rect: { offX: number; offY: number; dw: number; dh: number },
      fx: number,
      fy: number,
      zm: number
    ) => {
      const { offX, offY, dw, dh } = rect;
      const z = clamp(zm, 1, 3);
      const minFs = Math.max(24, Math.min(dw, dh) / 3);
      const maxFs = Math.min(dw, dh);
      let fs = Math.min(dw, dh) / z;
      fs = clamp(fs, minFs, maxFs);
      const cx = offX + (fx / 100) * dw;
      const cy = offY + (fy / 100) * dh;
      let fl = cx - fs / 2;
      let ft = cy - fs / 2;
      fl = clamp(fl, offX, offX + dw - fs);
      ft = clamp(ft, offY, offY + dh - fs);
      setFrameSize(fs);
      setFrameLeft(fl);
      setFrameTop(ft);
      const u = frameToCrop(fs, fl, ft, rect);
      setImageFocusX(u.focusX);
      setImageFocusY(u.focusY);
      setImageZoom(u.zoom);
    },
    [frameToCrop]
  );

  const measureDisplayedImage = useCallback(() => {
    const container = cropContainerRef.current;
    const img = imgRef.current;
    if (!container || !img || !img.naturalWidth) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const scale = Math.min(cw / nw, ch / nh);
    const dw = nw * scale;
    const dh = nh * scale;
    const offX = (cw - dw) / 2;
    const offY = (ch - dh) / 2;
    setDisplayRect({ offX, offY, dw, dh });
  }, []);

  useEffect(() => {
    setDisplayRect(null);
  }, [imageUrl]);

  useEffect(() => {
    if (!displayRect || !imageUrl) return;
    restoreFrameFromCrop(displayRect, imageFocusX, imageFocusY, imageZoom);
    // When layout (displayed image bounds) changes only: sync frame from saved focus/zoom (while dragging, the frame is the source of truth)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayRect?.offX, displayRect?.offY, displayRect?.dw, displayRect?.dh, imageUrl, restoreFrameFromCrop]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = frameDragRef.current;
      const rect = displayRect;
      if (!d || !rect) return;
      const dx = e.clientX - d.startClientX;
      const dy = e.clientY - d.startClientY;
      const fs = frameSize;
      const { offX, offY, dw, dh } = rect;
      let fl = d.startLeft + dx;
      let ft = d.startTop + dy;
      fl = clamp(fl, offX, offX + dw - fs);
      ft = clamp(ft, offY, offY + dh - fs);
      setFrameLeft(fl);
      setFrameTop(ft);
      applyFrameToState(fs, fl, ft, rect);
    };
    const onUp = () => {
      frameDragRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [displayRect, frameSize, applyFrameToState]);

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      const d = frameDragRef.current;
      const rect = displayRect;
      if (!d || !rect) return;
      e.preventDefault();
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - d.startClientX;
      const dy = t.clientY - d.startClientY;
      const fs = frameSize;
      const { offX, offY, dw, dh } = rect;
      let fl = d.startLeft + dx;
      let ft = d.startTop + dy;
      fl = clamp(fl, offX, offX + dw - fs);
      ft = clamp(ft, offY, offY + dh - fs);
      setFrameLeft(fl);
      setFrameTop(ft);
      applyFrameToState(fs, fl, ft, rect);
    };
    const onTouchEnd = () => {
      frameDragRef.current = null;
    };
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [displayRect, frameSize, applyFrameToState]);

  const onFrameMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    frameDragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startLeft: frameLeft,
      startTop: frameTop,
    };
  };

  const onFrameTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    e.preventDefault();
    e.stopPropagation();
    frameDragRef.current = {
      startClientX: t.clientX,
      startClientY: t.clientY,
      startLeft: frameLeft,
      startTop: frameTop,
    };
  };

  const adjustZoom = (delta: number) => {
    const rect = displayRect;
    if (!rect) return;
    const { offX, offY, dw, dh } = rect;
    const maxFs = Math.min(dw, dh);
    const minFs = Math.max(32, maxFs / 3);
    const cx = frameLeft + frameSize / 2;
    const cy = frameTop + frameSize / 2;
    let fs = frameSize * (1 + delta);
    fs = clamp(fs, minFs, maxFs);
    let fl = cx - fs / 2;
    let ft = cy - fs / 2;
    fl = clamp(fl, offX, offX + dw - fs);
    ft = clamp(ft, offY, offY + dh - fs);
    setFrameSize(fs);
    setFrameLeft(fl);
    setFrameTop(ft);
    applyFrameToState(fs, fl, ft, rect);
  };

  useEffect(() => {
    const el = cropContainerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measureDisplayedImage());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureDisplayedImage, imageUrl]);

  const handleConfirmCrop = async () => {
    if (!user || !imageUrl || !displayRect || frameSize <= 0) return;
    setCropConfirming(true);
    setError('');
    try {
      const blob = await cropFrameToSquareJpegBlob(
        imageUrl,
        displayRect,
        frameLeft,
        frameTop,
        frameSize
      );
      const fileName = `profile-${user.uid}-${Date.now()}.jpg`;
      const { url } = await uploadImageKitBlob(blob, fileName, {
        folder: '/members',
        tags: ['member-profile', 'cropped'],
      });
      setImageUrl(url);
      setImageFocusX(50);
      setImageFocusY(50);
      setImageZoom(1);
      setDisplayRect(null);
      await updateDoc(doc(db, 'users', user.uid), {
        imageUrl: url,
        imageFocusX: 50,
        imageFocusY: 50,
        imageZoom: 1,
        updatedAt: new Date().toISOString(),
      });
      setUserData((prev: any) => ({
        ...prev,
        imageUrl: url,
        imageFocusX: 50,
        imageFocusY: 50,
        imageZoom: 1,
      }));
      setSuccess('Profile photo confirmed and saved.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || 'Failed to confirm the cropped image.');
    } finally {
      setCropConfirming(false);
    }
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
              onComplete={(u) => {
                setImageUrl(u.url);
                setImageFocusX(50);
                setImageFocusY(50);
                setImageZoom(1);
                setDisplayRect(null);
              }}
              onError={(msg) => setError(msg)}
            />
            {imageUrl && (
              <div className="mt-4">
                <div
                  ref={cropContainerRef}
                  className="relative w-full max-w-sm aspect-square rounded-lg overflow-hidden border-2 border-white/80 bg-[#0f131a]"
                >
                  <img
                    ref={imgRef}
                    src={imageUrl}
                    alt="Profile crop preview"
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                    onLoad={measureDisplayedImage}
                  />
                  {displayRect && frameSize > 0 && (
                    <div
                      className="absolute z-20 touch-none"
                      style={{
                        left: frameLeft,
                        top: frameTop,
                        width: frameSize,
                        height: frameSize,
                        boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                        cursor: 'move',
                      }}
                      onMouseDown={onFrameMouseDown}
                      onTouchStart={onFrameTouchStart}
                    >
                      <div className="absolute inset-0 border-2 border-white rounded-sm pointer-events-none" />
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  The photo stays fixed; drag the white square to choose the crop. Use + / − to zoom, then tap{' '}
                  <span className="text-gray-300">Confirm</span> to save only the area inside the frame as your profile photo.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => adjustZoom(-0.1)}
                    disabled={!displayRect || frameSize <= 0 || cropConfirming}
                    className="px-3 py-1.5 rounded bg-[#2d3a52] text-white text-sm hover:bg-[#3b4c6b] disabled:opacity-40"
                  >
                    −
                  </button>
                  <div className="text-xs text-gray-300 min-w-[72px] text-center">
                    Zoom {Math.round(imageZoom * 100)}%
                  </div>
                  <button
                    type="button"
                    onClick={() => adjustZoom(0.1)}
                    disabled={!displayRect || frameSize <= 0 || cropConfirming}
                    className="px-3 py-1.5 rounded bg-[#2d3a52] text-white text-sm hover:bg-[#3b4c6b] disabled:opacity-40"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCrop}
                    disabled={!displayRect || frameSize <= 0 || cropConfirming}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4" />
                    {cropConfirming ? 'Confirming…' : 'Confirm'}
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
