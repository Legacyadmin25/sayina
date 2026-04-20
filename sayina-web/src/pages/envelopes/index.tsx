import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiRequest } from '@/lib/api/api';

interface Envelope {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
  expiry_days: number;
  document_count: number;
  signer_count: number;
}

interface EnvelopesResponse {
  success: boolean;
  data: {
    envelopes: Envelope[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

const TABS = [
  { label: 'All', status: '' },
  { label: 'Draft', status: 'draft' },
  { label: 'Pending', status: 'sent' },
  { label: 'In Progress', status: 'in_progress' },
  { label: 'Completed', status: 'completed' },
  { label: 'Declined', status: 'cancelled' },
  { label: 'Expired', status: 'expired' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-secondary-100 text-secondary-700',
  sent: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  expired: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  expired: 'Expired',
  cancelled: 'Declined',
};

export default function EnvelopesPage() {
  const router = useRouter();
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 0, page: 1, limit: 15 });

  const fetchEnvelopes = useCallback(async (status: string, pg: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('page', pg.toString());
      params.append('limit', '15');
      const res = await apiRequest<EnvelopesResponse>(`/envelopes?${params}`);
      setEnvelopes(res.data.envelopes);
      setPagination(res.data.pagination);
    } catch (e: any) {
      setError(e.message || 'Failed to load envelopes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnvelopes(activeTab, page);
  }, [activeTab, page, fetchEnvelopes]);

  const handleTabClick = (status: string) => {
    setActiveTab(status);
    setPage(1);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <DashboardLayout title="Envelopes" activePage="envelopes">
      {/* Actions bar */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-secondary-500 text-sm">Manage all your documents sent for signing.</p>
        <Link href="/envelopes/create">
          <Button>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Envelope
          </Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 border-b border-secondary-100 pb-2 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => handleTabClick(tab.status)}
            className={`px-4 py-2 text-sm rounded-md font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.status
                ? 'bg-primary-50 text-primary-700'
                : 'text-secondary-500 hover:text-secondary-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <Card className="mb-4">
          <CardContent className="py-4">
            <p className="text-red-600 text-sm">{error}</p>
            <button onClick={() => fetchEnvelopes(activeTab, page)} className="text-primary-600 text-sm mt-1 underline">
              Retry
            </button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-3" />
            <p className="text-secondary-500 text-sm">Loading envelopes...</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && envelopes.length === 0 && (
        <Card>
          <CardContent className="py-20 text-center">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
              </svg>
            </div>
            <h3 className="text-secondary-900 font-semibold text-lg mb-2">
              {activeTab ? `No ${TABS.find(t => t.status === activeTab)?.label.toLowerCase()} envelopes` : 'No envelopes yet'}
            </h3>
            <p className="text-secondary-500 text-sm max-w-sm mx-auto mb-6">
              Upload a PDF, add signers, and send your first document for e-signature in minutes.
            </p>
            <Link href="/envelopes/create">
              <Button>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Your First Envelope
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Envelope list */}
      {!loading && !error && envelopes.length > 0 && (
        <>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-secondary-100 text-left text-secondary-500">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Signers</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {envelopes.map((envelope) => (
                    <tr
                      key={envelope.id}
                      className="border-b border-secondary-50 hover:bg-secondary-25 cursor-pointer transition-colors"
                      onClick={() => router.push(`/envelopes/${envelope.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-secondary-900">{envelope.name}</div>
                        <div className="text-xs text-secondary-400">{envelope.document_count} document{envelope.document_count !== 1 ? 's' : ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[envelope.status] || 'bg-secondary-100 text-secondary-700'}`}>
                          {STATUS_LABELS[envelope.status] || envelope.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-secondary-600">
                        {envelope.signer_count} signer{envelope.signer_count !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-3 text-secondary-500">
                        {formatDate(envelope.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/envelopes/${envelope.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary-600 hover:text-primary-800 text-xs font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <p className="text-secondary-500">
                Showing {((page - 1) * pagination.limit) + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page >= pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
