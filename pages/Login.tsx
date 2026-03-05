import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../src/firebase/config';
import { Mail, Lock, User } from 'lucide-react';

interface LoginProps {
  onNavigate: (path: string) => void;
}

const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('yqp5187@psu.edu'); // Default email
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [major, setMajor] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Check if user is already logged in and email verified
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check email verification
        if (!user.emailVerified) {
          setError('Email verification not completed. Please check your email.');
          setEmailVerificationSent(true);
          setEmail(user.email || '');
        } else {
          // Check Firestore user status after email verification
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              // Update to pending status when email verification is complete
              if (userData.status !== 'approved' && userData.status !== 'rejected') {
                await updateDoc(doc(db, 'users', user.uid), {
                  emailVerified: true,
                  status: 'pending', // Waiting for admin approval
                });
              }
              
              // Only approved users can navigate to home
              if (userData.status === 'approved') {
                onNavigate('/');
              } else if (userData.status === 'rejected') {
                await auth.signOut();
                setError('Registration has been rejected. Please contact us if you have questions.');
              } else {
                setError('Waiting for admin approval. You can log in after approval.');
              }
            } else {
              // Create user document if it doesn't exist
              await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                emailVerified: true,
                status: 'pending',
                role: 'member', // Default: regular member
                createdAt: new Date(),
              });
              setError('Waiting for admin approval. You can log in after approval.');
            }
          } catch (error) {
            console.error('Error checking user status:', error);
            onNavigate('/');
          }
        }
      }
    });
    return () => unsubscribe();
  }, [onNavigate]);

  const validatePSUEmail = (email: string): boolean => {
    return email.toLowerCase().endsWith('@psu.edu');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Check PSU email domain
    if (!validatePSUEmail(email)) {
      setError('Only PSU email (@psu.edu) is allowed.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        // Check required information for signup
        if (!name.trim()) {
          setError('Please enter your name.');
          setLoading(false);
          return;
        }
        if (!major.trim()) {
          setError('Please enter your major.');
          setLoading(false);
          return;
        }
        if (!year.trim()) {
          setError('Please select your year.');
          setLoading(false);
          return;
        }

        // Sign up and send email verification
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Save user info to Firestore (waiting for email verification)
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name: name.trim(),
          email: email.toLowerCase(),
          major: major.trim(),
          year: year.trim(),
          createdAt: new Date(),
          emailVerified: false,
          status: 'pending', // Waiting for email verification
          role: 'member', // Default: regular member
        });

        try {
          await sendEmailVerification(userCredential.user);
          console.log('Email verification sent:', userCredential.user.email);
          // Keep user logged in (so user can check email)
          setEmailVerificationSent(true);
          setError('');
        } catch (emailError: any) {
          console.error('Failed to send email verification:', emailError);
          setError('Failed to send email verification. Please try again later.');
          setLoading(false);
          return;
        }
        // Reset form
        setName('');
        setMajor('');
        setYear('');
        return;
      } else {
        // Check email verification and approval status on login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (!userCredential.user.emailVerified) {
          setError('Email verification not completed. Please check your email.');
          setEmailVerificationSent(true);
          return;
        }
        
        // Check user approval status
        try {
          const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.status === 'rejected') {
              await auth.signOut();
              setError('Registration has been rejected. Please contact us if you have questions.');
              return;
            } else if (userData.status !== 'approved') {
              setError('Waiting for admin approval. You can log in after approval.');
              return;
            }
          }
        } catch (error) {
          console.error('Error checking user status:', error);
        }
        // Approved users will be redirected automatically via onAuthStateChanged
      }
      // Navigation will happen via onAuthStateChanged
    } catch (error: any) {
      let errorMessage = 'Login failed.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password must be at least 6 characters.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'Email not registered.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Check PSU email after Google login
      const userEmail = result.user.email || '';
      if (!validatePSUEmail(userEmail)) {
        // Sign out if not PSU email
        await auth.signOut();
        setError('Only PSU email (@psu.edu) is allowed.');
        setLoading(false);
        return;
      }

      // Google login generally considers email as verified, but check anyway
      if (!result.user.emailVerified) {
        await sendEmailVerification(result.user);
        await auth.signOut();
        setError('Verification email sent. Please check your email.');
        setEmailVerificationSent(true);
        setLoading(false);
        return;
      }

      // Navigation will happen via onAuthStateChanged
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Login popup was closed.');
      } else {
        setError('Google login failed.');
      }
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setError('');
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user && !user.emailVerified) {
        // Resend if there's a logged-in user
        console.log('Resending verification email:', user.email);
        await sendEmailVerification(user, {
          url: window.location.origin + '/login',
          handleCodeInApp: false,
        });
        console.log('Verification email resent:', user.email);
        setEmailVerificationSent(true);
        setError('');
      } else if (email && validatePSUEmail(email) && password) {
        // Try login then resend if email and password are provided
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          if (!userCredential.user.emailVerified) {
            await sendEmailVerification(userCredential.user, {
              url: window.location.origin + '/login',
              handleCodeInApp: false,
            });
            setEmailVerificationSent(true);
            setError('');
          }
        } catch (loginError: any) {
          setError('Login failed. Please check your email and password.');
        }
      } else {
        setError('Please enter your email and password, then try again.');
      }
    } catch (error: any) {
      console.error('Failed to resend verification email:', error);
      setError('Failed to resend verification email: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email.');
      return;
    }
    
    if (!validatePSUEmail(email)) {
      setError('Only PSU email (@psu.edu) is allowed.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
      setError('');
    } catch (error: any) {
      setError('Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen text-white font-jost relative flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #0f131a 0%, #1a1f2e 50%, #0f131a 100%)',
        minHeight: 'calc(100vh + 140px)',
        marginTop: '-140px',
        paddingTop: 'calc(140px + 3rem)',
        paddingBottom: '3rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Starry background effect */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(2px 2px at 20% 30%, white, transparent), radial-gradient(2px 2px at 60% 70%, white, transparent), radial-gradient(1px 1px at 50% 50%, white, transparent), radial-gradient(1px 1px at 80% 10%, white, transparent), radial-gradient(2px 2px at 90% 40%, white, transparent), radial-gradient(1px 1px at 33% 60%, white, transparent), radial-gradient(1px 1px at 55% 80%, white, transparent)',
          backgroundSize: '200% 200%',
          opacity: 0.3,
        }}
      />

      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="max-w-md mx-auto">
          {/* Login Card */}
          <div 
            className="rounded-2xl p-8 shadow-2xl border"
            style={{
              background: 'rgba(26, 31, 46, 0.95)',
              backdropFilter: 'blur(10px)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div 
                className="rounded-xl p-4"
                style={{
                  background: 'linear-gradient(135deg, #3b4c6b 0%, #2d3a52 100%)',
                  border: '2px solid rgba(59, 76, 107, 0.5)',
                }}
              >
                <img
                  src="/asme_Logo.png"
                  alt="ASME"
                  style={{
                    height: "48px",
                    width: "auto",
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/ASME_logo.svg/512px-ASME_logo.svg.png";
                    (e.target as HTMLImageElement).style.filter = "brightness(0) invert(1)";
                  }}
                />
              </div>
            </div>

            {/* Welcome Message */}
            <h1 className="text-3xl font-bold text-center mb-2">
              {isSignUp ? 'Welcome!' : 'Welcome Back'}
            </h1>
            <p className="text-gray-400 text-center mb-8 text-sm">
              {isSignUp ? 'Create an account to get started' : 'Please enter your details to sign in'}
            </p>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Field - Only shown on signup */}
              {isSignUp && (
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={isSignUp}
                      className="w-full pl-12 pr-4 py-3 bg-[#0f131a] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3b4c6b] focus:border-transparent transition"
                      placeholder="Your Name"
                    />
                  </div>
                </div>
              )}

              {/* Major Field - Only shown on signup */}
              {isSignUp && (
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Major
                  </label>
                  <input
                    type="text"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    required={isSignUp}
                    className="w-full px-4 py-3 bg-[#0f131a] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3b4c6b] focus:border-transparent transition"
                    placeholder="e.g., Mechanical Engineering"
                  />
                </div>
              )}

              {/* Year Field - Only shown on signup */}
              {isSignUp && (
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Year
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    required={isSignUp}
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
              )}

              {/* Email Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-[#0f131a] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3b4c6b] focus:border-transparent transition"
                    placeholder="yourname@psu.edu"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Only PSU email (@psu.edu) is allowed
                </p>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-gray-300">
                    Password
                  </label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm text-[#3b4c6b] hover:text-[#4a5f7f] transition"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-[#0f131a] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3b4c6b] focus:border-transparent transition"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Remember Me */}
              {!isSignUp && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 bg-[#0f131a] border-gray-600 rounded focus:ring-2 focus:ring-[#3b4c6b] text-[#3b4c6b]"
                  />
                  <label htmlFor="remember" className="ml-2 text-sm text-gray-400">
                    Remember for 30 days
                  </label>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
                  {error}
                  {emailVerificationSent && !error.includes('verification') && (
                    <button
                      onClick={handleResendVerification}
                      className="block mt-2 text-[#3b4c6b] hover:text-[#4a5f7f] underline"
                    >
                      Resend verification email
                    </button>
                  )}
                </div>
              )}

              {/* Email Verification Success Message */}
              {emailVerificationSent && !error && (
                <div className="bg-blue-900/30 border border-blue-700 text-blue-300 px-4 py-3 rounded-lg text-sm">
                  <p className="font-semibold mb-2">Verification email sent!</p>
                  <p className="mb-2">Please check your email at {email} and click the verification link.</p>
                  <p className="text-xs text-blue-400 mb-2">Didn't receive the email?</p>
                  <button
                    onClick={handleResendVerification}
                    className="text-blue-300 hover:text-blue-200 underline"
                  >
                    Resend verification email
                  </button>
                </div>
              )}

              {/* Password Reset Success Message */}
              {resetEmailSent && (
                <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-lg text-sm">
                  Password reset email sent. Please check {email}.
                </div>
              )}

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-lg font-bold text-white transition disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #3b4c6b 0%, #2d3a52 100%)',
                  boxShadow: '0 4px 15px rgba(59, 76, 107, 0.4)',
                }}
              >
                {loading ? (isSignUp ? 'Creating account...' : 'Logging in...') : (isSignUp ? 'Sign Up' : 'Sign In')}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#1a1f2e] text-gray-400">OR CONTINUE WITH</span>
              </div>
            </div>

            {/* Social Login */}
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-6 bg-white hover:bg-gray-100 text-gray-800 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
            </div>

            {/* Sign Up / Sign In Toggle */}
            <div className="mt-6 text-center">
              <span className="text-gray-400 text-sm">
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setName('');
                  setMajor('');
                  setYear('');
                  setEmailVerificationSent(false);
                }}
                className="text-[#3b4c6b] hover:text-[#4a5f7f] font-semibold text-sm transition"
              >
                {isSignUp ? 'Sign in' : 'Sign up for free'}
              </button>
            </div>

            {/* Back to Home */}
            <div className="mt-6 text-center">
              <button
                onClick={() => onNavigate('/')}
                className="text-gray-400 hover:text-white text-sm transition"
              >
                ← Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
