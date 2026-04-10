import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface EnvelopeStat {
  total: number;
  completed: number;
  pending: number;
  declined: number;
  draft: number;
}

const API = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

export default function ReportsPage() {
  const [stats, setStats] = useState<EnvelopeStat | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentEnvelopes, setRecentEnvelopes] = useState<any[]>([]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) { setLoading(false); return; }

    fetch(`${API}/envelopes?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        const list: any[] = data.data?.envelopes || data.data || [];
        setRecentEnvelopes(list.slice(0, 5));
        const s: EnvelopeStat = { total: list.length, completed: 0, pending: 0, declined: 0, draft: 0 };
        list.forEach((e: any) => {
          const status = (e.status || '').toLowerCase();
          if (status === 'completed' || status === 'signed') s.completed++;
          else if (status === 'pending' || status === 'sent' || status === 'awaiting') s.pending++;
          else if (status === 'declined' || status === 'rejected') s.declined++;
          else if (status === 'draft') s.draft++;
        });
        setStats(s);
      })
      .catch(() => setStats({ total: 0, completed: 0, pending: 0, declined: 0, draft: 0 }))
      .finally(() => setLoading(false));
  }, []);

  const pct = (n: number) => stats?.total ? Math.round((n / stats.total) * 100) : 0;

  const statCards = stats ? [
    { label: 'Total Sent', value: stats.total, color: 'bg-blue-500', light: 'bg-blue-50 text-blue-700' },
    { label: 'Completed', value: stats.completed, color: 'bg-green-500', light: 'bg-green-50 text-green-700' },
    { label: 'Awaiting Signature', value: stats.pending, color: 'bg-yellow-500', light: 'bg-yellow-50 text-yellow-700' },
    { label: 'Declined', value: stats.declined, color: 'bg-red-500', light: 'bg-red-50 text-red-700' },
  ] : [];

  const statusLabel = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'signed') return { label: 'Completed', cls: 'bg-green-100 text-green-700' };
    if (s === 'pending' || s === 'sent' || s === 'awaiting') return { label: 'Pending', cls: 'bg-yellow-100 text-yellow-700' };
    if (s === 'declined' || s === 'rejected') return { label: 'Declined', cls: 'bg-red-100 text-red-700' };
    return { label: 'Draft', cls: 'bg-gray-100 text-gray-500' };
  };

  return (
    <DashboardLayout title="Reports" activePage="reports">
      <div className="mb-6">
        <p className="text-gray-500 text-sm">Analytics and reporting for your e-signature activity.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Loading your data…</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {statCards.map(card => (
              <div key={card.label} className="bg-white rounded-xl shadow-sm p-5 border-t-4" style={{ borderColor: '' }}
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 ${card.light}`}>
                  <span className="text-xl font-bold">{card.value}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm text-gray-500 mt-1">{card.label}</p>
                {stats && stats.total > 0 && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${card.color}`} style={{ width: `${pct(card.value)}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{pct(card.value)}% of total</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Completion rate */}
          {stats && stats.total > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Completion Rate</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="w-full bg-gray-100 rounded-full h-4">
                    <div
                      className="h-4 rounded-full bg-green-500 transition-all"
                      style={{ width: `${pct(stats.completed)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{pct(stats.completed)}% completed</span>
                    <span>{stats.total} total envelopes</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-green-600">{pct(stats.completed)}%</div>
              </div>
            </div>
          )}

          {/* Recent envelope activity */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Recent Envelope Activity</h3>
            </div>
            {recentEnvelopes.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No envelopes sent yet — data will appear here once you start sending.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Document</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentEnvelopes.map((env: any) => {
                    const s = statusLabel(env.status);
                    return (
                      <tr key={env.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900 truncate max-w-[250px]">
                          {env.name || env.subject || env.file_name || 'Untitled'}
                        </td>
                        <td className="px-6 py-3 text-gray-500">
                          {env.created_at ? new Date(env.created_at).toLocaleDateString('en-ZA') : '—'}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${s.cls}`}>{s.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Coming soon features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {[
              { title: 'Signer Activity', description: 'See who signed, when, and from which device or location.' },
              { title: 'Audit Trail Export', description: 'Download full audit trail logs as PDF or CSV for compliance purposes.' },
            ].map(r => (
              <div key={r.title} className="bg-white rounded-xl shadow-sm p-6 flex items-start gap-4 opacity-60">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900">{r.title}</h3>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg font-medium">Coming Soon</span>
                  </div>
                  <p className="text-sm text-gray-400">{r.description}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
