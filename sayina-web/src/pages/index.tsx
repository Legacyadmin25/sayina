import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';

export default function Home() {
  return (
    <>
      <Head>
        <title>Sayina - A Proudly South African E-signature platform</title>
        <meta name="description" content="Sayina is a locally-hosted, legally compliant South African e-signature platform—delivered as a responsive PWA and native apps." />
      </Head>
      
      <Header />

      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-20 bg-gradient-to-b from-primary-50 to-white">
          <div className="container mx-auto px-4 flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h1 className="text-4xl md:text-5xl font-bold text-secondary-900 mb-4">
                Sign Documents <span className="text-primary-500">Securely</span> and <span className="text-primary-500">Legally</span>
              </h1>
              <p className="text-lg text-secondary-600 mb-8">
                A Proudly South African E-signature platform that ensures your documents are signed in compliance with South African regulations.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/signup">
                  <Button size="lg">Get Started Free</Button>
                </Link>
                <Link href="/demo">
                  <Button size="lg" variant="outline">Request Demo</Button>
                </Link>
              </div>
            </div>
            <div className="md:w-1/2">
              <div className="relative">
                <div className="bg-primary-500 rounded-lg p-1 shadow-xl">
                  <div className="bg-white rounded-lg overflow-hidden">
                    <Image
                      src="/dashboard-preview.svg"
                      alt="Sayina Dashboard Preview"
                      width={600}
                      height={400}
                      className="w-full h-auto"
                    />
                  </div>
                </div>
                <div className="absolute -bottom-5 -right-5 bg-white p-3 rounded-lg shadow-lg">
                  <div className="flex items-center gap-2">
                    <div className="bg-green-500 rounded-full w-4 h-4"></div>
                    <span className="font-medium">ECT Act Compliant</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose Sayina?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-secondary-100">
                <div className="bg-primary-100 text-primary-500 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Legally Compliant</h3>
                <p className="text-secondary-600">
                  Fully compliant with ECT Act 25/2002 and POPIA requirements for South African businesses.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-secondary-100">
                <div className="bg-primary-100 text-primary-500 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Web & Mobile</h3>
                <p className="text-secondary-600">
                  Access Sayina from any device with our responsive web app and native mobile applications.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-secondary-100">
                <div className="bg-primary-100 text-primary-500 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">AI-Powered</h3>
                <p className="text-secondary-600">
                  Smart field detection, document summarization, and natural-language envelope creation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary-500">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-white mb-6">Ready to start signing documents?</h2>
            <p className="text-white text-lg max-w-2xl mx-auto mb-8">
              Join thousands of South African businesses who trust Sayina for their e-signature needs.
            </p>
            <Link href="/auth/signup">
              <Button
                size="lg"
                variant="secondary"
                className="bg-white text-primary-500 hover:bg-secondary-100"
              >
                Start Your Free Trial
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-secondary-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Image 
                  src="/sayina-logo.png" 
                  alt="Sayina Logo"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
                <span className="text-xl font-bold">Sayina</span>
              </div>
              <p className="text-secondary-300">
                A Proudly South African E-signature platform
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><Link href="/features" className="text-secondary-300 hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="text-secondary-300 hover:text-white">Pricing</Link></li>
                <li><Link href="/integrations" className="text-secondary-300 hover:text-white">Integrations</Link></li>
                <li><Link href="/roadmap" className="text-secondary-300 hover:text-white">Roadmap</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><Link href="/blog" className="text-secondary-300 hover:text-white">Blog</Link></li>
                <li><Link href="/docs" className="text-secondary-300 hover:text-white">Documentation</Link></li>
                <li><Link href="/compliance" className="text-secondary-300 hover:text-white">Compliance</Link></li>
                <li><Link href="/security" className="text-secondary-300 hover:text-white">Security</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-secondary-300 hover:text-white">About Us</Link></li>
                <li><Link href="/contact" className="text-secondary-300 hover:text-white">Contact</Link></li>
                <li><Link href="/legal" className="text-secondary-300 hover:text-white">Legal</Link></li>
                <li><Link href="/privacy" className="text-secondary-300 hover:text-white">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-secondary-700 mt-8 pt-8 text-center text-secondary-400">
            <p>© {new Date().getFullYear()} Sayina. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
