"use client";

import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";

/**
 * LandingHero component
 * Hero section for the landing page
 */
export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-purple-50 to-white py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Hero Badge */}
          <div className="mb-8 inline-flex items-center rounded-full bg-purple-100 px-4 py-1.5 text-sm font-medium text-purple-700">
            <span className="mr-2">🎉</span>
            Over 50,000 students have mastered their driving skills
          </div>

          {/* Hero Title */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Master Your Driving Skills with{" "}
            <span className="text-purple">DriveMaster</span>
          </h1>

          {/* Hero Description */}
          <p className="mb-10 text-lg leading-8 text-gray-600 sm:text-xl">
            Level up your driving abilities with comprehensive lessons,
            interactive practice tests, and personalized mentorship. Join
            thousands of learners on their journey to becoming confident
            drivers.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-lg bg-purple px-8 py-4 text-base font-semibold text-white shadow-sm hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple focus:ring-offset-2"
            >
              Get Started for Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <button className="inline-flex items-center justify-center rounded-lg border-2 border-gray-300 bg-white px-8 py-4 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2">
              <Play className="mr-2 h-5 w-5" />
              Watch Demo
            </button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-purple">67</div>
              <div className="mt-1 text-sm text-gray-600">Lesson Tracks</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple">50K+</div>
              <div className="mt-1 text-sm text-gray-600">Students</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple">15K+</div>
              <div className="mt-1 text-sm text-gray-600">Exercises</div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute left-0 top-0 -z-10 h-full w-full">
        <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-purple-200 opacity-20 blur-3xl"></div>
        <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-blue-200 opacity-20 blur-3xl"></div>
      </div>
    </section>
  );
}
