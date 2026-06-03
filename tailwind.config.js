/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Jellybeans-inspired: off-black UI with beige/warm accent
        bg: {
          dark: "#0d0d0d",
          primary: "#151515", 
          secondary: "#1a1a1a",
          tertiary: "#222222",
          hover: "#2a2a2a",
        },
        text: {
          primary: "#e8dcc8",    // Warm beige
          secondary: "#a89968",  // Darker beige
          muted: "#7a7560",      // Muted beige-gray
          accent: "#b8956a",     // Mid-tone brown
        },
        border: {
          light: "#2a2a2a",
          dark: "#1a1a1a",
        },
        // Subtle color hints (very muted)
        accent: {
          warm: "#d4a574",       // Subtle warm tone (not red/orange)
          cool: "#8a9fb9",       // Subtle cool tone (not pure blue)
          green: "#7a8a6f",      // Subtle green (desaturated)
          purple: "#7a6f8a",     // Subtle purple (desaturated)
        },
        // For encryption visualization layers
        crypto: {
          layer1: "#8a9fb9",     // KDF layer - cool blue
          layer2: "#b8956a",     // AES layer - warm brown
          layer3: "#7a8a6f",     // Quantum layer - subtle green
        },
        status: {
          success: "#7a8a6f",
          warning: "#a89968",
          error: "#a85a5a",
          info: "#8a9fb9",
        }
      },
      fontFamily: {
        sans: ['"Inter"', '"Open Sans"', 'system-ui', 'sans-serif'],
        mono: ['Menlo', 'Monaco', 'Consolas', '"Courier New"', 'monospace'],
      },
      animation: {
        'pulse-gentle': 'pulse-gentle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'hash-reveal': 'hash-reveal 0.8s ease-out',
        'encryption-flow': 'encryption-flow 1.2s ease-in-out',
      },
      keyframes: {
        'pulse-gentle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'hash-reveal': {
          '0%': { 
            opacity: '0',
            transform: 'translateY(10px) scaleY(0.9)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0) scaleY(1)'
          },
        },
        'encryption-flow': {
          '0%': {
            opacity: '0',
            transform: 'translateX(-20px)'
          },
          '50%': {
            opacity: '1',
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0)'
          },
        },
      },
      boxShadow: {
        'glow-subtle': '0 0 16px rgba(184, 149, 106, 0.15)',
        'glow-accent': '0 0 12px rgba(138, 159, 185, 0.2)',
      },
      borderRadius: {
        'sm': '2px',
        'md': '4px',
        'lg': '6px',
      }
    },
  },
  plugins: [],
}
