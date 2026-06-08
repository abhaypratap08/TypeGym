import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary:   '#0d1117',
          secondary: '#161b22',
          elevated:  '#1c2128',
        },
        accent: {
          blue:   '#58a6ff',
          neon:   '#79c0ff',
          purple: '#bc8cff',
          green:  '#3fb950',
          red:    '#f85149',
          orange: '#d29922',
        },
        text: {
          primary:   '#e6edf3',
          secondary: '#8b949e',
          muted:     '#48576a',
          dim:       '#30363d',
        },
        border: {
          default: '#30363d',
          subtle:  '#21262d',
        },
      },
      fontFamily: {
        mono: ['var(--font-jetbrains-mono)', 'Fira Code', 'monospace'],
        sans: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'cursor-blink': 'blink 1.1s step-end infinite',
        'fade-in':      'fadeIn 0.3s ease-out',
        'slide-up':     'slideUp 0.4s ease-out',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
