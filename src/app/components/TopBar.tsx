import {
  Anchor,
  Bell,
  Calendar,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  User,
} from "lucide-react";

interface TopBarProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  activeView: string;
  onViewChange: (view: string) => void;
  currentUserName: string;
  onLogout: () => void;
}

export function TopBar({
  selectedDate,
  onDateChange,
  activeView,
  onViewChange,
  currentUserName,
  onLogout,
}: TopBarProps) {
  const menuItems = [
    { id: "dashboard", label: "Painel", icon: LayoutDashboard },
    { id: "operations", label: "Operacoes", icon: Anchor },
    { id: "reports", label: "Relatorios", icon: FileText },
    { id: "settings", label: "Cadastros", icon: Settings },
  ];

  return (
    <header className="border-b border-black/5 bg-white/90 shadow-sm backdrop-blur">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-8 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50">
                <Anchor size={22} className="text-amber-700" />
              </div>

              <div>
                <h1 className="text-lg font-black text-slate-900">
                  Logistica CATRAIA
                </h1>
                <p className="text-xs text-slate-500 -mt-0.5">
                  Controle de operacoes
                </p>
              </div>
            </div>

            <nav className="flex items-center gap-1 flex-wrap">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                      isActive
                        ? "border border-amber-200 bg-amber-50 text-amber-900"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 rounded-xl border border-black/8 bg-slate-50 px-3 py-2">
              <Calendar size={16} className="text-amber-700" />
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => onDateChange(event.target.value)}
                className="cursor-pointer bg-transparent text-sm font-medium text-slate-900 outline-none"
              />
            </div>

            <button className="relative rounded-xl p-2 transition-colors hover:bg-slate-50">
              <Bell size={18} className="text-slate-600" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>

            <div className="flex items-center gap-2 border-l border-black/8 pl-4">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900">
                  {currentUserName}
                </p>
                <p className="text-xs text-slate-500 -mt-0.5">Acesso local</p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-200 bg-amber-50">
                <User size={18} className="text-amber-700" />
              </div>

              <button
                onClick={onLogout}
                className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-amber-900"
                title="Sair"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
