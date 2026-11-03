"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import { EmptyState } from "@/components/EmptyState";
import type {
  VacBloque,
  VacCronograma,
  VacEstadoColor,
} from "@/lib/types";
import {
  CalendarDays,
  Lock,
  LockOpen,
  Plus,
  RefreshCw,
  Trash2,
  TriangleAlert,
} from "lucide-react";

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const WEEKDAYS = ["D", "L", "M", "M", "J", "V", "S"];

const COLOR_CLASS: Record<VacEstadoColor, string> = {
  verde: "bg-emerald-500/85 hover:bg-emerald-500 text-white",
  ambar: "bg-amber-500/85 hover:bg-amber-500 text-white",
  rojo: "bg-red-500/85 hover:bg-red-500 text-white",
  gris: "bg-slate-500/75 hover:bg-slate-500 text-white",
};

const COLOR_LABEL: Record<VacEstadoColor, string> = {
  verde: "Al día",
  ambar: "Con pendientes",
  rojo: "Excedido / conflicto",
  gris: "Sin configurar",
};

const COLOR_DOT: Record<VacEstadoColor, string> = {
  verde: "bg-emerald-400",
  ambar: "bg-amber-400",
  rojo: "bg-red-400",
  gris: "bg-slate-400",
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseDateParts(value: string) {
  return {
    year: Number(value.slice(0, 4)),
    month: Number(value.slice(5, 7)),
    day: Number(value.slice(8, 10)),
  };
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function weekdayOf(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function holidaySet(feriados: VacCronograma["feriados"]) {
  return new Set(feriados.filter((f) => f.descuenta).map((f) => f.fecha));
}

function contarDiasHabilesLocal(desde: string, hasta: string, feriados: VacCronograma["feriados"]) {
  if (!desde || !hasta || hasta < desde) return 0;
  const off = holidaySet(feriados);
  let count = 0;
  let current = new Date(`${desde}T00:00:00Z`);
  const end = new Date(`${hasta}T00:00:00Z`);
  while (current <= end) {
    const iso = current.toISOString().slice(0, 10);
    if (current.getUTCDay() !== 0 && !off.has(iso)) count++;
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
  }
  return count;
}

interface MonthBar {
  bloque: VacBloque;
  startDay: number;
  endDay: number;
  lane: number;
}

function barsForMonth(bloques: VacBloque[], year: number, month: number): MonthBar[] {
  const dim = daysInMonth(year, month);
  const clipped = bloques
    .map((bloque) => {
      const start = parseDateParts(bloque.fechaDesde);
      const end = parseDateParts(bloque.fechaHasta);
      if (start.year === year && start.month === month) {
        return {
          bloque,
          startDay: start.day,
          endDay: end.year === year && end.month === month ? end.day : dim,
        };
      }
      if (end.year === year && end.month === month) {
        return { bloque, startDay: 1, endDay: end.day };
      }
      if (
        new Date(Date.UTC(start.year, start.month - 1, start.day)) <
          new Date(Date.UTC(year, month - 1, 1)) &&
        new Date(Date.UTC(end.year, end.month - 1, end.day)) >
          new Date(Date.UTC(year, month - 1, dim))
      ) {
        return { bloque, startDay: 1, endDay: dim };
      }
      return null;
    })
    .filter((item): item is { bloque: VacBloque; startDay: number; endDay: number } => Boolean(item))
    .sort((a, b) => a.startDay - b.startDay || b.endDay - a.endDay);

  const lanes: number[] = [];
  return clipped.map((item) => {
    let lane = lanes.findIndex((lastEnd) => lastEnd < item.startDay);
    if (lane === -1) {
      lane = lanes.length;
      lanes.push(item.endDay);
    } else {
      lanes[lane] = item.endDay;
    }
    return { ...item, lane };
  });
}

export default function CronogramaVacacionesPage() {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.is_admin);
  const currentYear = new Date().getFullYear();
  const [gestion, setGestion] = useState(currentYear + 1);
  const [data, setData] = useState<VacCronograma | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [colorFilter, setColorFilter] = useState<VacEstadoColor | "todos">("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VacBloque | null>(null);
  const [form, setForm] = useState({
    usuarioId: "",
    fechaDesde: "",
    fechaHasta: "",
    notas: "",
  });
  const [modalError, setModalError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api.vacaciones.cronograma(gestion));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el cronograma");
    } finally {
      setLoading(false);
    }
  }, [gestion]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const funcionarios = useMemo(() => data?.funcionarios ?? [], [data?.funcionarios]);
  const bloques = useMemo(() => data?.bloques ?? [], [data?.bloques]);
  const locked = data?.estado.estado === "bloqueado";

  const funcionarioMap = useMemo(
    () => new Map(funcionarios.map((f) => [f.usuarioId, f])),
    [funcionarios]
  );

  const bloquesFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase();
    return bloques.filter((bloque) => {
      const f = funcionarioMap.get(bloque.usuarioId);
      if (!f) return false;
      if (term && !`${f.nombre} ${f.ci ?? ""} ${f.categoria ?? ""}`.toLowerCase().includes(term)) {
        return false;
      }
      if (colorFilter !== "todos" && f.estadoColor !== colorFilter) return false;
      return true;
    });
  }, [bloques, funcionarioMap, search, colorFilter]);

  const sinPlanificar = useMemo(
    () =>
      funcionarios
        .filter((f) => f.fechaIngreso && f.porPlanificar > 0)
        .sort((a, b) => b.porPlanificar - a.porPlanificar),
    [funcionarios]
  );

  const conflictos = data?.conflictos ?? [];

  const openNew = (usuarioId?: number) => {
    setEditing(null);
    setModalError("");
    setForm({
      usuarioId: usuarioId ? String(usuarioId) : funcionarios[0] ? String(funcionarios[0].usuarioId) : "",
      fechaDesde: "",
      fechaHasta: "",
      notas: "",
    });
    setModalOpen(true);
  };

  const openEdit = (bloque: VacBloque) => {
    setEditing(bloque);
    setModalError("");
    setForm({
      usuarioId: String(bloque.usuarioId),
      fechaDesde: bloque.fechaDesde,
      fechaHasta: bloque.fechaHasta,
      notas: bloque.notas ?? "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setModalError("");
    if (!form.fechaDesde || !form.fechaHasta) {
      setModalError("Completá las fechas desde y hasta.");
      return;
    }
    if (form.fechaHasta < form.fechaDesde) {
      setModalError("La fecha hasta no puede ser anterior a la fecha desde.");
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await api.vacaciones.editarBloque(editing.id, {
          fechaDesde: form.fechaDesde,
          fechaHasta: form.fechaHasta,
          notas: form.notas,
        });
      } else {
        await api.vacaciones.crearBloque({
          usuarioId: Number(form.usuarioId),
          gestion,
          fechaDesde: form.fechaDesde,
          fechaHasta: form.fechaHasta,
          notas: form.notas,
        });
      }
      setModalOpen(false);
      setMessage(editing ? "Bloque actualizado." : "Bloque agregado.");
      await load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Error al guardar el bloque");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!window.confirm("¿Eliminar este bloque del cronograma?")) return;
    setBusy(true);
    setModalError("");
    try {
      await api.vacaciones.eliminarBloque(editing.id);
      setModalOpen(false);
      setMessage("Bloque eliminado.");
      await load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Error al eliminar el bloque");
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    const confirmar = bloques.length > 0;
    if (confirmar && !window.confirm("Esto reemplaza los bloques actuales de la gestión. ¿Continuar?")) {
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api.vacaciones.generar(gestion, confirmar);
      setMessage(`Propuesta generada: ${result.generados} bloques.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar la propuesta");
    } finally {
      setBusy(false);
    }
  };

  const handleLock = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (locked) {
        await api.vacaciones.desbloquear(gestion);
        setMessage("Plan desbloqueado.");
      } else {
        await api.vacaciones.bloquear(gestion);
        setMessage("Plan bloqueado. Ya no se puede regenerar ni editar.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cambiar el bloqueo");
    } finally {
      setBusy(false);
    }
  };

  const modalFuncionario = form.usuarioId
    ? funcionarioMap.get(Number(form.usuarioId))
    : undefined;
  const modalDias = data
    ? contarDiasHabilesLocal(form.fechaDesde, form.fechaHasta, data.feriados)
    : 0;
  const feriadosMap = useMemo(
    () => new Map((data?.feriados ?? []).map((f) => [f.fecha, f])),
    [data?.feriados]
  );

  return (
    <div>
      <PageHeader
        title="Cronograma de Vacaciones"
        subtitle="Planificación de la gestión y seguimiento de los días que arrastra cada funcionario"
      >
        <div className="flex items-center gap-2">
          <select
            value={gestion}
            onChange={(e) => setGestion(Number(e.target.value))}
            className="rounded-lg border border-faro-border bg-faro-surface px-3 py-2 text-sm text-faro-text"
          >
            {[2025, 2026, 2027, 2028, 2029].map((year) => (
              <option key={year} value={year}>
                Gestión {year}
              </option>
            ))}
          </select>
        </div>
      </PageHeader>

      {error && <ErrorBanner message={error} />}
      {message && (
        <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
          {message}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar funcionario, CI o categoría..."
          className="min-w-[240px] rounded-lg border border-faro-border bg-faro-surface px-3 py-2 text-sm text-faro-text"
        />
        <select
          value={colorFilter}
          onChange={(e) => setColorFilter(e.target.value as VacEstadoColor | "todos")}
          className="rounded-lg border border-faro-border bg-faro-surface px-3 py-2 text-sm text-faro-text"
        >
          <option value="todos">Todos los estados</option>
          <option value="ambar">Con pendientes</option>
          <option value="verde">Al día</option>
          <option value="rojo">Excedido / conflicto</option>
          <option value="gris">Sin configurar</option>
        </select>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={handleGenerate}
                disabled={busy || locked || loading}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
                Generar propuesta
              </button>
              <button
                onClick={() => openNew()}
                disabled={busy || locked || loading}
                className="inline-flex items-center gap-2 rounded-lg border border-faro-border px-3 py-2 text-sm text-faro-text hover:bg-white/5 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Agregar bloque
              </button>
              <button
                onClick={handleLock}
                disabled={busy || loading}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  locked
                    ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25"
                    : "bg-slate-500/15 text-slate-300 hover:bg-slate-500/25"
                } disabled:opacity-50`}
              >
                {locked ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {locked ? "Desbloquear" : "Bloquear"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-faro-border bg-faro-surface p-4">
          <p className="text-xs text-faro-text">Funcionarios</p>
          <p className="text-xl font-semibold text-faro-textlight">{funcionarios.length}</p>
        </div>
        <div className="rounded-xl border border-faro-border bg-faro-surface p-4">
          <p className="text-xs text-faro-text">Bloques planificados</p>
          <p className="text-xl font-semibold text-faro-textlight">{bloques.length}</p>
        </div>
        <div className="rounded-xl border border-faro-border bg-faro-surface p-4">
          <p className="text-xs text-faro-text">Conflictos</p>
          <p className={`text-xl font-semibold ${conflictos.length ? "text-red-400" : "text-faro-textlight"}`}>
            {conflictos.length}
          </p>
        </div>
        <div className="rounded-xl border border-faro-border bg-faro-surface p-4">
          <p className="text-xs text-faro-text">Estado del plan</p>
          <p className={`text-xl font-semibold ${locked ? "text-amber-400" : "text-emerald-400"}`}>
            {locked ? "Bloqueado" : "Borrador"}
          </p>
        </div>
      </div>

      {locked && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-300">
          <Lock className="h-4 w-4" />
          El plan de {gestion} está bloqueado. No se puede regenerar ni editar hasta desbloquearlo.
        </div>
      )}

      {conflictos.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
          <div className="mb-2 flex items-center gap-2 font-medium">
            <TriangleAlert className="h-4 w-4" />
            Conflictos detectados en {gestion}
          </div>
          <div className="space-y-1">
            {conflictos.slice(0, 8).map((c, index) => (
              <p key={`${c.grupoId}-${c.usuarioA}-${c.usuarioB}-${index}`}>
                {c.grupoNombre}: {c.nombreA} y {c.nombreB} se cruzan del {c.desde} al {c.hasta} ({c.dias} días).
              </p>
            ))}
            {conflictos.length > 8 && <p>Y {conflictos.length - 8} conflictos más.</p>}
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          {loading ? (
            <div className="rounded-xl border border-faro-border bg-faro-surface p-12 text-center text-sm text-faro-text">
              Cargando cronograma...
            </div>
          ) : data && bloquesFiltrados.length === 0 && sinPlanificar.length === 0 ? (
            <EmptyState>
              <CalendarDays className="mx-auto mb-3 h-8 w-8 text-faro-text/50" />
              <p className="text-sm text-faro-text">
                No hay bloques planificados para {gestion}. Generá una propuesta o agregá un bloque.
              </p>
            </EmptyState>
          ) : (
            MONTH_NAMES.map((monthName, index) => {
              const month = index + 1;
              const dim = daysInMonth(gestion, month);
              const bars = barsForMonth(bloquesFiltrados, gestion, month);
              const laneCount = bars.reduce((max, bar) => Math.max(max, bar.lane + 1), 0);
              return (
                <div key={monthName} className="rounded-xl border border-faro-border bg-faro-surface">
                  <div className="flex items-center justify-between border-b border-faro-border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-faro-textlight">{monthName}</span>
                      <span className="text-xs text-faro-text/60">{gestion}</span>
                    </div>
                    <span className="text-xs text-faro-text/60">{bars.length} bloques</span>
                  </div>
                  <div className="overflow-x-auto px-3 py-2">
                    <div className="min-w-[980px]">
                      <div className="mb-1 flex">
                        {Array.from({ length: 31 }, (_, i) => {
                          const day = i + 1;
                          const valid = day <= dim;
                          const fecha = `${gestion}-${pad2(month)}-${pad2(day)}`;
                          const weekday = weekdayOf(gestion, month, day);
                          const isSunday = weekday === 0;
                          const feriado = feriadosMap.get(fecha);
                          const shade = valid && (isSunday || feriado);
                          return (
                            <div
                              key={day}
                              title={feriado ? `${feriado.descripcion}${feriado.descuenta ? "" : " (no descuenta)"}` : undefined}
                              className={`flex-1 border-r border-faro-border/30 text-center ${
                                shade ? "bg-red-500/10" : ""
                              } ${!valid ? "opacity-20" : ""}`}
                            >
                              <div className="text-[10px] font-medium text-faro-text">
                                {valid ? day : ""}
                              </div>
                              <div className={`text-[9px] ${isSunday ? "text-red-400" : "text-faro-text/50"}`}>
                                {valid ? WEEKDAYS[weekday] : ""}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {Array.from({ length: Math.max(laneCount, 1) }, (_, lane) => {
                        const laneBars = bars.filter((bar) => bar.lane === lane);
                        return (
                          <div key={lane} className="relative mb-1 flex h-10">
                            {Array.from({ length: 31 }, (_, i) => {
                              const day = i + 1;
                              const valid = day <= dim;
                              const fecha = `${gestion}-${pad2(month)}-${pad2(day)}`;
                              const weekday = weekdayOf(gestion, month, day);
                              const feriado = feriadosMap.get(fecha);
                              const shade = valid && (weekday === 0 || feriado);
                              return (
                                <div
                                  key={day}
                                  className={`flex-1 border-r border-faro-border/20 ${
                                    shade ? "bg-red-500/5" : ""
                                  } ${!valid ? "opacity-20" : ""}`}
                                />
                              );
                            })}
                            {laneBars.map((bar) => (
                              <button
                                key={bar.bloque.id}
                                onClick={() => openEdit(bar.bloque)}
                                title={`${bar.bloque.nombre} · ${bar.bloque.fechaDesde} a ${bar.bloque.fechaHasta} · ${bar.bloque.diasPlanificados} días · ${funcionarioMap.get(bar.bloque.usuarioId)?.categoria || "Sin categoría"}`}
                                style={{
                                  left: `${((bar.startDay - 1) / 31) * 100}%`,
                                  width: `${((bar.endDay - bar.startDay + 1) / 31) * 100}%`,
                                  borderLeftColor: bar.bloque.categoriaColor || "#64748b",
                                }}
                                className={`absolute top-0.5 bottom-0.5 overflow-hidden truncate rounded border-l-4 px-1.5 text-left text-[13px] font-medium shadow-sm ${
                                  COLOR_CLASS[bar.bloque.conflicto ? "rojo" : bar.bloque.estadoColor]
                                } ${bar.bloque.conflicto ? "ring-2 ring-red-300" : ""} ${
                                  locked ? "cursor-default" : ""
                                }`}
                              >
                                {bar.bloque.nombre} · {bar.bloque.diasPlanificados}d
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-faro-border bg-faro-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-faro-textlight">Leyenda</h3>
            <div className="space-y-2">
              {(["verde", "ambar", "rojo", "gris"] as VacEstadoColor[]).map((color) => (
                <div key={color} className="flex items-center gap-2 text-xs text-faro-text">
                  <span className={`h-3 w-3 rounded-full ${COLOR_DOT[color]}`} />
                  <span>{COLOR_LABEL[color]}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 text-xs text-faro-text">
                <span className="h-3 w-3 rounded-full bg-red-500/20 ring-1 ring-red-400" />
                <span>Conflicto de grupo</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-faro-border bg-faro-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-faro-textlight">Categorías</h3>
            <div className="space-y-2">
              {(data?.categorias ?? [])
                .filter((categoria) => categoria.activo)
                .map((categoria) => (
                  <div key={categoria.id} className="flex items-center gap-2 text-xs text-faro-text">
                    <span className="h-3 w-3 rounded" style={{ backgroundColor: categoria.color }} />
                    <span>{categoria.nombre}</span>
                  </div>
                ))}
              {(data?.categorias ?? []).filter((categoria) => categoria.activo).length === 0 && (
                <p className="text-xs text-faro-text/60">No hay categorías configuradas.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-faro-border bg-faro-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-faro-textlight">Sin planificar</h3>
              <span className="text-xs text-faro-text/60">{sinPlanificar.length}</span>
            </div>
            {sinPlanificar.length === 0 ? (
              <p className="text-xs text-faro-text/60">Todos los funcionarios con fecha de ingreso tienen plan.</p>
            ) : (
              <div className="space-y-2">
                {sinPlanificar.slice(0, 12).map((f) => (
                  <button
                    key={f.usuarioId}
                    onClick={() => !locked && openNew(f.usuarioId)}
                    disabled={locked}
                    className="flex w-full items-center justify-between gap-2 rounded border border-faro-border px-2 py-1.5 text-left text-xs text-faro-text hover:bg-white/5 disabled:opacity-50"
                  >
                    <span className="truncate">{f.nombre}</span>
                    <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-400">
                      {f.porPlanificar}d
                    </span>
                  </button>
                ))}
                {sinPlanificar.length > 12 && (
                  <p className="text-xs text-faro-text/60">Y {sinPlanificar.length - 12} más.</p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-faro-border bg-faro-surface p-4">
            <h3 className="mb-2 text-sm font-semibold text-faro-textlight">Resumen por color</h3>
            <div className="space-y-1 text-xs text-faro-text">
              {(["verde", "ambar", "rojo", "gris"] as VacEstadoColor[]).map((color) => {
                const count = funcionarios.filter((f) => f.estadoColor === color).length;
                return (
                  <div key={color} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${COLOR_DOT[color]}`} />
                      {COLOR_LABEL[color]}
                    </span>
                    <span>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-faro-border bg-faro-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold text-faro-textlight">
              {editing ? "Editar vacación" : "Agregar vacación"}
            </h3>
            {modalError && <ErrorBanner message={modalError} />}
            <div className="space-y-3">
              <label className="block text-xs text-faro-text">
                Funcionario
                {editing ? (
                  <div className="mt-1 rounded-lg border border-faro-border bg-black/5 px-3 py-2 text-sm text-faro-textlight">
                    {modalFuncionario?.nombre || editing.nombre}
                  </div>
                ) : (
                  <select
                    value={form.usuarioId}
                    onChange={(e) => setForm((f) => ({ ...f, usuarioId: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-faro-border bg-faro-surface px-3 py-2 text-sm text-faro-text"
                  >
                    <option value="">Seleccionar...</option>
                    {funcionarios.map((f) => (
                      <option key={f.usuarioId} value={f.usuarioId}>
                        {f.nombre} ({f.porPlanificar} por planificar)
                      </option>
                    ))}
                  </select>
                )}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-faro-text">
                  Desde
                  <input
                    type="date"
                    value={form.fechaDesde}
                    onChange={(e) => setForm((f) => ({ ...f, fechaDesde: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-faro-border bg-faro-surface px-3 py-2 text-sm text-faro-text"
                  />
                </label>
                <label className="block text-xs text-faro-text">
                  Hasta
                  <input
                    type="date"
                    value={form.fechaHasta}
                    onChange={(e) => setForm((f) => ({ ...f, fechaHasta: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-faro-border bg-faro-surface px-3 py-2 text-sm text-faro-text"
                  />
                </label>
              </div>
              <div className="rounded-lg bg-black/5 px-3 py-2 text-xs text-faro-text">
                Días hábiles calculados: <span className="font-semibold text-faro-textlight">{modalDias}</span>
                {modalFuncionario && (
                  <span className="ml-2">
                    · Disponible: {modalFuncionario.disponible} · Planificado: {modalFuncionario.planificado}
                  </span>
                )}
              </div>
              <label className="block text-xs text-faro-text">
                Nota
                <textarea
                  value={form.notas}
                  onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-faro-border bg-faro-surface px-3 py-2 text-sm text-faro-text"
                />
              </label>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <div>
                {editing && !locked && (
                  <button
                    onClick={handleDelete}
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    Eliminar
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalOpen(false)}
                  disabled={busy}
                  className="rounded-lg border border-faro-border px-3 py-2 text-sm text-faro-text hover:bg-white/5 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={busy || locked}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {busy ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
