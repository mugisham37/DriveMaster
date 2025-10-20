import Image from 'next/image'

export function WelcomeSection() {
  return (
    <section className="welcome">
      <div className="md-container">
        <div className="flex flex-col items-center gap-40">
          <div className="flex flex-col items-stretch">
            <h2 className="mb-12">
              Are you ready to
              <span className="font-semibold intro-aspiring-coder rough-highlight"> learn to code?</span>
            </h2>
            <p>
              Maybe you&apos;ve tried learning from some other websites or videos but it&apos;s not sticking? (it&apos;s them, not you!)
              Or maybe you&apos;re brand new to this?
            </p>
            <p>
              Are you looking for something
              <strong className="font-regular intro-fun-and-creative rough-highlight"> fun and creative</strong>
              {' '}where you
              <strong className="font-regular intro-learn-by-doing rough-highlight"> learn by making things?</strong>
              {' '}With a world-class instructor, live teaching sessions and support when you need it?
            </p>
            <p className="font-regular mb-12">
              Well then, this might just be
              <strong className="font-medium">
                <span className="intro-you"> the course for you!</span>
              </strong>
            </p>
            <div className="flex flex-col items-center mb-12">
              <Image 
                src="/assets/bootcamp/arrow-1.svg" 
                alt=""
                width={100}
                height={168}
                className="h-[168px]" 
              />
            </div>
          </div>
        </div>

        <h3>
          Hi there!
          <span className="waving-hand">👋</span>
          I&apos;m Jeremy, and I&apos;ve helped over
          <div className="inline rough-highlight">two million people</div>
          {' '}level up their coding skills.
        </h3>
        
        <p>But over the last few years, I&apos;ve seen a really worrying trend...</p>
        
        <p>
          More and more people are trying to learn to code (🥳) but they seem to be
          <strong> struggling more than ever (😢).</strong>
          {' '}And they&apos;re struggling with things that should be pretty straightforward once you&apos;ve been learning for a while.
          People just don&apos;t seem to be getting the fundamentals.
        </p>

        <p>So I started reading around to see if I could work out what was going on, and found a crazy statistic.</p>
        
        <h3>
          <span className="inline rough-highlight">96% of people who try to learn to code give up</span>
          {' '}🤯
        </h3>

        <p>How could it be that so many people were trying to learn to code, but so few were actually succeeding?</p>
        <p>I went investigating… 🕵️</p>
        
        <p>
          I watched the
          <strong> most popular YouTube videos (🥱),</strong>
          {' '}tried the &quot;best&quot;
          <strong> online courses (😐),</strong>
          {' '}and even paid my friends to try to learn so I could see what happened (a mix of 😭😠🤬🙅‍♀️).
        </p>

        <p>I dug into formal research, spoke to my friends in education, and pretty quickly came to a simple conclusion...</p>

        <h3>
          <span className="inline rough-highlight">The way people are being taught to code is causing them to fail!</span>
        </h3>
        
        <p>
          I started coding when I was 8.
          Back then, YouTube didn&apos;t exist. There weren&apos;t any &quot;learn to code&quot; websites. I didn&apos;t even have the internet.
          There was basically only one way to learn.
          <strong> Make stuff. Lots of stuff!</strong>
        </p>

        <div className="sm:float-right mt-20 sm:ml-24 sm:mb-24 xl:mr-[-100px] mr-0">
          <div 
            className="border-white border-[8px] rounded-[5px] lg:w-[300px] sm:w-[220px] w-full"
            style={{boxShadow: '0 0 10px 0 rgba(0,0,0,0.5)'}}
          >
            <Image 
              src="/assets/bootcamp/with-rhodri.jpg" 
              alt="Jeremy and Rhodri in 1998"
              width={300}
              height={200}
              className="w-[100%] border-[#aaa] border-[1px] rounded-[1px]" 
            />
            <div className="text-14 text-center font-normal pt-8 px-8 leading-[140%]">
              <span className="lg:hidden inline">1998: Me making the first website I ever got paid for.</span>
              <span className="lg:inline hidden">1998: Me and Rhodri making the first website we ever got paid for.</span>
            </div>
          </div>
        </div>

        {/* Continue with rest of the content... */}
        <p className="mt-16">
          And make stuff I did! I started making games and then graduated to making little bots to play against. And as I grew older I made websites for me and my friends, and
          <span className="sm:hidden inline"> eventually for customers.</span>
          <span className="sm:inline hidden relative">
            <span id="eventually-underline" className="rough-underline whitespace-nowrap">
              eventually for customers.
            </span>
          </span>
        </p>

        <p>I created, I played, I experimented. I had fun!</p>
        
        <p>
          And through this, I got really good.
          <strong> I learned the coder mindset,</strong>
          {' '}and I laid the foundations that I&apos;ve built my whole career on.
        </p>
        
        <p>
          <strong className="rough-highlight">But that&apos;s not how these modern courses teach.</strong>
          {' '}Giving you a space to practice and play and experiment is hard.
          It&apos;s much easier to just give you a video to watch, a quiz to take, and a certificate to print out.
        </p>
        
        <p>
          But you won&apos;t learn that way.
          You&apos;ll be
          <strong> bored, frustrated,</strong>
          {' '}and like most other people, you&apos;ll
          <strong> probably quit 😞😡</strong>
        </p>

        <h3>
          <span className="rough-highlight">If you want to get good, master the basics</span>
        </h3>

        <p>
          The best coders
          <strong> are not</strong>
          {' '}the ones who know the most.
        </p>
        
        <p>
          The best coders are the ones who have
          <strong className="rough-highlight"> gained a total mastery of the basics.</strong>
          {' '}Once you&apos;ve got the basics down, everything will become easy.
          You can go and learn whatever you want or need.
        </p>
        
        <p>
          And the way to master the basics? Practice, practice, practice.
        </p>
        
        <p>
          Take on different challenges. Solve different problems. And have fun learning your craft!
        </p>
        
        <h3>
          <span className="rough-highlight">So that&apos;s what we&apos;re doing...</span>
        </h3>

        <p>
          For the last year, we&apos;ve been building a new type of course.
          It&apos;s designed for
          <strong> total beginners</strong>
          {' '}and it&apos;s entirely focused on
          <strong> learning by doing.</strong>
          {' '}You&apos;ll be coding from day one, and
          <strong className="font-semibold rough-highlight"> you&apos;ll be coding a lot.</strong>
        </p>
        
        <p>
          And once (just once!) we&apos;re going to run it as an
          <strong> interactive bootcamp,</strong>
          {' '}where
          <strong> I&apos;ll be there to guide you.</strong>
          {' '}I&apos;ll be there to explore ideas with you, help you if you get stuck, and have fun with you! ✨
        </p>
        
        <p>
          For 3 months, I&apos;ll teach you the fundamentals of programming and
          <strong> how to think like a coder.</strong>
          {' '}Then for those who want to go into web development, I&apos;ll spend another 3 months teaching you how to build beautiful, interactive websites.
        </p>
        
        <p>
          If that sounds exciting, then
          <strong> I&apos;d love for you to join us! 💙</strong>
        </p>
      </div>
    </section>
  )
}