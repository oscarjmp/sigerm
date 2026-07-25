export const COLORS = {
  brand: {
    primary: "#2968F2",
    primaryHover: "#1F56CE",
    accent: "#FFE600",
    accentHover: "#F7D600",
    sidebar: "#1E3A5F",
    sidebarHover: "#2C537E",
  },

  semantic: {
    success: "#00A650",
    successSoft: "#EAF8F0",
    warning: "#F5A623",
    warningSoft: "#FFF4DB",
    danger: "#F04449",
    dangerSoft: "#FDEBEC",
    info: "#3483FA",
    infoSoft: "#EAF3FF",
  },

  neutral: {
    background: "#F5F7FA",
    surface: "#FFFFFF",
    surfaceMuted: "#F8FAFC",
    border: "#E2E8F0",
    borderStrong: "#CBD5E1",
    text: "#0F172A",
    textSecondary: "#475569",
    textMuted: "#64748B",
    disabled: "#CBD5E1",
  },
} as const;

export type SigermColors = typeof COLORS;