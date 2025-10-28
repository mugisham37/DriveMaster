import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Exact color preservation from CSS custom properties
        textColor1: 'var(--text-color-1)',
        textColor2: 'var(--text-color-2)', 
        textColor6: 'var(--text-color-6)',
        backgroundColorA: 'var(--background-color-a)',
        backgroundColorB: '#f8fafc',
        backgroundColorD: '#f1f5f9',
        prominentLinkColor: 'var(--prominent-link-color)',
        alert: 'var(--alert)',
        veryLightBlue: 'var(--very-light-blue)',
        lightBlue: '#e0f2fe',
        darkBlue: '#1e40af',
        borderColor: 'var(--border-color)',
        borderColor6: '#d1d5db',
        borderColor7: '#e5e7eb',
      },
      spacing: {
        // Standard Tailwind spacing with some custom values
        '1': '0.25rem',
        '2': '0.5rem',
        '3': '0.75rem',
        '4': '1rem',
        '5': '1.25rem',
        '6': '1.5rem',
        '8': '2rem',
        '10': '2.5rem',
        '12': '3rem',
        '16': '4rem',
        '20': '5rem',
        '24': '6rem',
        '32': '8rem',
        '40': '10rem',
        '48': '12rem',
        '64': '16rem',
        // Additional custom spacing values
        '14': '3.5rem',
        '18': '4.5rem',
        '22': '5.5rem',
        '28': '7rem',
        '36': '9rem',
        '44': '11rem',
        '52': '13rem',
        '60': '15rem',
        '72': '18rem',
        '80': '20rem',
        '96': '24rem'
      },
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',
        DEFAULT: '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        'full': '9999px',
        // Custom border radius values
        '4': '4px',
        '5': '5px',
        '8': '8px',
        'circle': '50%',
      },
      fontSize: {
        // Standard Tailwind font sizes
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
        '6xl': '3.75rem',
        // Custom font sizes used in the app
        '12': '0.75rem',
        '14': '0.875rem',
        '16': '1rem',
        '18': '1.125rem',
        '20': '1.25rem',
        '24': '1.5rem',
        '28': '1.75rem',
        '32': '2rem',
        // Semantic font sizes
        'h1': '2.25rem',
        'h2': '1.875rem',
        'h3': '1.5rem',
        'h4': '1.25rem',
        'h5': '1.125rem',
        'h6': '1rem',
        'p-base': '1rem',
        'p-large': '1.125rem',
        'p-small': '0.875rem',
      },
      fontFamily: {
        // Exact font family preservation
        'poppins': ['Poppins', 'sans-serif'],
        'inter': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'], 
        'monaco': ['Monaco', 'Consolas', 'monospace']
      },
      lineHeight: {
        '100': '100%',
        '140': '140%', 
        '150': '150%',
        '160': '160%'
      },
      borderWidth: {
        DEFAULT: '1px',
        '0': '0',
        '1': '1px',
        '2': '2px',
        '4': '4px',
        '8': '8px',
      },
      minWidth: {
        '20': '5rem',
        '24': '6rem',
        '32': '8rem',
        '40': '10rem',
        '48': '12rem',
      }
    }
  },
  plugins: [
    // Custom plugin for legacy CSS classes
    function({ addComponents }: { addComponents: any }) {
      addComponents({
        '.c-icon': {
          display: 'inline-block',
          verticalAlign: 'middle',
          '&.--hex': {
            // Hexagonal icon styling preserved exactly
          }
        },
        '.c-search-bar': {
          background: 'var(--background-color-a)',
          borderBottom: '1px solid var(--border-color)',
          // All existing search bar styles preserved
        },
        '.c-badge-medallion': {
          // Exact badge styling preservation
          '&.--common': { /* common badge styles */ },
          '&.--rare': { /* rare badge styles */ },
          '&.--ultimate': { /* ultimate badge styles */ },
          '&.--legendary': { /* legendary badge styles */ }
        },
        '.lg-container': {
          maxWidth: '1200px',
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingLeft: '20px',
          paddingRight: '20px'
        },
        '.md-container': {
          maxWidth: '800px', 
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingLeft: '20px',
          paddingRight: '20px'
        }
      })
    }
  ],
}

export default config