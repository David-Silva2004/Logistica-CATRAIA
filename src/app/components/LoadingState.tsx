import { Loader2 } from "lucide-react";

export function LoadingState() {
  return (
    <div className="rounded-[2rem] border border-black/5 bg-white p-12 text-center shadow-xl">
      <div className="mx-auto max-w-md">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-amber-200 bg-amber-50">
          <Loader2 size={40} className="animate-spin text-amber-700" />
        </div>

        <h3 className="mb-3 text-2xl font-black text-slate-900">
          Carregando dados...
        </h3>

        <p className="text-slate-600">
          Estamos buscando operacoes e cadastros direto do PostgreSQL.
        </p>

        <div className="mt-6 flex justify-center gap-2">
          <div
            className="h-2 w-2 animate-bounce rounded-full bg-amber-500"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="h-2 w-2 animate-bounce rounded-full bg-amber-500"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="h-2 w-2 animate-bounce rounded-full bg-amber-500"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
}
