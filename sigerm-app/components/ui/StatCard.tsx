import type { ReactNode } from "react";

type StatCardProps = {
  titulo: string;
  valor: number | string;
  descripcion?: string;
  icono: ReactNode;
  color?:
    | "blue"
    | "green"
    | "yellow"
    | "red"
    | "purple";
};

const colores = {
  blue: {
    valor: "text-[#2968F2]",
    icono:
      "bg-blue-50 text-[#2968F2]",
  },
  green: {
    valor: "text-emerald-600",
    icono:
      "bg-emerald-50 text-emerald-600",
  },
  yellow: {
    valor: "text-amber-600",
    icono:
      "bg-amber-50 text-amber-600",
  },
  red: {
    valor: "text-red-600",
    icono:
      "bg-red-50 text-red-600",
  },
  purple: {
    valor: "text-violet-600",
    icono:
      "bg-violet-50 text-violet-600",
  },
};

export default function StatCard({
  titulo,
  valor,
  descripcion,
  icono,
  color = "blue",
}: StatCardProps) {
  const estilo = colores[color];

  return (
    <article
      className="
        group relative
        overflow-hidden
        rounded-3xl
        border border-slate-200
        bg-white p-5
        shadow-sm
        transition-all duration-300
        hover:-translate-y-1
        hover:shadow-xl
      "
    >
      {/* Decoración */}
      <div
        aria-hidden="true"
        className="
          absolute -right-12 -top-12
          h-28 w-28 rounded-full
          bg-slate-50
          transition-transform
          duration-500
          group-hover:scale-125
        "
      />

      <div
        className="
          relative flex
          items-start justify-between
          gap-4
        "
      >
        <div className="min-w-0">
          <p
            className="
              text-sm font-semibold
              text-slate-500
            "
          >
            {titulo}
          </p>

          <h2
            className={`
              mt-3 text-4xl
              font-black tracking-tight
              ${estilo.valor}
            `}
          >
            {valor}
          </h2>

          {descripcion && (
            <p
              className="
                mt-2 text-xs
                leading-5
                text-slate-500
              "
            >
              {descripcion}
            </p>
          )}
        </div>

        <div
          className={`
            flex h-14 w-14
            items-center
            justify-center
            rounded-2xl
            shadow-sm
            transition-all duration-300
            group-hover:rotate-3
            group-hover:scale-105
            ${estilo.icono}
          `}
        >
          {icono}
        </div>
      </div>
    </article>
  );
}