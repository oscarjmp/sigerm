"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "danger";

type Size =
  | "sm"
  | "md"
  | "lg";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[#FFE600] text-slate-900 hover:bg-[#F7D600] shadow-md",

  secondary:
    "bg-[#2968F2] text-white hover:bg-[#1F56CE] shadow-md",

  outline:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",

  danger:
    "bg-[#F04449] text-white hover:bg-[#D9363E]",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",

  md: "h-11 px-6 text-base",

  lg: "h-14 px-8 text-lg",
};

const Button = forwardRef<
  HTMLButtonElement,
  ButtonProps
>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          "inline-flex items-center justify-center rounded-2xl font-semibold transition-all duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 hover:-translate-y-0.5",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading ? "Cargando..." : children}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;