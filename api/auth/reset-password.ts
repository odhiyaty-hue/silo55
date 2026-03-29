
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

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
    throw new Error('Missing Firebase credentials');
  }

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
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: "جميع الحقول مطلوبة" 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" 
      });
    }

    const { db, auth } = initializeFirebase();

    const usersRef = db.collection('users');
    const usersSnapshot = await usersRef.where('email', '==', email).get();
    
    if (usersSnapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        error: "المستخدم غير موجود" 
      });
    }

    const userDoc = usersSnapshot.docs[0];
    const user = { uid: userDoc.id, ...userDoc.data() };

    const resetDocRef = db.collection('password_resets').doc(user.uid);
    const resetDocSnapshot = await resetDocRef.get();

    if (!resetDocSnapshot.exists) {
      return res.status(400).json({ 
        success: false, 
        error: "لم يتم طلب إعادة تعيين كلمة المرور" 
      });
    }

    const resetDoc = resetDocSnapshot.data();

    if (resetDoc?.code !== code) {
      return res.status(400).json({ 
        success: false, 
        error: "كود التحقق غير صحيح" 
      });
    }

    const expiryTime = typeof resetDoc?.expiry === 'number' ? resetDoc.expiry : parseInt(resetDoc?.expiry);
    if (expiryTime < Date.now()) {
      await resetDocRef.delete();
      return res.status(400).json({ 
        success: false, 
        error: "انتهت صلاحية كود التحقق" 
      });
    }

    await auth.updateUser(user.uid, { password: newPassword });
    await resetDocRef.delete();

    return res.json({ 
      success: true, 
      message: "تم تغيير كلمة المرور بنجاح" 
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return res.status(500).json({ 
      success: false, 
      error: "حدث خطأ غير متوقع" 
    });
  }
}
