import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  Download,
  Edit2,
  Filter,
  Plus,
  Search,
} from "lucide-react";
import type { OperationRecord } from "../types";

interface OperationTableProps {
  data: OperationRecord[];
  onAdd: () => void;
  onEdit: (operation: OperationRecord) => void;
  onExport: () => void;
}

type SortColumn =
  | "id"
  | "operatorName"
  | "lanchaName"
  | "statusName"
  | "startedAt"
  | "finishedAt";

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getStatusTone(statusName: string) {
  const label = statusName.toLowerCase();

  if (label.includes("livre")) {
    return "border-yellow-200 bg-yellow-100 text-amber-900";
  }

  if (label.includes("almoco") || label.includes("abaste")) {
    return "border-orange-200 bg-orange-100 text-orange-900";
  }

  return "border-amber-200 bg-amber-100 text-amber-900";
}

export function OperationTable({
  data,
  onAdd,
  onEdit,
  onExport,
}: OperationTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortColumn, setSortColumn] = useState<SortColumn>("startedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const statusOptions = useMemo(
    () => Array.from(new Set(data.map((item) => item.statusName))).sort(),
    [data],
  );

  const filteredAndSortedData = useMemo(() => {
    const filtered = data.filter((item) => {
      const query = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !query ||
        String(item.id).includes(query) ||
        item.operatorName.toLowerCase().includes(query) ||
        item.lanchaName.toLowerCase().includes(query) ||
        item.typeName.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" || item.statusName === statusFilter;

      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      const aValue = a[sortColumn] ?? "";
      const bValue = b[sortColumn] ?? "";

      if (aValue < bValue) {
        return sortDirection === "asc" ? -1 : 1;
      }

      if (aValue > bValue) {
        return sortDirection === "asc" ? 1 : -1;
      }

      return 0;
    });

    return filtered;
  }, [data, searchTerm, sortColumn, sortDirection, statusFilter]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumn(column);
    setSortDirection(column === "startedAt" ? "desc" : "asc");
  };

  return (
    <div className="rounded-[2rem] border border-black/5 bg-white shadow-xl">
      <div className="border-b border-black/5 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-xl font-black text-slate-900">Operacoes do dia</h3>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={onExport}
              className="flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-800"
            >
              <Download size={18} />
              Exportar CSV
            </button>

            <button
              onClick={onAdd}
              className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-100 px-4 py-2 font-bold text-amber-950 transition-colors hover:bg-amber-200"
            >
              <Plus size={18} />
              Nova operacao
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[280px] flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar por ID, operador, lancha ou tipo..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-black/8 bg-slate-50 py-2 pl-10 pr-4 transition-colors focus:border-amber-300 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-black/8 bg-slate-50 px-3 py-2">
            <Filter size={18} className="text-amber-700" />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="cursor-pointer bg-transparent text-sm font-medium outline-none"
            >
              <option value="all">Todos status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              {[
                { key: "id", label: "ID" },
                { key: "operatorName", label: "Operador" },
                { key: "lanchaName", label: "Lancha" },
                { key: "statusName", label: "Status" },
                { key: "startedAt", label: "Inicio" },
                { key: "finishedAt", label: "Fim" },
              ].map((column) => (
                <th
                  key={column.key}
                  onClick={() => handleSort(column.key as SortColumn)}
                  className="cursor-pointer border-b border-black/5 px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    <ArrowUpDown size={14} className="text-slate-400" />
                  </div>
                </th>
              ))}
              <th className="border-b border-black/5 px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                Tipo
              </th>
              <th className="border-b border-black/5 px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                Usuario
              </th>
              <th className="border-b border-black/5 px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                Observacao
              </th>
              <th className="border-b border-black/5 px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                Acoes
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-black/5">
            {filteredAndSortedData.map((operation, index) => (
              <tr
                key={operation.id}
                className={`transition-colors hover:bg-amber-50/35 ${
                  index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                }`}
              >
                <td className="px-4 py-4 text-sm font-mono font-semibold text-slate-900">
                  OP{String(operation.id).padStart(4, "0")}
                </td>
                <td className="px-4 py-4 text-sm font-medium text-slate-900">
                  {operation.operatorName}
                </td>
                <td className="px-4 py-4 text-sm text-slate-700">
                  {operation.lanchaName}
                </td>
                <td className="px-4 py-4 text-sm">
                  <span
                    className={`rounded-full border-2 px-3 py-1 text-xs font-semibold ${getStatusTone(
                      operation.statusName,
                    )}`}
                  >
                    {operation.statusName}
                  </span>
                </td>
                <td className="px-4 py-4 font-mono text-sm text-slate-900">
                  {formatDateTime(operation.startedAt)}
                </td>
                <td className="px-4 py-4 font-mono text-sm text-slate-900">
                  {formatDateTime(operation.finishedAt)}
                </td>
                <td className="px-4 py-4 text-sm text-slate-600">
                  {operation.typeName}
                </td>
                <td className="px-4 py-4 text-sm text-slate-600">
                  {operation.userName || "-"}
                </td>
                <td className="max-w-xs truncate px-4 py-4 text-sm text-slate-600">
                  {operation.notes || "-"}
                </td>
                <td className="px-4 py-4 text-sm">
                  <button
                    onClick={() => onEdit(operation)}
                    className="rounded-lg p-2 text-amber-800 transition-colors hover:bg-amber-50 hover:text-amber-950"
                  >
                    <Edit2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedData.length === 0 && (
        <div className="p-12 text-center">
          <p className="font-medium text-slate-500">
            Nenhuma operacao encontrada com os filtros aplicados.
          </p>
        </div>
      )}

      <div className="border-t border-black/5 bg-slate-50 px-6 py-4">
        <p className="text-sm text-slate-600">
          Exibindo{" "}
          <span className="font-semibold text-slate-900">
            {filteredAndSortedData.length}
          </span>{" "}
          de <span className="font-semibold text-slate-900">{data.length}</span>{" "}
          operacoes
        </p>
      </div>
    </div>
  );
}
