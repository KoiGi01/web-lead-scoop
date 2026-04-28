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
        heading:  ["'Archivo'", "'Space Grotesk'", "sans-serif"],
        display:  ["'Archivo'", "system-ui", "sans-serif"],
        serif:    ["'Newsreader'", "'Times New Roman'", "serif"],
        body:     ["'Inter'", "sans-serif"],
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

        // ── Landing page palette (v5 design) ─────────────────────────────────
        // Pure black ground + bone paper + electric yellow accent
        paper: {
          DEFAULT: "#EFEDE6",
          dim:     "#A8A59C",
          mid:     "#67645B",
          low:     "#3A3833",
        },
        lemon: {
          DEFAULT: "#F5FF3D",
          soft:    "#FFFE7A",
        },

        // ── App palette (wine/petrol/cream) ───────────────────────────────────
        // Deep aubergine wine — accent, links, badges, logo mark
        wine: {
          50:  "#F9EFF5",
          100: "#F0DAE6",
          200: "#E0B5CC",
          300: "#C788A7",
          400: "#A05F84",
          500: "#7A3D63",
          600: "#5E2D4B",
          700: "#4D243D",
          800: "#3A1B2E",
          900: "#251220",
        },
        // Deep teal-black — primary dark background canvas
        petrol: {
          50:  "#E0F0F2",
          100: "#B5DBDF",
          200: "#7FB9C0",
          300: "#4D9099",
          400: "#2C6B73",
          500: "#1A4F56",
          600: "#0F3A40",
          700: "#082E33",
          800: "#042B2F",
          900: "#00272B",
          950: "#001A1D",
        },
        // Warm parchment cream — primary text on dark, light theme surfaces
        cream: {
          50:  "#FAF5EC",
          100: "#ECDCC9",
          200: "#DCC5A8",
          300: "#C5A983",
          400: "#A88862",
          500: "#8B6B47",
          600: "#6E5436",
          700: "#523F28",
          800: "#3A2C1C",
          900: "#1F1810",
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
