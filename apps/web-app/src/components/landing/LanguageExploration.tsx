"use client";

import { Code, Zap, Users, Award } from "lucide-react";

const languages = [
  {
    name: "JavaScript",
    icon: "🟨",
    students: "12,453",
    exercises: "145",
    color: "bg-yellow-100 text-yellow-700",
  },
  {
    name: "Python",
    icon: "🐍",
    students: "15,234",
    exercises: "168",
    color: "bg-blue-100 text-blue-700",
  },
  {
    name: "TypeScript",
    icon: "🔷",
    students: "9,876",
    exercises: "132",
    color: "bg-blue-100 text-blue-700",
  },
  {
    name: "Rust",
    icon: "🦀",
    students: "7,543",
    exercises: "98",
    color: "bg-orange-100 text-orange-700",
  },
  {
    name: "Go",
    icon: "🐹",
    students: "8,765",
    exercises: "115",
    color: "bg-cyan-100 text-cyan-700",
  },
  {
    name: "Ruby",
    icon: "💎",
    students: "6,432",
    exercises: "142",
    color: "bg-red-100 text-red-700",
  },
];

/**
 * LanguageExploration component
 * Showcases available programming languages
 */
export function LanguageExploration() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-4">
            Explore 67 Programming Languages
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            From popular languages to niche ones, master the skills you need for
            your career goals.
          </p>
        </div>

        {/* Language Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {languages.map((language) => (
            <div
              key={language.name}
              className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 hover:shadow-lg transition-all duration-300 hover:border-purple cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`text-4xl ${language.icon}`}>
                  {language.icon}
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${language.color}`}
                >
                  Popular
                </span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {language.name}
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  <span>{language.students} students</span>
                </div>
                <div className="flex items-center">
                  <Code className="w-4 h-4 mr-2" />
                  <span>{language.exercises} exercises</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button className="text-purple font-medium text-sm group-hover:underline">
                  Start Learning →
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Learn by Doing
            </h3>
            <p className="text-gray-600">
              Practice with real-world coding challenges and exercises
            </p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Get Mentorship
            </h3>
            <p className="text-gray-600">
              Receive personalized feedback from experienced developers
            </p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple mb-4">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Earn Achievements
            </h3>
            <p className="text-gray-600">
              Track your progress and earn badges as you complete challenges
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
