import Link from 'next/link'
import Image from 'next/image'

export function BootcampNav() {
  return (
    <div id="nav">
      <div className="lg-container flex flex-row gap-8 items-center">
        <Image 
          src="/assets/bootcamp/exercism-face-light.svg" 
          alt="Exercism"
          width={40}
          height={40}
          className="exercism-face" 
        />
        <div className="content">
          <strong className="font-semibold">Exercism</strong>
          {' '}Bootcamp
        </div>
        <Link 
          href="https://www.youtube.com/live/bOAL_EIFwhg&start=1400"
          className="first-session"
          target="_blank"
          rel="noopener"
        >
          Watch first session 👀
        </Link>
        <Link 
          href="/bootcamp/enroll"
          className="button"
        >
          Enroll now 👉
        </Link>
      </div>
    </div>
  )
}