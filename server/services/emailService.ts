import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const isDev = process.env.NODE_ENV !== 'production';

const getBaseUrl = () => {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NODE_ENV === 'production') return `https://${process.env.DOMAIN || 'odhiyaty.com'}`;
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  return 'http://localhost:5000';
};

// Use Resend for all environments (development and production)
const resend = new Resend(process.env.RESEND_API_KEY || 're_test_');

// SMTP transporter for fallback
let smtpTransporter: nodemailer.Transporter | null = null;
if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    }
  });
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions) {
  try {
    console.log('📧 Sending email via Resend to:', options.to);
    console.log('🔑 Using API Key:', process.env.RESEND_API_KEY ? '✓ Available' : '✗ Missing');

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (result.error) {
      console.error('❌ Resend error:', result.error);
      
      // Fallback to SMTP if Resend fails
      if (smtpTransporter && process.env.SMTP_FROM_EMAIL) {
        console.log('📧 Falling back to SMTP for:', options.to);
        try {
          const info = await smtpTransporter.sendMail({
            from: process.env.SMTP_FROM_EMAIL,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
          });
          
          console.log('✅ Email sent via SMTP:', info.messageId);
          return { success: true, messageId: info.messageId };
        } catch (smtpError: any) {
          console.error('❌ SMTP error:', smtpError?.message);
          return { success: false, error: smtpError?.message };
        }
      }
      
      return { success: false, error: result.error?.message };
    }

    console.log('✅ Email sent successfully via Resend:', result.data?.id);
    return { success: true, messageId: result.data?.id };
  } catch (error: any) {
    console.error('❌ Email error:', error?.message);
    
    // Fallback to SMTP if Resend throws
    if (smtpTransporter && process.env.SMTP_FROM_EMAIL) {
      console.log('📧 Falling back to SMTP due to error:', options.to);
      try {
        const info = await smtpTransporter.sendMail({
          from: process.env.SMTP_FROM_EMAIL,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });
        
        console.log('✅ Email sent via SMTP:', info.messageId);
        return { success: true, messageId: info.messageId };
      } catch (smtpError: any) {
        console.error('❌ SMTP error:', smtpError?.message);
        return { success: false, error: smtpError?.message };
      }
    }
    
    return { success: false, error: error?.message };
  }
}

