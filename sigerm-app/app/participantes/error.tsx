"use client";
import Button from "@/components/ui/button";
export default function ErrorOperacion({ reset }: { reset: () => void }) {
  return <div role="alert" className="mx-auto max-w-xl space-y-4 p-8">
    <h2 className="text-xl font-bold">No fue posible abrir el módulo</h2>
    <p className="text-slate-600">Intenta cargar la información nuevamente.</p>
    <Button onClick={reset}>Reintentar</Button>
  </div>;
}
