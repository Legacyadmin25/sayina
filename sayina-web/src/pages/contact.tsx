import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire to backend contact endpoint
    setSubmitted(true);
  };

  return (
    <>
      <Head>
        <title>Contact Us - Sayina E-Signature</title>
        <meta name="description" content="Get in touch with the Sayina team." />
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
            <h1 className="text-4xl font-bold text-secondary-900 mb-4">Contact Us</h1>
            <p className="text-lg text-secondary-600">We'd love to hear from you.</p>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="grid md:grid-cols-2 gap-12">
              <div>
                <h2 className="text-xl font-semibold mb-4">Get in Touch</h2>
                <div className="space-y-4 text-secondary-600">
                  <div>
                    <div className="font-medium text-secondary-900">Email</div>
                    <a href="mailto:info@sayina.co.za" className="text-primary-500 hover:underline">info@sayina.co.za</a>
                  </div>
                  <div>
                    <div className="font-medium text-secondary-900">Company</div>
                    <div>LegacyBit Technologies</div>
                  </div>
                  <div>
                    <div className="font-medium text-secondary-900">Operating Hours</div>
                    <div>Mon – Fri, 08:00 – 17:00 SAST</div>
                  </div>
                </div>
              </div>

              <div>
                {submitted ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <div className="text-green-600 font-semibold text-lg mb-2">Message Sent!</div>
                    <p className="text-secondary-600">We'll get back to you within 1 business day.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Name</label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full border border-secondary-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full border border-secondary-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Message</label>
                      <textarea
                        required
                        rows={4}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        className="w-full border border-secondary-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-primary-500 text-white py-2 px-4 rounded-lg hover:bg-primary-600 font-medium"
                    >
                      Send Message
                    </button>
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
        </div>
      </footer>
    </>
  );
}
