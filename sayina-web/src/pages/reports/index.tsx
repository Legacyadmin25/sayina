import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const API = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

type DateRange = '7d' | '30d' | '90d' | 'all';

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

interface EnvelopeAnalytics {
  by_date: { date: string; completed: number; pending: number; declined: number; draft: number; total: number }[];
  by_status: Record<string, number>;
  summary: { completion_rate: number; avg_completion_time: number };
}

interface SignerAnalytics {
  by_status: Record<string, number>;
  device_breakdown: Record<string, number>;
  summary: { avg_time_to_sign: number; view_to_sign_rate: number };
}

function getDateRange(range: DateRange): { start_date: string; end_date: string } | null {
  const end = new Date();
  const end_date = end.toISOString().split('T')[0];
  if (range === 'all') return null;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return { start_date: start.toISOString().split('T')[0], end_date };
}

function intervalForRange(range: DateRange): string {
  if (range === '7d') return 'day';
  if (range === '30d') return 'day';
  if (range === '90d') return 'week';
  return 'month';
}

function formatHours(minutes: number | undefined | null): string {
  if (minutes == null || isNaN(minutes)) return '—';
  const h = minutes / 60;
  if (h < 1) return `${Math.round(minutes)}m`;
  return `${h.toFixed(1)}h`;
}

function formatPct(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return '—';
  return `${Math.round(value * 100)}%`;
}

