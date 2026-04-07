import Head from 'next/head';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';

const posts = [
  {
    title: 'Is Your E-Signature Legally Binding in South Africa?',
    excerpt: 'A plain-language guide to the ECT Act 25 of 2002 and when electronic signatures are legally valid.',
    date: 'April 2026',
    category: 'Compliance',
    slug: '#',
  },
  {
    title: 'POPIA & E-Signatures: What Every SA Business Needs to Know',
    excerpt: 'How the Protection of Personal Information Act affects the way you collect signatures and store signer data.',
    date: 'April 2026',
    category: 'Privacy',
    slug: '#',
  },
  {
    title: 'Why South African Businesses Are Switching to E-Signatures',
    excerpt: 'The hidden costs of paper-based signing and how digital workflows save time and money.',
    date: 'March 2026',
    category: 'Business',
    slug: '#',
  },
];

export default function Blog() {
  return (
    <>
      <Head>
        <title>Blog - Sayina E-Signature</title>
        <meta name="description" content="Guides, compliance updates, and insights from the Sayina team." />
      </Head>

      <Header />

      <main className="pt-20 pb-20">

        <section className="py-16 bg-gradient-to-b from-primary-50 to-white">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <h1 className="text-4xl font-bold text-secondary-900 mb-4">Sayina Blog</h1>
            <p className="text-lg text-secondary-600">
              Compliance guides, product updates, and insights for South African businesses navigating digital signatures.
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">

            <div className="mb-6 bg-primary-50 border border-primary-100 rounded-xl px-6 py-4 text-sm text-primary-700 font-medium">
              📝 Full articles are coming soon. Subscribe to get notified when we publish.
            </div>

            <div className="space-y-6">
              {posts.map((post) => (
                <div key={post.title} className="bg-white rounded-xl border border-secondary-100 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-semibold bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full">{post.category}</span>
                    <span className="text-xs text-secondary-400">{post.date}</span>
                  </div>
                  <h2 className="text-lg font-semibold text-secondary-900 mb-2">{post.title}</h2>
                  <p className="text-secondary-600 text-sm">{post.excerpt}</p>
                  <div className="mt-4">
                    <span className="text-xs text-secondary-400 italic">Full article coming soon</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <p className="text-secondary-600 mb-4">Want to be notified when we publish? Get in touch.</p>
              <Link href="/contact" className="inline-block bg-primary-500 text-white font-semibold px-8 py-3 rounded-lg hover:bg-primary-600 transition-colors">
                Stay Updated
              </Link>
            </div>
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
