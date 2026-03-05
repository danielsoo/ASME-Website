import React, { useState } from 'react';
import { doc, setDoc, getDocs, query, where, collection, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { db, auth } from '../../src/firebase/config';

const SetupAdmin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('Admin User');
  const [role, setRole] = useState('admin'); // Default role
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'create' | 'promote'>('promote'); // Default to 'promote'

  const createAdminAccount = async () => {
    setStatus('');
    setLoading(true);

    try {
      // Check password
      if (password.length < 6) {
        setStatus('❌ Password must be at least 6 characters long.');
        setLoading(false);
        return;
      }

      // Create Firebase Authentication account
      const userCredential = await createUserWithEmailAndPassword(auth, email.toLowerCase(), password);
      const user = userCredential.user;

      // Send email verification
      await sendEmailVerification(user);

      // Save user info to Firestore (approved as admin directly)
      await setDoc(doc(db, 'users', user.uid), {
        email: email.toLowerCase(),
        name: name || 'Admin User',
        status: 'approved',
        role: role || 'admin',
        emailVerified: false, // Email verification later
        createdAt: new Date().toISOString(),
      });

      setStatus(`✅ Success! Admin account for ${email} has been created. Please check your email for verification.`);
      setPassword(''); // Clear password field for security
    } catch (error: any) {
      console.error('Error creating admin:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        setStatus(`❌ This email is already in use. Please use "Promote Existing Account" mode.`);
        setMode('promote');
      } else {
        setStatus(`❌ Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const promoteExistingUser = async () => {
    setStatus('');
    setLoading(true);

    try {
      // Find user by email in users collection
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setStatus(`❌ User not found: ${email}. Please complete registration at "/login" first.`);
        setLoading(false);
        return;
      }

      // Update first matching user document
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      console.log('Current user data:', userData); // Debug
      console.log('Data to update:', { status: 'approved', role: role || 'admin' }); // Debug
      
      await updateDoc(doc(db, 'users', userDoc.id), {
        status: 'approved',
        role: role || 'admin',
      });

      console.log('Update complete!'); // Debug
      setStatus(`✅ Success! User ${email} has been set to ${role || 'admin'} and approved. You can now log in.`);
    } catch (error: any) {
      console.error('Error promoting user:', error);
      console.error('Error code:', error.code);
      console.error('Error details:', error);
      
      if (error.code === 'permission-denied') {
        setStatus(`❌ Permission error: Please check Firestore security rules. Or edit directly in Firebase Console:
        
1. Firebase Console → Firestore Database → users collection
2. Document ID: ${querySnapshot.docs[0]?.id || 'N/A'}
3. Update the following fields:
   - status: "approved"
   - role: "${role || 'admin'}"`);
      } else {
        setStatus(`❌ Error: ${error.message} (code: ${error.code || 'N/A'})`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 overflow-x-auto">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">Admin Account Setup</h1>

          {/* Mode Selection */}
          <div className="mb-4 sm:mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setMode('create')}
              className={`flex-1 px-4 py-2 rounded ${
                mode === 'create'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Create New Account
            </button>
            <button
              onClick={() => setMode('promote')}
              className={`flex-1 px-4 py-2 rounded ${
                mode === 'promote'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Promote Existing Account
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                placeholder="admin@email.com"
              />
            </div>

            {mode === 'create' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    placeholder="Admin User"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password (Minimum 6 characters)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="admin">Admin</option>
                    <option value="President">President</option>
                    <option value="Vice President">Vice President</option>
                    <option value="Treasurer">Treasurer</option>
                    <option value="Secretary">Secretary</option>
                  </select>
                </div>
              </>
            )}

            {mode === 'promote' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                >
                  <option value="admin">Admin</option>
                  <option value="President">President</option>
                  <option value="Vice President">Vice President</option>
                  <option value="Treasurer">Treasurer</option>
                  <option value="Secretary">Secretary</option>
                  <option value="Design Director">Design Director</option>
                  <option value="Corporate Outreach Lead">Corporate Outreach Lead</option>
                  <option value="THON Chair">THON Chair</option>
                  <option value="Events Coordinator">Events Coordinator</option>
                  <option value="Logistics Officer">Logistics Officer</option>
                  <option value="Internal Outreach">Internal Outreach</option>
                  <option value="member">Member</option>
                </select>
              </div>
            )}

            <button
              onClick={mode === 'create' ? createAdminAccount : promoteExistingUser}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : mode === 'create' ? 'Create Admin Account' : 'Promote to Admin'}
            </button>

            {status && (
              <div className={`p-4 rounded ${
                status.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {status}
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-blue-900 mb-2">
                <strong>📌 How to Use:</strong>
              </p>
              <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                {mode === 'create' ? (
                  <>
                    <li><strong>Create New Account</strong>: Automatically creates Firebase Authentication account and Firestore user document.</li>
                    <li>Please check your email for verification after creation.</li>
                    <li>After setup is complete, you can log in at <strong>#/login</strong>.</li>
                  </>
                ) : (
                  <>
                    <li><strong>Promote Existing Account</strong>: Promotes an already registered user to admin.</li>
                    <li>User must first complete registration at <strong>#/login</strong>.</li>
                    <li>After promotion, you can log in with that account to use admin privileges.</li>
                  </>
                )}
              </ul>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600 mb-2">
                <strong>🔗 Quick Links:</strong>
              </p>
              <div className="flex gap-2">
                <a
                  href="#/login"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Go to Login Page →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupAdmin;
