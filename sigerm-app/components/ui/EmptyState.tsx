import { FolderOpen } from "lucide-react";
export default function EmptyState({ titulo, descripcion }: { titulo: string; descripcion?: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center">
    <FolderOpen aria-hidden="true" className="mx-auto mb-4 text-blue-500" size={32} />
    <h3 className="font-bold text-slate-800">{titulo}</h3>
    {descripcion && <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{descripcion}</p>}
  </div>;
}
