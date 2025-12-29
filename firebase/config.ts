// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAE3XSw5zwAhYnZI25Ukfa_QXeAM6DZ3mI",
  authDomain: "asme-web-20fbb.firebaseapp.com",
  projectId: "asme-web-20fbb",
  storageBucket: "asme-web-20fbb.firebasestorage.app",
  messagingSenderId: "634491075932",
  appId: "1:634491075932:web:8dbac2f94eb74fd3969599",
  measurementId: "G-YMRQGG70TL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
