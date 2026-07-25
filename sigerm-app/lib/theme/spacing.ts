export const SPACING = {
  none: "0",
  xs: "0.25rem",
  sm: "0.5rem",
  md: "0.75rem",
  base: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
  "3xl": "4rem",
  "4xl": "6rem",
} as const;

export const LAYOUT_SPACING = {
  pageMobile: "1rem",
  pageTablet: "1.5rem",
  pageDesktop: "2rem",
  sectionGapMobile: "1.5rem",
  sectionGapDesktop: "2rem",
  cardPaddingMobile: "1rem",
  cardPaddingDesktop: "1.5rem",
  gridGapMobile: "1rem",
  gridGapDesktop: "1.5rem",
} as const;

export type SigermSpacing = typeof SPACING;