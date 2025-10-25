import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { AboutNav } from '@/components/about'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'

export const metadata: Metadata = {
  title: 'Our Team - About Exercism',
  description: 'Meet the team behind Exercism - built by people worldwide who are passionate about programming education.',
}

export default function TeamPage() {
  return (
    <div className="min-h-screen bg-white">
      <AboutNav activeTab="team" />
      
      <div id="page-team">
        <header className="pb-32 md:pb-64">
          <div className="lg-container flex flex-col items-center c-shapes c-shapes-1">
            <div className="flex items-center mb-16 md:mb-20">
              <GraphicalIcon icon="contributing-header" className="icon mr-12" />
              <h1 className="text-h3 text-center">Our Team</h1>
            </div>
            <h2 className="text-h0 mb-20 text-center">Built by people worldwide</h2>
          </div>
          <div className="md-container flex flex-col items-center">
            <div className="flex flex-col-reverse md:flex-col items-center">
              <div className="info md:mb-32">
                <div className="stats flex items-center flex-col md:flex-row">
                  <div className="stat mb-8 md:mb-0">6,000+ contributors</div>
                  <div className="divider">&middot;</div>
                  <div className="stat mb-8 md:mb-0">231 countries</div>
                  <div className="divider">&middot;</div>
                  <div className="stat">287 GitHub repos</div>
                </div>
              </div>

              <div className="flex flex-col items-center mb-28 md:mb-0">
                <hr className="c-divider mb-32" />
                <Image 
                  src="/images/world-map.png" 
                  alt="World map showing global contributors" 
                  width={800}
                  height={400}
                  className="map w-100" 
                />
              </div>
            </div>
          </div>
        </header>

        <article>
          <div className="md-container">
            <div className="info-box bg-evenLighterBlue px-32 md:px-48 py-24 md:py-40 flex flex-col md:flex-row md:items-center mb-64">
              <div className="info">
                <h2 className="text-h2 mb-12">Community Driven</h2>
                <p className="text-p-xlarge mr-40">
                  Exercism is built and maintained by thousands of contributors who are passionate about programming education and helping others learn.
                </p>
              </div>
              <GraphicalIcon 
                icon="community-solutions" 
                category="graphics" 
                className="mt-32 md:mt-0 self-center md:ml-auto" 
              />
            </div>

            <section className="leadership-team mb-40">
              <header className="mb-32">
                <GraphicalIcon icon="leadership-team" />
                <h2 className="text-h3 mb-12">Leadership Team</h2>
                <p className="text-p-large">
                  Our leadership team guides the strategic direction of Exercism and ensures we stay true to our mission.
                </p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-32">
                <div className="person">
                  <Image 
                    src="/images/team/katrina.jpg" 
                    alt="Katrina Owen" 
                    width={120}
                    height={120}
                    className="avatar rounded-full mb-16" 
                  />
                  <div className="details">
                    <h3>
                      <Link href="https://exercism.github.io/kytrinyx/" target="_blank" rel="noreferrer">
                        Katrina Owen
                      </Link>
                    </h3>
                    <div className="handle">@kytrinyx</div>
                    <p className="mb-16">
                      Katrina accidentally became a developer while pursuing a degree in molecular biology. 
                      She began nitpicking code back in 2006 while volunteering at JavaRanch, and got hooked. 
                      She&apos;s the author of{' '}
                      <Link href="https://sandimetz.com/99bottles" className="text-linkColor underline">
                        99 Bottles of OOP
                      </Link>
                      {' '}with Sandi Metz.
                    </p>
                    <ul className="links flex gap-16">
                      <li>
                        <Link href="https://exercism.github.io/kytrinyx/" target="_blank" rel="noreferrer" className="flex items-center">
                          <GraphicalIcon icon="link" className="mr-4" />
                          <span>Personal site</span>
                        </Link>
                      </li>
                      <li>
                        <Link href="https://github.com/kytrinyx" target="_blank" rel="noreferrer" className="flex items-center">
                          <GraphicalIcon icon="external-site-github" className="mr-4" />
                          <span>GitHub</span>
                        </Link>
                      </li>
                      <li>
                        <Link href="https://twitter.com/kytrinyx" target="_blank" rel="noreferrer" className="flex items-center">
                          <GraphicalIcon icon="external-site-twitter" className="mr-4" />
                          <span>Twitter</span>
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="person">
                  <Image 
                    src="/images/team/jeremy-walker.jpg" 
                    alt="Jeremy Walker" 
                    width={120}
                    height={120}
                    className="avatar rounded-full mb-16" 
                  />
                  <div className="details">
                    <h3>
                      <Link href="https://ihid.info" target="_blank" rel="noreferrer">
                        Jeremy Walker
                      </Link>
                    </h3>
                    <div className="handle">@iHiD</div>
                    <p className="mb-16">
                      Jeremy is a Ruby and Go developer who loves building things that help people learn and grow. 
                      He&apos;s also the founder of{' '}
                      <Link href="https://kaido.org" className="text-linkColor underline">
                        Kaido
                      </Link>
                      , a platform for mental health and wellbeing.
                    </p>
                    <ul className="links flex gap-16">
                      <li>
                        <Link href="https://ihid.info" target="_blank" rel="noreferrer" className="flex items-center">
                          <GraphicalIcon icon="link" className="mr-4" />
                          <span>Personal site</span>
                        </Link>
                      </li>
                      <li>
                        <Link href="https://github.com/iHiD" target="_blank" rel="noreferrer" className="flex items-center">
                          <GraphicalIcon icon="external-site-github" className="mr-4" />
                          <span>GitHub</span>
                        </Link>
                      </li>
                      <li>
                        <Link href="https://twitter.com/iHiD" target="_blank" rel="noreferrer" className="flex items-center">
                          <GraphicalIcon icon="external-site-twitter" className="mr-4" />
                          <span>Twitter</span>
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section className="staff-team mb-40">
              <header className="mb-32">
                <GraphicalIcon icon="staff-team" />
                <h2 className="text-h3 mb-12">Staff Team</h2>
                <p className="text-p-large">
                  Our dedicated staff members work full-time to maintain and improve Exercism for everyone.
                </p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-32">
                <div className="person">
                  <Image 
                    src="/images/team/erik.jpg" 
                    alt="Erik Schierboom" 
                    width={120}
                    height={120}
                    className="avatar rounded-full mb-16" 
                  />
                  <div className="details">
                    <h3>
                      <Link href="https://twitter.com/ErikSchierboom" target="_blank" rel="noreferrer">
                        Erik Schierboom
                      </Link>
                    </h3>
                    <div className="handle">@erikschierboom</div>
                    <p className="mb-16">
                      Erik is a developer with a passion for learning new programming languages and paradigms. 
                      He maintains several tracks and helps coordinate our community efforts.
                    </p>
                    <ul className="links flex gap-16">
                      <li>
                        <Link href="https://www.erikschierboom.com" target="_blank" rel="noreferrer" className="flex items-center">
                          <GraphicalIcon icon="link" className="mr-4" />
                          <span>Personal site</span>
                        </Link>
                      </li>
                      <li>
                        <Link href="https://github.com/erikschierboom" target="_blank" rel="noreferrer" className="flex items-center">
                          <GraphicalIcon icon="external-site-github" className="mr-4" />
                          <span>GitHub</span>
                        </Link>
                      </li>
                      <li>
                        <Link href="https://twitter.com/erikschierboom" target="_blank" rel="noreferrer" className="flex items-center">
                          <GraphicalIcon icon="external-site-twitter" className="mr-4" />
                          <span>Twitter</span>
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="person">
                  <Image 
                    src="/images/team/aron.jpg" 
                    alt="Áron Demeter" 
                    width={120}
                    height={120}
                    className="avatar rounded-full mb-16" 
                  />
                  <div className="details">
                    <h3>
                      <Link href="https://github.com/dem4ron" target="_blank" rel="noreferrer">
                        Áron Demeter
                      </Link>
                    </h3>
                    <div className="handle">@dem4ron</div>
                    <p className="mb-16">
                      Áron is a full-stack developer who focuses on improving the user experience and 
                      building new features that make learning programming more accessible and enjoyable.
                    </p>
                    <ul className="links flex gap-16">
                      <li>
                        <Link href="https://github.com/dem4ron" target="_blank" rel="noreferrer" className="flex items-center">
                          <GraphicalIcon icon="external-site-github" className="mr-4" />
                          <span>GitHub</span>
                        </Link>
                      </li>
                      <li>
                        <Link href="https://twitter.com/d4ron1" target="_blank" rel="noreferrer" className="flex items-center">
                          <GraphicalIcon icon="external-site-twitter" className="mr-4" />
                          <span>Twitter</span>
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section className="alumni-team mb-64">
              <header className="mb-32">
                <GraphicalIcon icon="staff-team" />
                <h2 className="text-h3 mb-12">Alumni Team</h2>
                <p className="text-p-large">
                  These amazing people have contributed significantly to Exercism&apos;s development and growth.
                </p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-32">
                <div className="person">
                  <Image 
                    src="/images/team/nicole.jpg" 
                    alt="Nicole Chalmers" 
                    width={120}
                    height={120}
                    className="avatar rounded-full mb-16" 
                  />
                  <div className="details">
                    <h3>Nicole Chalmers</h3>
                    <p>
                      Nicole was instrumental in building Exercism&apos;s community and mentoring systems. 
                      She&apos;s now working on{' '}
                      <Link href="https://kaido.org" className="text-linkColor underline">
                        Kaido
                      </Link>
                      , focusing on mental health and wellbeing.
                    </p>
                  </div>
                </div>

                <div className="person">
                  <Image 
                    src="/images/team/charles.jpg" 
                    alt="Charles Care" 
                    width={120}
                    height={120}
                    className="avatar rounded-full mb-16" 
                  />
                  <div className="details">
                    <h3>Charles Care</h3>
                    <p>
                      Charles helped design and implement many of Exercism&apos;s core features, 
                      including the exercise delivery system and automated testing infrastructure.
                    </p>
                  </div>
                </div>

                <div className="person">
                  <Image 
                    src="/images/team/karlo.jpg" 
                    alt="Karlo Soriano" 
                    width={120}
                    height={120}
                    className="avatar rounded-full mb-16" 
                  />
                  <div className="details">
                    <h3>Karlo Soriano</h3>
                    <p>
                      Karlo contributed to the platform&apos;s user interface and experience design, 
                      making Exercism more intuitive and accessible for learners worldwide.
                    </p>
                  </div>
                </div>

                <div className="person">
                  <Image 
                    src="/images/team/taiyab.jpg" 
                    alt="Taiyab Raja" 
                    width={120}
                    height={120}
                    className="avatar rounded-full mb-16" 
                  />
                  <div className="details">
                    <h3>Taiyab Raja</h3>
                    <p>
                      Taiyab worked on improving the platform&apos;s performance and scalability, 
                      ensuring Exercism can serve millions of learners effectively.
                    </p>
                  </div>
                </div>

                <div className="person">
                  <Image 
                    src="/images/team/loretta.jpg" 
                    alt="Loretta Murray" 
                    width={120}
                    height={120}
                    className="avatar rounded-full mb-16" 
                  />
                  <div className="details">
                    <h3>Loretta Murray</h3>
                    <p>
                      Loretta helped establish Exercism&apos;s content strategy and community guidelines, 
                      fostering a welcoming environment for learners of all levels.
                    </p>
                  </div>
                </div>

                <div className="person">
                  <Image 
                    src="/images/team/jonathan.jpg" 
                    alt="Jonathan Middleton" 
                    width={120}
                    height={120}
                    className="avatar rounded-full mb-16" 
                  />
                  <div className="details">
                    <h3>Jonathan Middleton</h3>
                    <p>
                      Jonathan contributed to the development of exercise content and helped 
                      establish quality standards for programming challenges across multiple languages.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-56">
              <div className="community-team">
                <GraphicalIcon icon="maintaining" />
                <h3>Track Maintainers</h3>
                <p className="text-p-large">
                  Passionate developers who maintain our 60+ programming language tracks, 
                  ensuring high-quality exercises and learning experiences.
                </p>
                <Link href="/contributing/contributors?category=maintaining" className="c-prominent-link">
                  <span>Meet our maintainers</span>
                  <GraphicalIcon icon="arrow-right" />
                </Link>
              </div>

              <div className="community-team">
                <GraphicalIcon icon="mentoring" />
                <h3>Mentors</h3>
                <p className="text-p-large">
                  Experienced developers who provide personalized feedback and guidance 
                  to help students improve their coding skills.
                </p>
                <Link href="/contributing/contributors?category=mentoring" className="c-prominent-link">
                  <span>Meet our mentors</span>
                  <GraphicalIcon icon="arrow-right" />
                </Link>
              </div>

              <div className="community-team">
                <GraphicalIcon icon="authoring" />
                <h3>Contributors</h3>
                <p className="text-p-large">
                  Volunteers who contribute exercises, documentation, tooling, and other 
                  improvements that make Exercism better for everyone.
                </p>
                <Link href="/contributing/contributors?category=building" className="c-prominent-link">
                  <span>Meet our contributors</span>
                  <GraphicalIcon icon="arrow-right" />
                </Link>
              </div>
            </section>
          </div>
        </article>
      </div>
    </div>
  )
}