// server/index-prod.ts
import fs2 from "node:fs";
import path2 from "node:path";
import express2 from "express";

// server/app.ts
import express from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
var FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;
var FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY;
function extractDocumentData(fields) {
  if (!fields) return {};
  const result = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = extractFieldValue(value);
  }
  return result;
}
function extractFieldValue(value) {
  if (!value) return null;
  if (value.stringValue !== void 0) return value.stringValue;
  if (value.integerValue !== void 0) return parseInt(value.integerValue);
  if (value.doubleValue !== void 0) return parseFloat(value.doubleValue);
  if (value.booleanValue !== void 0) return value.booleanValue;
  if (value.arrayValue !== void 0) {
    return value.arrayValue.values?.map((v) => extractFieldValue(v)) || [];
  }
  if (value.mapValue !== void 0) {
    return extractDocumentData(value.mapValue.fields);
  }
  if (value.timestampValue !== void 0) {
    return new Date(value.timestampValue).getTime();
  }
  return value;
}
function convertToFirestoreFields(data) {
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === void 0) continue;
    if (typeof value === "string") {
      fields[key] = { stringValue: value };
    } else if (typeof value === "number") {
      fields[key] = { integerValue: value };
    } else if (typeof value === "boolean") {
      fields[key] = { booleanValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map((v) => {
            if (typeof v === "string") return { stringValue: v };
            if (typeof v === "number") return { integerValue: v };
            if (typeof v === "boolean") return { booleanValue: v };
            return { stringValue: String(v) };
          })
        }
      };
    }
  }
  return fields;
}
var FirestoreStorage = class {
  async getUserByEmail(email) {
    try {
      console.log("\u{1F50D} Searching for user with email:", email);
      const body = {
        structuredQuery: {
          from: [{ collectionId: "users" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "email" },
              op: "EQUAL",
              value: { stringValue: email }
            }
          },
          limit: 1
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
      if (!response.ok) {
        console.error(`Firestore API error: ${response.status}`);
        return null;
      }
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0 && data[0].document) {
        const doc = data[0].document;
        const userData = {
          uid: doc.name.split("/").pop(),
          ...extractDocumentData(doc.fields)
        };
        console.log("\u2705 Found user:", userData.uid);
        return userData;
      }
      console.log("\u274C No user found with email:", email);
      return null;
    } catch (error) {
      console.error("Error getting user by email:", error?.message);
      return null;
    }
  }
  async updateUser(uid, data) {
    try {
      console.log("\u{1F4DD} Updating user:", uid, "with data:", data);
      const fields = convertToFirestoreFields(data);
      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=${Object.keys(data).join("&updateMask.fieldPaths=")}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": FIREBASE_API_KEY || ""
          },
          body: JSON.stringify({ fields })
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Firestore update error: ${response.status} ${errorText}`);
        throw new Error(`Failed to update user: ${response.status}`);
      }
      console.log("\u2705 User updated successfully");
    } catch (error) {
      console.error("Error updating user:", error?.message);
      throw error;
    }
  }
};
var storage = new FirestoreStorage();

// server/routes.ts
import fs from "fs";
import path from "path";

// server/services/emailService.ts
import { Resend } from "resend";
import nodemailer from "nodemailer";
var isDev = process.env.NODE_ENV !== "production";
var resend = new Resend(process.env.RESEND_API_KEY || "re_test_");
var smtpTransporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_PORT === "465",
    // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
}
async function sendEmail(options) {
  try {
    console.log("\u{1F4E7} Sending email via Resend to:", options.to);
    console.log("\u{1F511} Using API Key:", process.env.RESEND_API_KEY ? "\u2713 Available" : "\u2717 Missing");
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: options.to,
      subject: options.subject,
      html: options.html
    });
    if (result.error) {
      console.error("\u274C Resend error:", result.error);
      if (smtpTransporter && process.env.SMTP_FROM_EMAIL) {
        console.log("\u{1F4E7} Falling back to SMTP for:", options.to);
        try {
          const info = await smtpTransporter.sendMail({
            from: process.env.SMTP_FROM_EMAIL,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text
          });
          console.log("\u2705 Email sent via SMTP:", info.messageId);
          return { success: true, messageId: info.messageId };
        } catch (smtpError) {
          console.error("\u274C SMTP error:", smtpError?.message);
          return { success: false, error: smtpError?.message };
        }
      }
      return { success: false, error: result.error?.message };
    }
    console.log("\u2705 Email sent successfully via Resend:", result.data?.id);
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error("\u274C Email error:", error?.message);
    if (smtpTransporter && process.env.SMTP_FROM_EMAIL) {
      console.log("\u{1F4E7} Falling back to SMTP due to error:", options.to);
      try {
        const info = await smtpTransporter.sendMail({
          from: process.env.SMTP_FROM_EMAIL,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text
        });
        console.log("\u2705 Email sent via SMTP:", info.messageId);
        return { success: true, messageId: info.messageId };
      } catch (smtpError) {
        console.error("\u274C SMTP error:", smtpError?.message);
        return { success: false, error: smtpError?.message };
      }
    }
    return { success: false, error: error?.message };
  }
}
async function sendVerificationEmail(email, code) {
  console.log("\u{1F4E7} Sending verification code to:", email);
  console.log("\u{1F522} Verification code:", code);
  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>\u0643\u0648\u062F \u0627\u0644\u062A\u062D\u0642\u0642</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="background-color: #f5f5f5; padding: 20px;">
        <div style="background-color: white; padding: 40px; border-radius: 10px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a472a; margin: 0 0 10px 0; font-size: 28px;">\u0623\u0647\u0644\u0627\u064B \u0628\u0643 \u0641\u064A \u0623\u0636\u062D\u064A\u062A\u064A</h1>
            <p style="color: #666; margin: 0;">\u0645\u0646\u0635\u0629 \u0634\u0631\u0627\u0621 \u0648\u0628\u064A\u0639 \u0627\u0644\u0623\u0636\u0627\u062D\u064A \u0641\u064A \u0627\u0644\u062C\u0632\u0627\u0626\u0631</p>
          </div>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            \u0645\u0631\u062D\u0628\u0627\u064B\u060C
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            \u0634\u0643\u0631\u0627\u064B \u0644\u062A\u0633\u062C\u064A\u0644\u0643 \u0641\u064A \u0645\u0646\u0635\u0629 <strong>\u0623\u0636\u062D\u064A\u062A\u064A</strong>. \u0627\u0633\u062A\u062E\u062F\u0645 \u0643\u0648\u062F \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u062A\u0627\u0644\u064A \u0644\u062A\u0641\u0639\u064A\u0644 \u062D\u0633\u0627\u0628\u0643:
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <div style="display: inline-block; background: linear-gradient(135deg, #1a472a 0%, #2d6b3f 100%); padding: 25px 50px; border-radius: 12px; box-shadow: 0 4px 15px rgba(26, 71, 42, 0.3);">
              <p style="color: #fff; font-size: 14px; margin: 0 0 10px 0; opacity: 0.9;">\u0643\u0648\u062F \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u062E\u0627\u0635 \u0628\u0643</p>
              <p style="color: #fff; font-size: 42px; font-weight: bold; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">
                ${code}
              </p>
            </div>
          </div>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 15px; margin: 25px 0;">
            <p style="color: #856404; font-size: 14px; margin: 0; font-weight: bold;">
              \u26A0\uFE0F \u062A\u0646\u0628\u064A\u0647: \u0635\u0644\u0627\u062D\u064A\u0629 \u0647\u0630\u0627 \u0627\u0644\u0643\u0648\u062F \u062A\u0646\u062A\u0647\u064A \u0628\u0639\u062F 15 \u062F\u0642\u064A\u0642\u0629
            </p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 5px 0;">
              <strong>\u0645\u0644\u0627\u062D\u0638\u0629 \u0623\u0645\u0646\u064A\u0629:</strong> \u0625\u0630\u0627 \u0644\u0645 \u062A\u0642\u0645 \u0628\u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628 \u0641\u064A \u0623\u0636\u062D\u064A\u062A\u064A\u060C \u064A\u0631\u062C\u0649 \u062A\u062C\u0627\u0647\u0644 \u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064A\u062F.
            </p>
            <p style="color: #999; font-size: 12px; margin: 15px 0 5px 0;">
              \u0645\u0639 \u062A\u062D\u064A\u0627\u062A \u0641\u0631\u064A\u0642 \u0623\u0636\u062D\u064A\u062A\u064A
            </p>
            <p style="color: #ccc; font-size: 11px; margin: 5px 0;">
              ${email}
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `
\u0645\u0631\u062D\u0628\u0627\u064B\u060C

\u0634\u0643\u0631\u0627\u064B \u0644\u062A\u0633\u062C\u064A\u0644\u0643 \u0641\u064A \u0645\u0646\u0635\u0629 \u0623\u0636\u062D\u064A\u062A\u064A. 

\u0643\u0648\u062F \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u062E\u0627\u0635 \u0628\u0643 \u0647\u0648: ${code}

\u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0643\u0648\u062F: 15 \u062F\u0642\u064A\u0642\u0629

\u0625\u0630\u0627 \u0644\u0645 \u062A\u0642\u0645 \u0628\u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628\u060C \u064A\u0631\u062C\u0649 \u062A\u062C\u0627\u0647\u0644 \u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064A\u062F.

\u0645\u0639 \u062A\u062D\u064A\u0627\u062A \u0641\u0631\u064A\u0642 \u0623\u0636\u062D\u064A\u062A\u064A
  `;
  return sendEmail({
    to: email,
    subject: "\u0643\u0648\u062F \u0627\u0644\u062A\u062D\u0642\u0642 - \u0623\u0636\u062D\u064A\u062A\u064A",
    html,
    text
  });
}
async function sendResetPasswordEmail(email, code) {
  console.log("\u{1F4E7} Sending password reset code to:", email);
  console.log("\u{1F522} Reset code:", code);
  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>\u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="background-color: #f5f5f5; padding: 20px;">
        <div style="background-color: white; padding: 40px; border-radius: 10px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a472a; margin: 0 0 10px 0; font-size: 28px;">\u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631</h1>
            <p style="color: #666; margin: 0;">\u0645\u0646\u0635\u0629 \u0623\u0636\u062D\u064A\u062A\u064A</p>
          </div>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            \u0645\u0631\u062D\u0628\u0627\u064B\u060C
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            \u062A\u0644\u0642\u064A\u0646\u0627 \u0637\u0644\u0628\u0627\u064B \u0644\u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0644\u062D\u0633\u0627\u0628\u0643 \u0641\u064A \u0623\u0636\u062D\u064A\u062A\u064A. \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0643\u0648\u062F \u0627\u0644\u062A\u0627\u0644\u064A \u0644\u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631:
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <div style="display: inline-block; background: linear-gradient(135deg, #1a472a 0%, #2d6b3f 100%); padding: 25px 50px; border-radius: 12px; box-shadow: 0 4px 15px rgba(26, 71, 42, 0.3);">
              <p style="color: #fff; font-size: 14px; margin: 0 0 10px 0; opacity: 0.9;">\u0643\u0648\u062F \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u0639\u064A\u064A\u0646</p>
              <p style="color: #fff; font-size: 42px; font-weight: bold; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">
                ${code}
              </p>
            </div>
          </div>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 15px; margin: 25px 0;">
            <p style="color: #856404; font-size: 14px; margin: 0; font-weight: bold;">
              \u26A0\uFE0F \u062A\u0646\u0628\u064A\u0647 \u0647\u0627\u0645: \u0635\u0644\u0627\u062D\u064A\u0629 \u0647\u0630\u0627 \u0627\u0644\u0643\u0648\u062F \u062A\u0646\u062A\u0647\u064A \u0628\u0639\u062F 15 \u062F\u0642\u064A\u0642\u0629 \u0641\u0642\u0637.
            </p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 5px 0;">
              <strong>\u0644\u0645 \u062A\u0637\u0644\u0628 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631\u061F</strong> \u064A\u0631\u062C\u0649 \u062A\u062C\u0627\u0647\u0644 \u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064A\u062F. \u062D\u0633\u0627\u0628\u0643 \u0622\u0645\u0646 \u0648\u0644\u0646 \u064A\u062A\u0645 \u0625\u062C\u0631\u0627\u0621 \u0623\u064A \u062A\u063A\u064A\u064A\u0631\u0627\u062A.
            </p>
            <p style="color: #999; font-size: 12px; margin: 15px 0 5px 0;">
              \u0645\u0639 \u062A\u062D\u064A\u0627\u062A \u0641\u0631\u064A\u0642 \u0623\u0636\u062D\u064A\u062A\u064A
            </p>
            <p style="color: #ccc; font-size: 11px; margin: 5px 0;">
              ${email}
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `
\u0645\u0631\u062D\u0628\u0627\u064B\u060C

\u062A\u0644\u0642\u064A\u0646\u0627 \u0637\u0644\u0628\u0627\u064B \u0644\u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0644\u062D\u0633\u0627\u0628\u0643 \u0641\u064A \u0623\u0636\u062D\u064A\u062A\u064A.

\u0643\u0648\u062F \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u0639\u064A\u064A\u0646: ${code}

\u062A\u0646\u0628\u064A\u0647: \u0635\u0644\u0627\u062D\u064A\u0629 \u0647\u0630\u0627 \u0627\u0644\u0643\u0648\u062F \u062A\u0646\u062A\u0647\u064A \u0628\u0639\u062F 15 \u062F\u0642\u064A\u0642\u0629.

\u0625\u0630\u0627 \u0644\u0645 \u062A\u0637\u0644\u0628 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631\u060C \u064A\u0631\u062C\u0649 \u062A\u062C\u0627\u0647\u0644 \u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064A\u062F.

\u0645\u0639 \u062A\u062D\u064A\u0627\u062A \u0641\u0631\u064A\u0642 \u0623\u0636\u062D\u064A\u062A\u064A
  `;
  return sendEmail({
    to: email,
    subject: "\u0643\u0648\u062F \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 - \u0623\u0636\u062D\u064A\u062A\u064A",
    html,
    text
  });
}
async function sendOrderConfirmationEmail(email, orderData) {
  const html = `
    <div dir="rtl" style="font-family: Cairo, Arial; text-align: right; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a472a; margin-bottom: 20px;">\u062A\u0623\u0643\u064A\u062F \u0637\u0644\u0628 \u0627\u0644\u0634\u0631\u0627\u0621</h1>
        <p style="color: #333; font-size: 16px; margin-bottom: 15px;">
          \u062A\u0645 \u0627\u0633\u062A\u0642\u0628\u0627\u0644 \u0637\u0644\u0628\u0643 \u0628\u0646\u062C\u0627\u062D
        </p>
        <p style="color: #666; font-size: 14px;">
          \u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628: <strong>${orderData.orderId}</strong>
        </p>
      </div>
    </div>
  `;
  return sendEmail({
    to: email,
    subject: "\u062A\u0623\u0643\u064A\u062F \u0637\u0644\u0628 \u0627\u0644\u0634\u0631\u0627\u0621 - \u0623\u0636\u062D\u064A\u062A\u064A",
    html
  });
}
async function sendAdminNotificationEmail(orderData) {
  const html = `
    <div dir="rtl" style="font-family: Cairo, Arial; text-align: right; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a472a; margin-bottom: 20px;">\u0637\u0644\u0628 \u0634\u0631\u0627\u0621 \u062C\u062F\u064A\u062F</h1>
        <p style="color: #666; font-size: 14px;">
          \u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628: <strong>${orderData.orderId}</strong>
        </p>
      </div>
    </div>
  `;
  return sendEmail({
    to: process.env.ADMIN_EMAIL || "admin@odhiyaty.com",
    subject: "\u0637\u0644\u0628 \u0634\u0631\u0627\u0621 \u062C\u062F\u064A\u062F - \u0623\u0636\u062D\u064A\u062A\u064A",
    html
  });
}

// server/firebase-admin.ts
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
var adminApp = null;
var adminAuth = null;
var adminDb = null;
function formatPrivateKey(key) {
  let formattedKey = key;
  formattedKey = formattedKey.replace(/\\n/g, "\n");
  formattedKey = formattedKey.replace(/"/g, "");
  if (!formattedKey.includes("-----BEGIN")) {
    formattedKey = `-----BEGIN PRIVATE KEY-----
${formattedKey}
-----END PRIVATE KEY-----
`;
  }
  return formattedKey;
}
if (getApps().length === 0) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log("\u{1F527} Parsing FIREBASE_SERVICE_ACCOUNT...");
      let serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
      try {
        if (!serviceAccountJson.startsWith("{")) {
          console.log("\u{1F4E6} Detected base64 encoded service account, decoding...");
          serviceAccountJson = Buffer.from(serviceAccountJson, "base64").toString("utf-8");
        }
      } catch (decodeError) {
        console.log("\u2139\uFE0F Not base64 encoded, using as-is");
      }
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(serviceAccountJson);
      } catch (parseError) {
        console.error("\u274C Failed to parse service account JSON:", parseError?.message);
        console.error("\u{1F4DD} First 100 chars of input:", serviceAccountJson?.substring(0, 100));
        throw new Error("Invalid service account JSON format");
      }
      if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
        console.error("\u274C Missing required fields in service account");
        console.log("\u{1F4CB} Has project_id:", !!serviceAccount.project_id);
        console.log("\u{1F4CB} Has private_key:", !!serviceAccount.private_key);
        console.log("\u{1F4CB} Has client_email:", !!serviceAccount.client_email);
        throw new Error("Service account missing required fields");
      }
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId
      });
      adminAuth = getAuth(adminApp);
      adminDb = getFirestore(adminApp);
      console.log("\u2705 Firebase Admin initialized with service account JSON");
      console.log("\u{1F4E7} Using client email:", serviceAccount.client_email);
    } else if (privateKey && clientEmail && projectId) {
      const formattedPrivateKey = formatPrivateKey(privateKey);
      const serviceAccount = {
        type: "service_account",
        project_id: projectId,
        private_key: formattedPrivateKey,
        client_email: clientEmail
      };
      console.log("\u{1F527} Attempting to initialize with individual credentials...");
      console.log("\u{1F4E7} Client Email:", clientEmail);
      console.log("\u{1F511} Private key format check:", formattedPrivateKey.substring(0, 30) + "...");
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId
      });
      adminAuth = getAuth(adminApp);
      adminDb = getFirestore(adminApp);
      console.log("\u2705 Firebase Admin initialized with individual credentials");
    } else {
      console.warn("\u26A0\uFE0F Firebase Admin not initialized - credentials not provided");
      console.warn("\u26A0\uFE0F Required: FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, VITE_FIREBASE_PROJECT_ID");
      console.warn("\u26A0\uFE0F Some backend features may be limited");
    }
  } catch (error) {
    console.error("\u274C Failed to initialize Firebase Admin:", error?.message || error);
    console.warn("\u26A0\uFE0F Some backend features may be limited");
  }
} else {
  adminApp = getApps()[0];
  adminAuth = getAuth(adminApp);
  adminDb = getFirestore(adminApp);
}

// server/routes.ts
var FIREBASE_PROJECT_ID2 = process.env.VITE_FIREBASE_PROJECT_ID;
var FIREBASE_API_KEY2 = process.env.VITE_FIREBASE_API_KEY;
async function queryFirestore(collectionName, filters = []) {
  try {
    const body = {
      structuredQuery: {
        from: [{ collectionId: collectionName }]
      }
    };
    if (filters.length > 0) {
      const conditions = filters.map((f) => ({
        fieldFilter: {
          field: { fieldPath: f.field },
          op: f.op,
          value: { stringValue: f.value }
        }
      }));
      body.structuredQuery.where = { compositeFilter: { op: "AND", filters: conditions } };
    }
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID2}/databases/(default)/documents:runQuery`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": FIREBASE_API_KEY2 || ""
        },
        body: JSON.stringify(body)
      }
    );
    if (!response.ok) {
      console.error(`Firestore API error: ${response.status} ${await response.text()}`);
      return [];
    }
    const data = await response.json();
    const results = [];
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.document) {
          results.push({
            id: item.document.name.split("/").pop(),
            ...extractDocumentData2(item.document.fields)
          });
        }
      }
    }
    return results;
  } catch (error) {
    console.error(`Error querying Firestore:`, error?.message);
    return [];
  }
}
function extractDocumentData2(fields) {
  if (!fields) return {};
  const result = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = extractFieldValue2(value);
  }
  return result;
}
function extractFieldValue2(value) {
  if (!value) return null;
  if (value.stringValue !== void 0) return value.stringValue;
  if (value.integerValue !== void 0) return parseInt(value.integerValue);
  if (value.doubleValue !== void 0) return parseFloat(value.doubleValue);
  if (value.booleanValue !== void 0) return value.booleanValue;
  if (value.arrayValue !== void 0) {
    return value.arrayValue.values?.map((v) => extractFieldValue2(v)) || [];
  }
  if (value.mapValue !== void 0) {
    return extractDocumentData2(value.mapValue.fields);
  }
  if (value.timestampValue !== void 0) {
    return new Date(value.timestampValue).getTime();
  }
  return value;
}
async function registerRoutes(app2) {
  app2.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      firebase: {
        adminAuth: adminAuth ? "initialized" : "not initialized",
        adminDb: adminDb ? "initialized" : "not initialized"
      },
      env: {
        hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
        hasProjectId: !!process.env.VITE_FIREBASE_PROJECT_ID,
        hasApiKey: !!process.env.VITE_FIREBASE_API_KEY,
        hasResendKey: !!process.env.RESEND_API_KEY
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app2.get("/api/sheep", async (req, res) => {
    try {
      const approved = req.query.approved === "true";
      console.log(`\u{1F411} Fetching ${approved ? "approved" : "all"} sheep...`);
      const body = {
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
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID2}/databases/(default)/documents:runQuery`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": FIREBASE_API_KEY2 || ""
          },
          body: JSON.stringify(body)
        }
      );
      let data = [];
      if (response.ok) {
        const result = await response.json();
        if (Array.isArray(result)) {
          data = result.filter((item) => item.document).map((item) => ({
            id: item.document.name.split("/").pop(),
            ...extractDocumentData2(item.document.fields)
          }));
        }
      }
      console.log(`\u2705 Found ${data.length} ${approved ? "approved" : ""} sheep`);
      res.json(data);
    } catch (error) {
      console.error("\u274C Error:", error?.message);
      res.json([]);
    }
  });
  app2.get("/api/sheep/approved", async (req, res) => {
    try {
      console.log("\u{1F411} Fetching approved sheep...");
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
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID2}/databases/(default)/documents:runQuery`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": FIREBASE_API_KEY2 || ""
          },
          body: JSON.stringify(body)
        }
      );
      let data = [];
      if (response.ok) {
        const result = await response.json();
        if (Array.isArray(result)) {
          data = result.filter((item) => item.document).map((item) => ({
            id: item.document.name.split("/").pop(),
            ...extractDocumentData2(item.document.fields)
          }));
        }
      }
      console.log(`\u2705 Found ${data.length} approved sheep`);
      res.json(data);
    } catch (error) {
      console.error("\u274C Error:", error?.message);
      res.json([]);
    }
  });
  app2.get("/api/sheep/:id", async (req, res) => {
    try {
      console.log(`\u{1F411} Fetching sheep ${req.params.id}...`);
      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID2}/databases/(default)/documents/sheep/${req.params.id}`,
        {
          method: "GET",
          headers: {
            "X-Goog-Api-Key": FIREBASE_API_KEY2 || ""
          }
        }
      );
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`\u26A0\uFE0F Sheep ${req.params.id} not found`);
          return res.status(404).json({ error: "Sheep not found" });
        }
        const errorText = await response.text();
        console.error(`\u274C Firestore API error: ${response.status} ${errorText}`);
        return res.status(500).json({ error: "Failed to fetch sheep" });
      }
      const doc = await response.json();
      const data = extractDocumentData2(doc.fields);
      if (data?.status !== "approved") {
        console.log(`\u26A0\uFE0F Sheep ${req.params.id} status is ${data?.status}, not approved`);
        return res.status(403).json({ error: "This listing is not available" });
      }
      console.log(`\u2705 Returning sheep ${req.params.id}`);
      res.json({
        id: req.params.id,
        ...data
      });
    } catch (error) {
      console.error(`\u274C Error fetching sheep ${req.params.id}:`, error?.message || error);
      res.status(500).json({ error: "Failed to fetch sheep", details: error?.message });
    }
  });
  app2.post("/api/auth/pending-registration", async (req, res) => {
    try {
      const { email, password, role, phone, verificationCode, tokenExpiry } = req.body;
      console.log("\u{1F4BE} Creating pending registration for:", email);
      if (!email || !password || !role || !verificationCode || !tokenExpiry) {
        console.log("\u274C Missing fields:", {
          email: !!email,
          password: !!password,
          role: !!role,
          verificationCode: !!verificationCode,
          tokenExpiry: !!tokenExpiry
        });
        return res.status(400).json({
          success: false,
          error: "\u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0644 \u0645\u0637\u0644\u0648\u0628\u0629"
        });
      }
      if (!adminAuth || !adminDb) {
        console.warn("\u26A0\uFE0F Firebase Admin not configured - using fallback registration");
        try {
          const pendingRef2 = adminDb.collection("pending_registrations");
          const existingSnapshot2 = await pendingRef2.where("email", "==", email).get();
          const pendingData2 = {
            email,
            password,
            role,
            phone,
            verificationCode,
            tokenExpiry,
            createdAt: Date.now()
          };
          if (!existingSnapshot2.empty) {
            const docId = existingSnapshot2.docs[0].id;
            await pendingRef2.doc(docId).set(pendingData2);
            console.log("\u2705 Updated pending registration (fallback mode)");
          } else {
            await pendingRef2.add(pendingData2);
            console.log("\u2705 Created pending registration (fallback mode)");
          }
          return res.json({ success: true });
        } catch (fallbackError) {
          console.error("\u274C Fallback registration error:", fallbackError?.message);
          return res.status(503).json({
            success: false,
            error: "\u062E\u062F\u0645\u0629 \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629 \u062D\u0627\u0644\u064A\u0627\u064B"
          });
        }
      }
      try {
        const authUser = await adminAuth.getUserByEmail(email);
        if (authUser) {
          return res.status(400).json({
            success: false,
            error: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0627\u0644\u0641\u0639\u0644"
          });
        }
      } catch (authError) {
        if (authError.code && authError.code !== "auth/user-not-found") {
          console.error("\u274C Firebase Auth error:", authError.code, authError.message);
          throw authError;
        }
      }
      const pendingRef = adminDb.collection("pending_registrations");
      const existingSnapshot = await pendingRef.where("email", "==", email).get();
      const pendingData = {
        email,
        password,
        role,
        phone,
        verificationCode,
        tokenExpiry,
        createdAt: Date.now()
      };
      if (!existingSnapshot.empty) {
        const docId = existingSnapshot.docs[0].id;
        await pendingRef.doc(docId).set(pendingData);
        console.log("\u2705 Updated existing pending registration");
      } else {
        await pendingRef.add(pendingData);
        console.log("\u2705 Created new pending registration");
      }
      res.json({ success: true });
    } catch (error) {
      console.error("\u274C Pending registration error:", error?.message || error);
      res.status(500).json({
        success: false,
        error: error?.message || "\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062A\u0633\u062C\u064A\u0644"
      });
    }
  });
  app2.post("/api/auth/complete-registration", async (req, res) => {
    try {
      const { code, email } = req.body;
      console.log("\u{1F510} Complete registration request:", { email, code: code ? "present" : "missing" });
      if (!code || !email) {
        return res.status(400).json({
          success: false,
          error: "Code and email required"
        });
      }
      if (!adminAuth || !adminDb) {
        return res.status(503).json({
          success: false,
          error: "Firebase Admin not configured. Please contact administrator."
        });
      }
      const pendingRef = adminDb.collection("pending_registrations");
      const snapshot = await pendingRef.where("email", "==", email).get();
      if (snapshot.empty) {
        console.log("\u274C No pending registration found for:", email);
        return res.status(404).json({
          success: false,
          error: "Pending registration not found"
        });
      }
      const pendingDoc = snapshot.docs[0];
      const pending = pendingDoc.data();
      console.log("\u2705 Found pending registration");
      console.log("Expected code:", pending.verificationCode);
      console.log("Received code:", code);
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
      console.log("\u{1F510} Creating Firebase Auth user...");
      const authUser = await adminAuth.createUser({
        email: pending.email,
        password: pending.password,
        emailVerified: true
      });
      console.log("\u2705 Firebase Auth user created:", authUser.uid);
      console.log("\u{1F4BE} Creating Firestore user document...");
      await adminDb.collection("users").doc(authUser.uid).set({
        uid: authUser.uid,
        email: pending.email,
        role: pending.role,
        phone: pending.phone,
        emailVerified: true,
        createdAt: Date.now()
      });
      console.log("\u2705 Firestore user document created");
      await pendingDoc.ref.delete();
      console.log("\u2705 Pending registration deleted");
      console.log("\u2705 Registration completed successfully");
      res.json({
        success: true,
        message: "Registration completed successfully"
      });
    } catch (error) {
      console.error("\u274C Complete registration error:", error?.message);
      res.status(500).json({
        success: false,
        error: error?.message || "Failed to complete registration"
      });
    }
  });
  app2.post("/api/auth/resend-pending-verification", async (req, res) => {
    try {
      const { email } = req.body;
      console.log("\u{1F504} Resend pending verification for:", email);
      if (!adminDb) {
        return res.status(503).json({
          success: false,
          error: "Firebase Admin not configured. Please contact administrator."
        });
      }
      const pendingRef = adminDb.collection("pending_registrations");
      const snapshot = await pendingRef.where("email", "==", email).get();
      if (snapshot.empty) {
        return res.status(404).json({
          success: false,
          error: "Pending registration not found"
        });
      }
      const pendingDoc = snapshot.docs[0];
      const newCode = Math.floor(1e5 + Math.random() * 9e5).toString();
      const tokenExpiry = Date.now() + 15 * 60 * 1e3;
      await pendingDoc.ref.update({
        verificationCode: newCode,
        tokenExpiry
      });
      console.log("\u2705 Updated verification code");
      const emailResult = await sendVerificationEmail(email, newCode);
      if (emailResult.success) {
        res.json({ success: true, message: "New verification code sent" });
      } else {
        res.status(500).json({ success: false, error: emailResult.error });
      }
    } catch (error) {
      console.error("\u274C Resend error:", error?.message);
      res.status(500).json({ success: false, error: error?.message });
    }
  });
  app2.post("/api/auth/cancel-pending-registration", async (req, res) => {
    try {
      const { email } = req.body;
      console.log("\u{1F5D1}\uFE0F Cancel pending registration for:", email);
      if (!adminDb) {
        return res.status(503).json({
          success: false,
          error: "Firebase Admin not configured. Please contact administrator."
        });
      }
      const pendingRef = adminDb.collection("pending_registrations");
      const snapshot = await pendingRef.where("email", "==", email).get();
      if (!snapshot.empty) {
        await snapshot.docs[0].ref.delete();
        console.log("\u2705 Deleted pending registration");
      }
      res.json({ success: true, message: "Pending registration canceled" });
    } catch (error) {
      console.error("\u274C Cancel error:", error?.message);
      res.status(500).json({ success: false, error: error?.message });
    }
  });
  app2.post("/api/auth/send-verification", async (req, res) => {
    try {
      const { email, code } = req.body;
      console.log("\u{1F4E7} Sending verification code to:", email);
      const result = await sendVerificationEmail(email, code);
      if (result.success) {
        res.json({ success: true, message: "Verification code sent" });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error("\u274C Send verification error:", error?.message);
      res.status(500).json({ success: false, error: error?.message });
    }
  });
  app2.post("/api/auth/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;
      console.log("\u{1F510} Password reset request for:", email);
      if (!email) {
        return res.status(400).json({
          success: false,
          error: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0637\u0644\u0648\u0628"
        });
      }
      if (!adminDb) {
        console.error("\u274C Firebase Admin not configured");
        return res.status(503).json({
          success: false,
          error: "\u062E\u062F\u0645\u0629 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629 \u062D\u0627\u0644\u064A\u0627\u064B"
        });
      }
      const usersRef = adminDb.collection("users");
      const usersSnapshot = await usersRef.where("email", "==", email).get();
      if (usersSnapshot.empty) {
        console.log("\u26A0\uFE0F User not found:", email);
        return res.json({
          success: true,
          message: "\u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062C\u0644\u0627\u064B\u060C \u0633\u064A\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0643\u0648\u062F \u0627\u0644\u062A\u062D\u0642\u0642"
        });
      }
      const userDoc = usersSnapshot.docs[0];
      const user = { uid: userDoc.id, ...userDoc.data() };
      console.log("\u2705 User found:", user.uid);
      const resetCode = Math.floor(1e5 + Math.random() * 9e5).toString();
      const tokenExpiry = Date.now() + 15 * 60 * 1e3;
      await adminDb.collection("password_resets").doc(user.uid).set({
        email,
        code: resetCode,
        expiry: tokenExpiry,
        createdAt: Date.now()
      });
      console.log("\u2705 Reset code stored successfully");
      const emailResult = await sendResetPasswordEmail(email, resetCode);
      if (emailResult.success) {
        console.log("\u2705 Password reset code sent");
        res.json({
          success: true,
          message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0643\u0648\u062F \u0627\u0644\u062A\u062D\u0642\u0642 \u0625\u0644\u0649 \u0628\u0631\u064A\u062F\u0643 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A"
        });
      } else {
        console.error("\u274C Failed to send reset email:", emailResult.error);
        res.status(500).json({
          success: false,
          error: "\u0641\u0634\u0644 \u0641\u064A \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A"
        });
      }
    } catch (error) {
      console.error("\u274C Password reset request error:", error?.message);
      res.status(500).json({
        success: false,
        error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639"
      });
    }
  });
  app2.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;
      console.log("\u{1F510} Reset password request for:", email);
      if (!adminAuth || !adminDb) {
        console.error("\u274C Firebase Admin SDK not available");
        return res.status(503).json({
          success: false,
          error: "\u062E\u062F\u0645\u0629 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629 \u062D\u0627\u0644\u064A\u0627\u064B. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u0627\u064B."
        });
      }
      if (!email || !code || !newPassword) {
        return res.status(400).json({
          success: false,
          error: "\u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0644 \u0645\u0637\u0644\u0648\u0628\u0629"
        });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 6 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644"
        });
      }
      const usersRef = adminDb.collection("users");
      const usersSnapshot = await usersRef.where("email", "==", email).get();
      if (usersSnapshot.empty) {
        console.log("\u274C User not found:", email);
        return res.status(404).json({
          success: false,
          error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F"
        });
      }
      const userDoc = usersSnapshot.docs[0];
      const user = { uid: userDoc.id, ...userDoc.data() };
      console.log("\u2705 User found:", user.uid);
      const resetDocRef = adminDb.collection("password_resets").doc(user.uid);
      const resetDocSnapshot = await resetDocRef.get();
      console.log("\u{1F4C4} Reset document:", resetDocSnapshot.exists ? "found" : "not found");
      if (!resetDocSnapshot.exists) {
        return res.status(400).json({
          success: false,
          error: "\u0644\u0645 \u064A\u062A\u0645 \u0637\u0644\u0628 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631. \u064A\u0631\u062C\u0649 \u0637\u0644\u0628 \u0643\u0648\u062F \u062C\u062F\u064A\u062F."
        });
      }
      const resetDoc = resetDocSnapshot.data();
      if (resetDoc?.code !== code) {
        console.log("\u274C Invalid code. Expected:", resetDoc?.code, "Got:", code);
        return res.status(400).json({
          success: false,
          error: "\u0643\u0648\u062F \u0627\u0644\u062A\u062D\u0642\u0642 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D"
        });
      }
      const expiryTime = typeof resetDoc?.expiry === "number" ? resetDoc.expiry : parseInt(resetDoc?.expiry);
      if (expiryTime < Date.now()) {
        console.log("\u274C Code expired. Expiry:", expiryTime, "Now:", Date.now());
        await resetDocRef.delete();
        return res.status(400).json({
          success: false,
          error: "\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0643\u0648\u062F \u0627\u0644\u062A\u062D\u0642\u0642. \u064A\u0631\u062C\u0649 \u0637\u0644\u0628 \u0643\u0648\u062F \u062C\u062F\u064A\u062F."
        });
      }
      console.log("\u2705 Code verified, updating password...");
      try {
        await adminAuth.updateUser(user.uid, { password: newPassword });
        console.log("\u2705 Password updated via Admin SDK");
      } catch (adminError) {
        console.error("\u274C Admin SDK error:", adminError?.message);
        return res.status(500).json({
          success: false,
          error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u0627\u064B."
        });
      }
      await resetDocRef.delete();
      console.log("\u2705 Password reset completed successfully");
      res.json({
        success: true,
        message: "\u062A\u0645 \u062A\u063A\u064A\u064A\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0628\u0646\u062C\u0627\u062D"
      });
    } catch (error) {
      console.error("\u274C Reset password error:", error?.message);
      res.status(500).json({
        success: false,
        error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639"
      });
    }
  });
  app2.post("/api/auth/resend-reset-code", async (req, res) => {
    try {
      const { email } = req.body;
      console.log("\u{1F504} Resend reset code for:", email);
      if (!email) {
        return res.status(400).json({
          success: false,
          error: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0637\u0644\u0648\u0628"
        });
      }
      const usersQuery = await queryFirestore("users", [{ field: "email", op: "EQUAL", value: email }]);
      if (usersQuery.length === 0) {
        return res.json({
          success: true,
          message: "\u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062C\u0644\u0627\u064B\u060C \u0633\u064A\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0643\u0648\u062F \u062C\u062F\u064A\u062F"
        });
      }
      const user = usersQuery[0];
      const resetCode = Math.floor(1e5 + Math.random() * 9e5).toString();
      const tokenExpiry = Date.now() + 15 * 60 * 1e3;
      const resetData = {
        fields: {
          email: { stringValue: email },
          code: { stringValue: resetCode },
          expiry: { integerValue: tokenExpiry.toString() },
          createdAt: { integerValue: Date.now().toString() }
        }
      };
      await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID2}/databases/(default)/documents/password_resets/${user.uid}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": FIREBASE_API_KEY2 || ""
          },
          body: JSON.stringify(resetData)
        }
      );
      const emailResult = await sendResetPasswordEmail(email, resetCode);
      if (emailResult.success) {
        res.json({
          success: true,
          message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0643\u0648\u062F \u062C\u062F\u064A\u062F"
        });
      } else {
        res.status(500).json({
          success: false,
          error: "\u0641\u0634\u0644 \u0641\u064A \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A"
        });
      }
    } catch (error) {
      console.error("\u274C Resend reset code error:", error?.message);
      res.status(500).json({
        success: false,
        error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639"
      });
    }
  });
  app2.post("/api/orders/send-confirmation", async (req, res) => {
    try {
      const { email, orderData } = req.body;
      if (!email || !orderData) {
        return res.status(400).json({ error: "Email and order data required" });
      }
      const result = await sendOrderConfirmationEmail(email, orderData);
      await sendAdminNotificationEmail(orderData);
      res.json(result);
    } catch (error) {
      console.error("\u274C Send confirmation error:", error?.message);
      res.status(500).json({ error: error?.message });
    }
  });
  app2.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      console.log("\u{1F504} Resend verification request for:", email);
      if (!email) {
        return res.status(400).json({
          success: false,
          error: "Email required"
        });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found"
        });
      }
      if (user.emailVerified) {
        return res.json({
          success: true,
          message: "Email already verified"
        });
      }
      const newCode = Math.floor(1e5 + Math.random() * 9e5).toString();
      const tokenExpiry = Date.now() + 15 * 60 * 1e3;
      await storage.updateUser(user.uid, {
        emailVerificationToken: newCode,
        emailVerificationTokenExpiry: tokenExpiry
      });
      const emailResult = await sendVerificationEmail(email, newCode);
      if (emailResult.success) {
        console.log("\u2705 New verification code sent to:", email);
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
    } catch (error) {
      console.error("\u274C Resend verification error:", error?.message);
      res.status(500).json({
        success: false,
        error: "An error occurred. Please try again."
      });
    }
  });
  app2.post("/api/auth/delete-unverified", async (req, res) => {
    try {
      const { email } = req.body;
      console.log("\u{1F5D1}\uFE0F Delete unverified account request for:", email);
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
      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log("\u26A0\uFE0F User not found in Firestore, checking Firebase Auth...");
        try {
          const authUser = await adminAuth.getUserByEmail(email);
          if (authUser && !authUser.emailVerified) {
            await adminAuth.deleteUser(authUser.uid);
            console.log("\u2705 Deleted unverified user from Firebase Auth:", authUser.uid);
          }
        } catch (authError) {
          if (authError.code === "auth/user-not-found") {
            console.log("\u2705 User not found in Firebase Auth either");
          }
        }
        return res.json({
          success: true,
          message: "Account cleared"
        });
      }
      if (user.emailVerified) {
        console.log("\u274C Cannot delete verified account");
        return res.status(403).json({
          success: false,
          error: "Cannot delete verified account"
        });
      }
      console.log("\u{1F5D1}\uFE0F Deleting unverified account:", user.uid);
      try {
        await adminAuth.deleteUser(user.uid);
        console.log("\u2705 Deleted from Firebase Auth:", user.uid);
      } catch (authError) {
        if (authError.code === "auth/user-not-found") {
          console.log("\u26A0\uFE0F User not found in Firebase Auth");
        } else {
          console.error("\u274C Error deleting from Firebase Auth:", authError.message);
        }
      }
      const deleteDocResponse = await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID2}/databases/(default)/documents/users/${user.uid}`,
        {
          method: "DELETE",
          headers: {
            "X-Goog-Api-Key": FIREBASE_API_KEY2 || ""
          }
        }
      );
      if (!deleteDocResponse.ok && deleteDocResponse.status !== 404) {
        console.error("\u274C Failed to delete Firestore document");
      } else {
        console.log("\u2705 Deleted from Firestore");
      }
      console.log("\u2705 Unverified account deleted completely");
      res.json({
        success: true,
        message: "Account deleted successfully"
      });
    } catch (error) {
      console.error("\u274C Delete account error:", error?.message);
      res.status(500).json({
        success: false,
        error: "Failed to delete account"
      });
    }
  });
  app2.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { code, email } = req.body;
      console.log("\u{1F510} Verify request:", { email, code: code ? "present" : "missing" });
      if (!code || !email) {
        console.log("\u274C Missing code or email");
        return res.status(400).json({
          success: false,
          error: "Code and email required"
        });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log("\u274C User not found for email:", email);
        return res.status(404).json({
          success: false,
          error: "User not found"
        });
      }
      console.log("\u{1F464} Found user:", user.uid);
      console.log("\u{1F4E7} Email verified status:", user.emailVerified);
      console.log("\u{1F511} Has verification token:", !!user.emailVerificationToken);
      if (user.emailVerified) {
        console.log("\u2705 Email already verified");
        return res.json({
          success: true,
          message: "Email already verified"
        });
      }
      if (!user.emailVerificationToken) {
        console.log("\u274C No verification code found");
        return res.status(400).json({
          success: false,
          error: "Invalid verification code"
        });
      }
      if (user.emailVerificationToken !== code) {
        console.log("\u274C Code mismatch");
        console.log("Expected:", user.emailVerificationToken);
        console.log("Received:", code);
        return res.status(400).json({
          success: false,
          error: "Invalid verification code"
        });
      }
      if (user.emailVerificationTokenExpiry && user.emailVerificationTokenExpiry < Date.now()) {
        console.log("\u274C Code expired");
        return res.status(400).json({
          success: false,
          error: "Verification code expired. Please request a new verification code."
        });
      }
      console.log("\u{1F4DD} Updating user verification status...");
      await storage.updateUser(user.uid, {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null
      });
      console.log("\u2705 Email verified successfully for:", email);
      res.json({
        success: true,
        message: "Email verified successfully"
      });
    } catch (error) {
      console.error("\u274C Email verification error:", error?.message || error);
      res.status(500).json({
        success: false,
        error: "An error occurred during verification. Please try again."
      });
    }
  });
  app2.get("/api/municipalities", async (req, res) => {
    try {
      const filePath = path.resolve(import.meta.dirname, "..", "public", "data", "municipalities.json");
      const data = await fs.promises.readFile(filePath, "utf-8");
      res.set("Content-Type", "application/json");
      res.send(data);
    } catch (error) {
      console.error("\u274C Error loading municipalities:", error?.message);
      res.status(500).json({ error: "Failed to load municipalities data" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/app.ts
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
var app = express();
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
async function runApp(setup) {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  await setup(app, server);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
}

// server/index-prod.ts
async function serveStatic(app2, _server) {
  const distPath = path2.resolve(import.meta.dirname, "..", "dist", "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}
(async () => {
  await runApp(serveStatic);
})();
export {
  serveStatic
};
