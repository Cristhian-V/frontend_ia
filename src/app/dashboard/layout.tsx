"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useEffect, useState, useMemo } from "react";
import { TOOL_KEYS, TOOL_LABELS, ROLES } from "@/lib/tools";
import {
  Bot,
  MessageSquare,
  FileText,
  History,
  Pin,
  CheckSquare,
  ScanText,
  Calculator,
  Settings,
  Users,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const allSections = [
  {
    key: TOOL_KEYS[0],
    label: TOOL_LABELS[TOOL_KEYS[0]],
    icon: Bot,
    items: [
      { label: "Chat", href: "/dashboard/chat", icon: MessageSquare },
      { label: "Documentos", href: "/dashboard/documentos", icon: FileText },
      { label: "Historial", href: "/dashboard/historial", icon: History },
      { label: "Pendientes", href: "/dashboard/pendientes", icon: Pin },
      { label: "Checklist", href: "/dashboard/checklist", icon: CheckSquare },
      { label: "OCR Extractor", href: "/dashboard/ocr-extractor", icon: ScanText },
    ],
  },
  {
    key: TOOL_KEYS[1],
    label: TOOL_LABELS[TOOL_KEYS[1]],
    icon: Calculator,
    items: [],
  },
];

const LogoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
    <path d="M8 9h8" />
    <path d="M10 13h4" />
    <path d="M12 22v-9" />
    <path d="m9 22 2-9h2l2 9" />
    <path d="M11 5.5a1.5 1.5 0 0 1 2 0 1.5 1.5 0 0 1-2 0Z" />
    <path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1h20v1Z" />
    <path d="M18 16V9a6 6 0 0 0-12 0v7" />
  </svg>
);

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

  const navSections = useMemo(() => {
    if (!user) return [];
    const isAdmin = user.is_admin;
    const userToolKeys = new Set(user.tools.map((t) => t.tool_key));

    const sections = allSections
      .filter((s) => isAdmin || userToolKeys.has(s.key))
      .map((s) => {
        const cloned = { ...s, items: [...s.items] };

        if (!isAdmin && s.key === TOOL_KEYS[0]) {
          const agenteTool = user.tools.find((t) => t.tool_key === TOOL_KEYS[0]);
          if (agenteTool?.role === ROLES[0]) {
            cloned.items = cloned.items.filter((i) =>
              ["Chat", "Historial"].includes(i.label)
            );
          }
        }

        return cloned;
      });

    if (isAdmin) {
      sections.push({
        key: "admin",
        label: "Configuraciones",
        icon: Settings,
        items: [
          { label: "Usuarios", href: "/dashboard/configuraciones", icon: Users },
        ],
      } as any);
    }

    return sections;
  }, [user]);

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
        <div className="h-20 flex items-center px-4 border-b border-faro-border gap-3 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
            <LogoIcon />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-widest text-cyan-400 text-lg leading-none">
              F.A.R.O.
            </span>
            <span className="text-[9px] text-faro-text uppercase tracking-wider mt-1 leading-tight">
              Framework de Asistencia,<br />Respuesta y Operaciones
            </span>
          </div>
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
                                ? "text-white bg-white/5 font-medium"
                                : "text-faro-text hover:text-white hover:bg-white/5"
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
