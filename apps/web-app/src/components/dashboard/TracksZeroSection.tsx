import Link from 'next/link'
import Image from 'next/image'

export function TracksZeroSection() {
  // Mock track icon URLs (this would come from API)
  const trackIconUrls = [
    '/assets/tracks/javascript.svg',
    '/assets/tracks/python.svg',
    '/assets/tracks/ruby.svg',
    '/assets/tracks/java.svg',
    '/assets/tracks/csharp.svg',
    '/assets/tracks/go.svg',
    '/assets/tracks/rust.svg',
    '/assets/tracks/cpp.svg'
  ]
  
  const numTracks = 67 // This would come from API

  return (
    <section className="c-tracks-zero-section c-zero-section">
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

      <h3>You haven&apos;t joined any tracks yet</h3>

      <p>
        Tracks are Exercism&apos;s way of structuring learning.{' '}
        <strong>We have {numTracks} tracks available</strong>
        {' '}covering everything from Python to Prolog!
      </p>
      
      <Link 
        href="/tracks" 
        className="btn-primary btn-s"
      >
        Browse {numTracks} tracks
      </Link>
    </section>
  )
}