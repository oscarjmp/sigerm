"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/lib/hooks/useAuth";
import type { Permiso } from "@/lib/permissions/permissions";

type CanProps = {
  permiso: Permiso;
  children: ReactNode;
  fallback?: ReactNode;
};

export default function Can({
  permiso,
  children,
  fallback = null,
}: CanProps) {
  const {
    cargando,
    estaAutenticado,
    puede,
  } = useAuth();

  if (
    cargando ||
    !estaAutenticado ||
    !puede(permiso)
  ) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}