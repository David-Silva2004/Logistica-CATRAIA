import { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, Plus, Download, Edit2 } from 'lucide-react';

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  shift: 'Morning' | 'Afternoon' | 'Night';
  checkIn: string;
  checkOut: string;
  status: 'Present' | 'Absent' | 'Late' | 'On Leave';
  area: 'Production' | 'Logistics' | 'Transport';
  notes: string;
}

interface CrewTableProps {
  data: CrewMember[];
  onEdit: (crew: CrewMember) => void;
  onAdd: () => void;
  onExport: () => void;
}

export function CrewTable({ data, onEdit, onAdd, onExport }: CrewTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter((crew) => {
      const matchesSearch =
        crew.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        crew.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || crew.status === statusFilter;
      const matchesShift = shiftFilter === 'all' || crew.shift === shiftFilter;
      const matchesArea = areaFilter === 'all' || crew.area === areaFilter;

      return matchesSearch && matchesStatus && matchesShift && matchesArea;
    });

    filtered.sort((a, b) => {
      const aValue = a[sortColumn as keyof CrewMember];
      const bValue = b[sortColumn as keyof CrewMember];

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [data, searchTerm, statusFilter, shiftFilter, areaFilter, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      Present: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      Absent: 'bg-red-100 text-red-800 border-red-300',
      Late: 'bg-amber-100 text-amber-800 border-amber-300',
      'On Leave': 'bg-blue-100 text-blue-800 border-blue-300',
    };

    const labels = {
      Present: 'Presente',
      Absent: 'Ausente',
      Late: 'Atrasado',
      'On Leave': 'De Folga',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getShiftBadge = (shift: string) => {
    const labels = {
      Morning: 'Manhã',
      Afternoon: 'Tarde',
      Night: 'Noite',
    };

    return (
      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
        {labels[shift as keyof typeof labels]}
      </span>
    );
  };

  const getAreaBadge = (area: string) => {
    const labels = {
      Production: 'Produção',
      Logistics: 'Logística',
      Transport: 'Transporte',
    };

    return labels[area as keyof typeof labels];
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-200">
      <div className="p-6 border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-900">Controle de Tripulantes</h3>
          <div className="flex gap-3">
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-colors shadow-md font-medium"
            >
              <Download size={18} />
              Exportar CSV
            </button>
            <button
              onClick={onAdd}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-md font-medium"
            >
              <Plus size={18} />
              Adicionar Tripulante
            </button>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border-2 border-slate-200">
            <Filter size={18} className="text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent outline-none text-sm font-medium cursor-pointer"
            >
              <option value="all">Todos Status</option>
              <option value="Present">Presente</option>
              <option value="Absent">Ausente</option>
              <option value="Late">Atrasado</option>
              <option value="On Leave">De Folga</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border-2 border-slate-200">
            <Filter size={18} className="text-slate-500" />
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="bg-transparent outline-none text-sm font-medium cursor-pointer"
            >
              <option value="all">Todos Turnos</option>
              <option value="Morning">Manhã</option>
              <option value="Afternoon">Tarde</option>
              <option value="Night">Noite</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border-2 border-slate-200">
            <Filter size={18} className="text-slate-500" />
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="bg-transparent outline-none text-sm font-medium cursor-pointer"
            >
              <option value="all">Todas Áreas</option>
              <option value="Production">Produção</option>
              <option value="Logistics">Logística</option>
              <option value="Transport">Transporte</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              {[
                { key: 'id', label: 'ID' },
                { key: 'name', label: 'Nome' },
                { key: 'role', label: 'Função' },
                { key: 'shift', label: 'Turno' },
                { key: 'checkIn', label: 'Entrada' },
                { key: 'checkOut', label: 'Saída' },
                { key: 'status', label: 'Status' },
                { key: 'area', label: 'Área' },
                { key: 'notes', label: 'Observações' },
              ].map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-4 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors border-b-2 border-slate-200"
                >
                  <div className="flex items-center gap-2">
                    {col.label}
                    <ArrowUpDown size={14} className="text-slate-400" />
                  </div>
                </th>
              ))}
              <th className="px-4 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-b-2 border-slate-200">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredAndSortedData.map((crew, index) => (
              <tr
                key={crew.id}
                className={`hover:bg-emerald-50/50 transition-colors ${
                  index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                }`}
              >
                <td className="px-4 py-4 text-sm font-mono font-semibold text-slate-900">{crew.id}</td>
                <td className="px-4 py-4 text-sm font-medium text-slate-900">{crew.name}</td>
                <td className="px-4 py-4 text-sm text-slate-600">{crew.role}</td>
                <td className="px-4 py-4 text-sm">{getShiftBadge(crew.shift)}</td>
                <td className="px-4 py-4 text-sm font-mono text-slate-900">{crew.checkIn || '-'}</td>
                <td className="px-4 py-4 text-sm font-mono text-slate-900">{crew.checkOut || '-'}</td>
                <td className="px-4 py-4 text-sm">{getStatusBadge(crew.status)}</td>
                <td className="px-4 py-4 text-sm text-slate-600">{getAreaBadge(crew.area)}</td>
                <td className="px-4 py-4 text-sm text-slate-600 max-w-xs truncate">{crew.notes || '-'}</td>
                <td className="px-4 py-4 text-sm">
                  <button
                    onClick={() => onEdit(crew)}
                    className="p-2 hover:bg-emerald-100 rounded-lg transition-colors text-emerald-700 hover:text-emerald-900"
                  >
                    <Edit2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedData.length === 0 && (
        <div className="p-12 text-center">
          <p className="text-slate-500 font-medium">Nenhum tripulante encontrado com os filtros aplicados.</p>
        </div>
      )}

      <div className="px-6 py-4 bg-slate-50 border-t-2 border-slate-200">
        <p className="text-sm text-slate-600">
          Exibindo <span className="font-semibold text-slate-900">{filteredAndSortedData.length}</span> de{' '}
          <span className="font-semibold text-slate-900">{data.length}</span> tripulantes
        </p>
      </div>
    </div>
  );
}
