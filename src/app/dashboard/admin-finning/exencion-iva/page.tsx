"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type {
  ArancelPartida,
  IvaExencion,
  IvaExencionEstado,
  IvaExencionPartida,
} from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Plus, Search, Trash2, Upload, Save, Pencil, X, Percent } from "lucide-react";

type FormState = {
  decreto: string;
  vigente_desde: string;
  vigente_hasta: string;
  indefinido: boolean;
  observacion: string;
  activo: boolean;
};

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): FormState {
  return {
    decreto: "",
    vigente_desde: hoy(),
    vigente_hasta: "",
    indefinido: true,
    observacion: "",
    activo: true,
  };
}

function fmtDate(value: string | null) {
  if (!value) return "-";
  const [y, m, d] = value.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : value;
}

const ESTADO_STYLE: Record<IvaExencionEstado, string> = {
  vigente: "bg-green-500/10 text-green-400 border-green-500/20",
  futuro: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  vencido: "bg-faro-surface text-faro-text border-faro-border",
  inactivo: "bg-red-500/10 text-red-400 border-red-500/20",
};

const ESTADO_LABEL: Record<IvaExencionEstado, string> = {
  vigente: "Vigente",
  futuro: "Futuro",
  vencido: "Vencido",
  inactivo: "Inactivo",
};

