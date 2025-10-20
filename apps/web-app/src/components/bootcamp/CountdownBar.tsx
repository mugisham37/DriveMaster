import Link from 'next/link'

export function CountdownBar() {
  return (
    <div id="countdown-bar">
      <strong className="inline-block">Late enrollments currently accepted.</strong>
      <span className="inline-block">
        Watch back{' '}
        <Link 
          href="https://www.youtube.com/live/bOAL_EIFwhg&start=1400"
          className="underline font-semibold"
        >
          the first live session
        </Link>
        .
      </span>
    </div>
  )
}