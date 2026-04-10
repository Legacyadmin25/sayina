import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const bundles = [
  { credits: 10, price: 'R25', priceNum: 25, popular: false },
  { credits: 25, price: 'R55', priceNum: 55, popular: false },
  { credits: 50, price: 'R100', priceNum: 100, popular: true },
  { credits: 100, price: 'R180', priceNum: 180, popular: false },
  { credits: 250, price: 'R400', priceNum: 400, popular: false },
];

export default function SMSTopUpPage() {
  return (
    <DashboardLayout title="SMS Top-Up" activePage="account">
      <div className="mb-2">
        <Link href="/account" className="text-sm text-gray-400 hover:text-gray-600">← Back to Settings</Link>
      </div>

      <div className="max-w-2xl">
        {/* Plan notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-semibold text-yellow-800 text-sm">SMS credits require Basic plan or above</p>
            <p className="text-yellow-700 text-sm mt-0.5">
              You are on the Starter plan.{' '}
              <Link href="/account/subscription" className="underline font-medium">Upgrade your plan</Link>{' '}
              to enable SMS OTP verification for signers.
            </p>
          </div>
        </div>

        <h2 className="font-semibold text-gray-900 mb-1">SMS Credit Bundles</h2>
        <p className="text-sm text-gray-400 mb-4">Each SMS OTP verification uses 1 credit. Credits never expire.</p>

        <div className="space-y-3">
          {bundles.map(b => (
            <div
              key={b.credits}
              className={`bg-white rounded-xl shadow-sm p-4 flex items-center justify-between border-2 ${
                b.popular ? 'border-[#D4A832]' : 'border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                {b.popular && (
                  <span className="text-xs font-bold bg-[#D4A832] text-black px-2 py-0.5 rounded-full">Best Value</span>
                )}
                <div>
                  <p className="font-semibold text-gray-900">{b.credits} SMS Credits</p>
                  <p className="text-xs text-gray-400">{b.price} — R{(b.priceNum / b.credits).toFixed(2)}/credit</p>
                </div>
              </div>
              <button
                disabled
                className="bg-gray-100 text-gray-400 font-semibold px-4 py-2 rounded-lg text-sm cursor-not-allowed"
                title="Upgrade your plan to purchase SMS credits"
              >
                {b.price}
              </button>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Payments processed securely via PayFast. SMS delivered via BulkSMS South Africa.
        </p>
      </div>
    </DashboardLayout>
  );
}
