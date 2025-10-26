import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { GraphicalIcon } from "@/components/common/GraphicalIcon";
import { YoutubePlayer } from "@/components/common/YoutubePlayer";

export const metadata: Metadata = {
  title: "#12in23 Challenge - Exercism",
  description:
    "Learn 12 programming languages in 2023! Each month features different languages with themed exercises.",
};

interface Track {
  slug: string;
  title: string;
  iconUrl: string;
  course: boolean;
}

async function get12in23Data() {
  const currentMonth = new Date().getMonth() + 1; // 1-12

  const decemberTracks: Track[] = [
    {
      slug: "coldfusion",
      title: "ColdFusion",
      iconUrl: "https://assets.exercism.org/images/tracks/coldfusion.svg",
      course: false,
    },
    {
      slug: "groovy",
      title: "Groovy",
      iconUrl: "https://assets.exercism.org/images/tracks/groovy.svg",
      course: false,
    },
    {
      slug: "lua",
      title: "Lua",
      iconUrl: "https://assets.exercism.org/images/tracks/lua.svg",
      course: true,
    },
    {
      slug: "vimscript",
      title: "VimScript",
      iconUrl: "https://assets.exercism.org/images/tracks/vimscript.svg",
      course: false,
    },
    {
      slug: "wren",
      title: "Wren",
      iconUrl: "https://assets.exercism.org/images/tracks/wren.svg",
      course: false,
    },
  ];

  const featuredExercises = [
    {
      slug: "all-your-base",
      title: "All Your Base",
      description:
        "Convert a number, represented as a sequence of digits, to another base.",
      iconUrl: "https://assets.exercism.org/images/exercises/all-your-base.svg",
    },
    {
      slug: "flatten-array",
      title: "Flatten Array",
      description:
        "Take a nested collection and return a single, non-nested collection.",
      iconUrl: "https://assets.exercism.org/images/exercises/flatten-array.svg",
    },
    {
      slug: "queen-attack",
      title: "Queen Attack",
      description:
        "Determine whether two queens on a chess board can attack each other.",
      iconUrl: "https://assets.exercism.org/images/exercises/queen-attack.svg",
    },
    {
      slug: "dnd-character",
      title: "DND Character",
      description: "Randomly generate Dungeons & Dragons characters.",
      iconUrl: "https://assets.exercism.org/images/exercises/dnd-character.svg",
    },
    {
      slug: "run-length-encoding",
      title: "Run-Length Encoding",
      description: "Implement run-length encoding and decoding.",
      iconUrl:
        "https://assets.exercism.org/images/exercises/run-length-encoding.svg",
    },
  ];

  // Mock user progress data
  const trackCounts: Record<string, number> = {
    javascript: 8,
    python: 6,
    ruby: 5,
    go: 3,
    rust: 2,
    java: 1,
  };

  const allTracks = [
    {
      id: "javascript",
      slug: "javascript",
      title: "JavaScript",
      iconUrl: "https://assets.exercism.org/images/tracks/javascript.svg",
    },
    {
      id: "python",
      slug: "python",
      title: "Python",
      iconUrl: "https://assets.exercism.org/images/tracks/python.svg",
    },
    {
      id: "ruby",
      slug: "ruby",
      title: "Ruby",
      iconUrl: "https://assets.exercism.org/images/tracks/ruby.svg",
    },
    {
      id: "go",
      slug: "go",
      title: "Go",
      iconUrl: "https://assets.exercism.org/images/tracks/go.svg",
    },
    {
      id: "rust",
      slug: "rust",
      title: "Rust",
      iconUrl: "https://assets.exercism.org/images/tracks/rust.svg",
    },
    {
      id: "java",
      slug: "java",
      title: "Java",
      iconUrl: "https://assets.exercism.org/images/tracks/java.svg",
    },
  ];

  const badgeProgressExercises = featuredExercises.map((exercise) => ({
    slug: exercise.slug,
    title: exercise.title,
    trackSlugs: ["javascript", "python", "ruby"],
    earnedFor: (trackCounts?.["javascript"] ?? 0) >= 5 ? "javascript" : null,
  }));

  return {
    currentMonth,
    decemberTracks,
    featuredExercises,
    trackCounts,
    allTracks,
    badgeProgressExercises,
    badgeProgressExerciseCount: featuredExercises.length,
    badgeProgressExerciseEarnedCount: badgeProgressExercises.filter(
      (e) => e.earnedFor
    ).length,
  };
}

