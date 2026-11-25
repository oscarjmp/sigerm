import { LoaderCircle } from "lucide-react";
export default function Loader({ mensaje = "Cargando información…" }: { mensaje?: string }) {
  return <div role="status" className="flex items-center justify-center gap-3 p-10 text-slate-600"><LoaderCircle aria-hidden="true" className="animate-spin" />{mensaje}</div>;
}
