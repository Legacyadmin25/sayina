import Head from 'next/head';
import Link from 'next/link';

const features = [
  { title: 'OTP Verification', desc: 'Every signer is verified via SMS or email OTP before signing — legally binding under the ECT Act.' },
  { title: 'Audit Trail', desc: 'Every action is timestamped and logged: sent, opened, signed, declined. Tamper-evident records.' },
  { title: 'Document Templates', desc: 'Save your frequently used documents as templates and reuse them in seconds.' },
  { title: 'Multi-Party Signing', desc: 'Add multiple signers with a defined signing order. Everyone gets notified automatically.' },
  { title: 'Mobile Signing', desc: 'Signers can sign from any device — no app install required. Fully responsive web experience.' },
  { title: 'API & Webhooks', desc: 'Integrate Sayina into your own systems. REST API with webhook notifications for every event.' },
  { title: 'Custom Branding', desc: 'Add your logo and brand colours to the signing experience. Professional every time.' },
  { title: 'Bulk Sending', desc: 'Send the same document to hundreds of signers at once. Perfect for HR, insurance, and finance.' },
  { title: 'Analytics & Reports', desc: 'Track document completion rates, average signing time, and team activity.' },
  { title: 'POPIA Compliant', desc: 'Data stored in South Africa. Built with POPIA requirements from day one.' },
  { title: 'PayFast Billing', desc: 'Subscriptions managed via PayFast — trusted by thousands of SA businesses.' },
  { title: 'Offline Signing', desc: 'Signers in low-connectivity areas can sign offline and sync when connected.' },
];

export default function Features() {
  return (
    <>
      <Head>
        <title>Features - Sayina E-Signature</title>
        <meta name="description" content="Everything you need to sign documents digitally in South Africa." />
      </Head>

      <header className="bg-white shadow-sm fixed w-full z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-secondary-900">Sayina</Link>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-primary-500 hover:text-primary-600">Log In</Link>
            <Link href="/auth/signup" className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600">Sign Up</Link>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-20">
        <section className="py-16 bg-gradient-to-b from-primary-50 to-white">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold text-secondary-900 mb-4">Everything You Need</h1>
            <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
              Sayina is built for South African businesses — legally compliant, secure, and easy to use.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f) => (
                <div key={f.title} className="bg-white border border-secondary-100 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-secondary-900 mb-2">{f.title}</h3>
                  <p className="text-secondary-600 text-sm">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 bg-primary-500">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Ready to get started?</h2>
            <Link href="/auth/signup" className="bg-white text-primary-500 px-6 py-3 rounded-lg font-semibold hover:bg-secondary-100">
              Start Free Trial
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-secondary-900 text-white py-8">
        <div className="container mx-auto px-4 text-center text-secondary-400 text-sm">
          <p>© {new Date().getFullYear()} Sayina — A LegacyBit Technologies product. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
