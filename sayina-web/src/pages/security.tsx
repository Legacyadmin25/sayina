import Head from 'next/head';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';

export default function Security() {
  return (
    <>
      <Head>
        <title>Security - Sayina E-Signature</title>
        <meta name="description" content="How Sayina protects your documents, data, and identity with enterprise-grade security." />
      </Head>

      <Header />

      <main className="pt-20 pb-20">

        {/* Hero */}
        <section className="py-16 bg-gradient-to-b from-primary-50 to-white">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              Enterprise-Grade Security
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-secondary-900 mb-6">
              Your Documents Are <span className="text-primary-500">Safe With Us</span>
            </h1>
            <p className="text-lg text-secondary-600">
              Sayina is built with security at its core — from encrypted storage and transmission to tamper-evident audit trails and OTP-verified identities.
            </p>
          </div>
        </section>

        {/* Security pillars */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: 'Encrypted Storage',
                  desc: 'All documents are encrypted at rest using AES-256. Only authorised parties can access signed documents.',
                  icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
                },
                {
                  title: 'TLS in Transit',
                  desc: 'All data in transit is protected by TLS 1.3. Your documents never travel across the internet unencrypted.',
                  icon: 'M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z',
                },
                {
                  title: 'OTP Identity Verification',
                  desc: 'Every signer is verified with a one-time password via email or SMS before their signature is accepted.',
                  icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
                },
                {
                  title: 'Document Hashing',
                  desc: 'Every document is hashed before and after signing. Any tampering is immediately detectable and invalidates the signature.',
                  icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
                },
                {
                  title: 'South African Hosting',
                  desc: 'All data is hosted within South Africa or POPIA-approved jurisdictions. Your data never leaves without your consent.',
                  icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064',
                },
                {
                  title: 'Tamper-Evident Audit Trail',
                  desc: 'Every action — viewed, signed, declined — is timestamped and cryptographically secured for legal admissibility.',
                  icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
                },
              ].map((item) => (
                <div key={item.title} className="bg-white p-6 rounded-xl shadow-sm border border-secondary-100">
                  <div className="bg-blue-100 text-blue-600 w-10 h-10 rounded-full flex items-center justify-center mb-4">
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

        {/* Responsible disclosure */}
        <section className="py-12 bg-secondary-50">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-secondary-900 mb-4">Responsible Disclosure</h2>
            <p className="text-secondary-600 mb-6">
              If you discover a security vulnerability in Sayina, please report it to us responsibly. We take all security reports seriously and aim to respond within 24 hours.
            </p>
            <a
              href="mailto:security@sayina.co.za"
              className="inline-block bg-primary-500 text-white font-semibold px-8 py-3 rounded-lg hover:bg-primary-600 transition-colors"
            >
              Report a Vulnerability
            </a>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-primary-500">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Sign documents with confidence</h2>
            <p className="text-white text-lg max-w-xl mx-auto mb-8">
              Sayina's security infrastructure is built to protect your business and your clients.
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
            <Link href="/compliance" className="hover:text-white">Compliance</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
