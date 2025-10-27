'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { GraphicalIcon } from '@/lib/assets';
import { DonationsFooterForm } from '@/components/common/DonationsFooterForm';

interface Track {
  title: string;
  slug: string;
}

// This would normally come from an API call
const TRACKS: Track[] = [
  { title: 'JavaScript', slug: 'javascript' },
  { title: 'Python', slug: 'python' },
  { title: 'Java', slug: 'java' },
  { title: 'C#', slug: 'csharp' },
  { title: 'Ruby', slug: 'ruby' },
  { title: 'Go', slug: 'go' },
  { title: 'Rust', slug: 'rust' },
  { title: 'TypeScript', slug: 'typescript' },
  { title: 'C++', slug: 'cpp' },
  { title: 'PHP', slug: 'php' },
  // Add more tracks as needed
];

export function SiteFooter() {
  const { data: session } = useSession();
  const isSignedIn = !!session?.user;

  return (
    <footer id="site-footer">
      {!isSignedIn && <ExternalSection />}
      <SharedSection isSignedIn={isSignedIn} />
    </footer>
  );
}

function ExternalSection() {
  return (
    <div className="external-section pt-48 pb-0">
      <div className="lg-container flex flex-col lg:flex-row">
        <div className="lhs mr-auto mb-20 lg:mb-0">
          <GraphicalIcon icon="exercism-with-logo-black" />
          <h2 className="text-h3 mb-4">
            Code practice and mentorship for everyone
          </h2>
          <p className="text-p-large">
            Level up your programming skills with 67 languages, and insightful discussion with our dedicated team of welcoming mentors.
          </p>
        </div>
        <div className="rhs flex lg:ml-24 flex-col sm:flex-row items-stretch sm:items-center">
          <Link 
            href="/auth/register" 
            className="btn-l btn-primary mb-16 sm:mb-0 sm:mr-32"
          >
            Sign up for free
          </Link>
          <Link 
            href="/tracks" 
            className="btn-l btn-enhanced"
          >
            Explore languages
          </Link>
        </div>
      </div>
      <div className="bottom" />
    </div>
  );
}

function SharedSection({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <div className="lg-container">
      {isSignedIn && <NonProfitSection />}
      
      <hr />
      
      <SiteLinksSection />
      <SocialsSection />
      
      <hr />
      
      <TracksSection />
      
      <hr />
      
      <LegalsSection />
    </div>
  );
}

function NonProfitSection() {
  return (
    <div className="nfp mb-40 md:mb-58">
      <GraphicalIcon icon="exercism-face-gradient" />
      <h2 className="text-h2 mb-32">
        Help us build the best coding education platform, for everyone, for free.
      </h2>
      <DonationsFooterForm />
      <h3 className="text-h4 mt-32 mb-8">
        Exercism is a not-for-profit
      </h3>
      <p className="text-p-large">
        Our goal is to provide the best possible learning experience for everyone, 
        regardless of their financial situation. We rely on donations to keep the platform free.
      </p>
    </div>
  );
}

