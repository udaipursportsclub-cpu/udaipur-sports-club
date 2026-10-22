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
        surface: "var(--surface)",
        "surface-raised": "var(--surface-raised)",
        content: "var(--content)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        "accent-on": "var(--accent-on)",
        border: "var(--border)",
        amber: "var(--amber)",
      },
    },
  },
  plugins: [],
};
export default config;
