"use client";

import { ReactNode } from "react";
import clsx from "clsx";

interface PageHeaderProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export default function PageHeader({
  icon,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={clsx(
        `
        flex
        flex-col
        gap-6
        lg:flex-row
        lg:items-center
        lg:justify-between
        `,
        className,
      )}
    >
      <div className="flex items-start gap-4">

        {icon && (
          <div
            className="
              flex
              h-16
              w-16
              items-center
              justify-center
              rounded-3xl
              bg-blue-50
              text-[#2968F2]
              shadow-sm
              shrink-0
            "
          >
            {icon}
          </div>
        )}

        <div>

          <h1
            className="
              text-3xl
              md:text-4xl
              font-bold
              text-slate-900
            "
          >
            {title}
          </h1>

          {description && (

            <p
              className="
                mt-2
                max-w-3xl
                text-slate-500
                text-sm
                md:text-base
                leading-7
              "
            >
              {description}
            </p>

          )}

        </div>

      </div>

      {actions && (

        <div
          className="
            flex
            flex-wrap
            gap-3
            justify-start
            lg:justify-end
          "
        >
          {actions}
        </div>

      )}

    </header>
  );
}