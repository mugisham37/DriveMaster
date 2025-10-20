import Link from 'next/link'
import { BootcampData } from '@/lib/api/bootcamp'

export function FAQSection({ hasDiscount, countryName, discountPercentage, fullCompletePrice }: BootcampData) {
  return (
    <section id="faqs">
      <div className="background" />
      <div className="md-container relative">
        <h2>Frequently Asked Questions</h2>
        <p className="intro">
          These are the questions we get asked the most. Your question not answered here?
          <Link href="mailto:bootcamp@exercism.org"> Ping us an email!</Link>
        </p>

        <div className="faq">
          <h4>When does the Bootcamp start?</h4>
          <p>The first session will be on January 11th 2025 at 18:00 UTC.</p>
        </div>
        
        <div className="faq">
          <h4>How much time will I need to spend each week on the bootcamp?</h4>
          <p>
            We&apos;re aiming for about 8 hours per week (See the &quot;What your week will look like&quot; for more details). 
            If you can put in an hour per day, that will be enough for you to get through the main work. 
            If you can invest an extra few hours per week, you&apos;ll be able to also complete any more advanced exercises.
          </p>
        </div>
        
        <div className="faq">
          <h4>Can I join Part 1 now and then sign up for the rest of the course later?</h4>
          <p>
            Yes, you can. But it will be more expensive to sign up for Part 2 later than it is to sign up for the full course now. 
            We recommend signing up for the full course now if you&apos;re confident you want to learn web development.
          </p>
        </div>
        
        <div className="faq">
          <h4>Are there group activities and do I have to take part?</h4>
          <p>
            There are no formal group activities.
            However, we encourage everyone to share their journey and explore programming together in our Discord server.
            Exploring other people&apos;s code is one of the best ways to improve your programming skills.
            You can choose to opt-out of the community aspects if you prefer.
          </p>
        </div>
        
        <div className="faq">
          <h4>What specific programming language will be taught in Part 1?</h4>
          <p>
            We&apos;ll be teaching you a special beginner-friendly version of JavaScript.
            We&apos;ve designed it specifically to ensure you don&apos;t get bogged down by syntax or language oddities.
            The focus is on your learning how to code and then being able to apply that to any language, 
            but you&apos;ll also get a big head start on JavaScript preparing you for Part 2.
          </p>
        </div>
        
        <div className="faq">
          <h4>Is there a limit to the number of students who can join the live sessions?</h4>
          <p>
            No, the sessions will be streamed online and everyone will be able to ask questions and participate. 
            You can watch them back at any time in the future.
          </p>
        </div>
        
        <div className="faq">
          <h4>Are the exercises graded or just for practice? Is there any form of assessment?</h4>
          <p>
            Most exercises can be completed by reaching a certain objective. However, they are not graded and your code isn&apos;t assessed or marked. 
            We will explore some (anonymised) code in the weekly sessions and discuss how it could be improved, 
            but our philosophy is that you should be in the trenches coding, not worrying about passing tests.
          </p>
        </div>
        
        <div className="faq">
          <h4>Will I be job-ready by the end of the bootcamp?</h4>
          <p>
            A few exceptional students might be in a position where they&apos;re confident applying for junior jobs. 
            But for most people, we&apos;ll recommend spending a few more months honing your skills before entering your first programming job. 
            Job hunting can be tough, and the more refined your skills, the more likely you&apos;ll be to get that first job!
          </p>
        </div>
        
        {hasDiscount ? (
          <div className="faq">
            <h4>How does the discount for {countryName} work?</h4>
            <p>
              We understand that ${fullCompletePrice} is a significant amount of money in countries with currencies that are weak against the dollar. 
              So we&apos;re offering a {discountPercentage}% discount to people in {countryName} to ensure they can take part.
            </p>
            <p>Simply click the &quot;Enroll now&quot; button and the discount will be automatically applied at checkout.</p>
          </div>
        ) : (
          <div className="faq">
            <h4>Do you offer any discounts for students, unemployed or people in countries with weak currencies?</h4>
            <p>
              Yes, we do. We want to ensure as many people can benefit from this bootcamp as possible. 
              Email{' '}
              <Link href="mailto:bootcamp@exercism.org" className="font-semibold text-[blue]">
                bootcamp@exercism.org
              </Link>
              , tell me your situation, and I&apos;ll see what we can do for you.
            </p>
          </div>
        )}
        
        <div className="faq">
          <h4>I&apos;ve signed up but not received anything.</h4>
          <p>
            The bootcamp starts on January 11th 2025, so you won&apos;t have access to anything until then. 
            However, you should receive emails giving you more information. If you don&apos;t receive those, please email{' '}
            <Link href="mailto:bootcamp@exercism.org" className="font-semibold text-[blue]">
              bootcamp@exercism.org
            </Link>
            {' '}and we&apos;ll check everything for you.
          </p>
        </div>
      </div>
    </section>
  )
}