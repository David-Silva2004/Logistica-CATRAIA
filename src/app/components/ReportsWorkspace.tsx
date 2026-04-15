import { useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  FileText,
  ShipWheel,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { OperationRecord, SelectOption } from "../types";
import { cn } from "./ui/utils";
import { DailyOperationsReport } from "./DailyOperationsReport";
import { LanchaUsageReport } from "./LanchaUsageReport";
import { OpenOperationsReport } from "./OpenOperationsReport";
import { OperatorProductivityReport } from "./OperatorProductivityReport";

type ReportSectionId = "daily" | "open" | "operators" | "lanchas";

interface ReportsWorkspaceProps {
  data: OperationRecord[];
  selectedDate: string;
  lanchas: SelectOption[];
  operators: SelectOption[];
}

interface SummaryCard {
  label: string;
  value: string;
  accentClassName: string;
}

interface ReportSectionDefinition {
  id: ReportSectionId;
  title: string;
  description: string;
  icon: LucideIcon;
  badgeLabel: string;
}

const reportSections: ReportSectionDefinition[] = [
  {
    id: "daily",
    title: "Diario",
    description: "Consulta completa do dia com filtros, indicadores e exportacao.",
    icon: FileText,
    badgeLabel: "Completo",
  },
  {
    id: "open",
    title: "Em andamento",
    description: "Foco nas operacoes abertas e no que precisa de atencao agora.",
    icon: Clock3,
    badgeLabel: "Ao vivo",
  },
  {
    id: "operators",
    title: "Operadores",
    description: "Produtividade consolidada por operador para leitura rapida.",
    icon: UserRound,
    badgeLabel: "Equipe",
  },
  {
    id: "lanchas",
    title: "Lanchas",
    description: "Uso da frota, tempo acumulado e ultimos movimentos.",
    icon: ShipWheel,
    badgeLabel: "Frota",
  },
];

function formatSelectedDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function ReportsWorkspace({
  data,
  selectedDate,
  lanchas,
  operators,
}: ReportsWorkspaceProps) {
  const [activeSection, setActiveSection] = useState<ReportSectionId>("daily");

  const summaryCards = useMemo<SummaryCard[]>(() => {
    const openOperations = data.filter((item) => !item.finishedAt).length;
    const activeOperators = new Set(data.map((item) => item.operatorId)).size;
    const activeLanchas = new Set(data.map((item) => item.lanchaId)).size;

    return [
      {
        label: "Operacoes no dia",
        value: String(data.length),
        accentClassName: "from-[#e9f7ff] to-white text-[#0a8bce]",
      },
      {
        label: "Em andamento",
        value: String(openOperations),
        accentClassName: "from-[#fff4dc] to-white text-[#bb9200]",
      },
      {
        label: "Operadores ativos",
        value: String(activeOperators),
        accentClassName: "from-[#ecfbf5] to-white text-[#0f8f67]",
      },
      {
        label: "Lanchas no dia",
        value: String(activeLanchas),
        accentClassName: "from-[#f2f6ff] to-white text-[#3462d8]",
      },
    ];
  }, [data]);

  const activeDefinition =
    reportSections.find((section) => section.id === activeSection) ||
    reportSections[0];

  const renderedReport =
    activeSection === "daily" ? (
      <DailyOperationsReport
        data={data}
        selectedDate={selectedDate}
        lanchas={lanchas}
        operators={operators}
      />
    ) : activeSection === "open" ? (
      <OpenOperationsReport
        data={data}
        selectedDate={selectedDate}
        lanchas={lanchas}
        operators={operators}
      />
    ) : activeSection === "operators" ? (
      <OperatorProductivityReport
        data={data}
        selectedDate={selectedDate}
      />
    ) : (
      <LanchaUsageReport data={data} selectedDate={selectedDate} />
    );

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-[#d7ecf8] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,250,254,0.94),rgba(255,249,228,0.72))] shadow-[0_24px_60px_rgba(6,67,104,0.08)]">
        <div className="px-6 py-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#0a8bce]">
                Central de relatorios
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
                Menos rolagem, mais foco no relatorio certo.
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Escolha um recorte por vez para analisar o dia com mais clareza.
                O consolidado por periodo saiu desta tela por enquanto.
              </p>
            </div>

            <div className="inline-flex items-start gap-3 rounded-2xl border border-[#d8edf8] bg-white/88 px-4 py-3 shadow-[0_14px_32px_rgba(0,147,217,0.08)]">
              <div className="rounded-xl bg-[#eef8fd] p-3">
                <CalendarDays size={18} className="text-[#0a8bce]" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Data em foco
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatSelectedDate(selectedDate)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className={cn(
                  "rounded-2xl border border-white/70 bg-gradient-to-br p-4 shadow-[0_10px_30px_rgba(9,66,102,0.06)]",
                  card.accentClassName,
                )}
              >
                <p className="text-sm font-medium text-slate-600">{card.label}</p>
                <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                  {card.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[#d7ecf8] bg-white p-3 shadow-[0_18px_40px_rgba(6,67,104,0.08)]">
        <div className="flex flex-col gap-2 px-3 pb-3 pt-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
              Recortes disponiveis
            </p>
            <h3 className="text-lg font-black text-slate-900">
              Escolha o relatorio
            </h3>
          </div>
          <p className="text-sm text-slate-600">{activeDefinition.description}</p>
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {reportSections.map((section) => {
            const Icon = section.icon;
            const isActive = section.id === activeSection;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "rounded-[1.5rem] border px-4 py-4 text-left transition-all duration-200",
                  isActive
                    ? "border-[#b7e1f5] bg-[linear-gradient(180deg,rgba(232,246,253,0.95),rgba(255,255,255,1))] shadow-[0_16px_30px_rgba(0,147,217,0.10)]"
                    : "border-transparent bg-slate-50/85 hover:border-[#d7ecf8] hover:bg-white",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      "rounded-2xl p-3",
                      isActive ? "bg-white text-[#0a8bce]" : "bg-white text-slate-500",
                    )}
                  >
                    <Icon size={18} />
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em]",
                      isActive
                        ? "bg-[#dff2fb] text-[#0a8bce]"
                        : "bg-white text-slate-500",
                    )}
                  >
                    {section.badgeLabel}
                  </span>
                </div>

                <h4 className="mt-4 text-base font-black text-slate-900">
                  {section.title}
                </h4>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {section.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {renderedReport}
    </div>
  );
}
