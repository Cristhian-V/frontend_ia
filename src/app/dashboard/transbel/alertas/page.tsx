"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import type {
  TransbelExcepcion,
  TransbelExcepcionCatalogo,
  TransbelIncompleto,
} from "@/lib/types";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Pencil,
  Play,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

type Tab = "pendientes" | "historial" | "incompletos";

const PAGE_SIZE = 100;

const buttonSecondary =
  "inline-flex items-center gap-2 rounded-lg border border-faro-border bg-faro-surface px-3 py-2 text-sm text-faro-text hover:bg-white/[0.04] disabled:opacity-50";
const buttonPrimary =
  "inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50";

function dash(value: string | null | undefined) {
  return value && String(value).trim() ? value : "—";
}

const REFERENCIA_RE = /^180\d{6}$/;

function isValidReferencia(value: string | null | undefined) {
  return REFERENCIA_RE.test(String(value || "").trim());
}

function extractReferencia(value: string | null | undefined) {
  const match = String(value || "").match(/180\d{6}/);
  return match ? match[0] : "";
}

function ReferenciaCell({
  operacionId,
  value,
  onSave,
}: {
  operacionId: number;
  value: string;
  onSave: (operacionId: number, referencia: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const valid = isValidReferencia(value);

  const start = () => {
    setDraft(extractReferencia(value) || String(value || ""));
    setEditing(true);
  };

  const save = async () => {
    if (!isValidReferencia(draft)) return;
    setSaving(true);
    try {
      await onSave(operacionId, draft.trim());
      setEditing(false);
    } catch {
      // El padre ya muestra el error.
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          value={draft}
          autoFocus
          inputMode="numeric"
          maxLength={9}
          onChange={(e) =>
            setDraft(e.target.value.replace(/\D/g, "").slice(0, 9))
          }
          className={`w-24 rounded border px-1 py-0.5 font-mono text-xs ${
            isValidReferencia(draft)
              ? "border-faro-border bg-faro-surface text-faro-text"
              : "border-red-500/50 bg-red-500/10 text-red-300"
          }`}
        />
        <button
          onClick={save}
          disabled={saving || !isValidReferencia(draft)}
          className="text-green-400 disabled:opacity-40"
          title="Guardar referencia"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setEditing(false)}
          disabled={saving}
          className="text-faro-text/60 hover:text-faro-text"
          title="Cancelar"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className={`font-mono ${valid ? "" : "text-red-400"}`}>
        {value && String(value).trim() ? value : "—"}
      </span>
      <button
        onClick={start}
        className="text-faro-text/50 hover:text-faro-textlight"
        title="Editar referencia (solo número 180XXXXXX)"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  );
}

function CanalBadge({ canal }: { canal: string }) {
  if (!canal) return <span className="text-faro-text/40">—</span>;
  const cls =
    canal === "VERDE"
      ? "bg-green-500/15 text-green-400"
      : canal === "AMARILLO"
        ? "bg-yellow-500/15 text-yellow-300"
        : canal === "ROJO"
          ? "bg-red-500/15 text-red-400"
          : "bg-white/5 text-faro-text";
  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {canal}
    </span>
  );
}

export default function AlertasPendientesPage() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("pendientes");
  const [pendientes, setPendientes] = useState<TransbelExcepcion[]>([]);
  const [historial, setHistorial] = useState<TransbelExcepcion[]>([]);
  const [incompletos, setIncompletos] = useState<TransbelIncompleto[]>([]);
  const [catalogo, setCatalogo] = useState<TransbelExcepcionCatalogo[]>([]);
  const [selectedExc, setSelectedExc] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [asignando, setAsignando] = useState<number | null>(null);
  const [procesandoPendiente, setProcesandoPendiente] = useState<number | null>(
    null
  );
  const [procesando, setProcesando] = useState(false);
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [p, h, c, inc] = await Promise.all([
        api.transbel.excepciones.pendientes(),
        api.transbel.excepciones.historial(),
        api.transbel.excepciones.catalogo(),
        api.transbel.sincronizacion.incompletos(),
      ]);
      setPendientes(p.pendientes);
      setHistorial(h.pendientes);
      setCatalogo(c.catalogo);
      setIncompletos(inc.pendientes);
      const current: Record<number, string> = {};
      for (const row of p.pendientes) {
        if (row.excepcionId) current[row.operacionId] = row.excepcionId;
      }
      setSelectedExc(current);
      setSelected(
        new Set(
          inc.pendientes
            .filter((row) => row.procesable)
            .map((row) => row.operacionId)
        )
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar alertas pendientes"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.is_admin) return;
    const timer = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(timer);
  }, [user]);

  if (authLoading) {
    return <div className="text-sm text-faro-text">Cargando...</div>;
  }

  if (!user || !user.is_admin) {
    return (
      <div className="rounded-xl border border-faro-border bg-faro-surface p-12 text-center">
        <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-red-400" />
        <h1 className="text-lg font-semibold text-faro-textlight">
          Acceso denegado
        </h1>
        <p className="mt-1 text-sm text-faro-text">
          Esta sección está disponible solo para administradores.
        </p>
      </div>
    );
  }

  const assign = async (row: TransbelExcepcion) => {
    const excepcionId = selectedExc[row.operacionId];
    if (!excepcionId) {
      setError("Seleccioná una excepción para asignar.");
      return;
    }
    setAsignando(row.operacionId);
    setError("");
    setMessage("");
    try {
      const result = await api.transbel.excepciones.asignar({
        operacionId: row.operacionId,
        excepcionId,
      });
      setMessage(
        `Excepción ${result.excepcionId} asignada a la operación ${result.operacionId} (${result.accion}).`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al asignar excepción");
    } finally {
      setAsignando(null);
    }
  };

  const saveReferencia = async (operacionId: number, referencia: string) => {
    setError("");
    setMessage("");
    try {
      const result = await api.transbel.excepciones.actualizarReferencia({
        operacionId,
        referenciaCliente: referencia,
      });
      setMessage(
        `Referencia de la operación ${operacionId} actualizada: ${
          result.anterior || "—"
        } → ${result.referenciaCliente}.`
      );
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al actualizar la referencia"
      );
      throw err;
    }
  };

  const processPendiente = async (row: TransbelExcepcion) => {
    if (row.diferencia != null && row.diferencia > 3 && !row.excepcionId) {
      setError(
        "Debe asignar una excepción antes de procesar esta operación (más de 3 días)."
      );
      return;
    }
    setProcesandoPendiente(row.operacionId);
    setError("");
    setMessage("");
    try {
      const result = await api.transbel.excepciones.procesar({
        operacionId: row.operacionId,
      });
      setMessage(
        result.yaEnviado
          ? `La operación ${row.operacionId} ya estaba enviada; su excepción fue finalizada.`
          : `Operación ${row.operacionId} procesada y finalizada (${result.enviados} envío(s)).`
      );
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al procesar la operación"
      );
    } finally {
      setProcesandoPendiente(null);
    }
  };

  const process = async (ids: number[]) => {
    if (ids.length === 0) return;
    setProcesando(true);
    setError("");
    setMessage("");
    try {
      const result = await api.transbel.sincronizacion.procesar(ids);
      const extra = result.noProcesables.length
        ? ` No procesables: ${result.noProcesables.length}.`
        : "";
      setMessage(
        `Procesadas ${result.procesadas}: ${result.ok} ok, ${result.fallidas} con error.${extra}`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar operaciones");
    } finally {
      setProcesando(false);
    }
  };

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const changeTab = (value: Tab) => {
    setTab(value);
    setPage(1);
    setError("");
    setMessage("");
  };

  const activeLength =
    tab === "pendientes"
      ? pendientes.length
      : tab === "historial"
        ? historial.length
        : incompletos.length;
  const totalPages = Math.max(1, Math.ceil(activeLength / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pendientesPage = pendientes.slice(start, start + PAGE_SIZE);
  const historialPage = historial.slice(start, start + PAGE_SIZE);
  const incompletosPage = incompletos.slice(start, start + PAGE_SIZE);
  const selectedProcessable = incompletos.filter(
    (row) => row.procesable && selected.has(row.operacionId)
  );

  const card = (value: Tab, label: string, count: number) => (
    <button
      key={value}
      onClick={() => changeTab(value)}
      className={`flex min-w-[180px] flex-col items-start rounded-xl border px-4 py-3 text-left transition-colors ${
        tab === value
          ? "border-cyan-400/50 bg-white/[0.06]"
          : "border-faro-border bg-faro-surface hover:bg-white/[0.03]"
      }`}
    >
      <span className="text-xs text-faro-text">{label}</span>
      <span className="mt-1 text-2xl font-semibold text-faro-textlight">
        {count}
      </span>
    </button>
  );

  return (
    <div>
      <PageHeader
        title="Alertas Pendientes"
        subtitle="TRANSBEL: operaciones con excepción pendiente y datos incompletos para sincronizar"
      >
        <button
          onClick={load}
          disabled={loading || procesando}
          className={buttonSecondary}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </PageHeader>

      {error && <ErrorBanner message={error} />}
      {message && (
        <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
          {message}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        {card("pendientes", "Excepciones pendientes", pendientes.length)}
        {card("historial", "Historial", historial.length)}
        {card("incompletos", "Datos incompletos 3PL", incompletos.length)}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-faro-text">
          <ClipboardList className="h-4 w-4" />
          {tab === "pendientes"
            ? "Operaciones que necesitan una excepción"
            : tab === "historial"
              ? "Excepciones finalizadas"
              : "Operaciones sin datos CLICK completos"}
        </span>
        {tab === "incompletos" && (
          <button
            onClick={() =>
              process(selectedProcessable.map((row) => row.operacionId))
            }
            disabled={procesando || selectedProcessable.length === 0}
            className={`${buttonPrimary} ml-auto`}
          >
            <RefreshCw className={`h-4 w-4 ${procesando ? "animate-spin" : ""}`} />
            Procesar seleccionados ({selectedProcessable.length})
          </button>
        )}
      </div>

      {loading ? (
        <div className="rounded-xl border border-faro-border bg-faro-surface p-12 text-center text-sm text-faro-text">
          Cargando...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-faro-border bg-faro-surface">
          {tab === "pendientes" && (
            <table className="w-full min-w-[1650px] text-left text-xs">
              <thead className="border-b border-faro-border text-faro-text/60">
                <tr>
                  <th className="px-3 py-2">Operación</th>
                  <th className="px-3 py-2">Usuario</th>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Patrón</th>
                  <th className="px-3 py-2">Transporte</th>
                  <th className="px-3 py-2">Aduana</th>
                  <th className="px-3 py-2">Nro. Embarque</th>
                  <th className="px-3 py-2">Referencia</th>
                  <th className="px-3 py-2">Nro. DIM/DEX</th>
                  <th className="px-3 py-2">Canal</th>
                  <th className="px-3 py-2">Pase salida</th>
                  <th className="px-3 py-2">Validación</th>
                  <th className="px-3 py-2">Pago tributos</th>
                  <th className="px-3 py-2">Días</th>
                  <th className="px-3 py-2">Excepción</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pendientesPage.map((row) => {
                  const current = selectedExc[row.operacionId] || "";
                  return (
                    <tr key={row.operacionId} className="border-t border-faro-border">
                      <td className="px-3 py-2 font-mono">{row.operacionId}</td>
                      <td className="px-3 py-2">{dash(row.usuario)}</td>
                      <td className="px-3 py-2">{dash(row.cliente)}</td>
                      <td className="px-3 py-2">{dash(row.patron)}</td>
                      <td className="px-3 py-2">{dash(row.transporte)}</td>
                      <td className="px-3 py-2">{dash(row.recinto)}</td>
                      <td className="px-3 py-2 font-mono">{dash(row.nroEmbarque)}</td>
                      <td className="px-3 py-2">
                        <ReferenciaCell
                          operacionId={row.operacionId}
                          value={row.referenciaCliente}
                          onSave={saveReferencia}
                        />
                      </td>
                      <td className="px-3 py-2 font-mono">{dash(row.nroDui)}</td>
                      <td className="px-3 py-2">
                        <CanalBadge canal={row.imagen} />
                      </td>
                      <td className="px-3 py-2">{dash(row.fechaPaseSalida)}</td>
                      <td className="px-3 py-2">{dash(row.fechaValidacion)}</td>
                      <td className="px-3 py-2">{dash(row.pagoTributos)}</td>
                      <td className="px-3 py-2">
                        {row.diferencia == null ? "—" : `${row.diferencia} d`}
                      </td>
                      <td className="px-3 py-2">
                        {row.excepcionId ? (
                          <span className="inline-flex flex-col">
                            <span className="font-mono text-faro-textlight">
                              {row.excepcionId}
                            </span>
                            <span className="text-faro-text/70">
                              {dash(row.causaPuntual)}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-yellow-300">
                            <AlertTriangle className="h-3.5 w-3.5" /> Sin excepción
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <select
                              value={current}
                              onChange={(e) =>
                                setSelectedExc((prev) => ({
                                  ...prev,
                                  [row.operacionId]: e.target.value,
                                }))
                              }
                              className="max-w-[220px] rounded border border-faro-border bg-faro-surface px-2 py-1 text-xs text-faro-text"
                            >
                              <option value="">Seleccionar...</option>
                              {catalogo.map((item) => (
                                <option
                                  key={item.excepcionId}
                                  value={item.excepcionId}
                                >
                                  {item.excepcionId} · {item.causaPuntual}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => assign(row)}
                              disabled={!current || asignando === row.operacionId}
                              className={`${buttonPrimary} px-2 py-1 text-xs`}
                            >
                              Asignar
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => processPendiente(row)}
                              disabled={
                                (row.diferencia != null &&
                                  row.diferencia > 3 &&
                                  !row.excepcionId) ||
                                procesandoPendiente === row.operacionId ||
                                asignando === row.operacionId
                              }
                              className={`${buttonSecondary} px-2 py-1 text-xs`}
                            >
                              <Play className="h-3 w-3" />
                              Procesar
                            </button>
                            {row.diferencia != null &&
                              row.diferencia > 3 &&
                              !row.excepcionId && (
                                <span className="text-[11px] text-yellow-300">
                                  Requiere excepción (&gt;3 días)
                                </span>
                              )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pendientesPage.length === 0 && (
                  <tr>
                    <td
                      colSpan={16}
                      className="px-3 py-8 text-center text-faro-text/60"
                    >
                      No hay excepciones pendientes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {tab === "historial" && (
            <table className="w-full min-w-[1250px] text-left text-xs">
              <thead className="border-b border-faro-border text-faro-text/60">
                <tr>
                  <th className="px-3 py-2">Operación</th>
                  <th className="px-3 py-2">Usuario</th>
                  <th className="px-3 py-2">Referencia</th>
                  <th className="px-3 py-2">Nro. DIM/DEX</th>
                  <th className="px-3 py-2">Canal</th>
                  <th className="px-3 py-2">Excepción</th>
                  <th className="px-3 py-2">Causa</th>
                  <th className="px-3 py-2">Asignado por</th>
                  <th className="px-3 py-2">Fecha asignación</th>
                  <th className="px-3 py-2">Fecha sync</th>
                </tr>
              </thead>
              <tbody>
                {historialPage.map((row) => (
                  <tr key={row.operacionId} className="border-t border-faro-border">
                    <td className="px-3 py-2 font-mono">{row.operacionId}</td>
                    <td className="px-3 py-2">{dash(row.usuario)}</td>
                    <td className="px-3 py-2 font-mono">
                      {dash(row.referenciaCliente)}
                    </td>
                    <td className="px-3 py-2 font-mono">{dash(row.nroDui)}</td>
                    <td className="px-3 py-2">
                      <CanalBadge canal={row.imagen} />
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {dash(row.excepcionId)}
                    </td>
                    <td className="px-3 py-2">{dash(row.causaPuntual)}</td>
                    <td className="px-3 py-2">{dash(row.asignado)}</td>
                    <td className="px-3 py-2">{dash(row.fechaReg)}</td>
                    <td className="px-3 py-2">{dash(row.fechaSync)}</td>
                  </tr>
                ))}
                {historialPage.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-3 py-8 text-center text-faro-text/60"
                    >
                      No hay excepciones finalizadas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {tab === "incompletos" && (
            <table className="w-full min-w-[1050px] text-left text-xs">
              <thead className="border-b border-faro-border text-faro-text/60">
                <tr>
                  <th className="px-3 py-2"></th>
                  <th className="px-3 py-2">Operación</th>
                  <th className="px-3 py-2">ENTREGA</th>
                  <th className="px-3 py-2">Nro. Registro</th>
                  <th className="px-3 py-2">Gestión</th>
                  <th className="px-3 py-2">Canal</th>
                  <th className="px-3 py-2">Motivo</th>
                  <th className="px-3 py-2">Procesar</th>
                </tr>
              </thead>
              <tbody>
                {incompletosPage.map((row) => (
                  <tr
                    key={row.operacionId}
                    className={
                      "border-t border-faro-border " +
                      (row.procesable
                        ? "text-faro-text"
                        : "bg-yellow-500/10 text-yellow-200")
                    }
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(row.operacionId)}
                        disabled={!row.procesable}
                        onChange={() => toggle(row.operacionId)}
                      />
                    </td>
                    <td className="px-3 py-2 font-mono">{row.operacionId}</td>
                    <td className="px-3 py-2">
                      <ReferenciaCell
                        operacionId={row.operacionId}
                        value={row.entrega}
                        onSave={saveReferencia}
                      />
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {dash(row.nroRegistro)}
                    </td>
                    <td className="px-3 py-2">{dash(String(row.gestion))}</td>
                    <td className="px-3 py-2">
                      <CanalBadge canal={row.canal} />
                    </td>
                    <td className="px-3 py-2">{dash(row.motivo)}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => process([row.operacionId])}
                        disabled={!row.procesable || procesando}
                        className={`${buttonSecondary} px-2 py-1 text-xs`}
                      >
                        {row.procesable ? "Procesar" : "No procesable"}
                      </button>
                    </td>
                  </tr>
                ))}
                {incompletosPage.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-8 text-center text-faro-text/60"
                    >
                      No hay operaciones con datos incompletos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-xs text-faro-text">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className={`${buttonSecondary} px-2 py-1`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span>
            Página {currentPage} de {totalPages} · {activeLength} registros
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className={`${buttonSecondary} px-2 py-1`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <p className="mt-3 text-xs text-faro-text/60">
        <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-green-400" />
        Las acciones de Hermes quedan auditadas en
        <span className="font-mono"> core.transbel_excepciones</span>. En
        Pendientes, las operaciones con más de 3 días requieren una excepción
        asignada para poder procesarse; con 3 días o menos el botón Procesar se
        habilita. La referencia de cliente debe ser un número de 9 dígitos que
        comienza con 180; si aparece en{" "}
        <span className="text-red-400">rojo</span>, usá el lápiz para corregirla.
        Las filas en <span className="text-yellow-300">amarillo</span> de datos
        incompletos no se pueden procesar automáticamente.
      </p>
    </div>
  );
}
