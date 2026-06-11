"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface SourceRef {
  ref_id: string;
  chapter_title: string;
  ref_article: string;
  source_filename: string;
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

interface Doc {
  id: string;
  filename: string;
}

const RELATION_LABELS: Record<string, string> = {
  deroga: "Deroga",
  modifica: "Modifica",
  referencia: "Referencia",
  complementa: "Complementa",
  base_legal: "Base legal",
};

const TYPE_LABELS: Record<string, string> = {
  resolucion: "Resolución",
  circular: "Circular",
  ley: "Ley",
  decreto: "Decreto",
  reglamento: "Reglamento",
  otro: "Otro",
};

export default function PendientesPage() {
  const [groups, setGroups] = useState<PendingGroup[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    Promise.all([api.pending.grouped(), api.documents.list()])
      .then(([g, d]) => {
        setGroups(g);
        setDocs(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleGroup = (idx: number) => {
    const next = new Set(expanded);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setExpanded(next);
  };

  const handleResolveAll = async (refIds: string[], documentId: string | null) => {
    await Promise.all(refIds.map((id) => api.pending.resolve(id, documentId)));
    const newGroups = await api.pending.grouped();
    setGroups(newGroups);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Pendientes</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Documentos referenciados en las normativas
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-400 dark:text-zinc-500">Cargando...</div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-12 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No hay documentos pendientes</p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Al subir documentos se detectaran automaticamente las referencias
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g, idx) => (
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
                        handleResolveAll(g.ref_ids, e.target.value);
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
                    onClick={() => handleResolveAll(g.ref_ids, null)}
                    className="shrink-0 rounded px-2 py-1 text-xs text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 mt-1"
                    title="Desvincular todo"
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
                      className="flex items-start gap-2 py-1.5 text-xs border-b border-zinc-50 dark:border-zinc-800 last:border-0"
                    >
                      <span className="text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5">
                        →
                      </span>
                      <div className="min-w-0">
                        <span className="font-medium text-zinc-500 dark:text-zinc-400">
                          {ref.source_filename}
                        </span>
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
