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
        <h1 className="text-2xl font-bold text-faro-textlight">{title}</h1>
        {subtitle && <p className="text-sm text-faro-text mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
