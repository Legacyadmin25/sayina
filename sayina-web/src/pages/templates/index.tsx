import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function TemplatesPage() {
  return (
    <DashboardLayout title="Templates" activePage="templates">
      <div className="flex items-center justify-between mb-6">
        <p className="text-secondary-500 text-sm">Reusable document templates to speed up your workflow.</p>
        <Button disabled>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Template
        </Button>
      </div>

      <Card>
        <CardContent className="py-20 text-center">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
          </div>
          <h3 className="text-secondary-900 font-semibold text-lg mb-2">Templates coming soon</h3>
          <p className="text-secondary-500 text-sm max-w-sm mx-auto mb-6">
            Save your most-used documents as templates and fill in the details each time — no re-uploading required.
          </p>
          <Link href="/envelopes/create">
            <Button variant="outline">
              Send a Document Now
            </Button>
          </Link>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
