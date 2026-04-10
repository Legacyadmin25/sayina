import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function ContactsPage() {
  return (
    <DashboardLayout title="Contacts" activePage="contacts">
      <div className="flex items-center justify-between mb-6">
        <p className="text-secondary-500 text-sm">Manage your signers and frequent recipients.</p>
        <Button disabled>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Contact
        </Button>
      </div>

      <Card>
        <CardContent className="py-20 text-center">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-secondary-900 font-semibold text-lg mb-2">No contacts yet</h3>
          <p className="text-secondary-500 text-sm max-w-sm mx-auto mb-2">
            Contacts are saved automatically when you add signers to your envelopes.
          </p>
          <p className="text-secondary-400 text-xs max-w-sm mx-auto">
            Full contact management is coming soon.
          </p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
