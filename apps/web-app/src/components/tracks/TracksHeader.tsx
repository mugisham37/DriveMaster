import Link from 'next/link'
import Image from 'next/image'

interface TracksHeaderProps {
  numTracks: number
  trackIconUrls: string[]
}

export function TracksHeader({ numTracks, trackIconUrls }: TracksHeaderProps) {
  return (
    <header className="tracks-header">
      <div className="lg-container container">
        <div className="track-icons">
          {trackIconUrls.map((iconUrl, index) => (
            <Image
              key={index}
              src={iconUrl}
              alt=""
              width={32}
              height={32}
              className="c-icon c-track-icon"
            />
          ))}
        </div>

        <h1 className="text-h1">
          {numTracks} Programming Language Tracks
        </h1>
        
        <p className="text-p-large">
          Each language track provides a structured learning path with exercises 
          designed by our amazing{' '}
          <Link 
            href="/contributing/contributors" 
            className="text-prominentLinkColor"
          >
            contributors
          </Link>
          .
        </p>
      </div>
    </header>
  )
}