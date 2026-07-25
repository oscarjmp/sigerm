export const TYPOGRAPHY = {
  h1: {
    size: "2.5rem",
    weight: 700,
  },

  h2: {
    size: "2rem",
    weight: 700,
  },

  h3: {
    size: "1.5rem",
    weight: 600,
  },

  title: {
    size: "1.25rem",
    weight: 600,
  },

  body: {
    size: "1rem",
    weight: 400,
  },

  small: {
    size: "0.875rem",
    weight: 400,
  },

  caption: {
    size: "0.75rem",
    weight: 400,
  },
} as const;

export type SigermTypography =
  typeof TYPOGRAPHY;