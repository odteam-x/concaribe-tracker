import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        marca: {
          azul: "#1B3A6B",
          "azul-oscuro": "#122748",
          "azul-claro": "#2E5391",
          lima: "#A9C93B",
          "lima-oscuro": "#8AAA26",
        },
        estado: {
          "en-ruta": "#2E5391",
          desviado: "#D97706",
          visitando: "#A9C93B",
          offline: "#94A3B8",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
