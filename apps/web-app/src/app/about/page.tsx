import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import { AboutNav } from '@/components/about'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'

export const metadata: Metadata = {
  title: 'About Exercism - Free Coding Practice & Mentorship',
  description: 'Learn about Exercism\'s mission to provide free, high-quality programming education through practice exercises and mentorship.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <AboutNav activeTab="about" />
      
      <div id="page-about">
        <header className="pb-56 c-header-with-bg">
          <div className="md-container flex flex-col items-center c-shapes c-shapes-1">
            <GraphicalIcon icon="exercism-face" className="logo mb-8" />
            <h1 className="text-h0 mb-16">Code practice and mentorship for everyone</h1>
            <hr className="c-divider mb-16" />
            <p className="text-p-3xlarge text-textColor2 mb-40 text-center">
              Level up your programming skills with 67 languages, and insightful discussion with our dedicated team of welcoming mentors.
            </p>
            <div className="grid grid-1 md:grid-cols-2-auto gap-24">
              <Link href="/donate" className="btn-l btn-primary">
                Donate to Exercism
                <GraphicalIcon icon="arrow-right" />
              </Link>
            </div>
          </div>
        </header>

        <div className="md-container">
          <div className="purpose border-t-4 md:border-t-0 md:border-l-6 py-28 my-40 md:my-56 md:py-40 px-32 md:px-64 flex items-start lg:items-center flex-col lg:flex-row mb-64">
            <div className="info">
              <h2 className="text-h1 mb-16 flex items-center">
                <GraphicalIcon icon="purpose" />
                Our Purpose
              </h2>
              <p className="text-p-2xlarge">
                To give everyone the opportunity to learn programming for free, with a world-class curriculum, 
                and supportive, human mentorship.
              </p>
            </div>
            <GraphicalIcon icon="purpose" category="graphics" className="graphic mt-16 lg:mt-0 lg:ml-40 xl:ml-80" />
          </div>

          <div className="goals mb-80 grid grid-cols-1 md:grid-cols-3 gap-x-40 gap-y-24">
            <div className="goal">
              <div className="number">1</div>
              <h3>Enable anyone to achieve fluency in programming</h3>
              <p>
                We want to create a place where anyone can become fluent in programming, 
                regardless of their background, education, or financial situation.
              </p>
            </div>

            <div className="goal">
              <div className="number">2</div>
              <h3>Unlock human potential through programming</h3>
              <p>
                Programming is a superpower. We want to help people unlock their potential 
                and create amazing things with code.
              </p>
            </div>

            <div className="goal">
              <div className="number">3</div>
              <h3>Create a supportive, inclusive community</h3>
              <p>
                We believe learning is better together. Our community of mentors and students 
                creates a welcoming environment for everyone.
              </p>
            </div>
          </div>

          <div className="principles flex flex-col items-center">
            <GraphicalIcon icon="principles" className="graphic" />
            <h2 className="text-h1 mb-24">Our Principles</h2>
            <hr className="c-divider mb-36" />

            <ul>
              <li className="text-p-2xlarge">Programming is for everyone, regardless of background or experience</li>
              <li className="text-p-2xlarge">Learning should be free and accessible to all</li>
              <li className="text-p-2xlarge">Human mentorship accelerates learning and builds confidence</li>
              <li className="text-p-2xlarge">Open source collaboration creates better educational resources</li>
            </ul>
          </div>

          <div className="leadership flex items-start pt-64 pb-80 flex-col-reverse lg:flex-row">
            <GraphicalIcon icon="team" category="graphics" className="graphic self-center md:self-start mt-20 lg:mt-0 m-auto" />

            <div className="info">
              <GraphicalIcon icon="contributing-header" className="icon" />
              <h2 className="text-h1 mb-16">Leadership & Values</h2>
              <p className="text-p-2xlarge mb-40">
                Exercism is led by a small, dedicated team who believe deeply in our mission 
                to make programming education accessible to everyone.
              </p>

              <h3 className="text-h3 mb-16">Reflective Leadership</h3>
              <p className="text-p-xlarge mb-40">
                We take time to reflect on our decisions and their impact on our community. 
                We listen to feedback and continuously improve.
              </p>

              <h3 className="text-h3 mb-16">Small Team, Big Impact</h3>
              <p className="text-p-xlarge mb-40">
                Our small core team works alongside thousands of volunteers to create 
                something much bigger than any of us could build alone.
              </p>

              <h3 className="text-h3 mb-16">Ethical Technology</h3>
              <p className="text-p-xlarge">
                We believe technology should serve humanity. We're committed to building 
                tools that empower people without exploiting them.
              </p>
            </div>
          </div>

          <div className="donate-section px-24 lg:px-64 py-24 lg:py-40 flex items-start flex-col lg:flex-row">
            <GraphicalIcon icon="building-with-gradient" className="icon mb-16 lg:mb-0" />
            <div className="info flex flex-col md:items-start">
              <h2 className="text-h1 mb-12">Support Our Mission</h2>
              <p className="text-p-2xlarge mb-28">
                Help us keep Exercism free for everyone. Your support enables us to maintain 
                and improve the platform for millions of learners worldwide.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2-auto gap-24">
                <Link href="/donate" className="btn-l btn-primary">
                  <span>Donate to Exercism</span>
                </Link>

                <Link href="/contributing/tasks" className="btn-l btn-enhanced">
                  <span>Contribute Your Skills</span>
                  <GraphicalIcon icon="arrow-right" />
                </Link>
              </div>
            </div>

            <GraphicalIcon icon="floating-cash" category="graphics" className="graphic md:hidden lg:block lg:ml-48 lx:ml-96 mt-28 lg:mt-0 self-center lg:self-start" />
          </div>
        </div>
      </div>
    </div>
  )
}