"use client";

import { HTMLAttributes } from "react";
import clsx from "clsx";

export interface CardProps
  extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export default function Card({
  className,
  hover = true,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={clsx(
        `
        rounded-3xl
        bg-white
        border
        border-slate-200
        shadow-sm
        p-6
        transition-all
        duration-300
        `,
        hover &&
          `
          hover:-translate-y-1
          hover:shadow-xl
          hover:border-blue-200
        `,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}