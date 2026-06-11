"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useEffect } from "react";

const navItems = [
  { label: "Chat", href: "/dashboard/chat", icon: "💬" },
  { label: "Documentos", href: "/dashboard/documentos", icon: "📄" },
  { label: "Historial", href: "/dashboard/historial", icon: "📋" },
  { label: "Pendientes", href: "/dashboard/pendientes", icon: "📌" },
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
        <div className="px-6 py-5">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Cumbre IA</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">RAG Aduanero</p>
        </div>

        <nav className="flex-1 px-3">
          {navItems.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                pathname === item.href
                  ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
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
