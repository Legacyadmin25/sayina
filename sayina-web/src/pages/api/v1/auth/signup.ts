import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND = process.env.BACKEND_URL || 'https://sayina-production.up.railway.app';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Transform frontend payload to match backend /register schema
  const { name, email, password, phone, organization, marketing_consent } = req.body;
  const nameParts = (name || '').trim().split(' ');
  const first_name = nameParts[0] || '';
  const last_name = nameParts.slice(1).join(' ') || 'User';

  const backendPayload = {
    first_name,
    last_name,
    email,
    password,
    phone: phone ? `+27${phone.replace(/^0/, '')}` : undefined,
    org_name: organization || `${first_name}'s Organisation`,
    marketing_consent: marketing_consent || false,
  };

  try {
    const upstream = await fetch(`${BACKEND}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendPayload),
    });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err: any) {
    return res.status(502).json({ message: 'Could not reach the Sayina server. Please try again.' });
  }
}
