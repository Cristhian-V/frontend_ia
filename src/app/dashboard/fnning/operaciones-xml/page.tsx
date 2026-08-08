"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { OperacionXml } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import {
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileSearch,
} from "lucide-react";

const PAGE_SIZE = 15;

const formatDate = (val: string | null) => {
  if (!val) return "-";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const formatDecimal = (val: number | null) => {
  if (val == null) return "-";
  return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function OperacionesXmlPage() {
  const router = useRouter();
  const [data, setData] = useState<OperacionXml[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<OperacionXml | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async (p: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.fnning.list(p, PAGE_SIZE);
      setData(res.data);
      setTotal(res.total);
      setPages(res.pages);
      setPage(res.page);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pages) return;
    loadData(newPage);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.fnning.delete(deleteTarget.OperacionId);
      setDeleteTarget(null);
      loadData(page);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };


  return (
    <div>
      <PageHeader
        title="Operaciones XML"
        subtitle="Gestion de operaciones de importacion/exportacion"
      >
        <button
          onClick={() => router.push("/dashboard/fnning/operaciones-xml/editar/nuevo")}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-colors"
        >
          Nuevo Registro
        </button>
      </PageHeader>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="text-sm text-faro-text">Cargando...</div>
      ) : data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-faro-border bg-faro-surface p-12 text-center">
          <FileSearch className="mx-auto w-8 h-8 text-faro-text mb-3" />
          <p className="text-sm text-faro-text">No hay operaciones registradas</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-faro-surface border border-faro-border overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-faro-border bg-white/[0.02]">
                    <th className="px-3 py-3 text-left text-xs font-semibold text-faro-text uppercase tracking-wider w-24">
                      Acciones
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-faro-text uppercase tracking-wider">
                      Id
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-faro-text uppercase tracking-wider">
                      Nro Registro
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-faro-text uppercase tracking-wider">
                      Patron
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-faro-text uppercase tracking-wider">
                      Recinto
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-faro-text uppercase tracking-wider">
                      Fecha Validacion
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-faro-text uppercase tracking-wider">
                      Fecha Pago
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-faro-text uppercase tracking-wider">
                      Fecha Salida
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-faro-text uppercase tracking-wider">
                      Canal
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-faro-text uppercase tracking-wider">
                      Moneda
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-faro-text uppercase tracking-wider">
                      FOB
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-faro-text uppercase tracking-wider">
                      Flete
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-faro-text uppercase tracking-wider">
                      Valor CIF
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-faro-text uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-faro-text uppercase tracking-wider">
                      Fecha Registro
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-faro-text uppercase tracking-wider">
                      Fecha Modificacion
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-faro-border/50">
                  {data.map((row) => (
                    <tr
                      key={row.OperacionId}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => router.push(`/dashboard/fnning/operaciones-xml/editar/${row.OperacionId}?modo=view`)}
                            className="p-1.5 rounded-md hover:bg-white/[0.04] text-faro-text hover:text-cyan-400 transition-colors"
                            title="Ver"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/fnning/operaciones-xml/editar/${row.OperacionId}?modo=edit`)}
                            className="p-1.5 rounded-md hover:bg-white/[0.04] text-faro-text hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(row)}
                            className="p-1.5 rounded-md hover:bg-white/[0.06] text-faro-text hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-faro-textlight font-mono text-xs">
                        {row.OperacionId}
                      </td>
                      <td className="px-3 py-2.5 text-faro-textlight whitespace-nowrap">
                        {row.NroRegistro || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-faro-text whitespace-nowrap">
                        {row.Patron || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-faro-text whitespace-nowrap">
                        {row.Recinto || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-faro-text whitespace-nowrap text-xs">
                        {formatDate(row.FechaValidacion)}
                      </td>
                      <td className="px-3 py-2.5 text-faro-text whitespace-nowrap text-xs">
                        {formatDate(row.FechaPago)}
                      </td>
                      <td className="px-3 py-2.5 text-faro-text whitespace-nowrap text-xs">
                        {formatDate(row.FechaSalidadeMercancia)}
                      </td>
                      <td className="px-3 py-2.5 text-faro-text text-xs">
                        {row.Canal || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-faro-text text-xs">
                        {row.MonedaId || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-faro-textlight text-right font-mono text-xs">
                        {formatDecimal(row.FOB)}
                      </td>
                      <td className="px-3 py-2.5 text-faro-textlight text-right font-mono text-xs">
                        {formatDecimal(row.Flete)}
                      </td>
                      <td className="px-3 py-2.5 text-faro-textlight text-right font-mono text-xs">
                        {formatDecimal(row.ValorCIF)}
                      </td>
                      <td className="px-3 py-2.5 text-faro-text text-xs">
                        {row.UsuarioNombre || row.UsuarioId || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-faro-text whitespace-nowrap text-xs">
                        {formatDate(row.FechaReg)}
                      </td>
                      <td className="px-3 py-2.5 text-faro-text whitespace-nowrap text-xs">
                        {formatDate(row.FechaMod)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-faro-text">
            <span>
              Mostrando {(page - 1) * PAGE_SIZE + 1} a{" "}
              {Math.min(page * PAGE_SIZE, total)} de {total} resultados
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-faro-surface border border-faro-border hover:bg-white/[0.04] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                <ChevronLeft className="w-3 h-3" />
                Anterior
              </button>
              <span className="text-xs text-faro-text/60">
                Pagina {page} de {pages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= pages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-faro-surface border border-faro-border hover:bg-white/[0.04] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                Siguiente
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-faro-surface border border-faro-border p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-faro-textlight">
                  Confirmar eliminacion
                </h2>
                <p className="text-xs text-faro-text mt-0.5">
                  Esta accion no se puede deshacer
                </p>
              </div>
            </div>

            <p className="text-sm text-faro-text mb-2">
              Esta seguro de eliminar la operacion{" "}
              <span className="text-faro-textlight font-medium">
                {deleteTarget.NroRegistro || deleteTarget.OperacionId}
              </span>
              ?
            </p>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-faro-text hover:bg-white/[0.04] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {deleting ? "Eliminando..." : "Si, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
