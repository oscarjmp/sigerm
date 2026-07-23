"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";

import { AuthProvider } from "@/lib/contexts/AuthContext";

type ProvidersProps = {
  children: ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      {children}

      <Toaster
        position="top-right"
        richColors
        expand
        closeButton
        duration={3000}
      />
    </AuthProvider>
  );
}