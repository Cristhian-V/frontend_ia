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
          <label className="mb-1 block text-xs font-medium text-faro-text">{label}</label>
        )}
        <input
          ref={ref}
          className={`w-full rounded-lg border border-faro-border bg-faro-bg px-3 py-2 text-sm text-faro-textlight focus:border-blue-500 focus:outline-none ${className}`}
          {...props}
        />
      </div>
    );
  }
);

TextField.displayName = "TextField";
