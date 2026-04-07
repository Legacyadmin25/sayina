import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: email,
          email,
          subject: 'Password Reset Request',
          message: `A password reset has been requested for account: ${email}\n\nPlease contact this user to assist with resetting their password.`,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Something went wrong. Please try again.');
      } else {
        setSubmitted(true);
      }
    } catch {
      setError('Network error. Please email us at info@sayina.co.za');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Forgot Password | Sayina</title>
        <meta name="description" content="Reset your Sayina account password." />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex flex-col justify-center py-12 px-4 sm:px-6">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo-192.png.svg" alt="Sayina" width={48} height={48} className="rounded-full" />
            <span className="text-2xl font-bold text-secondary-900">Sayina</span>
          </Link>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h1 className="text-3xl font-bold text-center text-secondary-900 mb-1">Reset your password</h1>
          <p className="text-center text-sm text-secondary-600 mb-8">
            Enter your email and we'll get you back in.
          </p>

          <div className="bg-white rounded-2xl shadow-lg border border-secondary-100 p-8">

            {submitted ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div className="text-green-700 font-semibold text-lg mb-2">Request Sent</div>
                <p className="text-secondary-600 text-sm">
                  Our team will contact <strong>{email}</strong> shortly to help you regain access to your account.
                </p>
                <Link href="/auth/login" className="mt-6 inline-block text-primary-500 hover:underline text-sm font-medium">
                  Back to sign in
                </Link>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-1">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.co.za"
                      className="w-full border border-secondary-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary-500 text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                      'Send Reset Request'
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link href="/auth/login" className="text-sm text-secondary-500 hover:text-secondary-700">
                    ← Back to sign in
                  </Link>
                </div>
              </>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-secondary-400">
            ECT Act Compliant · POPIA Compliant · South African e-signature platform
          </p>
        </div>
      </div>
    </>
  );
}
