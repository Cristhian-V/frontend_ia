"use client";

import { ReactNode } from "react";

interface EmptyStateProps {
  children: ReactNode;
  className?: string;
}

export function EmptyState({ children, className = "" }: EmptyStateProps) {
  return (
    <div className={`rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-12 text-center ${className}`}>
      {children}
    </div>
  );
}
