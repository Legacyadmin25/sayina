import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Signup() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    organization: '', phone: '', acceptTerms: false, marketingConsent: false,
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
      router.push('/auth/verify-otp?email=' + encodeURIComponent(form.email));
    } catch (err: any) {
      setErrors(prev => ({ ...prev, form: err.message || 'Something went wrong. Please try again.' }));
    } finally {
      setIsLoading(false);
    }
  };

  const Field = ({ id, label, type = 'text', placeholder = '', addon }: { id: keyof typeof form; label: string; type?: string; placeholder?: string; addon?: string }) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-secondary-700 mb-1">{label}</label>
      {addon ? (
        <div className="flex">
          <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-secondary-300 bg-secondary-50 text-secondary-500 text-sm">{addon}</span>
          <input
            id={id} name={id} type={type}
            value={form[id] as string}
            onChange={handleChange}
            placeholder={placeholder}
            className={`flex-1 border rounded-r-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors[id] ? 'border-red-400' : 'border-secondary-300'}`}
          />
        </div>
      ) : (
        <input
          id={id} name={id} type={type}
          value={form[id] as string}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors[id] ? 'border-red-400' : 'border-secondary-300'}`}
        />
      )}
      {errors[id] && <p className="mt-1 text-xs text-red-500">{errors[id]}</p>}
    </div>
  );

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
            <Image src="/logo-192.png.svg" alt="Sayina" width={48} height={48} className="rounded-full" />
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field id="fullName" label="Full Name" placeholder="Jane Smith" />
              <Field id="email" label="Email Address" type="email" placeholder="jane@company.co.za" />
              <Field id="organization" label="Organisation (Optional)" placeholder="Acme Pty Ltd" />
              <Field id="phone" label="Phone Number" placeholder="821234567" addon="+27" />
              <div className="text-xs text-secondary-400 -mt-2">We'll send a verification code to this number</div>
              <Field id="password" label="Password" type="password" placeholder="Min. 8 characters" />
              <Field id="confirmPassword" label="Confirm Password" type="password" placeholder="Repeat password" />

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
