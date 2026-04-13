import { Anchor } from "lucide-react";

interface EmptyStateProps {
  onAdd: () => void;
  missingItems: string[];
}

export function EmptyState({ onAdd, missingItems }: EmptyStateProps) {
  const hasMissingItems = missingItems.length > 0;

  return (
    <div className="rounded-[2rem] border border-black/5 bg-white p-12 text-center shadow-xl">
      <div className="mx-auto max-w-md">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-amber-200 bg-amber-50">
          <Anchor size={40} className="text-amber-700" />
        </div>
        <h3 className="mb-3 text-2xl font-black text-slate-900">
          Nenhuma operacao cadastrada
        </h3>
        <p className="mb-6 text-slate-600">
          {hasMissingItems
            ? `O modal agora abre, mas antes de salvar faltam estes cadastros base: ${missingItems.join(", ")}.`
            : "O banco ja esta pronto para voce criar a primeira operacao."}
        </p>
        <button
          onClick={onAdd}
          className="rounded-xl border border-amber-200 bg-amber-100 px-6 py-3 font-bold text-amber-950 transition-colors hover:bg-amber-200"
        >
          Abrir modal de operacao
        </button>
      </div>
    </div>
  );
}
