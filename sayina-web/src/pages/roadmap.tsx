import Head from 'next/head';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';

const roadmapItems = [
  {
    quarter: 'Q1 2026',
    status: 'done',
    items: [
      'OTP-verified e-signatures (ECT Act compliant)',
      'PDF document upload and signing',
      'Multi-party signing with order control',
      'Audit trail & Certificate of Completion',
      'PayFast subscription billing',
    ],
  },
  {
    quarter: 'Q2 2026',
    status: 'current',
    items: [
      'Mobile-optimised signing experience',
      'Custom branding per account',
      'Bulk send (same doc → multiple signers)',
      'Advanced electronic signature (AES) support',
      'Document templates',
    ],
  },
  {
    quarter: 'Q3 2026',
    status: 'upcoming',
    items: [
      'REST API & webhooks (public beta)',
      'Zapier & Make integrations',
      'Xero & Sage accounting integration',
      'Team management & role-based access',
      'Analytics dashboard',
    ],
  },
  {
    quarter: 'Q4 2026',
    status: 'upcoming',
    items: [
      'Native iOS & Android apps',
      'Offline signing (sync on reconnect)',
      'AI field detection & document summarisation',
      'Natural-language envelope creation',
      'Enterprise SSO (SAML)',
    ],
  },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  done: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  current: { label: 'In Progress', color: 'bg-primary-100 text-primary-700' },
  upcoming: { label: 'Planned', color: 'bg-secondary-100 text-secondary-600' },
};

export default function Roadmap() {
  return (
    <>
      <Head>
        <title>Product Roadmap - Sayina E-Signature</title>
        <meta name="description" content="See what's coming to Sayina. Our product roadmap for 2026 and beyond." />
      </Head>

      <Header />

      <main className="pt-20 pb-20">

        <section className="py-16 bg-gradient-to-b from-primary-50 to-white">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <h1 className="text-4xl font-bold text-secondary-900 mb-4">Product Roadmap</h1>
            <p className="text-lg text-secondary-600">
              Here's where we're headed. We build in public and welcome your feedback — vote for features or suggest new ones via our contact page.
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4 max-w-3xl space-y-8">
            {roadmapItems.map((quarter) => {
              const { label, color } = statusConfig[quarter.status];
              return (
                <div key={quarter.quarter} className="bg-white rounded-xl border border-secondary-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-100">
                    <h2 className="text-lg font-semibold text-secondary-900">{quarter.quarter}</h2>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${color}`}>{label}</span>
                  </div>
                  <ul className="divide-y divide-secondary-50">
                    {quarter.items.map((item) => (
                      <li key={item} className="flex items-center gap-3 px-6 py-3 text-sm text-secondary-700">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${quarter.status === 'done' ? 'bg-green-500' : quarter.status === 'current' ? 'bg-primary-500' : 'bg-secondary-300'}`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="container mx-auto px-4 max-w-3xl mt-10 text-center">
            <p className="text-secondary-600 mb-4">Have a feature in mind? We'd love to hear it.</p>
            <Link href="/contact" className="inline-block bg-primary-500 text-white font-semibold px-8 py-3 rounded-lg hover:bg-primary-600 transition-colors">
              Suggest a Feature
            </Link>
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
