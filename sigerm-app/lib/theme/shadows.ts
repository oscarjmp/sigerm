export const SHADOWS = {
  sm: "0 1px 2px rgba(15,23,42,.05)",

  md: "0 4px 12px rgba(15,23,42,.08)",

  lg: "0 12px 30px rgba(15,23,42,.10)",

  xl: "0 20px 40px rgba(15,23,42,.15)",

  hover: "0 16px 40px rgba(41,104,242,.15)",
} as const;

export type SigermShadows = typeof SHADOWS;