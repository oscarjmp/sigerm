export const RADIUS = {
  none: "0",
  sm: "0.375rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.5rem",
  "2xl": "2rem",
  full: "9999px",

  button: "1rem",
  input: "1rem",
  card: "1.5rem",
  modal: "2rem",
  badge: "9999px",
} as const;

export type SigermRadius = typeof RADIUS;