import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#10b981', dark: '#059669', accent: '#f59e0b' },
      },
    },
  },
  plugins: [],
};
export default config;
