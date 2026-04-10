import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface HeaderProps {
  activePage?: 'features' | 'pricing' | 'compliance' | 'contact';
}

export function Header({ activePage }: HeaderProps) {
  const [open, setOpen] = useState(false);

  const links = [
    { href: '/features', label: 'Features', key: 'features' },
    { href: '/pricing', label: 'Pricing', key: 'pricing' },
    { href: '/compliance', label: 'Compliance', key: 'compliance' },
    { href: '/contact', label: 'Contact', key: 'contact' },
  ];

  return (
    <header className="bg-white shadow-sm fixed w-full z-20">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <Image src="/sayina-logo.png" alt="Sayina" width={38} height={38} className="rounded-full" />
          <span className="text-xl font-bold text-secondary-900">Sayina</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map(l => (
            <Link
              key={l.key}
              href={l.href}
              className={activePage === l.key
                ? 'text-primary-500 font-semibold'
                : 'text-secondary-600 hover:text-secondary-900 transition-colors'}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Desktop auth buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/auth/login" className="text-primary-500 hover:text-primary-600 font-medium text-sm">
            Log In
          </Link>
          <Link
            href="/auth/signup"
            className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 text-sm font-medium transition-colors"
          >
            Sign Up
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-secondary-600 hover:bg-secondary-50 transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden bg-white border-t border-secondary-100 shadow-lg">
          <nav className="flex flex-col px-4 py-2">
            {links.map(l => (
              <Link
                key={l.key}
                href={l.href}
                className={`py-3 text-base border-b border-secondary-50 ${
                  activePage === l.key
                    ? 'text-primary-500 font-semibold'
                    : 'text-secondary-700 hover:text-secondary-900'
                }`}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="flex flex-col gap-3 py-4">
              <Link
                href="/auth/login"
                className="text-center text-primary-500 font-medium py-2 text-base border border-primary-300 rounded-lg hover:bg-primary-50"
                onClick={() => setOpen(false)}
              >
                Log In
              </Link>
              <Link
                href="/auth/signup"
                className="text-center bg-primary-500 text-white py-3 rounded-lg hover:bg-primary-600 font-medium text-base"
                onClick={() => setOpen(false)}
              >
                Sign Up Free
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
