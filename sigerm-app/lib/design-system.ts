/**
 * ============================================================
 * SIGERM DESIGN SYSTEM
 * ============================================================
 * Identidad visual oficial del sistema.
 *
 * No utilizar colores o medidas "quemadas" en los componentes.
 * Todo debe obtenerse desde este archivo.
 * ============================================================
 */

export const SIGERM = {
  colors: {
    primary: "#3483FA",
    primaryDark: "#1E3A5F",
    primaryLight: "#5C9BFF",

    secondary: "#FFD54F",

    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#0EA5E9",

    background: "#EEF3F8",

    white: "#FFFFFF",

    text: {
      primary: "#0F172A",
      secondary: "#475569",
      muted: "#94A3B8",
    },
  },

  radius: {
    xs: "0.5rem",
    sm: "0.75rem",
    md: "1rem",
    lg: "1.25rem",
    xl: "1.5rem",
    hero: "2rem",
  },

  shadow: {
    sm: "0 1px 3px rgba(15,23,42,.08)",

    md: "0 8px 24px rgba(15,23,42,.08)",

    lg: "0 20px 40px rgba(15,23,42,.12)",

    hero:
      "0 25px 50px rgba(30,58,95,.18)",
  },

  transition: {
    fast: "150ms",
    normal: "300ms",
    slow: "500ms",
  },

  spacing: {
    section: "2rem",
    card: "1.5rem",
    hero: "2rem",
  },

  icon: {
    sm: 18,
    md: 22,
    lg: 28,
    xl: 36,
  },

  gradient: {
    hero:
      "linear-gradient(90deg,#1E3A5F 0%,#285B91 50%,#3483FA 100%)",
  },
} as const;

export type SigermTheme =
  typeof SIGERM;