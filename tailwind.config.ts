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
      // You can define custom colors here, if needed
    },
  },
  plugins: [],
};

export default config;