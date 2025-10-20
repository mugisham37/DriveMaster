import Link from 'next/link'
import Image from 'next/image'
import { BootcampData } from '@/lib/api/bootcamp'

export function SignupSection({ 
  hasDiscount, 
  countryCode2, 
  countryName, 
  discountPercentage,
  fullCompletePrice,
  completePrice,
  fullPart1Price,
  part1Price 
}: BootcampData) {
  return (
    <section id="signup-section">
      <div className="lhs-bg" />
      <div className="rhs-bg" />
      <div className="lg-container">
        <h2 className="text-center font-medium">
          Choose your Journey
        </h2>
        <p className="intro text-balance">
          Depending on whether you want to learn web development or some other speciality such as data science, we have two different options.
        </p>
        
        {hasDiscount && (
          <div id="discount-bar">
            <div className="flag">{/* Flag component */}</div>
            {/* {hello && <strong>{hello}!</strong>} */}
            Everyone in {countryName} gets a
            <strong className="inline"> {discountPercentage}% discount!</strong>
          </div>
        )}
        
        <div className="grid md:grid-cols-2 grid-cols-1 gap-40">
          {/* Part 1 Container */}
          <div className="container">
            <div className="header">
              <Image 
                src="/assets/bootcamp/exercism-face-dark.svg" 
                alt=""
                width={40}
                height={40}
                className="face" 
              />
              <div className="flex flex-col items-start">
                <div className="bubbles">
                  <div className="bubble">
                    Only
                    <strong> Part 1</strong>
                  </div>
                </div>

                <h2>
                  Learn to
                  <strong> Code</strong>
                </h2>
                <p>Build rock solid coding fundamentals, applicable to every speciality.</p>
              </div>
              
              {hasDiscount ? (
                <>
                  <div className="price">
                    <strong>${part1Price}</strong>
                    <span className="text-[26px] line-through text-[#777] font-normal">${fullPart1Price}</span>
                  </div>
                  <div className="discount">
                    Includes a
                    <strong> {discountPercentage}% discount</strong>
                    {' '}for our friends in {countryName}!
                  </div>
                </>
              ) : (
                <div className="price">
                  <strong>${fullPart1Price}</strong>
                </div>
              )}
            </div>
            
            <div className="body">
              <div className="point">
                <h4>Who&apos;s it for? 🧑🏽</h4>
                <p>
                  Anyone looking to develop rock solid
                  <strong> coding fundamentals.</strong>
                  {' '}Designed for
                  <strong> absolute beginners</strong>
                  {' '}or new devs wanting to reinforce their solid foundations.
                </p>
              </div>

              <div className="point">
                <h4>Duration ⏳</h4>
                <p className="mb-12">3 months, part-time.</p>
              </div>

              <div className="point">
                <h4>Where you&apos;ll be by the end 🎉</h4>
                <p>
                  You&apos;ll have a solid understanding of
                  <strong> coding fundamentals.</strong>
                  {' '}You&apos;ll be ready to learn vocational skills like app development or
                  <strong> data science.</strong>
                </p>
              </div>

              <div className="point">
                <h4>What&apos;s included? 🔎</h4>
                <ul className="list-disc">
                  <li>Over 35 hours of live teaching (that you can watch back forever).</li>
                  <li>Weekly sessions to answer your questions.</li>
                  <li>Hundreds of hours of exercises and projects, in a specially designed interface for beginners.</li>
                  <li>A dedicated community Discord server.</li>
                  <li>An official certificate of completion.</li>
                </ul>
              </div>

              <Link 
                href="/bootcamp/enroll?package=part_1" 
                className="button"
              >
                Enroll now 👉
              </Link>
            </div>
          </div>

          {/* Complete Course Container */}
          <div className="container">
            <div className="header">
              <Image 
                src="/assets/bootcamp/exercism-face-dark.svg" 
                alt=""
                width={40}
                height={40}
                className="face" 
              />

              <div className="bubbles">
                <div className="bubble">
                  The
                  <strong> Complete Course</strong>
                </div>
              </div>
              
              <h2>
                Become a
                <strong> Front-End Dev</strong>
              </h2>
              <p>Expand your knowledge to front-end web development.</p>

              {hasDiscount ? (
                <>
                  <div className="price">
                    <strong>${completePrice}</strong>
                    <span className="text-[26px] line-through text-[#777] font-normal">${fullCompletePrice}</span>
                  </div>
                  <div className="discount">
                    Includes a
                    <strong> {discountPercentage}% discount</strong>
                    {' '}for our friends in {countryName}.
                  </div>
                </>
              ) : (
                <div className="price">
                  <strong>${fullCompletePrice}</strong>
                </div>
              )}
            </div>
            
            <div className="body">
              <div className="point">
                <h4>Who&apos;s it for? 🧑🏽</h4>
                <p>
                  Anyone looking to become a
                  <strong> web developer.</strong>
                  {' '}Designed for
                  <strong> absolute beginners</strong>
                  {' '}or new devs wanting to reinforce their solid foundations.
                </p>
              </div>

              <div className="point">
                <h4>Duration ⏳</h4>
                <p className="mb-12">6 months, part-time.</p>
              </div>

              <div className="point">
                <h4>Where you&apos;ll be by the end 🎉</h4>
                <p>
                  You&apos;ll be confident creating
                  <strong> website front-ends from scratch</strong>
                  {' '}and well on your way to a career in web development.
                </p>
              </div>

              <div className="point">
                <h4>What&apos;s included? 🔎</h4>
                <ul className="list-disc">
                  <li>Everything in Part 1.</li>
                  <li>An extra 35 hours of live teaching.</li>
                  <li>More weekly sessions to answer your questions.</li>
                  <li>More exercises and projects, this time for you to solve on your own laptop.</li>
                  <li>A second official certificate of completion to put on your resume.</li>
                </ul>
              </div>

              <Link 
                href="/bootcamp/enroll?package=complete" 
                className="button"
              >
                Enroll now 👉
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}