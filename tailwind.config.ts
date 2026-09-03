import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#FFF9F2",
          100: "#FFF0DD",
          200: "#FFD6A3",
          300: "#FFB866",
        },
        cocoa: {
          700: "#332015",
          800: "#111111",
          900: "#000000",
        },
        terracotta: {
          400: "#FF9F1C",
          500: "#F97316",
          600: "#C2410C",
        },
        sage: {
          400: "#8A9A74",
          500: "#6B7F5A",
          600: "#556547",
        },
        gold: {
          400: "#FFC857",
          500: "#F59E0B",
          600: "#C26A00",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 12px 40px -18px rgba(44, 24, 16, 0.25)",
        soft: "0 8px 30px -12px rgba(44, 24, 16, 0.18)",
      },
    },
  },
  plugins: [],
};
export default config;
