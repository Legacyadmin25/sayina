import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  // ── Proxy to Railway backend if available ────────────────────────────────
  const backendUrl = process.env.BACKEND_URL;
  if (backendUrl) {
    try {
      const up = await fetch(`${backendUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await up.json();
      return res.status(up.status).json(data);
    } catch {
      // fall through
    }
  }

  // ── Local demo handler ────────────────────────────────────────────────────
  // Until Railway backend is live, return a demo session for any valid-looking credentials
  if (password.length < 8) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const sessionToken = Buffer.from(`${email}:${Date.now()}`).toString('base64');
  return res.status(200).json({
    success: true,
    token: sessionToken,
    user: { email },
    message: 'Logged in successfully.',
  });
}
