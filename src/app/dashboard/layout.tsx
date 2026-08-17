"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useEffect, useState, useMemo } from "react";
import Logo from "@/components/Logo";
import { buildNavSections } from "@/lib/navigation";
import {
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const { dark, toggle } = useTheme();
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  const navSections = useMemo(() => buildNavSections(user), [user]);

  const toggleSection = (idx: number) => {
    const next = new Set(expanded);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setExpanded(next);
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user && user.must_change_password) {
      router.push("/cambiar-contrasena");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-faro-text">
        Cargando...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const isActive = (href: string) => pathname === href;
  const isSectionActive = (items: { href: string }[]) =>
    items.some((item) => isActive(item.href));

  return (
    <div className="flex min-h-screen bg-faro-bg">
      <aside className="flex w-64 flex-col bg-faro-sidebar border-r border-faro-border">
        <div className="h-20 flex items-center px-4 border-b border-faro-border shrink-0">
          <Logo className="h-10" />
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navSections.map((section, sIdx) => {
            const Icon = section.icon;
            const active = isSectionActive(section.items);
            const isLast = sIdx === navSections.length - 1;

            return (
              <div key={sIdx}>
                <button
                  onClick={() => toggleSection(sIdx)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md hover:bg-white/5 transition-colors group ${
                    active ? "text-faro-textlight" : "text-faro-text hover:text-faro-textlight"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-5 h-5 ${
                        active && sIdx === navSections.length - 1
                          ? "text-cyan-400"
                          : "text-faro-text group-hover:text-faro-textlight transition-colors"
                      }`}
                    />
                    <span>{section.label}</span>
                  </div>
                  {expanded.has(sIdx) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                {expanded.has(sIdx) && section.items.length > 0 && (
                  <ul className="mt-1 space-y-1 ml-6 pl-3 border-l border-faro-border/50 relative">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      const activeItem = isActive(item.href);
                      return (
                        <li key={item.href} className="relative">
                          {activeItem && (
                            <div className="absolute left-[-13px] top-[8px] w-[2px] h-4 bg-cyan-400 rounded-r" />
                          )}
                          <button
                            onClick={() => router.push(item.href)}
                            className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors w-full text-left ${
                              activeItem
                                ? "text-faro-textlight bg-black/5 dark:bg-white/5 font-medium"
                                : "text-faro-text hover:text-faro-textlight hover:bg-black/5 dark:hover:bg-white/5"
                            }`}
                          >
                            <ItemIcon
                              className={`w-4 h-4 ${
                                item.label === "Pendientes"
                                  ? "text-red-400"
                                  : item.label === "Checklist"
                                  ? "text-green-400"
                                  : ""
                              }`}
                            />
                            {item.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {expanded.has(sIdx) && section.items.length === 0 && (
                  <div className="ml-7 border-l border-faro-border/50 pl-3 py-2">
                    <p className="text-xs text-faro-text/60">Proximamente</p>
                  </div>
                )}

                {isLast && <div className="mt-4 pt-4 border-t border-faro-border/50" />}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-faro-border space-y-4 shrink-0">
          <button
            onClick={toggle}
            className="flex items-center gap-3 text-sm text-faro-text hover:text-faro-textlight transition-colors"
          >
            {dark ? (
              <Sun className="w-4 h-4 text-yellow-500" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
            {dark ? "Modo claro" : "Modo oscuro"}
          </button>

          <div className="flex flex-col gap-1 pt-2">
            <span className="text-sm font-semibold text-faro-textlight truncate">
              {user.full_name}
            </span>
            <span className="text-xs text-faro-text truncate">{user.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors mt-2"
            >
              <LogOut className="w-3 h-3" />
              Cerrar sesion
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
