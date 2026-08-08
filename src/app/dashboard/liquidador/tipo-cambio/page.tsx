"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { TipoCambio } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";

export default function TipoCambioPage() {
  const [tc, setTc] = useState<TipoCambio | null>(null);
  const [historico, setHistorico] = useState<TipoCambio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.liquidador.tc(), api.liquidador.tcHistorico()])
      .then(([actual, hist]) => {
        setTc(actual);
        setHistorico(hist);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const formatFecha = (fecha: string) => {
    const d = new Date(fecha + "T00:00:00");
    return d.toLocaleDateString("es-BO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatFechaFull = (fecha: string) => {
    const d = new Date(fecha + "T00:00:00");
    return d.toLocaleDateString("es-BO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div>
      <PageHeader
        title="Tipo de Cambio BCB"
        subtitle="Cotizacion oficial del Banco Central de Bolivia"
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-faro-text">Cargando...</div>
      ) : !tc ? (
        <div className="rounded-xl border border-dashed border-faro-border bg-faro-surface p-12 text-center">
          <p className="text-sm text-faro-text">No hay datos disponibles</p>
          <p className="mt-1 text-xs text-faro-text/60">
            Los datos se actualizaran automaticamente a las 01:00 AM
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3 rounded-xl bg-faro-surface border border-faro-border p-4">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <div>
              <p className="text-xs text-faro-text uppercase tracking-wider">
                Fecha de vigencia
              </p>
              <p className="text-sm font-medium text-faro-textlight">
                {formatFechaFull(tc.fecha)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-faro-surface border border-faro-border p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-faro-text uppercase tracking-wider">
                    Compra
                  </p>
                  <p className="text-xs text-faro-text/60">TCO Oficial</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-faro-textlight">
                {tc.compra.toFixed(2)}
              </p>
              <p className="text-xs text-faro-text mt-1">Bolivianos por Dolar</p>
            </div>

            <div className="rounded-xl bg-faro-surface border border-faro-border p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-faro-text uppercase tracking-wider">
                    Venta
                  </p>
                  <p className="text-xs text-faro-text/60">Tope Referencial</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-faro-textlight">
                {tc.venta.toFixed(2)}
              </p>
              <p className="text-xs text-faro-text mt-1">TCO + Bs 0.10</p>
            </div>
          </div>

          {historico.length > 0 && (
            <div className="rounded-xl bg-faro-surface border border-faro-border overflow-hidden">
              <div className="px-4 py-3 border-b border-faro-border">
                <h2 className="text-sm font-medium text-faro-textlight">
                  Historico de Tipos de Cambio
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-faro-border bg-white/[0.02]">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-faro-text uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-faro-text uppercase tracking-wider">
                        Compra
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-faro-text uppercase tracking-wider">
                        Venta
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-faro-border/50">
                    {historico.map((row, i) => {
                      const isToday = row.fecha === today;
                      return (
                        <tr
                          key={i}
                          className={
                            isToday
                              ? "bg-cyan-500/10 hover:bg-cyan-500/15 transition-colors"
                              : "hover:bg-white/[0.02] transition-colors"
                          }
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={
                                  isToday
                                    ? "text-cyan-400 font-medium"
                                    : "text-faro-textlight"
                                }
                              >
                                {formatFecha(row.fecha)}
                              </span>
                              {isToday && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-500/20 text-cyan-400">
                                  Hoy
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right text-faro-textlight font-mono">
                            {row.compra.toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-faro-textlight font-mono">
                            {row.venta.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
