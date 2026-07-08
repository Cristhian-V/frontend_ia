"use client";

interface ErrorBannerProps {
  message: string;
  className?: string;
}

export function ErrorBanner({ message, className = "" }: ErrorBannerProps) {
  return (
    <div className={`mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-400 ${className}`}>
      {message}
    </div>
  );
}
