"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import { EmptyState } from "@/components/EmptyState";
import type { VacDiasTomados } from "@/lib/types";
import { CalendarDays, RefreshCw } from "lucide-react";

export default function DiasTomadosPage() {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.is_admin);
  const currentYear = new Date().getFullYear();
  const [gestion, setGestion] = useState(currentYear);
  const [incluirInactivas, setIncluirInactivas] = useState(false);
  const [data, setData] = useState<VacDiasTomados | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api.vacaciones.diasTomados(gestion, incluirInactivas));
      setDrafts({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar los días tomados");
    } finally {
      setLoading(false);
    }
  }, [gestion, incluirInactivas]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const saveOverride = async (id: number, value: string) => {
    setSavingId(id);
    setError("");
    setMessage("");
    try {
      await api.vacaciones.actualizarLicencia(id, {
        diasComputados: value === "" ? null : Number(value),
        incluida: true,
      });
      setMessage("Override guardado.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el override");
    } finally {
      setSavingId(null);
    }
  };

  const toggleIncluida = async (id: number, incluida: boolean) => {
    setSavingId(id);
    setError("");
    setMessage("");
    try {
      await api.vacaciones.actualizarLicencia(id, { incluida });
      setMessage(incluida ? "Licencia incluida." : "Licencia excluida del cálculo.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cambiar la inclusión");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Días tomados"
        subtitle="Licencias de vacaciones registradas en Integgre, con el cómputo de días hábiles"
      >
        <div className="flex items-center gap-2">
          <select
            value={gestion}
            onChange={(e) => setGestion(Number(e.target.value))}
            className="rounded-lg border border-faro-border bg-faro-surface px-3 py-2 text-sm text-faro-text"
          >
            {[2022, 2023, 2024, 2025, 2026, 2027].map((year) => (
              <option key={year} value={year}>
                Gestión {year}
              </option>
            ))}
          </select>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-faro-border px-3 py-2 text-sm text-faro-text hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
      </PageHeader>

      {error && <ErrorBanner message={error} />}
      {message && (
        <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
          {message}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-faro-text">
          <input
            type="checkbox"
            checked={incluirInactivas}
            onChange={(e) => setIncluirInactivas(e.target.checked)}
          />
          Incluir licencias anuladas
        </label>
        {data && (
          <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs text-blue-300">
            Total computado: {data.total} días
          </span>
        )}
      </div>

      {loading ? (
        <div className="rounded-xl border border-faro-border bg-faro-surface p-12 text-center text-sm text-faro-text">
          Cargando licencias...
        </div>
      ) : !data || data.licencias.length === 0 ? (
        <EmptyState>
          <CalendarDays className="mx-auto mb-3 h-8 w-8 text-faro-text/50" />
          <p className="text-sm text-faro-text">
            No hay licencias de vacaciones en Integgre para la gestión {gestion}.
          </p>
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-faro-border bg-faro-surface">
          <table className="w-full min-w-[1000px] text-left text-xs">
            <thead className="border-b border-faro-border text-faro-text/60">
              <tr>
                <th className="px-3 py-2">Funcionario</th>
                <th className="px-3 py-2">Desde</th>
                <th className="px-3 py-2">Hasta</th>
                <th className="px-3 py-2 text-right">Días calculados</th>
                <th className="px-3 py-2 text-right">Días computados</th>
                <th className="px-3 py-2">Activa</th>
                <th className="px-3 py-2">Comentario</th>
              </tr>
            </thead>
            <tbody>
              {data.licencias.map((licencia) => {
                const value =
                  drafts[licencia.id] ??
                  (licencia.override?.diasComputados != null
                    ? String(licencia.override.diasComputados)
                    : String(licencia.diasCalculados));
                return (
                  <tr key={licencia.id} className="border-b border-faro-border/40">
                    <td className="px-3 py-2 text-faro-textlight">{licencia.nombre}</td>
                    <td className="px-3 py-2 text-faro-text">{licencia.fechaDesde}</td>
                    <td className="px-3 py-2 text-faro-text">{licencia.fechaHasta}</td>
                    <td className="px-3 py-2 text-right text-faro-text">{licencia.diasCalculados}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={value}
                        disabled={!isAdmin || savingId === licencia.id}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [licencia.id]: e.target.value }))
                        }
                        onBlur={() => {
                          if (value !== String(licencia.diasCalculados) || licencia.override) {
                            saveOverride(licencia.id, value);
                          }
                        }}
                        className="w-24 rounded border border-faro-border bg-transparent px-1.5 py-1 text-right text-xs text-faro-text disabled:opacity-60"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <label className="flex items-center gap-1.5 text-[11px] text-faro-text">
                        <input
                          type="checkbox"
                          checked={licencia.override ? licencia.override.incluida : true}
                          disabled={!isAdmin || savingId === licencia.id}
                          onChange={(e) => toggleIncluida(licencia.id, e.target.checked)}
                        />
                        {licencia.activo ? "Integgre" : "Anulada"}
                      </label>
                    </td>
                    <td className="max-w-[320px] px-3 py-2 text-faro-text/70">
                      <span title={licencia.comentarios ?? ""}>
                        {licencia.comentarios ? licencia.comentarios.replace(/\s+/g, " ").slice(0, 120) : "—"}
                        {licencia.comentarios && licencia.comentarios.length > 120 ? "…" : ""}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-faro-text/50">
        Los días se calculan de lunes a sábado, excluyendo domingos y feriados configurados. Podés ajustar
        manualmente para medias jornadas o retornos anticipados.
      </p>
    </div>
  );
}
