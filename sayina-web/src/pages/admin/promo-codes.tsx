import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface PromoCode {
  id: string;
  code: string;
  plan_name: string;
  duration_days: number;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
}

const API = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

export default function AdminPromoCodes() {
  const router = useRouter();
  const [accessChecked, setAccessChecked] = useState(false);
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansError, setPlansError] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', plan_id: '', duration_days: '30', max_uses: '', expires_at: '', notes: '' });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true);
    setPlansError('');
    try {
      const [codesRes, plansRes] = await Promise.all([
        fetch(`${API}/admin/promo-codes`, { headers }),
        fetch(`${API}/billing/plans`, { headers }),
      ]);
      const codesData = await codesRes.json();
      if (codesData.success) setCodes(codesData.data);

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        if (plansData.success && plansData.data.subscription_plans?.length > 0) {
          setPlans(plansData.data.subscription_plans);
        } else {
          setPlansError('Plans loaded but returned empty. Check DB has active plans.');
        }
      } else {
        setPlansError('Could not load plans from API. Make sure you are logged in as admin and the server is running.');
      }
    } catch {
      setPlansError('Network error loading plans. Please check the server is running.');
    } finally {
      setLoading(false);
    }
  };

  // Guard: only allow admin role to view this page
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('sayina_user_role');
    if (stored && stored !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    setAccessChecked(true);
    load();
  }, []);

  if (!accessChecked) return null;

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'SAYINA';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm(f => ({ ...f, code }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (!form.code || !form.plan_id || !form.duration_days) {
      setFormError('Code, plan and duration are required.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${API}/admin/promo-codes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          code: form.code,
          plan_id: form.plan_id,
          duration_days: parseInt(form.duration_days),
          max_uses: form.max_uses ? parseInt(form.max_uses) : null,
          expires_at: form.expires_at || null,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create code');
      setFormSuccess(`Code "${data.data.code}" created!`);
      setForm({ code: '', plan_id: '', duration_days: '30', max_uses: '', expires_at: '', notes: '' });
      setShowForm(false);
      load();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleCode = async (id: string) => {
    await fetch(`${API}/admin/promo-codes/${id}`, { method: 'PATCH', headers });
    load();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopyFeedback(code);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  return (
    <DashboardLayout title="Promo Codes" activePage="account">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-500 text-sm">Generate codes to give customers free plan access.</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setFormError(''); setFormSuccess(''); }}
          className="bg-[#D4A832] hover:bg-[#c49a28] text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + New Promo Code
        </button>
      </div>

      {/* Success banner */}
      {formSuccess && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {formSuccess}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border-2 border-[#D4A832]/30">
          <h3 className="font-semibold text-gray-900 mb-4">Create Promo Code</h3>
          {formError && <p className="text-red-600 text-sm mb-3">{formError}</p>}
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Code */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Code *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                  placeholder="e.g. SAYINA2026"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#D4A832]"
                />
                <button type="button" onClick={generateCode} className="px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                  Auto
                </button>
              </div>
            </div>

            {/* Plan */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Plan to Grant *</label>
              {plansError ? (
                <div className="border border-red-200 bg-red-50 rounded-lg px-3 py-2 text-xs text-red-600">
                  {plansError}
                  <button type="button" onClick={load} className="ml-2 underline font-semibold">Retry</button>
                </div>
              ) : (
                <select
                  value={form.plan_id}
                  onChange={e => setForm(f => ({ ...f, plan_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A832]"
                >
                  <option value="">Select a plan…</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (R{(p.price / 100).toFixed(0)}/mo)</option>
                  ))}
                </select>
              )}
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Duration (days) *</label>
              <select
                value={form.duration_days}
                onChange={e => setForm(f => ({ ...f, duration_days: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A832]"
              >
                <option value="14">14 days (2 weeks)</option>
                <option value="30">30 days (1 month)</option>
                <option value="60">60 days (2 months)</option>
                <option value="90">90 days (3 months)</option>
                <option value="180">180 days (6 months)</option>
                <option value="365">365 days (1 year)</option>
              </select>
            </div>

            {/* Max uses */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Max Uses <span className="text-gray-300">(blank = unlimited)</span></label>
              <input
                type="number"
                min="1"
                value={form.max_uses}
                onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                placeholder="e.g. 10"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A832]"
              />
            </div>

            {/* Expiry */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Code Expires On <span className="text-gray-300">(optional)</span></label>
              <input
                type="date"
                value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A832]"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes <span className="text-gray-300">(who is this for?)</span></label>
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Beta testers – ABC Corp"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A832]"
              />
            </div>

            <div className="md:col-span-2 flex gap-3 pt-2">
              <button
                type="submit"
                disabled={creating}
                className="bg-[#D4A832] hover:bg-[#c49a28] disabled:opacity-50 text-black font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
              >
                {creating ? 'Creating…' : 'Create Code'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Codes table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading…</div>
        ) : codes.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 font-medium mb-1">No promo codes yet</p>
            <p className="text-gray-400 text-sm">Click "+ New Promo Code" to create your first one.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Duration</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Uses</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {codes.map(c => (
                <tr key={c.id} className={!c.is_active ? 'opacity-50' : ''}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gray-900 tracking-widest">{c.code}</span>
                      <button
                        onClick={() => copyCode(c.code)}
                        className="text-gray-400 hover:text-[#D4A832] transition-colors"
                        title="Copy code"
                      >
                        {copyFeedback === c.code ? (
                          <svg className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{c.plan_name}</td>
                  <td className="px-4 py-3 text-gray-700">{c.duration_days} days</td>
                  <td className="px-4 py-3 text-gray-700">
                    {c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ''}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-[150px] truncate">{c.notes || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleCode(c.id)}
                      className="text-xs text-gray-400 hover:text-gray-700 underline"
                    >
                      {c.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
}