export default function ExcepcionIvaPage() {
  const [exenciones, setExenciones] = useState<IvaExencion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [partidas, setPartidas] = useState<IvaExencionPartida[]>([]);
  const [partidasDirty, setPartidasDirty] = useState(false);
  const [savingPartidas, setSavingPartidas] = useState(false);
  const [importing, setImporting] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArancelPartida[]>([]);
  const [searching, setSearching] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setExenciones(await api.adminFinning.exenciones.list());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar los decretos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const resetPanel = () => {
    setSelectedId(null);
    setForm(null);
    setCreating(false);
    setPartidas([]);
    setPartidasDirty(false);
    setQuery("");
    setResults([]);
  };

  const openNew = () => {
    setError("");
    setSuccess("");
    setSelectedId(null);
    setCreating(true);
    setForm(emptyForm());
    setPartidas([]);
    setPartidasDirty(false);
    setQuery("");
    setResults([]);
  };

  const openEdit = async (id: number) => {
    setError("");
    setSuccess("");
    try {
      const detalle = await api.adminFinning.exenciones.get(id);
      setSelectedId(id);
      setCreating(false);
      setForm({
        decreto: detalle.decreto,
        vigente_desde: detalle.vigente_desde,
        vigente_hasta: detalle.vigente_hasta || "",
        indefinido: !detalle.vigente_hasta,
        observacion: detalle.observacion || "",
        activo: detalle.activo,
      });
      setPartidas(detalle.partidas);
      setPartidasDirty(false);
      setQuery("");
      setResults([]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar el decreto");
    }
  };

  const save = async () => {
    if (!form) return;
    if (!form.decreto.trim()) {
      setError("El nombre del decreto es requerido");
      return;
    }
    if (!form.vigente_desde) {
      setError("La vigencia desde es requerida");
      return;
    }
    if (!form.indefinido && !form.vigente_hasta) {
      setError("Indica la vigencia hasta o marca la opción indefinida");
      return;
    }
    if (!form.indefinido && form.vigente_hasta < form.vigente_desde) {
      setError("La vigencia hasta no puede ser anterior a la vigencia desde");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    const body = {
      decreto: form.decreto.trim(),
      vigente_desde: form.vigente_desde,
      vigente_hasta: form.indefinido ? null : form.vigente_hasta,
      observacion: form.observacion.trim() || null,
      activo: form.activo,
    };

    try {
      if (creating) {
        const created = await api.adminFinning.exenciones.create(body);
        await load();
        await openEdit(created.id);
        setSuccess("Decreto creado. Ahora puedes cargar sus partidas.");
      } else if (selectedId) {
        await api.adminFinning.exenciones.update(selectedId, body);
        setSuccess("Decreto actualizado correctamente");
        await load();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar el decreto");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: IvaExencion) => {
    if (!confirm(`Eliminar el decreto "${row.decreto}" y sus partidas?`)) return;
    setError("");
    setSuccess("");
    try {
      await api.adminFinning.exenciones.remove(row.id);
      if (selectedId === row.id) resetPanel();
      setSuccess("Decreto eliminado correctamente");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al eliminar el decreto");
    }
  };

  const buscar = async () => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    setError("");
    try {
      setResults(await api.adminFinning.exenciones.buscarArancel(q));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al buscar partidas");
    } finally {
      setSearching(false);
    }
  };

  const addPartida = (row: ArancelPartida) => {
    if (partidas.some((p) => p.partida_arancel === row.codigo)) return;
    setPartidas((prev) => [
      ...prev,
      { partida_arancel: row.codigo, descripcion: row.descripcion },
    ]);
    setPartidasDirty(true);
  };

  const removePartida = (codigo: string) => {
    setPartidas((prev) => prev.filter((p) => p.partida_arancel !== codigo));
    setPartidasDirty(true);
  };

  const savePartidas = async () => {
    if (!selectedId) return;
    setSavingPartidas(true);
    setError("");
    setSuccess("");
    try {
      const r = await api.adminFinning.exenciones.setPartidas(
        selectedId,
        partidas.map((p) => p.partida_arancel)
      );
      setPartidasDirty(false);
      setSuccess(`Partidas guardadas: ${r.total}`);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar las partidas");
    } finally {
      setSavingPartidas(false);
    }
  };

  const importar = async (file: File) => {
    if (!selectedId) return;
    setImporting(true);
    setError("");
    setSuccess("");
    try {
      const r = await api.adminFinning.exenciones.importarPartidas(selectedId, file);
      setSuccess(
        `Importacion: ${r.agregadas} agregadas, ${r.yaExistian} ya existian, ${r.invalidas} invalidas`
      );
      const detalle = await api.adminFinning.exenciones.get(selectedId);
      setPartidas(detalle.partidas);
      setPartidasDirty(false);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al importar las partidas");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const setField = <K extends keyof FormState,>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  return (
    <div>
      <PageHeader
        title="Excepción de IVA"
        subtitle="Decretos con vigencia y partidas que no pagan IVA en las operaciones Finning"
      >
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo decreto
        </button>
      </PageHeader>

      {error && <ErrorBanner message={error} />}
      {success && (
        <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-2 text-sm text-green-400">
          {success}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr] items-start">
        <div className="rounded-xl bg-faro-surface border border-faro-border overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-faro-text">Cargando...</div>
          ) : exenciones.length === 0 ? (
            <div className="rounded-xl border border-dashed border-faro-border bg-faro-surface p-10 text-center">
              <Percent className="mx-auto w-8 h-8 text-faro-text mb-3" />
              <p className="text-sm text-faro-text">No hay decretos configurados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-faro-border bg-white/[0.02]">
                    <th className="px-3 py-3 text-left text-xs font-semibold text-faro-text uppercase tracking-wider">Decreto</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-faro-text uppercase tracking-wider">Vigencia</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-faro-text uppercase tracking-wider">Partidas</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-faro-text uppercase tracking-wider">Estado</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-faro-text uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-faro-border/50">
                  {exenciones.map((row) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-white/[0.02] transition-colors ${selectedId === row.id ? "bg-blue-500/5" : ""}`}
                    >
                      <td className="px-3 py-2.5 text-faro-textlight">{row.decreto}</td>
                      <td className="px-3 py-2.5 text-faro-text text-xs whitespace-nowrap">
                        {fmtDate(row.vigente_desde)} → {row.vigente_hasta ? fmtDate(row.vigente_hasta) : "indefinido"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-faro-textlight">{row.partidas}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-medium ${ESTADO_STYLE[row.estado]}`}>
                          {ESTADO_LABEL[row.estado]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => void openEdit(row.id)}
                            className="p-1.5 rounded-md hover:bg-white/[0.04] text-faro-text hover:text-blue-400 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => void remove(row)}
                            className="p-1.5 rounded-md hover:bg-white/[0.04] text-faro-text hover:text-red-400 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-faro-surface border border-faro-border">
          {!form ? (
            <div className="p-8 text-center">
              <Percent className="mx-auto w-6 h-6 text-faro-text/40 mb-2" />
              <p className="text-sm text-faro-text/60">Selecciona un decreto o crea uno nuevo</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-faro-textlight">
                  {creating ? "Nuevo decreto" : "Editar decreto"}
                </h2>
                <button
                  onClick={resetPanel}
                  className="p-1.5 rounded-md hover:bg-white/[0.04] text-faro-text hover:text-faro-textlight transition-colors"
                  title="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wider font-medium text-faro-text">Nombre del decreto *</label>
                <input
                  type="text"
                  value={form.decreto}
                  onChange={(e) => setField("decreto", e.target.value)}
                  placeholder="Ej. DS 1234/2025"
                  className="w-full rounded-lg border border-faro-border bg-faro-bg px-3 py-1.5 text-sm text-faro-textlight focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] uppercase tracking-wider font-medium text-faro-text">Vigente desde *</label>
                  <input
                    type="date"
                    value={form.vigente_desde}
                    onChange={(e) => setField("vigente_desde", e.target.value)}
                    className="w-full rounded-lg border border-faro-border bg-faro-bg px-3 py-1.5 text-sm text-faro-textlight focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] uppercase tracking-wider font-medium text-faro-text">Vigente hasta</label>
                  <input
                    type="date"
                    value={form.indefinido ? "" : form.vigente_hasta}
                    disabled={form.indefinido}
                    onChange={(e) => setField("vigente_hasta", e.target.value)}
                    className="w-full rounded-lg border border-faro-border bg-faro-bg px-3 py-1.5 text-sm text-faro-textlight focus:border-blue-500 focus:outline-none disabled:opacity-50"
                  />
                  <label className="flex items-center gap-2 text-xs text-faro-text mt-1">
                    <input
                      type="checkbox"
                      checked={form.indefinido}
                      onChange={(e) => setField("indefinido", e.target.checked)}
                    />
                    Indefinido
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wider font-medium text-faro-text">Observación</label>
                <textarea
                  value={form.observacion}
                  onChange={(e) => setField("observacion", e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-faro-border bg-faro-bg px-3 py-1.5 text-sm text-faro-textlight focus:border-blue-500 focus:outline-none"
                />
              </div>

              {!creating && (
                <label className="flex items-center gap-2 text-xs text-faro-text">
                  <input
                    type="checkbox"
                    checked={form.activo}
                    onChange={(e) => setField("activo", e.target.checked)}
                  />
                  Decreto activo
                </label>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={resetPanel}
                  className="px-3 py-1.5 rounded-lg text-sm text-faro-text hover:bg-white/[0.04] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => void save()}
                  disabled={saving}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>

              {!creating && selectedId && (
                <div className="pt-4 mt-2 border-t border-faro-border space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-faro-textlight">
                      Partidas <span className="text-faro-text font-normal">({partidas.length})</span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fileRef.current?.click()}
                        disabled={importing}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-faro-surface border border-faro-border text-faro-text hover:bg-white/[0.04] transition-colors disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {importing ? "Importando..." : "Importar Excel"}
                      </button>
                      <input
                        type="file"
                        ref={fileRef}
                        accept=".xls,.xlsx,.xlsm"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void importar(file);
                        }}
                      />
                      <button
                        onClick={() => void savePartidas()}
                        disabled={!partidasDirty || savingPartidas}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {savingPartidas ? "Guardando..." : "Guardar partidas"}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void buscar();
                      }}
                      placeholder="Buscar partida por código o descripción..."
                      className="flex-1 rounded-lg border border-faro-border bg-faro-bg px-3 py-1.5 text-sm text-faro-textlight placeholder:text-faro-text/40 focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      onClick={() => void buscar()}
                      disabled={searching}
                      className="p-2 rounded-lg bg-faro-surface border border-faro-border text-faro-text hover:bg-white/[0.04] transition-colors disabled:opacity-50"
                      title="Buscar"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>

                  {results.length > 0 && (
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-faro-border bg-faro-bg divide-y divide-faro-border/50">
                      {results.map((r) => {
                        const yaEsta = partidas.some((p) => p.partida_arancel === r.codigo);
                        return (
                          <div key={r.codigo} className="flex items-center justify-between gap-3 px-3 py-1.5">
                            <div className="min-w-0">
                              <div className="font-mono text-xs text-faro-textlight">{r.codigo}</div>
                              <div className="text-[11px] text-faro-text truncate">{r.descripcion}</div>
                            </div>
                            <button
                              onClick={() => addPartida(r)}
                              disabled={yaEsta}
                              className="shrink-0 px-2 py-1 rounded text-[11px] font-medium bg-blue-600/80 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-default"
                            >
                              {yaEsta ? "Agregada" : "Agregar"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="max-h-64 overflow-y-auto rounded-lg border border-faro-border bg-faro-bg divide-y divide-faro-border/50">
                    {partidas.length === 0 ? (
                      <div className="p-4 text-center text-xs text-faro-text/60">
                        Este decreto no tiene partidas
                      </div>
                    ) : (
                      partidas.map((p) => (
                        <div key={p.partida_arancel} className="flex items-center justify-between gap-3 px-3 py-1.5">
                          <div className="min-w-0">
                            <div className="font-mono text-xs text-faro-textlight">{p.partida_arancel}</div>
                            <div className="text-[11px] text-faro-text truncate">{p.descripcion}</div>
                          </div>
                          <button
                            onClick={() => removePartida(p.partida_arancel)}
                            className="shrink-0 p-1 rounded hover:bg-white/[0.04] text-faro-text hover:text-red-400 transition-colors"
                            title="Quitar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {partidasDirty && (
                    <p className="text-[11px] text-amber-400">
                      Hay cambios sin guardar en las partidas.
                    </p>
                  )}
                </div>
              )}

              {creating && (
                <p className="text-[11px] text-faro-text/60">
                  Guarda el decreto para poder cargar sus partidas.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
