"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import type { ControlImportSummary } from "@/lib/types";
import { Upload, FileSpreadsheet, CheckCircle2 } from "lucide-react";

export default function RepSumaPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<ControlImportSummary | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setUploading(true);
    setError("");
    setSummary(null);
    try {
      const result = await api.control.suma.importar(file);
      setSummary(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al importar el reporte");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <PageHeader
        title="Rep. SUMA"
        subtitle="Carga el reporte de operaciones pagadas descargado de SUMA para registrarlas"
      />

      {error && <ErrorBanner message={error} />}

      <div className="rounded-xl border border-faro-border bg-faro-surface p-6">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-5 h-5 text-faro-textlight" />
          <div>
            <p className="text-sm font-medium text-faro-textlight">Reporte SUMA (.xls)</p>
            <p className="text-xs text-faro-text/60">
              Se registran las 26 columnas del reporte; el registro es idempotente por DIM.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <input
            ref={inputRef}
            type="file"
            accept=".xls,.xlsx"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="hidden"
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            <Upload className={`w-4 h-4 ${uploading ? "animate-pulse" : ""}`} />
            {uploading ? "Procesando..." : "Seleccionar y subir"}
          </button>
          {fileName && !uploading && !summary && (
            <span className="ml-3 text-xs text-faro-text/60">{fileName}</span>
          )}
        </div>
      </div>

      {summary && (
        <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-400">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Carga completada
          </div>
          <ul className="mt-2 space-y-1 text-green-300">
            <li>Operaciones en el reporte: {summary.total}</li>
            <li>Nuevas: {summary.creados} · Actualizadas: {summary.actualizados}</li>
            <li>Clientes en el maestro: {summary.clientes}</li>
            {summary.fecha_reporte_pago && <li>Fecha de pago del lote: {summary.fecha_reporte_pago}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
