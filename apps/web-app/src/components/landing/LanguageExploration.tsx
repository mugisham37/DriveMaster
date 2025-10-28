'use client';

import Link from 'next/link';

// Language data with exact specifications from reference image
const languages = [
  {
    name: 'Python',
    icon: { backgroundColor: '#FFD43B', borderColor: '#1a1a3e', logo: 'python-logo' },
    students: '632,963 students'
  },
  {
    name: 'JavaScript', 
    icon: { backgroundColor: '#F7DF1E', borderColor: '#1a1a3e', logo: 'JS' },
    students: '443,887 students'
  },
  {
    name: 'Java',
    icon: { backgroundColor: '#FFFFFF', borderColor: '#E76F51', logo: 'java-cup' },
    students: '235,616 students'
  },
  {
    name: 'C++',
    icon: { backgroundColor: '#9B59B6', borderColor: '#1a1a3e', logo: 'C++', logoColor: '#FFFFFF' },
    students: '159,947 students'
  },
  {
    name: 'C#',
    icon: { backgroundColor: '#6A5ACD', borderColor: '#1a1a3e', logo: 'C#', logoColor: '#FFFFFF' },
    students: '152,892 students'
  },
  {
    name: 'Go',
    icon: { backgroundColor: '#00ADD8', borderColor: '#1a1a3e', logo: 'go-gopher' },
    students: '146,273 students'
  },
  {
    name: 'C',
    icon: { backgroundColor: '#FFFFFF', borderColor: '#00599C', logo: 'C', logoColor: '#00599C' },
    students: '130,191 students'
  },
  {
    name: 'Rust',
    icon: { backgroundColor: '#FFFFFF', borderColor: '#000000', logo: 'rust-gear' },
    students: '126,052 students'
  },
  {
    name: 'TypeScript',
    icon: { backgroundColor: '#3178C6', borderColor: '#1a1a3e', logo: 'TS', logoColor: '#FFFFFF' },
    students: '85,017 students'
  },
  {
    name: 'Bash',
    icon: { backgroundColor: '#FFFFFF', borderColor: '#000000', logo: 'bash-terminal' },
    students: '73,613 students'
  },
  {
    name: 'Ruby',
    icon: { backgroundColor: '#CC342D', borderColor: '#1a1a3e', logo: 'ruby-gem' },
    students: '59,339 students'
  },
  {
    name: 'PHP',
    icon: { backgroundColor: '#777BB4', borderColor: '#1a1a3e', logo: 'php-elephant' },
    students: '57,520 students'
  }
];

// Hexagon Icon Component
function HexagonIcon({ backgroundColor, borderColor, logo, logoColor = '#000000' }: {
  backgroundColor: string;
  borderColor: string;
  logo: string;
  logoColor?: string;
}) {
  return (
    <div 
      className="w-[65px] h-[65px] flex items-center justify-center font-bold text-[14px] mb-[15px]"
      style={{
        backgroundColor,
        border: `2px solid ${borderColor}`,
        clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
        color: logoColor
      }}
    >
      {logo}
    </div>
  );
}

// Language Card Component
function LanguageCard({ language }: { language: typeof languages[0] }) {
  return (
    <div className="w-[150px] text-center">
      <HexagonIcon {...language.icon} />
      <div className="text-[19px] font-bold text-[#000000] mb-[8px] font-inter">
        {language.name}
      </div>
      <div className="text-[13.5px] font-normal text-[#666666] font-inter">
        {language.students}
      </div>
    </div>
  );
}

// Decorative Elements Component
function DecorativeElements() {
  return (
    <>
      {/* Diagonal lines */}
      <div 
        className="absolute w-[25px] h-[2px] bg-black"
        style={{ left: '40px', top: '220px', transform: 'rotate(45deg)' }}
      />
      <div 
        className="absolute w-[25px] h-[2px] bg-black"
        style={{ left: '50px', top: '230px', transform: 'rotate(45deg)' }}
      />
      
      {/* Cyan diamond */}
      <div 
        className="absolute w-[20px] h-[20px] bg-[#00BCD4]"
        style={{ left: '120px', top: '135px', transform: 'rotate(45deg)' }}
      />
      
      {/* Yellow square */}
      <div 
        className="absolute w-[18px] h-[18px] bg-[#FFD600]"
        style={{ right: '190px', top: '130px' }}
      />
      
      {/* Dot grid (3x3) */}
      <div 
        className="absolute grid grid-cols-3 gap-[8px]"
        style={{ right: '182px', top: '205px' }}
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="w-[4px] h-[4px] bg-black rounded-full" />
        ))}
      </div>
      
      {/* Orange triangle */}
      <div 
        className="absolute w-0 h-0"
        style={{ 
          right: '60px', 
          top: '233px',
          borderLeft: '9px solid transparent',
          borderRight: '9px solid transparent',
          borderTop: '18px solid #FF9800'
        }}
      />
    </>
  );
}

// Zigzag SVG Component
function ZigzagDecoration() {
  return (
    <svg width="70" height="20" viewBox="0 0 70 20" className="mx-auto mb-[60px]">
      <path 
        d="M5 15 L20 5 L35 15 L50 5 L65 15" 
        stroke="#000000" 
        strokeWidth="2" 
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LanguageExploration() {
  return (
    <section className="bg-white py-[60px] px-[40px] relative">
      <div className="max-w-[1400px] mx-auto text-center relative">
        {/* Decorative Elements */}
        <DecorativeElements />
        
        {/* Hexagon Icon */}
        <div className="mb-[35px]">
          <div 
            className="w-[60px] h-[60px] mx-auto flex items-center justify-center text-[#1a1a3e] text-[24px] font-bold"
            style={{
              border: '2.5px solid #1a1a3e',
              clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
              backgroundColor: 'transparent'
            }}
          >
            #
          </div>
        </div>

        {/* Main Heading */}
        <h2 className="text-[46px] font-extrabold text-[#1a1a3e] leading-[1.2] tracking-[-0.8px] mb-[2px] font-inter">
          Explore and get fluent in
        </h2>
        
        {/* Subheading */}
        <h2 className="text-[46px] font-extrabold text-[#1a1a3e] leading-[1.2] tracking-[-0.8px] mb-[28px] font-inter">
          78 programming languages
        </h2>

        {/* Zigzag Decoration */}
        <ZigzagDecoration />

        {/* Language Grid */}
        <div className="grid grid-cols-6 gap-x-[55px] gap-y-[60px] justify-items-center mt-[80px] mb-[90px]">
          {languages.map((language, index) => (
            <LanguageCard key={index} language={language} />
          ))}
        </div>

        {/* CTA Button */}
        <Link
          href="/tracks"
          className="inline-flex items-center justify-center px-[28px] py-[16px] bg-[#E3F2FD] text-[#2196F3] font-semibold text-[15.5px] rounded-[24px] hover:bg-[#BBDEFB] transition-colors duration-200 font-inter"
        >
          See all 78 Language Tracks
          <svg 
            className="ml-[10px] w-[18px] h-[18px]" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path 
              fillRule="evenodd" 
              d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" 
              clipRule="evenodd" 
            />
          </svg>
        </Link>
      </div>
    </section>
  );
}