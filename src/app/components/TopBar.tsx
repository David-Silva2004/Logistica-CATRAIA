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
import { BrandLogo } from "./BrandLogo";

interface TopBarProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  activeView: string;
  onViewChange: (view: string) => void;
  currentUserName: string;
  currentUserRole: "admin" | "normal";
  onLogout: () => void;
}

export function TopBar({
  selectedDate,
  onDateChange,
  activeView,
  onViewChange,
  currentUserName,
  currentUserRole,
  onLogout,
}: TopBarProps) {
  const menuItems = [
    { id: "dashboard", label: "Painel", icon: LayoutDashboard },
    { id: "operations", label: "Operacoes", icon: Anchor },
    { id: "reports", label: "Relatorios", icon: FileText },
    { id: "settings", label: "Cadastros", icon: Settings },
  ];

  return (
    <header className="border-b border-[#d8edf8] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,250,254,0.94))] shadow-[0_12px_32px_rgba(8,70,106,0.05)] backdrop-blur">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-8 flex-wrap">
            <BrandLogo
              variant="name"
              subtitle=""
              titleClassName="text-[2rem]"
            />

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
                        ? "border border-[#b9e3f6] bg-[#e8f6fd] text-[#0a83c2] shadow-[0_10px_24px_rgba(0,147,217,0.10)]"
                        : "text-slate-700 hover:bg-[#f2f9fd] hover:text-[#0a83c2]"
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
            <div className="flex items-center gap-2 rounded-xl border border-[#d9edf8] bg-[#f6fbfe] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <Calendar size={16} className="text-[#0a8bce]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => onDateChange(event.target.value)}
                className="cursor-pointer bg-transparent text-sm font-medium text-slate-900 outline-none"
              />
            </div>

            <button className="relative rounded-xl p-2 transition-colors hover:bg-[#f2f9fd]">
              <Bell size={18} className="text-slate-600" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#f4c600]" />
            </button>

            <div className="flex items-center gap-2 border-l border-[#d8edf8] pl-4">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900">
                  {currentUserName}
                </p>
                <p className="text-xs text-slate-500 -mt-0.5">
                  {currentUserRole === "admin" ? "Administrador" : "Usuario"}
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d7eaf7] bg-[#eff8fd]">
                <User size={18} className="text-[#0a8bce]" />
              </div>

              <button
                onClick={onLogout}
                className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-[#fff8d7] hover:text-[#0a83c2]"
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
