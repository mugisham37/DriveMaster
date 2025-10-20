'use client';

import { ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { GraphicalIcon } from '@/lib/assets';

interface BootcampLayoutProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export function BootcampLayout({
  children,
  title = 'Bootcamp',
  className = '',
}: BootcampLayoutProps) {
  const { data: session } = useSession();
  const user = session?.user;

  // TODO: Get user's bootcamp data from API
  const bootcampData = {
    part_1_level_idx: 0,
    enrolled_on_part_1: false,
  };

  const isLevel0 = bootcampData.part_1_level_idx === 0;
  const containerClass = isLevel0 ? 'sm-container' : 'lg-container';

  return (
    <>
      <Head>
        {/* Font Preloading - Critical fonts first */}
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

        {/* Basic Meta Tags */}
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>{title}</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />

        {/* Favicon */}
        <link rel="apple-touch-icon" sizes="180x180" href={`${process.env.NEXT_PUBLIC_ICONS_HOST}/meta/apple-touch-icon.png`} />
        <link rel="icon" type="image/png" sizes="32x32" href={`${process.env.NEXT_PUBLIC_ICONS_HOST}/meta/favicon-32x32.png`} />
        <link rel="icon" type="image/png" sizes="16x16" href={`${process.env.NEXT_PUBLIC_ICONS_HOST}/meta/favicon-16x16.png`} />
        {process.env.NODE_ENV === 'production' && (
          <link rel="manifest" href="/site.webmanifest" />
        )}

        {/* Turbo Configuration */}
        <meta name="turbo-cache-control" content="no-cache" />
        <meta name="turbo-prefetch" content="false" />
        <meta name="user-id" content={user?.id?.toString() || ''} />

        {/* Font Face Definitions */}
        <style jsx>{`
          @font-face {
            font-display: fallback;
            font-family: PoppinsInitial;
            font-weight: 400;
            src: url('/assets/fonts/poppins-v20-latin-regular.woff2') format('woff2');
          }

          @font-face {
            font-display: fallback;
            font-family: PoppinsInitial;
            font-weight: 500;
            src: url('/assets/fonts/poppins-v20-latin-600.woff2') format('woff2');
          }

          @font-face {
            font-display: fallback;
            font-family: PoppinsInitial;
            font-weight: 600;
            src: url('/assets/fonts/poppins-v20-latin-600.woff2') format('woff2');
          }

          @font-face {
            font-display: fallback;
            font-family: PoppinsInitial;
            font-weight: 700;
            src: url('/assets/fonts/poppins-v20-latin-600.woff2') format('woff2');
          }

          @font-face {
            font-display: fallback;
            font-family: DSDigital;
            font-weight: 400;
            src: url('/assets/fonts/ds-digi.woff2') format('woff2');
          }

          body {
            --body-font: Poppins, PoppinsInitial, sans-serif;
            font-family: var(--body-font);
            -webkit-font-smoothing: antialiased;
          }
        `}</style>
      </Head>

      <body className={className}>
        <BootcampHeader 
          containerClass={containerClass}
          bootcampData={bootcampData}
        />
        
        {/* Loading overlay */}
        <div className="c-loading-overlay" />
        
        {children}
      </body>
    </>
  );
}

interface BootcampHeaderProps {
  containerClass: string;
  bootcampData: {
    part_1_level_idx: number;
    enrolled_on_part_1: boolean;
  };
}

function BootcampHeader({ containerClass, bootcampData }: BootcampHeaderProps) {
  const showCustomFunctions = bootcampData.part_1_level_idx >= 5 && bootcampData.enrolled_on_part_1;

  return (
    <header className="c-site-header">
      <div className={containerClass}>
        <div className="container">
          <img 
            src="https://assets.exercism.org/assets/bootcamp/exercism-face-light-2fc4ffad44f295d2e900ab2d2198d2280128dfcd.svg"
            alt="Exercism Bootcamp"
          />
          
          <Link href="/bootcamp/dashboard" className="content">
            <strong className="font-semibold">Exercism</strong>
            Bootcamp
          </Link>

          <div className="ml-auto flex gap-32 text-16">
            <Link 
              href="/bootcamp/levels" 
              className="text-textColor2 font-medium flex items-center gap-6"
            >
              <GraphicalIcon 
                icon="bootcamp-levels" 
                css_class="!filter-none h-[16px] w-[16px]" 
              />
              Levels
            </Link>
            
            <Link 
              href="/bootcamp/exercises" 
              className="text-textColor2 font-medium flex items-center gap-6"
            >
              <GraphicalIcon 
                icon="bootcamp-projects" 
                css_class="!filter-none h-[16px] w-[16px]" 
              />
              Exercises
            </Link>
            
            <Link 
              href="/bootcamp/concepts" 
              className="text-textColor2 font-medium flex items-center gap-6"
            >
              <GraphicalIcon 
                icon="bootcamp-concepts" 
                css_class="!filter-none h-[16px] w-[16px]" 
              />
              Concepts
            </Link>
            
            {showCustomFunctions && (
              <Link 
                href="/bootcamp/custom-functions" 
                className="text-textColor2 font-medium flex items-center gap-6"
              >
                <GraphicalIcon 
                  icon="bootcamp-custom-functions" 
                  css_class="!filter-none h-[16px] w-[16px]" 
                />
                Library
              </Link>
            )}
            
            <Link 
              href="/bootcamp/faqs" 
              className="text-textColor2 font-medium flex items-center gap-6"
            >
              <GraphicalIcon 
                icon="bootcamp-faqs" 
                css_class="!filter-none h-[16px] w-[16px]" 
              />
              FAQs
            </Link>
            
            <Link 
              href="/dashboard" 
              className="text-textColor2 font-medium"
            >
              Back to Exercism →
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}