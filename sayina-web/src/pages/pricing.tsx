import Head from 'next/head';
import Link from 'next/link';

const tiers = [
  {
    name: 'Starter',
    price: 'R 150',
    envelopes: '10 envelopes/mo',
    features: ['OTP & email signing', 'Basic audit trail', 'Web UI access', 'Email support'],
    cta: 'Get Started',
    highlight: false,
  },
  {
    name: 'Basic',
    price: 'R 350',
    envelopes: '50 envelopes/mo',
    features: ['Everything in Starter', 'Document templates', 'Automated reminders', 'Mobile signing'],
    cta: 'Get Started',
    highlight: false,
  },
  {
    name: 'Professional',
    price: 'R 750',
    envelopes: 'Unlimited envelopes',
    features: ['Everything in Basic', 'API & Webhooks', 'Custom branding', 'Bulk sending', 'Advanced analytics'],
    cta: 'Get Started',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'R 2,000',
    envelopes: 'Unlimited envelopes',
    features: ['Everything in Professional', 'SSO integration', 'SLA guarantee', 'Dedicated support', 'Custom integrations'],
    cta: 'Contact Us',
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <>
      <Head>
        <title>Pricing - Sayina E-Signature</title>
        <meta name="description" content="Simple, transparent pricing for South African businesses." />
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
        <section className="bg-gradient-to-b from-primary-50 to-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold text-secondary-900 mb-4">Simple, Transparent Pricing</h1>
            <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
              Per user pricing. No hidden fees. Cancel anytime. All plans include free SSL and audit trails.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {tiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`rounded-xl p-6 border-2 flex flex-col ${
                    tier.highlight
                      ? 'border-primary-500 bg-primary-50 shadow-lg'
                      : 'border-secondary-200 bg-white'
                  }`}
                >
                  {tier.highlight && (
                    <div className="text-xs font-bold text-primary-500 uppercase tracking-wide mb-2">Most Popular</div>
                  )}
                  <h2 className="text-xl font-bold text-secondary-900 mb-1">{tier.name}</h2>
                  <div className="text-3xl font-bold text-primary-500 mb-1">{tier.price}</div>
                  <div className="text-sm text-secondary-500 mb-4">per user / month</div>
                  <div className="text-sm font-medium text-secondary-700 mb-4">{tier.envelopes}</div>
                  <ul className="space-y-2 mb-6 flex-1">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-secondary-600">
                        <span className="text-green-500 mt-0.5">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={tier.cta === 'Contact Us' ? '/contact' : '/auth/signup'}
                    className={`text-center py-2 px-4 rounded-lg font-medium transition-colors ${
                      tier.highlight
                        ? 'bg-primary-500 text-white hover:bg-primary-600'
                        : 'border border-primary-500 text-primary-500 hover:bg-primary-50'
                    }`}
                  >
                    {tier.cta}
                  </Link>
                </div>
              ))}
            </div>
            <p className="text-center text-secondary-500 mt-8 text-sm">
              All prices exclude VAT. Enterprise pricing is negotiable. Contact us for volume discounts.
            </p>
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
