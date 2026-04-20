import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiRequest } from '@/lib/api/api';

interface EnvelopeCount {
  status: string;
  count: string;
}

interface RecentEnvelope {
  id: string;
  name: string;
  status: string;
  created_at: string;
  created_by: string;
}

interface PendingSignature {
  id: string;
  name: string;
  email: string;
  envelope_id: string;
  envelope_name: string;
}

interface ActivityItem {
  id: string;
  action: string;
  created_at: string;
  user: { id: string; name: string };
  metadata: Record<string, any>;
}

interface DashboardData {
  envelope_counts: EnvelopeCount[];
  recent_envelopes: RecentEnvelope[];
  pending_signatures: PendingSignature[];
  recent_activity: ActivityItem[];
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  sent: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  partially_signed: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
  expired: 'bg-orange-100 text-orange-700',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Pending',
  in_progress: 'In Progress',
  partially_signed: 'Partially Signed',
  completed: 'Completed',
  cancelled: 'Declined',
  expired: 'Expired',
};

const EVENT_LABELS: Record<string, string> = {
  envelope_created: 'Created envelope',
  envelope_sent: 'Sent envelope',
  document_signed: 'Document signed',
  envelope_completed: 'Envelope completed',
  envelope_cancelled: 'Envelope cancelled',
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; data: DashboardData }>('/analytics/dashboard');
      setData(res.data);
    } catch (e: any) {
      setError(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getCount = (statuses: string[]): number => {
    if (!data) return 0;
    return data.envelope_counts
      .filter(c => statuses.includes(c.status))
      .reduce((sum, c) => sum + parseInt(c.count), 0);
  };

  const totalSent = data ? data.envelope_counts.reduce((sum, c) => sum + parseInt(c.count), 0) : 0;
  const completedCount = getCount(['completed']);
  const awaitingCount = getCount(['sent', 'in_progress', 'partially_signed']);
  const declinedCount = getCount(['cancelled']);
  const completionRate = totalSent > 0 ? Math.round((completedCount / totalSent) * 100) : 0;

  const stats = [
    { label: 'Total Sent', value: totalSent.toString(), sub: totalSent === 0 ? 'No envelopes yet' : `${totalSent} envelope${totalSent !== 1 ? 's' : ''}`, color: 'border-blue-400' },
    { label: 'Completed', value: completedCount.toString(), sub: `${completionRate}% completion rate`, color: 'border-green-400' },
    { label: 'Awaiting Sign', value: awaitingCount.toString(), sub: awaitingCount === 0 ? 'No action needed' : `${awaitingCount} pending`, color: 'border-yellow-400' },
    { label: 'Declined', value: declinedCount.toString(), sub: declinedCount === 0 ? 'Nothing to review' : `${declinedCount} declined`, color: 'border-red-400' },
  ];

  const compliance = [
    { label: 'ECT Act Compliant', active: true },
    { label: 'POPIA Compliant', active: true },
    { label: 'Audit Trail Active', active: true },
  ];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <DashboardLayout title="Dashboard" activePage="dashboard">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className={`bg-white rounded-xl border-t-4 ${s.color} p-4 shadow-sm`}>
            <p className="text-xs font-medium text-gray-500 mb-1">{s.label}</p>
            <p className="text-3xl font-bold text-gray-900">{loading ? '–' : s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{loading ? '' : s.sub}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 text-sm text-red-700">
          {error} — <button onClick={fetchDashboard} className="underline">retry</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Envelopes */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Envelopes</h2>
            <Link href="/envelopes" className="text-sm text-primary-600 font-medium hover:underline">
              View all →
            </Link>
          </div>

          {loading && (
            <div className="py-8 text-center">
              <div className="animate-spin h-6 w-6 border-3 border-primary-200 border-t-primary-600 rounded-full mx-auto" />
            </div>
          )}

          {!loading && data && data.recent_envelopes.length === 0 && (
            <div className="py-12 text-center">
              <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium mb-1">No envelopes yet</p>
              <p className="text-gray-400 text-sm mb-4">Send your first document to get started</p>
              <Link href="/envelopes/create">
                <button className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors">
                  + Create Envelope
                </button>
              </Link>
            </div>
          )}

          {!loading && data && data.recent_envelopes.length > 0 && (
            <div className="space-y-2">
              {data.recent_envelopes.map(env => (
                <Link key={env.id} href={`/envelopes/${env.id}`} className="block">
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{env.name}</p>
                      <p className="text-xs text-gray-400">by {env.created_by} · {formatDate(env.created_at)}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[env.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[env.status] || env.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Activity */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Activity</h2>
            {!loading && data && data.recent_activity.length > 0 ? (
              <div className="space-y-3">
                {data.recent_activity.slice(0, 5).map(a => (
                  <div key={a.id} className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-primary-400 flex-shrink-0" />
                    <div>
                      <p className="text-gray-700">{EVENT_LABELS[a.action] || a.action}</p>
                      <p className="text-xs text-gray-400">{a.user?.name} · {formatDate(a.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-gray-400 text-sm">No activity yet</p>
                <p className="text-gray-300 text-xs mt-1">Actions will appear here</p>
              </div>
            )}
          </div>

          {/* Compliance */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Compliance</h2>
            <div className="space-y-2">
              {compliance.map(c => (
                <div key={c.label} className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-green-700">{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <Link href="/envelopes/create">
                <button className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700">
                  <span className="text-primary-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </span>
                  New Envelope
                </button>
              </Link>
              <Link href="/templates">
                <button className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700">
                  <span className="text-primary-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                    </svg>
                  </span>
                  Use Template
                </button>
              </Link>
              <Link href="/contacts">
                <button className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700">
                  <span className="text-primary-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                  </span>
                  Manage Contacts
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
