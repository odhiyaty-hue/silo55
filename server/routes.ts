import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fs from "fs";
import path from "path";
import { sendVerificationEmail, sendResetPasswordEmail, sendOrderConfirmationEmail, sendAdminNotificationEmail } from "./services/emailService";
import { adminAuth, adminDb } from "./firebase-admin";

const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY;

// Helper to query Firestore via REST API
async function queryFirestore(collectionName: string, filters: Array<{ field: string; op: string; value: any }> = []) {
  try {
    const body: any = {
      structuredQuery: {
        from: [{ collectionId: collectionName }],
      }
    };

    if (filters.length > 0) {
      const conditions = filters.map((f: any) => ({
        fieldFilter: {
          field: { fieldPath: f.field },
          op: f.op,
          value: { stringValue: f.value }
        }
      }));
      body.structuredQuery.where = { compositeFilter: { op: "AND", filters: conditions } };
    }

    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": FIREBASE_API_KEY || ""
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      console.error(`Firestore API error: ${response.status} ${await response.text()}`);
      return [];
    }

    const data = await response.json();
    const results: any[] = [];

    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.document) {
          results.push({
            id: item.document.name.split('/').pop(),
            ...extractDocumentData(item.document.fields)
          });
        }
      }
    }

    return results;
  } catch (error: any) {
    console.error(`Error querying Firestore:`, error?.message);
    return [];
  }
}

