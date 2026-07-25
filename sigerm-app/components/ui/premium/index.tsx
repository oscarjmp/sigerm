import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";
import Image from "next/image";
import {
  ImageOff,
  LoaderCircle,
  Package2,
} from "lucide-react";

/* =========================================================
   TARJETA PREMIUM
========================================================= */

type PremiumCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  interactive?: boolean;
};

export function PremiumCard({
  children,
  interactive = false,
  className = "",
  ...props
}: PremiumCardProps) {
  return (
    <div
      className={`
        relative overflow-hidden
        rounded-3xl
        border border-slate-200/80
        bg-white/95
        shadow-[0_12px_35px_rgba(15,23,42,0.07)]
        backdrop-blur-xl
        ${
          interactive
            ? `
              transition-all duration-300
              hover:-translate-y-1
              hover:border-blue-200
              hover:shadow-[0_22px_50px_rgba(30,58,95,0.14)]
            `
            : ""
        }
        ${className}
      `}
      {...props}
    >
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute -right-16 -top-16
          h-36 w-36 rounded-full
          bg-blue-100/50 blur-3xl
        "
      />

      <div className="relative">
        {children}
      </div>
    </div>
  );
}

/* =========================================================
   ENCABEZADO DE SECCIÓN
========================================================= */

type PremiumSectionHeaderProps = {
  etiqueta?: string;
  titulo: string;
  descripcion?: string;
  icono?: ReactNode;
  acciones?: ReactNode;
};

export function PremiumSectionHeader({
  etiqueta,
  titulo,
  descripcion,
  icono,
  acciones,
}: PremiumSectionHeaderProps) {
  return (
    <header
      className="
        flex flex-col gap-4
        border-b border-slate-100
        bg-gradient-to-r
        from-slate-50
        via-white
        to-blue-50/40
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
          {etiqueta && (
            <p
              className="
                text-xs font-black
                uppercase
                tracking-[0.16em]
                text-[#3483FA]
              "
            >
              {etiqueta}
            </p>
          )}

          <h2
            className="
              mt-1 text-xl
              font-black
              tracking-tight
              text-slate-900
              sm:text-2xl
            "
          >
            {titulo}
          </h2>

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
        <div className="shrink-0">
          {acciones}
        </div>
      )}
    </header>
  );
}

/* =========================================================
   BOTÓN PREMIUM
========================================================= */

type VarianteBoton =
  | "primario"
  | "secundario"
  | "peligro"
  | "exito"
  | "vino";

type PremiumButtonProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    variante?: VarianteBoton;
    icono?: ReactNode;
    cargando?: boolean;
    anchoCompleto?: boolean;
  };

const clasesBoton: Record<
  VarianteBoton,
  string
> = {
  primario: `
    bg-gradient-to-r
    from-[#2968F2]
    to-[#3483FA]
    text-white
    shadow-[0_12px_28px_rgba(52,131,250,0.28)]
    hover:shadow-[0_17px_38px_rgba(52,131,250,0.36)]
  `,

  secundario: `
    border border-slate-200
    bg-white
    text-slate-700
    shadow-sm
    hover:border-blue-200
    hover:bg-blue-50
    hover:text-[#3483FA]
  `,

  peligro: `
    bg-gradient-to-r
    from-red-500
    to-rose-600
    text-white
    shadow-[0_12px_28px_rgba(225,29,72,0.22)]
    hover:shadow-[0_17px_38px_rgba(225,29,72,0.30)]
  `,

  exito: `
    bg-gradient-to-r
    from-emerald-500
    to-green-600
    text-white
    shadow-[0_12px_28px_rgba(16,185,129,0.22)]
    hover:shadow-[0_17px_38px_rgba(16,185,129,0.30)]
  `,

  vino: `
    bg-gradient-to-r
    from-[#A12638]
    via-[#8B1E2D]
    to-[#6E1420]
    text-white
    shadow-[0_14px_35px_rgba(139,30,45,0.34)]
    hover:shadow-[0_18px_45px_rgba(139,30,45,0.44)]
  `,
};

export function PremiumButton({
  children,
  variante = "primario",
  icono,
  cargando = false,
  anchoCompleto = false,
  disabled,
  className = "",
  type = "button",
  ...props
}: PremiumButtonProps) {
  const bloqueado = disabled || cargando;

  return (
    <button
      type={type}
      disabled={bloqueado}
      className={`
        group inline-flex min-h-11
        items-center justify-center
        gap-2 rounded-2xl
        px-5 py-3
        text-sm font-black
        transition-all duration-300
        hover:-translate-y-0.5
        active:scale-[0.98]
        focus-visible:outline-none
        focus-visible:ring-4
        focus-visible:ring-blue-100
        disabled:cursor-not-allowed
        disabled:opacity-60
        disabled:hover:translate-y-0
        ${anchoCompleto ? "w-full" : ""}
        ${clasesBoton[variante]}
        ${className}
      `}
      {...props}
    >
      {cargando ? (
        <LoaderCircle
          aria-hidden="true"
          className="h-5 w-5 animate-spin"
        />
      ) : (
        icono
      )}

      <span>{children}</span>
    </button>
  );
}