export default function ReportsPage() {
  const [range, setRange] = useState<DateRange>('30d');
  const [envelopeData, setEnvelopeData] = useState<EnvelopeAnalytics | null>(null);
  const [signerData, setSignerData] = useState<SignerAnalytics | null>(null);
  const [recentEnvelopes, setRecentEnvelopes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (selectedRange: DateRange) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) { setLoading(false); return; }

    setLoading(true);
    setError(null);

    const dates = getDateRange(selectedRange);
    const interval = intervalForRange(selectedRange);
    const dateParams = dates
      ? `start_date=${dates.start_date}&end_date=${dates.end_date}`
      : '';

    const envelopeQs = dateParams
      ? `?${dateParams}&interval=${interval}`
      : `?interval=${interval}`;

    const signerQs = dateParams ? `?${dateParams}` : '';

    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [envRes, sigRes, recentRes] = await Promise.all([
        fetch(`${API}/analytics/envelopes${envelopeQs}`, { headers }),
        fetch(`${API}/analytics/signers${signerQs}`, { headers }),
        fetch(`${API}/envelopes?limit=5`, { headers }),
      ]);

      if (!envRes.ok || !sigRes.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const envJson = await envRes.json();
      const sigJson = await sigRes.json();
      const recentJson = await recentRes.json();

      setEnvelopeData(envJson.data || envJson);
      setSignerData(sigJson.data || sigJson);

      const list = recentJson.data?.envelopes || recentJson.data || [];
      setRecentEnvelopes(Array.isArray(list) ? list.slice(0, 5) : []);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);

  // Derived stats
  const byStatus = envelopeData?.by_status || {};
  const totalEnvelopes = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const completedCount = byStatus['completed'] || byStatus['signed'] || 0;
  const pendingCount = byStatus['pending'] || byStatus['sent'] || byStatus['awaiting'] || 0;
  const declinedCount = byStatus['declined'] || byStatus['rejected'] || 0;
  const draftCount = byStatus['draft'] || 0;

  const completionRate = envelopeData?.summary?.completion_rate;
  const avgCompletionTime = envelopeData?.summary?.avg_completion_time;
  const viewToSignRate = signerData?.summary?.view_to_sign_rate;
  const avgTimeToSign = signerData?.summary?.avg_time_to_sign;

  const pct = (n: number) => totalEnvelopes > 0 ? Math.round((n / totalEnvelopes) * 100) : 0;

  const statCards = [
    { label: 'Total Sent', value: totalEnvelopes, color: 'bg-blue-500', light: 'bg-blue-50 text-blue-700' },
    { label: 'Completed', value: completedCount, color: 'bg-green-500', light: 'bg-green-50 text-green-700' },
    { label: 'Awaiting Signature', value: pendingCount, color: 'bg-yellow-500', light: 'bg-yellow-50 text-yellow-700' },
    { label: 'Declined', value: declinedCount, color: 'bg-red-500', light: 'bg-red-50 text-red-700' },
    { label: 'Avg Completion Time', value: formatHours(avgCompletionTime), color: 'bg-purple-500', light: 'bg-purple-50 text-purple-700', isText: true },
    { label: 'View-to-Sign Rate', value: formatPct(viewToSignRate), color: 'bg-indigo-500', light: 'bg-indigo-50 text-indigo-700', isText: true },
  ];

  const statusLabel = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'signed') return { label: 'Completed', cls: 'bg-green-100 text-green-700' };
    if (s === 'pending' || s === 'sent' || s === 'awaiting') return { label: 'Pending', cls: 'bg-yellow-100 text-yellow-700' };
    if (s === 'declined' || s === 'rejected') return { label: 'Declined', cls: 'bg-red-100 text-red-700' };
    return { label: 'Draft', cls: 'bg-gray-100 text-gray-500' };
  };

  // Chart helpers
  const byDate = envelopeData?.by_date || [];
  const maxTotal = Math.max(...byDate.map(d => d.total || 0), 1);

  // Device breakdown
  const deviceBreakdown = signerData?.device_breakdown || {};
  const totalDevices = Object.values(deviceBreakdown).reduce((a, b) => a + b, 0);
  const deviceColors: Record<string, string> = {
    android: 'bg-green-500',
    ios: 'bg-blue-500',
    windows: 'bg-indigo-500',
    mac: 'bg-purple-500',
    macos: 'bg-purple-500',
    linux: 'bg-orange-500',
    other: 'bg-gray-400',
  };

  // Signer status breakdown
  const signerByStatus = signerData?.by_status || {};
  const totalSignerStatuses = Object.values(signerByStatus).reduce((a, b) => a + b, 0);

  return (
    <DashboardLayout title="Reports" activePage="reports">
      {/* Header with date range selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <p className="text-gray-500 text-sm">Analytics and reporting for your e-signature activity.</p>
        <select
          value={range}
          onChange={e => setRange(e.target.value as DateRange)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-full sm:w-auto"
        >
          {DATE_RANGE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <svg className="animate-spin h-5 w-5 mr-3 text-gray-400" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading analytics...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium mb-2">Failed to load analytics</p>
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => fetchData(range)}
            className="text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {statCards.map(card => (
              <div key={card.label} className="bg-white rounded-xl shadow-sm p-5 border-t-4" style={{ borderTopColor: 'transparent' }}>
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 ${card.light}`}>
                  <span className="text-sm font-bold">
                    {'isText' in card && card.isText
                      ? String(card.value).charAt(0)
                      : card.value}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm text-gray-500 mt-1">{card.label}</p>
                {!('isText' in card && card.isText) && totalEnvelopes > 0 && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${card.color}`} style={{ width: `${pct(card.value as number)}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{pct(card.value as number)}% of total</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Completion rate */}
          {totalEnvelopes > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Completion Rate</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="w-full bg-gray-100 rounded-full h-4">
                    <div
                      className="h-4 rounded-full bg-green-500 transition-all"
                      style={{ width: `${completionRate != null ? Math.round(completionRate * 100) : pct(completedCount)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{completionRate != null ? Math.round(completionRate * 100) : pct(completedCount)}% completed</span>
                    <span>{totalEnvelopes} total envelopes</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-green-600">
                  {completionRate != null ? Math.round(completionRate * 100) : pct(completedCount)}%
                </div>
              </div>
            </div>
          )}

          {/* Envelope Trend Chart */}
          {byDate.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Envelope Trends</h3>
              <div className="flex items-end gap-1 h-48 overflow-x-auto pb-2">
                {byDate.map((d, i) => {
                  const total = d.total || 0;
                  const barH = total > 0 ? Math.max((total / maxTotal) * 100, 4) : 0;
                  const completedH = total > 0 ? (d.completed / total) * barH : 0;
                  const pendingH = total > 0 ? ((d.pending || 0) / total) * barH : 0;
                  const declinedH = total > 0 ? ((d.declined || 0) / total) * barH : 0;
                  const draftH = barH - completedH - pendingH - declinedH;
                  const label = d.date?.length > 7 ? d.date.slice(5) : d.date;
                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center flex-1 min-w-[24px] max-w-[48px] group relative"
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                        {d.date}: {total} total
                      </div>
                      <div className="flex flex-col justify-end w-full" style={{ height: '160px' }}>
                        {total > 0 ? (
                          <div className="flex flex-col w-full rounded-t overflow-hidden" style={{ height: `${barH}%` }}>
                            {completedH > 0 && <div className="bg-green-500 w-full" style={{ flexGrow: completedH }} />}
                            {pendingH > 0 && <div className="bg-yellow-400 w-full" style={{ flexGrow: pendingH }} />}
                            {declinedH > 0 && <div className="bg-red-400 w-full" style={{ flexGrow: declinedH }} />}
                            {draftH > 0 && <div className="bg-gray-300 w-full" style={{ flexGrow: draftH }} />}
                          </div>
                        ) : (
                          <div className="bg-gray-100 w-full rounded-t" style={{ height: '2px' }} />
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1 truncate w-full text-center">{label}</span>
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex gap-4 mt-4 text-xs text-gray-500 flex-wrap">
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Completed</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" /> Pending</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" /> Declined</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-300 inline-block" /> Draft</div>
              </div>
            </div>
          )}

          {/* Signer Activity and Device Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Signer Activity */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Signer Activity</h3>
              {totalSignerStatuses === 0 ? (
                <p className="text-gray-400 text-sm py-4">No signer activity in this period.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(signerByStatus).map(([status, count]) => {
                    const pctVal = totalSignerStatuses > 0 ? Math.round((count / totalSignerStatuses) * 100) : 0;
                    const colorMap: Record<string, string> = {
                      signed: 'bg-green-500', completed: 'bg-green-500',
                      viewed: 'bg-blue-500', opened: 'bg-blue-400',
                      pending: 'bg-yellow-400', sent: 'bg-yellow-400',
                      declined: 'bg-red-500', rejected: 'bg-red-500',
                    };
                    const barColor = colorMap[status.toLowerCase()] || 'bg-gray-400';
                    return (
                      <div key={status}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700 capitalize">{status}</span>
                          <span className="text-gray-500">{count} ({pctVal}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                          <div className={`h-2.5 rounded-full ${barColor} transition-all`} style={{ width: `${pctVal}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {avgTimeToSign != null && (
                    <div className="pt-3 border-t border-gray-100 mt-3">
                      <p className="text-sm text-gray-500">Avg time to sign: <span className="font-semibold text-gray-900">{formatHours(avgTimeToSign)}</span></p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Device Breakdown */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Signer Device Breakdown</h3>
              {totalDevices === 0 ? (
                <p className="text-gray-400 text-sm py-4">No device data available for this period.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(deviceBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([device, count]) => {
                      const pctVal = totalDevices > 0 ? Math.round((count / totalDevices) * 100) : 0;
                      const barColor = deviceColors[device.toLowerCase()] || 'bg-gray-400';
                      return (
                        <div key={device}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700 capitalize">{device}</span>
                            <span className="text-gray-500">{count} ({pctVal}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2.5">
                            <div className={`h-2.5 rounded-full ${barColor} transition-all`} style={{ width: `${pctVal}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

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
        </>
      )}
    </DashboardLayout>
  );
}
