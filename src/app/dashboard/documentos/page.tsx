"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";

interface Doc {
  id: string;
  original_filename: string;
  chunks_count: number;
  status: string;
  created_at: string;
}

interface Chunk {
  id: string;
  chunk_index: number;
  text: string;
  chapter_title?: string;
  page_start?: number;
  page_end?: number;
}

interface Progress {
  status: string;
  stage: string;
  current: number;
  total: number;
  message: string;
  pages: number;
  chunks_found: number;
  error: string | null;
}

const STAGES = [
  { key: "parsing", label: "Parseando PDF", icon: "🔍" },
  { key: "windowing", label: "Creando ventanas", icon: "🪟" },
  { key: "detecting", label: "Detectando capítulos", icon: "🤖" },
  { key: "merging", label: "Merge y deduplicación", icon: "🔗" },
  { key: "embedding", label: "Generando embeddings", icon: "🧬" },
  { key: "storing", label: "Guardando en FAISS", icon: "💾" },
  { key: "done", label: "Completado", icon: "✅" },
];

function getStageIndex(stage: string) {
  const idx = STAGES.findIndex((s) => s.key === stage);
  return idx >= 0 ? idx : 0;
}

export default function DocumentosPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  const [uploadProgress, setUploadProgress] = useState<Progress | null>(null);
  const [uploadFilename, setUploadFilename] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadDocs = useCallback(async () => {
    try {
      const data = await api.documents.list();
      setDocs(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const startPolling = (docId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const progress = await api.documents.progress(docId);
        setUploadProgress(progress);

        if (progress.status === "ready" || progress.status === "error") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          if (progress.status === "ready") {
            setTimeout(() => {
              setUploadProgress(null);
              setUploadFilename("");
              loadDocs();
            }, 1500);
          }
        }
      } catch {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }, 500);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploadFilename(file.name);
    setUploadProgress({ status: "processing", stage: "starting", current: 0, total: 0, message: "Subiendo archivo...", pages: 0, chunks_found: 0, error: null });

    try {
      const result = await api.documents.upload(file);
      startPolling(result.id);
    } catch (err: any) {
      setError(err.message);
      setUploadProgress(null);
      setUploadFilename("");
    }
  };

  const handleToggleChunks = async (docId: string) => {
    if (expandedDoc === docId) {
      setExpandedDoc(null);
      setChunks([]);
      return;
    }
    setExpandedDoc(docId);
    setLoadingChunks(true);
    try {
      const data = await api.documents.chunks(docId);
      setChunks(data);
    } catch {
      setChunks([]);
    } finally {
      setLoadingChunks(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.documents.delete(id);
      if (expandedDoc === id) {
        setExpandedDoc(null);
        setChunks([]);
      }
      await loadDocs();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const cfgStageIdx = uploadProgress ? getStageIndex(uploadProgress.stage) : 0;
  const totalStages = STAGES.length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Documentos</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Normativas aduaneras indexadas</p>
        </div>
        <label className="cursor-pointer rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50">
          {uploadProgress ? "Procesando..." : "Subir documento"}
          <input
            type="file"
            accept=".pdf,.docx,.doc"
            onChange={handleUpload}
            className="hidden"
            disabled={!!uploadProgress}
          />
        </label>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950 px-4 py-2 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {uploadProgress && (
        <div className="mb-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-1">
            📄 {uploadFilename}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            {uploadProgress.message}
          </p>

          <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                uploadProgress.status === "error"
                  ? "bg-red-500"
                  : uploadProgress.status === "ready"
                  ? "bg-green-500"
                  : "bg-blue-500"
              }`}
              style={{
                width: uploadProgress.status === "ready"
                  ? "100%"
                  : uploadProgress.status === "error"
                  ? "100%"
                  : `${Math.round(((cfgStageIdx) / (totalStages - 1)) * 100)}%`,
              }}
            />
          </div>

          <div className="space-y-1.5">
            {STAGES.map((s, i) => {
              let stageStatus: "done" | "active" | "pending" = "pending";
              if (i < cfgStageIdx) stageStatus = "done";
              else if (i === cfgStageIdx) stageStatus = "active";

              let extra = "";
              if (s.key === uploadProgress.stage) {
                if (s.key === "detecting" && uploadProgress.total > 0) {
                  extra = ` (${uploadProgress.current}/${uploadProgress.total})`;
                }
                if (uploadProgress.pages > 0 && s.key === "parsing") {
                  extra = ` (${uploadProgress.pages} pág)`;
                }
                if (uploadProgress.chunks_found > 0 && (s.key === "detecting" || s.key === "merging")) {
                  extra = ` (${uploadProgress.chunks_found} caps)`;
                }
              }

              return (
                <div key={s.key} className="flex items-center gap-2 text-xs">
                  <span className="w-4 text-center">
                    {stageStatus === "done" ? "✅" : stageStatus === "active" ? "⏳" : "○"}
                  </span>
                  <span
                    className={
                      stageStatus === "done"
                        ? "text-zinc-400 dark:text-zinc-500 line-through"
                        : stageStatus === "active"
                        ? "text-zinc-800 dark:text-zinc-200 font-medium"
                        : "text-zinc-300 dark:text-zinc-600"
                    }
                  >
                    {s.icon} {s.label}{extra}
                  </span>
                </div>
              );
            })}
          </div>

          {uploadProgress.status === "error" && (
            <div className="mt-3 rounded-lg bg-red-50 dark:bg-red-950 px-3 py-2 text-xs text-red-600 dark:text-red-400">
              Error: {uploadProgress.error}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-zinc-400 dark:text-zinc-500">Cargando...</div>
      ) : docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-12 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No hay documentos todavia</p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">Sube normativas en PDF o DOCX</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <div key={doc.id} className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {doc.original_filename}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                    {doc.chunks_count} chunks &middot;{" "}
                    {new Date(doc.created_at).toLocaleDateString("es-BO")}
                  </p>
                </div>
                <div className="ml-4 flex items-center gap-2">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      doc.status === "ready"
                        ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300"
                        : doc.status === "processing"
                        ? "bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300"
                        : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                    }`}
                  >
                    {doc.status}
                  </span>
                  <button
                    onClick={() => handleToggleChunks(doc.id)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {expandedDoc === doc.id ? "Ocultar chunks" : "Ver chunks"}
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="rounded-lg px-2 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              {expandedDoc === doc.id && (
                <div className="border-t border-zinc-100 dark:border-zinc-800">
                  {loadingChunks ? (
                    <div className="px-4 py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
                      Cargando chunks...
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400 w-10">#</th>
                            <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400 w-64">Capitulo</th>
                            <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Contenido del chunk</th>
                            <th className="px-4 py-2 text-right font-medium text-zinc-500 dark:text-zinc-400 w-20">Paginas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chunks.map((chunk) => (
                            <tr key={chunk.id} className="border-b border-zinc-50 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                              <td className="px-4 py-2 text-zinc-400 dark:text-zinc-500 align-top">{chunk.chunk_index}</td>
                              <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300 text-xs font-medium align-top whitespace-pre-wrap">{chunk.chapter_title || "-"}</td>
                              <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400 align-top whitespace-pre-wrap break-words text-xs">{chunk.text}</td>
                              <td className="px-4 py-2 text-zinc-400 dark:text-zinc-500 text-right align-top text-xs">
                                {chunk.page_start != null && chunk.page_end != null ? `${chunk.page_start + 1}-${chunk.page_end + 1}` : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
