"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { RELATION_LABELS, TYPE_LABELS } from "@/lib/tools";
import type { Doc } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";

interface SourceRef {
  ref_id: string;
  chapter_title: string;
  ref_article: string;
  source_filename: string;
  chunk_text: string;
  resolved: boolean;
}

interface PendingGroup {
  ref_type: string;
  ref_number: string;
  ref_title: string;
  relation: string;
  resolved: boolean;
  refs: SourceRef[];
  ref_ids: string[];
}

export default function PendientesPage() {
  const [groups, setGroups] = useState<PendingGroup[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [refExpanded, setRefExpanded] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"pending" | "resolved">("pending");

  const toggleRefExpand = (refId: string) => {
    const next = new Set(refExpanded);
    if (next.has(refId)) next.delete(refId); else next.add(refId);
    setRefExpanded(next);
  };

  useEffect(() => {
    Promise.all([api.pending.grouped(), api.documents.list()])
      .then(([g, d]) => {
        setGroups(g);
        setDocs(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const refresh = async () => {
    const [g, d] = await Promise.all([api.pending.grouped(), api.documents.list()]);
    setGroups(g);
    setDocs(d);
  };

  const handleDeleteRef = async (refId: string) => {
    if (!confirm("Eliminar esta referencia?")) return;
    try {
      await api.pending.delete(refId);
      await refresh();
    } catch {}
  };

  const toggleGroup = (idx: number) => {
    const next = new Set(expanded);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setExpanded(next);
  };

  const handleResolve = async (refId: string, documentId: string | null, cascade: boolean = true) => {
    try {
      await api.pending.resolve(refId, documentId, cascade);
      await refresh();
    } catch {}
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Pendientes</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Documentos referenciados en las normativas
        </p>
      </div>

      <div className="mb-4 flex gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5 w-fit">
        <button
          onClick={() => setTab("pending")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            tab === "pending"
              ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          Pendientes
        </button>
        <button
          onClick={() => setTab("resolved")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            tab === "resolved"
              ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          Resueltas
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-400 dark:text-zinc-500">Cargando...</div>
      ) : (() => {
        const filtered = groups.filter((g) => (tab === "pending" ? !g.resolved : g.resolved));
        return filtered.length === 0 ? (
        <EmptyState>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {tab === "pending" ? "No hay documentos pendientes" : "No hay referencias resueltas"}
          </p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            {tab === "pending"
              ? "Al subir documentos se detectaran automaticamente las referencias"
              : "Las referencias vinculadas apareceran aqui"}
          </p>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {filtered.map((g, idx) => (
            <div
              key={idx}
              className={`rounded-xl border bg-white dark:bg-zinc-900 ${
                g.resolved
                  ? "border-green-200 dark:border-green-900 opacity-75"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <div className="flex items-start justify-between gap-3 px-4 py-3">
                <button
                  onClick={() => toggleGroup(idx)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {g.ref_title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-block rounded bg-blue-50 dark:bg-blue-950 px-2 py-0.5 font-medium text-blue-700 dark:text-blue-300">
                      {TYPE_LABELS[g.ref_type] || g.ref_type}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 font-mono">
                      {g.ref_number}
                    </span>
                    <span
                      className={`inline-block rounded px-2 py-0.5 font-medium ${
                        g.relation === "deroga"
                          ? "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
                          : g.relation === "modifica"
                          ? "bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {RELATION_LABELS[g.relation] || g.relation}
                    </span>
                    <span
                      className={`inline-block rounded px-2 py-0.5 font-medium text-xs ${
                        g.resolved
                          ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                          : "bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300"
                      }`}
                    >
                      {g.resolved ? "✓ Resuelta" : "⏳ Pendiente"}
                    </span>
                    <span className="text-zinc-400 dark:text-zinc-500">
                      {g.refs.length} {g.refs.length === 1 ? "referencia" : "referencias"}{" "}
                      {expanded.has(idx) ? "▲" : "▼"}
                    </span>
                  </div>
                </button>

                {!g.resolved && docs.length > 0 && (
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleResolve(g.ref_ids[0], e.target.value, true);
                        e.target.value = "";
                      }
                    }}
                    className="shrink-0 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[160px] truncate mt-1"
                  >
                    <option value="">Vincular doc...</option>
                    {docs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.filename}
                      </option>
                    ))}
                  </select>
                )}
                {g.resolved && (
                  <button
                    onClick={() => handleResolve(g.ref_ids[0], null, true)}
                    className="shrink-0 rounded px-2 py-1 text-xs text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 mt-1"
                    title="Desvincular todas las refs a esta ley"
                  >
                    ✕
                  </button>
                )}
              </div>

              {expanded.has(idx) && (
                <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-2">
                  {g.refs.map((ref, j) => (
                    <div
                      key={j}
                      className="py-1.5 text-xs border-b border-zinc-50 dark:border-zinc-800 last:border-0"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5">
                          →
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-zinc-500 dark:text-zinc-400">
                              {ref.source_filename}
                            </span>
                            <span
                              className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                ref.resolved
                                  ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                                  : "bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300"
                              }`}
                            >
                              {ref.resolved ? "✓" : "⏳"}
                            </span>
                          </div>
                          <br />
                          <span className="font-medium text-zinc-600 dark:text-zinc-300">
                            {ref.chapter_title || "Articulo referenciado"}
                          </span>
                          {ref.ref_article && (
                            <span className="text-zinc-400 dark:text-zinc-500">
                              {" "}
                              — {ref.ref_article}
                            </span>
                          )}
                          {ref.chunk_text && ref.chunk_text.length > 50 && (
                            <button
                              onClick={() => toggleRefExpand(ref.ref_id)}
                              className="ml-2 text-blue-500 dark:text-blue-400 hover:underline"
                            >
                              {refExpanded.has(ref.ref_id) ? "Ocultar" : "Ver chunk"}
                            </button>
                          )}
                          {ref.resolved && (
                            <button
                              onClick={() => handleResolve(ref.ref_id, null, false)}
                              className="ml-2 text-orange-400 dark:text-orange-500 hover:text-orange-600 dark:hover:text-orange-400"
                              title="Desvincular solo esta referencia"
                            >
                              Desvincular
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteRef(ref.ref_id)}
                            className="ml-2 text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400"
                            title="Eliminar referencia"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      {refExpanded.has(ref.ref_id) && ref.chunk_text && (
                        <div className="mt-1 ml-6 rounded bg-zinc-50 dark:bg-zinc-800 p-2 text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                          {ref.chunk_text}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      )()}
    </div>
  );
}
