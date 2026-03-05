// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Default Firebase configuration (for shared project use)
// Can be overridden with .env.local file
const DEV_DEFAULTS = {
  apiKey: "AIzaSyAE3XSw5zwAhYnZI25Ukfa_QXeAM6DZ3mI",
  authDomain: "asme-web-20fbb.firebaseapp.com",
  projectId: "asme-web-20fbb",
  storageBucket: "asme-web-20fbb.firebasestorage.app",
  messagingSenderId: "634491075932",
  appId: "1:634491075932:web:8dbac2f94eb74fd3969599",
  measurementId: "G-YMRQGG70TL"
};

// Your web app's Firebase configuration
// Use environment variables if provided, otherwise use default (for shared Firebase project)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || DEV_DEFAULTS.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || DEV_DEFAULTS.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || DEV_DEFAULTS.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || DEV_DEFAULTS.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEV_DEFAULTS.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || DEV_DEFAULTS.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || DEV_DEFAULTS.measurementId,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
