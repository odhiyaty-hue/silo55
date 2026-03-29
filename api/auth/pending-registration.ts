
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
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📦 Request method:', req.method);
    console.log('📦 Request headers:', JSON.stringify(req.headers));
    console.log('📦 Request body type:', typeof req.body);
    console.log('📦 Request body raw:', req.body);
    
    // Parse body if it's a string
    let bodyData = req.body;
    if (typeof req.body === 'string') {
      try {
        bodyData = JSON.parse(req.body);
      } catch (parseError) {
        console.error('❌ Failed to parse JSON body:', parseError);
        return res.status(400).json({
          success: false,
          error: "Invalid JSON format"
        });
      }
    }
    
    const { email, password, role, phone, verificationCode, tokenExpiry } = bodyData || {};

    console.log('📦 Extracted fields:', { 
      email: email || 'missing', 
      password: password ? '***' : 'missing', 
      role: role || 'missing', 
      phone: phone || 'missing',
      verificationCode: verificationCode || 'missing',
      tokenExpiry: tokenExpiry || 'missing'
    });

    // Validate required fields
    if (!email || !password || !role || !verificationCode) {
      console.log('❌ Validation failed: Missing fields', { 
        email: email || 'missing', 
        password: password ? '***' : 'missing', 
        role: role || 'missing', 
        verificationCode: verificationCode || 'missing' 
      });
      return res.status(400).json({
        success: false,
        error: "جميع الحقول مطلوبة"
      });
    }

    // Validate role is valid
    if (role !== 'buyer' && role !== 'seller') {
      console.log('❌ Invalid role value:', role);
      return res.status(400).json({
        success: false,
        error: "نوع الحساب غير صالح"
      });
    }

    const { db, auth } = initializeFirebase();

    // Check if email already exists in Auth
    try {
      const authUser = await auth.getUserByEmail(email);
      if (authUser) {
        return res.status(400).json({
          success: false,
          error: "البريد الإلكتروني مستخدم بالفعل"
        });
      }
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Also check if email exists in final users collection
    const usersRef = db.collection('users');
    const userSnapshot = await usersRef.where('email', '==', email).get();
    if (!userSnapshot.empty) {
      return res.status(400).json({
        success: false,
        error: "البريد الإلكتروني مستخدم بالفعل"
      });
    }

    // Check/update pending registration
    const pendingRef = db.collection('pending_registrations');
    const existingSnapshot = await pendingRef.where('email', '==', email).get();

    const pendingData = {
      email,
      password,
      role,
      phone: phone || "",
      verificationCode,
      tokenExpiry: tokenExpiry || Date.now() + 15 * 60 * 1000,
      createdAt: Date.now()
    };

    if (!existingSnapshot.empty) {
      const docId = existingSnapshot.docs[0].id;
      await pendingRef.doc(docId).set(pendingData, { merge: true });
    } else {
      await pendingRef.add(pendingData);
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Pending registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to create pending registration' 
    });
  }
}
