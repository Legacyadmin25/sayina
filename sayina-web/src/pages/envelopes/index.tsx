import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function EnvelopesPage() {
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
      <div className="flex gap-2 mb-6 border-b border-secondary-100 pb-2">
        {['All', 'Draft', 'Pending', 'Completed', 'Declined'].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${
              tab === 'All'
                ? 'bg-primary-50 text-primary-700'
                : 'text-secondary-500 hover:text-secondary-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Empty state */}
      <Card>
        <CardContent className="py-20 text-center">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
            </svg>
          </div>
          <h3 className="text-secondary-900 font-semibold text-lg mb-2">No envelopes yet</h3>
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
    </DashboardLayout>
  );
}
