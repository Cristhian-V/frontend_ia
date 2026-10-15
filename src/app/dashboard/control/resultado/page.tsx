"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import type { ControlResultadoRow } from "@/lib/types";
import { RefreshCw } from "lucide-react";

const filterCls =
  "rounded-lg border border-faro-border bg-faro-surface px-2 py-1.5 text-sm text-faro-text";

const SEMAFORO_CLS: Record<string, string> = {
  verde: "bg-green-500/20 text-green-300",
  amarillo: "bg-yellow-500/20 text-yellow-300",
  rojo: "bg-red-500/20 text-red-300",
};

export default function ResultadoPage() {
  const [rows, setRows] = useState<ControlResultadoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    fecha_desde: "",
    fecha_hasta: "",
    cliente: "",
    regimen: "",
    canal: "",
    estado: [] as string[],
  });
  const [options, setOptions] = useState<{
    regimenes: string[];
    canales: string[];
    clientes: { nit: string; nombre: string }[];
    estados: string[];
  }>({ regimenes: [], canales: [], clientes: [], estados: [] });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.control.resultado(filters);
      setRows(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el reporte");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.control
      .filtros()
      .then(setOptions)
      .catch(() => {});
  }, []);

  const toggleEstado = (estado: string) => {
    setFilters((f) => ({
      ...f,
      estado: f.estado.includes(estado)
        ? f.estado.filter((e) => e !== estado)
        : [...f.estado, estado],
    }));
  };

  return (
    <div>
      <PageHeader
        title="Resultado"
        subtitle="Reporte calculado: mes, categoría, plazo de regularización, tributos y estado"
      />

      {error && <ErrorBanner message={error} />}

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-faro-text">
          Desde (pago)
          <input
            type="date"
            value={filters.fecha_desde}
            onChange={(e) => setFilters((f) => ({ ...f, fecha_desde: e.target.value }))}
            className={filterCls}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-faro-text">
          Hasta (pago)
          <input
            type="date"
            value={filters.fecha_hasta}
            onChange={(e) => setFilters((f) => ({ ...f, fecha_hasta: e.target.value }))}
            className={filterCls}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-faro-text">
          Cliente
          <select
            value={filters.cliente}
            onChange={(e) => setFilters((f) => ({ ...f, cliente: e.target.value }))}
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
            onChange={(e) => setFilters((f) => ({ ...f, regimen: e.target.value }))}
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
            onChange={(e) => setFilters((f) => ({ ...f, canal: e.target.value }))}
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
        <div className="flex flex-col gap-1 text-xs text-faro-text">
          Estado
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-faro-border bg-faro-surface px-2 py-1.5">
            {options.estados.map((e) => (
              <label key={e} className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={filters.estado.includes(e)}
                  onChange={() => toggleEstado(e)}
                />
                {e}
              </label>
            ))}
            {options.estados.length === 0 && <span className="text-faro-text/50">—</span>}
          </div>
        </div>
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
              <th className="px-3 py-2">Mes</th>
              <th className="px-3 py-2">F. Pago</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Planilla</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">NIT</th>
              <th className="px-3 py-2">Aduana</th>
              <th className="px-3 py-2">DUI/DUE</th>
              <th className="px-3 py-2">F. Validación</th>
              <th className="px-3 py-2">Régimen</th>
              <th className="px-3 py-2">Canal</th>
              <th className="px-3 py-2">F. Canal/Plazo</th>
              <th className="px-3 py-2">Días</th>
              <th className="px-3 py-2">Fecha límite</th>
              <th className="px-3 py-2">Cancel. Plazo</th>
              <th className="px-3 py-2">CAT</th>
              <th className="px-3 py-2">Liquidador</th>
              <th className="px-3 py-2">Planillador</th>
              <th className="px-3 py-2">Ítems</th>
              <th className="px-3 py-2">Total tributos</th>
              <th className="px-3 py-2">Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-faro-border text-faro-text">
                <td className="px-3 py-2 whitespace-nowrap capitalize">{row.mes || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{row.fecha_pago || "—"}</td>
                <td className="px-3 py-2">{row.estado || "—"}</td>
                <td className="px-3 py-2">{row.planilla ?? "—"}</td>
                <td className="px-3 py-2">{row.cliente_nombre || "—"}</td>
                <td className="px-3 py-2 font-mono">{row.nit_importador || "—"}</td>
                <td className="px-3 py-2">{row.aduana || "—"}</td>
                <td className="px-3 py-2 font-mono whitespace-nowrap">{row.dui_due || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{row.fecha_aceptacion || "—"}</td>
                <td className="px-3 py-2">{row.regimen || "—"}</td>
                <td className="px-3 py-2">{row.canal || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{row.fecha_asignacion_canal || "—"}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block rounded px-2 py-0.5 ${
                      row.semaforo ? SEMAFORO_CLS[row.semaforo] : ""
                    }`}
                  >
                    {String(row.dias)}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{row.fecha_limite || "—"}</td>
                <td className="px-3 py-2">{String(row.cancel_plazo)}</td>
                <td className="px-3 py-2 font-semibold">{row.cat || "—"}</td>
                <td className="px-3 py-2">{row.liquidador || "—"}</td>
                <td className="px-3 py-2">{row.planillador || "—"}</td>
                <td className="px-3 py-2">{row.total_items ?? "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {row.tributos != null ? row.tributos.toLocaleString("es-BO") : "—"}
                </td>
                <td className="px-3 py-2">{row.observaciones || "—"}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={21} className="px-3 py-8 text-center text-faro-text/60">
                  No hay operaciones para el filtro seleccionado.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={21} className="px-3 py-8 text-center text-faro-text/60">
                  Cargando...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-faro-text/60">
        {rows.length} fila(s). Ordenado por fecha de pago y aduana. El semáforo aplica a regímenes
        IMA 4 / IMI 4 (verde &lt; 10 · amarillo 10–15 · rojo &gt; 15 días desde el canal).
      </p>
    </div>
  );
}
