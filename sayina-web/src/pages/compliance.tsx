import Head from 'next/head';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';

export default function Compliance() {
  return (
    <>
      <Head>
        <title>Legal Compliance - Sayina E-Signature</title>
        <meta name="description" content="Sayina is fully compliant with South African law — ECT Act 25 of 2002, POPIA, and global e-signature standards." />
      </Head>

      <Header activePage="compliance" />

      <main className="pt-20">

        {/* Hero */}
        <section className="py-16 bg-gradient-to-b from-primary-50 to-white">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              Legally Verified for South Africa
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-secondary-900 mb-6">
              Built for South African <span className="text-primary-500">Legal Compliance</span>
            </h1>
            <p className="text-lg text-secondary-600">
              Sayina is engineered from the ground up to comply with the Electronic Communications and Transactions (ECT) Act 25 of 2002, the Protection of Personal Information Act (POPIA), and international e-signature standards.
            </p>
          </div>
        </section>

        {/* Compliance Badges */}
        <section className="py-12 bg-white border-b border-secondary-100">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {[
                { label: 'ECT Act 25/2002', sub: 'Electronic signatures', color: 'green' },
                { label: 'POPIA Compliant', sub: 'Data privacy', color: 'blue' },
                { label: 'Locally Hosted', sub: 'South African servers', color: 'gold' },
                { label: 'Audit Trail', sub: 'Full tamper evidence', color: 'purple' },
              ].map((badge) => (
                <div key={badge.label} className="flex flex-col items-center p-4 rounded-xl border border-secondary-100 text-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${
                    badge.color === 'green' ? 'bg-green-100 text-green-600' :
                    badge.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                    badge.color === 'gold' ? 'bg-primary-100 text-primary-600' :
                    'bg-purple-100 text-purple-600'
                  }`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="font-semibold text-secondary-900 text-sm">{badge.label}</div>
                  <div className="text-secondary-500 text-xs mt-1">{badge.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ECT Act Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="flex flex-col md:flex-row gap-12">
              <div className="md:w-1/2">
                <div className="text-primary-500 text-sm font-semibold uppercase tracking-wide mb-2">South African Law</div>
                <h2 className="text-3xl font-bold text-secondary-900 mb-4">ECT Act 25 of 2002</h2>
                <p className="text-secondary-600 mb-4">
                  South Africa's Electronic Communications and Transactions Act (ECT Act 25 of 2002) provides the legal framework for e-signatures. Sayina supports both <strong>advanced electronic signatures (AES)</strong> and standard electronic signatures as defined by the Act.
                </p>
                <p className="text-secondary-600 mb-4">
                  Under Section 13 of the ECT Act, an electronic signature has the same legal standing as a handwritten signature where both parties agree to use electronic means.
                </p>
                <ul className="space-y-2">
                  {[
                    'Full support for ordinary and advanced e-signatures',
                    'Legally binding for contracts, agreements, and authorisations',
                    'Compliant with Section 13 and 14 of the ECT Act',
                    'Accepted by South African courts and regulators',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-secondary-600 text-sm">
                      <span className="text-green-500 mt-0.5">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="md:w-1/2">
                <div className="bg-primary-50 rounded-xl p-6 border border-primary-100">
                  <h3 className="font-semibold text-secondary-900 mb-3">What documents can be signed electronically?</h3>
                  <p className="text-secondary-600 text-sm mb-4">
                    Most commercial and personal documents qualify. The following categories require handwritten signatures under South African law and are <strong>excluded</strong>:
                  </p>
                  <ul className="space-y-2 text-sm text-secondary-600">
                    {[
                      'Wills and testamentary documents',
                      'Long-term lease agreements (over 20 years)',
                      'Bills of exchange (cheques, promissory notes)',
                      'Powers of attorney',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-red-400 mt-0.5">✗</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="text-secondary-600 text-sm mt-4">
                    All other agreements — NDAs, employment contracts, service agreements, lease agreements under 20 years — are fully valid when signed on Sayina.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* POPIA Section */}
        <section className="py-16 bg-secondary-50">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-12">
              <div className="text-primary-500 text-sm font-semibold uppercase tracking-wide mb-2">Data Privacy</div>
              <h2 className="text-3xl font-bold text-secondary-900 mb-4">POPIA Compliance</h2>
              <p className="text-secondary-600 max-w-2xl mx-auto">
                The Protection of Personal Information Act (POPIA) governs how personal information is collected, stored, and processed. Sayina is fully compliant.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: 'Data Minimisation',
                  desc: 'We only collect personal information necessary for the e-signature process. Nothing more.',
                  icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
                },
                {
                  title: 'Local Data Storage',
                  desc: 'All data is hosted in South Africa or within POPIA-approved jurisdictions. No data leaves SA borders without consent.',
                  icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
                },
                {
                  title: 'Right to Erasure',
                  desc: 'Users may request deletion of their personal data at any time, in line with POPIA\'s data subject rights.',
                  icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
                },
              ].map((item) => (
                <div key={item.title} className="bg-white p-6 rounded-xl shadow-sm border border-secondary-100">
                  <div className="bg-primary-100 text-primary-500 w-10 h-10 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-secondary-900 mb-2">{item.title}</h3>
                  <p className="text-secondary-600 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Audit Trail */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="md:w-1/2">
                <div className="text-primary-500 text-sm font-semibold uppercase tracking-wide mb-2">Tamper Evidence</div>
                <h2 className="text-3xl font-bold text-secondary-900 mb-4">Comprehensive Audit Trail</h2>
                <p className="text-secondary-600 mb-4">
                  Every Sayina envelope generates a cryptographically secured audit trail — a legally admissible record of all events surrounding the signature process.
                </p>
                <ul className="space-y-3">
                  {[
                    'Timestamp of every action (sent, viewed, signed, declined)',
                    'IP address and device information of each signer',
                    'OTP verification via South African mobile numbers (+27)',
                    'Document hash before and after signing',
                    'Downloadable Certificate of Completion per envelope',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-secondary-600 text-sm">
                      <div className="bg-primary-100 text-primary-500 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">✓</div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="md:w-1/2">
                <div className="bg-secondary-900 rounded-xl p-6 text-white font-mono text-sm space-y-3">
                  <div className="text-primary-400 font-bold mb-4">// Audit Trail Sample</div>
                  <div className="text-green-400">✓ <span className="text-secondary-300">2026-04-07 08:14:32 SAST</span></div>
                  <div className="pl-4 text-secondary-400 text-xs">Envelope created by jay@legacybit.co.za</div>
                  <div className="text-green-400">✓ <span className="text-secondary-300">2026-04-07 08:15:01 SAST</span></div>
                  <div className="pl-4 text-secondary-400 text-xs">Sent to signer@example.co.za</div>
                  <div className="text-yellow-400">→ <span className="text-secondary-300">2026-04-07 09:02:17 SAST</span></div>
                  <div className="pl-4 text-secondary-400 text-xs">Document viewed · IP: 196.25.x.x · Cape Town</div>
                  <div className="text-yellow-400">→ <span className="text-secondary-300">2026-04-07 09:03:44 SAST</span></div>
                  <div className="pl-4 text-secondary-400 text-xs">OTP verified · +27 82 xxx xxxx</div>
                  <div className="text-green-400">✓ <span className="text-secondary-300">2026-04-07 09:04:11 SAST</span></div>
                  <div className="pl-4 text-secondary-400 text-xs">Document signed · Hash: a3f92c...</div>
                  <div className="text-primary-400">★ <span className="text-secondary-300">Certificate issued</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-primary-500">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to sign with confidence?</h2>
            <p className="text-white text-lg max-w-xl mx-auto mb-8">
              Join South African businesses who trust Sayina for legally compliant e-signatures.
            </p>
            <Link href="/auth/signup" className="inline-block bg-white text-primary-500 font-semibold px-8 py-3 rounded-lg hover:bg-primary-50 transition-colors">
              Start Free — No Credit Card Needed
            </Link>
          </div>
        </section>

      </main>

      <footer className="bg-secondary-900 text-white py-8">
        <div className="container mx-auto px-4 text-center text-secondary-400 text-sm">
          <p>© {new Date().getFullYear()} Sayina — A LegacyBit Technologies product. All rights reserved.</p>
          <div className="flex justify-center gap-6 mt-3">
            <Link href="/legal" className="hover:text-white">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
