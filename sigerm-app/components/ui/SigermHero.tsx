import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

type SigermHeroProps = {
  etiqueta: string;
  titulo: string;
  descripcion: string;
  icono: ReactNode;
  acciones?: ReactNode;
  indicadores?: ReactNode;
  mensajeInferior?: string;
};

export default function SigermHero({
  etiqueta,
  titulo,
  descripcion,
  icono,
  acciones,
  indicadores,
  mensajeInferior,
}: SigermHeroProps) {
  return (
    <section
      className="
        relative overflow-hidden
        rounded-3xl
        bg-gradient-to-r
        from-[#1E3A5F]
        via-[#285B91]
        to-[#3483FA]
        p-5 text-white
        shadow-xl
        sm:p-8
      "
    >
      {/* Decoración superior */}
      <div
        aria-hidden="true"
        className="
          absolute -right-16 -top-20
          h-52 w-52 rounded-full
          bg-white/10 blur-3xl
        "
      />

      {/* Decoración inferior */}
      <div
        aria-hidden="true"
        className="
          absolute -bottom-24 left-1/3
          h-48 w-48 rounded-full
          bg-[#FFD54F]/10 blur-3xl
        "
      />

      <div
        aria-hidden="true"
        className="
          absolute right-1/4 top-1/2
          h-28 w-28 rounded-full
          bg-[#3483FA]/20 blur-3xl
        "
      />

      <div
        className="
          relative flex flex-col
          gap-7
          xl:flex-row
          xl:items-center
          xl:justify-between
        "
      >
        <div className="min-w-0 flex-1">
          <div
            className="
              inline-flex items-center
              gap-2 rounded-full
              bg-white/15 px-4 py-2
              text-sm font-semibold
              backdrop-blur-sm
            "
          >
            <span
              className="
                flex h-6 w-6
                items-center justify-center
                rounded-lg bg-white/10
              "
            >
              {icono}
            </span>

            <span>{etiqueta}</span>
          </div>

          <h1
            className="
              mt-5 text-3xl
              font-black tracking-tight
              sm:text-4xl
            "
          >
            {titulo}
          </h1>

          <p
            className="
              mt-3 max-w-3xl
              text-sm leading-7
              text-blue-100
              sm:text-base
            "
          >
            {descripcion}
          </p>

          {mensajeInferior && (
            <div
              className="
                mt-5 inline-flex
                items-center gap-2
                rounded-2xl
                bg-white/10
                px-4 py-3
                text-sm text-blue-50
                backdrop-blur-sm
              "
            >
              <Sparkles
                className="
                  h-4 w-4
                  shrink-0
                  text-[#FFD54F]
                "
              />

              <span>{mensajeInferior}</span>
            </div>
          )}

          {acciones && (
            <div
              className="
                mt-6 flex
                flex-col gap-3
                sm:flex-row
                sm:flex-wrap
              "
            >
              {acciones}
            </div>
          )}
        </div>

        {indicadores && (
          <div
            className="
              w-full shrink-0
              xl:w-auto
            "
          >
            {indicadores}
          </div>
        )}
      </div>
    </section>
  );
}