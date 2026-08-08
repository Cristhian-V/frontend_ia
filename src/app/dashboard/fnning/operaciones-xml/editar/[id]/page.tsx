"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { api } from "@/lib/api";
import type { Entidad } from "@/lib/types";
import {
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Save,
  FileCode,
  Building2,
  Download,
  Upload,
  Calculator,
  Grid3X3,
  Plus,
  Trash2,
  Pencil,
  X,
  CalendarDays,
} from "lucide-react";

type FieldDef = {
  label: string;
  field: string;
  colSpan?: number;
};

const OPERACIONES_ROWS: FieldDef[][] = [
  [
    { label: "Nro. Registro", field: "NroRegistro" },
    { label: "Estado Mercancia", field: "EstadoMercancia" },
    { label: "Contenedor", field: "Contenedor" },
    { label: "Tramite", field: "Tramite" },
  ],
  [
    { label: "Patron", field: "Patron" },
    { label: "Doc. Embarque", field: "DocEmbarque" },
    { label: "Id. Conten 1", field: "IdConten1" },
    { label: "INCOTERMS", field: "Incoterm" },
  ],
  [
    { label: "Recinto", field: "Recinto" },
    { label: "NIT Importador", field: "NITImportador" },
    { label: "Id. Conten 2", field: "IdConten2" },
  ],
  [
    { label: "Embalaje", field: "Embalaje" },
    { label: "ReferenciaInt", field: "ReferenciaInt" },
    { label: "Id. Conten 3", field: "IdConten3" },
  ],
  [
    { label: "Regimen", field: "Regimen" },
    { label: "Proveedor", field: "Proveedor", colSpan: 2 },
    { label: "Mercancia Peligrosa", field: "MercanciaPeligrosa" },
  ],
];

const REQUIRED: Set<string> = new Set([
  "NroRegistro", "Tramite", "Patron", "Incoterm", "Recinto",
  "FechaValidacion", "BrokerId", "FechaPago", "ImporterId",
  "FechaSalidadeMercancia", "ExporterId", "ManufacturerId",
  "FOB", "TC", "MonedaId", "PesoBruto", "PesoNeto",
  "ValorCIF", "ValorCIFBS",
]);

function formatDateValue(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string" && val.includes("T")) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return val.slice(0, 10);
  }
  return String(val).slice(0, 10);
}

function formatDecimalValue(val: unknown): string {
  if (val == null) return "";
  const n = Number(val);
  if (isNaN(n)) return "";
  return n.toFixed(2);
}

