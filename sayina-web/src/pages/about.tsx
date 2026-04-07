import Head from 'next/head';
import { Header } from '@/components/layout/Header';

export default function About() {
  return (
    <>
      <Head>
        <title>About Us - Sayina E-Signature</title>
      </Head>

      <Header />

      <main className="pt-24 pb-20">
        <section className="py-16 bg-gradient-to-b from-primary-50 to-white">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold text-secondary-900 mb-4">About Sayina</h1>
            <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
              A Proudly South African e-signature platform built by LegacyBit Technologies.
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4 max-w-3xl space-y-8 text-secondary-700">
            <div>
              <h2 className="text-2xl font-semibold text-secondary-900 mb-3">Our Mission</h2>
              <p>To make document signing simple, secure, and legally compliant for every South African business — from small startups to large enterprises.</p>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-secondary-900 mb-3">Why Sayina?</h2>
              <p>Most e-signature platforms are built for international markets and don't account for South African regulations like the ECT Act and POPIA. Sayina is built from the ground up for the South African context — local payment methods, local data hosting, and local compliance expertise.</p>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-secondary-900 mb-3">LegacyBit Technologies</h2>
              <p>Sayina is a software product owned and operated by LegacyBit Technologies, a South African technology company dedicated to building practical, affordable digital tools for South African businesses.</p>
            </div>
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