export default async function Challenge12in23Page() {
  const {
    decemberTracks,
    featuredExercises,
    trackCounts,
    allTracks,
    badgeProgressExercises,
    badgeProgressExerciseCount,
    badgeProgressExerciseEarnedCount,
  } = await get12in23Data();

  return (
    <div id="challenge-12in23-page">
      <section className="top-section">
        <div className="lg-container">
          <div className="flex">
            <div className="mr-auto max-w-[860px]">
              <div className="font-semibold leading-150 flex items-center mb-4 text-adaptivePurple">
                <span className="emoji mr-6">📆</span>
                Month 12 of #12in23
              </div>
              <h1 className="text-h1 mb-8">It&apos;s December Diversions! ✨</h1>
              <p className="text-p-xlarge mb-20">
                This month for #12in23 we&apos;re exploring these. We&apos;re
                digging into the following languages: ColdFusion, Groovy, Lua,
                VimScript and Wren, with interviews and live streaming and lots
                of fun exercises for you to complete!
              </p>

              <div className="shadow-baseZ1 grid grid-cols-2 gap-20 py-20 px-20 rounded-8 bg-backgroundColorB">
                <div className="flex-shrink">
                  <h2 className="text-h4 mb-2">
                    Start by watching our December Diversions overview video 👉
                  </h2>
                  <p className="text-p-base mb-8">
                    Our introductory video gives a quick overview to the month,
                    explores how these languages are different, looks at where
                    they&apos;re useful, and finally gives a quick comparison
                    between the featured languages this month.
                  </p>
                  <p className="text-p-base">
                    Take a watch and leave a comment!
                  </p>
                </div>

                <div className="rhs">
                  <div className="w-[100%] max-w-[500px]">
                    <YoutubePlayer videoId="_w5Q3Tc1kqY" />
                  </div>
                </div>
              </div>

              <h2 className="text-h3 mt-32 mb-2">
                Learn and Earn (the badge)!
              </h2>
              <p className="text-p-large mb-20">
                Earn the December Diversions badge for completing and publishing
                5 exercises in one of the following languages. Consider starting
                with a language with a syllabus (
                <GraphicalIcon
                  icon="concepts"
                  className="w-[14px] h-[14px] filter-purple inline mx-[-4px]"
                />
                ).
              </p>

              <div className="grid grid-cols-6 gap-12 mb-32">
                {decemberTracks.map((track) => (
                  <Link
                    key={track.slug}
                    href={`/tracks/${track.slug}`}
                    className="rounded-12 shadow-base hover:shadow-baseZ1 bg-backgroundColorA flex flex-col p-12 text-center relative"
                  >
                    {track.course && (
                      <div className="rounded-circle bg-backgroundColorA p-4 shadow-baseZ1 absolute top-[-7px] right-[-7px]">
                        <GraphicalIcon
                          icon="concepts"
                          className="w-[14px] h-[14px] filter-purple"
                        />
                      </div>
                    )}
                    <Image
                      src={track.iconUrl}
                      alt={track.title}
                      width={48}
                      height={48}
                      className="mb-8 mx-auto"
                    />
                    <div className="text-h6">{track.title}</div>
                  </Link>
                ))}
              </div>

              <p className="text-p-large mb-12">
                You can solve any exercises in these tracks to get the badge,
                but we recommend the following as interesting challenges to
                approach in these languages:
              </p>
              <ul className="text-p-large mb-12">
                {featuredExercises.map((exercise) => (
                  <li key={exercise.slug} className="mb-2">
                    <Image
                      src={exercise.iconUrl}
                      alt={exercise.title}
                      width={25}
                      height={25}
                      className="w-[25px] inline mr-2"
                    />
                    <strong className="font-semibold">{exercise.title}:</strong>{" "}
                    {exercise.description}
                  </li>
                ))}
              </ul>

              <h2 className="text-h3 mt-32 mb-4">Learn from others… 🎥</h2>
              <p className="text-p-large mb-12 c-highlight-links">
                Throughout the month we&apos;ll have interviews, walkthroughs
                from Exercism track contributors, and live streams of the
                community solving exercises. Our streaming team is really
                growing so definitely check out what&apos;s on! Subscribe to our{" "}
                <Link
                  href="https://twitch.tv/exercismlive"
                  className="underline"
                >
                  Twitch Channel
                </Link>{" "}
                and{" "}
                <Link
                  href="https://www.youtube.com/exercism_videos?sub_confirmation=1"
                  className="underline"
                >
                  YouTube Channel
                </Link>{" "}
                to not miss out! There&apos;s also a schedule at the top right
                of this page.
              </p>

              <h2 className="text-h3 mt-32 mb-4">Join the conversation… 💬</h2>
              <ul className="text-p-large list-disc pl-16 c-highlight-links">
                <li className="mb-4">
                  Join in the conversation by using the{" "}
                  <Link
                    href="https://forum.exercism.org/tag/12in23"
                    className="underline"
                  >
                    #12in23 tag on our forums
                  </Link>
                  , chatting on our{" "}
                  <Link
                    href="https://exercism.org/r/discord"
                    className="underline"
                  >
                    Discord Server
                  </Link>
                  , or using the{" "}
                  <strong className="font-semibold">#12in23</strong> hashtag
                  around social media!
                </li>
              </ul>
            </div>

            <div className="ml-80 max-w-[450px]">
              <div className="bg-backgroundColorD rounded-8 py-16 px-24 mb-24 border-1 border-borderColor7">
                <h2 className="text-h4 mb-4">Upcoming Streaming Schedule</h2>
                <p className="text-p-base mb-12 c-highlight-links">
                  This schedule is regularly updated. All events will stream on
                  our{" "}
                  <Link
                    href="https://twitch.tv/exercismlive"
                    className="underline"
                  >
                    Twitch Channel
                  </Link>{" "}
                  - subscribe so not to miss out!
                  <strong className="font-semibold"> All times in UTC.</strong>
                </p>

                <ul className="text-p-base list-disc pl-16">
                  <li className="mb-4">
                    <div className="font-medium text-textColor6 text-14 leading-100">
                      Dec 15, 2023 - 14:00 UTC
                    </div>
                    <strong className="font-semibold text-textColor2">
                      December Diversions Kickoff
                    </strong>
                  </li>
                  <li className="mb-4">
                    <div className="font-medium text-textColor6 text-14 leading-100">
                      Dec 20, 2023 - 16:00 UTC
                    </div>
                    <strong className="font-semibold text-textColor2">
                      Lua Deep Dive
                    </strong>
                  </li>
                </ul>
              </div>

              <div className="bg-backgroundColorD rounded-8 py-16 px-24 mb-24 border-1 border-borderColor7">
                <h2 className="text-h4 mb-4">How does #12in23 work?</h2>
                <p className="text-p-base mb-12">
                  Each month has a different theme and featured languages. Solve
                  exercises in a featured language during that month. Check out
                  our two introductory videos for more details!
                </p>
                <div className="grid grid-cols-2 gap-12">
                  <Link
                    href="https://youtu.be/e15lRHLJQKI"
                    className="bg-backgroundColorB p-8 shadow-smZ1 rounded-5 relative block"
                  >
                    <GraphicalIcon
                      icon="video-play"
                      className="!absolute top-[40px] w-[30px] left-[50%] ml-[-15px] text-white drop-shadow-lg"
                    />
                    <Image
                      src="https://assets.exercism.org/images/thumbnails/yt-12in23-feb-update.jpg"
                      alt="A video thumbnail"
                      width={150}
                      height={100}
                      className="mb-8 block w-full rounded-5"
                    />
                    <div className="text-center text-h6">
                      How&apos;s your #12in23 going?
                    </div>
                  </Link>

                  <Link
                    href="https://youtu.be/2refhxXqePI"
                    className="bg-backgroundColorB p-8 shadow-smZ1 rounded-5 relative block"
                  >
                    <GraphicalIcon
                      icon="video-play"
                      className="!absolute top-[40px] w-[30px] left-[50%] ml-[-15px] text-white drop-shadow-lg"
                    />
                    <Image
                      src="https://assets.exercism.org/images/thumbnails/yt-official-12in23-calendar.jpg"
                      alt="A video thumbnail"
                      width={150}
                      height={100}
                      className="mb-8 block w-full rounded-5"
                    />
                    <div className="text-center text-h6">
                      The Official #12in23 Calendar
                    </div>
                  </Link>
                </div>

                <p className="text-p-small text-center mt-20 bg-backgroundColorA rounded-8 py-8 px-12 font-medium">
                  Track your progress at the bottom of the page.
                </p>
              </div>

              <div className="bg-backgroundColorD rounded-8 py-16 px-24 border-1 border-borderColor7">
                <h2 className="text-h4 mb-4">
                  Enjoying #12in23? Please donate 🙏
                </h2>
                <p className="text-p-base mb-12">
                  We keep Exercism free so that anyone can use it. But we rely
                  on the generosity of people that could afford it to make that
                  possible. If you&apos;re enjoying #12in23 and are financially
                  able, please consider donating to keep Exercism going!
                </p>
                <Link href="/donate" className="btn btn-primary">
                  Donate now
                </Link>
              </div>

              <div className="bg-backgroundColorD rounded-8 py-16 px-24 border-1 border-borderColor7 mt-24">
                <h2 className="text-h4 mb-4">The year-long #12in23 badge</h2>
                <p className="text-p-base mb-12">
                  At the end of the year we&apos;ll be awarding an exclusive
                  badge to anyone who completes all the featured exercises in
                  the correct paradigms. You can complete the exercise any time
                  during 2023. Hover over the exercises below or view{" "}
                  <Link
                    href="https://forum.exercism.org/t/new-12in23-badge-for-completing-all-the-things/4183"
                    className="font-semibold text-linkColor"
                  >
                    this forum post
                  </Link>{" "}
                  for more details.
                </p>

                {badgeProgressExercises.length > 0 && (
                  <>
                    <h2 className="text-h6 mt-20 mb-12">
                      Published Exercises
                      <div className="inline text-14">
                        {" "}
                        ({badgeProgressExerciseEarnedCount} /{" "}
                        {badgeProgressExerciseCount} so far)
                      </div>
                    </h2>
                    <div className="grid grid-cols-5 gap-12">
                      {badgeProgressExercises.map((exerciseProgress) => (
                        <div
                          key={exerciseProgress.slug}
                          className="relative block"
                        >
                          {exerciseProgress.earnedFor ? (
                            <Link
                              href={`/tracks/${exerciseProgress.earnedFor}/exercises/${exerciseProgress.slug}`}
                            >
                              <Image
                                src={`https://assets.exercism.org/images/exercises/${exerciseProgress.slug}.svg`}
                                alt={exerciseProgress.title}
                                width={40}
                                height={40}
                                className="w-100"
                                title={`Solved in ${exerciseProgress.earnedFor}`}
                              />
                              <GraphicalIcon
                                icon="completed-check-circle"
                                className="w-[16px] !absolute right-[2px] top-[2px]"
                              />
                            </Link>
                          ) : (
                            <Image
                              src={`https://assets.exercism.org/images/exercises/${exerciseProgress.slug}.svg`}
                              alt={exerciseProgress.title}
                              width={40}
                              height={40}
                              className="w-100 opacity-[0.7] grayscale"
                              title={`Solve ${
                                exerciseProgress.slug
                              } in ${exerciseProgress.trackSlugs.join(
                                ", or "
                              )}`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <article>
        <div className="md-container">
          <div className="flex text-center flex-col items-center">
            <h1 className="text-h1 mb-16">Your #12in23 Progress</h1>
            <p className="text-p-xlarge">
              Below you&apos;ll see a list of all the languages you&apos;ve used
              during 2023. Aim to complete 12 languages by the end of the year!
            </p>
            <p className="text-p-large cta">
              Submit 5 exercises (not including &quot;Hello World&quot;) in a
              track to tick off that language!
            </p>
          </div>

          <div className="grid grid-cols-4 gap-32 mx-auto">
            {allTracks.map((track) => {
              const count = trackCounts[track.id] || 0;
              return (
                <Link
                  key={track.id}
                  href={`/tracks/${track.slug}`}
                  className={`relative text-center shadow-baseZ1 bg-backgroundColorA py-16 px-24 rounded-8 flex flex-col items-center border-2 ${
                    count >= 5 ? "border-successColor" : "border-transparent"
                  }`}
                >
                  <Image
                    src={track.iconUrl}
                    alt=""
                    width={48}
                    height={48}
                    className="c-icon c-track-icon h-[48px] w-[48px] mb-8"
                  />
                  <div className="text-h4 mb-20">{track.title}</div>
                  {count >= 5 ? (
                    <>
                      <GraphicalIcon
                        icon="completed-check-circle"
                        className="!absolute top-[-12px] right-[-12px] w-6 h-6"
                      />
                      <div className="progress"></div>
                      <div className="count">{count} exercises completed</div>
                    </>
                  ) : (
                    <>
                      <progress
                        className="progress-bar"
                        value={count}
                        max={5}
                      />
                      <div className="count">
                        {count} / 5 exercises completed
                      </div>
                    </>
                  )}
                </Link>
              );
            })}

            {Array.from({ length: 12 - allTracks.length }).map((_, index) => (
              <div
                key={`placeholder-${index}`}
                className="shadow-base bg-backgroundColorA rounded-8 flex flex-col items-center justify-center opacity-60 min-h-[175px]"
              >
                <div className="text-h0 opacity-[0.2]">?</div>
              </div>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}
