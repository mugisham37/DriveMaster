import React from 'react'
import { Metadata } from 'next'
import { AboutNav } from '@/components/about'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'

export const metadata: Metadata = {
  title: "Exercism's Hiring - About Exercism",
  description: "Come and join a passionate team making programming education fun and effective. Here are some of the roles we're hiring for.",
}

export default function HiringPage() {
  return (
    <div className="min-h-screen bg-white">
      <AboutNav activeTab="hiring" />
      
      <div id="page-hiring">
        <header>
          <div className="lg-container c-shapes">
            <GraphicalIcon icon="exercism-face" />
            <h1 className="text-h1 mb-12">We're not currently hiring.</h1>
            <p className="text-p-2xlarge">Please check back in the future for new roles!</p>
          </div>
        </header>

        <div className="container mx-auto px-16 py-32">
          <div className="max-w-4xl mx-auto">
            <section className="mb-48">
              <h2 className="text-h2 mb-24">Why Work at Exercism?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-32">
                <div className="bg-backgroundColorA rounded-8 p-24">
                  <h3 className="text-h3 mb-16">Mission-Driven</h3>
                  <p className="text-16 leading-150 text-textColor2">
                    We're passionate about making programming education accessible to everyone, 
                    regardless of their background or financial situation.
                  </p>
                </div>

                <div className="bg-backgroundColorA rounded-8 p-24">
                  <h3 className="text-h3 mb-16">Remote-First</h3>
                  <p className="text-16 leading-150 text-textColor2">
                    Our team is distributed globally, and we've built our culture around 
                    asynchronous communication and flexible working arrangements.
                  </p>
                </div>

                <div className="bg-backgroundColorA rounded-8 p-24">
                  <h3 className="text-h3 mb-16">Impact at Scale</h3>
                  <p className="text-16 leading-150 text-textColor2">
                    Your work will directly impact millions of developers worldwide, 
                    helping them improve their skills and advance their careers.
                  </p>
                </div>

                <div className="bg-backgroundColorA rounded-8 p-24">
                  <h3 className="text-h3 mb-16">Learning Culture</h3>
                  <p className="text-16 leading-150 text-textColor2">
                    We encourage continuous learning and provide opportunities to work 
                    with cutting-edge technologies and methodologies.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-48">
              <h2 className="text-h2 mb-24">What We Look For</h2>
              <div className="bg-backgroundColorA rounded-8 p-32">
                <ul className="space-y-16 text-16 leading-150">
                  <li className="flex items-start">
                    <span className="text-20 mr-12">🎯</span>
                    <div>
                      <strong>Passion for Education:</strong> You believe in the power of education 
                      to change lives and are excited about making programming more accessible.
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-20 mr-12">🤝</span>
                    <div>
                      <strong>Collaborative Spirit:</strong> You work well with others, communicate 
                      clearly, and contribute to a positive team culture.
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-20 mr-12">🚀</span>
                    <div>
                      <strong>Growth Mindset:</strong> You're always learning, adapting to new 
                      challenges, and helping others grow alongside you.
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-20 mr-12">💡</span>
                    <div>
                      <strong>Problem Solver:</strong> You approach challenges with creativity 
                      and persistence, finding elegant solutions to complex problems.
                    </div>
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-48">
              <h2 className="text-h2 mb-24">Stay Updated</h2>
              <div className="bg-backgroundColorA rounded-8 p-32 text-center">
                <p className="text-18 leading-150 text-textColor2 mb-24">
                  While we're not actively hiring right now, we're always growing and 
                  looking for talented people to join our mission.
                </p>
                <p className="text-16 leading-150 text-textColor2 mb-32">
                  Follow us on social media or check back here regularly for updates 
                  on new opportunities.
                </p>
                <div className="flex flex-col sm:flex-row gap-16 justify-center">
                  <a 
                    href="https://github.com/exercism" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-24 py-12 bg-prominentLinkColor text-white rounded-8 font-medium hover:bg-prominentLinkColorHover transition-colors"
                  >
                    Follow on GitHub
                  </a>
                  <a 
                    href="https://twitter.com/exercism_io" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-24 py-12 border border-borderColor2 text-textColor1 rounded-8 font-medium hover:bg-backgroundColorA transition-colors"
                  >
                    Follow on Twitter
                  </a>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-h2 mb-24">Contributing</h2>
              <div className="bg-backgroundColorA rounded-8 p-32">
                <p className="text-16 leading-150 text-textColor2 mb-24">
                  Even if we're not hiring, there are many ways to get involved with Exercism 
                  and make a meaningful contribution to programming education.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-24">
                  <div className="text-center">
                    <GraphicalIcon icon="mentoring" className="mx-auto mb-12" />
                    <h4 className="text-h5 mb-8">Become a Mentor</h4>
                    <p className="text-14 text-textColor6">
                      Help students improve their code through personalized feedback.
                    </p>
                  </div>
                  <div className="text-center">
                    <GraphicalIcon icon="maintaining" className="mx-auto mb-12" />
                    <h4 className="text-h5 mb-8">Maintain a Track</h4>
                    <p className="text-14 text-textColor6">
                      Help maintain exercises and content for your favorite language.
                    </p>
                  </div>
                  <div className="text-center">
                    <GraphicalIcon icon="authoring" className="mx-auto mb-12" />
                    <h4 className="text-h5 mb-8">Contribute Code</h4>
                    <p className="text-14 text-textColor6">
                      Contribute to our open-source platform and tooling.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}