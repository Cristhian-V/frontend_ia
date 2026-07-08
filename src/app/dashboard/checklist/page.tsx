"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { CATEGORIA_LABELS } from "@/lib/tools";
import { useUploadProgress } from "@/hooks/useUploadProgress";
import { PageHeader } from "@/components/PageHeader";

interface ChecklistItem {
  id: string;
  indice: string;
  categoria: string;
  codigo: string;
  subido: boolean;
}

interface CategoryStat {
  categoria: string;
  total: number;
  subidos: number;
}

export default function ChecklistPage() {
  const [stats, setStats] = useState<{ total: number; subidos: number; porcentaje: number; categorias: CategoryStat[] } | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [showSubidos, setShowSubidos] = useState<boolean | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [extractRefs, setExtractRefs] = useState(true);

  const { progress: uploadProgress, startPolling, stopPolling } = useUploadProgress({
    onReady: async () => {
      setUploading(false);
      setUploadMsg("");
      await loadData();
    },
  });

  const loadData = async () => {
    const [s, i] = await Promise.all([api.checklist.stats(), api.checklist.list()]);
    setStats(s);
    setItems(i);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    return () => stopPolling();
  }, [stopPolling]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMsg("Subiendo archivo...");

    try {
      const result = await api.documents.upload(file, extractRefs);
      startPolling(result.id);
    } catch (err: any) {
      setUploading(false);
      setUploadMsg(err.message || "Error al subir");
    }
  };

  const displayMsg = uploadProgress?.status === "error"
    ? uploadProgress.error || "Error al procesar"
    : uploadProgress?.message || uploadMsg;

  // Group items by indice
  const grouped: Record<string, ChecklistItem[]> = {};
  for (const item of items) {
    const key = item.indice;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  // Filter grouped data
  const filteredGroups = Object.entries(grouped)
    .filter(([indice, groupItems]) => {
      if (search && !indice.toLowerCase().includes(search.toLowerCase())) return false;
      const matchingItems = groupItems.filter((item) => {
        if (filter && item.categoria !== filter) return false;
        if (showSubidos !== null && item.subido !== showSubidos) return false;
        return true;
      });
      return matchingItems.length > 0;
    })
    .sort((a, b) => a[0].localeCompare(b[0]));

  const toggleGroup = (key: string) => {
    const next = new Set(expanded);
    if (next.has(key)) next.delete(key); else next.add(key);
    setExpanded(next);
  };

  return (
    <div>
      <PageHeader title="Checklist" subtitle="Normativa Aduanera Vigente">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-faro-text cursor-pointer select-none">
            <input
              type="checkbox"
              checked={extractRefs}
              onChange={(e) => setExtractRefs(e.target.checked)}
              className="rounded border-faro-border"
              disabled={uploading}
            />
            Extraer referencias
          </label>
          <label className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
            uploading
              ? "bg-faro-text/40 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-500"
          }`}>
            {uploading ? "Subiendo..." : "Subir documento"}
            <input
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      </PageHeader>

      {displayMsg && (
        <div className="mb-4 rounded-lg bg-blue-50 dark:bg-blue-950 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
          <span className="animate-spin">⏳</span> {displayMsg}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-faro-text">Cargando...</div>
      ) : (
        <>
          {stats && (
            <div className="mb-6 rounded-xl border border-faro-border bg-faro-surface p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-2xl font-bold text-faro-textlight">{stats.porcentaje}%</p>
                  <p className="text-xs text-faro-text">
                    {stats.subidos} de {stats.total} documentos subidos
                  </p>
                </div>
                <div className="flex-1 mx-6 h-3 rounded-full bg-white/[0.04] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: `${stats.porcentaje}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                {stats.categorias.map((cat) => (
                  <div key={cat.categoria} className="flex items-center gap-3">
                    <span className="w-32 text-xs font-medium text-faro-text shrink-0">
                      {CATEGORIA_LABELS[cat.categoria] || cat.categoria}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${cat.total > 0 ? Math.round((cat.subidos / cat.total) * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-faro-text w-16 text-right">
                      {cat.subidos}/{cat.total}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tema..."
              className="rounded-lg border border-faro-border bg-faro-bg px-3 py-1.5 text-sm text-faro-textlight w-48"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-lg border border-faro-border bg-faro-bg px-3 py-1.5 text-sm text-faro-textlight"
            >
              <option value="">Todas las categorias</option>
              {stats?.categorias.map((c) => (
                <option key={c.categoria} value={c.categoria}>
                  {CATEGORIA_LABELS[c.categoria] || c.categoria} ({c.subidos}/{c.total})
                </option>
              ))}
            </select>
            <select
              value={showSubidos === null ? "" : String(showSubidos)}
              onChange={(e) => {
                const v = e.target.value;
                setShowSubidos(v === "" ? null : v === "true");
              }}
              className="rounded-lg border border-faro-border bg-faro-bg px-3 py-1.5 text-sm text-faro-textlight"
            >
              <option value="">Todos</option>
              <option value="true">Subidos</option>
              <option value="false">Pendientes</option>
            </select>
            <button
              onClick={() => {
                if (expanded.size > 0) setExpanded(new Set());
                else setExpanded(new Set(filteredGroups.map(([k]) => k)));
              }}
              className="text-xs text-faro-text hover:text-faro-textlight"
            >
              {expanded.size > 0 ? "Colapsar todo" : "Expandir todo"}
            </button>
          </div>

          <div className="space-y-2">
            {filteredGroups.map(([indice, groupItems]) => {
              const done = groupItems.filter((i) => i.subido).length;
              const total = groupItems.length;
              const matchingItems = groupItems.filter((item) => {
                if (filter && item.categoria !== filter) return false;
                if (showSubidos !== null && item.subido !== showSubidos) return false;
                return true;
              });

              return (
                <div
                  key={indice}
                  className="rounded-xl border border-faro-border bg-faro-surface overflow-hidden"
                >
                  <button
                    onClick={() => toggleGroup(indice)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04]"
                  >
                    <span className="text-xs text-faro-text">
                      {expanded.has(indice) ? "▾" : "▸"}
                    </span>
                    <span className="flex-1 text-sm font-medium text-faro-textlight truncate">
                      {indice}
                    </span>
                    <span className="text-xs text-faro-text shrink-0">
                      {done}/{total}
                    </span>
                    <div className="w-20 h-1.5 rounded-full bg-white/[0.04] overflow-hidden shrink-0">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{ width: `${total > 0 ? Math.round((done / total) * 100) : 0}%` }}
                      />
                    </div>
                  </button>

                  {expanded.has(indice) && (
                    <div className="border-t border-faro-border">
                      {matchingItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 px-4 py-2 border-b border-faro-border/50 last:border-0 text-xs hover:bg-white/[0.04]"
                        >
                          <span className="font-mono text-faro-textlight flex-1">{item.codigo}</span>
                          <span className="inline-block rounded bg-blue-50 dark:bg-blue-950 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300 shrink-0">
                            {CATEGORIA_LABELS[item.categoria] || item.categoria}
                          </span>
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${
                              item.subido
                                ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300"
                                : "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300"
                            }`}
                          >
                            {item.subido ? "✓" : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
