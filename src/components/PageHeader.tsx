"use client";

import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{title}</h1>
        {subtitle && <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
