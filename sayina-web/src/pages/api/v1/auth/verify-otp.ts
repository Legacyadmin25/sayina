import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

function verifyToken(token: string, email: string, otp: string): { valid: boolean; reason?: string } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const parts = decoded.split(':');
    if (parts.length !== 4) return { valid: false, reason: 'Malformed token' };

    const [storedEmail, storedOtp, expiryStr, signature] = parts;
    const expiry = parseInt(expiryStr, 10);

    if (Date.now() > expiry) return { valid: false, reason: 'Code has expired. Please request a new one.' };

    const secret = process.env.OTP_SECRET || 'sayina-otp-s3cr3t-2026';
    const msg = `${storedEmail}:${storedOtp}:${expiryStr}`;
    const expected = crypto.createHmac('sha256', secret).update(msg).digest('hex');

    if (signature !== expected) return { valid: false, reason: 'Invalid token signature.' };
    if (storedEmail !== email) return { valid: false, reason: 'Email mismatch.' };
    if (storedOtp !== otp) return { valid: false, reason: 'Incorrect verification code.' };

    return { valid: true };
  } catch {
    return { valid: false, reason: 'Token parse error.' };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Proxy to Railway backend if available ────────────────────────────────
  const backendUrl = process.env.BACKEND_URL;
  if (backendUrl) {
    try {
      const up = await fetch(`${backendUrl}/api/v1/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: req.headers.cookie || '' },
        body: JSON.stringify(req.body),
      });
      const data = await up.json();
      return res.status(up.status).json(data);
    } catch {
      // fall through
    }
  }

  // ── Local handler ─────────────────────────────────────────────────────────
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required.' });

  const token = req.cookies?.otp_token;
  if (!token) {
    return res.status(400).json({
      message: 'No verification session found. Please sign up again.',
    });
  }

  const result = verifyToken(token, email, otp);
  if (!result.valid) {
    return res.status(400).json({ message: result.reason || 'Invalid code.' });
  }

  // Clear the OTP cookie
  res.setHeader(
    'Set-Cookie',
    'otp_token=; HttpOnly; Secure; Path=/api/v1/auth/verify-otp; SameSite=None; Max-Age=0'
  );

  // Return a simple session token (proper JWT will come from Railway backend later)
  const sessionToken = Buffer.from(`${email}:${Date.now()}`).toString('base64');

  return res.status(200).json({
    success: true,
    token: sessionToken,
    message: 'Account verified successfully.',
  });
}
