import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0b0c0f",
        panel: "#15171c",
        accent: "#7c9cff",
        riesgo: "#e05a4f",
      },
    },
  },
  plugins: [],
};

export default config;
