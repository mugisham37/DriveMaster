'use client';

import { ReactNode } from 'react';
import Head from 'next/head';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

interface LayoutProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  canonicalUrl?: string;
  metaImage?: string;
  noIndex?: boolean;
}

export function Layout({
  children,
  className = '',
  title,
  description,
  canonicalUrl,
  metaImage,
  noIndex = false,
}: LayoutProps) {
  const metaTitle = title || 'Exercism - Code Practice and Mentorship for Everyone';
  const metaDescription = description || 'Level up your programming skills with 67 languages, and insightful discussion with our dedicated team of welcoming mentors.';
  const metaImageUrl = metaImage || `${process.env.NEXT_PUBLIC_SITE_URL}/meta/og-image.png`;
  const metaUrl = canonicalUrl || process.env.NEXT_PUBLIC_SITE_URL;

  return (
    <>
      <Head>
        {/* Basic Meta Tags */}
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        
        {/* Canonical URL */}
        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
        
        {/* Robots */}
        {noIndex && <meta name="robots" content="noindex, nofollow" />}
        
        {/* Exercism specific meta tags */}
        <meta name="language-server-url" content={process.env.NEXT_PUBLIC_LANGUAGE_SERVER_URL || ''} />
        <meta name="bug-reports-url" content={`${process.env.NEXT_PUBLIC_API_URL}/bug_reports`} />
        <meta name="parse-markdown-url" content={`${process.env.NEXT_PUBLIC_API_URL}/parse_markdown`} />
        
        {/* Stripe */}
        {process.env.NODE_ENV !== 'test' && (
          <meta name="stripe-publishable-key" content={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''} />
        )}
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@exercism_io" />
        <meta name="twitter:creator" content="@exercism_io" />
        <meta name="twitter:url" content={metaUrl} />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={metaImageUrl} />
        
        {/* Open Graph */}
        <meta property="og:title" content={metaTitle} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={metaUrl} />
        <meta property="og:image" content={metaImageUrl} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:site_name" content="Exercism" />
        <meta property="fb:admins" content="744760440" />
        
        {/* Favicon */}
        <link rel="apple-touch-icon" sizes="180x180" href={`${process.env.NEXT_PUBLIC_ICONS_HOST}/meta/apple-touch-icon.png`} />
        <link rel="icon" type="image/png" sizes="32x32" href={`${process.env.NEXT_PUBLIC_ICONS_HOST}/meta/favicon-32x32.png`} />
        <link rel="icon" type="image/png" sizes="16x16" href={`${process.env.NEXT_PUBLIC_ICONS_HOST}/meta/favicon-16x16.png`} />
        {process.env.NODE_ENV === 'production' && (
          <link rel="manifest" href="/site.webmanifest" />
        )}
        
        {/* RSS Feed */}
        <link rel="alternate" type="application/rss+xml" title="Exercism's Blog" href="/blog/feed.xml" />
        
        {/* Google AdSense */}
        <meta name="google-adsense-account" content="ca-pub-1298009554972786" />
        
        {/* Font Preloading */}
        <link 
          rel="preload" 
          href="/assets/fonts/poppins-v20-latin-regular.woff2" 
          as="font" 
          type="font/woff2" 
          crossOrigin="anonymous" 
        />
        <link 
          rel="preload" 
          href="/assets/fonts/poppins-v20-latin-600.woff2" 
          as="font" 
          type="font/woff2" 
          crossOrigin="anonymous" 
        />
        <link 
          rel="preload" 
          href="/assets/fonts/poppins-v20-latin-500.woff2" 
          as="font" 
          type="font/woff2" 
          crossOrigin="anonymous" 
        />
        <link 
          rel="preload" 
          href="/assets/fonts/poppins-v20-latin-700.woff2" 
          as="font" 
          type="font/woff2" 
          crossOrigin="anonymous" 
        />
        <link 
          rel="preload" 
          href="/assets/fonts/source-code-pro-v22-latin_latin-ext-regular.woff2" 
          as="font" 
          type="font/woff2" 
          crossOrigin="anonymous" 
        />
      </Head>
      
      <body className={className}>
        <SiteHeader />
        
        {/* Turbo Frame equivalent - main content area */}
        <main id="tf-main" data-turbo-action="advance">
          {children}
        </main>
        
        {/* Portal container for modals and overlays */}
        <div id="portal-container" />
        
        {/* Loading overlay */}
        <div className="c-loading-overlay" />
        
        <SiteFooter />
        
        {/* Cloudflare Analytics for production */}
        {process.env.NODE_ENV === 'production' && (
          <script 
            defer 
            src="https://static.cloudflareinsights.com/beacon.min.js" 
            data-cf-beacon='{"token": "1d3f833954d44d6e8d93219676a70d34"}'
          />
        )}
      </body>
    </>
  );
}