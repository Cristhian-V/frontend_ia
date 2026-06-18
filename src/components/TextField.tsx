"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, className = "", ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</label>
        )}
        <input
          ref={ref}
          className={`w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none ${className}`}
          {...props}
        />
      </div>
    );
  }
);

TextField.displayName = "TextField";
