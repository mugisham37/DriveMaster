import { Exercise, Track } from "@/types";

export interface ExerciseData {
  exercise: Exercise;
  track: Track;
  instructions: string;
  files: Array<{
    filename: string;
    content: string;
    type: "exercise" | "solution" | "readonly";
  }>;
}

export async function getExerciseData(
  trackSlug: string,
  exerciseSlug: string,
): Promise<ExerciseData | null> {
  // In a real implementation, this would fetch from your API
  // For now, return mock data that matches the expected structure

  if (trackSlug === "nonexistent" || exerciseSlug === "nonexistent") {
    return null;
  }

  return {
    exercise: {
      slug: exerciseSlug,
      type: "practice",
      title: "Hello World",
      iconUrl: "/assets/exercises/hello-world.svg",
      blurb: 'The classical introductory exercise. Just say "Hello, World!"',
      difficulty: "easy",
      isRecommended: true,
      isExternal: false,
      isUnlocked: true,
      links: {
        self: `/tracks/${trackSlug}/exercises/${exerciseSlug}`,
      },
    },
    track: {
      slug: trackSlug,
      title: "JavaScript",
      iconUrl: "/assets/tracks/javascript.svg",
      course: true,
      numConcepts: 25,
      numExercises: 140,
      numSolutions: 50000,
      links: {
        self: `/tracks/${trackSlug}`,
        exercises: `/tracks/${trackSlug}/exercises`,
        concepts: `/tracks/${trackSlug}/concepts`,
      },
    },
    instructions: `# Instructions

The classical introductory exercise. Just say "Hello, World!".

"Hello, World!" is the traditional first program for beginning programming in a new language or environment.

The objectives are simple:
- Write a function that returns the string "Hello, World!".
- Run the test suite and make sure that it succeeds.
- Submit your solution and check it at the website.

If everything goes well, you will be ready to fetch your first real exercise.`,
    files: [
      {
        filename: "hello-world.js",
        content:
          "//\n// This is only a SKELETON file for the 'Hello World' exercise. It's been provided as a\n// convenience to get you started writing code faster.\n//\n\nexport const hello = () => {\n  //\n  // YOUR CODE GOES HERE\n  //\n};\n",
        type: "solution",
      },
      {
        filename: "hello-world.spec.js",
        content:
          "import { hello } from './hello-world';\n\ndescribe('Hello World', () => {\n  test('Say Hi!', () => {\n    expect(hello()).toEqual('Hello, World!');\n  });\n});",
        type: "readonly",
      },
    ],
  };
}
