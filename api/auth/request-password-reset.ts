
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin with proper error handling
function initializeFirebase() {
  if (getApps().length > 0) {
    return { db: getFirestore(getApps()[0]) };
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

  return { db: getFirestore(app) };
}

async function sendResetPasswordEmail(email: string, code: string) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@odhiyaty.com',
        to: email,
        subject: 'إعادة تعيين كلمة المرور - أضحيتي',
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #4CAF50;">إعادة تعيين كلمة المرور</h2>
            <p>كود التحقق: <strong style="font-size: 24px; color: #D97706;">${code}</strong></p>
            <p>صالح لمدة 15 دقيقة</p>
          </div>
        `,
      }),
    });

    return response.ok;
  } catch (error: any) {
    console.error('Email send error:', error);
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: "البريد الإلكتروني مطلوب" 
      });
    }

    const { db } = initializeFirebase();

    const usersRef = db.collection('users');
    const usersSnapshot = await usersRef.where('email', '==', email).get();
    
    if (usersSnapshot.empty) {
      return res.json({ 
        success: true, 
        message: "إذا كان البريد الإلكتروني مسجلاً، سيتم إرسال كود التحقق" 
      });
    }

    const userDoc = usersSnapshot.docs[0];
    const user = { uid: userDoc.id, ...userDoc.data() };

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenExpiry = Date.now() + (15 * 60 * 1000);

    await db.collection('password_resets').doc(user.uid).set({
      email: email,
      code: resetCode,
      expiry: tokenExpiry,
      createdAt: Date.now()
    });

    const emailSent = await sendResetPasswordEmail(email, resetCode);

    if (emailSent) {
      return res.json({ 
        success: true, 
        message: "تم إرسال كود التحقق إلى بريدك الإلكتروني" 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        error: "فشل في إرسال البريد الإلكتروني" 
      });
    }
  } catch (error: any) {
    console.error("Password reset request error:", error);
    return res.status(500).json({ 
      success: false, 
      error: "حدث خطأ غير متوقع" 
    });
  }
}
