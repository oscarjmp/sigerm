import type { ReactNode } from "react";

type SectionCardProps = {
  titulo?: string;
  descripcion?: string;
  icono?: ReactNode;
  acciones?: ReactNode;
  children: ReactNode;
  className?: string;
  contenidoClassName?: string;
};

export default function SectionCard({
  titulo,
  descripcion,
  icono,
  acciones,
  children,
  className = "",
  contenidoClassName = "",
}: SectionCardProps) {
  const mostrarEncabezado =
    Boolean(titulo) ||
    Boolean(descripcion) ||
    Boolean(icono) ||
    Boolean(acciones);

  return (
    <section
      className={`
        overflow-hidden
        rounded-3xl
        border border-slate-200
        bg-white
        shadow-sm
        transition-shadow
        duration-300
        hover:shadow-lg
        ${className}
      `}
    >
      {mostrarEncabezado && (
        <header
          className="
            flex flex-col gap-4
            border-b border-slate-100
            bg-gradient-to-r
            from-slate-50
            via-white
            to-blue-50/30
            px-5 py-5
            sm:flex-row
            sm:items-center
            sm:justify-between
            sm:px-6
          "
        >
          <div className="flex min-w-0 items-start gap-3">
            {icono && (
              <div
                className="
                  flex h-11 w-11
                  shrink-0 items-center
                  justify-center
                  rounded-2xl
                  bg-blue-50
                  text-[#3483FA]
                  shadow-sm
                "
              >
                {icono}
              </div>
            )}

            <div className="min-w-0">
              {titulo && (
                <h2
                  className="
                    text-xl font-black
                    tracking-tight
                    text-slate-900
                    sm:text-2xl
                  "
                >
                  {titulo}
                </h2>
              )}

              {descripcion && (
                <p
                  className="
                    mt-1 max-w-3xl
                    text-sm leading-6
                    text-slate-500
                  "
                >
                  {descripcion}
                </p>
              )}
            </div>
          </div>

          {acciones && (
            <div
              className="
                flex w-full
                flex-col gap-3
                sm:w-auto
                sm:flex-row
                sm:flex-wrap
                sm:items-center
                sm:justify-end
              "
            >
              {acciones}
            </div>
          )}
        </header>
      )}

      <div
        className={`
          p-4
          sm:p-6
          ${contenidoClassName}
        `}
      >
        {children}
      </div>
    </section>
  );
}