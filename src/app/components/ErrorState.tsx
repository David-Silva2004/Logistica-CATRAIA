import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  onRetry: () => void;
}

export function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div className="bg-white rounded-2xl shadow-xl border-2 border-red-200 p-12 text-center">
      <div className="max-w-md mx-auto">
        <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={40} className="text-red-600" />
        </div>

        <h3 className="text-2xl font-bold text-slate-900 mb-3">
          Erro ao carregar dados
        </h3>

        <p className="text-slate-600 mb-6">
          Nao foi possivel carregar as informacoes do banco. Verifique a API e
          a conexao com o PostgreSQL.
        </p>

        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 transition-all font-bold shadow-lg hover:scale-105"
        >
          <RefreshCw size={18} />
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
