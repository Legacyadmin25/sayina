import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND = process.env.BACKEND_URL || 'https://sayina-production.up.railway.app';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization || '';

  try {
    // Backend verify-email needs auth token + otp + method
    const upstream = await fetch(`${BACKEND}/api/v1/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify({ otp: req.body.otp, method: 'sms' }),
    });
    const data = await upstream.json();
    // Forward the real JWT token if present
    if (data.data?.token) {
      return res.status(upstream.status).json({ ...data, token: data.data.token, success: true });
    }
    return res.status(upstream.status).json(data);
  } catch (err: any) {
    return res.status(502).json({ message: 'Could not reach the Sayina server. Please try again.' });
  }
}
