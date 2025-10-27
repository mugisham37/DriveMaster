'use client';

import Image from 'next/image';
import Link from 'next/link';

export function LandingHero() {
  return (
    <div className="bg-gradient-to-b from-[#F8F9FF] to-white">
      {/* Hero Section */}
      <section className="pt-[80px] pb-[100px] px-[60px]">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-start justify-between gap-20">
            {/* Left Content - 55% width */}
            <div className="w-[55%] text-left">
              {/* Main Heading */}
              <h1 className="text-[62px] font-bold leading-[1.1] text-[#1E1B4B] mb-[24px] tracking-[-0.02em]">
                Get really good at programming.
              </h1>
              
              {/* Subheading */}
              <div className="text-[20px] leading-[1.6] text-[#374151] mb-[40px]">
                Develop fluency in{' '}
                <span className="italic">78 programming languages</span>{' '}
                with our unique blend of learning, practice and mentoring. Exercism is fun, effective and{' '}
                <span className="font-bold">100% free, forever.</span>
              </div>

              {/* CTA Buttons */}
              <div className="flex gap-[16px] mb-[60px]">
                <Link
                  href="/auth/register"
                  className="inline-flex items-center justify-center px-[32px] py-[16px] bg-[#7C3AED] text-white font-semibold text-[18px] rounded-[8px] hover:bg-[#6D28D9] transition-colors duration-200 shadow-[0_4px_12px_rgba(124,58,237,0.3)]"
                >
                  Sign up for free
                </Link>
                <Link
                  href="/tracks"
                  className="inline-flex items-center justify-center px-[32px] py-[16px] bg-white text-[#7C3AED] font-semibold text-[18px] rounded-[8px] border-2 border-[#7C3AED] hover:bg-[#F8F9FF] transition-colors duration-200"
                >
                  Explore languages
                </Link>
              </div>

              {/* Info Box */}
              <div className="w-[680px] bg-white border-2 border-[#7C3AED] rounded-[12px] p-[20px_24px] flex items-center">
                <div className="text-[#1E1B4B] font-bold text-[18px]">
                  {'{∧}'} exercism
                </div>
                <div className="text-[16px] text-[#4B5563] ml-[16px] flex-1">
                  is an independent, community funded, not-for-profit organisation.
                </div>
                <Link
                  href="/about"
                  className="text-[#3B82F6] font-semibold text-[16px] hover:underline ml-auto"
                >
                  Learn more
                </Link>
                <div className="w-[40px] h-[40px] bg-[#7C3AED] rounded-full ml-[16px]"></div>
              </div>
            </div>

            {/* Right Content - 45% width */}
            <div className="w-[45%] flex justify-end">
              <div className="relative w-[550px]">
                {/* Main Illustration Container */}
                <div className="relative">
                  {/* Character Illustrations */}
                  <Image
                    src="/assets/graphics/exercism-characters.svg"
                    alt="Three diverse characters looking over laptop with programming language icons"
                    width={550}
                    height={400}
                    className="w-full h-auto object-contain"
                    priority
                  />

                  {/* Programming Language Icons in Arc Formation */}
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex gap-[20px]">
                    {/* C# Icon */}
                    <div className="hexagon bg-[#7C3AED] text-white font-bold text-[14px] shadow-lg">
                      C#
                    </div>
                    
                    {/* Java Icon */}
                    <div className="hexagon bg-[#DC2626] shadow-lg">
                      <Image
                        src="/assets/tracks/javascript-mno345.svg"
                        alt="Java"
                        width={30}
                        height={30}
                        className="w-[30px] h-[30px]"
                      />
                    </div>
                    
                    {/* Python Icon */}
                    <div className="hexagon bg-[#3B82F6] shadow-lg">
                      <Image
                        src="/assets/tracks/python-pqr678.svg"
                        alt="Python"
                        width={30}
                        height={30}
                        className="w-[30px] h-[30px]"
                      />
                    </div>
                    
                    {/* Ruby Icon */}
                    <div className="hexagon bg-[#DC2626] shadow-lg">
                      <Image
                        src="/assets/tracks/ruby.svg"
                        alt="Ruby"
                        width={30}
                        height={30}
                        className="w-[30px] h-[30px]"
                      />
                    </div>
                    
                    {/* Elixir Icon */}
                    <div className="hexagon bg-[#7C3AED] shadow-lg">
                      <Image
                        src="/assets/tracks/elixir.svg"
                        alt="Elixir"
                        width={30}
                        height={30}
                        className="w-[30px] h-[30px]"
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