import { Anchor, CheckCircle2, Clock3, Users } from "lucide-react";

interface DashboardCardsProps {
  totalOperations: number;
  openOperations: number;
  finishedOperations: number;
  activeOperators: number;
}

export function DashboardCards({
  totalOperations,
  openOperations,
  finishedOperations,
  activeOperators,
}: DashboardCardsProps) {
  const cards = [
    {
      title: "Operacoes no periodo",
      value: totalOperations,
      icon: Anchor,
      bgColor: "bg-[linear-gradient(180deg,#ffffff_0%,#f7fbfe_100%)]",
      iconBg: "bg-[#eaf6fd]",
      borderColor: "border-[#d7ecf8]",
      textColor: "text-slate-900",
    },
    {
      title: "Operacoes abertas",
      value: openOperations,
      icon: Clock3,
      bgColor: "bg-[linear-gradient(180deg,#ffffff_0%,#fffdf4_100%)]",
      iconBg: "bg-[#fff8da]",
      borderColor: "border-[#f2e3a2]",
      textColor: "text-slate-900",
    },
    {
      title: "Operacoes finalizadas",
      value: finishedOperations,
      icon: CheckCircle2,
      bgColor: "bg-[linear-gradient(180deg,#ffffff_0%,#f7fbfe_100%)]",
      iconBg: "bg-[#eaf6fd]",
      borderColor: "border-[#d7ecf8]",
      textColor: "text-slate-900",
    },
    {
      title: "Operadores em acao",
      value: activeOperators,
      icon: Users,
      bgColor: "bg-[linear-gradient(180deg,#ffffff_0%,#fffdf4_100%)]",
      iconBg: "bg-[#fff8da]",
      borderColor: "border-[#f2e3a2]",
      textColor: "text-slate-900",
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={`${card.bgColor} ${card.textColor} rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${card.borderColor}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="mb-2 text-sm font-medium text-slate-500">
                  {card.title}
                </p>
                <p className="text-4xl font-black tracking-tight">{card.value}</p>
              </div>
              <div className={`${card.iconBg} rounded-xl p-3`}>
                <Icon size={28} className="text-[#0a8bce]" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
