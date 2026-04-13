import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, X } from "lucide-react";
import type { OperationRecord, SelectOption } from "../types";

interface OperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: OperationFormState) => Promise<void>;
  operation: OperationRecord | null;
  operators: SelectOption[];
  lanchas: SelectOption[];
  statuses: SelectOption[];
  users: SelectOption[];
}

export interface OperationFormState {
  operatorId: number;
  lanchaId: number;
  statusId: number;
  userId: number | null;
  startedAt: string;
  finishedAt: string;
  notes: string;
}

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);

  return localDate.toISOString().slice(0, 16);
}

function nowDateTimeLocal() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);

  return localDate.toISOString().slice(0, 16);
}

function initialState(
  operation: OperationRecord | null,
  operators: SelectOption[],
  lanchas: SelectOption[],
  statuses: SelectOption[],
): OperationFormState {
  if (operation) {
    return {
      operatorId: operation.operatorId,
      lanchaId: operation.lanchaId,
      statusId: operation.statusId,
      userId: operation.userId,
      startedAt: toDateTimeLocal(operation.startedAt),
      finishedAt: toDateTimeLocal(operation.finishedAt),
      notes: operation.notes || "",
    };
  }

  return {
    operatorId: operators[0]?.id ?? 0,
    lanchaId: lanchas[0]?.id ?? 0,
    statusId: statuses[0]?.id ?? 0,
    userId: null,
    startedAt: nowDateTimeLocal(),
    finishedAt: "",
    notes: "",
  };
}

export function OperationModal({
  isOpen,
  onClose,
  onSave,
  operation,
  operators,
  lanchas,
  statuses,
  users,
}: OperationModalProps) {
  const [formData, setFormData] = useState<OperationFormState>(() =>
    initialState(operation, operators, lanchas, statuses),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const hasRequiredOptions =
    operators.length > 0 && lanchas.length > 0 && statuses.length > 0;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormError("");
    setIsSubmitting(false);
    setFormData(initialState(operation, operators, lanchas, statuses));
  }, [isOpen, operation, operators, lanchas, statuses]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!hasRequiredOptions) {
      setFormError("Cadastre operador, lancha e status antes de salvar.");
      return;
    }

    setFormError("");
    setIsSubmitting(true);

    try {
      await onSave(formData);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Nao foi possivel salvar.",
      );
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-black/5 bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between rounded-t-[1.7rem] border-b border-black/5 bg-white/95 p-6 text-slate-900 backdrop-blur">
          <h2 className="text-2xl font-black">
            {operation ? "Editar operacao" : "Nova operacao"}
          </h2>

          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-slate-100"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {!hasRequiredOptions && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200/70 bg-amber-50/45 px-4 py-3 text-amber-900">
              <AlertCircle className="mt-0.5" size={18} />
              <p className="text-sm">
                O modal agora abre normalmente. Para concluir o cadastro da
                operacao, primeiro crie pelo menos um operador e uma lancha no
                painel de cadastros.
              </p>
            </div>
          )}

          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Operador *
              </label>
              <select
                value={formData.operatorId}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    operatorId: Number(event.target.value),
                  }))
                }
                className="w-full cursor-pointer rounded-xl border border-black/8 bg-slate-50 px-4 py-3 transition-colors focus:border-amber-300 focus:outline-none"
              >
                {operators.length === 0 && <option value={0}>Sem operadores</option>}
                {operators.map((operator) => (
                  <option key={operator.id} value={operator.id}>
                    {operator.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Lancha *
              </label>
              <select
                value={formData.lanchaId}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    lanchaId: Number(event.target.value),
                  }))
                }
                className="w-full cursor-pointer rounded-xl border border-black/8 bg-slate-50 px-4 py-3 transition-colors focus:border-amber-300 focus:outline-none"
              >
                {lanchas.length === 0 && <option value={0}>Sem lanchas</option>}
                {lanchas.map((lancha) => (
                  <option key={lancha.id} value={lancha.id}>
                    {lancha.label}
                    {lancha.hint ? ` - ${lancha.hint}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Status *
              </label>
              <select
                value={formData.statusId}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    statusId: Number(event.target.value),
                  }))
                }
                className="w-full cursor-pointer rounded-xl border border-black/8 bg-slate-50 px-4 py-3 transition-colors focus:border-amber-300 focus:outline-none"
              >
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Usuario responsavel
              </label>
              <select
                value={formData.userId ?? ""}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    userId: event.target.value
                      ? Number(event.target.value)
                      : null,
                  }))
                }
                className="w-full cursor-pointer rounded-xl border border-black/8 bg-slate-50 px-4 py-3 transition-colors focus:border-amber-300 focus:outline-none"
              >
                <option value="">Nao informado</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Inicio da operacao *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.startedAt}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    startedAt: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-black/8 bg-slate-50 px-4 py-3 transition-colors focus:border-amber-300 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Fim da operacao
              </label>
              <input
                type="datetime-local"
                value={formData.finishedAt}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    finishedAt: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-black/8 bg-slate-50 px-4 py-3 transition-colors focus:border-amber-300 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Observacao
            </label>
            <textarea
              value={formData.notes}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              className="w-full resize-none rounded-xl border border-black/8 bg-slate-50 px-4 py-3 transition-colors focus:border-amber-300 focus:outline-none"
              rows={4}
              placeholder="Detalhes importantes da operacao..."
            />
          </div>

          <div className="flex gap-3 border-t border-black/5 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-slate-200 px-6 py-3 font-bold text-slate-700 transition-colors hover:bg-slate-300"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl border border-amber-200 bg-amber-100 px-6 py-3 font-bold text-amber-950 transition-colors hover:bg-amber-200 disabled:opacity-70"
            >
              {isSubmitting
                ? "Salvando..."
                : operation
                  ? "Salvar alteracoes"
                  : "Criar operacao"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