function SiteLinksSection() {
  return (
    <div className="site-links mt-24 md:mt-56">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-x-40">
        <div className="col">
          <h3>Editions</h3>
          <hr className="c-divider --small" />
          <ul>
            <li><Link href="/">Exercism</Link></li>
            <li><Link href="/courses/coding-fundamentals">Learn to Code</Link></li>
            <li><Link href="/courses/coding-fundamentals">Coding Fundamentals</Link></li>
            <li><Link href="/courses/front-end-fundamentals">Front-end Course</Link></li>
            <li><Link href="/bootcamp">Bootcamp</Link></li>
            <li><Link href="/docs/using/editions/teams">Teams</Link></li>
            <li><Link href="/docs/using/editions/research">Research</Link></li>
          </ul>
        </div>

        <div className="col">
          <h3>About</h3>
          <hr className="c-divider --small" />
          <ul>
            <li><Link href="/about">About Exercism</Link></li>
            <li><Link href="/about/team">Our Team</Link></li>
            <li><Link href="/about/testimonials">Testimonials</Link></li>
            <li><Link href="/about/hiring">Hiring</Link></li>
            <li><Link href="/contributing/contributors">Contributors</Link></li>
          </ul>
        </div>

        <div className="col">
          <h3>Get Involved</h3>
          <hr className="c-divider --small" />
          <ul>
            <li><Link href="/insiders">Exercism Insiders</Link></li>
            <li><Link href="/contributing">Contribute</Link></li>
            <li><Link href="/mentoring">Mentor</Link></li>
            <li><Link href="/donate">Donate</Link></li>
          </ul>
        </div>

        <div className="col">
          <h3>Legal & Policies</h3>
          <hr className="c-divider --small" />
          <ul>
            <li><Link href="/docs/using/legal/terms-of-service">Terms of Usage</Link></li>
            <li><Link href="/docs/using/legal/privacy-policy">Privacy Policy</Link></li>
            <li><Link href="/docs/using/legal/cookie-policy">Cookie Policy</Link></li>
            <li><Link href="/docs/using/legal/code-of-conduct">Code of Conduct</Link></li>
            <li><Link href="/docs/using/legal/accessibility">Accessibility Statement</Link></li>
          </ul>
        </div>

        <div className="col">
          <h3>Keep in Touch</h3>
          <hr className="c-divider --small" />
          <ul>
            <li><Link href="/blog">Blog</Link></li>
            <li><Link href="/challenges">Challenges</Link></li>
            <li><Link href="https://github.com/exercism/exercism">GitHub</Link></li>
            <li><Link href="/docs/using/contact">Contact Us</Link></li>
            <li><Link href="/docs/using/report-abuse">Report Abuse</Link></li>
          </ul>
        </div>

        <div className="col">
          <h3>Get Help</h3>
          <hr className="c-divider --small" />
          <ul>
            <li><Link href="/docs">Docs</Link></li>
            <li><Link href="/docs/using/getting-started">Getting Started</Link></li>
            <li><Link href="/docs/using/faqs">FAQs</Link></li>
            <li><Link href="/docs/using/solving-exercises/working-locally">Installing CLI</Link></li>
            <li><Link href="/cli-walkthrough">CLI Walkthrough</Link></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function SocialsSection() {
  return (
    <div className="socials mt-24 mb-40 md:mb-56">
      <Link href="https://twitter.com/exercism_io" className="icon twitter">
        <GraphicalIcon icon="external-site-twitter" />
      </Link>
      <Link href="https://facebook.com/exercism.io" className="icon facebook">
        <GraphicalIcon icon="external-site-facebook" />
      </Link>
      <Link href="https://github.com/exercism" className="icon github">
        <GraphicalIcon icon="external-site-github" />
      </Link>
    </div>
  );
}

function TracksSection() {
  // Group tracks into columns of 5
  const trackGroups = [];
  for (let i = 0; i < TRACKS.length; i += 5) {
    trackGroups.push(TRACKS.slice(i, i + 5));
  }

  return (
    <div className="tracks mt-32 md:mt-48 mb-32 md:mb-48 md:items-center">
      <div className="hidden md:block">
        <h2 className="text-h3">Programming Languages</h2>
        <hr className="c-divider mt-28 mb-36" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-x-32">
        {trackGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="col">
            <ul>
              {group.map((track) => (
                <li key={track.slug}>
                  <Link href={`/tracks/${track.slug}`}>
                    {track.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="col hidden md:block mt-32 xl:mt-0">
          <h3 className="text-h6">Add your language</h3>
          <p className="text-p-base">
            Exercism is open-source and we welcome contributions. 
            <Link href="https://forum.exercism.org/c/exercism/4">
              Add your language
            </Link> 
            {' '}to help others learn.
          </p>
        </div>
      </div>
    </div>
  );
}

function LegalsSection() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="legals mt-24 md:mt-32 mb-32 md:mb-40 flex md:items-center flex-col md:flex-row">
      <div className="company mb-16 md:mb-0 md:mr-32">
        Exercism is a{' '}
        <Link 
          href="https://find-and-update.company-information.service.gov.uk/company/11733062"
          rel="noopener"
          target="_blank"
        >
          registered company
        </Link>
        {' '}in England & Wales (no. 11733062) founded by{' '}
        <Link href="https://exercism.github.io/kytrinyx/">Katrina Owen</Link>
        {', '}
        <Link href="https://ihid.info/">Jeremy Walker</Link>
        {' and '}
        <Link href="https://erikschierboom.com/">Erik Schierboom</Link>
        .
      </div>
      <div className="copyright md:ml-auto">
        © {currentYear} Exercism
      </div>
    </div>
  );
}

