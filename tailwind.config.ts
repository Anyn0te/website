import defaultTheme from 'tailwindcss/defaultTheme';
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/components/*.{js,ts,jsx,tsx}',
    './app/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-excalifont)', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
};

export default config;
