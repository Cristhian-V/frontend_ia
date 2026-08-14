"use client";

import { useTheme } from "@/context/ThemeContext";
import logodia from "@/images/Logo Cumbre dia.png";
import logonoche from "@/images/Logo Cumbre noche.png";

export default function Logo({ className = "" }: { className?: string }) {
  const { dark } = useTheme();
  const src = dark ? logonoche : logodia;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src.src} alt="Hermes" className={`h-auto w-auto ${className}`} />
  );
}