export default function EditarOperacionPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const isNew = id === "nuevo";
  const modo = isNew ? "edit" : (searchParams.get("modo") || "view");
  const isEdit = modo === "edit";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const [importing, setImporting] = useState(false);
  const [operacion, setOperacion] = useState<Record<string, unknown>>({});
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [itemsPage, setItemsPage] = useState(1);

  const diferencias = useMemo(() => {
    const getOp = (f: string) => Number(operacion[f]) || 0;
    const sumItems = (f: string) => items.reduce((acc, it) => acc + (Number(it[f]) || 0), 0);
    return [
      { key: "FOB", itemField: "FOB", diff: (getOp("FOB") || 0) - sumItems("FOB") },
      { key: "Flete", itemField: "Flete", diff: (getOp("Flete") || 0) - sumItems("Flete") },
      { key: "Flete2", itemField: "Flete2", diff: (getOp("Flete2") || 0) - sumItems("Flete2") },
      { key: "Seguro", itemField: "Seguro", diff: (getOp("Seguro") || 0) - sumItems("Seguro") },
      { key: "OtroGastos", itemField: "OtrosGastos", diff: (getOp("OtroGastos") || 0) - sumItems("OtrosGastos") },
      { key: "PesoBruto", itemField: "PesoBruto", diff: (getOp("PesoBruto") || 0) - sumItems("PesoBruto") },
      { key: "Bultos", itemField: "Bultos", diff: (getOp("Bultos") || 0) - sumItems("Bultos") },
      { key: "ValorCIFBS", itemField: "CIFBS", diff: (getOp("ValorCIFBS") || 0) - sumItems("CIFBS") },
      { key: "ValorCIF", itemField: "CIFUSD", diff: (getOp("ValorCIF") || 0) - sumItems("CIFUSD") },
      { key: "OtrasErogaciones", itemField: "OtrasErogaciones", diff: (getOp("OtrasErogaciones") || 0) - sumItems("OtrasErogaciones") },
      { key: "ImpSIDUNEA", itemField: "SIDUNEA", diff: (getOp("ImpSIDUNEA") || 0) - sumItems("SIDUNEA") },
    ];
  }, [items, operacion]);
  const [dateValues, setDateValues] = useState<Record<string, Date | null>>({});
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(["operaciones", "cabecera", "valores", "items"])
  );
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());
  const fieldRefs = useRef<Map<string, HTMLInputElement | HTMLSelectElement>>(new Map());

  const [showEntidades, setShowEntidades] = useState(false);
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [entidadesLoading, setEntidadesLoading] = useState(false);
  const [entidadForm, setEntidadForm] = useState<Partial<Entidad> | null>(null);
  const [entidadSaving, setEntidadSaving] = useState(false);
  const [entidadSearch, setEntidadSearch] = useState("");

  const filteredEntidades = useMemo(() => {
    const q = entidadSearch.toLowerCase().trim();
    if (!q) return entidades;
    return entidades.filter((e) =>
      (e.Nombre || "").toLowerCase().includes(q) ||
      (e.Pais || "").toLowerCase().includes(q) ||
      (e.TipoEntidadDesc || "").toLowerCase().includes(q) ||
      (e.TipoEntidadId || "").toLowerCase().includes(q)
    );
  }, [entidades, entidadSearch]);

  const loadEntidades = useCallback(async () => {
    setEntidadesLoading(true);
    try {
      const data = await api.fnning.entidades.list();
      setEntidades(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEntidadesLoading(false);
    }
  }, []);

  const openEntidades = () => {
    setShowEntidades(true);
    loadEntidades();
  };

  const openNewEntidad = () => {
    setEntidadForm({ TipoEntidadId: "", Nit: "", Nombre: "", Pais: "", Direccion: "", Ciudad: "", Estado: "", DireccionPostal: "", Telefono: "" });
  };

  const openEditEntidad = (e: Entidad) => {
    setEntidadForm({ ...e });
  };

  const saveEntidad = async () => {
    if (!entidadForm) return;
    setEntidadSaving(true);
    try {
      if (entidadForm.EntidadId) {
        await api.fnning.entidades.update(entidadForm.EntidadId, entidadForm);
      } else {
        await api.fnning.entidades.create(entidadForm);
      }
      setEntidadForm(null);
      loadEntidades();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEntidadSaving(false);
    }
  };

  const deleteEntidad = async (id: number) => {
    if (!confirm("Eliminar esta entidad?")) return;
    try {
      await api.fnning.entidades.delete(id);
      loadEntidades();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const setFieldRef = useCallback((field: string) => (el: HTMLInputElement | HTMLSelectElement | null) => {
    if (el) fieldRefs.current.set(field, el);
  }, []);

  const cabeceraEntidades = useMemo(() => ({
    B: entidades.filter(e => e.TipoEntidadId === "B"),
    I: entidades.filter(e => e.TipoEntidadId === "I"),
    E: entidades.filter(e => e.TipoEntidadId === "E"),
    M: entidades.filter(e => e.TipoEntidadId === "M"),
  }), [entidades]);

  useEffect(() => {
    api.fnning.entidades.list().then(setEntidades).catch(() => {});
    if (isNew) {
      setLoading(false);
      return;
    }
    api.fnning
      .full(Number(id))
      .then((res) => {
        const op = res.operacion || {};
        setOperacion(op);
        setItems((res.items as Record<string, unknown>[]) || []);
        const dates: Record<string, Date | null> = {};
        ["FechaValidacion", "FechaPago", "FechaSalidadeMercancia"].forEach((f) => {
          const raw = op[f];
          if (raw) {
            const d = new Date(raw as string);
            dates[f] = isNaN(d.getTime()) ? null : d;
          } else {
            dates[f] = null;
          }
        });
        setDateValues(dates);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const validateAndSave = async () => {
    setError("");
    setSuccess("");
    const errors = new Set<string>();
    REQUIRED.forEach((field) => {
      if (field === "FechaValidacion" || field === "FechaPago" || field === "FechaSalidadeMercancia") {
        if (!dateValues[field]) errors.add(field);
        return;
      }
      const el = fieldRefs.current.get(field);
      if (!el || !el.value.trim()) {
        errors.add(field);
      }
    });
    setValidationErrors(errors);

    if (errors.size > 0) {
      setError("Complete todos los campos obligatorios marcados en rojo");
      return;
    }

    const body: Record<string, unknown> = {};
    fieldRefs.current.forEach((el, field) => {
      body[field] = el.value || null;
    });
    if (isNew && items.length > 0) {
      body.items = items;
    }

    body.FechaValidacion = dateValues.FechaValidacion
      ? dateValues.FechaValidacion.toISOString().slice(0, 10)
      : null;
    body.FechaPago = dateValues.FechaPago
      ? dateValues.FechaPago.toISOString().slice(0, 10)
      : null;
    body.FechaSalidadeMercancia = dateValues.FechaSalidadeMercancia
      ? dateValues.FechaSalidadeMercancia.toISOString().slice(0, 10)
      : null;

    setSaving(true);
    try {
      if (isNew) {
        const res = await api.fnning.create(body);
        setSuccess("Operacion creada correctamente");
        router.push(`/dashboard/fnning/operaciones-xml/editar/${res.OperacionId}?modo=edit`);
      } else {
        await api.fnning.update(Number(id), body);
        setSuccess("Operacion actualizada correctamente");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportXml = async () => {
    try {
      const blob = await api.fnning.xml(Number(id));
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `export_${id}.xml`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleExportExcel = async () => {
    try {
      const blob = await api.fnning.excel(Number(id));
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `items_operacion_${id}.xlsx`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleImportar = async (e: { target: { files?: FileList | null; value?: string } }) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setSuccess("");
    setImporting(true);
    try {
      const result = await api.fnning.parseExcel(file);
      setOperacion(result.operacion || {});
      setItems((result.items as Record<string, unknown>[]) || []);
      setSuccess(`Archivo procesado: ${result.items.length} items cargados`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
    e.target.value = "";
  };

  const handleAjustar = async () => {
    setError("");
    setSuccess("");
    setRecalculando(true);
    try {
      const op = { ...operacion };
      fieldRefs.current.forEach((el, field) => {
        op[field] = el.value || null;
      });
      op.FechaValidacion = dateValues.FechaValidacion ? dateValues.FechaValidacion.toISOString().slice(0, 10) : null;
      op.FechaPago = dateValues.FechaPago ? dateValues.FechaPago.toISOString().slice(0, 10) : null;
      op.FechaSalidadeMercancia = dateValues.FechaSalidadeMercancia ? dateValues.FechaSalidadeMercancia.toISOString().slice(0, 10) : null;

      const result = await api.fnning.recalcular(op, items as Record<string, unknown>[]);
      setOperacion(result.operacion || {});
      setItems((result.items as Record<string, unknown>[]) || []);
      setSuccess("Items recalculados correctamente");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRecalculando(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSection = (key: string) => {
    const next = new Set(expanded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpanded(next);
  };

  const hasError = (f: string) => validationErrors.has(f);

  const renderTextInput = (label: string, field: string, val: string, required: boolean, className = "") => (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className={`text-[11px] uppercase tracking-wider font-medium ${hasError(field) ? "text-red-400" : "text-faro-text"}`}>
        {label}{required ? " *" : ""}
      </label>
      <input
        type="text"
        ref={setFieldRef(field)}
        defaultValue={val}
        readOnly={!isEdit}
        className={`w-full rounded-lg border px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none ${
          hasError(field) ? "border-red-500 bg-red-500/5 text-red-300" : "border-faro-border bg-faro-bg text-faro-textlight"
        } ${!isEdit ? "opacity-70 cursor-default" : ""}`}
      />
    </div>
  );

  const getVal = (field: string) => {
    const raw = operacion[field];
    return raw != null ? String(raw) : "";
  };

  const renderOperacionesSection = () => (
    <div className="rounded-xl bg-faro-surface border border-faro-border">
      <button onClick={() => toggleSection("operaciones")} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-faro-textlight hover:bg-white/[0.02]">
        {expanded.has("operaciones") ? <ChevronDown className="w-4 h-4 text-faro-text" /> : <ChevronRight className="w-4 h-4 text-faro-text" />}
        Operaciones
      </button>
      {expanded.has("operaciones") && (
          <div className="px-4 pb-4 border-t border-faro-border space-y-3 mt-4">
          {OPERACIONES_ROWS.map((row, ri) => (
            <div key={ri} className="grid grid-cols-4 gap-3">
              {row.map((def) => (
                <div key={def.field} className={(def as any).colSpan ? "col-span-2" : ""}>
                  {renderTextInput(def.label, def.field, getVal(def.field), REQUIRED.has(def.field))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCabeceraSection = () => (
    <div className="rounded-xl bg-faro-surface border border-faro-border">
      <button onClick={() => toggleSection("cabecera")} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-faro-textlight hover:bg-white/[0.02]">
        {expanded.has("cabecera") ? <ChevronDown className="w-4 h-4 text-faro-text" /> : <ChevronRight className="w-4 h-4 text-faro-text" />}
        Cabecera
      </button>
      {expanded.has("cabecera") && (
          <div className="px-4 pb-4 border-t border-faro-border space-y-3 mt-4">
           {[
            { label: "Validacion", field: "FechaValidacion", right: { label: "Broker", field: "BrokerId", tipo: "B" } },
            { label: "Pago", field: "FechaPago", right: { label: "Importer", field: "ImporterId", tipo: "I" } },
            { label: "Salida Mercancia", field: "FechaSalidadeMercancia", right: { label: "Exporter", field: "ExporterId", tipo: "E" } },
            { label: "Canal", field: "Canal", right: { label: "Manufacturer", field: "ManufacturerId", tipo: "M" } },
           ].map((row, ri) => {
            const isDate = row.field !== "Canal";
            return (
             <div key={ri} className="grid grid-cols-4 gap-3">
               <div className="flex flex-col gap-1">
                 <label className={`text-[11px] uppercase tracking-wider font-medium ${hasError(row.field) ? "text-red-400" : "text-faro-text"}`}>
                   {row.label}{REQUIRED.has(row.field) ? " *" : ""}
                 </label>
                 {isDate ? (
                   <div className="relative">
                     <DatePicker
                       selected={dateValues[row.field] || null}
                       onChange={(date: Date | null) => {
                         setDateValues((prev) => ({ ...prev, [row.field]: date }));
                       }}
                       dateFormat="dd/MM/yyyy"
                       placeholderText="Seleccionar..."
                       disabled={!isEdit}
                       className={`w-full rounded-lg border bg-faro-bg px-3 py-1.5 text-sm text-faro-textlight focus:border-blue-500 focus:outline-none ${
                         hasError(row.field) ? "border-red-500 bg-red-500/5 text-red-300" : "border-faro-border"
                       } ${!isEdit ? "opacity-70 cursor-default" : ""}`}
                       wrapperClassName="w-full"
                     />
                     <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faro-text pointer-events-none" />
                   </div>
                 ) : (
                   <input
                     type="text"
                     ref={setFieldRef(row.field)}
                     defaultValue={getVal(row.field)}
                     readOnly={!isEdit}
                     className={`w-full rounded-lg border px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none ${
                       hasError(row.field) ? "border-red-500 bg-red-500/5 text-red-300" : "border-faro-border bg-faro-bg text-faro-textlight"
                     } ${!isEdit ? "opacity-70 cursor-default" : ""}`}
                  />
                 )}
               </div>
               <div className="flex flex-col gap-1 col-span-2">
                <label className={`text-[11px] uppercase tracking-wider font-medium ${hasError(row.right.field) ? "text-red-400" : "text-faro-text"}`}>
                  {row.right.label}{REQUIRED.has(row.right.field) ? " *" : ""}
                </label>
                <select
                   ref={setFieldRef(row.right.field) as any}
                   defaultValue={String(operacion[row.right.field] || "")}
                  disabled={!isEdit}
                  className={`w-full rounded-lg border px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none ${
                    hasError(row.right.field) ? "border-red-500 bg-red-500/5 text-red-300" : "border-faro-border bg-faro-bg text-faro-textlight"
                  } ${!isEdit ? "opacity-70 cursor-default" : ""}`}
                >
                  <option value="">Seleccionar...</option>
                  {cabeceraEntidades[row.right.tipo as keyof typeof cabeceraEntidades].map((e) => (
                     <option key={e.EntidadId} value={String(e.EntidadId)}>{e.Nombre} - {e.Direccion}</option>
                  ))}
                </select>
              </div>
            </div>
            );
            })}
          </div>
        )}
      </div>
    );



  const isDecimalField = (f: string) =>
    ["FOB","TC","Flete","PesoBruto","PesoNeto","Flete2","Seguro","Bultos","OtroGastos","ImpSIDUNEA","OtrasErogaciones","ValorCIF","ValorCIFBS","GA","IVA"].includes(f);

  const renderValoresSection = () => (
    <div className="rounded-xl bg-faro-surface border border-faro-border">
      <button onClick={() => toggleSection("valores")} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-faro-textlight hover:bg-white/[0.02]">
        {expanded.has("valores") ? <ChevronDown className="w-4 h-4 text-faro-text" /> : <ChevronRight className="w-4 h-4 text-faro-text" />}
        Valores
      </button>
      {expanded.has("valores") && (
         <div className="px-4 pb-4 border-t border-faro-border space-y-3 mt-4 max-w-xl">
          {[
            [{ label: "FOB", field: "FOB" }, { label: "T. C.", field: "TC" }, { label: "Moneda", field: "MonedaId" }],
            [{ label: "Flete 1", field: "Flete" }, { label: "P. B.", field: "PesoBruto" }],
            [{ label: "Flete 2", field: "Flete2" }, { label: "P. N.", field: "PesoNeto" }],
            [{ label: "Seguro", field: "Seguro" }, { label: "Bultos", field: "Bultos" }],
            [{ label: "Otros Gastos", field: "OtroGastos" }, { label: "Uso SIDUNEA ++", field: "ImpSIDUNEA" }],
            [{ label: "Otras Erogaciones", field: "OtrasErogaciones" }, { label: "Cant. Items", field: "_cantidad" }],
            [{ label: "Valor CIF", field: "ValorCIF" }, { label: "Valor CIF Bs", field: "ValorCIFBS" }],
            [{ label: "GA", field: "GA" }, { label: "IVA", field: "IVA" }],
          ].map((row, ri) => (
            <div key={ri} className={`grid gap-3 ${row.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
              {row.map((def) => {
                if (def.field === "_cantidad") {
                  return (
                    <div key={def.field} className="flex flex-col gap-1">
                      <label className="text-[11px] uppercase tracking-wider font-medium text-faro-text">Cant. Items *</label>
                      <input type="text" value={String(items.length)} readOnly
                        className="w-full rounded-lg border border-faro-border bg-faro-bg px-3 py-2 text-sm text-faro-textlight opacity-70 cursor-default" />
                    </div>
                  );
                }
                const isMoneda = def.field === "MonedaId";
                return (
                  <div key={def.field} className="flex flex-col gap-1">
                    <label className={`text-[11px] uppercase tracking-wider font-medium ${hasError(def.field) ? "text-red-400" : "text-faro-text"}`}>
                      {def.label}{REQUIRED.has(def.field) ? " *" : ""}
                    </label>
                    {isMoneda ? (
                    <input
                      type="text"
                      ref={setFieldRef(def.field)}
                      defaultValue={getVal(def.field)}
                      readOnly={!isEdit}
                      className={`w-full rounded-lg border px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none ${
                        hasError(def.field) ? "border-red-500 bg-red-500/5 text-red-300" : "border-faro-border bg-faro-bg text-faro-textlight"
                      } ${!isEdit ? "opacity-70 cursor-default" : ""}`}
                    />
                  ) : (
                    <input
                      type="number"
                      step="any"
                      ref={setFieldRef(def.field)}
                      defaultValue={isDecimalField(def.field) ? formatDecimalValue(operacion[def.field]) : getVal(def.field)}
                      readOnly={!isEdit}
                      className={`w-full rounded-lg border px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none ${
                        hasError(def.field) ? "border-red-500 bg-red-500/5 text-red-300" : "border-faro-border bg-faro-bg text-faro-textlight"
                      } ${!isEdit ? "opacity-70 cursor-default" : ""}`}
                    />
                  )}
                </div>
              );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-faro-text">
        Cargando...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-faro-textlight flex items-center gap-3">
            {isNew ? "Nueva" : isEdit ? "Editar" : "Ver"} Operacion{isNew ? "" : ` #${id}`}
          </h1>
          <p className="text-sm text-faro-text mt-1">
            {operacion["NroRegistro"] ? `Nro. Registro: ${operacion["NroRegistro"]}` : ""}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-1.5 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-1.5 text-sm text-green-400">
          {success}
        </div>
      )}

      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => router.push("/dashboard/fnning/operaciones-xml")}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium bg-faro-surface border border-faro-border text-faro-text hover:bg-white/[0.04] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        {isEdit && (
          <button
            onClick={validateAndSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50">
            <Save className="w-4 h-4" />
            {saving ? "Guardando..." : "Guardar"}
          </button>
        )}
        <button onClick={handleExportXml} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-faro-text hover:bg-white/[0.04] transition-colors ml-auto">
          <FileCode className="w-4 h-4" />
          Exportar XML
        </button>
        <button
          onClick={openEntidades}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-faro-text hover:bg-white/[0.04] transition-colors">
          <Building2 className="w-4 h-4" />
          Entidades
        </button>
      </div>

      <div className="space-y-4">
        {renderOperacionesSection()}
        {renderCabeceraSection()}
        {renderValoresSection()}
      </div>

      <div className="mt-4 rounded-xl bg-faro-surface border border-faro-border overflow-hidden">
        <button
          onClick={() => toggleSection("items")}
          className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-faro-textlight hover:bg-white/[0.02] transition-colors"
        >
          {expanded.has("items") ? (
            <ChevronDown className="w-4 h-4 text-faro-text" />
          ) : (
            <ChevronRight className="w-4 h-4 text-faro-text" />
          )}
          Items
        </button>
        {expanded.has("items") && (
           <div className="px-4 pb-4 border-t border-faro-border">
            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-faro-border/50 p-8 text-center mt-4">
                <Grid3X3 className="mx-auto w-6 h-6 text-faro-text/40 mb-2" />
                <p className="text-sm text-faro-text/60">Esta operacion no tiene items</p>
              </div>
            ) : (
              (() => {
                const ITEMS_PER_PAGE = 15;
                const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
                const pageItems = items.slice((itemsPage - 1) * ITEMS_PER_PAGE, itemsPage * ITEMS_PER_PAGE);

                const sum = (f: string) => items.reduce((acc, it) => acc + (Number(it[f]) || 0), 0);
                const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                return (
                  <>
                    <div className="overflow-x-auto mt-4">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="border-b border-blue-700 bg-blue-600 sticky top-0">
                            <th className="px-1.5 py-1.5 text-left font-semibold text-white uppercase w-auto whitespace-nowrap">Nro Item</th>
                            <th className="px-1.5 py-1.5 text-left font-semibold text-white uppercase w-auto">Cod Arrancel</th>
                            <th className="px-1.5 py-1.5 text-right font-semibold text-white uppercase w-auto">Cantidad</th>
                            <th className="px-1.5 py-1.5 text-left font-semibold text-white uppercase w-auto">Unidad Medida</th>
                            <th className="px-1.5 py-1.5 text-left font-semibold text-white uppercase w-auto">Producto Code</th>
                            <th className="px-1.5 py-1.5 text-left font-semibold text-white uppercase w-auto">PartNumber</th>
                            <th className="px-1 py-1.5 text-left font-semibold text-white uppercase max-w-[80px]">Producto Descripcion</th>
                            <th className="px-1.5 py-1.5 text-right font-semibold text-white uppercase w-auto">FOB</th>
                            <th className="px-1.5 py-1.5 text-right font-semibold text-white uppercase w-auto">Flete</th>
                            <th className="px-1.5 py-1.5 text-right font-semibold text-white uppercase w-auto">Flete2</th>
                            <th className="px-1.5 py-1.5 text-right font-semibold text-white uppercase w-auto">Seguro</th>
                            <th className="px-1.5 py-1.5 text-right font-semibold text-white uppercase w-auto">Otros Gastos</th>
                            <th className="px-1.5 py-1.5 text-right font-semibold text-white uppercase w-auto">Peso Bruto</th>
                            <th className="px-1.5 py-1.5 text-right font-semibold text-white uppercase w-auto">Peso Neto</th>
                            <th className="px-1.5 py-1.5 text-right font-semibold text-white uppercase w-auto">Bultos</th>
                            <th className="px-1.5 py-1.5 text-right font-semibold text-white uppercase w-auto">Cantidad SegPart</th>
                            <th className="px-1.5 py-1.5 text-right font-semibold text-white uppercase w-auto">CIFBS</th>
                            <th className="px-1.5 py-1.5 text-right font-semibold text-white uppercase w-auto">CIFUSD</th>
                            <th className="px-1.5 py-1.5 text-right font-semibold text-white uppercase w-auto">Acuerdo</th>
                            <th className="px-1.5 py-1.5 text-right font-semibold text-white uppercase w-auto">GA</th>
                            <th className="px-1.5 py-1.5 text-right font-semibold text-white uppercase w-auto">Otras Erogaciones</th>
                            <th className="px-1.5 py-1.5 text-right font-semibold text-white uppercase w-auto">Base Imponible</th>
                            <th className="px-1.5 py-1.5 text-right font-semibold text-white uppercase w-auto">IVA</th>
                            <th className="px-1.5 py-1.5 text-right font-semibold text-white uppercase w-auto">ICE</th>
                            <th className="px-1.5 py-1.5 text-right font-semibold text-white uppercase w-auto">ICE Alic.</th>
                            <th className="px-1.5 py-1.5 text-right font-semibold text-white uppercase w-auto">CantLT</th>
                            <th className="px-1.5 py-1.5 text-right font-semibold text-white uppercase w-auto">IEHD</th>
                            <th className="px-1.5 py-1.5 text-right font-semibold text-white uppercase w-auto">Uso SIDUNEA++</th>
                            <th className="px-1.5 py-1.5 text-right font-semibold text-white uppercase w-auto">Total Tributos</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-faro-border/50">
                          {pageItems.map((it, i) => (
                            <tr key={i} className="hover:bg-white/[0.02]">
                              <td className="px-1.5 py-1 text-faro-textlight font-mono">{String(it["NroItem"] || i + 1)}</td>
                              <td className="px-2 py-1.5 text-faro-textlight font-mono whitespace-nowrap">{String(it["CodArrancel"] || "-")}</td>
                              <td className="px-2 py-1.5 text-faro-text text-right">{fmt(Number(it["Cantidad"] || 0))}</td>
                              <td className="px-2 py-1.5 text-faro-text">{String(it["UnidadMedida"] || "-")}</td>
                              <td className="px-2 py-1.5 text-faro-text font-mono">{String(it["ProductoCode"] || "-")}</td>
                              <td className="px-2 py-1.5 text-faro-text font-mono">{String(it["PartNumber"] || "-")}</td>
                              <td className="px-1 py-1 text-faro-text max-w-[80px] truncate">{String(it["ProductoDescripcion"] || "-")}</td>
                              <td className="px-1.5 py-1 text-faro-textlight text-right font-mono">{fmt(Number(it["FOB"] || 0))}</td>
                              <td className="px-1.5 py-1 text-faro-textlight text-right font-mono">{fmt(Number(it["Flete"] || 0))}</td>
                              <td className="px-1.5 py-1 text-faro-text text-right font-mono">{fmt(Number(it["Flete2"] || 0))}</td>
                              <td className="px-1.5 py-1 text-faro-text text-right font-mono">{fmt(Number(it["Seguro"] || 0))}</td>
                              <td className="px-1.5 py-1 text-faro-text text-right font-mono">{fmt(Number(it["OtroGastos"] || 0))}</td>
                              <td className="px-1.5 py-1 text-faro-text text-right font-mono">{fmt(Number(it["PesoBruto"] || 0))}</td>
                              <td className="px-1.5 py-1 text-faro-text text-right font-mono">{fmt(Number(it["PesoNeto"] || 0))}</td>
                              <td className="px-1.5 py-1 text-faro-text text-right font-mono">{fmt(Number(it["Bultos"] || 0))}</td>
                              <td className="px-1.5 py-1 text-faro-text text-right font-mono">{fmt(Number(it["CantidadSegPart"] || 0))}</td>
                              <td className="px-1.5 py-1 text-faro-textlight text-right font-mono">{fmt(Number(it["CIFBS"] || 0))}</td>
                              <td className="px-1.5 py-1 text-faro-textlight text-right font-mono">{fmt(Number(it["CIFUSD"] || 0))}</td>
                              <td className="px-1.5 py-1 text-faro-text text-right font-mono">{fmt(Number(it["Acuerdo"] || 0))}</td>
                              <td className="px-1.5 py-1 text-faro-textlight text-right font-mono">{fmt(Number(it["GA"] || 0))}</td>
                              <td className="px-1.5 py-1 text-faro-text text-right font-mono">{fmt(Number(it["OtrasErogaciones"] || 0))}</td>
                              <td className="px-1.5 py-1 text-faro-text text-right font-mono">{fmt(Number(it["BaseImponible"] || 0))}</td>
                              <td className="px-1.5 py-1 text-faro-textlight text-right font-mono">{fmt(Number(it["IVA"] || 0))}</td>
                              <td className="px-1.5 py-1 text-faro-text text-right font-mono">{fmt(Number(it["ICE"] || 0))}</td>
                              <td className="px-1.5 py-1 text-faro-text text-right font-mono">{fmt(Number(it["ICE_ALI"] || 0))}</td>
                              <td className="px-1.5 py-1 text-faro-text text-right font-mono">{fmt(Number(it["CantLT"] || 0))}</td>
                              <td className="px-1.5 py-1 text-faro-text text-right font-mono">{fmt(Number(it["IEHD"] || 0))}</td>
                              <td className="px-1.5 py-1 text-faro-text text-right font-mono">{fmt(Number(it["SIDUNEA"] || 0))}</td>
                              <td className="px-1.5 py-1 text-faro-textlight text-right font-mono">{fmt(Number(it["TotalTributos"] || 0))}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-faro-border bg-white/[0.03] font-medium">
                            <td colSpan={2} className="px-1.5 py-1.5 text-white uppercase text-[10px]">TOTAL ({items.length})</td>
                            <td className="px-1.5 py-1.5 text-faro-text text-right">{fmt(sum("Cantidad"))}</td>
                            <td className="px-2 py-1.5"></td>
                            <td className="px-2 py-1.5"></td>
                            <td className="px-2 py-1.5"></td>
                            <td className="px-2 py-1.5"></td>
                            <td className="px-1.5 py-1.5 text-faro-textlight text-right font-mono">{fmt(sum("FOB"))}</td>
                            <td className="px-1.5 py-1.5 text-faro-textlight text-right font-mono">{fmt(sum("Flete"))}</td>
                            <td className="px-1.5 py-1.5 text-faro-textlight text-right font-mono">{fmt(sum("Flete2"))}</td>
                            <td className="px-1.5 py-1.5 text-faro-textlight text-right font-mono">{fmt(sum("Seguro"))}</td>
                            <td className="px-1.5 py-1.5 text-faro-textlight text-right font-mono">{fmt(sum("OtroGastos"))}</td>
                            <td className="px-1.5 py-1.5 text-faro-textlight text-right font-mono">{fmt(sum("PesoBruto"))}</td>
                            <td className="px-1.5 py-1.5 text-faro-textlight text-right font-mono">{fmt(sum("PesoNeto"))}</td>
                            <td className="px-1.5 py-1.5 text-faro-textlight text-right font-mono">{fmt(sum("Bultos"))}</td>
                            <td className="px-1.5 py-1.5 text-faro-textlight text-right font-mono">{fmt(sum("CantidadSegPart"))}</td>
                            <td className="px-1.5 py-1.5 text-faro-textlight text-right font-mono">{fmt(sum("CIFBS"))}</td>
                            <td className="px-1.5 py-1.5 text-faro-textlight text-right font-mono">{fmt(sum("CIFUSD"))}</td>
                            <td className="px-1.5 py-1.5 text-faro-textlight text-right font-mono">{fmt(sum("Acuerdo"))}</td>
                            <td className="px-1.5 py-1.5 text-faro-textlight text-right font-mono">{fmt(sum("GA"))}</td>
                            <td className="px-1.5 py-1.5 text-faro-textlight text-right font-mono">{fmt(sum("OtrasErogaciones"))}</td>
                            <td className="px-1.5 py-1.5 text-faro-textlight text-right font-mono">{fmt(sum("BaseImponible"))}</td>
                            <td className="px-1.5 py-1.5 text-faro-textlight text-right font-mono">{fmt(sum("IVA"))}</td>
                            <td className="px-1.5 py-1.5 text-faro-textlight text-right font-mono">{fmt(sum("ICE"))}</td>
                            <td className="px-1.5 py-1.5 text-faro-textlight text-right font-mono">{fmt(sum("ICE_ALI"))}</td>
                            <td className="px-1.5 py-1.5 text-faro-textlight text-right font-mono">{fmt(sum("CantLT"))}</td>
                            <td className="px-1.5 py-1.5 text-faro-textlight text-right font-mono">{fmt(sum("IEHD"))}</td>
                            <td className="px-1.5 py-1.5 text-faro-textlight text-right font-mono">{fmt(sum("SIDUNEA"))}</td>
                            <td className="px-1.5 py-1.5 text-faro-textlight text-right font-mono">{fmt(sum("TotalTributos"))}</td>
                          </tr>
                          {(() => {
                            const d = (idx: number) => {
                              const v = diferencias[idx];
                              if (!v) return <td key={`d${idx}`} className="px-1.5 py-1.5"></td>;
                              const s = Math.abs(v.diff) > 0.01;
                              return <td key={v.key} className={`px-1.5 py-1.5 text-right font-mono ${s ? "text-red-400 font-semibold" : "text-faro-text/30"}`}>{s ? fmt(v.diff) : "0.00"}</td>;
                            };
                            const e = (k: string) => <td key={k} className="px-1.5 py-1.5"></td>;
                            return (
                              <tr className="border-t border-faro-border/50">
                                <td colSpan={2} className="px-1.5 py-1.5 text-red-400/80 uppercase text-[10px] font-medium">DIFERENCIA</td>
                                {e("c3")}{e("c4")}{e("c5")}{e("c6")}{e("c7")}
                                {d(0)}{d(1)}{d(2)}{d(3)}{d(4)}
                                {d(5)}
                                {e("c14")}
                                {d(6)}
                                {e("c16")}
                                {d(7)}{d(8)}
                                {e("c19")}{e("c20")}
                                {d(9)}
                                {e("c22")}{e("c23")}{e("c24")}{e("c25")}{e("c26")}{e("c27")}
                                {d(10)}
                                {e("c29")}
                              </tr>
                            );
                          })()}
                        </tfoot>
                      </table>
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between text-xs text-faro-text mt-3">
                        <span>Items {(itemsPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(itemsPage * ITEMS_PER_PAGE, items.length)} de {items.length}</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setItemsPage(Math.max(1, itemsPage - 1))} disabled={itemsPage <= 1}
                            className="px-2 py-1 rounded bg-faro-surface border border-faro-border disabled:opacity-50">Anterior</button>
                          <span>Pag {itemsPage} de {totalPages}</span>
                          <button onClick={() => setItemsPage(Math.min(totalPages, itemsPage + 1))} disabled={itemsPage >= totalPages}
                            className="px-2 py-1 rounded bg-faro-surface border border-faro-border disabled:opacity-50">Siguiente</button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()
            )}
           </div>
        )}
      </div>

      {isEdit && (
        <div className="flex items-center gap-2 mt-6">
          <button onClick={() => fileInputRef.current?.click()} disabled={importing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-faro-text hover:bg-white/[0.04] transition-colors disabled:opacity-50">
            {importing ? (<span className="animate-spin">⏳</span>) : (<Upload className="w-4 h-4" />)}
            {importing ? "Importando..." : "Importar"}
          </button>
          <input type="file" ref={fileInputRef} accept=".xls,.xlsx,.xlsm" onChange={handleImportar} className="hidden" />
          <button onClick={handleAjustar} disabled={recalculando || items.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-faro-text hover:bg-white/[0.04] transition-colors disabled:opacity-50">
            {recalculando ? (<span className="animate-spin">⏳</span>) : (<Calculator className="w-4 h-4" />)}
            {recalculando ? "Recalculando..." : "Ajustar"}
          </button>
        <button onClick={handleExportExcel} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-faro-text hover:bg-white/[0.04] transition-colors ml-auto">
            <Download className="w-4 h-4" />
            Exportar Grid
          </button>
        </div>
      )}

      {showEntidades && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setShowEntidades(false); setEntidadForm(null); setEntidadSearch(""); }}>
          <div className="w-full max-w-5xl max-h-[85vh] rounded-xl bg-faro-surface border border-faro-border shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-faro-border shrink-0">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-faro-textlight">Entidades</h2>
                <input
                  type="text"
                  value={entidadSearch}
                  onChange={(e) => setEntidadSearch(e.target.value)}
                  placeholder="Buscar por nombre, pais o tipo..."
                  className="w-64 rounded-lg border border-faro-border bg-faro-bg px-3 py-1.5 text-xs text-faro-textlight placeholder:text-faro-text/40 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={openNewEntidad} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Nuevo
                </button>
                <button onClick={() => { setShowEntidades(false); setEntidadForm(null); setEntidadSearch(""); }} className="p-1.5 rounded-md hover:bg-white/[0.04] text-faro-text hover:text-faro-textlight transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {entidadForm !== null && (
              <div className="px-6 py-4 border-b border-faro-border/50 bg-white/[0.01] shrink-0">
                <div className="grid grid-cols-4 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-faro-text uppercase">Tipo</label>
                    <select value={entidadForm.TipoEntidadId || ""} onChange={(e) => setEntidadForm({ ...entidadForm, TipoEntidadId: e.target.value })} className="rounded-lg border border-faro-border bg-faro-bg px-3 py-1.5 text-sm text-faro-textlight focus:border-blue-500 focus:outline-none">
                      <option value="">Seleccionar...</option>
                      <option value="B">Broker</option>
                      <option value="I">Importer</option>
                      <option value="E">Exporter</option>
                      <option value="M">Manufacturer</option>
                    </select>
                  </div>
                  {["Nit", "Nombre", "Pais", "Direccion", "Ciudad", "Estado", "DireccionPostal", "Telefono"].map((f) => (
                    <div key={f} className="flex flex-col gap-1">
                      <label className="text-[10px] text-faro-text uppercase">{f}</label>
                      <input
                        type="text"
                        value={(entidadForm as any)[f] || ""}
                        onChange={(e) => setEntidadForm({ ...entidadForm, [f]: e.target.value })}
                        className="rounded-lg border border-faro-border bg-faro-bg px-3 py-1.5 text-sm text-faro-textlight focus:border-blue-500 focus:outline-none"
                      />
                    </div>
           ))}
          </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button onClick={() => setEntidadForm(null)} className="px-3 py-1.5 rounded-lg text-xs text-faro-text hover:bg-white/[0.04]">Cancelar</button>
                  <button onClick={saveEntidad} disabled={entidadSaving} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50">
                    {entidadSaving ? "Guardando..." : entidadForm.EntidadId ? "Actualizar" : "Crear"}
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-auto p-6">
              {entidadesLoading ? (
                <div className="text-sm text-faro-text py-8 text-center">Cargando...</div>
              ) : filteredEntidades.length === 0 ? (
                <div className="text-sm text-faro-text py-8 text-center">{entidadSearch ? "Sin resultados" : "No hay entidades"}</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-faro-border bg-white/[0.02]">
                      <th className="px-2 py-1.5 text-left font-semibold text-faro-text uppercase w-16">Acciones</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-faro-text uppercase">Id</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-faro-text uppercase">Tipo</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-faro-text uppercase">NIT</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-faro-text uppercase">Nombre</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-faro-text uppercase">Pais</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-faro-text uppercase">Direccion</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-faro-text uppercase">Ciudad</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-faro-text uppercase">Telefono</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-faro-border/50">
                    {filteredEntidades.map((e) => (
                      <tr key={e.EntidadId} className="hover:bg-white/[0.02] group">
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditEntidad(e)} className="p-1 rounded hover:bg-white/[0.04] text-faro-text hover:text-blue-400"><Pencil className="w-3 h-3" /></button>
                            <button onClick={() => deleteEntidad(e.EntidadId)} className="p-1 rounded hover:bg-white/[0.04] text-faro-text hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-faro-textlight font-mono">{e.EntidadId}</td>
                        <td className="px-2 py-1.5 text-faro-text">{e.TipoEntidadDesc || e.TipoEntidadId}</td>
                        <td className="px-2 py-1.5 text-faro-text">{e.Nit}</td>
                        <td className="px-2 py-1.5 text-faro-textlight">{e.Nombre}</td>
                        <td className="px-2 py-1.5 text-faro-text">{e.Pais}</td>
                        <td className="px-2 py-1.5 text-faro-text max-w-[150px] truncate">{e.Direccion}</td>
                        <td className="px-2 py-1.5 text-faro-text">{e.Ciudad}</td>
                        <td className="px-2 py-1.5 text-faro-text">{e.Telefono}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
