'use client'

import { BootcampData } from '@/lib/api/bootcamp'
import { BootcampLayout } from '@/components/layout/BootcampLayout'
import { CountdownBar } from './CountdownBar'
import { BootcampNav } from './BootcampNav'
import { HeroSection } from './HeroSection'
import { WelcomeSection } from './WelcomeSection'
import { BootcampDetailsSection } from './BootcampDetailsSection'
import { TestimonialSection } from './TestimonialSection'
import { SignupSection } from './SignupSection'
import { ExercismSection } from './ExercismSection'
import { FAQSection } from './FAQSection'
import { LegalsSection } from './LegalsSection'

export function BootcampPage(props: BootcampData) {
  return (
    <BootcampLayout>
      <CountdownBar />
      <BootcampNav />
      <HeroSection {...props} />
      <WelcomeSection />
      <BootcampDetailsSection />
      <TestimonialSection />
      <SignupSection {...props} />
      <ExercismSection />
      <FAQSection {...props} />
      <LegalsSection />
    </BootcampLayout>
  )
}