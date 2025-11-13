/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#dc2626',
          hover: '#b91c1c',
        },
        background: '#000000',
        foreground: '#ffffff',
        secondary: '#1a1a1a',
        card: '#0f0f0f',
        border: '#2a2a2a',
        muted: '#666666',
      },
    },
  },
  plugins: [],
}

