import { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  Clock3,
  Download,
  FileText,
  Filter,
  Search,
  ShipWheel,
  UserRound,
} from "lucide-react";
import type { OperationRecord, SelectOption } from "../types";

interface DailyOperationsReportProps {
  data: OperationRecord[];
  selectedDate: string;
  lanchas: SelectOption[];
  operators: SelectOption[];
}

function normalizeLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
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
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}min`;
  }

  return `${hours}h ${minutes}min`;
}

function buildCsvValue(value: string | number | null) {
  if (value === null || value === undefined) {
    return '""';
  }

  const text = String(value).replaceAll('"', '""');
  return `"${text}"`;
}

export function DailyOperationsReport({
  data,
  selectedDate,
  lanchas,
  operators,
}: DailyOperationsReportProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lanchaFilter, setLanchaFilter] = useState("all");
  const [operatorFilter, setOperatorFilter] = useState("all");
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

  const filteredData = useMemo(() => {
    return data
      .filter((item) => {
        const query = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !query ||
          String(item.id).includes(query) ||
          item.operatorName.toLowerCase().includes(query) ||
          item.lanchaName.toLowerCase().includes(query) ||
          item.notes.toLowerCase().includes(query) ||
          (item.crewMemberName || "").toLowerCase().includes(query);

        const matchesStatus =
          statusFilter === "all" || item.statusName === statusFilter;
        const matchesLancha =
          lanchaFilter === "all" || String(item.lanchaId) === lanchaFilter;
        const matchesOperator =
          operatorFilter === "all" || String(item.operatorId) === operatorFilter;

        return matchesSearch && matchesStatus && matchesLancha && matchesOperator;
      })
      .sort((a, b) => {
        const aIsOpen = !a.finishedAt;
        const bIsOpen = !b.finishedAt;

        if (aIsOpen !== bIsOpen) {
          return aIsOpen ? -1 : 1;
        }

        return (
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        );
      });
  }, [data, lanchaFilter, operatorFilter, searchTerm, statusFilter]);

  const reportStats = useMemo(() => {
    const openOperations = filteredData.filter((item) => !item.finishedAt);
    const totalMinutes = filteredData.reduce((total, operation) => {
      const startTime = new Date(operation.startedAt).getTime();
      const endTime = operation.finishedAt
        ? new Date(operation.finishedAt).getTime()
        : now;

      if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
        return total;
      }

      return total + Math.max(endTime - startTime, 0) / 60_000;
    }, 0);

    return {
      total: filteredData.length,
      open: openOperations.length,
      operators: new Set(filteredData.map((item) => item.operatorId)).size,
      hours: (totalMinutes / 60).toFixed(1),
    };
  }, [filteredData, now]);

  const handleExport = () => {
    const headers = [
      "ID",
      "Operador",
      "Lancha",
      "Status",
      "Inicio",
      "Fim",
      "Tempo rodando",
      "Marinheiro",
      "Observacao",
    ];

    const csv = [
      headers.join(","),
      ...filteredData.map((operation) =>
        [
          operation.id,
          buildCsvValue(operation.operatorName),
          buildCsvValue(operation.lanchaName),
          buildCsvValue(operation.statusName),
          buildCsvValue(operation.startedAt),
          buildCsvValue(operation.finishedAt),
          buildCsvValue(formatDuration(operation.startedAt, operation.finishedAt, now)),
          buildCsvValue(operation.crewMemberName),
          buildCsvValue(operation.notes),
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-operacoes-${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-xl">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-900">
              Relatorio diario de operacoes
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Data selecionada:{" "}
              <span className="font-semibold text-slate-900">
                {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("pt-BR")}
              </span>
            </p>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-800"
          >
            <Download size={18} />
            Exportar relatorio
          </button>
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Operacoes do dia</p>
                <p className="text-3xl font-black text-slate-900">
                  {reportStats.total}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <FileText size={22} className="text-amber-700" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Abertas no momento</p>
                <p className="text-3xl font-black text-slate-900">
                  {reportStats.open}
                </p>
              </div>
              <div className="rounded-xl bg-red-50 p-3">
                <Clock3 size={22} className="text-red-700" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Operadores no dia</p>
                <p className="text-3xl font-black text-slate-900">
                  {reportStats.operators}
                </p>
              </div>
              <div className="rounded-xl bg-sky-50 p-3">
                <UserRound size={22} className="text-sky-700" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Horas acumuladas</p>
                <p className="text-3xl font-black text-slate-900">
                  {reportStats.hours}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3">
                <CalendarRange size={22} className="text-emerald-700" />
              </div>
            </div>
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
              placeholder="Buscar por operador, lancha, marinheiro ou observacao..."
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

          <div className="flex items-center gap-2 rounded-xl border border-black/8 bg-slate-50 px-3 py-2">
            <ShipWheel size={18} className="text-amber-700" />
            <select
              value={lanchaFilter}
              onChange={(event) => setLanchaFilter(event.target.value)}
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
              onChange={(event) => setOperatorFilter(event.target.value)}
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

      <div className="rounded-[2rem] border border-black/5 bg-white shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "ID",
                  "Operador",
                  "Lancha",
                  "Status",
                  "Inicio",
                  "Fim",
                  "Tempo rodando",
                  "Marinheiro",
                  "Observacao",
                ].map((label) => (
                  <th
                    key={label}
                    className="border-b border-black/5 px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-black/5">
              {filteredData.map((operation, index) => {
                const isOpen = !operation.finishedAt;
                const rowAccent = normalizeLabel(operation.statusName).includes("livre")
                  ? "border-l-[6px] border-emerald-500"
                  : isOpen
                    ? "border-l-[6px] border-red-500"
                    : "border-l-[6px] border-slate-200";

                return (
                  <tr
                    key={operation.id}
                    className={`${rowAccent} ${
                      index % 2 === 0 ? "bg-white" : "bg-slate-50/60"
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
                    <td className="px-4 py-4 text-sm text-slate-700">
                      {operation.statusName}
                    </td>
                    <td className="px-4 py-4 text-sm font-mono text-slate-900">
                      {formatDateTime(operation.startedAt)}
                    </td>
                    <td className="px-4 py-4 text-sm font-mono text-slate-900">
                      {isOpen ? "Em aberto" : formatDateTime(operation.finishedAt)}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                      {formatDuration(operation.startedAt, operation.finishedAt, now)}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      {operation.crewMemberName || "-"}
                    </td>
                    <td className="max-w-sm px-4 py-4 text-sm text-slate-600">
                      {operation.notes || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="p-12 text-center">
            <p className="font-medium text-slate-500">
              Nenhuma operacao encontrada para os filtros deste relatorio.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
