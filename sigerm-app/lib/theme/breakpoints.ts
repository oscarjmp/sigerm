export const BREAKPOINTS = {
  mobile: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint =
  keyof typeof BREAKPOINTS;

export const RESPONSIVE_RULES = {
  mobileFirst: true,
  touchTargetMinPx: 44,
  contentMaxWidthPx: 1600,
  sidebarDesktopWidthPx: 288,
  modalMobilePaddingPx: 16,
  modalDesktopPaddingPx: 32,
} as const;