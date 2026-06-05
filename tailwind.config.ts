import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        heading:  ["'Bricolage Grotesque'", "system-ui", "sans-serif"],
        display:  ["'Bricolage Grotesque'", "system-ui", "sans-serif"],
        serif:    ["'Newsreader'", "'Times New Roman'", "serif"],
        body:     ["'Hanken Grotesk'", "sans-serif"],
        sans:     ["'Hanken Grotesk'", "system-ui", "sans-serif"],
        mono:     ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      colors: {
        // shadcn semantic tokens (resolved via CSS vars)
        border:     "hsl(var(--border))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT:              "hsl(var(--sidebar-background))",
          foreground:           "hsl(var(--sidebar-foreground))",
          primary:              "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent:               "hsl(var(--sidebar-accent))",
          "accent-foreground":  "hsl(var(--sidebar-accent-foreground))",
          border:               "hsl(var(--sidebar-border))",
          ring:                 "hsl(var(--sidebar-ring))",
        },

        // ── "Instrument" workspace palette ───────────────────────────────────
        // near-black ground + cool-grey text + citron accent
        black:   "#0a0b0e",   // remap canvas: bg-black/text-black -> near-black
        paper: {
          DEFAULT: "#f3f5f8",
          dim:     "#9aa3b2",
          mid:     "#5d6675",
          low:     "#3a414e",
        },
        lemon: {
          DEFAULT: "#e8fb52",
          soft:    "#f3ff8a",
        },

        // ── Legacy app scales, remapped to the "Instrument" system ────────────
        // wine -> citron accent
        wine: {
          50:  "#fbffe0",
          100: "#f6ffc0",
          200: "#f1ff97",
          300: "#f3ff8a",
          400: "#edfd6e",
          500: "#e8fb52",
          600: "#d4e83f",
          700: "#c9e02f",
          800: "#a3b71f",
          900: "#7c8c14",
        },
        // petrol -> cool near-black surface scale
        petrol: {
          50:  "#e9edf3",
          100: "#c3c9d4",
          200: "#9aa3b2",
          300: "#5d6675",
          400: "#3a414e",
          500: "#272c38",
          600: "#1d212c",
          700: "#161922",
          800: "#111319",
          900: "#0a0b0e",
          950: "#07080a",
        },
        // cream -> cool light-grey text scale
        cream: {
          50:  "#ffffff",
          100: "#f3f5f8",
          200: "#e3e7ee",
          300: "#9aa3b2",
          400: "#7b8494",
          500: "#5d6675",
          600: "#474e5b",
          700: "#343a45",
          800: "#21262f",
          900: "#12151b",
        },
      },

      borderRadius: {
        xs:      "2px",
        sm:      "6px",
        DEFAULT: "8px",
        md:      "8px",
        lg:      "12px",
        xl:      "16px",
        "2xl":   "20px",
        "3xl":   "24px",
        full:    "9999px",
      },

      keyframes: {
        "march": {
          from: { transform: "translateX(0)" },
          to:   { transform: "translateX(-50%)" },
        },
        "lift": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-10px)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.4" },
        },
        "caret-blink": {
          "50%": { opacity: "0" },
        },
        "pulse-btn": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(245,255,61,0)" },
          "50%":      { boxShadow: "0 0 0 8px rgba(245,255,61,0.18)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "row-in": {
          from: { opacity: "0", transform: "translateX(-6px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "section-in": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },

      animation: {
        "march":       "march 60s linear infinite",
        "march-fast":  "march 50s linear infinite",
        "lift":        "lift 2.4s ease-in-out infinite",
        "pulse-dot":   "pulse-dot 1.6s ease-in-out infinite",
        "caret-blink": "caret-blink 1s steps(2) infinite",
        "pulse-btn":   "pulse-btn 1.4s ease-in-out infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "fade-in-up":     "fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in":        "fade-in 0.4s ease both",
        "row-in":         "row-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        "section-in":     "section-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
