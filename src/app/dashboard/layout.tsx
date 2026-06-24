"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useEffect, useState, useMemo } from "react";
import { TOOL_KEYS, TOOL_LABELS, ROLES } from "@/lib/tools";

const allSections = [
  {
    key: TOOL_KEYS[0],
    label: TOOL_LABELS[TOOL_KEYS[0]],
    icon: "🤖",
    items: [
      { label: "Chat", href: "/dashboard/chat", icon: "💬" },
      { label: "Documentos", href: "/dashboard/documentos", icon: "📄" },
      { label: "Historial", href: "/dashboard/historial", icon: "📋" },
      { label: "Pendientes", href: "/dashboard/pendientes", icon: "📌" },
      { label: "Checklist", href: "/dashboard/checklist", icon: "✅" },
      { label: "OCR Extractor", href: "/dashboard/ocr-extractor", icon: "🔍" },
    ],
  },
  {
    key: TOOL_KEYS[1],
    label: TOOL_LABELS[TOOL_KEYS[1]],
    icon: "🧮",
    items: [],
  },
];

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
    const userToolKeys = new Set(user.tools.map(t => t.tool_key));

    const sections = allSections
      .filter((s) => isAdmin || userToolKeys.has(s.key))
      .map((s) => {
        const cloned = { ...s, items: [...s.items] };

        // Role-based filtering: consultor only sees Chat + Historial
        if (!isAdmin && s.key === TOOL_KEYS[0]) {
          const agenteTool = user.tools.find(t => t.tool_key === TOOL_KEYS[0]);
          if (agenteTool?.role === ROLES[0]) {
            cloned.items = cloned.items.filter(i => ["Chat", "Historial"].includes(i.label));
          }
        }

        return cloned;
      });

    // Add admin section for admin users
    if (isAdmin) {
      sections.push({
        key: "admin",
        label: "Configuraciones",
        icon: "⚙️",
        items: [
          { label: "Usuarios", href: "/dashboard/configuraciones", icon: "👥" },
        ],
      } as any);
    }

    return sections;
  }, [user]);

  const toggleSection = (idx: number) => {
    const next = new Set(expanded);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    setExpanded(next);
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
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

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="px-5 py-4">
          <img src={dark ? "/cumbre-ia/images/logointroBlack.png" : "/cumbre-ia/images/logointro.png"} alt="F.A.R.O." className="h-12 w-auto" />
        </div>

        <nav className="flex-1 overflow-auto px-3">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="mb-1">
              <button
                onClick={() => toggleSection(sIdx)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  expanded.has(sIdx)
                    ? "text-zinc-800 dark:text-zinc-200"
                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <span>{section.icon}</span>
                <span className="flex-1 text-left">{section.label}</span>
                <span className="text-xs">{expanded.has(sIdx) ? "▾" : "▸"}</span>
              </button>
              {expanded.has(sIdx) && section.items.length > 0 && (
                <div className="ml-7 mt-0.5 border-l border-zinc-200 dark:border-zinc-700 pl-3">
                  {section.items.map((item) => (
                    <button
                      key={item.href}
                      onClick={() => router.push(item.href)}
                      className={`mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                        pathname === item.href
                          ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                          : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span className="text-xs">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
              {expanded.has(sIdx) && section.items.length === 0 && (
                <div className="ml-7 border-l border-zinc-200 dark:border-zinc-700 pl-3 py-2">
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">Proximamente</p>
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="border-t border-zinc-200 dark:border-zinc-800 px-3 py-3">
          <button
            onClick={toggle}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <span>{dark ? "☀️" : "🌙"}</span>
            {dark ? "Modo claro" : "Modo oscuro"}
          </button>
        </div>

        <div className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">{user?.full_name}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="mt-2 text-xs font-medium text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
          >
            Cerrar sesion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-zinc-50 dark:bg-zinc-950 p-8">
        {children}
      </main>
    </div>
  );
}
