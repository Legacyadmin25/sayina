import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { Header } from '@/components/layout/Header';

export default function Demo() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    size: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          subject: `Demo Request — ${form.company || 'Individual'}`,
          message: `Demo request from ${form.name}.\n\nCompany: ${form.company || 'N/A'}\nPhone: ${form.phone || 'N/A'}\nTeam Size: ${form.size || 'N/A'}\n\nMessage:\n${form.message || 'No additional message.'}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
      } else {
        setSubmitted(true);
      }
    } catch {
      setError('Network error. Please email us directly at info@sayina.co.za');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Request a Demo - Sayina E-Signature</title>
        <meta name="description" content="See Sayina in action. Request a personalised demo of South Africa's leading e-signature platform." />
      </Head>

      <Header />

      <main className="pt-20 pb-20">

        {/* Hero */}
        <section className="py-16 bg-gradient-to-b from-primary-50 to-white">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <h1 className="text-4xl font-bold text-secondary-900 mb-4">See Sayina in Action</h1>
            <p className="text-lg text-secondary-600">
              Book a personalised demo with our team. We'll walk you through the platform and answer any questions about signing, compliance, and integrations.
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid md:grid-cols-5 gap-12">

              {/* What to expect */}
              <div className="md:col-span-2 space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-secondary-900 mb-4">What to Expect</h2>
                  <ul className="space-y-4">
                    {[
                      { title: '30-minute call', desc: 'A focused walkthrough of the features relevant to your business.' },
                      { title: 'Live demonstration', desc: 'We'll send and sign a real document during the call.' },
                      { title: 'Compliance Q&A', desc: 'Ask anything about ECT Act, POPIA, and audit trails.' },
                      { title: 'Pricing overview', desc: 'Get a clear picture of which plan fits your team size.' },
                    ].map((item) => (
                      <li key={item.title} className="flex items-start gap-3">
                        <div className="bg-primary-100 text-primary-500 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">✓</div>
                        <div>
                          <div className="font-medium text-secondary-900 text-sm">{item.title}</div>
                          <div className="text-secondary-500 text-xs mt-0.5">{item.desc}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-primary-50 rounded-xl p-4 border border-primary-100">
                  <div className="text-sm font-semibold text-secondary-900 mb-1">Prefer to start now?</div>
                  <p className="text-xs text-secondary-600 mb-3">Create a free account and explore Sayina yourself — no credit card required.</p>
                  <Link href="/auth/signup" className="text-sm font-medium text-primary-600 hover:underline">
                    → Start free trial
                  </Link>
                </div>

                <div className="text-sm text-secondary-500">
                  <div className="font-medium text-secondary-700 mb-1">Contact us directly</div>
                  <a href="mailto:info@sayina.co.za" className="text-primary-500 hover:underline">info@sayina.co.za</a>
                  <div className="mt-1">Mon – Fri, 08:00 – 17:00 SAST</div>
                </div>
              </div>

              {/* Form */}
              <div className="md:col-span-3">
                {submitted ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                    <div className="w-14 h-14 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                      </svg>
                    </div>
                    <div className="text-green-700 font-semibold text-xl mb-2">Request Received!</div>
                    <p className="text-secondary-600">We'll reach out to <strong>{form.email}</strong> within 1 business day to schedule your demo.</p>
                    <Link href="/" className="mt-6 inline-block text-primary-500 hover:underline text-sm">
                      Back to home
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl p-6 shadow-sm border border-secondary-100">
                    <h2 className="text-xl font-semibold text-secondary-900 mb-2">Book Your Demo</h2>

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">{error}</div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">Your Name *</label>
                        <input
                          type="text"
                          required
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder="Jane Dlamini"
                          className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">Work Email *</label>
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="jane@company.co.za"
                          className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">Company Name</label>
                        <input
                          type="text"
                          value={form.company}
                          onChange={(e) => setForm({ ...form, company: e.target.value })}
                          placeholder="Acme (Pty) Ltd"
                          className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">Phone Number</label>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          placeholder="+27 82 000 0000"
                          className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Team Size</label>
                      <select
                        value={form.size}
                        onChange={(e) => setForm({ ...form, size: e.target.value })}
                        className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                      >
                        <option value="">Select team size</option>
                        <option value="1-5">1–5 people</option>
                        <option value="6-20">6–20 people</option>
                        <option value="21-50">21–50 people</option>
                        <option value="51-200">51–200 people</option>
                        <option value="200+">200+ people</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">What would you like to see?</label>
                      <textarea
                        rows={3}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        placeholder="e.g. We need to sign employment contracts with remote staff..."
                        className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg hover:bg-primary-600 font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Sending...
                        </>
                      ) : (
                        'Request Demo'
                      )}
                    </button>

                    <p className="text-xs text-secondary-400 text-center">
                      By submitting, you agree to our{' '}
                      <Link href="/privacy" className="text-primary-500 hover:underline">Privacy Policy</Link>.
                    </p>
                  </form>
                )}
              </div>
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
            <Link href="/compliance" className="hover:text-white">Compliance</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
