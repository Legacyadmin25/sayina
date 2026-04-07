import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userInitials, setUserInitials] = useState('');

  // Read real user name from localStorage on mount
  useEffect(() => {
    const storedName = localStorage.getItem('sayina_user_name') || '';
    if (storedName) {
      setUserName(storedName);
      const parts = storedName.trim().split(' ');
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : storedName.slice(0, 2).toUpperCase();
      setUserInitials(initials);
    }
  }, []);

  const firstName = userName ? userName.trim().split(' ')[0] : 'there';

  return (
    <>
      <Head>
        <title>Dashboard | Sayina</title>
      </Head>

      <div className="min-h-screen bg-secondary-50">
        {/* Sidebar */}
        <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-secondary-100 z-20 hidden md:block">
          <div className="p-4 border-b border-secondary-100 flex items-center gap-2">
            <Image
              src="/logo-192.png.svg"
              alt="Sayina Logo"
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="text-xl font-bold text-secondary-900">Sayina</span>
          </div>
          <nav className="p-4">
            <ul className="space-y-1">
              <li>
                <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary-50 text-primary-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/envelopes" className="flex items-center gap-2 px-3 py-2 rounded-md text-secondary-600 hover:bg-secondary-50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8.707 7.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l2-2a1 1 0 00-1.414-1.414L11 7.586V3a1 1 0 10-2 0v4.586l-.293-.293z" />
                    <path d="M3 5a2 2 0 012-2h1a1 1 0 010 2H5v7h2l1 2h4l1-2h2V5h-1a1 1 0 110-2h1a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
                  </svg>
                  Envelopes
                </Link>
              </li>
              <li>
                <Link href="/templates" className="flex items-center gap-2 px-3 py-2 rounded-md text-secondary-600 hover:bg-secondary-50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                  </svg>
                  Templates
                </Link>
              </li>
              <li>
                <Link href="/contacts" className="flex items-center gap-2 px-3 py-2 rounded-md text-secondary-600 hover:bg-secondary-50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                  Contacts
                </Link>
              </li>
              <li>
                <Link href="/account" className="flex items-center gap-2 px-3 py-2 rounded-md text-secondary-600 hover:bg-secondary-50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                  Settings
                </Link>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <div className="md:pl-64">
          {/* Header */}
          <header className="bg-white border-b border-secondary-100 py-4 px-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-secondary-900">Dashboard</h1>
              <p className="text-secondary-500">
                {userName ? `Welcome back, ${userName}` : 'Welcome to Sayina'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(true)}
              >
                Need Help?
              </Button>
              <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-sm">
                {userInitials || '?'}
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="p-6">
            {/* Quick Actions */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/envelopes/create">
                  <Button fullWidth className="flex flex-col items-center py-4 h-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    New Envelope
                  </Button>
                </Link>
                <Button fullWidth variant="secondary" className="flex flex-col items-center py-4 h-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  </svg>
                  Use Template
                </Button>
                <Button fullWidth variant="outline" className="flex flex-col items-center py-4 h-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  New Template
                </Button>
                <Button fullWidth variant="ghost" className="flex flex-col items-center py-4 h-auto text-secondary-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  View History
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-secondary-500">Envelopes Sent</p>
                        <p className="text-3xl font-bold text-secondary-900">0</p>
                      </div>
                      <div className="p-2 bg-primary-50 text-primary-500 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                        </svg>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-secondary-400">Send your first document to get started</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-secondary-500">Documents Signed</p>
                        <p className="text-3xl font-bold text-secondary-900">0</p>
                      </div>
                      <div className="p-2 bg-green-50 text-green-500 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-secondary-400">Completed signatures will appear here</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-secondary-500">SMS Balance</p>
                        <p className="text-3xl font-bold text-secondary-900">—</p>
                      </div>
                      <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-secondary-400">SMS credits available on paid plans</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Recent Documents — empty state */}
            <div>
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">Recent Documents</h2>
              <Card>
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-secondary-900 font-semibold mb-1">No documents yet</h3>
                  <p className="text-secondary-500 text-sm max-w-xs mx-auto mb-6">
                    Send your first document for signing to get started. It only takes a minute.
                  </p>
                  <Link href="/envelopes/create">
                    <Button>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Send Your First Document
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>

      {/* Help Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Need Help?"
        size="md"
      >
        <div>
          <p className="mb-4 text-secondary-600">
            How can we assist you with Sayina e-signature services?
          </p>
          <div className="space-y-2">
            <div className="p-3 border rounded-md hover:bg-secondary-50 cursor-pointer">
              <h3 className="font-medium text-secondary-900">How do I create a new envelope?</h3>
            </div>
            <div className="p-3 border rounded-md hover:bg-secondary-50 cursor-pointer">
              <h3 className="font-medium text-secondary-900">Adding signers to documents</h3>
            </div>
            <div className="p-3 border rounded-md hover:bg-secondary-50 cursor-pointer">
              <h3 className="font-medium text-secondary-900">SMS verification setup</h3>
            </div>
            <div className="p-3 border rounded-md hover:bg-secondary-50 cursor-pointer">
              <h3 className="font-medium text-secondary-900">Contact support team</h3>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>Close</Button>
          <Link href="/contact"><Button>Contact Support</Button></Link>
        </div>
      </Modal>
    </>
  );
}
