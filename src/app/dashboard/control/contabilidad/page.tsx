"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import type { ControlOperacion } from "@/lib/types";
import { RefreshCw, Save, UserCog } from "lucide-react";

type Draft = Partial<ControlOperacion>;

export default function ContabilidadPage() {
  const [rows, setRows] = useState<ControlOperacion[]>([]);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    fecha_desde: "",
    fecha_hasta: "",
    cliente: "",
    regimen: "",
    canal: "",
  });
  const [options, setOptions] = useState<{
    regimenes: string[];
    canales: string[];
    clientes: { nit: string; nombre: string }[];
  }>({ regimenes: [], canales: [], clientes: [] });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.control.operaciones.list({ page, size: 30, ...filters });
      setRows(data.data);
      setPages(data.pages);
      setTotal(data.total);
      setDrafts({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar operaciones");
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.control
      .filtros()
      .then(setOptions)
      .catch(() => {});
  }, []);

  const value = (row: ControlOperacion, field: keyof ControlOperacion) => {
    const draft = drafts[row.id];
    const v = draft && field in draft ? draft[field] : row[field];
    return v == null ? "" : String(v);
  };

  const setField = (row: ControlOperacion, field: keyof ControlOperacion, v: string) => {
    setDrafts((prev) => ({ ...prev, [row.id]: { ...prev[row.id], [field]: v } }));
  };

  const save = async (row: ControlOperacion) => {
    const draft = drafts[row.id];
    if (!draft) return;
    setSavingId(row.id);
    setError("");
    setMessage("");
    try {
      const updated = await api.control.operaciones.update(row.id, draft);
      setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      setMessage(`Operación ${row.dim} actualizada.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSavingId(null);
    }
  };

  const refreshIntegre = async (row: ControlOperacion) => {
    setSavingId(row.id);
    setError("");
    setMessage("");
    try {
      const res = await api.control.operaciones.refreshIntegre(row.id);
      if (res.actualizado && res.operacion) {
        setRows((prev) => prev.map((r) => (r.id === row.id ? res.operacion! : r)));
        setMessage(`Liquidador/planilla actualizados para ${row.dim}.`);
      } else {
        setMessage(res.detalle || "No se encontró la operación en Integgre.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al refrescar desde Integgre");
    } finally {
      setSavingId(null);
    }
  };

  const filterCls =
    "rounded-lg border border-faro-border bg-faro-surface px-2 py-1.5 text-sm text-faro-text";
  const inputCls =
    "w-full rounded border border-faro-border bg-transparent px-2 py-1 text-xs text-faro-text focus:outline-none focus:border-blue-500";

  return (
    <div>
      <PageHeader
        title="Contabilidad"
        subtitle="Gestión de los campos curados de cada operación"
      />

      {error && <ErrorBanner message={error} />}
      {message && (
        <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400">
          {message}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-faro-text">
          Desde
          <input
            type="date"
            value={filters.fecha_desde}
            onChange={(e) => {
              setPage(1);
              setFilters((f) => ({ ...f, fecha_desde: e.target.value }));
            }}
            className={filterCls}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-faro-text">
          Hasta
          <input
            type="date"
            value={filters.fecha_hasta}
            onChange={(e) => {
              setPage(1);
              setFilters((f) => ({ ...f, fecha_hasta: e.target.value }));
            }}
            className={filterCls}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-faro-text">
          Cliente
          <select
            value={filters.cliente}
            onChange={(e) => {
              setPage(1);
              setFilters((f) => ({ ...f, cliente: e.target.value }));
            }}
            className={`${filterCls} min-w-[200px]`}
          >
            <option value="">Todos</option>
            {options.clientes.map((c) => (
              <option key={c.nit} value={c.nombre || c.nit}>
                {c.nombre || c.nit}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-faro-text">
          Régimen
          <select
            value={filters.regimen}
            onChange={(e) => {
              setPage(1);
              setFilters((f) => ({ ...f, regimen: e.target.value }));
            }}
            className={filterCls}
          >
            <option value="">Todos</option>
            {options.regimenes.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-faro-text">
          Canal
          <select
            value={filters.canal}
            onChange={(e) => {
              setPage(1);
              setFilters((f) => ({ ...f, canal: e.target.value }));
            }}
            className={filterCls}
          >
            <option value="">Todos</option>
            {options.canales.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-faro-border bg-faro-surface px-3 py-2 text-sm text-faro-text hover:bg-white/[0.04] disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-faro-border bg-faro-surface">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/[0.03] text-faro-textlight">
            <tr>
              <th className="px-3 py-2">DIM</th>
              <th className="px-3 py-2">F. Pago</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Régimen</th>
              <th className="px-3 py-2">Canal</th>
              <th className="px-3 py-2">Liquidador</th>
              <th className="px-3 py-2">Planilla</th>
              <th className="px-3 py-2">Planillado</th>
              <th className="px-3 py-2">Planillador</th>
              <th className="px-3 py-2">F. Regularización</th>
              <th className="px-3 py-2">Observaciones</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const dirty = !!drafts[row.id];
              return (
                <tr key={row.id} className="border-t border-faro-border text-faro-text">
                  <td className="px-3 py-2 font-mono whitespace-nowrap">{row.dim}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.fecha_pago || "—"}</td>
                  <td className="px-3 py-2">{row.cliente_nombre || row.razon_social_importador || "—"}</td>
                  <td className="px-3 py-2">{row.regimen || "—"}</td>
                  <td className="px-3 py-2">
                    <input value={value(row, "canal")} onChange={(e) => setField(row, "canal", e.target.value)} className={inputCls} />
                  </td>
                  <td className="px-3 py-2">
                    <input value={value(row, "liquidador")} onChange={(e) => setField(row, "liquidador", e.target.value)} className={inputCls} />
                  </td>
                  <td className="px-3 py-2">
                    <input value={value(row, "planilla")} onChange={(e) => setField(row, "planilla", e.target.value)} className={`${inputCls} w-20`} />
                  </td>
                  <td className="px-3 py-2">
                    <input value={value(row, "planillado")} onChange={(e) => setField(row, "planillado", e.target.value)} className={`${inputCls} w-16`} />
                  </td>
                  <td className="px-3 py-2">
                    <input value={value(row, "planillador")} onChange={(e) => setField(row, "planillador", e.target.value)} className={inputCls} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="date" value={value(row, "fecha_regularizacion")} onChange={(e) => setField(row, "fecha_regularizacion", e.target.value)} className={inputCls} />
                  </td>
                  <td className="px-3 py-2">
                    <input value={value(row, "observaciones")} onChange={(e) => setField(row, "observaciones", e.target.value)} className={inputCls} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => save(row)}
                        disabled={!dirty || savingId === row.id}
                        title="Guardar"
                        className="rounded p-1 text-green-400 hover:bg-white/[0.05] disabled:opacity-30"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => refreshIntegre(row)}
                        disabled={savingId === row.id}
                        title="Refrescar desde Integgre"
                        className="rounded p-1 text-cyan-400 hover:bg-white/[0.05] disabled:opacity-30"
                      >
                        <UserCog className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-faro-text/60">
                  No hay operaciones registradas.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-faro-text/60">
                  Cargando...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-faro-text/70">
        <span>{total} operación(es)</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page <= 1 || loading}
            className="rounded border border-faro-border px-2 py-1 disabled:opacity-40"
          >
            Anterior
          </button>
          <span>
            {page} / {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, pages))}
            disabled={page >= pages || loading}
            className="rounded border border-faro-border px-2 py-1 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
