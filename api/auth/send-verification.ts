
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and code required' 
      });
    }

    await resend.emails.send({
      from: 'أضحيتي <noreply@odhiyaty.com>',
      to: email,
      subject: 'كود التحقق من بريدك الإلكتروني',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>مرحباً بك في أضحيتي</h2>
          <p>كود التحقق الخاص بك هو:</p>
          <h1 style="color: #D97706; font-size: 32px; letter-spacing: 5px;">${code}</h1>
          <p>الكود صالح لمدة 15 دقيقة</p>
        </div>
      `
    });

    res.json({ success: true, message: 'Verification code sent' });
  } catch (error: any) {
    console.error('Send verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to send email' 
    });
  }
}
