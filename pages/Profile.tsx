import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../src/firebase/config';
import { User, Mail, GraduationCap, Calendar, Save, LogOut } from 'lucide-react';

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
  const [major, setMajor] = useState('');
  const [year, setYear] = useState('');
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
            setMajor(data.major || '');
            setYear(data.year || '');
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
    
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
        major: major.trim(),
        year: year.trim(),
        updatedAt: new Date().toISOString(),
      });

      setSuccess('Profile updated successfully!');
      // Update local state
      setUserData({
        ...userData,
        name: name.trim(),
        major: major.trim(),
        year: year.trim(),
      });
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError('An error occurred while updating profile: ' + error.message);
    } finally {
      setSaving(false);
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
          {/* Email (Read-only) */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
              <Mail className="w-5 h-5" />
              Email
            </label>
            <input
              type="email"
              value={user.email || ''}
              disabled
              className="w-full px-4 py-3 bg-[#0f131a] border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
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
