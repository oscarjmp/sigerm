"use client";
import type { InputHTMLAttributes } from "react";
import { Search } from "lucide-react";
export default function SearchInput({ "aria-label": label = "Buscar registros", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3">
    <Search size={18} aria-hidden="true" className="shrink-0 text-slate-400" />
    <input {...props} type="search" aria-label={label} className="min-h-11 w-full min-w-0 bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-blue-500" />
  </label>;
}
