import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, ReactNode } from 'react';

export type ActivePage = 'dashboard' | 'envelopes' | 'templates' | 'contacts' | 'reports' | 'account' | 'billing';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  activePage?: ActivePage;
}

export function DashboardLayout({ children, title = 'Dashboard', activePage }: DashboardLayoutProps) {
  const [userName, setUserName] = useState('');
  const [userInitials, setUserInitials] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [greeting, setGreeting] = useState('Good morning');
  const [envelopeCount] = useState(0); // Will come from API in future

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
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening');
  }, []);

  const firstName = userName ? userName.trim().split(' ')[0] : 'there';

  const handleSignOut = () => {
    localStorage.clear();
    window.location.href = '/auth/login';
  };

  const mainNav = [
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
      badge: envelopeCount > 0 ? envelopeCount : null,
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
      key: 'reports',
      href: '/reports',
      label: 'Reports',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
        </svg>
      ),
    },
  ];

  const accountNav = [
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
    {
      key: 'billing',
      href: '/account/subscription',
      label: 'Billing',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
          <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
        </svg>
      ),
    },
  ];

  const NavItem = ({ item, onClick }: { item: typeof mainNav[0] & { badge?: number | null }, onClick?: () => void }) => {
    const isActive = activePage === item.key;
    return (
      <li>
        <Link
          href={item.href}
          onClick={onClick}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
            isActive
              ? 'bg-[#D4A832] text-black'
              : 'text-gray-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <span className={isActive ? 'text-black' : 'text-gray-400'}>{item.icon}</span>
          <span className="flex-1">{item.label}</span>
          {'badge' in item && item.badge ? (
            <span className="bg-[#D4A832] text-black text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
              {item.badge}
            </span>
          ) : null}
        </Link>
      </li>
    );
  };

  const sidebarContent = (onItemClick?: () => void) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-white/10 flex items-center gap-3">
        <Image src="/sayina-logo.png" alt="Sayina" width={36} height={36} className="rounded-lg" />
        <span className="text-xl font-bold text-white tracking-wide">Sayina</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">Main Menu</p>
        <ul className="space-y-0.5 mb-6">
          {mainNav.map(item => <NavItem key={item.key} item={item} onClick={onItemClick} />)}
        </ul>

        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">Account</p>
        <ul className="space-y-0.5">
          {accountNav.map(item => <NavItem key={item.key} item={item} onClick={onItemClick} />)}
        </ul>
      </nav>

      {/* Starter Plan + Sign Out */}
      <div className="p-4 border-t border-white/10 space-y-3">
        <div className="bg-white/10 rounded-lg px-3 py-2.5">
          <p className="text-xs font-bold text-[#D4A832] uppercase tracking-wider">Starter Plan</p>
          <p className="text-xs text-gray-400 mt-0.5">0/5 envelopes used</p>
          <div className="mt-2 h-1.5 bg-white/20 rounded-full">
            <div className="h-1.5 bg-[#D4A832] rounded-full" style={{ width: '0%' }} />
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>{title} | Sayina</title>
      </Head>

      <div className="min-h-screen bg-gray-50 flex">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 w-64 bg-gray-900 z-20 hidden md:flex flex-col">
          {sidebarContent()}
        </aside>

        {/* Mobile overlay */}
        {mobileNavOpen && (
          <div className="md:hidden fixed inset-0 z-30 flex">
            <div className="fixed inset-0 bg-black/50" onClick={() => setMobileNavOpen(false)} />
            <aside className="relative w-64 bg-gray-900 flex flex-col shadow-xl">
              {sidebarContent(() => setMobileNavOpen(false))}
            </aside>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
          {/* Top header */}
          <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-50 mr-3"
              onClick={() => setMobileNavOpen(true)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Greeting */}
            <div className="hidden md:block">
              <p className="text-sm text-gray-500">Welcome back,</p>
              <h1 className="text-xl font-bold text-gray-900">{greeting}, {firstName}</h1>
            </div>
            <h1 className="md:hidden text-lg font-bold text-gray-900">{title}</h1>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Link href="/envelopes/create">
                <button className="flex items-center gap-2 bg-[#D4A832] hover:bg-[#c49a28] text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  New Envelope
                </button>
              </Link>

              {/* Notification bell */}
              <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
              </button>

              {/* User avatar */}
              <div className="w-9 h-9 rounded-full bg-[#D4A832] flex items-center justify-center text-black font-bold text-sm">
                {userInitials || '?'}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
