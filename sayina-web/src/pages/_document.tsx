import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="Sayina E-Signature" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Sayina" />
        <meta name="description" content="A Proudly South African E-signature platform" />
        <meta name="theme-color" content="#DAB44A" />
        
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body className="bg-gray-50 text-secondary-900">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
