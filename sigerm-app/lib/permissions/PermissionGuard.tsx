"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/lib/hooks/useAuth";
import type { Permiso } from "@/lib/permissions/permissions";

interface Props {
  permiso: Permiso;
  children: ReactNode;
}

export default function PermissionGuard({
  permiso,
  children,
}: Props) {
  const { puede, cargando } = useAuth();

  if (cargando) {
    return null;
  }

  if (!puede(permiso)) {
    return null;
  }

  return <>{children}</>;
}