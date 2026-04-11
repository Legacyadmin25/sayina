import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function VerifyOtp() {
  const router = useRouter();
  const { email, name } = router.query;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      setError('Please enter all 6 digits.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const tempToken = typeof window !== 'undefined' ? localStorage.getItem('sayina_temp_token') : '';
      const res = await fetch('/api/v1/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tempToken ? { Authorization: `Bearer ${tempToken}` } : {}),
        },
        body: JSON.stringify({ email, otp: code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Invalid or expired code. Please try again.');
      } else {
        if (typeof window !== 'undefined') {
          const finalToken = data.token || data.data?.token;
          if (finalToken) {
            localStorage.setItem('token', finalToken);
            localStorage.removeItem('sayina_temp_token');
          }
          if (data.data?.user?.role) localStorage.setItem('sayina_user_role', data.data.user.role);
          if (name) localStorage.setItem('sayina_user_name', Array.isArray(name) ? name[0] : name);
          if (email) localStorage.setItem('sayina_user_email', Array.isArray(email) ? email[0] : email);
        }
        router.push('/dashboard');
      }
    } catch {
      setError('Could not connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await fetch('/api/v1/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Ignore — just reset the cooldown
    } finally {
      setResendLoading(false);
      setResendCooldown(60);
    }
  };

  return (
    <>
      <Head>
        <title>Verify Your Account — Sayina</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex flex-col items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/sayina-logo.png" alt="Sayina" width={44} height={44} className="rounded-full" />
              <span className="text-2xl font-bold text-secondary-900">Sayina</span>
            </Link>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-secondary-100 p-8">

            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-primary-100 text-primary-500 rounded-full w-16 h-16 flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-secondary-900 text-center mb-2">Check your email</h1>
            <p className="text-secondary-500 text-center text-sm mb-6">
              We sent a 6-digit verification code to<br/>
              <strong className="text-secondary-900">{email || 'your email address'}</strong>
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* OTP input boxes */}
              <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-bold border-2 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                    style={{ borderColor: digit ? '#DAB44A' : '#d1d5db' }}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || otp.join('').length < 6}
                className="w-full bg-primary-500 text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Verifying...
                  </>
                ) : (
                  'Verify & Continue'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-secondary-500 text-sm mb-2">Didn't receive the code?</p>
              {resendCooldown > 0 ? (
                <p className="text-secondary-400 text-sm">Resend in {resendCooldown}s</p>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="text-primary-500 hover:text-primary-600 text-sm font-medium hover:underline disabled:opacity-50"
                >
                  {resendLoading ? 'Sending...' : 'Resend verification code'}
                </button>
              )}
            </div>

            <div className="mt-4 text-center">
              <p className="text-secondary-400 text-xs">
                Check your spam folder if you don't see it.
              </p>
            </div>
          </div>

          <p className="text-center text-secondary-400 text-xs mt-6">
            Wrong email?{' '}
            <Link href="/auth/signup" className="text-primary-500 hover:underline">Go back</Link>
          </p>
        </div>
      </div>
    </>
  );
}
