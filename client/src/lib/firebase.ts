import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "placeholder",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "placeholder"}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "placeholder",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "placeholder"}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "placeholder",
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let googleProvider: GoogleAuthProvider;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
} catch (error) {
  console.warn("Firebase initialization failed:", error);
  app = null as any;
  auth = null as any;
  db = null as any;
  storage = null as any;
  googleProvider = null as any;
}

export { app, auth, db, storage, googleProvider };
