import { useMemo, useState } from "react";
import {
  Download,
  Gauge,
  Search,
  TimerReset,
  Trophy,
  UserRound,
} from "lucide-react";
import type { OperationRecord } from "../types";

interface OperatorProductivityReportProps {
  data: OperationRecord[];
  selectedDate: string;
}

interface OperatorSummary {
  operatorId: number;
  operatorName: string;
  totalOperations: number;
  openOperations: number;
  totalMinutes: number;
  topStatusesLabel: string;
  topStatusName: string;
  topStatusCount: number;
  lastStartedAt: string;
  notesCount: number;
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

function formatDurationFromMinutes(totalMinutes: number) {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return "0min";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);

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

export function OperatorProductivityReport({
  data,
  selectedDate,
}: OperatorProductivityReportProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const summaries = useMemo(() => {
    const grouped = new Map<number, OperatorSummary & { statusCounts: Map<string, number> }>();

    for (const operation of data) {
      const startedAtMs = new Date(operation.startedAt).getTime();
      const finishedAtMs = operation.finishedAt
        ? new Date(operation.finishedAt).getTime()
        : Date.now();
      const totalMinutes = Number.isNaN(startedAtMs) || Number.isNaN(finishedAtMs)
        ? 0
        : Math.max(finishedAtMs - startedAtMs, 0) / 60_000;

      const existing = grouped.get(operation.operatorId);

      if (!existing) {
        const statusCounts = new Map<string, number>();
        statusCounts.set(operation.statusName, 1);

        grouped.set(operation.operatorId, {
          operatorId: operation.operatorId,
          operatorName: operation.operatorName,
          totalOperations: 1,
          openOperations: operation.finishedAt ? 0 : 1,
          totalMinutes,
          topStatusesLabel: operation.statusName,
          topStatusName: operation.statusName,
          topStatusCount: 1,
          lastStartedAt: operation.startedAt,
          notesCount: operation.notes ? 1 : 0,
          statusCounts,
        });
        continue;
      }

      existing.totalOperations += 1;
      existing.openOperations += operation.finishedAt ? 0 : 1;
      existing.totalMinutes += totalMinutes;
      existing.notesCount += operation.notes ? 1 : 0;

      if (new Date(operation.startedAt).getTime() > new Date(existing.lastStartedAt).getTime()) {
        existing.lastStartedAt = operation.startedAt;
      }

      existing.statusCounts.set(
        operation.statusName,
        (existing.statusCounts.get(operation.statusName) || 0) + 1,
      );
    }

    return Array.from(grouped.values())
      .map((summary) => {
        const orderedStatuses = Array.from(summary.statusCounts.entries()).sort(
          (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"),
        );
        const topStatusesLabel = orderedStatuses
          .slice(0, 3)
          .map(([statusName, count]) => `${statusName} (${count})`)
          .join(", ");
        const [topStatusName = "-", topStatusCount = 0] = orderedStatuses[0] || [];

        return {
          operatorId: summary.operatorId,
          operatorName: summary.operatorName,
          totalOperations: summary.totalOperations,
          openOperations: summary.openOperations,
          totalMinutes: summary.totalMinutes,
          topStatusesLabel,
          topStatusName,
          topStatusCount,
          lastStartedAt: summary.lastStartedAt,
          notesCount: summary.notesCount,
        };
      })
      .sort((a, b) => {
        if (b.totalOperations !== a.totalOperations) {
          return b.totalOperations - a.totalOperations;
        }

        if (b.totalMinutes !== a.totalMinutes) {
          return b.totalMinutes - a.totalMinutes;
        }

        return a.operatorName.localeCompare(b.operatorName, "pt-BR");
      });
  }, [data]);

  const filteredSummaries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return summaries;
    }

    return summaries.filter((summary) => {
      return (
        summary.operatorName.toLowerCase().includes(query) ||
        summary.topStatusesLabel.toLowerCase().includes(query)
      );
    });
  }, [searchTerm, summaries]);

  const reportStats = useMemo(() => {
    const totalMinutes = filteredSummaries.reduce(
      (total, summary) => total + summary.totalMinutes,
      0,
    );
    const topOperator = filteredSummaries[0] || null;

    const topStatuses = new Map<string, number>();
    for (const operation of data) {
      topStatuses.set(
        operation.statusName,
        (topStatuses.get(operation.statusName) || 0) + 1,
      );
    }

    const dominantStatus = Array.from(topStatuses.entries()).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"),
    )[0];

    return {
      activeOperators: filteredSummaries.length,
      totalMinutes,
      topOperator,
      dominantStatus: dominantStatus
        ? `${dominantStatus[0]} (${dominantStatus[1]})`
        : "-",
    };
  }, [data, filteredSummaries]);

  const handleExport = () => {
    const headers = [
      "Operador",
      "Total de operacoes",
      "Operacoes abertas",
      "Tempo em operacao",
      "Status mais frequentes",
      "Ultima atividade",
      "Registros com observacao",
    ];

    const csv = [
      headers.join(","),
      ...filteredSummaries.map((summary) =>
        [
          buildCsvValue(summary.operatorName),
          summary.totalOperations,
          summary.openOperations,
          buildCsvValue(formatDurationFromMinutes(summary.totalMinutes)),
          buildCsvValue(summary.topStatusesLabel),
          buildCsvValue(summary.lastStartedAt),
          summary.notesCount,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `produtividade-operadores-${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-xl">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-900">
              Relatorio de produtividade por operador
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Consolidado do dia por operador, com tempo total e status mais recorrentes.
            </p>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-800"
          >
            <Download size={18} />
            Exportar produtividade
          </button>
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Operadores ativos</p>
                <p className="text-3xl font-black text-slate-900">
                  {reportStats.activeOperators}
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
                <p className="text-sm text-slate-500">Tempo total</p>
                <p className="text-3xl font-black text-slate-900">
                  {formatDurationFromMinutes(reportStats.totalMinutes)}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3">
                <TimerReset size={22} className="text-emerald-700" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Lider do dia</p>
                <p className="text-xl font-black text-slate-900">
                  {reportStats.topOperator?.operatorName || "-"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {reportStats.topOperator
                    ? `${reportStats.topOperator.totalOperations} operacoes`
                    : "Sem dados no periodo"}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <Trophy size={22} className="text-amber-700" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Status dominante</p>
                <p className="text-xl font-black text-slate-900">
                  {reportStats.dominantStatus}
                </p>
              </div>
              <div className="rounded-xl bg-red-50 p-3">
                <Gauge size={22} className="text-red-700" />
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar operador ou status mais frequente..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-xl border border-black/8 bg-slate-50 py-2 pl-10 pr-4 transition-colors focus:border-amber-300 focus:outline-none"
          />
        </div>
      </div>

      <div className="rounded-[2rem] border border-black/5 bg-white shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "Operador",
                  "Operacoes",
                  "Abertas",
                  "Tempo em operacao",
                  "Status mais frequentes",
                  "Ultima atividade",
                  "Observacoes",
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
              {filteredSummaries.map((summary, index) => (
                <tr
                  key={summary.operatorId}
                  className={index % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                >
                  <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                    {summary.operatorName}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {summary.totalOperations}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {summary.openOperations}
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                    {formatDurationFromMinutes(summary.totalMinutes)}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-slate-900">
                        {summary.topStatusName} ({summary.topStatusCount})
                      </span>
                      <span className="text-xs text-slate-500">
                        {summary.topStatusesLabel}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {formatDateTime(summary.lastStartedAt)}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {summary.notesCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSummaries.length === 0 && (
          <div className="p-12 text-center">
            <p className="font-medium text-slate-500">
              Nenhum operador encontrado para este relatorio.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
