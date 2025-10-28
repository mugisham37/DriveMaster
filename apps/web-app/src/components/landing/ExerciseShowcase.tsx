"use client";

import Image from "next/image";

// Exercise card data matching the reference image exactly
const exerciseCards = [
  {
    id: 1,
    icon: "allergies",
    title: "Allergies",
    description:
      "Given a person's allergy score, determine whether or not they're allergic to a given...",
    languages: ["C", "JavaScript"],
    moreCount: 40,
    iconBg: "#E8F5F3",
  },
  {
    id: 2,
    icon: "queen",
    title: "Queen Attack",
    description:
      "Given the position of two queens on a chess board, indicate whether or not the...",
    languages: ["C", "Other"],
    moreCount: 60,
    iconBg: "#E8F0F8",
  },
  {
    id: 3,
    icon: "zebra",
    title: "Zebra Puzzle",
    description:
      "Which of the residents drinks water? Who owns the zebra? Can you solve the Zebr...",
    languages: ["Multiple"],
    moreCount: 70,
    iconBg: "#F5F0E8",
  },
];

// Exercise Icon Component
function ExerciseIconPlaceholder({
  icon,
  backgroundColor,
}: {
  icon: string;
  backgroundColor: string;
}) {
  const iconMap: Record<string, string> = {
    allergies: "👤",
    queen: "♛",
    zebra: "🦓",
  };

  return (
    <div
      className="w-[58px] h-[58px] rounded-full flex items-center justify-center text-[24px] flex-shrink-0"
      style={{ backgroundColor }}
    >
      {iconMap[icon] || "📄"}
    </div>
  );
}

// Language Tag Component
function LanguageTag({ language }: { language: string }) {
  const getTagStyles = (lang: string) => {
    switch (lang) {
      case "C":
        return {
          backgroundColor: "#E8E8F0",
          borderColor: "#5C5C8A",
          color: "#5C5C8A",
        };
      case "JavaScript":
        return {
          backgroundColor: "#FFF8DC",
          borderColor: "#F0DB4F",
          color: "#333333",
        };
      default:
        return {
          backgroundColor: "#E8E8F0",
          borderColor: "#5C5C8A",
          color: "#5C5C8A",
        };
    }
  };

  const styles = getTagStyles(language);

  return (
    <div
      className="w-[42px] h-[42px] rounded-full flex items-center justify-center text-[15px] font-bold border-2 flex-shrink-0"
      style={styles}
    >
      {language === "JavaScript"
        ? "JS"
        : language === "Multiple"
        ? "∞"
        : language}
    </div>
  );
}

// Exercise Card Component
function ExerciseCard({ exercise }: { exercise: (typeof exerciseCards)[0] }) {
  return (
    <div className="bg-white rounded-[11px] p-[22px] flex items-center gap-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:-translate-y-[2px] transition-all duration-200">
      {/* Exercise Icon */}
      <ExerciseIconPlaceholder
        icon={exercise.icon}
        backgroundColor={exercise.iconBg}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-[19px] font-bold text-[#1C2B4A] mb-[7px] leading-tight">
          {exercise.title}
        </h3>
        <p className="text-[14.5px] text-[#5C6370] leading-[1.5]">
          {exercise.description}
        </p>
      </div>

      {/* Language Tags and More Count */}
      <div className="flex items-center gap-[9px] flex-shrink-0">
        {exercise.languages.map((lang, index) => (
          <LanguageTag key={index} language={lang} />
        ))}
        <span className="text-[15.5px] text-[#6B46C1] font-semibold ml-[12px] whitespace-nowrap">
          +{exercise.moreCount} more
        </span>
      </div>
    </div>
  );
}

// Zigzag Wave Decoration Component
function ZigzagWave() {
  return (
    <svg width="90" height="22" viewBox="0 0 90 22" className="mb-[36px]">
      <path
        d="M5 17 L25 5 L45 17 L65 5 L85 17"
        stroke="#1C2B4A"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ExerciseShowcase() {
  return (
    <section className="bg-white py-[80px] px-[80px]">
      <div className="max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-[60px] items-start">
          {/* Left Content - Takes 7 columns out of 12 (58.33%) */}
          <div className="lg:col-span-7">
            {/* Logo Section */}
            <div className="mb-[48px]">
              <div
                className="w-[64px] h-[64px] flex items-center justify-center text-[#1C2B4A] text-[24px] font-bold border-[3px] border-[#1C2B4A] bg-white"
                style={{
                  clipPath:
                    "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
                }}
              >
                💪
              </div>
            </div>

            {/* Main Headline */}
            <h2 className="text-[50px] font-extrabold leading-[1.2] text-[#1C2B4A] mb-[18px] tracking-[-0.02em]">
              Over{" "}
              <span className="relative inline-block">
                <span className="underline decoration-wavy decoration-[#6B46C1] decoration-2 underline-offset-4">
                  7,736 coding exercises
                </span>
              </span>
              . From &ldquo;Allergies&rdquo; to &ldquo;Zebra Puzzle&rdquo;.
            </h2>

            {/* Zigzag Wave Decoration */}
            <ZigzagWave />

            {/* Subheading */}
            <p className="text-[19px] leading-[1.65] text-[#5C6370] mb-[56px] max-w-[600px]">
              Learn by doing. Get better at programming through fun coding
              exercises that build your understanding of concepts.
            </p>

            {/* Exercise Cards Container */}
            <div className="bg-[#F8F9FA] rounded-[14px] p-[26px]">
              <div className="space-y-[22px]">
                {exerciseCards.map((exercise) => (
                  <ExerciseCard key={exercise.id} exercise={exercise} />
                ))}
              </div>
            </div>
          </div>

          {/* Right Content - Takes 5 columns out of 12 (41.67%) */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-[40px]">
              <div className="relative">
                <Image
                  src="/assets/screenshoot1.png"
                  alt="Exercism Dashboard Screenshot"
                  width={650}
                  height={450}
                  className="w-full h-auto rounded-[14px] shadow-[0_20px_60px_rgba(0,0,0,0.15),_0_8px_16px_rgba(0,0,0,0.1)]"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
