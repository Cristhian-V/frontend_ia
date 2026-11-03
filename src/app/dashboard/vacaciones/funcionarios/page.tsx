"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import { EmptyState } from "@/components/EmptyState";
import type {
  VacAjuste,
  VacCandidato,
  VacCategoria,
  VacConflicto,
  VacEstadoColor,
  VacFeriado,
  VacFuncionario,
  VacGrupo,
  VacImportPreview,
  VacImportResult,
} from "@/lib/types";
import {
  CalendarDays,
  Check,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";

const COLOR_DOT: Record<VacEstadoColor, string> = {
  verde: "bg-emerald-400",
  ambar: "bg-amber-400",
  rojo: "bg-red-400",
  gris: "bg-slate-400",
};

const COLOR_LABEL: Record<VacEstadoColor, string> = {
  verde: "Al día",
  ambar: "Pendiente",
  rojo: "Excedido",
  gris: "Sin configurar",
};

type Tab = "funcionarios" | "conflictos" | "feriados" | "categorias";

const inputCls =
  "w-full rounded-lg border border-faro-border bg-faro-surface px-3 py-2 text-sm text-faro-text";
const buttonPrimary =
  "inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50";
const buttonSecondary =
  "inline-flex items-center gap-2 rounded-lg border border-faro-border px-3 py-2 text-sm text-faro-text hover:bg-white/5 disabled:opacity-50";

function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className={`max-h-[90vh] w-full overflow-auto rounded-xl border border-faro-border bg-faro-surface p-5 ${
          wide ? "max-w-6xl" : "max-w-2xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-faro-textlight">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-faro-text hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function FuncionariosVacacionesPage() {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.is_admin);
  const currentYear = new Date().getFullYear();
  const [gestion, setGestion] = useState(currentYear);
  const [tab, setTab] = useState<Tab>("funcionarios");
  const [funcionarios, setFuncionarios] = useState<VacFuncionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [fechasDraft, setFechasDraft] = useState<Record<number, string>>({});
  const [categorias, setCategorias] = useState<VacCategoria[]>([]);
  const [showCategoria, setShowCategoria] = useState(false);
  const [categoriaEditing, setCategoriaEditing] = useState<VacCategoria | null>(null);
  const [categoriaForm, setCategoriaForm] = useState({
    nombre: "",
    color: "#3b82f6",
    activo: true,
  });
  const [showAjustes, setShowAjustes] = useState(false);
  const [ajusteFuncionario, setAjusteFuncionario] = useState<VacFuncionario | null>(null);
  const [ajustesList, setAjustesList] = useState<VacAjuste[]>([]);
  const [ajusteEditing, setAjusteEditing] = useState<VacAjuste | null>(null);
  const [ajusteForm, setAjusteForm] = useState({ dias: "", tipo: "compensacion", motivo: "" });

  const [showInicial, setShowInicial] = useState(false);
  const [initialGestion, setInitialGestion] = useState(currentYear);
  const [initialForm, setInitialForm] = useState<
    Record<number, { corresponden: string; pendientes: string; pagados: string; notas: string }>
  >({});

  const [showSync, setShowSync] = useState(false);
  const [candidatos, setCandidatos] = useState<VacCandidato[]>([]);
  const [syncDates, setSyncDates] = useState<Record<number, string>>({});

  const [grupos, setGrupos] = useState<VacGrupo[]>([]);
  const [conflictos, setConflictos] = useState<VacConflicto[]>([]);
  const [showGrupo, setShowGrupo] = useState(false);
  const [grupoEditing, setGrupoEditing] = useState<VacGrupo | null>(null);
  const [grupoForm, setGrupoForm] = useState({
    nombre: "",
    cliente: "",
    notas: "",
    miembros: [] as number[],
  });

  const [feriados, setFeriados] = useState<VacFeriado[]>([]);
  const [showFeriado, setShowFeriado] = useState(false);
  const [feriadoEditing, setFeriadoEditing] = useState<VacFeriado | null>(null);
  const [feriadoForm, setFeriadoForm] = useState({
    fecha: "",
    descripcion: "",
    ambito: "nacional" as "nacional" | "departamental",
    descuenta: true,
  });

  const [showImport, setShowImport] = useState(false);
  const [importPreview, setImportPreview] = useState<VacImportPreview | null>(null);
  const [importResult, setImportResult] = useState<VacImportResult | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const loadFuncionarios = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setFuncionarios(await api.vacaciones.funcionarios(gestion));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar funcionarios");
    } finally {
      setLoading(false);
    }
  }, [gestion]);

  const loadGrupos = useCallback(async () => {
    try {
      const data = await api.vacaciones.conflictos(gestion);
      setGrupos(data.grupos);
      setConflictos(data.conflictos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar conflictos");
    }
  }, [gestion]);

  const loadFeriados = useCallback(async () => {
    try {
      setFeriados(await api.vacaciones.feriados.list(gestion));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar feriados");
    }
  }, [gestion]);

  const loadCategorias = useCallback(async () => {
    try {
      setCategorias(await api.vacaciones.categorias.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar categor?as");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFuncionarios();
  }, [loadFuncionarios]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCategorias();
  }, [loadCategorias]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tab === "conflictos") loadGrupos();
    if (tab === "feriados") loadFeriados();
  }, [tab, loadGrupos, loadFeriados]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return funcionarios;
    return funcionarios.filter((f) =>
      `${f.nombre} ${f.ci ?? ""} ${f.categoria ?? ""} ${f.email ?? ""}`.toLowerCase().includes(term)
    );
  }, [funcionarios, search]);

  const openInicial = async () => {
    const base =
      funcionarios.find((f) => f.saldoInicial)?.saldoInicial?.gestion ?? new Date().getFullYear();
    setInitialGestion(base);
    let source = funcionarios;
    if (gestion !== base) {
      try {
        source = await api.vacaciones.funcionarios(base);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar la gesti?n de corte");
      }
    }
    const next: Record<number, { corresponden: string; pendientes: string; pagados: string; notas: string }> = {};
    for (const f of source) {
      next[f.usuarioId] = {
        corresponden: String(f.saldoInicial?.diasCorresponden ?? f.corresponden ?? 0),
        pendientes: String(f.saldoInicial?.diasPendientes ?? 0),
        pagados: String(f.saldoInicial?.diasPagados ?? 0),
        notas: f.saldoInicial?.notas ?? "",
      };
    }
    setInitialForm(next);
    setShowInicial(true);
  };

  const saveInicial = async () => {
    setSavingId(-1);
    setError("");
    setMessage("");
    try {
      const items = funcionarios
        .filter((f) => initialForm[f.usuarioId])
        .map((f) => ({
          usuarioId: f.usuarioId,
          gestion: initialGestion,
          diasCorresponden: Number(initialForm[f.usuarioId].corresponden || 0),
          diasPendientes: Number(initialForm[f.usuarioId].pendientes || 0),
          diasPagados: Number(initialForm[f.usuarioId].pagados || 0),
          notas: initialForm[f.usuarioId].notas,
        }));
      await api.vacaciones.saldosIniciales(items);
      setShowInicial(false);
      setMessage(`Carga inicial de ${items.length} funcionarios guardada.`);
      await loadFuncionarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la carga inicial");
    } finally {
      setSavingId(null);
    }
  };

  const updateCategoriaFuncionario = async (f: VacFuncionario, value: string) => {
    setSavingId(f.usuarioId);
    setError("");
    setMessage("");
    try {
      await api.vacaciones.updateFuncionario(f.usuarioId, { categoria: value || null });
      setMessage("Categor?a actualizada.");
      await loadFuncionarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar la categor?a");
    } finally {
      setSavingId(null);
    }
  };

  const recalcularFuncionario = async (f: VacFuncionario) => {
    setSavingId(f.usuarioId);
    setError("");
    setMessage("");
    try {
      const result = await api.vacaciones.recalcular(f.usuarioId, gestion);
      setMessage(
        `Recalculado ${f.nombre}: ${result.diasCorresponden} d?as para la gesti?n ${result.gestion}.`
      );
      await loadFuncionarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al recalcular los d?as");
    } finally {
      setSavingId(null);
    }
  };

  const openCategoria = (categoria?: VacCategoria) => {
    setCategoriaEditing(categoria ?? null);
    setCategoriaForm({
      nombre: categoria?.nombre ?? "",
      color: categoria?.color ?? "#3b82f6",
      activo: categoria ? categoria.activo : true,
    });
    setShowCategoria(true);
  };

  const saveCategoria = async () => {
    setSavingId(-1);
    setError("");
    try {
      if (categoriaEditing) {
        await api.vacaciones.categorias.update(categoriaEditing.id, categoriaForm);
      } else {
        await api.vacaciones.categorias.create(categoriaForm);
      }
      setShowCategoria(false);
      setMessage(categoriaEditing ? "Categor?a actualizada." : "Categor?a creada.");
      await loadCategorias();
      await loadFuncionarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la categor?a");
    } finally {
      setSavingId(null);
    }
  };

  const deleteCategoria = async (categoria: VacCategoria) => {
    if (!window.confirm(`?Eliminar la categor?a "${categoria.nombre}"? Los funcionarios quedar?n sin categor?a.`)) return;
    setError("");
    try {
      await api.vacaciones.categorias.delete(categoria.id);
      setMessage("Categor?a eliminada.");
      await loadCategorias();
      await loadFuncionarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar la categor?a");
    }
  };

  const updateFechaIngreso = async (f: VacFuncionario, value: string) => {
    setSavingId(f.usuarioId);
    setError("");
    try {
      await api.vacaciones.updateFuncionario(f.usuarioId, {
        fecha_ingreso: value || null,
      });
      setFechasDraft((prev) => {
        const next = { ...prev };
        delete next[f.usuarioId];
        return next;
      });
      await loadFuncionarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar la fecha de ingreso");
    } finally {
      setSavingId(null);
    }
  };

  const openAjustes = async (f: VacFuncionario) => {
    setAjusteFuncionario(f);
    setAjusteEditing(null);
    setAjusteForm({ dias: "", tipo: "compensacion", motivo: "" });
    setShowAjustes(true);
    setError("");
    try {
      setAjustesList(await api.vacaciones.ajustes.list(f.usuarioId, gestion));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar ajustes");
    }
  };

  const saveAjuste = async () => {
    if (!ajusteFuncionario) return;
    setSavingId(-1);
    setError("");
    try {
      const body = {
        usuarioId: ajusteFuncionario.usuarioId,
        gestion,
        dias: Number(ajusteForm.dias || 0),
        tipo: ajusteForm.tipo,
        motivo: ajusteForm.motivo,
      };
      if (ajusteEditing) await api.vacaciones.ajustes.update(ajusteEditing.id, body);
      else await api.vacaciones.ajustes.create(body);
      setAjusteEditing(null);
      setAjusteForm({ dias: "", tipo: "compensacion", motivo: "" });
      setAjustesList(await api.vacaciones.ajustes.list(ajusteFuncionario.usuarioId, gestion));
      await loadFuncionarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el ajuste");
    } finally {
      setSavingId(null);
    }
  };

  const editAjuste = (ajuste: VacAjuste) => {
    setAjusteEditing(ajuste);
    setAjusteForm({ dias: String(ajuste.dias), tipo: ajuste.tipo, motivo: ajuste.motivo ?? "" });
  };

  const deleteAjuste = async (ajuste: VacAjuste) => {
    if (!window.confirm("?Eliminar este ajuste?")) return;
    setError("");
    try {
      await api.vacaciones.ajustes.delete(ajuste.id);
      if (ajusteFuncionario) {
        setAjustesList(await api.vacaciones.ajustes.list(ajusteFuncionario.usuarioId, gestion));
      }
      await loadFuncionarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar el ajuste");
    }
  };

  const excludeFuncionario = async (f: VacFuncionario) => {
    if (!window.confirm(`?Excluir a ${f.nombre} del roster de vacaciones?`)) return;
    setSavingId(f.usuarioId);
    setError("");
    try {
      await api.vacaciones.updateFuncionario(f.usuarioId, { incluido: false });
      setMessage("Funcionario excluido. Pod?s reincorporarlo desde Sincronizar.");
      await loadFuncionarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al excluir el funcionario");
    } finally {
      setSavingId(null);
    }
  };

  const openSync = async () => {
    setShowSync(true);
    setError("");
    try {
      setCandidatos(await api.vacaciones.candidatos());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar candidatos");
    }
  };

  const includeCandidato = async (c: VacCandidato) => {
    setSavingId(c.usuarioId);
    setError("");
    try {
      await api.vacaciones.updateFuncionario(c.usuarioId, {
        incluido: true,
        fecha_ingreso: syncDates[c.usuarioId] || null,
      });
      setCandidatos((prev) => prev.filter((item) => item.usuarioId !== c.usuarioId));
      await loadFuncionarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al incluir el funcionario");
    } finally {
      setSavingId(null);
    }
  };

  const openGrupo = (grupo?: VacGrupo) => {
    setGrupoEditing(grupo ?? null);
    setGrupoForm({
      nombre: grupo?.nombre ?? "",
      cliente: grupo?.cliente ?? "",
      notas: grupo?.notas ?? "",
      miembros: grupo ? grupo.miembros.map((m) => m.usuarioId) : [],
    });
    setShowGrupo(true);
  };

  const saveGrupo = async () => {
    setSavingId(-1);
    setError("");
    try {
      const body = {
        nombre: grupoForm.nombre,
        cliente: grupoForm.cliente || null,
        notas: grupoForm.notas || null,
        miembros: grupoForm.miembros,
      };
      if (grupoEditing) await api.vacaciones.grupos.update(grupoEditing.id, body);
      else await api.vacaciones.grupos.create(body);
      setShowGrupo(false);
      setMessage(grupoEditing ? "Grupo actualizado." : "Grupo creado.");
      await loadGrupos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el grupo");
    } finally {
      setSavingId(null);
    }
  };

  const deleteGrupo = async (grupo: VacGrupo) => {
    if (!window.confirm(`¿Eliminar el grupo "${grupo.nombre}"?`)) return;
    setError("");
    try {
      await api.vacaciones.grupos.delete(grupo.id);
      setMessage("Grupo eliminado.");
      await loadGrupos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar el grupo");
    }
  };

  const openFeriado = (feriado?: VacFeriado) => {
    setFeriadoEditing(feriado ?? null);
    setFeriadoForm({
      fecha: feriado?.fecha ?? "",
      descripcion: feriado?.descripcion ?? "",
      ambito: feriado?.ambito ?? "nacional",
      descuenta: feriado ? feriado.descuenta : true,
    });
    setShowFeriado(true);
  };

  const saveFeriado = async () => {
    setSavingId(-1);
    setError("");
    try {
      if (feriadoEditing) await api.vacaciones.feriados.update(feriadoEditing.id, feriadoForm);
      else await api.vacaciones.feriados.create(feriadoForm);
      setShowFeriado(false);
      setMessage(feriadoEditing ? "Feriado actualizado." : "Feriado creado.");
      await loadFeriados();
      await loadFuncionarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el feriado");
    } finally {
      setSavingId(null);
    }
  };

  const deleteFeriado = async (feriado: VacFeriado) => {
    if (!window.confirm(`¿Eliminar el feriado del ${feriado.fecha}?`)) return;
    setError("");
    try {
      await api.vacaciones.feriados.delete(feriado.id);
      setMessage("Feriado eliminado.");
      await loadFeriados();
      await loadFuncionarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar el feriado");
    }
  };

  const handlePreview = async (file: File | undefined) => {
    if (!file) return;
    setImportLoading(true);
    setError("");
    setImportResult(null);
    try {
      setImportPreview(await api.vacaciones.importar.preview(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al leer el Excel");
    } finally {
      setImportLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const updatePreviewUsuario = (
    kind: "roster" | "planes",
    index: number,
    usuarioId: number | null
  ) => {
    setImportPreview((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [kind]: [...prev[kind]] };
      next[kind][index] = { ...next[kind][index], usuarioId };
      return next;
    });
  };

  const applyImport = async () => {
    if (!importPreview) return;
    setImportLoading(true);
    setError("");
    try {
      const result = await api.vacaciones.importar.apply(importPreview);
      setImportResult(result);
      setMessage("Importación aplicada.");
      await loadFuncionarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al aplicar la importación");
    } finally {
      setImportLoading(false);
    }
  };

  const tabButton = (value: Tab, label: string) => (
    <button
      key={value}
      onClick={() => setTab(value)}
      className={`rounded-lg px-3 py-2 text-sm font-medium ${
        tab === value
          ? "bg-blue-600 text-white"
          : "border border-faro-border text-faro-text hover:bg-white/5"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <PageHeader
        title="Funcionarios"
        subtitle="Roster, antigüedad, saldos, grupos de conflicto y feriados"
      >
        <select
          value={gestion}
          onChange={(e) => {
            setFechasDraft({});
            setGestion(Number(e.target.value));
          }}
          className="rounded-lg border border-faro-border bg-faro-surface px-3 py-2 text-sm text-faro-text"
        >
          {[2025, 2026, 2027, 2028, 2029].map((year) => (
            <option key={year} value={year}>
              Gestión {year}
            </option>
          ))}
        </select>
      </PageHeader>

      {error && <ErrorBanner message={error} />}
      {message && (
        <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
          {message}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabButton("funcionarios", "Funcionarios")}
        {tabButton("conflictos", "Conflictos por cliente")}
        {tabButton("feriados", "Feriados")}
        {tabButton("categorias", "Categor?as")}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {isAdmin && tab === "funcionarios" && (
            <>
              <button onClick={openInicial} className={buttonSecondary}>
                <CalendarDays className="h-4 w-4" />
                Carga inicial
              </button>
              <button onClick={openSync} className={buttonSecondary}>
                <RefreshCw className="h-4 w-4" />
                Sincronizar
              </button>
              <button onClick={() => setShowImport(true)} className={buttonSecondary}>
                <FileSpreadsheet className="h-4 w-4" />
                Importar Excel
              </button>
            </>
          )}
          {isAdmin && tab === "conflictos" && (
            <button onClick={() => openGrupo()} className={buttonPrimary}>
              <Plus className="h-4 w-4" />
              Nuevo grupo
            </button>
          )}
          {isAdmin && tab === "feriados" && (
            <button onClick={() => openFeriado()} className={buttonPrimary}>
              <Plus className="h-4 w-4" />
              Nuevo feriado
            </button>
          )}
          {isAdmin && tab === "categorias" && (
            <button onClick={() => openCategoria()} className={buttonPrimary}>
              <Plus className="h-4 w-4" />
              Nueva categor?a
            </button>
          )}
        </div>
      </div>

      {tab === "funcionarios" && (
        <>
          <div className="mb-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar funcionario, CI, cargo o email..."
              className="min-w-[280px] rounded-lg border border-faro-border bg-faro-surface px-3 py-2 text-sm text-faro-text"
            />
          </div>
          {loading ? (
            <div className="rounded-xl border border-faro-border bg-faro-surface p-12 text-center text-sm text-faro-text">
              Cargando funcionarios...
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState>
              <Users className="mx-auto mb-3 h-8 w-8 text-faro-text/50" />
              <p className="text-sm text-faro-text">
                No hay funcionarios en el roster. Sincronizá con Integgre o importá el Excel.
              </p>
            </EmptyState>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-faro-border bg-faro-surface">
              <table className="w-full min-w-[1300px] text-left text-xs">
                <thead className="border-b border-faro-border text-faro-text/60">
                  <tr>
                    <th className="px-3 py-2">Funcionario</th>
                    <th className="px-3 py-2">CI</th>
                    <th className="px-3 py-2">Categoría</th>
                    <th className="px-3 py-2">Ingreso</th>
                    <th className="px-3 py-2">Antigüedad</th>
                    <th className="px-3 py-2 text-right">Corresponden</th>
                    <th className="px-3 py-2 text-right">Arrastre</th>
                    <th className="px-3 py-2 text-right">Disponible</th>
                    <th className="px-3 py-2 text-right">Planificado</th>
                    <th className="px-3 py-2 text-right">Tomado</th>
                    <th className="px-3 py-2 text-right">Por planificar</th>
                    <th className="px-3 py-2 text-right">Saldo</th>
                    <th className="px-3 py-2">Estado</th>
                    {isAdmin && <th className="px-3 py-2 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => (
                    <tr key={f.usuarioId} className="border-b border-faro-border/40">
                      <td className="px-3 py-2">
                        <div className="font-medium text-faro-textlight">{f.nombre}</div>
                        <div className="text-[10px] text-faro-text/50">
                          {f.email || "Sin email"} {f.activo ? "" : "· inactivo"}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-faro-text">{f.ci || "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: f.categoriaColor || "#64748b" }}
                          />
                          {isAdmin ? (
                            <select
                              value={f.categoria ?? ""}
                              onChange={(e) => updateCategoriaFuncionario(f, e.target.value)}
                              disabled={savingId === f.usuarioId}
                              className="rounded border border-faro-border bg-transparent px-1.5 py-1 text-xs text-faro-text disabled:opacity-60"
                            >
                              <option value="">Sin categoría</option>
                              {categorias
                                .filter((c) => c.activo)
                                .map((c) => (
                                  <option key={c.id} value={c.nombre}>
                                    {c.nombre}
                                  </option>
                                ))}
                              {f.categoria &&
                                !categorias.some((c) => c.nombre === f.categoria) && (
                                  <option value={f.categoria}>{f.categoria} (sin configurar)</option>
                                )}
                            </select>
                          ) : (
                            <span className="text-xs text-faro-text">{f.categoria || "Sin categoría"}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="date"
                            value={fechasDraft[f.usuarioId] ?? f.fechaIngreso ?? ""}
                            disabled={!isAdmin || savingId === f.usuarioId}
                            onChange={(e) =>
                              setFechasDraft((prev) => ({ ...prev, [f.usuarioId]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                fechasDraft[f.usuarioId] &&
                                fechasDraft[f.usuarioId] !== (f.fechaIngreso ?? "")
                              ) {
                                updateFechaIngreso(f, fechasDraft[f.usuarioId]);
                              }
                            }}
                            className="rounded border border-faro-border bg-transparent px-1.5 py-1 text-xs text-faro-text disabled:opacity-60"
                          />
                          {isAdmin &&
                            fechasDraft[f.usuarioId] !== undefined &&
                            fechasDraft[f.usuarioId] !== (f.fechaIngreso ?? "") && (
                              <button
                                onClick={() => updateFechaIngreso(f, fechasDraft[f.usuarioId])}
                                disabled={savingId === f.usuarioId}
                                title="Guardar fecha de ingreso"
                                className="rounded bg-emerald-500/15 px-1.5 py-1 text-[10px] font-medium text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50"
                              >
                                Guardar
                              </button>
                            )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-faro-text">
                        {f.antiguedad
                          ? `${f.antiguedad.anios}a ${f.antiguedad.meses}m`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-faro-text">{f.corresponden}</td>
                      <td className="px-3 py-2 text-right text-faro-text">{f.arrastre}</td>
                      <td className="px-3 py-2 text-right text-faro-textlight">{f.disponible}</td>
                      <td className="px-3 py-2 text-right text-faro-text">{f.planificado}</td>
                      <td className="px-3 py-2 text-right text-faro-text">{f.tomado}</td>
                      <td className={`px-3 py-2 text-right ${f.porPlanificar > 0 ? "text-amber-400" : "text-faro-text"}`}>
                        {f.porPlanificar}
                      </td>
                      <td className={`px-3 py-2 text-right font-medium ${f.saldoCierre < 0 ? "text-red-400" : f.saldoCierre > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                        {f.saldoCierre}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/10 px-2 py-0.5 text-[10px] text-faro-text">
                          <span className={`h-2 w-2 rounded-full ${COLOR_DOT[f.estadoColor]}`} />
                          {f.sinConfigurar ? "Sin configurar" : COLOR_LABEL[f.estadoColor]}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => recalcularFuncionario(f)}
                              disabled={savingId === f.usuarioId}
                              title="Recalcula los d?as seg?n la antig?edad"
                              className="rounded px-2 py-1 text-xs text-faro-text hover:bg-white/5 disabled:opacity-50"
                            >
                              Recalcular
                            </button>
                            <button
                              onClick={() => openAjustes(f)}
                              className="rounded px-2 py-1 text-xs text-faro-text hover:bg-white/5"
                            >
                              Ajustes
                            </button>
                            <button
                              onClick={() => excludeFuncionario(f)}
                              disabled={savingId === f.usuarioId}
                              title="Excluir del roster"
                              className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "conflictos" && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            {grupos.length === 0 ? (
              <EmptyState>
                <Users className="mx-auto mb-3 h-8 w-8 text-faro-text/50" />
                <p className="text-sm text-faro-text">Todavía no hay grupos de conflicto.</p>
              </EmptyState>
            ) : (
              grupos.map((grupo) => (
                <div key={grupo.id} className="rounded-xl border border-faro-border bg-faro-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-faro-textlight">{grupo.nombre}</p>
                      {grupo.cliente && <p className="text-xs text-faro-text/60">Cliente: {grupo.cliente}</p>}
                      {grupo.notas && <p className="mt-1 text-xs text-faro-text/60">{grupo.notas}</p>}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openGrupo(grupo)}
                          className="rounded px-2 py-1 text-xs text-faro-text hover:bg-white/5"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteGrupo(grupo)}
                          className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {grupo.miembros.map((m) => (
                      <span key={m.usuarioId} className="rounded-full bg-black/10 px-2 py-0.5 text-[11px] text-faro-text">
                        {m.nombre}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
          <aside className="rounded-xl border border-faro-border bg-faro-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-faro-textlight">Conflictos en {gestion}</h3>
            {conflictos.length === 0 ? (
              <p className="text-xs text-faro-text/60">No se detectaron cruces de días hábiles.</p>
            ) : (
              <div className="space-y-2">
                {conflictos.map((c, index) => (
                  <div key={`${c.grupoId}-${c.usuarioA}-${c.usuarioB}-${index}`} className="rounded border border-red-500/20 bg-red-500/5 p-2 text-xs text-red-300">
                    <p className="font-medium">{c.grupoNombre}</p>
                    <p>{c.nombreA} y {c.nombreB}</p>
                    <p>{c.desde} a {c.hasta} · {c.dias} días</p>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}

      {tab === "feriados" && (
        <div className="overflow-x-auto rounded-xl border border-faro-border bg-faro-surface">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="border-b border-faro-border text-faro-text/60">
              <tr>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Descripción</th>
                <th className="px-3 py-2">Ámbito</th>
                <th className="px-3 py-2">Descuenta</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {feriados.map((feriado) => (
                <tr key={feriado.id} className="border-b border-faro-border/40">
                  <td className="px-3 py-2 text-faro-textlight">{feriado.fecha}</td>
                  <td className="px-3 py-2 text-faro-text">{feriado.descripcion || "—"}</td>
                  <td className="px-3 py-2 text-faro-text">{feriado.ambito}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${feriado.descuenta ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-500/15 text-slate-400"}`}>
                      {feriado.descuenta ? "Sí" : "No"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isAdmin && (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openFeriado(feriado)} className="rounded px-2 py-1 text-xs text-faro-text hover:bg-white/5">
                          Editar
                        </button>
                        <button onClick={() => deleteFeriado(feriado)} className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {feriados.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-faro-text/60">
                    No hay feriados cargados para {gestion}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "categorias" && (
        <div className="overflow-x-auto rounded-xl border border-faro-border bg-faro-surface">
          <table className="w-full min-w-[600px] text-left text-xs">
            <thead className="border-b border-faro-border text-faro-text/60">
              <tr>
                <th className="px-3 py-2">Categoría</th>
                <th className="px-3 py-2">Color</th>
                <th className="px-3 py-2">Activa</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((categoria) => (
                <tr key={categoria.id} className="border-b border-faro-border/40">
                  <td className="px-3 py-2 text-faro-textlight">{categoria.nombre}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded" style={{ backgroundColor: categoria.color }} />
                      <span className="text-faro-text/60">{categoria.color}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${categoria.activo ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-500/15 text-slate-400"}`}>
                      {categoria.activo ? "Sí" : "No"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isAdmin && (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openCategoria(categoria)} className="rounded px-2 py-1 text-xs text-faro-text hover:bg-white/5">
                          Editar
                        </button>
                        <button onClick={() => deleteCategoria(categoria)} className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {categorias.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-faro-text/60">
                    No hay categorías configuradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showInicial && (
        <Modal title={`Carga inicial de saldos ${initialGestion}`} onClose={() => setShowInicial(false)} wide>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-xs text-blue-300">
              Gestión de corte: {initialGestion}
            </span>
            <span className="text-xs text-faro-text/60">
              Ingresá los días que corresponden y los pendientes de gestiones anteriores. Esta carga se hace una vez.
            </span>
          </div>
          <div className="max-h-[55vh] overflow-auto rounded border border-faro-border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-faro-surface text-faro-text/60">
                <tr>
                  <th className="px-2 py-2">Funcionario</th>
                  <th className="px-2 py-2">Corresponden</th>
                  <th className="px-2 py-2">Pendientes</th>
                  <th className="px-2 py-2">Pagados</th>
                  <th className="px-2 py-2">Notas</th>
                </tr>
              </thead>
              <tbody>
                {funcionarios.map((f) => {
                  const value = initialForm[f.usuarioId] || {
                    corresponden: String(f.corresponden),
                    pendientes: "0",
                    pagados: "0",
                    notas: "",
                  };
                  return (
                    <tr key={f.usuarioId} className="border-b border-faro-border/40">
                      <td className="px-2 py-1.5 text-faro-textlight">{f.nombre}</td>
                      {(["corresponden", "pendientes", "pagados"] as const).map((field) => (
                        <td key={field} className="px-2 py-1.5">
                          <input
                            type="number"
                            min={0}
                            step="0.5"
                            value={value[field]}
                            onChange={(e) =>
                              setInitialForm((prev) => ({
                                ...prev,
                                [f.usuarioId]: { ...value, [field]: e.target.value },
                              }))
                            }
                            className="w-24 rounded border border-faro-border bg-transparent px-1.5 py-1 text-xs text-faro-text"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1.5">
                        <input
                          value={value.notas}
                          onChange={(e) =>
                            setInitialForm((prev) => ({
                              ...prev,
                              [f.usuarioId]: { ...value, notas: e.target.value },
                            }))
                          }
                          className="w-full rounded border border-faro-border bg-transparent px-1.5 py-1 text-xs text-faro-text"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowInicial(false)} className={buttonSecondary}>Cancelar</button>
            <button onClick={saveInicial} disabled={savingId === -1} className={buttonPrimary}>
              <Check className="h-4 w-4" />
              {savingId === -1 ? "Guardando..." : "Guardar carga inicial"}
            </button>
          </div>
        </Modal>
      )}

      {showSync && (
        <Modal title="Sincronizar funcionarios desde Integgre" onClose={() => setShowSync(false)} wide>
          <p className="mb-3 text-xs text-faro-text/60">
            Se listan usuarios activos no-cliente que todavía no están en el roster. Incluilos con su fecha de ingreso.
          </p>
          <div className="max-h-[55vh] overflow-auto rounded border border-faro-border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-faro-surface text-faro-text/60">
                <tr>
                  <th className="px-2 py-2">Funcionario</th>
                  <th className="px-2 py-2">CI</th>
                  <th className="px-2 py-2">Email</th>
                  <th className="px-2 py-2">Fecha ingreso</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {candidatos.map((c) => (
                  <tr key={c.usuarioId} className="border-b border-faro-border/40">
                    <td className="px-2 py-1.5 text-faro-textlight">{c.nombre}</td>
                    <td className="px-2 py-1.5 text-faro-text">{c.ci || "—"}</td>
                    <td className="px-2 py-1.5 text-faro-text">{c.email || "—"}</td>
                    <td className="px-2 py-1.5">
                      <input
                        type="date"
                        value={syncDates[c.usuarioId] || ""}
                        onChange={(e) => setSyncDates((prev) => ({ ...prev, [c.usuarioId]: e.target.value }))}
                        className="rounded border border-faro-border bg-transparent px-1.5 py-1 text-xs text-faro-text"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <button
                        onClick={() => includeCandidato(c)}
                        disabled={savingId === c.usuarioId}
                        className="inline-flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-500 disabled:opacity-50"
                      >
                        <Plus className="h-3 w-3" />
                        Incluir
                      </button>
                    </td>
                  </tr>
                ))}
                {candidatos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-2 py-8 text-center text-faro-text/60">
                      No hay candidatos pendientes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {showGrupo && (
        <Modal title={grupoEditing ? "Editar grupo" : "Nuevo grupo"} onClose={() => setShowGrupo(false)}>
          <div className="space-y-3">
            <label className="block text-xs text-faro-text">
              Nombre / cliente
              <input value={grupoForm.nombre} onChange={(e) => setGrupoForm((f) => ({ ...f, nombre: e.target.value }))} className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block text-xs text-faro-text">
              Cliente (opcional)
              <input value={grupoForm.cliente} onChange={(e) => setGrupoForm((f) => ({ ...f, cliente: e.target.value }))} className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block text-xs text-faro-text">
              Notas
              <textarea value={grupoForm.notas} onChange={(e) => setGrupoForm((f) => ({ ...f, notas: e.target.value }))} rows={2} className={`mt-1 ${inputCls}`} />
            </label>
            <div>
              <p className="mb-2 text-xs text-faro-text">Miembros</p>
              <div className="max-h-52 overflow-auto rounded border border-faro-border p-2">
                {funcionarios.map((f) => (
                  <label key={f.usuarioId} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs text-faro-text hover:bg-white/5">
                    <input
                      type="checkbox"
                      checked={grupoForm.miembros.includes(f.usuarioId)}
                      onChange={(e) =>
                        setGrupoForm((prev) => ({
                          ...prev,
                          miembros: e.target.checked
                            ? [...prev.miembros, f.usuarioId]
                            : prev.miembros.filter((id) => id !== f.usuarioId),
                        }))
                      }
                    />
                    {f.nombre}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowGrupo(false)} className={buttonSecondary}>Cancelar</button>
            <button onClick={saveGrupo} className={buttonPrimary}>Guardar</button>
          </div>
        </Modal>
      )}

      {showFeriado && (
        <Modal title={feriadoEditing ? "Editar feriado" : "Nuevo feriado"} onClose={() => setShowFeriado(false)}>
          <div className="space-y-3">
            <label className="block text-xs text-faro-text">
              Fecha
              <input type="date" value={feriadoForm.fecha} onChange={(e) => setFeriadoForm((f) => ({ ...f, fecha: e.target.value }))} className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block text-xs text-faro-text">
              Descripción
              <input value={feriadoForm.descripcion} onChange={(e) => setFeriadoForm((f) => ({ ...f, descripcion: e.target.value }))} className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block text-xs text-faro-text">
              Ámbito
              <select value={feriadoForm.ambito} onChange={(e) => setFeriadoForm((f) => ({ ...f, ambito: e.target.value as "nacional" | "departamental" }))} className={`mt-1 ${inputCls}`}>
                <option value="nacional">Nacional</option>
                <option value="departamental">Departamental</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-faro-text">
              <input type="checkbox" checked={feriadoForm.descuenta} onChange={(e) => setFeriadoForm((f) => ({ ...f, descuenta: e.target.checked }))} />
              Descuenta del cómputo de vacaciones
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowFeriado(false)} className={buttonSecondary}>Cancelar</button>
            <button onClick={saveFeriado} className={buttonPrimary}>Guardar</button>
          </div>
        </Modal>
      )}


      {showCategoria && (
        <Modal title={categoriaEditing ? "Editar categoría" : "Nueva categoría"} onClose={() => setShowCategoria(false)}>
          <div className="space-y-3">
            <label className="block text-xs text-faro-text">
              Nombre
              <input
                value={categoriaForm.nombre}
                onChange={(e) => setCategoriaForm((f) => ({ ...f, nombre: e.target.value }))}
                className={`mt-1 ${inputCls}`}
              />
            </label>
            <label className="block text-xs text-faro-text">
              Color
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(categoriaForm.color) ? categoriaForm.color : "#3b82f6"}
                  onChange={(e) => setCategoriaForm((f) => ({ ...f, color: e.target.value }))}
                  className="h-9 w-12 cursor-pointer rounded border border-faro-border bg-transparent"
                />
                <input
                  value={categoriaForm.color}
                  onChange={(e) => setCategoriaForm((f) => ({ ...f, color: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </label>
            <label className="flex items-center gap-2 text-xs text-faro-text">
              <input
                type="checkbox"
                checked={categoriaForm.activo}
                onChange={(e) => setCategoriaForm((f) => ({ ...f, activo: e.target.checked }))}
              />
              Activa para asignar a funcionarios
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowCategoria(false)} className={buttonSecondary}>Cancelar</button>
            <button onClick={saveCategoria} disabled={savingId === -1} className={buttonPrimary}>Guardar</button>
          </div>
        </Modal>
      )}

      {showAjustes && ajusteFuncionario && (
        <Modal title={`Ajustes de ${ajusteFuncionario.nombre} · ${gestion}`} onClose={() => setShowAjustes(false)} wide>
          <p className="mb-3 text-xs text-faro-text/60">
            Los ajustes modifican el saldo de la gesti?n. Us? d?as positivos para sumar y negativos para restar.
          </p>
          <div className="max-h-[35vh] overflow-auto rounded border border-faro-border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-faro-surface text-faro-text/60">
                <tr>
                  <th className="px-2 py-2">D?as</th>
                  <th className="px-2 py-2">Tipo</th>
                  <th className="px-2 py-2">Motivo</th>
                  <th className="px-2 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ajustesList.map((ajuste) => (
                  <tr key={ajuste.id} className="border-b border-faro-border/40">
                    <td className="px-2 py-1.5 text-faro-textlight">{ajuste.dias}</td>
                    <td className="px-2 py-1.5 text-faro-text">{ajuste.tipo}</td>
                    <td className="px-2 py-1.5 text-faro-text">{ajuste.motivo || "?"}</td>
                    <td className="px-2 py-1.5 text-right">
                      <button onClick={() => editAjuste(ajuste)} className="rounded px-2 py-1 text-xs text-faro-text hover:bg-white/5">
                        Editar
                      </button>
                      <button onClick={() => deleteAjuste(ajuste)} className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {ajustesList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-2 py-6 text-center text-faro-text/60">
                      No hay ajustes para esta gesti?n.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 grid grid-cols-[100px_160px_minmax(0,1fr)_auto] items-end gap-2">
            <label className="block text-[11px] text-faro-text">
              D?as
              <input type="number" step="0.5" value={ajusteForm.dias} onChange={(e) => setAjusteForm((f) => ({ ...f, dias: e.target.value }))} className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block text-[11px] text-faro-text">
              Tipo
              <select value={ajusteForm.tipo} onChange={(e) => setAjusteForm((f) => ({ ...f, tipo: e.target.value }))} className={`mt-1 ${inputCls}`}>
                <option value="compensacion">Compensaci?n</option>
                <option value="correccion">Correcci?n</option>
                <option value="arrastre">Arrastre</option>
                <option value="pago">Pago / liquidaci?n</option>
              </select>
            </label>
            <label className="block text-[11px] text-faro-text">
              Motivo
              <input value={ajusteForm.motivo} onChange={(e) => setAjusteForm((f) => ({ ...f, motivo: e.target.value }))} className={`mt-1 ${inputCls}`} />
            </label>
            <div className="flex gap-1">
              {ajusteEditing && (
                <button
                  onClick={() => {
                    setAjusteEditing(null);
                    setAjusteForm({ dias: "", tipo: "compensacion", motivo: "" });
                  }}
                  className={buttonSecondary}
                >
                  Cancelar
                </button>
              )}
              <button onClick={saveAjuste} disabled={savingId === -1} className={buttonPrimary}>
                {ajusteEditing ? "Actualizar" : "Agregar"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {showImport && (
        <Modal title="Importar cronograma desde Excel" onClose={() => setShowImport(false)} wide>
          <p className="mb-3 text-xs text-faro-text/60">
            Importa la lista de personal con antigüedad y los cronogramas 2025/2026. Revisá el mapeo antes de aplicar.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => handlePreview(e.target.files?.[0])}
            className="hidden"
          />
          <button onClick={() => fileRef.current?.click()} className={buttonPrimary} disabled={importLoading}>
            <Upload className="h-4 w-4" />
            {importLoading ? "Procesando..." : "Seleccionar Excel"}
          </button>

          {importResult && (
            <div className="mt-3 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-xs text-green-400">
              Roster: {importResult.rosterCreados} creados, {importResult.rosterActualizados} actualizados. Planes:{" "}
              {importResult.planesCreados} creados, {importResult.planesOmitidos} omitidos.
              {importResult.errores.length > 0 && <div className="mt-1">Errores: {importResult.errores.join("; ")}</div>}
            </div>
          )}

          {importPreview && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs text-faro-text md:grid-cols-4">
                <div className="rounded bg-black/10 p-2">Roster OK: {importPreview.resumen.roster.ok}</div>
                <div className="rounded bg-black/10 p-2">Roster dudosos: {importPreview.resumen.roster.duplicados + importPreview.resumen.roster.noEncontrados}</div>
                <div className="rounded bg-black/10 p-2">Planes OK: {importPreview.resumen.planes.ok}</div>
                <div className="rounded bg-black/10 p-2">Planes dudosos: {importPreview.resumen.planes.duplicados + importPreview.resumen.planes.noEncontrados}</div>
              </div>

              <div>
                <h4 className="mb-1 text-xs font-semibold text-faro-textlight">Roster / antigüedad</h4>
                <div className="max-h-48 overflow-auto rounded border border-faro-border">
                  <table className="w-full text-left text-[11px]">
                    <thead className="sticky top-0 bg-faro-surface text-faro-text/60">
                      <tr>
                        <th className="px-2 py-1">Nombre</th>
                        <th className="px-2 py-1">Ingreso</th>
                        <th className="px-2 py-1">UsuarioId</th>
                        <th className="px-2 py-1">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.roster.map((row, index) => (
                        <tr key={`${row.fila}-${index}`} className="border-b border-faro-border/30">
                          <td className="px-2 py-1 text-faro-text">{row.nombre}</td>
                          <td className="px-2 py-1 text-faro-text">{row.fechaIngreso || "—"}</td>
                          <td className="px-2 py-1">
                            <input
                              type="number"
                              value={row.usuarioId ?? ""}
                              onChange={(e) => updatePreviewUsuario("roster", index, e.target.value ? Number(e.target.value) : null)}
                              className="w-24 rounded border border-faro-border bg-transparent px-1 py-0.5 text-[11px] text-faro-text"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <span className={row.estado === "ok" ? "text-emerald-400" : "text-amber-400"}>{row.estado}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="mb-1 text-xs font-semibold text-faro-textlight">Planes 2025/2026</h4>
                <div className="max-h-48 overflow-auto rounded border border-faro-border">
                  <table className="w-full text-left text-[11px]">
                    <thead className="sticky top-0 bg-faro-surface text-faro-text/60">
                      <tr>
                        <th className="px-2 py-1">Gestión</th>
                        <th className="px-2 py-1">Nombre</th>
                        <th className="px-2 py-1">Desde</th>
                        <th className="px-2 py-1">Hasta</th>
                        <th className="px-2 py-1">Días</th>
                        <th className="px-2 py-1">UsuarioId</th>
                        <th className="px-2 py-1">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.planes.map((row, index) => (
                        <tr key={`${row.gestion}-${row.nombreNorm}-${index}`} className="border-b border-faro-border/30">
                          <td className="px-2 py-1 text-faro-text">{row.gestion}</td>
                          <td className="px-2 py-1 text-faro-text">{row.nombreRaw}</td>
                          <td className="px-2 py-1 text-faro-text">{row.fechaDesde}</td>
                          <td className="px-2 py-1 text-faro-text">{row.fechaHasta}</td>
                          <td className="px-2 py-1 text-faro-text">{row.dias}</td>
                          <td className="px-2 py-1">
                            <input
                              type="number"
                              value={row.usuarioId ?? ""}
                              onChange={(e) => updatePreviewUsuario("planes", index, e.target.value ? Number(e.target.value) : null)}
                              className="w-24 rounded border border-faro-border bg-transparent px-1 py-0.5 text-[11px] text-faro-text"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <span className={row.estado === "ok" ? "text-emerald-400" : "text-amber-400"}>{row.estado}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={applyImport} disabled={importLoading} className={buttonPrimary}>
                  <Check className="h-4 w-4" />
                  {importLoading ? "Aplicando..." : "Aplicar importación"}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
