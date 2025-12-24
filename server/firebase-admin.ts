import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;

function formatPrivateKey(key: string): string {
  let formattedKey = key;
  formattedKey = formattedKey.replace(/\\n/g, '\n');
  formattedKey = formattedKey.replace(/"/g, '');
  if (!formattedKey.includes('-----BEGIN')) {
    formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----\n`;
  }
  return formattedKey;
}

// Initialize Firebase Admin only if service account is provided
if (getApps().length === 0) {
  try {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    // Support both full JSON service account and individual credentials
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log('🔧 Parsing FIREBASE_SERVICE_ACCOUNT...');
      let serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
      
      // Handle base64 encoded JSON (useful for Vercel)
      try {
        // Check if it's base64 encoded
        if (!serviceAccountJson.startsWith('{')) {
          console.log('📦 Detected base64 encoded service account, decoding...');
          serviceAccountJson = Buffer.from(serviceAccountJson, 'base64').toString('utf-8');
        }
      } catch (decodeError) {
        console.log('ℹ️ Not base64 encoded, using as-is');
      }
      
      // Parse the JSON
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(serviceAccountJson);
      } catch (parseError: any) {
        console.error('❌ Failed to parse service account JSON:', parseError?.message);
        console.error('📝 First 100 chars of input:', serviceAccountJson?.substring(0, 100));
        throw new Error('Invalid service account JSON format');
      }
      
      // Validate required fields
      if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
        console.error('❌ Missing required fields in service account');
        console.log('📋 Has project_id:', !!serviceAccount.project_id);
        console.log('📋 Has private_key:', !!serviceAccount.private_key);
        console.log('📋 Has client_email:', !!serviceAccount.client_email);
        throw new Error('Service account missing required fields');
      }
      
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
      });
      
      adminAuth = getAuth(adminApp);
      adminDb = getFirestore(adminApp);
      console.log('✅ Firebase Admin initialized with service account JSON');
      console.log('📧 Using client email:', serviceAccount.client_email);
    } else if (privateKey && clientEmail && projectId) {
      // Build service account from individual environment variables
      const formattedPrivateKey = formatPrivateKey(privateKey);
      
      const serviceAccount = {
        type: 'service_account',
        project_id: projectId,
        private_key: formattedPrivateKey,
        client_email: clientEmail,
      };
      
      console.log('🔧 Attempting to initialize with individual credentials...');
      console.log('📧 Client Email:', clientEmail);
      console.log('🔑 Private key format check:', formattedPrivateKey.substring(0, 30) + '...');
      
      adminApp = initializeApp({
        credential: cert(serviceAccount as any),
        projectId: projectId,
      });
      
      adminAuth = getAuth(adminApp);
      adminDb = getFirestore(adminApp);
      console.log('✅ Firebase Admin initialized with individual credentials');
    } else {
      console.warn('⚠️ Firebase Admin not initialized - credentials not provided');
      console.warn('⚠️ Required: FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, VITE_FIREBASE_PROJECT_ID');
      console.warn('⚠️ Some backend features may be limited');
    }
  } catch (error: any) {
    console.error('❌ Failed to initialize Firebase Admin:', error?.message || error);
    console.warn('⚠️ Some backend features may be limited');
  }
} else {
  adminApp = getApps()[0];
  adminAuth = getAuth(adminApp);
  adminDb = getFirestore(adminApp);
}

export { adminAuth, adminDb };
