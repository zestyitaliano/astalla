import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "../../packages/shared/src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-base)", "Inter", "sans-serif"],
        heading: ["var(--font-heading)", "PP Formula Condensed Bold", "sans-serif"]
      },
      colors: {
        bg: "hsl(var(--bg))",
        card: {
          DEFAULT: "hsl(var(--card))",
          contrast: "hsl(var(--card-contrast))",
          foreground: "hsl(var(--card-foreground))"
        },
        text: "hsl(var(--text))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        border: "hsl(var(--border))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--text))"
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        danger: "hsl(var(--danger))",
        destructive: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "hsl(var(--danger-foreground))"
        },
        background: "hsl(var(--bg))",
        foreground: "hsl(var(--text))",
        input: "hsl(var(--border))",
        ring: "hsl(var(--ring))"
      },
      borderRadius: {
        xl: "18px",
        lg: "14px",
        md: "12px",
        sm: "10px"
      },
      boxShadow: {
        card: "0 10px 30px -18px rgba(15, 23, 42, 0.35), 0 12px 24px -20px rgba(15, 23, 42, 0.28)",
        cardHover: "0 20px 40px -20px rgba(15, 23, 42, 0.4), 0 18px 32px -24px rgba(15, 23, 42, 0.35)"
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
