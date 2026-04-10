import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

type ActivePage = 'dashboard' | 'envelopes' | 'templates' | 'contacts' | 'account';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  activePage?: ActivePage;
}

export function DashboardLayout({ children, title = 'Dashboard', activePage }: DashboardLayoutProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userInitials, setUserInitials] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  const navItems = [
    {
      key: 'dashboard',
      href: '/dashboard',
      label: 'Dashboard',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      ),
    },
    {
      key: 'envelopes',
      href: '/envelopes',
      label: 'Envelopes',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
        </svg>
      ),
    },
    {
      key: 'templates',
      href: '/templates',
      label: 'Templates',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
        </svg>
      ),
    },
    {
      key: 'contacts',
      href: '/contacts',
      label: 'Contacts',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
        </svg>
      ),
    },
    {
      key: 'account',
      href: '/account',
      label: 'Settings',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <Head>
        <title>{title} | Sayina</title>
      </Head>

      <div className="min-h-screen bg-secondary-50">
        {/* Sidebar */}
        <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-secondary-100 z-20 hidden md:block">
          <div className="p-4 border-b border-secondary-100 flex items-center gap-2">
            <Image
              src="/sayina-logo.png"
              alt="Sayina Logo"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-xl font-bold text-secondary-900">Sayina</span>
          </div>
          <nav className="p-4">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = activePage === item.key;
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-secondary-600 hover:bg-secondary-50'
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Mobile top bar */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-20 bg-white border-b border-secondary-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/sayina-logo.png" alt="Sayina" width={28} height={28} className="rounded-lg" />
            <span className="font-bold text-secondary-900">Sayina</span>
          </div>
          <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="p-2 text-secondary-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileNavOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>

        {/* Mobile nav dropdown */}
        {mobileNavOpen && (
          <div className="md:hidden fixed top-14 left-0 right-0 z-20 bg-white border-b border-secondary-100 shadow-lg">
            <nav className="p-4">
              <ul className="space-y-1">
                {navItems.map((item) => {
                  const isActive = activePage === item.key;
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileNavOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md ${
                          isActive ? 'bg-primary-50 text-primary-700' : 'text-secondary-600'
                        }`}
                      >
                        {item.icon}
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        )}

        {/* Main Content */}
        <div className="md:pl-64 pt-14 md:pt-0">
          {/* Header */}
          <header className="bg-white border-b border-secondary-100 py-4 px-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-secondary-900">{title}</h1>
              {userName && (
                <p className="text-secondary-500 text-sm">Welcome back, {userName}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => setIsHelpOpen(true)}>
                Need Help?
              </Button>
              <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-sm">
                {userInitials || '?'}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>

      {/* Help Modal */}
      <Modal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} title="Need Help?" size="md">
        <div>
          <p className="mb-4 text-secondary-600">How can we assist you with Sayina e-signature services?</p>
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
          <Button variant="outline" onClick={() => setIsHelpOpen(false)}>Close</Button>
          <Link href="/contact"><Button>Contact Support</Button></Link>
        </div>
      </Modal>
    </>
  );
}
