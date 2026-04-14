import { useEffect, useMemo, useState } from "react";
import {
  AlarmClockCheck,
  Clock3,
  Download,
  Search,
  ShipWheel,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import type { OperationRecord, SelectOption } from "../types";

interface OpenOperationsReportProps {
  data: OperationRecord[];
  selectedDate: string;
  lanchas: SelectOption[];
  operators: SelectOption[];
}

const EXPECTED_TIME_OPTIONS = [
  { value: 60, label: "1h" },
  { value: 120, label: "2h" },
  { value: 180, label: "3h" },
  { value: 240, label: "4h" },
];

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatDuration(startedAt: string, now: number) {
  const startTime = new Date(startedAt).getTime();

  if (Number.isNaN(startTime)) {
    return "-";
  }

  const elapsedMinutes = Math.max(Math.floor((now - startTime) / 60_000), 0);
  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;

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

export function OpenOperationsReport({
  data,
  selectedDate,
  lanchas,
  operators,
}: OpenOperationsReportProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [lanchaFilter, setLanchaFilter] = useState("all");
  const [operatorFilter, setOperatorFilter] = useState("all");
  const [expectedMinutes, setExpectedMinutes] = useState(120);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const openOperations = useMemo(() => {
    return data
      .filter((item) => !item.finishedAt)
      .filter((item) => {
        const query = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !query ||
          String(item.id).includes(query) ||
          item.operatorName.toLowerCase().includes(query) ||
          item.lanchaName.toLowerCase().includes(query) ||
          item.statusName.toLowerCase().includes(query) ||
          (item.crewMemberName || "").toLowerCase().includes(query);

        const matchesLancha =
          lanchaFilter === "all" || String(item.lanchaId) === lanchaFilter;
        const matchesOperator =
          operatorFilter === "all" || String(item.operatorId) === operatorFilter;

        return matchesSearch && matchesLancha && matchesOperator;
      })
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  }, [data, lanchaFilter, operatorFilter, searchTerm]);

  const enrichedOperations = useMemo(() => {
    return openOperations.map((operation) => {
      const startedAtMs = new Date(operation.startedAt).getTime();
      const elapsedMinutes = Number.isNaN(startedAtMs)
        ? 0
        : Math.max(Math.floor((now - startedAtMs) / 60_000), 0);

      return {
        ...operation,
        elapsedMinutes,
        isOverdue: elapsedMinutes > expectedMinutes,
      };
    });
  }, [expectedMinutes, now, openOperations]);

  const reportStats = useMemo(() => {
    const overdueOperations = enrichedOperations.filter((item) => item.isOverdue);
    const longestOperation = enrichedOperations[0]
      ? [...enrichedOperations].sort((a, b) => b.elapsedMinutes - a.elapsedMinutes)[0]
      : null;

    return {
      totalOpen: enrichedOperations.length,
      overdue: overdueOperations.length,
      withinExpected: enrichedOperations.length - overdueOperations.length,
      longestOperation,
    };
  }, [enrichedOperations]);

  const handleExport = () => {
    const headers = [
      "ID",
      "Operador",
      "Lancha",
      "Status",
      "Inicio",
      "Tempo rodando",
      "Marinheiro",
      "Atrasada",
      "Observacao",
    ];

    const csv = [
      headers.join(","),
      ...enrichedOperations.map((operation) =>
        [
          operation.id,
          buildCsvValue(operation.operatorName),
          buildCsvValue(operation.lanchaName),
          buildCsvValue(operation.statusName),
          buildCsvValue(operation.startedAt),
          buildCsvValue(formatDuration(operation.startedAt, now)),
          buildCsvValue(operation.crewMemberName),
          buildCsvValue(operation.isOverdue ? "Sim" : "Nao"),
          buildCsvValue(operation.notes),
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `operacoes-abertas-${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-xl">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-900">
              Relatorio de operacoes abertas
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Tudo que ainda esta em andamento, com destaque para o que passou do tempo esperado.
            </p>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-800"
          >
            <Download size={18} />
            Exportar abertas
          </button>
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Abertas agora</p>
                <p className="text-3xl font-black text-slate-900">
                  {reportStats.totalOpen}
                </p>
              </div>
              <div className="rounded-xl bg-sky-50 p-3">
                <Clock3 size={22} className="text-sky-700" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Passaram do tempo</p>
                <p className="text-3xl font-black text-red-700">
                  {reportStats.overdue}
                </p>
              </div>
              <div className="rounded-xl bg-red-50 p-3">
                <TriangleAlert size={22} className="text-red-700" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Dentro do esperado</p>
                <p className="text-3xl font-black text-emerald-700">
                  {reportStats.withinExpected}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3">
                <AlarmClockCheck size={22} className="text-emerald-700" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Mais longa</p>
                <p className="text-xl font-black text-slate-900">
                  {reportStats.longestOperation
                    ? formatDuration(reportStats.longestOperation.startedAt, now)
                    : "-"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {reportStats.longestOperation?.lanchaName || "Sem operacoes abertas"}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <Clock3 size={22} className="text-amber-700" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar por operador, lancha, status ou marinheiro..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-black/8 bg-slate-50 py-2 pl-10 pr-4 transition-colors focus:border-amber-300 focus:outline-none"
            />
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

          <div className="flex items-center gap-2 rounded-xl border border-black/8 bg-slate-50 px-3 py-2">
            <AlarmClockCheck size={18} className="text-amber-700" />
            <select
              value={String(expectedMinutes)}
              onChange={(event) => setExpectedMinutes(Number(event.target.value))}
              className="cursor-pointer bg-transparent text-sm font-medium outline-none"
            >
              {EXPECTED_TIME_OPTIONS.map((option) => (
                <option key={option.value} value={String(option.value)}>
                  Tempo esperado: {option.label}
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
                  "Tempo rodando",
                  "Marinheiro",
                  "Situacao",
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
              {enrichedOperations.map((operation, index) => (
                <tr
                  key={operation.id}
                  className={`${
                    operation.isOverdue
                      ? "border-l-[6px] border-red-500 bg-red-50/70"
                      : "border-l-[6px] border-emerald-500 bg-emerald-50/60"
                  } ${index % 2 === 0 ? "" : "opacity-95"}`}
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
                  <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                    {formatDuration(operation.startedAt, now)}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {operation.crewMemberName || "-"}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${
                        operation.isOverdue
                          ? "border-red-300 bg-red-100 text-red-950"
                          : "border-emerald-300 bg-emerald-100 text-emerald-950"
                      }`}
                    >
                      {operation.isOverdue ? "Acima do esperado" : "Dentro do esperado"}
                    </span>
                  </td>
                  <td className="max-w-sm px-4 py-4 text-sm text-slate-600">
                    {operation.notes || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {enrichedOperations.length === 0 && (
          <div className="p-12 text-center">
            <p className="font-medium text-slate-500">
              Nenhuma operacao aberta encontrada para este relatorio.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
