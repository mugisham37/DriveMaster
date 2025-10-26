import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '404 - Page Not Found - Exercism',
  description: 'The page you are looking for could not be found.',
}

export default function NotFound() {
  return (
    <div id="page-error" className="pt-60 pt-40">
      <div className="sm-container">
        <div className="flex items-center">
          <div className="mr-40">
            <div className="text-purple leading-110 text-[128px]">404</div>
            <h1 className="text-h1 mb-16">Page not found</h1>
            <p className="text-textColor6 text-24 leading-150 font-semibold mb-24">
              The page you are looking for doesn&apos;t exist.
            </p>
            <p className="text-p-xlarge max-w-[550px]">
              You might have mistyped the address, or the page may have moved. 
              Try going back to the{' '}
              <Link href="/" className="text-prominentLinkColor underline">
                homepage
              </Link>{' '}
              or use the navigation above to find what you&apos;re looking for.
            </p>
          </div>
          <div className="ml-auto">
            <svg 
              className="w-[250px] h-[250px]" 
              viewBox="0 0 400 300" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="200" cy="150" r="100" fill="#E5E7EB" />
              <path 
                d="M160 120 L240 120 M160 180 L240 180 M180 100 L220 100" 
                stroke="#9CA3AF" 
                strokeWidth="4" 
                strokeLinecap="round"
              />
              <circle cx="180" cy="140" r="8" fill="#6B7280" />
              <circle cx="220" cy="140" r="8" fill="#6B7280" />
              <path 
                d="M180 160 Q200 180 220 160" 
                stroke="#6B7280" 
                strokeWidth="3" 
                fill="none"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}