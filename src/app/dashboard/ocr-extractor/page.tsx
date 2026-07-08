"use client";

import { useState, useRef } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { ErrorBanner } from "@/components/ErrorBanner";

export default function OcrExtractorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError("");
      setDone(false);
    }
  };

  const handleExtract = async () => {
    if (!file) return;

    setProcessing(true);
    setError("");
    setDone(false);
    setUploadProgress(0);

    try {
      const { blob, filename } = await api.ocr.extract(file, (loaded, total) => {
        setUploadProgress(Math.round((loaded / total) * 100));
      });

      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = filename;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setDone(true);
    } catch (err: any) {
      setError(err.message || "Error al procesar el PDF");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <PageHeader title="OCR Extractor" subtitle="Convierte PDF a Word con IA (gemma4:26b-32k)" />

      {error && <ErrorBanner message={error} />}

      <div className="max-w-xl rounded-xl border border-faro-border bg-faro-surface p-6">
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-faro-text">
            Selecciona un archivo PDF
          </label>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={processing}
            className="w-full text-sm text-faro-text file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
          />
        </div>

        {file && (
          <div className="mb-4 rounded-lg bg-white/[0.04] p-3">
            <p className="text-sm text-faro-textlight">{file.name}</p>
            <p className="text-xs text-faro-text">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}

        {processing && (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-faro-text">
                {uploadProgress < 100 ? "Subiendo PDF..." : "Procesando con IA..."}
              </span>
              <span className="text-faro-text">
                {uploadProgress < 100 ? `${uploadProgress}%` : "Extrayendo texto..."}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  uploadProgress < 100
                    ? "bg-blue-500"
                    : "bg-amber-500 animate-pulse"
                }`}
                style={{ width: uploadProgress < 100 ? `${uploadProgress}%` : "100%" }}
              />
            </div>
            <p className="mt-2 text-xs text-faro-text">
              {uploadProgress < 100
                ? "Subiendo archivo al servidor"
                : "La IA esta procesando el PDF. Esto puede tardar varios minutos..."}
            </p>
          </div>
        )}

        {done && !processing && (
          <div className="mb-4 rounded-lg bg-green-50 dark:bg-green-950 px-4 py-3 text-sm text-green-700 dark:text-green-300">
            ✅ Documento Word generado y descargado correctamente
          </div>
        )}

        <button
          onClick={handleExtract}
          disabled={!file || processing}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? "Procesando..." : "Extraer a Word"}
        </button>
      </div>

      <div className="mt-6 max-w-xl rounded-xl border border-faro-border bg-faro-surface p-4">
        <h3 className="mb-2 text-sm font-medium text-faro-textlight">Como funciona</h3>
        <ol className="list-decimal list-inside space-y-1 text-xs text-faro-text">
          <li>Sube un archivo PDF</li>
          <li>El sistema divide el PDF en bloques de 5 paginas</li>
          <li>Cada bloque se envia a la IA (ocr-rapido:latest) para extraer el texto</li>
          <li>Se omiten sellos, firmas, pies de pagina y encabezados</li>
          <li>El texto extraido se compila en un documento Word (.docx)</li>
          <li>El archivo .docx se descarga automaticamente</li>
        </ol>
      </div>
    </div>
  );
}
