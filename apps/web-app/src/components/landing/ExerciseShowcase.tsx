"use client";

import { CheckCircle, Clock, TrendingUp } from "lucide-react";

const exercises = [
  {
    title: "Two Sum",
    difficulty: "Easy",
    language: "JavaScript",
    completions: "45,234",
    time: "15 min",
    description:
      "Find two numbers in an array that add up to a target sum. Perfect for learning array manipulation.",
    tags: ["Arrays", "Hash Tables"],
  },
  {
    title: "Binary Search Tree",
    difficulty: "Medium",
    language: "Python",
    completions: "23,456",
    time: "30 min",
    description:
      "Implement a binary search tree with insert, search, and delete operations. Master tree data structures.",
    tags: ["Trees", "Recursion"],
  },
  {
    title: "Async/Await Pattern",
    difficulty: "Medium",
    language: "TypeScript",
    completions: "18,765",
    time: "25 min",
    description:
      "Learn modern asynchronous programming patterns in TypeScript with practical examples.",
    tags: ["Async", "Promises"],
  },
  {
    title: "REST API Design",
    difficulty: "Hard",
    language: "Go",
    completions: "12,345",
    time: "45 min",
    description:
      "Design and implement a RESTful API with proper error handling and middleware.",
    tags: ["API", "HTTP"],
  },
  {
    title: "String Manipulation",
    difficulty: "Easy",
    language: "Ruby",
    completions: "32,109",
    time: "10 min",
    description:
      "Master string operations with common manipulation techniques and regex patterns.",
    tags: ["Strings", "Regex"],
  },
  {
    title: "Memory Management",
    difficulty: "Hard",
    language: "Rust",
    completions: "8,432",
    time: "60 min",
    description:
      "Understand Rust's ownership system and learn safe memory management techniques.",
    tags: ["Memory", "Safety"],
  },
];

/**
 * ExerciseShowcase component
 * Displays featured exercises
 */
export function ExerciseShowcase() {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-700";
      case "Medium":
        return "bg-yellow-100 text-yellow-700";
      case "Hard":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-4">
            Featured Exercises
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose from thousands of carefully crafted exercises designed to
            improve your programming skills.
          </p>
        </div>

        {/* Exercise Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exercises.map((exercise, index) => (
            <div
              key={index}
              className="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 hover:border-purple cursor-pointer"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 group-hover:text-purple transition-colors">
                  {exercise.title}
                </h3>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getDifficultyColor(exercise.difficulty)}`}
                >
                  {exercise.difficulty}
                </span>
              </div>

              {/* Language Badge */}
              <div className="mb-3">
                <span className="inline-flex items-center rounded-md bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                  {exercise.language}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {exercise.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {exercise.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 mr-1.5 text-green-600" />
                  <span>{exercise.completions}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-1.5" />
                  <span>{exercise.time}</span>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-4">
                <button className="w-full py-2 px-4 bg-purple text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm">
                  Start Exercise
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <button className="inline-flex items-center justify-center rounded-lg border-2 border-purple bg-white px-8 py-4 text-base font-semibold text-purple hover:bg-purple hover:text-white transition-all">
            <TrendingUp className="mr-2 h-5 w-5" />
            Explore All Exercises
          </button>
        </div>
      </div>
    </section>
  );
}