/* =========================================================
   BADGE PREMIUM
========================================================= */

type VarianteBadge =
  | "azul"
  | "verde"
  | "amarillo"
  | "rojo"
  | "morado"
  | "gris"
  | "vino";

type PremiumBadgeProps = {
  children: ReactNode;
  variante?: VarianteBadge;
  icono?: ReactNode;
  className?: string;
};

const clasesBadge: Record<
  VarianteBadge,
  string
> = {
  azul:
    "border-blue-100 bg-blue-50 text-blue-700",
  verde:
    "border-emerald-100 bg-emerald-50 text-emerald-700",
  amarillo:
    "border-amber-100 bg-amber-50 text-amber-700",
  rojo:
    "border-rose-100 bg-rose-50 text-rose-700",
  morado:
    "border-violet-100 bg-violet-50 text-violet-700",
  gris:
    "border-slate-200 bg-slate-100 text-slate-600",
  vino:
    "border-rose-200 bg-[#8B1E2D]/10 text-[#8B1E2D]",
};

export function PremiumBadge({
  children,
  variante = "azul",
  icono,
  className = "",
}: PremiumBadgeProps) {
  return (
    <span
      className={`
        inline-flex max-w-full
        items-center gap-2
        rounded-full border
        px-3 py-1.5
        text-xs font-black
        ${clasesBadge[variante]}
        ${className}
      `}
    >
      {icono}

      <span className="truncate">
        {children}
      </span>
    </span>
  );
}

/* =========================================================
   FOTO PREMIUM
========================================================= */

type PremiumImageProps = {
  src: string | null | undefined;
  alt: string;
  priority?: boolean;
  fallback?: ReactNode;
  sizes?: string;
  className?: string;
};

export function PremiumImage({
  src,
  alt,
  priority = false,
  fallback,
  sizes = `
    (max-width: 640px) 100vw,
    (max-width: 1280px) 50vw,
    33vw
  `,
  className = "",
}: PremiumImageProps) {
  return (
    <div
      className={`
        group relative
        aspect-[4/3]
        w-full overflow-hidden
        bg-slate-100
        ${className}
      `}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          loading={
            priority ? "eager" : "lazy"
          }
          sizes={sizes}
          className="
            object-cover object-center
            transition-transform
            duration-500
            group-hover:scale-105
          "
        />
      ) : (
        <div
          className="
            flex h-full w-full
            items-center justify-center
            bg-gradient-to-br
            from-blue-100
            via-white
            to-amber-100
          "
        >
          {fallback ?? (
            <div
              className="
                flex h-20 w-20
                items-center justify-center
                rounded-3xl
                bg-white/90
                text-slate-400
                shadow-xl
                backdrop-blur-sm
              "
            >
              <ImageOff
                aria-hidden="true"
                className="h-9 w-9"
              />
            </div>
          )}
        </div>
      )}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute inset-0
          bg-gradient-to-t
          from-black/25
          via-transparent
          to-transparent
          opacity-0
          transition-opacity
          duration-300
          group-hover:opacity-100
        "
      />
    </div>
  );
}

/* =========================================================
   ESTADO VACÍO
========================================================= */

type PremiumEmptyStateProps = {
  titulo: string;
  descripcion: string;
  icono?: ReactNode;
  accion?: ReactNode;
};

export function PremiumEmptyState({
  titulo,
  descripcion,
  icono,
  accion,
}: PremiumEmptyStateProps) {
  return (
    <div
      className="
        flex min-h-80
        flex-col items-center
        justify-center
        rounded-3xl
        border border-dashed
        border-slate-200
        bg-gradient-to-br
        from-white
        to-slate-50
        px-6 py-14
        text-center
      "
    >
      <div
        className="
          flex h-16 w-16
          items-center justify-center
          rounded-3xl
          bg-blue-50
          text-[#3483FA]
          shadow-sm
        "
      >
        {icono ?? (
          <Package2
            aria-hidden="true"
            className="h-8 w-8"
          />
        )}
      </div>

      <h2
        className="
          mt-5 text-xl
          font-black
          text-slate-800
        "
      >
        {titulo}
      </h2>

      <p
        className="
          mt-2 max-w-md
          text-sm leading-6
          text-slate-500
        "
      >
        {descripcion}
      </p>

      {accion && (
        <div className="mt-6">
          {accion}
        </div>
      )}
    </div>
  );
}