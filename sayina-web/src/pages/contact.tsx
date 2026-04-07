import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { Header } from '@/components/layout/Header';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
        <title>Contact Us - Sayina E-Signature</title>
        <meta name="description" content="Get in touch with the Sayina team. We're here to help with any questions about our e-signature platform." />
      </Head>

      <Header activePage="contact" />

      <main className="pt-20 pb-20">

        {/* Hero */}
        <section className="py-16 bg-gradient-to-b from-primary-50 to-white">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold text-secondary-900 mb-4">Get in Touch</h1>
            <p className="text-lg text-secondary-600 max-w-xl mx-auto">
              Have a question about Sayina? We're here to help — Monday to Friday, 08:00–17:00 SAST.
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="grid md:grid-cols-5 gap-12">

              {/* Contact Info */}
              <div className="md:col-span-2 space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-secondary-900 mb-4">Contact Details</h2>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary-100 text-primary-500 rounded-full w-9 h-9 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-secondary-900 text-sm">Email</div>
                        <a href="mailto:info@sayina.co.za" className="text-primary-500 hover:underline text-sm">info@sayina.co.za</a>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-primary-100 text-primary-500 rounded-full w-9 h-9 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-secondary-900 text-sm">Company</div>
                        <div className="text-secondary-600 text-sm">LegacyBit Technologies</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-primary-100 text-primary-500 rounded-full w-9 h-9 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-secondary-900 text-sm">Operating Hours</div>
                        <div className="text-secondary-600 text-sm">Mon – Fri, 08:00 – 17:00 SAST</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-primary-100 text-primary-500 rounded-full w-9 h-9 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-secondary-900 text-sm">Response Time</div>
                        <div className="text-secondary-600 text-sm">Within 1 business day</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick links */}
                <div className="bg-primary-50 rounded-xl p-4 border border-primary-100">
                  <div className="text-sm font-semibold text-secondary-900 mb-3">Quick Links</div>
                  <ul className="space-y-2 text-sm">
                    <li><Link href="/pricing" className="text-primary-600 hover:underline">→ View pricing plans</Link></li>
                    <li><Link href="/compliance" className="text-primary-600 hover:underline">→ Compliance & legal info</Link></li>
                    <li><Link href="/auth/signup" className="text-primary-600 hover:underline">→ Start a free account</Link></li>
                    <li><Link href="/privacy" className="text-primary-600 hover:underline">→ Privacy policy</Link></li>
                  </ul>
                </div>
              </div>

              {/* Contact Form */}
              <div className="md:col-span-3">
                {submitted ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                    <div className="w-14 h-14 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                      </svg>
                    </div>
                    <div className="text-green-700 font-semibold text-xl mb-2">Message Sent!</div>
                    <p className="text-secondary-600">We've received your message and will reply to <strong>{form.email}</strong> within 1 business day.</p>
                    <button
                      onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                      className="mt-6 text-primary-500 hover:underline text-sm"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl p-6 shadow-sm border border-secondary-100">
                    <h2 className="text-xl font-semibold text-secondary-900 mb-2">Send us a message</h2>

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
                          placeholder="John Smith"
                          className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">Email Address *</label>
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="john@company.co.za"
                          className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Subject</label>
                      <input
                        type="text"
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        placeholder="e.g. Question about pricing"
                        className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Message *</label>
                      <textarea
                        required
                        rows={5}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        placeholder="Tell us how we can help..."
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
                        'Send Message'
                      )}
                    </button>

                    <p className="text-xs text-secondary-400 text-center">
                      By submitting this form, you agree to our{' '}
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
