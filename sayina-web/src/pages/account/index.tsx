import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function AccountPage() {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    setUserName(localStorage.getItem('sayina_user_name') || '');
    setUserEmail(localStorage.getItem('sayina_user_email') || '');
  }, []);

  const sections = [
    {
      title: 'Profile',
      description: 'Your name, email, and personal details.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      content: (
        <div className="space-y-3">
          <div>
            <p className="text-xs text-secondary-400 mb-1">Full Name</p>
            <p className="text-secondary-900 font-medium">{userName || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-secondary-400 mb-1">Email</p>
            <p className="text-secondary-900 font-medium">{userEmail || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      title: 'Subscription',
      description: 'Manage your plan and billing.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      content: (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-secondary-900 font-medium">Starter Plan</p>
            <p className="text-secondary-400 text-sm">R150 / month</p>
          </div>
          <Link href="/account/subscription">
            <Button variant="outline" size="sm">Manage Plan</Button>
          </Link>
        </div>
      ),
    },
    {
      title: 'SMS Credits',
      description: 'Top up credits for SMS OTP verification.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
      content: (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-secondary-900 font-medium">Balance: —</p>
            <p className="text-secondary-400 text-sm">Available on paid plans</p>
          </div>
          <Link href="/account/sms-topup">
            <Button variant="outline" size="sm">Top Up</Button>
          </Link>
        </div>
      ),
    },
    {
      title: 'Security',
      description: 'Password, two-factor authentication.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      content: (
        <div className="flex items-center justify-between">
          <p className="text-secondary-500 text-sm">Keep your account secure.</p>
          <Button variant="outline" size="sm" disabled>Coming Soon</Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Settings" activePage="account">
      <div className="max-w-2xl space-y-4">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardContent className="pt-5">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary-50 text-primary-500 rounded-lg flex-shrink-0">
                  {section.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-secondary-900 mb-0.5">{section.title}</h3>
                  <p className="text-secondary-400 text-xs mb-3">{section.description}</p>
                  {section.content}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Danger zone */}
        <Card>
          <CardContent className="pt-5">
            <h3 className="font-semibold text-red-600 mb-1">Danger Zone</h3>
            <p className="text-secondary-400 text-xs mb-3">Irreversible account actions.</p>
            <Button
              variant="outline"
              size="sm"
              className="text-red-500 border-red-200 hover:bg-red-50"
              onClick={() => {
                if (confirm('Are you sure you want to sign out?')) {
                  localStorage.clear();
                  window.location.href = '/auth/login';
                }
              }}
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
