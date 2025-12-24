
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin with proper error handling
function initializeFirebase() {
  if (getApps().length > 0) {
    return { 
      db: getFirestore(getApps()[0]), 
      auth: getAuth(getApps()[0]) 
    };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase credentials: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
  }

  // Properly handle newline characters in private key
  privateKey = privateKey.replace(/\\n/g, '\n');

  const app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  return {
    db: getFirestore(app),
    auth: getAuth(app),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS and cache headers
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, email } = req.body;

    if (!code || !email) {
      return res.status(400).json({ 
        success: false, 
        error: "Code and email required" 
      });
    }

    const { db, auth } = initializeFirebase();

    const pendingRef = db.collection('pending_registrations');
    const snapshot = await pendingRef.where('email', '==', email).get();

    if (snapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        error: "Pending registration not found" 
      });
    }

    const pendingDoc = snapshot.docs[0];
    const pending = pendingDoc.data();

    if (pending.verificationCode !== code) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid verification code" 
      });
    }

    if (pending.tokenExpiry < Date.now()) {
      return res.status(400).json({ 
        success: false, 
        error: "Verification code expired" 
      });
    }

    const authUser = await auth.createUser({
      email: pending.email,
      password: pending.password,
      emailVerified: true
    });

    await db.collection('users').doc(authUser.uid).set({
      uid: authUser.uid,
      email: pending.email,
      role: pending.role,
      phone: pending.phone || "",
      address: "",
      city: "",
      fullName: "",
      emailVerified: true,
      createdAt: Date.now()
    });

    await pendingDoc.ref.delete();

    res.status(200).json({ 
      success: true, 
      message: "Registration completed successfully" 
    });
  } catch (error: any) {
    console.error('Complete registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to complete registration' 
    });
  }
}
