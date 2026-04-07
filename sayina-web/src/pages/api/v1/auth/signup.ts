import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.sayina.co.za',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: true,                       // port 465 = SSL
    auth: {
      user: process.env.SMTP_USER || 'info@sayina.co.za',
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || '',
    },
    tls: { rejectUnauthorized: false },
  });
}

function signOtp(email: string, otp: string, expiry: number): string {
  const secret = process.env.OTP_SECRET || 'sayina-otp-s3cr3t-2026';
  const msg = `${email}:${otp}:${expiry}`;
  const sig = crypto.createHmac('sha256', secret).update(msg).digest('hex');
  return Buffer.from(`${msg}:${sig}`).toString('base64url');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, password, phone, organization, marketing_consent } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required.' });
  }

  // ── Proxy to Railway backend if available ────────────────────────────────
  const backendUrl = process.env.BACKEND_URL;
  if (backendUrl) {
    try {
      const up = await fetch(`${backendUrl}/api/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      const data = await up.json();
      return res.status(up.status).json(data);
    } catch {
      // fall through to local handler
    }
  }

  // ── Local handler: generate OTP, set cookie, send email ─────────────────
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + 15 * 60 * 1000; // 15 minutes
  const token = signOtp(email, otp, expiry);

  // Set HTTP-only cookie
  res.setHeader(
    'Set-Cookie',
    `otp_token=${token}; HttpOnly; Secure; Path=/api/v1/auth/verify-otp; SameSite=None; Max-Age=900`
  );

  const smtpUser = process.env.SMTP_USER || 'info@sayina.co.za';

  try {
    const transporter = createTransporter();
    await transporter.verify(); // test connection

    // OTP email to new user
    await transporter.sendMail({
      from: `"Sayina" <${smtpUser}>`,
      to: `"${name}" <${email}>`,
      subject: `${otp} — Your Sayina verification code`,
      html: `
        <div style="font-family: Arial,sans-serif; max-width: 520px; margin: 0 auto;">
          <div style="background:#DAB44A; padding:24px; border-radius:8px 8px 0 0; text-align:center;">
            <h1 style="color:white; margin:0; font-size:24px;">Verify your email</h1>
          </div>
          <div style="background:#f9f9f9; padding:28px; border-radius:0 0 8px 8px; border:1px solid #e5e7eb;">
            <p style="color:#444;">Hi <strong>${name}</strong>,</p>
            <p style="color:#444;">Use the code below to verify your Sayina account. It expires in <strong>15 minutes</strong>.</p>
            <div style="text-align:center; margin:28px 0;">
              <div style="display:inline-block; background:#1a1a1a; color:#DAB44A; font-size:36px; font-weight:bold; letter-spacing:10px; padding:16px 32px; border-radius:10px; font-family:monospace;">
                ${otp}
              </div>
            </div>
            <p style="color:#666; font-size:13px;">If you did not create a Sayina account, you can safely ignore this email.</p>
            <hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;"/>
            <p style="color:#999; font-size:12px; text-align:center;">
              LegacyBit Technologies · <a href="https://sayina.co.za" style="color:#DAB44A;">sayina.co.za</a>
            </p>
          </div>
        </div>
      `,
    });

    // Admin notification
    await transporter.sendMail({
      from: `"Sayina System" <${smtpUser}>`,
      to: 'info@sayina.co.za',
      subject: `[New Signup] ${name} — ${email}`,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${organization ? `<p><strong>Org:</strong> ${organization}</p>` : ''}
        ${phone ? `<p><strong>Phone:</strong> +27${phone}</p>` : ''}
        <p><strong>Marketing consent:</strong> ${marketing_consent ? 'Yes' : 'No'}</p>
        <p style="color:#999; font-size:12px;">${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })} SAST</p>
      `,
    });
  } catch (emailErr: any) {
    console.error('SMTP error:', emailErr?.message);
    // Don't block signup — OTP still stored in cookie
  }

  return res.status(200).json({ success: true, message: 'Check your email for a 6-digit verification code.' });
}
