import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Download,
  FileSpreadsheet,
  Filter,
  Printer,
  ShipWheel,
  UserRound,
} from "lucide-react";
import type { AuthSession, OperationRecord } from "../types";

type ConsolidatedPeriod = "day" | "week" | "month";

interface ConsolidatedResponsePayload {
  period: ConsolidatedPeriod;
  startDate: string;
  endDate: string;
  operations: OperationRecord[];
}

interface PeriodConsolidatedReportProps {
  selectedDate: string;
  session: AuthSession;
}

interface TopItem {
  label: string;
  count: number;
}

const PERIOD_OPTIONS: Array<{ value: ConsolidatedPeriod; label: string }> = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

function buildCsvValue(value: string | number | null) {
  if (value === null || value === undefined) {
    return '""';
  }

  const text = String(value).replaceAll('"', '""');
  return `"${text}"`;
}

function formatDateLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Em aberto";
  }

  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatDuration(startedAt: string, finishedAt: string | null, now: number) {
  const startedAtMs = new Date(startedAt).getTime();
  const finishedAtMs = finishedAt ? new Date(finishedAt).getTime() : now;

  if (Number.isNaN(startedAtMs) || Number.isNaN(finishedAtMs)) {
    return "-";
  }

  const totalMinutes = Math.max(Math.floor((finishedAtMs - startedAtMs) / 60_000), 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}min`;
  }

  return `${hours}h ${minutes}min`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function PeriodConsolidatedReport({
  selectedDate,
  session,
}: PeriodConsolidatedReportProps) {
  const [period, setPeriod] = useState<ConsolidatedPeriod>("day");
  const [operations, setOperations] = useState<OperationRecord[]>([]);
  const [rangeStartDate, setRangeStartDate] = useState(selectedDate);
  const [rangeEndDate, setRangeEndDate] = useState(selectedDate);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
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

  useEffect(() => {
    let ignore = false;

    async function loadConsolidatedReport() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(
          `/api/reports/consolidated?date=${selectedDate}&period=${period}`,
          {
            headers: {
              "x-user-id": String(session.id),
            },
          },
        );

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null);
          throw new Error(
            errorPayload?.error || "Nao foi possivel carregar o relatorio consolidado.",
          );
        }

        const payload: ConsolidatedResponsePayload = await response.json();

        if (ignore) {
          return;
        }

        setOperations(payload.operations || []);
        setRangeStartDate(payload.startDate || selectedDate);
        setRangeEndDate(payload.endDate || selectedDate);
      } catch (error) {
        if (!ignore) {
          setOperations([]);
          setRangeStartDate(selectedDate);
          setRangeEndDate(selectedDate);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Nao foi possivel carregar o relatorio consolidado.",
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadConsolidatedReport();

    return () => {
      ignore = true;
    };
  }, [period, selectedDate, session.id]);

  useEffect(() => {
    setStatusFilter("all");
    setLanchaFilter("all");
    setOperatorFilter("all");
  }, [period, selectedDate]);

  const statusOptions = useMemo(() => {
    return Array.from(new Set(operations.map((item) => item.statusName))).sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
  }, [operations]);

  const lanchaOptions = useMemo(() => {
    return Array.from(
      new Map(operations.map((item) => [item.lanchaId, item.lanchaName])).entries(),
    )
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [operations]);

  const operatorOptions = useMemo(() => {
    return Array.from(
      new Map(operations.map((item) => [item.operatorId, item.operatorName])).entries(),
    )
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [operations]);

  const filteredOperations = useMemo(() => {
    return operations.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.statusName === statusFilter;
      const matchesLancha =
        lanchaFilter === "all" || String(item.lanchaId) === lanchaFilter;
      const matchesOperator =
        operatorFilter === "all" || String(item.operatorId) === operatorFilter;

      return matchesStatus && matchesLancha && matchesOperator;
    });
  }, [lanchaFilter, operations, operatorFilter, statusFilter]);

  const topByOperator = useMemo<TopItem[]>(() => {
    const grouped = new Map<string, number>();

    for (const operation of filteredOperations) {
      grouped.set(
        operation.operatorName,
        (grouped.get(operation.operatorName) || 0) + 1,
      );
    }

    return Array.from(grouped.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"))
      .slice(0, 5);
  }, [filteredOperations]);

  const topByLancha = useMemo<TopItem[]>(() => {
    const grouped = new Map<string, number>();

    for (const operation of filteredOperations) {
      grouped.set(
        operation.lanchaName,
        (grouped.get(operation.lanchaName) || 0) + 1,
      );
    }

    return Array.from(grouped.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"))
      .slice(0, 5);
  }, [filteredOperations]);

  const totalsByStatus = useMemo<TopItem[]>(() => {
    const grouped = new Map<string, number>();

    for (const operation of filteredOperations) {
      grouped.set(
        operation.statusName,
        (grouped.get(operation.statusName) || 0) + 1,
      );
    }

    return Array.from(grouped.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"));
  }, [filteredOperations]);

  const reportStats = useMemo(() => {
    const totalMinutes = filteredOperations.reduce((total, operation) => {
      const startedAtMs = new Date(operation.startedAt).getTime();
      const finishedAtMs = operation.finishedAt
        ? new Date(operation.finishedAt).getTime()
        : now;

      if (Number.isNaN(startedAtMs) || Number.isNaN(finishedAtMs)) {
        return total;
      }

      return total + Math.max(finishedAtMs - startedAtMs, 0) / 60_000;
    }, 0);

    return {
      totalOperations: filteredOperations.length,
      totalOpen: filteredOperations.filter((item) => !item.finishedAt).length,
      uniqueOperators: new Set(filteredOperations.map((item) => item.operatorId)).size,
      uniqueLanchas: new Set(filteredOperations.map((item) => item.lanchaId)).size,
      totalHours: (totalMinutes / 60).toFixed(1),
    };
  }, [filteredOperations, now]);

  const dateRangeLabel =
    rangeStartDate === rangeEndDate
      ? formatDateLabel(rangeStartDate)
      : `${formatDateLabel(rangeStartDate)} ate ${formatDateLabel(rangeEndDate)}`;

  const currentPeriodLabel =
    PERIOD_OPTIONS.find((option) => option.value === period)?.label || "Dia";

  const filterSummary = [
    statusFilter === "all" ? "Todos status" : `Status: ${statusFilter}`,
    lanchaFilter === "all"
      ? "Todas lanchas"
      : `Lancha: ${
          lanchaOptions.find((item) => String(item.id) === lanchaFilter)?.label || "-"
        }`,
    operatorFilter === "all"
      ? "Todos operadores"
      : `Operador: ${
          operatorOptions.find((item) => String(item.id) === operatorFilter)?.label || "-"
        }`,
  ].join(" | ");

  const handleExport = () => {
    const headers = [
      "ID",
      "Operador",
      "Lancha",
      "Tipo",
      "Status",
      "Inicio",
      "Fim",
      "Tempo rodando",
      "Marinheiro",
      "Observacao",
    ];

    const csv = [
      headers.join(","),
      ...filteredOperations.map((operation) =>
        [
          operation.id,
          buildCsvValue(operation.operatorName),
          buildCsvValue(operation.lanchaName),
          buildCsvValue(operation.typeName),
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
    link.download = `relatorio-consolidado-${period}-${rangeStartDate}-${rangeEndDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1280,height=800");

    if (!printWindow) {
      window.alert("Nao foi possivel abrir a janela de impressao.");
      return;
    }

    const statusRows = totalsByStatus
      .map(
        (item) =>
          `<tr><td>${escapeHtml(item.label)}</td><td style="text-align:right;">${item.count}</td></tr>`,
      )
      .join("");

    const operatorRows = topByOperator
      .map(
        (item) =>
          `<tr><td>${escapeHtml(item.label)}</td><td style="text-align:right;">${item.count}</td></tr>`,
      )
      .join("");

    const lanchaRows = topByLancha
      .map(
        (item) =>
          `<tr><td>${escapeHtml(item.label)}</td><td style="text-align:right;">${item.count}</td></tr>`,
      )
      .join("");

    const operationRows = filteredOperations
      .map(
        (operation) => `
          <tr>
            <td>OP${String(operation.id).padStart(4, "0")}</td>
            <td>${escapeHtml(operation.operatorName)}</td>
            <td>${escapeHtml(operation.lanchaName)}</td>
            <td>${escapeHtml(operation.statusName)}</td>
            <td>${escapeHtml(formatDateTime(operation.startedAt))}</td>
            <td>${escapeHtml(formatDateTime(operation.finishedAt))}</td>
            <td>${escapeHtml(formatDuration(operation.startedAt, operation.finishedAt, now))}</td>
          </tr>
        `,
      )
      .join("");

    const html = `
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Relatorio consolidado - ${escapeHtml(currentPeriodLabel)}</title>
          <style>
            body {
              font-family: "Segoe UI", Arial, sans-serif;
              margin: 28px;
              color: #0f172a;
            }
            h1 {
              margin: 0 0 6px 0;
              font-size: 24px;
            }
            h2 {
              margin: 20px 0 8px 0;
              font-size: 16px;
            }
            p {
              margin: 2px 0;
              color: #334155;
              font-size: 13px;
            }
            .cards {
              display: grid;
              grid-template-columns: repeat(5, minmax(0, 1fr));
              gap: 12px;
              margin: 16px 0;
            }
            .card {
              border: 1px solid #dbe1ea;
              border-radius: 12px;
              padding: 12px;
            }
            .card-label {
              color: #475569;
              font-size: 12px;
              margin-bottom: 4px;
            }
            .card-value {
              font-size: 21px;
              font-weight: 700;
              color: #0f172a;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            th, td {
              border: 1px solid #dbe1ea;
              padding: 7px 8px;
              text-align: left;
            }
            th {
              background: #f8fafc;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              color: #334155;
            }
            .grid-two {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
            }
            @media print {
              body {
                margin: 12mm;
              }
            }
          </style>
        </head>
        <body>
          <h1>Relatorio consolidado por periodo</h1>
          <p>Periodo: ${escapeHtml(currentPeriodLabel)}</p>
          <p>Recorte: ${escapeHtml(dateRangeLabel)}</p>
          <p>Filtros aplicados: ${escapeHtml(filterSummary)}</p>

          <section class="cards">
            <div class="card"><div class="card-label">Total de operacoes</div><div class="card-value">${reportStats.totalOperations}</div></div>
            <div class="card"><div class="card-label">Operacoes abertas</div><div class="card-value">${reportStats.totalOpen}</div></div>
            <div class="card"><div class="card-label">Total por status</div><div class="card-value">${totalsByStatus.length}</div></div>
            <div class="card"><div class="card-label">Operadores usados</div><div class="card-value">${reportStats.uniqueOperators}</div></div>
            <div class="card"><div class="card-label">Lanchas usadas</div><div class="card-value">${reportStats.uniqueLanchas}</div></div>
          </section>

          <section class="grid-two">
            <div>
              <h2>Total por status</h2>
              <table>
                <thead><tr><th>Status</th><th style="text-align:right;">Total</th></tr></thead>
                <tbody>${statusRows || "<tr><td colspan='2'>Sem dados</td></tr>"}</tbody>
              </table>
            </div>
            <div>
              <h2>Operadores mais usados</h2>
              <table>
                <thead><tr><th>Operador</th><th style="text-align:right;">Operacoes</th></tr></thead>
                <tbody>${operatorRows || "<tr><td colspan='2'>Sem dados</td></tr>"}</tbody>
              </table>
            </div>
          </section>

          <section>
            <h2>Lanchas mais usadas</h2>
            <table>
              <thead><tr><th>Lancha</th><th style="text-align:right;">Operacoes</th></tr></thead>
              <tbody>${lanchaRows || "<tr><td colspan='2'>Sem dados</td></tr>"}</tbody>
            </table>
          </section>

          <section>
            <h2>Operacoes no periodo (filtradas)</h2>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Operador</th>
                  <th>Lancha</th>
                  <th>Status</th>
                  <th>Inicio</th>
                  <th>Fim</th>
                  <th>Tempo rodando</th>
                </tr>
              </thead>
              <tbody>${operationRows || "<tr><td colspan='7'>Sem dados</td></tr>"}</tbody>
            </table>
          </section>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-xl">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-900">
              Relatorio consolidado por periodo
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Visao consolidada em {currentPeriodLabel.toLowerCase()} com totais, status e ranking operacional.
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Recorte: {dateRangeLabel}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {PERIOD_OPTIONS.map((option) => {
              const isActive = option.value === period;
              return (
                <button
                  key={option.value}
                  onClick={() => setPeriod(option.value)}
                  className={`rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                    isActive
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Total de operacoes</p>
            <p className="text-3xl font-black text-slate-900">{reportStats.totalOperations}</p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Abertas no periodo</p>
            <p className="text-3xl font-black text-red-700">{reportStats.totalOpen}</p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Total por status</p>
            <p className="text-3xl font-black text-slate-900">{totalsByStatus.length}</p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Operadores usados</p>
            <p className="text-3xl font-black text-slate-900">{reportStats.uniqueOperators}</p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Lanchas usadas</p>
            <p className="text-3xl font-black text-slate-900">{reportStats.uniqueLanchas}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-black/8 bg-slate-50 px-3 py-2">
            <Filter size={18} className="text-amber-700" />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="cursor-pointer bg-transparent text-sm font-medium outline-none"
            >
              <option value="all">Todos status</option>
              {statusOptions.map((statusName) => (
                <option key={statusName} value={statusName}>
                  {statusName}
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
              {lanchaOptions.map((lancha) => (
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
              {operatorOptions.map((operator) => (
                <option key={operator.id} value={String(operator.id)}>
                  {operator.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExport}
            className="ml-auto flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-800"
          >
            <Download size={18} />
            Exportar CSV filtrado
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            <Printer size={18} />
            Imprimir limpo
          </button>
        </div>

        {isLoading && (
          <div className="mt-4 rounded-xl border border-black/5 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Carregando consolidado de {currentPeriodLabel.toLowerCase()}...
          </div>
        )}

        {!!errorMessage && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[2rem] border border-black/5 bg-white p-5 shadow-xl">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays size={18} className="text-amber-700" />
            <h4 className="text-base font-black text-slate-900">Total por status</h4>
          </div>
          <div className="space-y-2">
            {totalsByStatus.length > 0 ? (
              totalsByStatus.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg border border-black/5 bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-700">{item.label}</span>
                  <span className="font-black text-slate-900">{item.count}</span>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-black/5 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                Sem dados para os filtros atuais.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-black/5 bg-white p-5 shadow-xl">
          <div className="mb-3 flex items-center gap-2">
            <UserRound size={18} className="text-amber-700" />
            <h4 className="text-base font-black text-slate-900">Operadores mais usados</h4>
          </div>
          <div className="space-y-2">
            {topByOperator.length > 0 ? (
              topByOperator.map((item, index) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg border border-black/5 bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-700">
                    {index + 1}. {item.label}
                  </span>
                  <span className="font-black text-slate-900">{item.count}</span>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-black/5 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                Sem dados para os filtros atuais.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-black/5 bg-white p-5 shadow-xl">
          <div className="mb-3 flex items-center gap-2">
            <ShipWheel size={18} className="text-amber-700" />
            <h4 className="text-base font-black text-slate-900">Lanchas mais usadas</h4>
          </div>
          <div className="space-y-2">
            {topByLancha.length > 0 ? (
              topByLancha.map((item, index) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg border border-black/5 bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-700">
                    {index + 1}. {item.label}
                  </span>
                  <span className="font-black text-slate-900">{item.count}</span>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-black/5 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                Sem dados para os filtros atuais.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-black/5 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-amber-700" />
            <h4 className="text-base font-black text-slate-900">
              Operacoes do consolidado ({reportStats.totalOperations})
            </h4>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Horas acumuladas: {reportStats.totalHours}
          </p>
        </div>

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
              {filteredOperations.map((operation, index) => (
                <tr
                  key={operation.id}
                  className={index % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                >
                  <td className="px-4 py-4 text-sm font-mono font-semibold text-slate-900">
                    OP{String(operation.id).padStart(4, "0")}
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-slate-900">
                    {operation.operatorName}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">{operation.lanchaName}</td>
                  <td className="px-4 py-4 text-sm text-slate-700">{operation.statusName}</td>
                  <td className="px-4 py-4 text-sm font-mono text-slate-900">
                    {formatDateTime(operation.startedAt)}
                  </td>
                  <td className="px-4 py-4 text-sm font-mono text-slate-900">
                    {formatDateTime(operation.finishedAt)}
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
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredOperations.length === 0 && (
          <div className="p-12 text-center">
            <p className="font-medium text-slate-500">
              Nenhuma operacao encontrada para este consolidado.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
