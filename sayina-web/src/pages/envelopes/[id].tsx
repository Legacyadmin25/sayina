import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiRequest } from '@/lib/api/api';

interface Signer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: string;
  order: number;
  status: string;
  completed_at: string | null;
  created_at: string;
}

interface Document {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  page_count: number;
  created_at: string;
}

interface EventItem {
  id: string;
  action: string;
  metadata: string;
  created_at: string;
  user_email: string;
  user_first_name: string;
  user_last_name: string;
}

interface Envelope {
  id: string;
  name: string;
  status: string;
  message: string | null;
  expiry_days: number;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  completed_at: string | null;
}

interface EnvelopeDetailResponse {
  success: boolean;
  data: {
    envelope: Envelope;
    documents: Document[];
    signers: Signer[];
    events: EventItem[];
  };
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-secondary-100 text-secondary-700',
  sent: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  partially_signed: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  expired: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Pending',
  in_progress: 'In Progress',
  partially_signed: 'Partially Signed',
  completed: 'Completed',
  expired: 'Expired',
  cancelled: 'Declined',
};

const SIGNER_STATUS_COLORS: Record<string, string> = {
  pending: 'text-secondary-500',
  current: 'text-blue-600',
  signed: 'text-green-600',
  completed: 'text-green-600',
  declined: 'text-red-600',
  cancelled: 'text-red-500',
};

const ROLE_LABELS: Record<string, string> = {
  signer: 'Signer',
  approver: 'Approver',
  cc: 'CC',
  viewer: 'Viewer',
};

const EVENT_LABELS: Record<string, string> = {
  envelope_created: 'Envelope created',
  envelope_sent: 'Envelope sent',
  document_signed: 'Document signed',
  envelope_completed: 'All signatures completed',
  envelope_cancelled: 'Envelope cancelled',
  field_submitted: 'Fields submitted',
};

export default function EnvelopeDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [signers, setSigners] = useState<Signer[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchEnvelope();
  }, [id]);

  const fetchEnvelope = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<EnvelopeDetailResponse>(`/envelopes/${id}`);
      setEnvelope(res.data.envelope);
      setDocuments(res.data.documents);
      setSigners(res.data.signers);
      setEvents(res.data.events);
    } catch (e: any) {
      setError(e.message || 'Failed to load envelope');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await apiRequest(`/envelopes/${id}/cancel`, { method: 'POST' });
      setShowCancelConfirm(false);
      await fetchEnvelope();
    } catch (e: any) {
      setError(e.message || 'Failed to cancel envelope');
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canCancel = envelope && ['sent', 'in_progress', 'partially_signed'].includes(envelope.status);

  return (
    <DashboardLayout title="Envelope Details" activePage="envelopes">
      {/* Back link */}
      <div className="mb-4">
        <Link href="/envelopes" className="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Envelopes
        </Link>
      </div>

      {loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-3" />
            <p className="text-secondary-500 text-sm">Loading envelope...</p>
          </CardContent>
        </Card>
      )}

      {error && !loading && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-600 mb-2">{error}</p>
            <button onClick={fetchEnvelope} className="text-primary-600 text-sm underline">Retry</button>
          </CardContent>
        </Card>
      )}

      {envelope && !loading && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-secondary-900">{envelope.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[envelope.status] || 'bg-secondary-100 text-secondary-700'}`}>
                  {STATUS_LABELS[envelope.status] || envelope.status}
                </span>
                <span className="text-sm text-secondary-500">Created {formatDate(envelope.created_at)}</span>
              </div>
              {envelope.message && (
                <p className="mt-2 text-sm text-secondary-600">{envelope.message}</p>
              )}
            </div>
            <div className="flex gap-2">
              {canCancel && (
                <Button
                  variant="outline"
                  onClick={() => setShowCancelConfirm(true)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Cancel Envelope
                </Button>
              )}
            </div>
          </div>

          {/* Cancel confirmation */}
          {showCancelConfirm && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-4">
                <p className="text-red-800 font-medium mb-2">Are you sure you want to cancel this envelope?</p>
                <p className="text-red-600 text-sm mb-4">This will cancel all pending signatures. Signers who haven't signed yet will no longer be able to do so.</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCancelConfirm(false)}
                    disabled={cancelling}
                  >
                    Keep Envelope
                  </Button>
                  <Button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {cancelling ? 'Cancelling...' : 'Yes, Cancel It'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-secondary-500 text-sm">No documents attached.</p>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded flex items-center justify-center">
                          <span className="text-red-600 text-xs font-bold">PDF</span>
                        </div>
                        <div>
                          <p className="font-medium text-secondary-900 text-sm">{doc.name}</p>
                          <p className="text-xs text-secondary-400">
                            {doc.page_count} page{doc.page_count !== 1 ? 's' : ''} &middot; {formatFileSize(doc.file_size)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Signers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recipients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {signers.map((signer) => (
                  <div key={signer.id} className="flex items-center justify-between p-3 border border-secondary-100 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-secondary-900 text-sm">
                          {signer.first_name} {signer.last_name}
                        </p>
                        <span className="text-xs bg-secondary-100 text-secondary-600 px-2 py-0.5 rounded-full">
                          {ROLE_LABELS[signer.role] || signer.role}
                        </span>
                      </div>
                      <p className="text-xs text-secondary-400">{signer.email}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium capitalize ${SIGNER_STATUS_COLORS[signer.status] || 'text-secondary-500'}`}>
                        {signer.status === 'signed' || signer.status === 'completed' ? 'Signed' : signer.status}
                      </p>
                      {signer.completed_at && (
                        <p className="text-xs text-secondary-400">{formatDate(signer.completed_at)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Activity / Events */}
          {events.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {events.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 mt-1.5 rounded-full bg-primary-400 flex-shrink-0" />
                      <div>
                        <p className="text-secondary-800">
                          {EVENT_LABELS[event.action] || event.action}
                          <span className="text-secondary-400 ml-2">
                            by {event.user_first_name} {event.user_last_name}
                          </span>
                        </p>
                        <p className="text-xs text-secondary-400">{formatDate(event.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-secondary-400">Created</dt>
                  <dd className="text-secondary-800 font-medium">{formatDate(envelope.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-secondary-400">Sent</dt>
                  <dd className="text-secondary-800 font-medium">{formatDate(envelope.sent_at)}</dd>
                </div>
                <div>
                  <dt className="text-secondary-400">Completed</dt>
                  <dd className="text-secondary-800 font-medium">{formatDate(envelope.completed_at)}</dd>
                </div>
                <div>
                  <dt className="text-secondary-400">Expires after</dt>
                  <dd className="text-secondary-800 font-medium">{envelope.expiry_days} days</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
