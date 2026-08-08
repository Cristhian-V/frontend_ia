"use client";

import { useState, useRef } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Upload, Download, Tag } from "lucide-react";

export default function ClasificadorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    codigo: string;
    descripcion: string;
    arancel: string;
    iva: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError("");
      setResult(null);
    }
  };

  const handleProcess = async () => {
    if (!file) return;

    setProcessing(true);
    setError("");
    setResult(null);

    try {
      const { blob, filename } = await api.transbel.clasificar(file);

      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = filename;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setResult({
        codigo: "Procesado correctamente",
        descripcion: filename,
        arancel: "Ver archivo descargado",
        iva: "Ver archivo descargado",
      });
    } catch (err: any) {
      setError(err.message || "Error al procesar el archivo");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Clasificador Arancelario"
        subtitle="Complete la columna Bolivia a partir de la partida de Colombia"
      />

      {error && <ErrorBanner message={error} />}

      <div className="max-w-xl rounded-xl bg-faro-surface border border-faro-border p-6">
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-faro-text">
            Selecciona el archivo Excel (.xls o .xlsx)
          </label>
          <input
            ref={inputRef}
            type="file"
            accept=".xls,.xlsx"
            onChange={handleFileChange}
            disabled={processing}
            className="w-full text-sm text-faro-text file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-500"
          />
        </div>

        {file && !processing && !result && (
          <div className="mb-4 rounded-lg bg-white/[0.04] p-3">
            <p className="text-sm text-faro-textlight">{file.name}</p>
            <p className="text-xs text-faro-text/60">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        )}

        {processing && (
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-2 text-sm text-faro-text">
              <span className="animate-spin">⏳</span>
              <span>Procesando archivo...</span>
            </div>
            <p className="text-xs text-faro-text/60">
              Buscando la mejor coincidencia en el Arancel Nacional 2026
            </p>
          </div>
        )}

        {result && !processing && (
          <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Download className="w-4 h-4 text-green-400" />
              <p className="text-sm font-medium text-green-400">
                Archivo procesado correctamente
              </p>
            </div>
            <p className="text-xs text-faro-text">{result.codigo}</p>
            <p className="text-xs text-faro-text/60 mt-1">{result.descripcion}</p>
          </div>
        )}

        <button
          onClick={handleProcess}
          disabled={!file || processing}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 transition-colors"
        >
          {processing ? "Procesando..." : "Clasificar y descargar"}
        </button>
      </div>

      <div className="mt-6 max-w-xl rounded-xl bg-faro-surface border border-faro-border p-4">
        <h3 className="mb-2 text-sm font-medium text-faro-textlight flex items-center gap-2">
          <Tag className="w-4 h-4 text-cyan-400" />
          Como funciona
        </h3>
        <ol className="list-decimal list-inside space-y-1 text-xs text-faro-text">
          <li>Sube el archivo Excel con la partida de Colombia (columna E)</li>
          <li>El sistema extrae el codigo y busca en el Arancel Nacional 2026</li>
          <li>Filtra por los primeros 6 digitos del codigo</li>
          <li>Encuentra la mejor coincidencia por similitud de descripcion</li>
          <li>Llena automaticamente la columna Bolivia (columna B)</li>
          <li>Descarga el archivo procesado en formato .xls</li>
        </ol>
      </div>
    </div>
  );
}
