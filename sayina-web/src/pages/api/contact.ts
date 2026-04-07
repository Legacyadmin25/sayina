import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are required.' });
  }

  const smtpHost = process.env.SMTP_HOST || 'mail.sayina.co.za';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER || 'info@sayina.co.za';
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || '';

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
    tls: { rejectUnauthorized: false },
  });

  try {
    // Send notification to Sayina inbox
    await transporter.sendMail({
      from: `"Sayina Website" <${smtpUser}>`,
      to: 'info@sayina.co.za',
      replyTo: `"${name}" <${email}>`,
      subject: subject ? `[Contact] ${subject}` : `[Contact] Message from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #DAB44A; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: white; margin: 0;">New Contact Message — Sayina</h2>
          </div>
          <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; font-weight: bold; color: #333; width: 100px;">Name:</td><td style="padding: 8px 0; color: #555;">${name}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #333;">Email:</td><td style="padding: 8px 0; color: #555;"><a href="mailto:${email}" style="color: #DAB44A;">${email}</a></td></tr>
              ${subject ? `<tr><td style="padding: 8px 0; font-weight: bold; color: #333;">Subject:</td><td style="padding: 8px 0; color: #555;">${subject}</td></tr>` : ''}
            </table>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;"/>
            <p style="font-weight: bold; color: #333; margin-bottom: 8px;">Message:</p>
            <div style="background: white; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb; color: #444; white-space: pre-wrap;">${message}</div>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">Sent from sayina.co.za contact form</p>
          </div>
        </div>
      `,
    });

    // Send auto-reply to sender
    await transporter.sendMail({
      from: `"Sayina" <${smtpUser}>`,
      to: `"${name}" <${email}>`,
      subject: 'We received your message — Sayina',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #DAB44A; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: white; margin: 0;">Thanks for reaching out!</h2>
          </div>
          <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
            <p style="color: #444;">Hi <strong>${name}</strong>,</p>
            <p style="color: #444;">We've received your message and will get back to you within 1 business day (Mon–Fri, 08:00–17:00 SAST).</p>
            <p style="color: #444;">If your query is urgent, you can reply directly to this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;"/>
            <p style="color: #999; font-size: 12px;">LegacyBit Technologies · Sayina E-Signature Platform · <a href="https://sayina.co.za" style="color: #DAB44A;">sayina.co.za</a></p>
          </div>
        </div>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Contact email error:', err);
    return res.status(500).json({ error: 'Failed to send message. Please email us directly at info@sayina.co.za' });
  }
}
