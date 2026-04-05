import Head from 'next/head';
import Link from 'next/link';

export default function Privacy() {
  return (
    <>
      <Head>
        <title>Privacy Policy - Sayina E-Signature</title>
      </Head>

      <header className="bg-white shadow-sm fixed w-full z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-secondary-900">Sayina</Link>
          <Link href="/auth/login" className="text-primary-500 hover:text-primary-600">Log In</Link>
        </div>
      </header>

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-3xl py-12">
          <h1 className="text-3xl font-bold text-secondary-900 mb-2">Privacy Policy</h1>
          <p className="text-secondary-500 text-sm mb-8">Last updated: April 2026</p>

          <div className="prose prose-secondary max-w-none space-y-6 text-secondary-700">
            <section>
              <h2 className="text-xl font-semibold text-secondary-900 mb-2">1. Who We Are</h2>
              <p>Sayina is a product of LegacyBit Technologies. We provide a South African e-signature platform compliant with the Electronic Communications and Transactions Act 25 of 2002 (ECT Act) and the Protection of Personal Information Act 4 of 2013 (POPIA).</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-secondary-900 mb-2">2. Information We Collect</h2>
              <p>We collect information you provide directly to us, including your name, email address, phone number, and documents you upload for signing. We also collect usage data and audit logs required by the ECT Act.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-secondary-900 mb-2">3. How We Use Your Information</h2>
              <p>We use your information to provide the e-signature service, send OTP verification codes, maintain legally required audit trails, process payments, and communicate with you about your account.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-secondary-900 mb-2">4. Data Storage & Security</h2>
              <p>Your data is stored securely and protected using industry-standard encryption. We do not sell your personal information to third parties. Document data is retained as required by South African law.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-secondary-900 mb-2">5. Your Rights (POPIA)</h2>
              <p>Under POPIA, you have the right to access, correct, or delete your personal information. To exercise these rights, contact us at <a href="mailto:privacy@sayina.co.za" className="text-primary-500">privacy@sayina.co.za</a>.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-secondary-900 mb-2">6. Contact</h2>
              <p>For privacy-related queries: <a href="mailto:privacy@sayina.co.za" className="text-primary-500">privacy@sayina.co.za</a><br />
              LegacyBit Technologies, South Africa</p>
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
