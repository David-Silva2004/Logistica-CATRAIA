import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  CheckCircle2,
  Download,
  Edit2,
  Filter,
  ShipWheel,
  Play,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import type { OperationRecord, SelectOption } from "../types";

interface OperationTableProps {
  data: OperationRecord[];
  lanchas: SelectOption[];
  operators: SelectOption[];
  canDelete: boolean;
  searchTerm: string;
  statusFilter: string;
  lanchaFilter: string;
  operatorFilter: string;
  onAdd: () => void;
  onCloseOperation: (operation: OperationRecord) => void;
  onEdit: (operation: OperationRecord) => void;
  onDelete: (operation: OperationRecord) => void;
  onExport: () => void;
  onSearchTermChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onLanchaFilterChange: (value: string) => void;
  onOperatorFilterChange: (value: string) => void;
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

function normalizeLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatDuration(
  startedAt: string,
  finishedAt: string | null,
  now: number,
) {
  const startTime = new Date(startedAt).getTime();
  const endTime = finishedAt ? new Date(finishedAt).getTime() : now;

  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    return "-";
  }

  const elapsedMs = Math.max(endTime - startTime, 0);
  const totalMinutes = Math.floor(elapsedMs / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }

  if (hours > 0 || days > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes}min`);
  }

  return parts.join(" ");
}

function getStatusStyles(statusName: string, isOpen: boolean) {
  const label = normalizeLabel(statusName);

  if (
    label.includes("barra") ||
    label.includes("viagem") ||
    label.includes("passeio")
  ) {
    return {
      badge: "border-red-300 bg-red-100 text-red-950",
      row: isOpen ? "border-l-[6px] border-red-500 bg-red-100/85" : "",
    };
  }

  if (label.includes("almoco") || label.includes("abaste")) {
    return {
      badge: "border-sky-300 bg-sky-100 text-sky-950",
      row: isOpen ? "border-l-[6px] border-sky-500 bg-sky-100/85" : "",
    };
  }

  if (label.includes("livre")) {
    return {
      badge: "border-emerald-300 bg-emerald-100 text-emerald-950",
      row: isOpen ? "border-l-[6px] border-emerald-500 bg-emerald-100/85" : "",
    };
  }

  return {
    badge: "border-slate-300 bg-slate-100 text-slate-900",
    row: isOpen ? "border-l-[6px] border-slate-400 bg-slate-100/85" : "",
  };
}

export function OperationTable({
  data,
  lanchas,
  operators,
  canDelete,
  searchTerm,
  statusFilter,
  lanchaFilter,
  operatorFilter,
  onAdd,
  onCloseOperation,
  onEdit,
  onDelete,
  onExport,
  onSearchTermChange,
  onStatusFilterChange,
  onLanchaFilterChange,
  onOperatorFilterChange,
}: OperationTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("startedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

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
      const matchesLancha =
        lanchaFilter === "all" || String(item.lanchaId) === lanchaFilter;
      const matchesOperator =
        operatorFilter === "all" || String(item.operatorId) === operatorFilter;

      return matchesSearch && matchesStatus && matchesLancha && matchesOperator;
    });

    filtered.sort((a, b) => {
      const aIsOpen = !a.finishedAt;
      const bIsOpen = !b.finishedAt;

      if (aIsOpen !== bIsOpen) {
        return aIsOpen ? -1 : 1;
      }

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
  }, [
    data,
    lanchaFilter,
    operatorFilter,
    searchTerm,
    sortColumn,
    sortDirection,
    statusFilter,
  ]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumn(column);
    setSortDirection(column === "startedAt" ? "desc" : "asc");
  };

  const openOperationsCount = data.filter((item) => !item.finishedAt).length;
  const openOperations = data.filter((item) => !item.finishedAt);
  const activeLanchaIds = new Set(openOperations.map((item) => item.lanchaId));
  const freeLanchasCount = Math.max(lanchas.length - activeLanchaIds.size, 0);
  const barraCount = openOperations.filter((item) =>
    normalizeLabel(item.statusName).includes("barra"),
  ).length;
  const passeioCount = openOperations.filter((item) =>
    normalizeLabel(item.statusName).includes("passeio"),
  ).length;
  const viagemCount = openOperations.filter((item) =>
    normalizeLabel(item.statusName).includes("viagem"),
  ).length;

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
              <Play size={18} />
              Iniciar operacao
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <span className="font-bold">{openOperationsCount}</span> em operacao
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <span className="font-bold">{freeLanchasCount}</span> livres
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span className="font-bold">{barraCount}</span> barra
          </div>
          <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-3 text-sm text-fuchsia-900">
            <span className="font-bold">{passeioCount}</span> passeio
          </div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            <span className="font-bold">{viagemCount}</span> viagem
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            No inicio, a lista de lanchas mostra apenas embarcacoes livres.
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
              onChange={(event) => onSearchTermChange(event.target.value)}
              className="w-full rounded-xl border border-black/8 bg-slate-50 py-2 pl-10 pr-4 transition-colors focus:border-amber-300 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-black/8 bg-slate-50 px-3 py-2">
            <Filter size={18} className="text-amber-700" />
            <select
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value)}
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

          <div className="flex items-center gap-2 rounded-xl border border-black/8 bg-slate-50 px-3 py-2">
            <ShipWheel size={18} className="text-amber-700" />
            <select
              value={lanchaFilter}
              onChange={(event) => onLanchaFilterChange(event.target.value)}
              className="cursor-pointer bg-transparent text-sm font-medium outline-none"
            >
              <option value="all">Todas lanchas</option>
              {lanchas.map((lancha) => (
                <option key={lancha.id} value={String(lancha.id)}>
                  {lancha.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-black/8 bg-slate-50 px-3 py-2">
            <UserRound size={18} className="text-amber-700" />
            <select
              value={operatorFilter}
              onChange={(event) => onOperatorFilterChange(event.target.value)}
              className="cursor-pointer bg-transparent text-sm font-medium outline-none"
            >
              <option value="all">Todos operadores</option>
              {operators.map((operator) => (
                <option key={operator.id} value={String(operator.id)}>
                  {operator.label}
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
                Rodando
              </th>
              <th className="border-b border-black/5 px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                Tipo
              </th>
              <th className="border-b border-black/5 px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                Marinheiro
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
            {filteredAndSortedData.map((operation, index) => {
              const isOpen = !operation.finishedAt;
              const statusStyles = getStatusStyles(operation.statusName, isOpen);

              return (
                <tr
                  key={operation.id}
                  className={`transition-colors hover:bg-amber-50/45 ${
                    isOpen
                      ? statusStyles.row
                      : index % 2 === 0
                        ? "bg-white"
                        : "bg-slate-50/60"
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
                      className={`rounded-full border-2 px-3 py-1 text-xs font-bold ${statusStyles.badge}`}
                    >
                      {operation.statusName}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-mono text-sm text-slate-900">
                    {formatDateTime(operation.startedAt)}
                  </td>
                  <td className="px-4 py-4 font-mono text-sm text-slate-900">
                    {isOpen ? (
                      <span className="font-semibold text-slate-500">Em aberto</span>
                    ) : (
                      formatDateTime(operation.finishedAt)
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <div className="flex flex-col">
                      <span
                        className={`font-semibold ${
                          isOpen ? "text-slate-950" : "text-slate-700"
                        }`}
                      >
                        {formatDuration(operation.startedAt, operation.finishedAt, now)}
                      </span>
                      <span className="text-xs uppercase tracking-wide text-slate-500">
                        {isOpen ? "em andamento" : "encerrada"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {operation.typeName}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {operation.crewMemberName || "-"}
                  </td>
                  <td className="max-w-xs truncate px-4 py-4 text-sm text-slate-600">
                    {operation.notes || "-"}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <div className="flex items-center gap-1">
                      {isOpen && (
                        <button
                          onClick={() => onCloseOperation(operation)}
                          className="rounded-lg p-2 text-emerald-700 transition-colors hover:bg-emerald-50 hover:text-emerald-900"
                          title="Encerrar operacao"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(operation)}
                        className="rounded-lg p-2 text-amber-800 transition-colors hover:bg-amber-50 hover:text-amber-950"
                        title="Editar operacao"
                      >
                        <Edit2 size={16} />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => onDelete(operation)}
                          className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700"
                          title="Excluir operacao"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
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
