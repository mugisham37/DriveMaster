import Image from 'next/image'

export function BootcampDetailsSection() {
  return (
    <section id="bootcamp">
      <div className="lg-container">
        <div className="container syllabus">
          <div className="tag">How it works</div>
          <h2>
            <strong>Exercism</strong>
            {' '}Bootcamp
          </h2>
          <p className="intro mb-24 text-balance">
            The bootcamp is split into two halves.
            Depending on your goals, you can take part in either Part 1 or the Full Course.
          </p>

          <div className="sections">
            <div className="section mb-32">
              <div className="lhs">
                <h3 className="mb-8">
                  Learn to code 🧑‍🔬
                  <div className="bubble">Part 1</div>
                </h3>

                <div className="part-intro mb-20">
                  From January to March, we&apos;ll focus on
                  <span className="rough-highlight font-medium"> building rock solid foundations.</span>
                  {' '}We&apos;ll cover all the core concepts in programming and give you tons of exercises and projects to practice with.
                </div>

                <ul>
                  <li>
                    <Image src="/assets/bootcamp/understanding.svg" alt="" width={40} height={40} />
                    <div className="text">
                      <strong>Build a solid understanding</strong>
                      {' '}of core programming principles, including flow control, conditionals, data types, functions, and much more, using a beginner-friendly version of JavaScript.
                    </div>
                  </li>
                  <li>
                    <Image src="/assets/bootcamp/confidence.svg" alt="" width={40} height={40} />
                    <div className="text">
                      <strong>Gain the confidence</strong>
                      {' '}to put your knowledge into practice, being able to solve a wide variety of problems, using the right concept at the right time.
                    </div>
                  </li>
                  <li>
                    <Image src="/assets/bootcamp/coders-mind.svg" alt="" width={40} height={40} />
                    <div className="text">
                      <strong>Develop the Coder&apos;s Mind.</strong>
                      {' '}You&apos;ll notice that your critical thinking, problem solving, and logic skills are all improving.
                    </div>
                  </li>
                </ul>
              </div>
              <div className="rhs">
                <div className="dates h3-sideheading relative">
                  <Image src="/assets/bootcamp/calendar.svg" alt="" width={24} height={24} />
                  January - March 2025
                </div>
                <Image 
                  src="/assets/bootcamp/part-1.png" 
                  alt="Part 1 illustration"
                  width={350}
                  height={300}
                  className="w-[350px] -mr-32 -mt-[60px]" 
                />
              </div>
            </div>

            <div className="section relative">
              <div className="lhs">
                <h3 className="mb-8">
                  Front-End Web Development 🧑‍💻
                  <div className="bubble">Part 2</div>
                </h3>
                <div className="part-intro">
                  From April to June, we&apos;ll build on the fundamentals and look at
                  <span className="rough-highlight font-medium"> front-end web development.</span>
                  {' '}You&apos;ll gain the skills you need to build beautiful, interactive websites and kickstart your career.
                </div>

                <ul>
                  <li>
                    <Image src="/assets/bootcamp/javascript.svg" alt="" width={40} height={40} />
                    <div className="text">
                      <strong>Get comfortable with JavaScript.</strong>
                      {' '}We&apos;ll build on your knowledge from Part 1 by looking JavaScript programming techniques essential for web development.
                    </div>
                  </li>
                  <li>
                    <Image src="/assets/bootcamp/html.svg" alt="" width={40} height={40} />
                    <div className="text">
                      <strong>Learn HTML and CSS.</strong>
                      {' '}These two languages are the other fundamentals of web development. You&apos;ll learn both and use them to create beautiful websites.
                    </div>
                  </li>
                  <li>
                    <Image src="/assets/bootcamp/work-locally.svg" alt="" width={40} height={40} />
                    <div className="text">
                      <strong>Learn Visual Studio Code and Git.</strong>
                      {' '}Master these important tools, and how to use them to make your life easier.
                    </div>
                  </li>
                  <li>
                    <Image src="/assets/bootcamp/portfolio.svg" alt="" width={40} height={40} />
                    <div className="text">
                      <strong>Build a portfolio of projects.</strong>
                      {' '}Create projects to showcase to potential employers while practicing your skills.
                    </div>
                  </li>
                </ul>
              </div>
              <div className="rhs">
                <div className="dates h3-sideheading z-overlay">
                  <Image src="/assets/bootcamp/calendar.svg" alt="" width={24} height={24} />
                  April - June 2025
                </div>
                <Image 
                  src="/assets/bootcamp/part-2.png" 
                  alt="Part 2 illustration"
                  width={350}
                  height={300}
                  className="w-[350px] -mr-32 -mt-[60px]" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Schedule subsection */}
        <div id="schedule-subsection" className="subcontainer relative">
          <div className="flex flex-col mb-8 lg:flex-row">
            <h3 className="mr-auto">
              What your week will look like 🔎
            </h3>
            <div className="h3-sideheading flex mt-8 flex-wrap">
              <div className="flex items-center gap-8">
                <Image src="/assets/bootcamp/teacher.svg" alt="" width={24} height={24} />
                <div className="mr-20 whitespace-nowrap">3 hours teaching</div>
              </div>
              <div className="flex items-center gap-8">
                <Image src="/assets/bootcamp/study.svg" alt="" width={24} height={24} />
                <div className="mr-20 whitespace-nowrap">5 hours project work</div>
              </div>
            </div>
          </div>
          <p className="mb-12">
            Each week we&apos;ll have a mix of live sessions and fun projects for you to work on!
          </p>

          <ul>
            <li>
              <Image src="/assets/bootcamp/teacher-illustration.svg" alt="" width={80} height={80} />
              <h4>2x 90min teaching sessions 🧑‍🏫</h4>
              <p>
                In these core sessions, I&apos;ll explain the next core programming concepts, and
                we&apos;ll solve a coding challenge together. Join live to participate or watch back on demand.
              </p>
            </li>
            <li>
              <Image src="/assets/bootcamp/coding-illustration.svg" alt="" width={80} height={80} />
              <div className="text">
                <h4>5+ hours of having fun coding 🧑‍💻</h4>
                <p>
                  The most important part of the bootcamp!
                  The more you code, the better your brain starts to piece everything together.
                  If you get too busy in a week to do everything, this is the bit to focus on!
                </p>
              </div>
            </li>
            <li>
              <Image src="/assets/bootcamp/unstuck-illustration.svg" alt="" width={80} height={80} />
              <div className="text">
                <h4>1x 90min &quot;get help&quot; session 💊</h4>
                <p>
                  No-one&apos;s getting stuck in this bootcamp!
                  Each week we&apos;ll dedicate time to working through people&apos;s problems together.
                  If you can&apos;t attend, message me where you&apos;re stuck and then watch back later!
                </p>
              </div>
            </li>
            <li>
              <Image 
                src="/assets/bootcamp/discussion-illustration.svg" 
                alt="" 
                width={80} 
                height={80}
                className="scale-x-[-1]" 
              />
              <div className="text">
                <h4>1 hour of discussing code 🗣️</h4>
                <p>
                  Discussing code is another great way to reinforce your skills. Invest some time into answering questions and helping other students get unstuck, and you&apos;ll quickly level up your own knowledge.
                </p>
              </div>
            </li>
          </ul>
        </div>

        {/* Portfolio subsection */}
        <div id="portfolio-subsection" className="subcontainer relative">
          <div className="flex flex-col mb-8 lg:flex-row">
            <h3 className="mr-auto">
              A few things we&apos;ll build together ✨
            </h3>
            <div className="h3-sideheading">
              Build your portfolio during the bootcamp!
            </div>
          </div>
          <p className="mb-16">
            Our focus from day one is to get you building fun things. You&apos;ll make classic games (and bots to beat them!), interesting websites, and integrate with APIs like ChatGPT to make cutting edge projects!
          </p>
          
          <div className="projects">
            <div className="project snake">
              <div className="img" />
              <div className="title">
                Recreate the classic
                <strong> Nokia Snake</strong>
                {' '}game
              </div>
            </div>
            <div className="project tetris">
              <div className="img" />
              <div className="title">
                Create a
                <strong> Tetris</strong>
                {' '}clone. A tricky one!
              </div>
            </div>
            <div className="project breakout">
              <div className="img" />
              <div className="title">
                Recreate my childhood favourite:
                <strong> Breakout</strong>
              </div>
            </div>
            <div className="project tic-tac-toe">
              <div className="img" />
              <div className="title">
                Create your first bot to beat
                <strong> Tic Tac Toe</strong>
              </div>
            </div>
            <div className="project weather">
              <div className="img" />
              <div className="title">
                Design a responsive
                <strong> Weather App</strong>
              </div>
            </div>
            <div className="project story">
              <div className="img" />
              <div className="title">
                Create a story along with
                <strong> ChatGPT</strong>
              </div>
            </div>
            <div className="project positive">
              <div className="img" />
              <div className="title">
                Calm your world with a
                <strong> Positive news</strong>
                {' '}filter
              </div>
            </div>
            <div className="project piano">
              <div className="img" />
              <div className="title">
                Get musical with a
                <strong> Piano Composer</strong>
                {' '}app
              </div>
            </div>
          </div>
        </div>

        {/* Certificate subsection */}
        <div className="subcontainer">
          <div id="certificate-subsection">
            <div className="flex lg:flex-row flex-col items-center gap-0">
              <div className="lhs flex flex-col items-start">
                <div className="bubble">Celebrate your new skills!</div>
                <h3 className="mb-8">Get a verified certificate</h3>
                <p className="text-16 mb-12">
                  At the end of the Bootcamp, we&apos;ll issue you with an official certificate to recognise your participation and completion of the course.
                </p>
                <p className="text-16">
                  Show off your skills on your resume and in the Certifications section of your LinkedIn profile.
                </p>
              </div>
              
              <Image 
                src="/assets/bootcamp/certificate-arrow.png" 
                alt=""
                width={100}
                height={100}
                className="w-[100px] self-middle mt-[100px] mb-10 mr-40 my-10 lg:block hidden" 
              />
              
              <div className="certificate flex-shrink-0 mt-24 lg:mt-0">
                <Image 
                  src="/assets/bootcamp/certificate.png" 
                  alt="Certificate"
                  width={350}
                  height={250}
                  className="lg:w-[350px] w-100 rounded-[5px]"
                  style={{boxShadow: '0 0 20px rgba(0,0,0,0.4)'}}
                />
              </div>
            </div>
            
            <div className="linkedin">
              <Image src="/assets/bootcamp/linkedin.png" alt="LinkedIn" width={400} height={200} />
              <span>Share your certificate in your network</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}