import { Loader2 } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

export function LoadingState() {
  return (
    <div className="rounded-[2rem] border border-black/5 bg-white p-12 text-center shadow-xl">
      <div className="mx-auto max-w-md">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-[#d7ecf8] bg-[linear-gradient(180deg,#ffffff_0%,#f4fafe_100%)] shadow-[0_18px_36px_rgba(0,147,217,0.12)]">
          <div className="relative">
            <BrandLogo
              variant="icon"
              imageClassName="h-16 w-16 rounded-[1.4rem]"
            />
            <Loader2
              size={20}
              className="absolute -right-2 -top-2 animate-spin text-[#0a8bce]"
            />
          </div>
        </div>

        <h3 className="mb-3 text-2xl font-black text-slate-900">
          Carregando dados...
        </h3>

        <p className="text-slate-600">
          Estamos buscando operacoes e cadastros direto do PostgreSQL.
        </p>

        <div className="mt-6 flex justify-center gap-2">
          <div
            className="h-2 w-2 animate-bounce rounded-full bg-[#0093d9]"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="h-2 w-2 animate-bounce rounded-full bg-[#f4c600]"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="h-2 w-2 animate-bounce rounded-full bg-[#0093d9]"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
}
