"use client";

import { ReactNode } from "react";

interface EmptyStateProps {
  children: ReactNode;
  className?: string;
}

export function EmptyState({ children, className = "" }: EmptyStateProps) {
  return (
    <div className={`rounded-xl border border-dashed border-faro-border bg-faro-surface p-12 text-center ${className}`}>
      {children}
    </div>
  );
}
