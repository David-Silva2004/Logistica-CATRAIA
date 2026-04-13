import { useState, type ComponentType, type FormEvent, type ReactNode } from "react";
import { Anchor, Sailboat, UserCog } from "lucide-react";
import type { SelectOption } from "../types";

interface SetupPanelProps {
  operators: SelectOption[];
  lanchas: SelectOption[];
  types: SelectOption[];
  onRefresh: () => void;
}

interface CreateCardProps {
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  count: number;
  children: ReactNode;
}

function CreateCard({
  icon: Icon,
  title,
  description,
  count,
  children,
}: CreateCardProps) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <Icon size={22} className="text-amber-700" />
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
              <p className="text-sm text-slate-600">{description}</p>
            </div>

            <span className="rounded-full border border-amber-200/80 bg-amber-50/70 px-3 py-1 text-xs font-semibold text-amber-900">
              {count} cadastrados
            </span>
          </div>

          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function SetupPanel({
  operators,
  lanchas,
  types,
  onRefresh,
}: SetupPanelProps) {
  const [operatorName, setOperatorName] = useState("");
  const [typeName, setTypeName] = useState("");
  const [lanchaName, setLanchaName] = useState("");
  const [lanchaTypeId, setLanchaTypeId] = useState<number>(types[0]?.id ?? 0);
  const [feedback, setFeedback] = useState("");

  async function submitJson(url: string, payload: object) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || "Nao foi possivel salvar.");
    }
  }

  async function handleCreateOperator(event: FormEvent) {
    event.preventDefault();

    try {
      await submitJson("/api/operators", { name: operatorName });
      setOperatorName("");
      setFeedback("Operador cadastrado com sucesso.");
      onRefresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro ao cadastrar operador.");
    }
  }

  async function handleCreateType(event: FormEvent) {
    event.preventDefault();

    try {
      await submitJson("/api/types", { name: typeName });
      setTypeName("");
      setFeedback("Tipo cadastrado com sucesso.");
      onRefresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro ao cadastrar tipo.");
    }
  }

  async function handleCreateLancha(event: FormEvent) {
    event.preventDefault();

    try {
      await submitJson("/api/lanchas", {
        name: lanchaName,
        typeId: lanchaTypeId,
      });
      setLanchaName("");
      setFeedback("Lancha cadastrada com sucesso.");
      onRefresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro ao cadastrar lancha.");
    }
  }

  return (
    <section className="rounded-[2rem] border border-black/5 bg-white/92 p-6 shadow-xl">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">
          Base do sistema
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-900">
          Cadastros para destravar as operacoes
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Se o modal de operacao estava travando, o motivo era a falta de dados
          base. Agora voce pode cadastrar aqui o operador, o tipo e a lancha
          sem sair da interface.
        </p>
      </div>

      {feedback && (
        <div className="mb-5 rounded-xl border border-amber-200/70 bg-amber-50/40 px-4 py-3 text-sm text-amber-900">
          {feedback}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <CreateCard
          icon={UserCog}
          title="Operadores"
          description="Tripulantes que iniciam e encerram as operacoes."
          count={operators.length}
        >
          <form onSubmit={handleCreateOperator} className="space-y-3">
            <input
              type="text"
              value={operatorName}
              onChange={(event) => setOperatorName(event.target.value)}
              placeholder="Nome do operador"
              className="w-full rounded-xl border border-black/8 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-amber-300"
            />
            <button
              type="submit"
              className="w-full rounded-xl border border-amber-200 bg-amber-100 px-4 py-3 font-bold text-amber-950 transition-colors hover:bg-amber-200"
            >
              Cadastrar operador
            </button>
          </form>
        </CreateCard>

        <CreateCard
          icon={Anchor}
          title="Tipos de lancha"
          description="Base para classificar as embarcacoes."
          count={types.length}
        >
          <form onSubmit={handleCreateType} className="space-y-3">
            <input
              type="text"
              value={typeName}
              onChange={(event) => setTypeName(event.target.value)}
              placeholder="Ex: Expresso, Catraia, Apoio"
              className="w-full rounded-xl border border-black/8 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-amber-300"
            />
            <button
              type="submit"
              className="w-full rounded-xl border border-amber-200 bg-amber-100 px-4 py-3 font-bold text-amber-950 transition-colors hover:bg-amber-200"
            >
              Cadastrar tipo
            </button>
          </form>
        </CreateCard>

        <CreateCard
          icon={Sailboat}
          title="Lanchas"
          description="Embarcacoes usadas nas operacoes."
          count={lanchas.length}
        >
          <form onSubmit={handleCreateLancha} className="space-y-3">
            <input
              type="text"
              value={lanchaName}
              onChange={(event) => setLanchaName(event.target.value)}
              placeholder="Nome da lancha"
              className="w-full rounded-xl border border-black/8 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-amber-300"
            />
            <select
              value={lanchaTypeId}
              onChange={(event) => setLanchaTypeId(Number(event.target.value))}
              className="w-full rounded-xl border border-black/8 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-amber-300"
            >
              <option value={0}>Selecione o tipo</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={types.length === 0}
              className="w-full rounded-xl border border-amber-200 bg-amber-100 px-4 py-3 font-bold text-amber-950 transition-colors hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cadastrar lancha
            </button>
          </form>
        </CreateCard>
      </div>
    </section>
  );
}
