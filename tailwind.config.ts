import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './charts/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        soft: '#f6f7f9',
      },
      boxShadow: {
        card: '0 8px 24px rgba(15,23,42,0.06)',
      },
    },
  },
  plugins: [],
} satisfies Config;
