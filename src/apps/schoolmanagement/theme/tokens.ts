export const tokens = {
  color: {
    background: "var(--background)",
    foreground: "var(--foreground)",
    card: "var(--card)",
    muted: "var(--muted-foreground)",
    border: "var(--border)",
    destructive: "var(--destructive)",
    chart: ["var(--chart-1)", "var(--chart-2)"],
  },
  font: {
    sans: '"Inter", ui-sans-serif, system-ui, sans-serif',
  },
  type: {
    xs: "0.75rem",
    sm: "0.8125rem",
    base: "0.875rem",
    lg: "1rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
  },
  space: {
    1: "0.25rem",
    2: "0.5rem",
    3: "0.75rem",
    4: "1rem",
    6: "1.5rem",
    8: "2rem",
  },
  radius: {
    sm: "calc(var(--radius) - 4px)",
    md: "calc(var(--radius) - 2px)",
    lg: "var(--radius)",
  },
} as const
