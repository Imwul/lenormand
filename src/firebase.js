import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCBiEh_2YmbU9W_isONi2FugkTzDIYJ0mE",
  authDomain: "skogsduvasbookshop.firebaseapp.com",
  projectId: "skogsduvasbookshop",
  storageBucket: "skogsduvasbookshop.firebasestorage.app",
  messagingSenderId: "1051912666392",
  appId: "1:1051912666392:web:effb955c211c174b26326d",
  databaseURL: "https://skogsduvasbookshop-default-rtdb.asia-southeast1.firebasedatabase.app"
};

export const isFirebaseConfigured = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;
export const googleProvider = new GoogleAuthProvider();
