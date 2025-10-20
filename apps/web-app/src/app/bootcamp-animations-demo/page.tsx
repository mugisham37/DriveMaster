import { Metadata } from 'next'
import { 
  ArrowAnimation, 
  HamsterAnimation, 
  RoughHighlight, 
  RoughUnderline, 
  WavingHand,
  ConfettiFooterAnimation,
  EnhancedMarqueeAnimation,
  ScrollingTestimonials
} from '@/components/bootcamp'

export const metadata: Metadata = {
  title: 'Bootcamp Animations Demo - Exercism',
  description: 'Demo page showcasing all bootcamp animations and interactions',
}

export default function BootcampAnimationsDemo() {
  const testimonials = [
    "This bootcamp changed my life! The teaching is incredible.",
    "Jeremy is an amazing instructor. Highly recommended!",
    "The best coding bootcamp I've ever attended.",
    "Exercism's approach to learning is revolutionary.",
    "I learned more in 12 weeks than I did in years of self-study."
  ]

  return (
    <div className="bootcamp-animations-demo">
      <div className="lg-container py-16">
        <h1 className="text-4xl font-bold mb-8">Bootcamp Animations Demo</h1>
        
        {/* Arrow Animations */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-4">Arrow Animations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <h3 className="mb-4">Default Arrow</h3>
              <ArrowAnimation id="default-arrow" />
            </div>
            <div className="text-center">
              <h3 className="mb-4">Rhodri Arrow</h3>
              <ArrowAnimation id="rhodri" />
            </div>
            <div className="text-center">
              <h3 className="mb-4">Jiki Arrow</h3>
              <ArrowAnimation id="jiki" />
            </div>
          </div>
        </section>

        {/* Rough Notation Animations */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-4">Rough Notation Animations</h2>
          <div className="space-y-4 text-lg">
            <p>
              This is a <RoughHighlight>highlighted text</RoughHighlight> that will animate when scrolled into view.
            </p>
            <p>
              This is an <RoughUnderline>underlined text</RoughUnderline> that will animate when scrolled into view.
            </p>
            <p>
              Say hello with a <WavingHand>👋</WavingHand> that will wave when scrolled into view.
            </p>
          </div>
        </section>

        {/* Scrolling Testimonials with Hamster */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-4">Scrolling Testimonials with Hamster Animation</h2>
          <p className="mb-4 text-gray-600">Hover over the testimonials to see the hamster speed up and create smoke!</p>
          <ScrollingTestimonials testimonials={testimonials} />
        </section>

        {/* Enhanced Marquee */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-4">Enhanced Marquee Animation</h2>
          <p className="mb-4 text-gray-600">Hover to see speed changes!</p>
          <EnhancedMarqueeAnimation className="border p-4 rounded">
            <li className="px-4">Item 1</li>
            <li className="px-4">Item 2</li>
            <li className="px-4">Item 3</li>
            <li className="px-4">Item 4</li>
            <li className="px-4">Item 5</li>
          </EnhancedMarqueeAnimation>
        </section>

        {/* Confetti Trigger */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-4">Confetti Animation</h2>
          <p className="mb-4 text-gray-600">Scroll down to the LinkedIn section to trigger confetti!</p>
          <div className="linkedin bg-blue-600 text-white p-8 rounded text-center">
            <h3 className="text-xl font-semibold">🎉 LinkedIn Section 🎉</h3>
            <p>Confetti should trigger when this comes into view!</p>
          </div>
          <ConfettiFooterAnimation />
        </section>

        {/* Spacer for scroll testing */}
        <div className="h-96"></div>
      </div>
    </div>
  )
}