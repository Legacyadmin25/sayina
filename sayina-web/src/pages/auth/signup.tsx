import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Signup() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    organization: '', phone: '', promoCode: '', acceptTerms: false, marketingConsent: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    else if (!/^\d{9,10}$/.test(form.phone.replace(/\s+/g, ''))) e.phone = 'Enter a valid SA number (e.g. 821234567)';
    if (!form.acceptTerms) e.acceptTerms = 'You must accept the terms';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.fullName,
          email: form.email,
          password: form.password,
          organization: form.organization,
          phone: form.phone,
          marketing_consent: form.marketingConsent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Signup failed');
      // Save info locally so dashboard can greet the user
      if (typeof window !== 'undefined') {
        localStorage.setItem('sayina_user_name', form.fullName);
        localStorage.setItem('sayina_user_email', form.email);
        // Store the temp token from register so verify-otp can use it
        if (data.data?.token) localStorage.setItem('sayina_temp_token', data.data.token);
        if (form.promoCode.trim()) {
          localStorage.setItem('sayina_pending_promo', form.promoCode.trim().toUpperCase());
        }
      }
      router.push('/auth/verify-otp?email=' + encodeURIComponent(form.email) + '&name=' + encodeURIComponent(form.fullName));
    } catch (err: any) {
      setErrors(prev => ({ ...prev, form: err.message || 'Something went wrong. Please try again.' }));
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors[field] ? 'border-red-400' : 'border-secondary-300'}`;

  return (
    <>
      <Head>
        <title>Sign Up | Sayina</title>
        <meta name="description" content="Create your free Sayina e-signature account." />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white py-10 px-4 sm:px-6">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/sayina-logo.png" alt="Sayina" width={48} height={48} className="rounded-full" />
            <span className="text-2xl font-bold text-secondary-900">Sayina</span>
          </Link>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h1 className="text-3xl font-bold text-center text-secondary-900 mb-1">Create your account</h1>
          <p className="text-center text-sm text-secondary-600 mb-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-medium text-primary-500 hover:text-primary-600">Sign in</Link>
          </p>

          <div className="bg-white rounded-2xl shadow-lg border border-secondary-100 p-8">

            {errors.form && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{errors.form}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-secondary-700 mb-1">Full Name</label>
                <input
                  id="fullName" name="fullName" type="text"
                  value={form.fullName} onChange={handleChange}
                  placeholder="Jane Smith"
                  autoComplete="name"
                  className={inputClass('fullName')}
                />
                {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-1">Email Address</label>
                <input
                  id="email" name="email" type="email"
                  value={form.email} onChange={handleChange}
                  placeholder="jane@company.co.za"
                  autoComplete="email"
                  className={inputClass('email')}
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
              </div>

              {/* Organisation */}
              <div>
                <label htmlFor="organization" className="block text-sm font-medium text-secondary-700 mb-1">Organisation (Optional)</label>
                <input
                  id="organization" name="organization" type="text"
                  value={form.organization} onChange={handleChange}
                  placeholder="Acme Pty Ltd"
                  autoComplete="organization"
                  className={inputClass('organization')}
                />
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-secondary-700 mb-1">Phone Number</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-secondary-300 bg-secondary-50 text-secondary-500 text-sm select-none">+27</span>
                  <input
                    id="phone" name="phone" type="tel"
                    value={form.phone} onChange={handleChange}
                    placeholder="821234567"
                    autoComplete="tel-national"
                    className={`flex-1 border rounded-r-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.phone ? 'border-red-400' : 'border-secondary-300'}`}
                  />
                </div>
                {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
                <p className="mt-1 text-xs text-secondary-400">{"We'll send a verification code to this number"}</p>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-secondary-700 mb-1">Password</label>
                <input
                  id="password" name="password" type="password"
                  value={form.password} onChange={handleChange}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  className={inputClass('password')}
                />
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary-700 mb-1">Confirm Password</label>
                <input
                  id="confirmPassword" name="confirmPassword" type="password"
                  value={form.confirmPassword} onChange={handleChange}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  className={inputClass('confirmPassword')}
                />
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
              </div>

              {/* Promo Code (optional) */}
              <div>
                <label htmlFor="promoCode" className="block text-sm font-medium text-secondary-700 mb-1">
                  Promo Code <span className="text-secondary-400 font-normal">(optional)</span>
                </label>
                <input
                  id="promoCode" name="promoCode" type="text"
                  value={form.promoCode} onChange={handleChange}
                  placeholder="e.g. SAYINA2026"
                  autoComplete="off"
                  className={`${inputClass('promoCode')} uppercase tracking-widest`}
                />
                <p className="mt-1 text-xs text-secondary-400">Have a code from Sayina? Enter it here for free access.</p>
              </div>

              {/* Checkboxes */}
              <div className="space-y-3 pt-1">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    id="acceptTerms" name="acceptTerms" type="checkbox"
                    checked={form.acceptTerms} onChange={handleChange}
                    className="h-4 w-4 mt-0.5 text-primary-500 border-secondary-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-secondary-600">
                    I accept the{' '}
                    <Link href="/legal" className="text-primary-500 hover:underline">Terms of Service</Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-primary-500 hover:underline">Privacy Policy</Link>
                  </span>
                </label>
                {errors.acceptTerms && <p className="text-xs text-red-500 ml-6">{errors.acceptTerms}</p>}

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    id="marketingConsent" name="marketingConsent" type="checkbox"
                    checked={form.marketingConsent} onChange={handleChange}
                    className="h-4 w-4 mt-0.5 text-primary-500 border-secondary-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-secondary-600">I agree to receive updates from Sayina</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary-500 text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Creating account...
                  </>
                ) : 'Create Account'}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-xs text-secondary-400">
            ECT Act Compliant · POPIA Compliant · 🇿🇦 Proudly South African
          </p>
        </div>
      </div>
    </>
  );
}
