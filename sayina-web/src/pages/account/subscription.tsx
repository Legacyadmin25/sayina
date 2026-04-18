import Link from 'next/link';
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const plans = [
  {
    name: 'Starter',
    price: 'R150',
    period: '/month',
    current: true,
    features: ['5 envelopes/month', '5 SMS OTP credits/month', 'Unlimited signers', 'Email notifications', 'Basic audit trail', 'ECT & POPIA compliant'],
    cta: 'Current Plan',
  },
  {
    name: 'Basic',
    price: 'R350',
    period: '/month',
    current: false,
    features: ['25 envelopes/month', 'SMS OTP verification', 'SMS notifications', 'Full audit trail', 'Priority support'],
    cta: 'Upgrade',
  },
  {
    name: 'Professional',
    price: 'R750',
    period: '/month',
    current: false,
    features: ['100 envelopes/month', 'Custom branding', 'API access', 'Templates', 'Dedicated support'],
    cta: 'Upgrade',
  },
  {
    name: 'Enterprise',
    price: 'R2,000',
    period: '/month',
    current: false,
    features: ['Unlimited envelopes', 'White-label option', 'SLA guarantee', 'Custom integrations', 'Account manager'],
    cta: 'Contact Sales',
  },
];

export default function SubscriptionPage() {
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState<{ type: 'success' | 'error' | 'info' | null; message: string }>({ type: null, message: '' });
  const [promoLoading, setPromoLoading] = useState(false);

  // Auto-fill promo code if one was entered during signup
  useEffect(() => {
    const pending = localStorage.getItem('sayina_pending_promo');
    if (pending) setPromoCode(pending);
  }, []);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoStatus({ type: null, message: '' });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/billing/promo/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: promoCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to apply code');
      setPromoStatus({ type: 'success', message: data.message });
      localStorage.removeItem('sayina_pending_promo');
      setPromoCode('');
    } catch (err: any) {
      setPromoStatus({ type: 'error', message: err.message });
    } finally {
      setPromoLoading(false);
    }
  };

  return (
    <DashboardLayout title="Subscription" activePage="billing">
      <div className="mb-2">
        <Link href="/account" className="text-sm text-gray-400 hover:text-gray-600">← Back to Settings</Link>
      </div>
      <div className="mb-6">
        <p className="text-gray-500 text-sm">Choose the plan that best fits your business needs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {plans.map(plan => (
          <div
            key={plan.name}
            className={`bg-white rounded-xl shadow-sm p-6 flex flex-col border-2 ${
              plan.current ? 'border-[#D4A832]' : 'border-transparent'
            }`}
          >
            {plan.current && (
              <span className="text-xs font-bold text-[#D4A832] bg-[#D4A832]/10 px-2 py-1 rounded-full self-start mb-3">
                Current Plan
              </span>
            )}
            <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
            <div className="mt-1 mb-4">
              <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
              <span className="text-gray-400 text-sm">{plan.period}</span>
            </div>
            <ul className="space-y-2 flex-1 mb-5">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <svg className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              disabled={plan.current}
              className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                plan.current
                  ? 'bg-gray-100 text-gray-400 cursor-default'
                  : 'bg-[#D4A832] hover:bg-[#c49a28] text-black'
              }`}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-gray-400 text-center">
        All plans are billed monthly. Cancel anytime. Powered by PayFast — secure South African payments.
      </p>

      {/* Promo code section */}
      <div className="mt-8 bg-white rounded-xl shadow-sm p-6 max-w-md">
        <h3 className="font-semibold text-gray-900 mb-1">Have a promo code?</h3>
        <p className="text-sm text-gray-400 mb-4">Enter a code to get free plan access for a set period.</p>

        {promoStatus.type && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            promoStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
            'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {promoStatus.message}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={e => setPromoCode(e.target.value.toUpperCase())}
            placeholder="e.g. SAYINA2026"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#D4A832]"
          />
          <button
            onClick={handleApplyPromo}
            disabled={promoLoading || !promoCode.trim()}
            className="bg-[#D4A832] hover:bg-[#c49a28] disabled:opacity-50 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {promoLoading ? 'Applying…' : 'Apply'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
