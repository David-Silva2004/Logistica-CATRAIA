import { useMemo, useState } from "react";
import {
  Anchor,
  Download,
  Gauge,
  Search,
  ShipWheel,
  TimerReset,
} from "lucide-react";
import type { OperationRecord } from "../types";

interface LanchaUsageReportProps {
  data: OperationRecord[];
  selectedDate: string;
}

interface LanchaSummary {
  lanchaId: number;
  lanchaName: string;
  typeName: string;
  totalOperations: number;
  openOperations: number;
  totalMinutes: number;
  latestStatusesLabel: string;
  latestStatusName: string;
  lastStartedAt: string;
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

export function LanchaUsageReport({
  data,
  selectedDate,
}: LanchaUsageReportProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const summaries = useMemo(() => {
    const grouped = new Map<
      number,
      LanchaSummary & { recentStatuses: Array<{ statusName: string; startedAt: string }> }
    >();

    for (const operation of data) {
      const startedAtMs = new Date(operation.startedAt).getTime();
      const finishedAtMs = operation.finishedAt
        ? new Date(operation.finishedAt).getTime()
        : Date.now();
      const totalMinutes = Number.isNaN(startedAtMs) || Number.isNaN(finishedAtMs)
        ? 0
        : Math.max(finishedAtMs - startedAtMs, 0) / 60_000;

      const existing = grouped.get(operation.lanchaId);

      if (!existing) {
        grouped.set(operation.lanchaId, {
          lanchaId: operation.lanchaId,
          lanchaName: operation.lanchaName,
          typeName: operation.typeName,
          totalOperations: 1,
          openOperations: operation.finishedAt ? 0 : 1,
          totalMinutes,
          latestStatusesLabel: operation.statusName,
          latestStatusName: operation.statusName,
          lastStartedAt: operation.startedAt,
          recentStatuses: [
            {
              statusName: operation.statusName,
              startedAt: operation.startedAt,
            },
          ],
        });
        continue;
      }

      existing.totalOperations += 1;
      existing.openOperations += operation.finishedAt ? 0 : 1;
      existing.totalMinutes += totalMinutes;
      existing.recentStatuses.push({
        statusName: operation.statusName,
        startedAt: operation.startedAt,
      });

      if (new Date(operation.startedAt).getTime() > new Date(existing.lastStartedAt).getTime()) {
        existing.lastStartedAt = operation.startedAt;
        existing.latestStatusName = operation.statusName;
      }
    }

    return Array.from(grouped.values())
      .map((summary) => {
        const latestStatusesLabel = summary.recentStatuses
          .sort(
            (a, b) =>
              new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
          )
          .slice(0, 3)
          .map((item) => item.statusName)
          .join(", ");

        return {
          lanchaId: summary.lanchaId,
          lanchaName: summary.lanchaName,
          typeName: summary.typeName,
          totalOperations: summary.totalOperations,
          openOperations: summary.openOperations,
          totalMinutes: summary.totalMinutes,
          latestStatusesLabel,
          latestStatusName: summary.latestStatusName,
          lastStartedAt: summary.lastStartedAt,
        };
      })
      .sort((a, b) => {
        if (b.totalOperations !== a.totalOperations) {
          return b.totalOperations - a.totalOperations;
        }

        if (b.totalMinutes !== a.totalMinutes) {
          return b.totalMinutes - a.totalMinutes;
        }

        return a.lanchaName.localeCompare(b.lanchaName, "pt-BR");
      });
  }, [data]);

  const filteredSummaries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return summaries;
    }

    return summaries.filter((summary) => {
      return (
        summary.lanchaName.toLowerCase().includes(query) ||
        summary.typeName.toLowerCase().includes(query) ||
        summary.latestStatusesLabel.toLowerCase().includes(query)
      );
    });
  }, [searchTerm, summaries]);

  const reportStats = useMemo(() => {
    const totalMinutes = filteredSummaries.reduce(
      (total, summary) => total + summary.totalMinutes,
      0,
    );
    const topLancha = filteredSummaries[0] || null;

    const dominantTypes = new Map<string, number>();
    for (const summary of filteredSummaries) {
      dominantTypes.set(
        summary.typeName,
        (dominantTypes.get(summary.typeName) || 0) + summary.totalOperations,
      );
    }

    const topType = Array.from(dominantTypes.entries()).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"),
    )[0];

    return {
      activeLanchas: filteredSummaries.length,
      totalOperations: filteredSummaries.reduce(
        (total, summary) => total + summary.totalOperations,
        0,
      ),
      totalMinutes,
      topLancha,
      topType: topType ? `${topType[0]} (${topType[1]})` : "-",
    };
  }, [filteredSummaries]);

  const handleExport = () => {
    const headers = [
      "Lancha",
      "Tipo",
      "Saidas",
      "Operacoes abertas",
      "Tempo total em uso",
      "Ultimos status",
      "Ultima atividade",
    ];

    const csv = [
      headers.join(","),
      ...filteredSummaries.map((summary) =>
        [
          buildCsvValue(summary.lanchaName),
          buildCsvValue(summary.typeName),
          summary.totalOperations,
          summary.openOperations,
          buildCsvValue(formatDurationFromMinutes(summary.totalMinutes)),
          buildCsvValue(summary.latestStatusesLabel),
          buildCsvValue(summary.lastStartedAt),
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `uso-lanchas-${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-xl">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-900">
              Relatorio por lancha
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Visao de uso da frota no dia, com saidas, tempo acumulado e ultimos status.
            </p>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-800"
          >
            <Download size={18} />
            Exportar frota
          </button>
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Lanchas no periodo</p>
                <p className="text-3xl font-black text-slate-900">
                  {reportStats.activeLanchas}
                </p>
              </div>
              <div className="rounded-xl bg-sky-50 p-3">
                <ShipWheel size={22} className="text-sky-700" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Saidas registradas</p>
                <p className="text-3xl font-black text-slate-900">
                  {reportStats.totalOperations}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <Anchor size={22} className="text-amber-700" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Tempo total em uso</p>
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
                <p className="text-sm text-slate-500">Tipo dominante</p>
                <p className="text-xl font-black text-slate-900">
                  {reportStats.topType}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Mais movimentado: {reportStats.topLancha?.lanchaName || "-"}
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
            placeholder="Buscar lancha, tipo ou ultimos status..."
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
                  "Lancha",
                  "Tipo",
                  "Saidas",
                  "Abertas",
                  "Tempo total em uso",
                  "Ultimos status",
                  "Ultima atividade",
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
                  key={summary.lanchaId}
                  className={index % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                >
                  <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                    {summary.lanchaName}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {summary.typeName}
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
                        {summary.latestStatusName}
                      </span>
                      <span className="text-xs text-slate-500">
                        {summary.latestStatusesLabel}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {formatDateTime(summary.lastStartedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSummaries.length === 0 && (
          <div className="p-12 text-center">
            <p className="font-medium text-slate-500">
              Nenhuma lancha encontrada para este relatorio.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
