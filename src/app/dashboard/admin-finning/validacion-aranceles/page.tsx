"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import { ShieldAlert, Check, ChevronDown, ChevronRight, Upload, ExternalLink } from "lucide-react";

type Conflicto = {
  codigo_sap: string;
  codigo_mod: string;
  n: number;
  partidas: { codigo: string; descripcion: string }[];
};

const ITEM_FIELDS: { key: string; label: string }[] = [
  { key: "id", label: "#" },
  { key: "codigo_sap", label: "CODIGO_SAP" },
  { key: "codigo_mod", label: "CODIGO_MOD" },
  { key: "material", label: "MATERIAL" },
  { key: "partida_arancel", label: "PARTIDA_ARANCEL" },
  { key: "descripcion_dim", label: "DESCRIPCION_DIM" },
  { key: "resuelto", label: "Resuelto" },
];

function renderCell(value: unknown) {
  if (value === true) return "Sí";
  if (value === false) return "No";
  return String(value ?? "");
}

export default function ValidacionArancelesPage() {
  const [estado, setEstado] = useState<{ total: number; vacia: boolean } | null>(null);
  const [conflictos, setConflictos] = useState<Conflicto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolvedMsg, setResolvedMsg] = useState("");
  const [expanded, setExpanded] = useState<Record<string, Record<string, unknown>[]>>({});
  const [loadingItems, setLoadingItems] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const e = await api.adminFinning.estado();
      setEstado(e);
      setConflictos(e.vacia ? [] : await api.adminFinning.validacion());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar la validación");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const onUpload = async (file: File) => {
    setUploading(true);
    setError("");
    setResolvedMsg("");
    try {
      const r = await api.adminFinning.cargarExcel(file);
      setResolvedMsg(`Excel cargado: ${r.insertados} registros`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar el Excel");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const toggleItems = async (codigoSap: string) => {
    if (expanded[codigoSap]) {
      setExpanded((prev) => {
        const next = { ...prev };
        delete next[codigoSap];
        return next;
      });
      return;
    }
    setLoadingItems(codigoSap);
    setError("");
    try {
      const rows = await api.adminFinning.items(codigoSap);
      setExpanded((prev) => ({ ...prev, [codigoSap]: rows }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar registros");
    } finally {
      setLoadingItems(null);
    }
  };

  const resolver = async (codigoSap: string, partida: string) => {
    setResolving(codigoSap);
    setError("");
    setResolvedMsg("");
    try {
      const r = await api.adminFinning.resolver(codigoSap, partida);
      setResolvedMsg(`${codigoSap} -> ${partida} (${r.actualizados} registros actualizados)`);
      setExpanded((prev) => {
        const next = { ...prev };
        delete next[codigoSap];
        return next;
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al resolver");
    } finally {
      setResolving(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Validación de aranceles"
        subtitle="Códigos SAP con partidas arancelarias inconsistentes"
      />

      {error && <ErrorBanner message={error} />}
      {resolvedMsg && (
        <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4" /> {resolvedMsg}
          </span>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-sm text-faro-text">Cargando...</div>
      ) : estado?.vacia ? (
        <div className="max-w-xl rounded-xl bg-faro-surface border border-faro-border p-6">
          <div className="mb-2 flex items-center gap-2 text-faro-textlight">
            <Upload className="w-5 h-5" />
            <h2 className="text-sm font-semibold">Cargar catálogo FINNING</h2>
          </div>
          <p className="mb-4 text-sm text-faro-text">
            La tabla está vacía. Sube el Excel con las columnas CODIGO_SAP, CODIGO_MOD,
            MATERIAL, PARTIDA_ARANCEL y DESCRIPCION_DIM. La carga solo se permite una vez.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".xls,.xlsx,.xlsm"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
            }}
            className="block w-full cursor-pointer rounded-lg border border-faro-border bg-faro-bg p-2 text-sm text-faro-text file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-blue-500 disabled:opacity-50"
          />
          {uploading && <p className="mt-3 text-xs text-faro-text">Cargando Excel...</p>}
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2 text-sm text-faro-text">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>
              {conflictos.length} códigos SAP en conflicto · {estado?.total ?? 0} registros cargados
            </span>
          </div>

          {conflictos.length === 0 ? (
            <p className="text-sm text-faro-text">No hay conflictos de partida arancelaria.</p>
          ) : (
            <div className="space-y-3">
              {conflictos.map((c) => {
                const isOpen = Boolean(expanded[c.codigo_sap]);
                const rows = expanded[c.codigo_sap] || [];
                return (
                  <div key={c.codigo_sap} className="rounded-xl bg-faro-surface border border-faro-border p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-faro-textlight">{c.codigo_sap}</p>
                        <p className="text-xs text-faro-text/60">{c.codigo_mod}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {c.codigo_mod && (
                          <a
                            href={`https://parts.cat.com/es/catcorp/product/${encodeURIComponent(c.codigo_mod)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-faro-border px-3 py-1.5 text-xs font-medium text-faro-textlight hover:bg-white/5 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Ver en CAT
                          </a>
                        )}
                        <span className="rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-xs text-red-400">
                          {c.n} partidas
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {c.partidas.map((a) => (
                        <div
                          key={a.codigo}
                          className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-faro-textlight">{a.codigo}</p>
                            <p className="truncate text-xs text-faro-text/70">{a.descripcion}</p>
                          </div>
                          <button
                            onClick={() => resolver(c.codigo_sap, a.codigo)}
                            disabled={resolving === c.codigo_sap}
                            className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                          >
                            {resolving === c.codigo_sap ? "Aplicando..." : "Usar esta partida"}
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => toggleItems(c.codigo_sap)}
                      disabled={loadingItems === c.codigo_sap}
                      className="mt-3 flex items-center gap-2 text-xs text-faro-text hover:text-faro-textlight transition-colors"
                    >
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      {loadingItems === c.codigo_sap ? "Cargando registros..." : "Ver registros"}
                    </button>

                    {isOpen && (
                      <div className="mt-2 max-h-96 overflow-auto rounded-lg border border-faro-border">
                        <table className="w-full text-left text-xs">
                          <thead className="sticky top-0 bg-faro-surface">
                            <tr>
                              {ITEM_FIELDS.map((f) => (
                                <th key={f.key} className="whitespace-nowrap px-2 py-2 font-medium text-faro-text/70">
                                  {f.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.length === 0 ? (
                              <tr>
                                <td colSpan={ITEM_FIELDS.length} className="px-2 py-3 text-faro-text/60">
                                  No hay registros.
                                </td>
                              </tr>
                            ) : (
                              rows.map((r) => (
                                <tr key={String(r.id)} className="border-t border-faro-border/50">
                                  {ITEM_FIELDS.map((f) => (
                                    <td key={f.key} className="whitespace-nowrap px-2 py-1.5 text-faro-text">
                                      {renderCell(r[f.key])}
                                    </td>
                                  ))}
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
