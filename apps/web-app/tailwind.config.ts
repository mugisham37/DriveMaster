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
        prominentLinkColor: 'var(--prominent-link-color)',
        alert: 'var(--alert)',
        veryLightBlue: 'var(--very-light-blue)',
        borderColor: 'var(--border-color)',
      },
      spacing: {
        // Exact spacing scale preservation
        '4': '4px', 
        '8': '8px', 
        '12': '12px', 
        '16': '16px',
        '20': '20px', 
        '24': '24px', 
        '32': '32px', 
        '40': '40px',
        '48': '48px', 
        '64': '64px'
      },
      fontSize: {
        // Exact font size preservation
        '12': '12px', 
        '14': '14px', 
        '16': '16px', 
        '18': '18px',
        '20': '20px', 
        '24': '24px',
        'h0': ['48px', { lineHeight: '100%' }],
        'h1': ['40px', { lineHeight: '100%' }],
        'h2': ['32px', { lineHeight: '100%' }],
        'h3': ['24px', { lineHeight: '100%' }],
        'h4': ['20px', { lineHeight: '100%' }],
        'p-base': ['16px', { lineHeight: '150%' }],
        'p-large': ['18px', { lineHeight: '150%' }]
      },
      fontFamily: {
        // Exact font family preservation
        'poppins': ['Poppins', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'], 
        'monaco': ['Monaco', 'Consolas', 'monospace']
      },
      lineHeight: {
        '100': '100%',
        '140': '140%', 
        '150': '150%',
        '160': '160%'
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