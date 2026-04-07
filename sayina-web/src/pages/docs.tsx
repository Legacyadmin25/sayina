import Head from 'next/head';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';

const sections = [
  {
    title: 'Getting Started',
    items: ['Creating your account', 'Uploading your first document', 'Adding signers', 'Sending for signature'],
  },
  {
    title: 'API Reference',
    items: ['Authentication', 'Envelopes', 'Signers', 'Documents', 'Webhooks', 'Events'],
  },
  {
    title: 'Compliance & Legal',
    items: ['ECT Act compliance', 'POPIA compliance', 'Audit trail explained', 'Advanced electronic signatures'],
  },
  {
    title: 'Account & Billing',
    items: ['Managing your subscription', 'PayFast billing', 'Upgrading your plan', 'Cancellation policy'],
  },
];

export default function Docs() {
  return (
    <>
      <Head>
        <title>Documentation - Sayina E-Signature</title>
        <meta name="description" content="Sayina developer and user documentation. Guides, API reference, and compliance info." />
      </Head>

      <Header />

      <main className="pt-20 pb-20">

        <section className="py-16 bg-gradient-to-b from-primary-50 to-white">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <h1 className="text-4xl font-bold text-secondary-900 mb-4">Documentation</h1>
            <p className="text-lg text-secondary-600">
              Guides, API references, and compliance documentation for Sayina. Full docs are being written — check back soon.
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">

            <div className="mb-8 bg-primary-50 border border-primary-100 rounded-xl px-6 py-4 text-sm text-primary-700 font-medium">
              📚 Full documentation is currently in progress. For help now, contact us at{' '}
              <a href="mailto:info@sayina.co.za" className="underline">info@sayina.co.za</a>.
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {sections.map((section) => (
                <div key={section.title} className="bg-white rounded-xl border border-secondary-100 shadow-sm p-6">
                  <h2 className="text-base font-semibold text-secondary-900 mb-3">{section.title}</h2>
                  <ul className="space-y-2">
                    {section.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-secondary-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary-300 flex-shrink-0" />
                        <span>{item}</span>
                        <span className="ml-auto text-xs text-secondary-300 italic">Soon</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <p className="text-secondary-600 mb-4">Need help right now? Our team is available Mon–Fri, 08:00–17:00 SAST.</p>
              <Link href="/contact" className="inline-block bg-primary-500 text-white font-semibold px-8 py-3 rounded-lg hover:bg-primary-600 transition-colors">
                Contact Support
              </Link>
            </div>
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
