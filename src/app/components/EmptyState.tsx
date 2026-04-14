import { BrandLogo } from "./BrandLogo";

interface EmptyStateProps {
  onAdd: () => void;
  missingItems: string[];
}

export function EmptyState({ onAdd, missingItems }: EmptyStateProps) {
  const hasMissingItems = missingItems.length > 0;

  return (
    <div className="rounded-[2rem] border border-black/5 bg-white p-12 text-center shadow-xl">
      <div className="mx-auto max-w-md">
        <BrandLogo
          variant="icon"
          className="mx-auto mb-6"
          imageClassName="h-20 w-20 rounded-[1.7rem] shadow-[0_14px_30px_rgba(0,147,217,0.14)]"
        />
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
          className="rounded-xl border border-[#148fca] bg-[#0093d9] px-6 py-3 font-bold text-white transition-colors hover:bg-[#0a86c5]"
        >
          Abrir modal de operacao
        </button>
      </div>
    </div>
  );
}
