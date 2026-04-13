import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { CrewMember } from './CrewTable';

interface CrewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (crew: Partial<CrewMember>) => void;
  crew: CrewMember | null;
}

export function CrewModal({ isOpen, onClose, onSave, crew }: CrewModalProps) {
  const [formData, setFormData] = useState<Partial<CrewMember>>({
    name: '',
    role: '',
    shift: 'Morning',
    checkIn: '',
    checkOut: '',
    status: 'Present',
    area: 'Production',
    notes: '',
  });

  useEffect(() => {
    if (crew) {
      setFormData(crew);
    } else {
      setFormData({
        name: '',
        role: '',
        shift: 'Morning',
        checkIn: '',
        checkOut: '',
        status: 'Present',
        area: 'Production',
        notes: '',
      });
    }
  }, [crew, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-4 border-emerald-500">
        <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 flex items-center justify-between rounded-t-xl">
          <h2 className="text-2xl font-bold">
            {crew ? 'Editar Tripulante' : 'Adicionar Tripulante'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="Ex: João Silva"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Função *
              </label>
              <input
                type="text"
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="Ex: Operador de Máquina"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Turno *
              </label>
              <select
                value={formData.shift}
                onChange={(e) => setFormData({ ...formData, shift: e.target.value as any })}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
              >
                <option value="Morning">Manhã</option>
                <option value="Afternoon">Tarde</option>
                <option value="Night">Noite</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
              >
                <option value="Present">Presente</option>
                <option value="Absent">Ausente</option>
                <option value="Late">Atrasado</option>
                <option value="On Leave">De Folga</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Horário de Entrada
              </label>
              <input
                type="time"
                value={formData.checkIn}
                onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Horário de Saída
              </label>
              <input
                type="time"
                value={formData.checkOut}
                onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Área Designada *
              </label>
              <select
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value as any })}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
              >
                <option value="Production">Produção</option>
                <option value="Logistics">Logística</option>
                <option value="Transport">Transporte</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Observações
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors resize-none"
              rows={3}
              placeholder="Adicione observações relevantes..."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t-2 border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-colors font-bold shadow-lg"
            >
              {crew ? 'Salvar Alterações' : 'Adicionar Tripulante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
