"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import type { TransbelSincPendiente } from "@/lib/types";
import { RefreshCw, Send, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function SincronizacionPage() {
  const [pendientes, setPendientes] = useState<TransbelSincPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.transbel.sincronizacion.pendientes();
      setPendientes(data.pendientes);
      setSelected(new Set(data.pendientes.filter((p) => p.completo).map((p) => p.operacionId)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar pendientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = async (ids?: number[]) => {
    setSending(true);
    setError("");
    setMessage("");
    try {
      const result = await api.transbel.sincronizacion.enviar(ids);
      setMessage(
        result.detalle
          ? result.detalle
          : `Enviados ${result.enviados} registro(s). Omitidos ${result.omitidos}.`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al sincronizar");
    } finally {
      setSending(false);
    }
  };

  const completos = pendientes.filter((p) => p.completo);

  return (
    <div>
      <PageHeader
        title="Sincronización 3PL"
        subtitle="Operaciones Transbel que pasaron facturación y están pendientes de enviar al webhook"
      />

      {error && <ErrorBanner message={error} />}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          onClick={load}
          disabled={loading || sending}
          className="inline-flex items-center gap-2 rounded-lg border border-faro-border bg-faro-surface px-3 py-2 text-sm text-faro-text hover:bg-white/[0.04] disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
        <button
          onClick={() => handleSend(Array.from(selected))}
          disabled={sending || selected.size === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          Sincronizar seleccionados ({selected.size})
        </button>
        <button
          onClick={() => handleSend(undefined)}
          disabled={sending || completos.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-faro-border bg-faro-surface px-3 py-2 text-sm text-faro-text hover:bg-white/[0.04] disabled:opacity-50"
        >
          Sincronizar todos los completos ({completos.length})
        </button>
      </div>

      {message && (
        <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400">
          {message}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-faro-border bg-faro-surface">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/[0.03] text-faro-textlight">
            <tr>
              <th className="px-3 py-2"></th>
              <th className="px-3 py-2">Operación</th>
              <th className="px-3 py-2">ENTREGA</th>
              <th className="px-3 py-2">Nro. Registro</th>
              <th className="px-3 py-2">FLIBER</th>
              <th className="px-3 py-2">FULTDOC</th>
              <th className="px-3 py-2">FNACIONAL</th>
              <th className="px-3 py-2">FETLAA</th>
              <th className="px-3 py-2">CODEXC_AA</th>
              <th className="px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {pendientes.map((p) => (
              <tr
                key={p.operacionId}
                className={
                  "border-t border-faro-border " +
                  (p.completo ? "text-faro-text" : "bg-yellow-500/10 text-yellow-200")
                }
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(p.operacionId)}
                    disabled={!p.completo}
                    onChange={() => toggle(p.operacionId)}
                  />
                </td>
                <td className="px-3 py-2 font-mono">{p.operacionId}</td>
                <td className="px-3 py-2 font-mono">{p.record.ENTREGA || "—"}</td>
                <td className="px-3 py-2 font-mono">{p.nroRegistro || "—"}</td>
                <td className="px-3 py-2">{p.record.FLIBER || "—"}</td>
                <td className="px-3 py-2">{p.record.FULTDOC || "—"}</td>
                <td className="px-3 py-2">{p.record.FNACIONAL || "—"}</td>
                <td className="px-3 py-2">{p.record.FETLAA || "—"}</td>
                <td className="px-3 py-2">{p.record.CODEXC_AA || "—"}</td>
                <td className="px-3 py-2">
                  {p.completo ? (
                    <span className="inline-flex items-center gap-1 text-green-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Completo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> {p.motivo}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {!loading && pendientes.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-faro-text/60">
                  No hay operaciones pendientes de sincronizar.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-faro-text/60">
                  Cargando...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-faro-text/60">
        Las filas en <span className="text-yellow-300">amarillo</span> están pendientes porque
        les falta algún dato; se sincronizan manualmente cuando el dato ya está disponible.
      </p>
    </div>
  );
}