export async function sendVerificationEmail(email: string, code: string) {
  console.log('📧 Sending verification code to:', email);
  console.log('🔢 Verification code:', code);

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>كود التحقق</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="background-color: #f5f5f5; padding: 20px;">
        <div style="background-color: white; padding: 40px; border-radius: 10px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a472a; margin: 0 0 10px 0; font-size: 28px;">أهلاً بك في أضحيتي</h1>
            <p style="color: #666; margin: 0;">منصة شراء وبيع الأضاحي في الجزائر</p>
          </div>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            مرحباً،
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            شكراً لتسجيلك في منصة <strong>أضحيتي</strong>. استخدم كود التحقق التالي لتفعيل حسابك:
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <div style="display: inline-block; background: linear-gradient(135deg, #1a472a 0%, #2d6b3f 100%); padding: 25px 50px; border-radius: 12px; box-shadow: 0 4px 15px rgba(26, 71, 42, 0.3);">
              <p style="color: #fff; font-size: 14px; margin: 0 0 10px 0; opacity: 0.9;">كود التحقق الخاص بك</p>
              <p style="color: #fff; font-size: 42px; font-weight: bold; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">
                ${code}
              </p>
            </div>
          </div>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 15px; margin: 25px 0;">
            <p style="color: #856404; font-size: 14px; margin: 0; font-weight: bold;">
              ⚠️ تنبيه: صلاحية هذا الكود تنتهي بعد 15 دقيقة
            </p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 5px 0;">
              <strong>ملاحظة أمنية:</strong> إذا لم تقم بإنشاء حساب في أضحيتي، يرجى تجاهل هذا البريد.
            </p>
            <p style="color: #999; font-size: 12px; margin: 15px 0 5px 0;">
              مع تحيات فريق أضحيتي
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
مرحباً،

شكراً لتسجيلك في منصة أضحيتي. 

كود التحقق الخاص بك هو: ${code}

صلاحية الكود: 15 دقيقة

إذا لم تقم بإنشاء حساب، يرجى تجاهل هذا البريد.

مع تحيات فريق أضحيتي
  `;

  return sendEmail({
    to: email,
    subject: 'كود التحقق - أضحيتي',
    html,
    text,
  });
}

export async function sendResetPasswordEmail(email: string, code: string) {
  console.log('📧 Sending password reset code to:', email);
  console.log('🔢 Reset code:', code);

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>إعادة تعيين كلمة المرور</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="background-color: #f5f5f5; padding: 20px;">
        <div style="background-color: white; padding: 40px; border-radius: 10px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a472a; margin: 0 0 10px 0; font-size: 28px;">إعادة تعيين كلمة المرور</h1>
            <p style="color: #666; margin: 0;">منصة أضحيتي</p>
          </div>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            مرحباً،
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك في أضحيتي. استخدم الكود التالي لإعادة تعيين كلمة المرور:
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <div style="display: inline-block; background: linear-gradient(135deg, #1a472a 0%, #2d6b3f 100%); padding: 25px 50px; border-radius: 12px; box-shadow: 0 4px 15px rgba(26, 71, 42, 0.3);">
              <p style="color: #fff; font-size: 14px; margin: 0 0 10px 0; opacity: 0.9;">كود إعادة التعيين</p>
              <p style="color: #fff; font-size: 42px; font-weight: bold; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">
                ${code}
              </p>
            </div>
          </div>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 15px; margin: 25px 0;">
            <p style="color: #856404; font-size: 14px; margin: 0; font-weight: bold;">
              ⚠️ تنبيه هام: صلاحية هذا الكود تنتهي بعد 15 دقيقة فقط.
            </p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 5px 0;">
              <strong>لم تطلب إعادة تعيين كلمة المرور؟</strong> يرجى تجاهل هذا البريد. حسابك آمن ولن يتم إجراء أي تغييرات.
            </p>
            <p style="color: #999; font-size: 12px; margin: 15px 0 5px 0;">
              مع تحيات فريق أضحيتي
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
مرحباً،

تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك في أضحيتي.

كود إعادة التعيين: ${code}

تنبيه: صلاحية هذا الكود تنتهي بعد 15 دقيقة.

إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد.

مع تحيات فريق أضحيتي
  `;

  return sendEmail({
    to: email,
    subject: 'كود إعادة تعيين كلمة المرور - أضحيتي',
    html,
    text,
  });
}

export async function sendOrderConfirmationEmail(email: string, orderData: any) {
  const html = `
    <div dir="rtl" style="font-family: Cairo, Arial; text-align: right; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a472a; margin-bottom: 20px;">تأكيد طلب الشراء</h1>
        <p style="color: #333; font-size: 16px; margin-bottom: 15px;">
          تم استقبال طلبك بنجاح
        </p>
        <p style="color: #666; font-size: 14px;">
          رقم الطلب: <strong>${orderData.orderId}</strong>
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'تأكيد طلب الشراء - أضحيتي',
    html,
  });
}

export async function sendAdminNotificationEmail(orderData: any) {
  const html = `
    <div dir="rtl" style="font-family: Cairo, Arial; text-align: right; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a472a; margin-bottom: 20px;">طلب شراء جديد</h1>
        <p style="color: #666; font-size: 14px;">
          رقم الطلب: <strong>${orderData.orderId}</strong>
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: process.env.ADMIN_EMAIL || 'admin@odhiyaty.com',
    subject: 'طلب شراء جديد - أضحيتي',
    html,
  });
}
