"use client";

import Link from "next/link";
import {
  navigationColumns,
  socialLinks,
  programmingLanguages,
  legalLinks,
} from "@/data/footerData";

export function SiteFooter() {
  return (
    <footer id="site-footer" className="bg-[#2e2456] px-[80px] py-[80px]">
      {/* Hero Section */}
      <div className="relative mb-[100px]">
        <div className="flex justify-between items-start">
          {/* Left Content */}
          <div className="max-w-[650px]">
            {/* Logo */}
            <div className="flex items-center mb-[32px]">
              <span className="text-white text-[26px] font-semibold mr-2">
                •
              </span>
              <span className="text-white text-[26px] font-semibold">
                exercism
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-[42px] font-bold leading-[1.25] text-white mb-[20px]">
              Code practice and mentorship for everyone
            </h1>

            {/* Subheadline */}
            <p className="text-[19px] leading-[1.65] text-[rgba(255,255,255,0.9)] max-w-[650px]">
              Develop fluency in 78 programming languages with our unique blend
              of learning, practice and mentoring. Exercism is fun, effective
              and 100% free, forever.
            </p>
          </div>

          {/* Right Content - CTA Buttons */}
          <div className="flex gap-[16px] mt-[100px]">
            <Link
              href="/auth/register"
              className="bg-[#6b4de6] text-white text-[17px] font-semibold px-[32px] py-[14px] rounded-[8px] hover:bg-[#5a3dd4] transition-colors"
            >
              Sign up for free
            </Link>
            <Link
              href="/tracks"
              className="border-2 border-[#6b4de6] text-white text-[17px] font-semibold px-[32px] py-[14px] rounded-[8px] hover:border-[#5a3dd4] transition-colors"
            >
              Explore languages
            </Link>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-[1px] bg-[rgba(255,255,255,0.15)] my-[90px]" />

      {/* Navigation Columns */}
      <nav className="grid grid-cols-6 gap-[70px] mb-[40px]">
        {navigationColumns.map((column, index) => (
          <div key={index} className="col">
            <h3 className="text-[19px] font-bold text-white mb-[20px] tracking-[0.3px]">
              {column.title}
            </h3>
            <div className="text-[#12c9ba] text-[20px] mb-[16px]">~~~</div>
            <ul className="space-y-0">
              {column.links.map((link, linkIndex) => (
                <li key={linkIndex} className="leading-[2.2]">
                  <Link
                    href={link.href}
                    className="text-[16px] text-[rgba(255,255,255,0.75)] hover:text-white transition-colors"
                  >
                    {link.text}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Social Icons */}
      <div className="flex justify-center gap-[16px] my-[40px]">
        {socialLinks.map((social, index) => (
          <Link
            key={index}
            href={social.href}
            className="w-[48px] h-[48px] rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
            style={{ backgroundColor: social.backgroundColor }}
            target="_blank"
            rel="noopener noreferrer"
          >
            <SocialIcon platform={social.platform} />
          </Link>
        ))}
      </div>

      {/* Languages Section */}
      <section className="mt-[80px]">
        {/* Header */}
        <div className="text-center mb-[40px]">
          <h2 className="text-[34px] font-bold text-white mb-[16px]">
            Our programming language tracks
          </h2>
          <div className="text-[#12c9ba] text-[20px]">~~~</div>
        </div>

        {/* Languages Grid with CTA Box */}
        <div className="relative">
          <div className="grid grid-cols-5 gap-x-[45px] gap-y-[22px] pr-[300px]">
            {programmingLanguages.map((language, index) => (
              <Link
                key={index}
                href={`/tracks/${language.slug}`}
                className="text-[16px] text-[rgba(255,255,255,0.75)] hover:text-white transition-colors"
              >
                {language.name}
              </Link>
            ))}
          </div>

          {/* CTA Box */}
          <div className="absolute top-0 right-0 bg-[#3a2d5f] rounded-[8px] p-[24px] max-w-[280px]">
            <h3 className="text-[17px] font-semibold text-white leading-[1.4] mb-[12px]">
              Want to add a language track to Exercism?
            </h3>
            <p className="text-[15px] text-[rgba(255,255,255,0.75)]">
              Start a new topic in the{" "}
              <Link
                href="https://forum.exercism.org/c/exercism/4"
                className="text-[#f4d35e] font-semibold hover:brightness-110 transition-all"
                target="_blank"
                rel="noopener noreferrer"
              >
                forum
              </Link>{" "}
              and let&apos;s discuss it.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom Bar */}
      <div className="mt-[60px] pt-[60px] border-t border-[rgba(255,255,255,0.15)]">
        <div className="flex justify-between items-center">
          {/* Legal Text */}
          <div className="text-[14px] text-[rgba(255,255,255,0.75)]">
            Exercism is a not-for-profit organisation{" "}
            {legalLinks.map((link, index) => (
              <span key={index}>
                <Link
                  href={link.href}
                  className="underline hover:text-white transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.text}
                </Link>
                {index < legalLinks.length - 1 &&
                  (index === 0 ? ". Its trustees are " : ", ")}
                {index === legalLinks.length - 1 && "."}
              </span>
            ))}
          </div>

          {/* Copyright */}
          <div className="text-[14px] text-[rgba(255,255,255,0.75)]">
            © 2025 Exercism
          </div>
        </div>
      </div>
    </footer>
  );
}

// Social Icon Component
function SocialIcon({ platform }: { platform: string }) {
  const iconPaths: Record<string, string> = {
    twitter:
      "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
    facebook:
      "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
    github:
      "M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z",
  };

  const path = iconPaths[platform];
  if (!path) return null;

  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d={path} />
    </svg>
  );
}
