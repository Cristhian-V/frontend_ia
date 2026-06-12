"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface QueryLog {
  id: string;
  query: string;
  answer: string;
  model: string;
  chunks_count: number;
  created_at: string;
}

export default function HistorialPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<QueryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.rag
      .history()
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(
      (log) =>
        log.query.toLowerCase().includes(q) ||
        log.answer.toLowerCase().includes(q)
    );
  }, [logs, search]);

  const handleContinue = useCallback((id: string) => {
    router.push(`/dashboard/chat?resume=${id}`);
  }, [router]);

  const highlight = useCallback((text: string, query: string) => {
    if (!query.trim()) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "gi"));
    return parts.map((p, i) =>
      p.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 text-inherit rounded-sm">
          {p}
        </mark>
      ) : (
        p
      )
    );
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Historial</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Consultas realizadas</p>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar en consultas..."
          className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-sm text-zinc-400 dark:text-zinc-500">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-12 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {search.trim() ? "Sin resultados para esta busqueda" : "No hay consultas todavia"}
          </p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            {search.trim() ? "Intenta otros terminos" : "Realiza tu primera consulta en el Chat"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
            >
              <div className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {highlight(log.query, search)}
                    </p>
                    <span className="ml-3 shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                      {expanded === log.id ? "▲" : "▼"}
                    </span>
                  </button>
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                    {new Date(log.created_at).toLocaleDateString("es-BO", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    &middot; {log.chunks_count} fuentes &middot; {log.model}
                  </p>
                </div>
                <button
                  onClick={() => handleContinue(log.id)}
                  className="shrink-0 rounded-lg bg-blue-50 dark:bg-blue-950 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900"
                  title="Continuar conversacion"
                >
                  Continuar
                </button>
              </div>

              {expanded === log.id && (
                <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-3">
                  <div className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
                    {search.trim() ? (
                      highlight(log.answer, search)
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{log.answer}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
