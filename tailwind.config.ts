import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gore: {
          primary: "#91000A",
          "on-primary": "#FFFFFF",
          "primary-container": "#B71C1C",
          "on-primary-container": "#FFCAC4",
          error: "#BA1A1A",
          "error-container": "#FFDAD6",
          "on-error-container": "#93000A",
          bg: "#F9F9F9",
          surface: "#F9F9F9",
          "on-surface": "#1A1C1C",
          "on-surface-variant": "#5B403D",
          outline: "#8F706C",
          "outline-variant": "#E4BEB9",
          "surface-lowest": "#FFFFFF",
          "surface-low": "#F3F3F3",
          "surface-container": "#EEEEEE",
          "surface-high": "#E8E8E8",
          "surface-highest": "#E2E2E2",
          secondary: "#5F5E5E",
          tertiary: "#444646",
        },
      },
      fontFamily: {
        sans: ["'Atkinson Hyperlegible Next'", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 8px rgba(145, 0, 10, 0.06), 0 1px 3px rgba(0, 0, 0, 0.05)",
        "card-hover": "0 8px 24px rgba(145, 0, 10, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)",
        modal: "0 20px 40px rgba(0, 0, 0, 0.2)",
      },
    },
  },
  plugins: [],
};

export default config;
