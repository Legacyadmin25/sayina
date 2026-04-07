import Head from 'next/head';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';

export default function Integrations() {
  return (
    <>
      <Head>
        <title>Integrations - Sayina E-Signature</title>
        <meta name="description" content="Connect Sayina with the tools your business already uses. Integrations coming soon." />
      </Head>

      <Header />

      <main className="pt-20 pb-20">

        <section className="py-20 bg-gradient-to-b from-primary-50 to-white">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
              </svg>
              Coming Soon
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-secondary-900 mb-6">
              Integrations
            </h1>
            <p className="text-lg text-secondary-600 mb-8">
              We're building integrations with the tools South African businesses use most — including accounting platforms, CRMs, and HR systems. Be the first to know when they launch.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
              {['Xero', 'Sage', 'Zoho CRM', 'Slack', 'Microsoft 365', 'Google Workspace', 'Dropbox', 'Zapier'].map((name) => (
                <div key={name} className="bg-white border border-secondary-200 rounded-xl p-4 text-secondary-500 text-sm font-medium opacity-60">
                  {name}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact" className="inline-block bg-primary-500 text-white font-semibold px-8 py-3 rounded-lg hover:bg-primary-600 transition-colors">
                Request an Integration
              </Link>
              <Link href="/auth/signup" className="inline-block bg-white text-primary-500 border border-primary-300 font-semibold px-8 py-3 rounded-lg hover:bg-primary-50 transition-colors">
                Start Free Trial
              </Link>
            </div>

            <p className="mt-6 text-sm text-secondary-500">
              Already use our REST API?{' '}
              <Link href="/docs" className="text-primary-500 hover:underline">Read the documentation →</Link>
            </p>
          </div>
        </section>
      </main>

      <footer className="bg-secondary-900 text-white py-8">
        <div className="container mx-auto px-4 text-center text-secondary-400 text-sm">
          <p>© {new Date().getFullYear()} Sayina — A LegacyBit Technologies product. All rights reserved.</p>
          <div className="flex justify-center gap-6 mt-3">
            <Link href="/legal" className="hover:text-white">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
