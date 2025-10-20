import Image from 'next/image'
import { BootcampData } from '@/lib/api/bootcamp'

export function HeroSection({ hasDiscount, countryCode2, completePrice, fullCompletePrice }: BootcampData) {
  return (
    <div className="hero">
      <div className="md-container">
        <div className="text-center">
          <h1 className="rock-solid">
            Build rock solid coding
            <span>foundations</span>
          </h1>
          <div className="tagline">
            A unique part-time remote
            <strong>coding bootcamp</strong>
            by the team behind Exercism.
            Starts
            <strong>Jan 2025.</strong>
          </div>
        </div>

        <div className="bubbles">
          <div className="bubble">
            <Image src="/assets/bootcamp/wave.svg" alt="" width={40} height={40} />
            <div className="text">
              <strong>Live</strong>
              teaching
            </div>
          </div>
          <div className="bubble">
            <Image src="/assets/bootcamp/fun.svg" alt="" width={40} height={40} />
            <div className="text">
              <strong>Fun</strong>
              projects
            </div>
          </div>
          <div className="bubble">
            {hasDiscount && countryCode2 ? (
              <>
                <div className="flag">{/* Flag component would go here */}</div>
                <div className="text">
                  <span className="line-through text-[#666]">${fullCompletePrice}</span>
                  Only
                  <strong>${completePrice}</strong>
                </div>
              </>
            ) : (
              <>
                <Image src="/assets/bootcamp/cost.svg" alt="" width={40} height={40} />
                <div className="text">
                  Only
                  <strong>${fullCompletePrice}</strong>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="video-container">
          <div className="video">
            <iframe 
              src="https://player.vimeo.com/video/1024390839?h=c2b3bdce14&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" 
              frameBorder="0" 
              allow="autoplay; fullscreen; picture-in-picture; clipboard-write" 
              style={{position:'absolute',top:0,left:0,width:'100%',height:'100%'}} 
              title="bootcamp"
            />
          </div>
        </div>

        <div className="supported-by">
          <h3>Exercism&apos;s supporters include:</h3>
          <div className="logos">
            <Image src="/assets/bootcamp/google.png" alt="Google" width={120} height={42} className="h-[42px] mt-[3px]" />
            <Image src="/assets/bootcamp/chicago.svg" alt="University of Chicago" width={120} height={38} className="h-[38px]" />
            <Image src="/assets/bootcamp/mozilla.svg" alt="Mozilla" width={120} height={38} className="h-[38px] mt-[-7px]" />
            <Image src="/assets/bootcamp/packt.svg" alt="Packt" width={120} height={38} className="h-[38px] mt-[2px]" />
          </div>
        </div>
      </div>

      <div className="paper-tear" />
    </div>
  )
}