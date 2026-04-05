import Head from 'next/head';
import Link from 'next/link';

export default function Legal() {
  return (
    <>
      <Head>
        <title>Legal & Terms of Service - Sayina E-Signature</title>
      </Head>

      <header className="bg-white shadow-sm fixed w-full z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-secondary-900">Sayina</Link>
          <Link href="/auth/login" className="text-primary-500 hover:text-primary-600">Log In</Link>
        </div>
      </header>

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-3xl py-12">
          <h1 className="text-3xl font-bold text-secondary-900 mb-2">Terms of Service</h1>
          <p className="text-secondary-500 text-sm mb-8">Last updated: April 2026</p>

          <div className="space-y-6 text-secondary-700">
            <section>
              <h2 className="text-xl font-semibold text-secondary-900 mb-2">1. Acceptance of Terms</h2>
              <p>By using Sayina, you agree to these Terms of Service. Sayina is operated by LegacyBit Technologies. If you do not agree, do not use the service.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-secondary-900 mb-2">2. Legal Validity of Electronic Signatures</h2>
              <p>Electronic signatures created through Sayina are legally binding under the Electronic Communications and Transactions Act 25 of 2002 (ECT Act). Sayina provides an audit trail to verify the integrity and authenticity of all signed documents.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-secondary-900 mb-2">3. Use of the Service</h2>
              <p>You may only use Sayina for lawful purposes. You are responsible for all documents you upload and sign. You may not use Sayina to sign fraudulent, illegal, or coercive agreements.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-secondary-900 mb-2">4. Subscription & Billing</h2>
              <p>Subscription fees are billed monthly per user. Payments are processed securely via PayFast. Cancellations take effect at the end of the current billing period. No refunds are issued for partial months.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-secondary-900 mb-2">5. Limitation of Liability</h2>
              <p>Sayina and LegacyBit Technologies shall not be liable for any indirect, incidental, or consequential damages arising from use of the service. Our maximum liability is limited to the amount paid in the 30 days preceding any claim.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-secondary-900 mb-2">6. Governing Law</h2>
              <p>These terms are governed by the laws of the Republic of South Africa. Any disputes shall be resolved in the courts of South Africa.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-secondary-900 mb-2">7. Contact</h2>
              <p>Legal queries: <a href="mailto:legal@sayina.co.za" className="text-primary-500">legal@sayina.co.za</a></p>
            </section>
          </div>
        </div>
      </main>

      <footer className="bg-secondary-900 text-white py-8">
        <div className="container mx-auto px-4 text-center text-secondary-400 text-sm">
          <p>© {new Date().getFullYear()} Sayina — A LegacyBit Technologies product. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
