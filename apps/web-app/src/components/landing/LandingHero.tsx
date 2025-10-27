'use client';

import Image from 'next/image';
import Link from 'next/link';

export function LandingHero() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="lg-container">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-20">
            {/* Left Content */}
            <div className="flex-1 text-center lg:text-left max-w-[580px]">
              <h1 className="text-[52px] lg:text-[64px] font-bold leading-[1.1] text-textColor1 mb-8">
                Get really good at programming.
              </h1>
              
              <div className="text-[18px] leading-[1.6] text-textColor2 mb-10 max-w-[500px] mx-auto lg:mx-0">
                Develop fluency in{' '}
                <span className="font-medium italic">78 programming languages</span>{' '}
                with our unique blend of learning, practice and mentoring. Exercism is fun, effective and{' '}
                <span className="font-semibold">100% free, forever</span>.
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-16">
                <Link
                  href="/auth/register"
                  className="inline-flex items-center justify-center px-8 py-4 bg-prominentLinkColor text-white font-semibold text-[16px] rounded-lg hover:bg-[#5856eb] transition-colors duration-200"
                >
                  Sign up for free
                </Link>
                <Link
                  href="/tracks"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-prominentLinkColor font-semibold text-[16px] rounded-lg border-2 border-prominentLinkColor hover:bg-veryLightBlue transition-colors duration-200"
                >
                  Explore languages
                </Link>
              </div>

              {/* Exercism Info Box */}
              <div className="inline-flex items-start gap-4 p-6 bg-veryLightBlue rounded-lg border border-lightBlue max-w-[520px] mx-auto lg:mx-0">
                <div className="flex-shrink-0">
                  {/* Exercism Logo */}
                  <div className="text-prominentLinkColor font-bold text-xl">
                    {'{-}'}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-[14px] text-textColor2 leading-[1.5]">
                    <span className="font-semibold">exercism</span> is an independent, community-funded, not-for-profit organisation.
                  </div>
                  <Link
                    href="/about"
                    className="inline-flex items-center gap-1 text-[14px] text-prominentLinkColor font-medium mt-2 hover:underline"
                  >
                    Learn more
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                      <path fillRule="evenodd" d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"/>
                    </svg>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Content - Illustration */}
            <div className="flex-1 flex justify-center lg:justify-end">
              <div className="relative">
                {/* Main Illustration Container */}
                <div className="relative w-[400px] h-[320px] lg:w-[480px] lg:h-[380px]">
                  {/* Character Illustrations */}
                  <Image
                    src="/assets/graphics/exercism-characters.svg"
                    alt="Exercism community characters coding together"
                    width={480}
                    height={380}
                    className="w-full h-full object-contain"
                    priority
                  />

                  {/* Language Icons */}
                  <div className="absolute -bottom-4 -left-4 flex gap-3">
                    {/* C# Icon */}
                    <div className="w-16 h-16 rounded-full shadow-lg overflow-hidden">
                      <Image
                        src="/assets/tracks/csharp.svg"
                        alt="C# Programming Language"
                        width={64}
                        height={64}
                        className="w-full h-full"
                      />
                    </div>
                    
                    {/* Elixir Icon */}
                    <div className="w-16 h-16 rounded-full shadow-lg overflow-hidden">
                      <Image
                        src="/assets/tracks/elixir.svg"
                        alt="Elixir Programming Language"
                        width={64}
                        height={64}
                        className="w-full h-full"
                      />
                    </div>
                  </div>

                  <div className="absolute -bottom-4 -right-4 flex gap-3">
                    {/* Python Icon */}
                    <div className="w-16 h-16 rounded-full shadow-lg overflow-hidden">
                      <Image
                        src="/assets/tracks/python-pqr678.svg"
                        alt="Python Programming Language"
                        width={64}
                        height={64}
                        className="w-full h-full"
                      />
                    </div>
                    
                    {/* Ruby Icon */}
                    <div className="w-16 h-16 rounded-full shadow-lg overflow-hidden">
                      <Image
                        src="/assets/tracks/ruby.svg"
                        alt="Ruby Programming Language"
                        width={64}
                        height={64}
                        className="w-full h-full"
                      />
                    </div>
                    
                    {/* Elixir Icon (duplicate) */}
                    <div className="w-16 h-16 rounded-full shadow-lg overflow-hidden">
                      <Image
                        src="/assets/tracks/elixir.svg"
                        alt="Elixir Programming Language"
                        width={64}
                        height={64}
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}