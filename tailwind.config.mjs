/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'nova-vermelho': '#B91C1C',
        'nova-bege': '#F5F5DC',
      },
      fontFamily: {
        poppins: ['var(--font-poppins)'],
      },
    },
  },
  plugins: [],
};