// Helper to get a single document
async function getDocument(collectionName: string, documentId: string) {
  try {
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionName}/${documentId}`,
      {
        method: "GET",
        headers: {
          "X-Goog-Api-Key": FIREBASE_API_KEY || ""
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const doc = await response.json();
    return {
      id: documentId,
      ...extractDocumentData(doc.fields)
    };
  } catch (error: any) {
    console.error(`Error getting document:`, error?.message);
    return null;
  }
}

// Helper to extract data from Firestore document fields
function extractDocumentData(fields: any): any {
  if (!fields) return {};

  const result: any = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = extractFieldValue(value);
  }
  return result;
}

// Helper to extract value from Firestore field value
function extractFieldValue(value: any): any {
  if (!value) return null;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return parseFloat(value.doubleValue);
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.arrayValue !== undefined) {
    return value.arrayValue.values?.map((v: any) => extractFieldValue(v)) || [];
  }
  if (value.mapValue !== undefined) {
    return extractDocumentData(value.mapValue.fields);
  }
  if (value.timestampValue !== undefined) {
    return new Date(value.timestampValue).getTime();
  }
  return value;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint to diagnose Firebase Admin status
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      firebase: {
        adminAuth: adminAuth ? "initialized" : "not initialized",
        adminDb: adminDb ? "initialized" : "not initialized",
      },
      env: {
        hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
        hasProjectId: !!process.env.VITE_FIREBASE_PROJECT_ID,
        hasApiKey: !!process.env.VITE_FIREBASE_API_KEY,
        hasResendKey: !!process.env.RESEND_API_KEY,
      },
      timestamp: new Date().toISOString()
    });
  });

  // Get sheep listings (public endpoint for guests and users)
  app.get("/api/sheep", async (req, res) => {
    try {
      const approved = req.query.approved === "true";
      console.log(`🐑 Fetching ${approved ? "approved" : "all"} sheep...`);

      // Use REST API with a direct Firestore query
      const body: any = {
        structuredQuery: {
          from: [{ collectionId: "sheep" }]
        }
      };

      if (approved) {
        body.structuredQuery.where = {
          fieldFilter: {
            field: { fieldPath: "status" },
            op: "EQUAL",
            value: { stringValue: "approved" }
          }
        };
      }

      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": FIREBASE_API_KEY || ""
          },
          body: JSON.stringify(body)
        }
      );

      let data = [];
      if (response.ok) {
        const result = await response.json();
        if (Array.isArray(result)) {
          data = result.filter((item: any) => item.document).map((item: any) => ({
            id: item.document.name.split('/').pop(),
            ...extractDocumentData(item.document.fields)
          }));
        }
      }

      console.log(`✅ Found ${data.length} ${approved ? "approved" : ""} sheep`);
      res.json(data);
    } catch (error: any) {
      console.error("❌ Error:", error?.message);
      res.json([]);
    }
  });

  // Backward compatibility: Get approved sheep listings
  app.get("/api/sheep/approved", async (req, res) => {
    try {
      console.log("🐑 Fetching approved sheep...");

      // Use REST API with a direct Firestore query
      const body = {
        structuredQuery: {
          from: [{ collectionId: "sheep" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "status" },
              op: "EQUAL",
              value: { stringValue: "approved" }
            }
          }
        }
      };

      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": FIREBASE_API_KEY || ""
          },
          body: JSON.stringify(body)
        }
      );

      let data = [];
      if (response.ok) {
        const result = await response.json();
        if (Array.isArray(result)) {
          data = result.filter((item: any) => item.document).map((item: any) => ({
            id: item.document.name.split('/').pop(),
            ...extractDocumentData(item.document.fields)
          }));
        }
      }

      console.log(`✅ Found ${data.length} approved sheep`);
      res.json(data);
    } catch (error: any) {
      console.error("❌ Error:", error?.message);
      res.json([]);
    }
  });

  // Get single sheep by ID (public endpoint for guests and users)
  app.get("/api/sheep/:id", async (req, res) => {
    try {
      console.log(`🐑 Fetching sheep ${req.params.id}...`);

      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/sheep/${req.params.id}`,
        {
          method: "GET",
          headers: {
            "X-Goog-Api-Key": FIREBASE_API_KEY || ""
          }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`⚠️ Sheep ${req.params.id} not found`);
          return res.status(404).json({ error: "Sheep not found" });
        }
        const errorText = await response.text();
        console.error(`❌ Firestore API error: ${response.status} ${errorText}`);
        return res.status(500).json({ error: "Failed to fetch sheep" });
      }

      const doc = await response.json();
      const data = extractDocumentData(doc.fields);

      // Only return if approved
      if (data?.status !== "approved") {
        console.log(`⚠️ Sheep ${req.params.id} status is ${data?.status}, not approved`);
        return res.status(403).json({ error: "This listing is not available" });
      }

      console.log(`✅ Returning sheep ${req.params.id}`);
      res.json({
        id: req.params.id,
        ...data
      });
    } catch (error: any) {
      console.error(`❌ Error fetching sheep ${req.params.id}:`, error?.message || error);
      res.status(500).json({ error: "Failed to fetch sheep", details: error?.message });
    }
  });

  // Store pending registration (before email verification)
  app.post("/api/auth/pending-registration", async (req, res) => {
    try {
      const { email, password, role, phone, verificationCode, tokenExpiry } = req.body;
      console.log('💾 Creating pending registration for:', email);

      // Validate required fields
      if (!email || !password || !role || !verificationCode || !tokenExpiry) {
        console.log('❌ Missing fields:', { 
          email: !!email, 
          password: !!password, 
          role: !!role, 
          verificationCode: !!verificationCode, 
          tokenExpiry: !!tokenExpiry 
        });
        return res.status(400).json({
          success: false,
          error: "جميع الحقول مطلوبة"
        });
      }

      if (!adminAuth || !adminDb) {
        console.warn('⚠️ Firebase Admin not configured - using fallback registration');
        // Fallback: store to Firestore without Auth check
        try {
          // Check for existing user in Firestore collection even if Auth is missing
          const pendingRef = adminDb?.collection('pending_registrations');
          if (!pendingRef) throw new Error("adminDb is not available");

          const existingSnapshot = await pendingRef.where('email', '==', email).get();
          
          const pendingData = {
            email,
            password,
            role,
            phone: phone || "",
            verificationCode,
            tokenExpiry,
            createdAt: Date.now()
          };

          if (!existingSnapshot.empty) {
            const docId = existingSnapshot.docs[0].id;
            await pendingRef.doc(docId).set(pendingData);
            console.log('✅ Updated pending registration (fallback mode)');
          } else {
            await pendingRef.add(pendingData);
            console.log('✅ Created pending registration (fallback mode)');
          }
          return res.json({ success: true });
        } catch (fallbackError: any) {
          console.error('❌ Fallback registration error:', fallbackError?.message);
          return res.status(503).json({
            success: false,
            error: "خدمة التسجيل غير متاحة حالياً"
          });
        }
      }

      // Check if email already exists in Firebase Auth
      try {
        const authUser = await adminAuth.getUserByEmail(email);
        if (authUser) {
          return res.status(400).json({
            success: false,
            error: "البريد الإلكتروني مستخدم بالفعل"
          });
        }
      } catch (authError: any) {
        // Only allow 'user-not-found' error, which means email is available
        if (authError.code && authError.code !== 'auth/user-not-found') {
          console.error('❌ Firebase Auth error:', authError.code, authError.message);
          throw authError;
        }
        // If user not found, continue with registration
      }

      // Check if pending registration already exists using Admin SDK
      const pendingRef = adminDb.collection('pending_registrations');
      const existingSnapshot = await pendingRef.where('email', '==', email).get();

      const pendingData = {
        email,
        password,
        role,
        phone: phone || "",
        verificationCode,
        tokenExpiry,
        createdAt: Date.now()
      };

      if (!existingSnapshot.empty) {
        // Update existing pending registration
        const docId = existingSnapshot.docs[0].id;
        await pendingRef.doc(docId).set(pendingData);
        console.log('✅ Updated existing pending registration');
      } else {
        // Create new pending registration
        await pendingRef.add(pendingData);
        console.log('✅ Created new pending registration');
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("❌ Pending registration error:", error?.message || error);
      res.status(500).json({ 
        success: false, 
        error: error?.message || "فشل في إنشاء التسجيل" 
      });
    }
  });

  // Complete registration after email verification
  app.post("/api/auth/complete-registration", async (req, res) => {
    try {
      const { code, email } = req.body;
      console.log('🔐 Complete registration request:', { email, code: code ? 'present' : 'missing' });

      if (!code || !email) {
        return res.status(400).json({ 
          success: false, 
          error: "Code and email required" 
        });
      }

      if (!adminAuth || !adminDb) {
        console.warn('⚠️ Firebase Admin not configured - using fallback completion');
        try {
          const pendingRef = adminDb?.collection('pending_registrations');
          if (!pendingRef) throw new Error("adminDb is not available");

          const snapshot = await pendingRef
            .where('email', '==', email)
            .where('verificationCode', '==', code)
            .get();

          if (snapshot.empty) {
            return res.status(400).json({
              success: false,
              error: "كود التحقق غير صحيح"
            });
          }

          const pendingData = snapshot.docs[0].data();
          if (pendingData.tokenExpiry < Date.now()) {
            return res.status(400).json({
              success: false,
              error: "انتهت صلاحية الكود"
            });
          }

          return res.json({ success: true, message: "Verification successful (fallback)" });
        } catch (fallbackError: any) {
          console.error('❌ Fallback completion error:', fallbackError?.message);
          return res.status(503).json({
            success: false,
            error: "خدمة التحقق غير متاحة حالياً"
          });
        }
      }

      // Get pending registration using Admin SDK
      const pendingRef = adminDb.collection('pending_registrations');
      const snapshot = await pendingRef.where('email', '==', email).get();

      if (snapshot.empty) {
        console.log('❌ No pending registration found for:', email);
        return res.status(404).json({ 
          success: false, 
          error: "Pending registration not found" 
        });
      }

      const pendingDoc = snapshot.docs[0];
      const pending = pendingDoc.data();

      console.log('✅ Found pending registration');
      console.log('Expected code:', pending.verificationCode);
      console.log('Received code:', code);

      // Verify code
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

      // Create user in Firebase Auth
      console.log('🔐 Creating Firebase Auth user...');
      const authUser = await adminAuth.createUser({
        email: pending.email,
        password: pending.password,
        emailVerified: true
      });

      console.log('✅ Firebase Auth user created:', authUser.uid);

      // Create user document in Firestore using Admin SDK
      console.log('💾 Creating Firestore user document...');
      await adminDb.collection('users').doc(authUser.uid).set({
        uid: authUser.uid,
        email: pending.email,
        role: pending.role,
        phone: pending.phone,
        emailVerified: true,
        createdAt: Date.now()
      });

      console.log('✅ Firestore user document created');

      // Delete pending registration using Admin SDK
      await pendingDoc.ref.delete();
      console.log('✅ Pending registration deleted');

      console.log('✅ Registration completed successfully');
      res.json({ 
        success: true, 
        message: "Registration completed successfully" 
      });
    } catch (error: any) {
      console.error("❌ Complete registration error:", error?.message);
      res.status(500).json({ 
        success: false, 
        error: error?.message || "Failed to complete registration" 
      });
    }
  });

  // Resend verification code for pending registration
  app.post("/api/auth/resend-pending-verification", async (req, res) => {
    try {
      const { email } = req.body;
      console.log('🔄 Resend pending verification for:', email);

      if (!adminDb) {
        return res.status(503).json({
          success: false,
          error: "Firebase Admin not configured. Please contact administrator."
        });
      }

      // Get pending registration using Admin SDK
      const pendingRef = adminDb.collection('pending_registrations');
      const snapshot = await pendingRef.where('email', '==', email).get();

      if (snapshot.empty) {
        return res.status(404).json({ 
          success: false, 
          error: "Pending registration not found" 
        });
      }

      const pendingDoc = snapshot.docs[0];

      // Generate new code
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      const tokenExpiry = Date.now() + (15 * 60 * 1000);

      // Update pending registration using Admin SDK
      await pendingDoc.ref.update({
        verificationCode: newCode,
        tokenExpiry: tokenExpiry
      });

      console.log('✅ Updated verification code');

      // Send email
      const emailResult = await sendVerificationEmail(email, newCode);

      if (emailResult.success) {
        res.json({ success: true, message: "New verification code sent" });
      } else {
        res.status(500).json({ success: false, error: emailResult.error });
      }
    } catch (error: any) {
      console.error("❌ Resend error:", error?.message);
      res.status(500).json({ success: false, error: error?.message });
    }
  });

  // Cancel pending registration
  app.post("/api/auth/cancel-pending-registration", async (req, res) => {
    try {
      const { email } = req.body;
      console.log('🗑️ Cancel pending registration for:', email);

      if (!adminDb) {
        return res.status(503).json({
          success: false,
          error: "Firebase Admin not configured. Please contact administrator."
        });
      }

      // Get and delete pending registration using Admin SDK
      const pendingRef = adminDb.collection('pending_registrations');
      const snapshot = await pendingRef.where('email', '==', email).get();

      if (!snapshot.empty) {
        await snapshot.docs[0].ref.delete();
        console.log('✅ Deleted pending registration');
      }

      res.json({ success: true, message: "Pending registration canceled" });
    } catch (error: any) {
      console.error("❌ Cancel error:", error?.message);
      res.status(500).json({ success: false, error: error?.message });
    }
  });

  // Send verification email with code
  app.post("/api/auth/send-verification", async (req, res) => {
    try {
      const { email, code } = req.body;
      console.log('📧 Sending verification code to:', email);

      const result = await sendVerificationEmail(email, code);

      if (result.success) {
        res.json({ success: true, message: "Verification code sent" });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      console.error("❌ Send verification error:", error?.message);
      res.status(500).json({ success: false, error: error?.message });
    }
  });

  // Request password reset - sends code to email
  app.post("/api/auth/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;
      console.log('🔐 Password reset request for:', email);

      if (!email) {
        return res.status(400).json({ 
          success: false, 
          error: "البريد الإلكتروني مطلوب" 
        });
      }

      if (!adminDb) {
        console.error('❌ Firebase Admin not configured');
        return res.status(503).json({
          success: false,
          error: "خدمة إعادة تعيين كلمة المرور غير متاحة حالياً"
        });
      }

      // Check if user exists in Firestore using Admin SDK
      const usersRef = adminDb.collection('users');
      const usersSnapshot = await usersRef.where('email', '==', email).get();
      
      if (usersSnapshot.empty) {
        // Don't reveal if email exists for security
        console.log('⚠️ User not found:', email);
        return res.json({ 
          success: true, 
          message: "إذا كان البريد الإلكتروني مسجلاً، سيتم إرسال كود التحقق" 
        });
      }

      const userDoc = usersSnapshot.docs[0];
      const user = { uid: userDoc.id, ...userDoc.data() };
      console.log('✅ User found:', user.uid);

      // Generate reset code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const tokenExpiry = Date.now() + (15 * 60 * 1000); // 15 minutes

      // Store reset code in Firestore using Admin SDK
      await adminDb.collection('password_resets').doc(user.uid).set({
        email: email,
        code: resetCode,
        expiry: tokenExpiry,
        createdAt: Date.now()
      });

      console.log('✅ Reset code stored successfully');

      // Send reset email
      const emailResult = await sendResetPasswordEmail(email, resetCode);

      if (emailResult.success) {
        console.log('✅ Password reset code sent');
        res.json({ 
          success: true, 
          message: "تم إرسال كود التحقق إلى بريدك الإلكتروني" 
        });
      } else {
        console.error('❌ Failed to send reset email:', emailResult.error);
        res.status(500).json({ 
          success: false, 
          error: "فشل في إرسال البريد الإلكتروني" 
        });
      }
    } catch (error: any) {
      console.error("❌ Password reset request error:", error?.message);
      res.status(500).json({ 
        success: false, 
        error: "حدث خطأ غير متوقع" 
      });
    }
  });

  // Verify reset code and update password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;
      console.log('🔐 Reset password request for:', email);

      // Check if Firebase Admin is available first
      if (!adminAuth || !adminDb) {
        console.error('❌ Firebase Admin SDK not available');
        return res.status(503).json({ 
          success: false, 
          error: "خدمة إعادة تعيين كلمة المرور غير متاحة حالياً. يرجى المحاولة لاحقاً." 
        });
      }

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

      // Get user from Firestore using Admin SDK
      const usersRef = adminDb.collection('users');
      const usersSnapshot = await usersRef.where('email', '==', email).get();
      
      if (usersSnapshot.empty) {
        console.log('❌ User not found:', email);
        return res.status(404).json({ 
          success: false, 
          error: "المستخدم غير موجود" 
        });
      }

      const userDoc = usersSnapshot.docs[0];
      const user = { uid: userDoc.id, ...userDoc.data() };
      console.log('✅ User found:', user.uid);

      // Get reset code from Firestore using Admin SDK
      const resetDocRef = adminDb.collection('password_resets').doc(user.uid);
      const resetDocSnapshot = await resetDocRef.get();
      console.log('📄 Reset document:', resetDocSnapshot.exists ? 'found' : 'not found');

      if (!resetDocSnapshot.exists) {
        return res.status(400).json({ 
          success: false, 
          error: "لم يتم طلب إعادة تعيين كلمة المرور. يرجى طلب كود جديد." 
        });
      }

      const resetDoc = resetDocSnapshot.data();

      // Verify code
      if (resetDoc?.code !== code) {
        console.log('❌ Invalid code. Expected:', resetDoc?.code, 'Got:', code);
        return res.status(400).json({ 
          success: false, 
          error: "كود التحقق غير صحيح" 
        });
      }

      // Check expiry
      const expiryTime = typeof resetDoc?.expiry === 'number' ? resetDoc.expiry : parseInt(resetDoc?.expiry);
      if (expiryTime < Date.now()) {
        console.log('❌ Code expired. Expiry:', expiryTime, 'Now:', Date.now());
        // Delete expired reset code using Admin SDK
        await resetDocRef.delete();
        return res.status(400).json({ 
          success: false, 
          error: "انتهت صلاحية كود التحقق. يرجى طلب كود جديد." 
        });
      }

      console.log('✅ Code verified, updating password...');

      // Update password using Firebase Admin SDK
      try {
        await adminAuth.updateUser(user.uid, { password: newPassword });
        console.log('✅ Password updated via Admin SDK');
      } catch (adminError: any) {
        console.error('❌ Admin SDK error:', adminError?.message);
        return res.status(500).json({ 
          success: false, 
          error: "فشل في تحديث كلمة المرور. يرجى المحاولة لاحقاً." 
        });
      }

      // Delete reset code after successful password update using Admin SDK
      await resetDocRef.delete();

      console.log('✅ Password reset completed successfully');
      res.json({ 
        success: true, 
        message: "تم تغيير كلمة المرور بنجاح" 
      });
    } catch (error: any) {
      console.error("❌ Reset password error:", error?.message);
      res.status(500).json({ 
        success: false, 
        error: "حدث خطأ غير متوقع" 
      });
    }
  });

  // Resend password reset code
  app.post("/api/auth/resend-reset-code", async (req, res) => {
    try {
      const { email } = req.body;
      console.log('🔄 Resend reset code for:', email);

      if (!email) {
        return res.status(400).json({ 
          success: false, 
          error: "البريد الإلكتروني مطلوب" 
        });
      }

      // Check if user exists
      const usersQuery = await queryFirestore('users', [{ field: 'email', op: 'EQUAL', value: email }]);
      
      if (usersQuery.length === 0) {
        return res.json({ 
          success: true, 
          message: "إذا كان البريد الإلكتروني مسجلاً، سيتم إرسال كود جديد" 
        });
      }

      const user = usersQuery[0];

      // Generate new reset code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const tokenExpiry = Date.now() + (15 * 60 * 1000);

      // Update reset code in Firestore
      const resetData = {
        fields: {
          email: { stringValue: email },
          code: { stringValue: resetCode },
          expiry: { integerValue: tokenExpiry.toString() },
          createdAt: { integerValue: Date.now().toString() }
        }
      };

      await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/password_resets/${user.uid}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": FIREBASE_API_KEY || ""
          },
          body: JSON.stringify(resetData)
        }
      );

      // Send reset email
      const emailResult = await sendResetPasswordEmail(email, resetCode);

      if (emailResult.success) {
        res.json({ 
          success: true, 
          message: "تم إرسال كود جديد" 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: "فشل في إرسال البريد الإلكتروني" 
        });
      }
    } catch (error: any) {
      console.error("❌ Resend reset code error:", error?.message);
      res.status(500).json({ 
        success: false, 
        error: "حدث خطأ غير متوقع" 
      });
    }
  });

  // Send order confirmation
  app.post("/api/orders/send-confirmation", async (req, res) => {
    try {
      const { email, orderData } = req.body;
      if (!email || !orderData) {
        return res.status(400).json({ error: "Email and order data required" });
      }

      const result = await sendOrderConfirmationEmail(email, orderData);

      // Also send notification to admin
      await sendAdminNotificationEmail(orderData);

      res.json(result);
    } catch (error: any) {
      console.error("❌ Send confirmation error:", error?.message);
      res.status(500).json({ error: error?.message });
    }
  });

  // Resend verification code
  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      console.log('🔄 Resend verification request for:', email);

      if (!email) {
        return res.status(400).json({ 
          success: false, 
          error: "Email required" 
        });
      }

      // Get user from storage
      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: "User not found" 
        });
      }

      // Check if already verified
      if (user.emailVerified) {
        return res.json({ 
          success: true, 
          message: "Email already verified" 
        });
      }

      // Generate new verification code
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      const tokenExpiry = Date.now() + (15 * 60 * 1000); // 15 minutes

      // Update user with new code
      await storage.updateUser(user.uid, {
        emailVerificationToken: newCode,
        emailVerificationTokenExpiry: tokenExpiry
      });

      // Send new verification email
      const emailResult = await sendVerificationEmail(email, newCode);

      if (emailResult.success) {
        console.log('✅ New verification code sent to:', email);
        res.json({ 
          success: true, 
          message: "New verification code sent" 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: emailResult.error || "Failed to send email" 
        });
      }
    } catch (error: any) {
      console.error("❌ Resend verification error:", error?.message);
      res.status(500).json({ 
        success: false, 
        error: "An error occurred. Please try again." 
      });
    }
  });

  // Delete unverified account
  app.post("/api/auth/delete-unverified", async (req, res) => {
    try {
      const { email } = req.body;
      console.log('🗑️ Delete unverified account request for:', email);

      if (!email) {
        return res.status(400).json({ 
          success: false, 
          error: "Email required" 
        });
      }

      if (!adminAuth) {
        return res.status(503).json({
          success: false,
          error: "Firebase Admin not configured. Please contact administrator."
        });
      }

      // Get user from storage
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        console.log('⚠️ User not found in Firestore, checking Firebase Auth...');
        
        // Try to find and delete from Firebase Auth directly
        try {
          const authUser = await adminAuth.getUserByEmail(email);
          if (authUser && !authUser.emailVerified) {
            await adminAuth.deleteUser(authUser.uid);
            console.log('✅ Deleted unverified user from Firebase Auth:', authUser.uid);
          }
        } catch (authError: any) {
          if (authError.code === 'auth/user-not-found') {
            console.log('✅ User not found in Firebase Auth either');
          }
        }
        
        return res.json({ 
          success: true, 
          message: "Account cleared" 
        });
      }

      // Only delete if not verified
      if (user.emailVerified) {
        console.log('❌ Cannot delete verified account');
        return res.status(403).json({ 
          success: false, 
          error: "Cannot delete verified account" 
        });
      }

      console.log('🗑️ Deleting unverified account:', user.uid);

      // Delete from Firebase Auth using Admin SDK
      try {
        await adminAuth.deleteUser(user.uid);
        console.log('✅ Deleted from Firebase Auth:', user.uid);
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found') {
          console.log('⚠️ User not found in Firebase Auth');
        } else {
          console.error('❌ Error deleting from Firebase Auth:', authError.message);
        }
      }

      // Delete from Firestore
      const deleteDocResponse = await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${user.uid}`,
        {
          method: "DELETE",
          headers: {
            "X-Goog-Api-Key": FIREBASE_API_KEY || ""
          }
        }
      );

      if (!deleteDocResponse.ok && deleteDocResponse.status !== 404) {
        console.error('❌ Failed to delete Firestore document');
      } else {
        console.log('✅ Deleted from Firestore');
      }

      console.log('✅ Unverified account deleted completely');
      res.json({ 
        success: true, 
        message: "Account deleted successfully" 
      });
    } catch (error: any) {
      console.error("❌ Delete account error:", error?.message);
      res.status(500).json({ 
        success: false, 
        error: "Failed to delete account" 
      });
    }
  });

  // Verify email code
  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { code, email } = req.body;
      console.log('🔐 Verify request:', { email, code: code ? 'present' : 'missing' });

      if (!code || !email) {
        console.log('❌ Missing code or email');
        return res.status(400).json({ 
          success: false, 
          error: "Code and email required" 
        });
      }

      // Get user from storage
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        console.log('❌ User not found for email:', email);
        return res.status(404).json({ 
          success: false, 
          error: "User not found" 
        });
      }

      console.log('👤 Found user:', user.uid);
      console.log('📧 Email verified status:', user.emailVerified);
      console.log('🔑 Has verification token:', !!user.emailVerificationToken);

      // Check if already verified
      if (user.emailVerified) {
        console.log('✅ Email already verified');
        return res.json({ 
          success: true, 
          message: "Email already verified" 
        });
      }

      // Check code validity
      if (!user.emailVerificationToken) {
        console.log('❌ No verification code found');
        return res.status(400).json({ 
          success: false, 
          error: "Invalid verification code" 
        });
      }

      if (user.emailVerificationToken !== code) {
        console.log('❌ Code mismatch');
        console.log('Expected:', user.emailVerificationToken);
        console.log('Received:', code);
        return res.status(400).json({ 
          success: false, 
          error: "Invalid verification code" 
        });
      }

      if (user.emailVerificationTokenExpiry && user.emailVerificationTokenExpiry < Date.now()) {
        console.log('❌ Code expired');
        return res.status(400).json({ 
          success: false, 
          error: "Verification code expired. Please request a new verification code." 
        });
      }

      // Update user to mark email as verified
      console.log('📝 Updating user verification status...');
      await storage.updateUser(user.uid, {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null
      });

      console.log('✅ Email verified successfully for:', email);
      res.json({ 
        success: true, 
        message: "Email verified successfully" 
      });
    } catch (error: any) {
      console.error("❌ Email verification error:", error?.message || error);
      res.status(500).json({ 
        success: false, 
        error: "An error occurred during verification. Please try again." 
      });
    }
  });

  // Serve municipalities data with proper JSON content-type
  app.get("/api/municipalities", async (req, res) => {
    try {
      const filePath = path.resolve(import.meta.dirname, "..", "public", "data", "municipalities.json");
      const data = await fs.promises.readFile(filePath, "utf-8");

      res.set("Content-Type", "application/json");
      res.send(data);
    } catch (error: any) {
      console.error("❌ Error loading municipalities:", error?.message);
      res.status(500).json({ error: "Failed to load municipalities data" });
    }
  });

  app.patch("/api/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Enforcement of once-per-year limit for nationalId on imported sheep orders
      if (updateData.nationalId) {
        const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
        console.log(`🔍 Checking nationalId limit for ${updateData.nationalId}...`);
        const existingOrders = await queryFirestore("orders", [
          { field: "nationalId", op: "EQUAL", value: updateData.nationalId }
        ]);

        console.log(`📋 Found ${existingOrders.length} existing orders with this nationalId`);

        const recentOrder = existingOrders.find(o =>
          o.id !== id &&
          o.createdAt > oneYearAgo &&
          (o.status === 'confirmed' || o.status === 'delivered' || o.status === 'pending')
        );

        if (recentOrder) {
          console.log(`❌ Recent order found: ${recentOrder.id}`);
          return res.status(400).json({
            error: "لا يمكن استخدام رقم التعريف الوطني أكثر من مرة في السنة الواحدة للأضاحي المستوردة"
          });
        }
      }

      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/orders/${id}?updateMask.fieldPaths=${Object.keys(updateData).join('&updateMask.fieldPaths=')}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": FIREBASE_API_KEY || ""
          },
          body: JSON.stringify({ fields: convertToFirestoreFields(updateData) })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Firestore update error: ${response.status} ${errorText}`);
        return res.status(response.status).json({ error: "Failed to update order" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("❌ Order update error:", error?.message);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Helper to convert data to Firestore fields (duplicated from storage.ts if needed, or ensure it's accessible)
  function convertToFirestoreFields(data: any): any {
    const fields: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) continue;
      if (typeof value === 'string') {
        fields[key] = { stringValue: value };
      } else if (typeof value === 'number') {
        fields[key] = { doubleValue: value };
      } else if (typeof value === 'boolean') {
        fields[key] = { booleanValue: value };
      }
    }
    return fields;
  }

  const httpServer = createServer(app);

  return httpServer;
}