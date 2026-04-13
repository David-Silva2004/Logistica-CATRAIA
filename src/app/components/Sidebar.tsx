import { LayoutDashboard, Users, FileText, Settings } from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'crew', label: 'Controle de Tripulantes', icon: Users },
    { id: 'reports', label: 'Relatórios', icon: FileText },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-gradient-to-b from-emerald-900 to-emerald-950 text-white flex flex-col shadow-2xl">
      <div className="p-6 border-b border-emerald-700/50">
        <h1 className="font-bold text-xl tracking-tight">Sistema DCCS</h1>
        <p className="text-xs text-emerald-300 mt-1">Controle Diário de Tripulantes</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                ${
                  isActive
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
                    : 'text-emerald-100 hover:bg-emerald-800/50 hover:translate-x-1'
                }
              `}
            >
              <Icon size={20} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-emerald-700/50">
        <div className="text-xs text-emerald-400">
          <p>Versão 2.1.0</p>
          <p className="text-emerald-500 mt-0.5">© 2026 DCCS System</p>
        </div>
      </div>
    </aside>
  );
}
