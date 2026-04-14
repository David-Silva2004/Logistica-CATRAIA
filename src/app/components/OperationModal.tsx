import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, ChevronDown, Search, X } from "lucide-react";
import type { OperationRecord, SelectOption } from "../types";

export type OperationModalMode = "create" | "edit" | "close";

interface OperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: OperationFormState) => Promise<void>;
  mode: OperationModalMode;
  operation: OperationRecord | null;
  operations: OperationRecord[];
  operators: SelectOption[];
  lanchas: SelectOption[];
  statuses: SelectOption[];
}

export interface OperationFormState {
  operatorId: number;
  lanchaId: number;
  statusId: number;
  userId: number | null;
  crewMemberName: string;
  startedAt: string;
  finishedAt: string;
  notes: string;
}

interface SearchableSelectProps {
  value: number;
  options: SelectOption[];
  placeholder: string;
  emptyLabel: string;
  onChange: (value: number) => void;
  getOptionText?: (option: SelectOption) => string;
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

function normalizeLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function findStatusByName(statuses: SelectOption[], targetLabel: string) {
  const normalizedTarget = normalizeLabel(targetLabel);
  return (
    statuses.find((status) => normalizeLabel(status.label) === normalizedTarget) ||
    null
  );
}

function getStatusButtonClasses(label: string, isSelected: boolean) {
  const normalizedLabel = normalizeLabel(label);

  if (normalizedLabel.includes("barra") || normalizedLabel.includes("viagem") || normalizedLabel.includes("passeio")) {
    return isSelected
      ? "border-red-500 bg-red-100 text-red-950 shadow-sm"
      : "border-red-200 bg-white text-red-900 hover:bg-red-50";
  }

  if (normalizedLabel.includes("almoco") || normalizedLabel.includes("abaste")) {
    return isSelected
      ? "border-sky-500 bg-sky-100 text-sky-950 shadow-sm"
      : "border-sky-200 bg-white text-sky-900 hover:bg-sky-50";
  }

  if (normalizedLabel.includes("livre")) {
    return isSelected
      ? "border-emerald-500 bg-emerald-100 text-emerald-950 shadow-sm"
      : "border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50";
  }

  return isSelected
    ? "border-slate-500 bg-slate-100 text-slate-950 shadow-sm"
    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
}

function initialState(
  mode: OperationModalMode,
  operation: OperationRecord | null,
  statuses: SelectOption[],
): OperationFormState {
  if (operation) {
    return {
      operatorId: operation.operatorId,
      lanchaId: operation.lanchaId,
      statusId: operation.statusId,
      userId: operation.userId,
      crewMemberName: operation.crewMemberName || "",
      startedAt: toDateTimeLocal(operation.startedAt),
      finishedAt:
        mode === "close"
          ? nowDateTimeLocal()
          : toDateTimeLocal(operation.finishedAt),
      notes: operation.notes || "",
    };
  }

  return {
    operatorId: 0,
    lanchaId: 0,
    statusId: mode === "create" ? 0 : statuses[0]?.id ?? 0,
    userId: null,
    crewMemberName: "",
    startedAt: nowDateTimeLocal(),
    finishedAt: "",
    notes: "",
  };
}

function SearchableSelect({
  value,
  options,
  placeholder,
  emptyLabel,
  onChange,
  getOptionText = (option) => option.label,
}: SearchableSelectProps) {
  const selectedOption = options.find((option) => option.id === value) || null;
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(selectedOption ? getOptionText(selectedOption) : "");
    }
  }, [getOptionText, isOpen, selectedOption]);

  const filteredOptions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return options;
    }

    return options.filter((option) =>
      getOptionText(option).toLowerCase().includes(query),
    );
  }, [getOptionText, options, searchTerm]);

  return (
    <div className="relative">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        size={16}
      />
      <input
        type="text"
        value={searchTerm}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          setSearchTerm(event.target.value);
          setIsOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setIsOpen(false);
            setSearchTerm(selectedOption ? getOptionText(selectedOption) : "");
          }, 120);
        }}
        placeholder={placeholder}
        className="w-full rounded-xl border border-black/8 bg-slate-50 py-3 pl-10 pr-10 text-slate-900 transition-colors focus:border-amber-300 focus:outline-none"
      />
      <ChevronDown
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        size={16}
      />

      {isOpen && (
        <div className="absolute z-20 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-black/8 bg-white p-2 shadow-xl">
          {filteredOptions.length === 0 && (
            <div className="rounded-lg px-3 py-2 text-sm text-slate-500">
              {emptyLabel}
            </div>
          )}

          {filteredOptions.map((option) => {
            const optionText = getOptionText(option);
            const isSelected = option.id === value;

            return (
              <button
                key={option.id}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChange(option.id);
                  setSearchTerm(optionText);
                  setIsOpen(false);
                }}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? "bg-amber-100 font-semibold text-amber-950"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {optionText}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function OperationModal({
  isOpen,
  onClose,
  onSave,
  mode,
  operation,
  operations,
  operators,
  lanchas,
  statuses,
}: OperationModalProps) {
  const [formData, setFormData] = useState<OperationFormState>(() =>
    initialState(mode, operation, statuses),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const closingStatus = useMemo(() => findStatusByName(statuses, "Livre"), [statuses]);

  const activeLanchaIds = useMemo(
    () =>
      new Set(
        operations
          .filter((item) => !item.finishedAt && item.id !== operation?.id)
          .map((item) => item.lanchaId),
      ),
    [operation?.id, operations],
  );

  const availableLanchas = useMemo(() => {
    if (mode !== "create") {
      return lanchas;
    }

    return lanchas.filter((lancha) => !activeLanchaIds.has(lancha.id));
  }, [activeLanchaIds, lanchas, mode]);

  const hasRequiredOptions =
    operators.length > 0 && availableLanchas.length > 0 && statuses.length > 0;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormError("");
    setIsSubmitting(false);
    setFormData(initialState(mode, operation, statuses));
  }, [isOpen, mode, operation?.id, statuses]);

  const getLanchaText = (lancha: SelectOption) =>
    lancha.hint ? `${lancha.label} - ${lancha.hint}` : lancha.label;
  const shouldLockStatusUntilLancha = mode !== "close" && formData.lanchaId === 0;
  const selectableStatuses = useMemo(() => {
    if (mode === "close") {
      return closingStatus ? [closingStatus] : statuses;
    }

    if (shouldLockStatusUntilLancha) {
      return [];
    }

    if (mode === "create") {
      return statuses.filter((status) => normalizeLabel(status.label) !== "livre");
    }

    if (!formData.finishedAt.trim()) {
      return statuses.filter((status) => normalizeLabel(status.label) !== "livre");
    }

    return statuses;
  }, [
    closingStatus,
    formData.finishedAt,
    mode,
    shouldLockStatusUntilLancha,
    statuses,
  ]);
  const selectedStatus = statuses.find((status) => status.id === formData.statusId);
  const selectedLancha = lanchas.find((lancha) => lancha.id === formData.lanchaId);
  const selectedOperator = operators.find(
    (operatorOption) => operatorOption.id === formData.operatorId,
  );
  const normalizedSelectedStatus = selectedStatus
    ? normalizeLabel(selectedStatus.label)
    : "";
  const normalizedSelectedLanchaType = selectedLancha?.hint
    ? normalizeLabel(selectedLancha.hint)
    : "";
  const requiresCrewMember =
    mode !== "close" &&
    (normalizedSelectedStatus.includes("barra") ||
      (normalizedSelectedStatus.includes("passeio") &&
        normalizedSelectedLanchaType.includes("catamara")));
  const operationTimeLabel = new Date().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
  const modalTitle =
    mode === "create"
      ? "Iniciar operacao"
      : mode === "close"
        ? "Encerrar operacao"
        : "Editar operacao";
  const submitLabel =
    mode === "create"
      ? "Iniciar operacao"
      : mode === "close"
      ? "Encerrar operacao"
      : "Salvar alteracoes";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (mode === "close" && closingStatus && formData.statusId !== closingStatus.id) {
      setFormData((current) => ({
        ...current,
        statusId: closingStatus.id,
      }));
      return;
    }

    if (
      selectableStatuses.length > 0 &&
      !selectableStatuses.some((status) => status.id === formData.statusId)
    ) {
      setFormData((current) => ({
        ...current,
        statusId: selectableStatuses[0].id,
      }));
      return;
    }

    if (selectableStatuses.length === 0 && formData.statusId !== 0) {
      setFormData((current) => ({
        ...current,
        statusId: 0,
      }));
    }
  }, [
    closingStatus,
    formData.statusId,
    isOpen,
    mode,
    selectableStatuses,
  ]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const payload: OperationFormState = {
      ...formData,
      startedAt:
        mode === "create"
          ? formData.startedAt || nowDateTimeLocal()
          : formData.startedAt || nowDateTimeLocal(),
      finishedAt:
        mode === "close"
          ? formData.finishedAt || nowDateTimeLocal()
          : mode === "create"
            ? ""
            : formData.finishedAt,
      statusId:
        mode === "close" && closingStatus
          ? closingStatus.id
          : formData.statusId,
      crewMemberName:
        mode === "close"
          ? formData.crewMemberName
          : requiresCrewMember
            ? formData.crewMemberName
            : "",
    };

    if (!payload.operatorId || !payload.lanchaId || !payload.statusId) {
      setFormError("Selecione operador, lancha e status para continuar.");
      return;
    }

    if (requiresCrewMember && !payload.crewMemberName.trim()) {
      setFormError(
        "Informe o marinheiro acompanhante para operacoes de Barra e Passeio com lancha grande.",
      );
      return;
    }

    if (!hasRequiredOptions) {
      setFormError("Cadastre operador, lancha e status antes de salvar.");
      return;
    }

    if (
      payload.finishedAt &&
      new Date(payload.finishedAt).getTime() <=
        new Date(payload.startedAt).getTime()
    ) {
      setFormError("O fim da operacao precisa ser maior que o inicio.");
      return;
    }

    setFormError("");
    setIsSubmitting(true);

    try {
      await onSave(payload);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Nao foi possivel salvar.",
      );
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!requiresCrewMember && formData.crewMemberName) {
      setFormData((current) => ({
        ...current,
        crewMemberName: "",
      }));
    }
  }, [formData.crewMemberName, requiresCrewMember]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-black/5 bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between rounded-t-[1.7rem] border-b border-black/5 bg-white/95 p-6 text-slate-900 backdrop-blur">
          <h2 className="text-2xl font-black">{modalTitle}</h2>

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
                Para concluir o lancamento, primeiro crie pelo menos um
                operador e deixe uma lancha livre para uso.
              </p>
            </div>
          )}

          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          {mode === "create" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
              Fluxo rapido: selecione operador, lancha livre e status. O horario
              ja vem preenchido com agora, mas voce pode ajustar se estiver lancando depois.
            </div>
          )}

          {mode === "close" && operation && (
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-amber-200/70 bg-amber-50/50 px-4 py-4 text-sm text-slate-700 md:grid-cols-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-700">
                  Operador
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selectedOperator?.label || operation.operatorName}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-700">
                  Lancha
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selectedLancha ? getLanchaText(selectedLancha) : operation.lanchaName}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-700">
                  Status atual
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selectedStatus?.label || operation.statusName}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-700">
                  Encerramento
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  Horario sugerido: {operationTimeLabel}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {mode !== "close" && (
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Operador *
                </label>
                <SearchableSelect
                  value={formData.operatorId}
                  onChange={(operatorId) =>
                    setFormData((current) => ({
                      ...current,
                      operatorId,
                    }))
                  }
                  options={operators}
                  placeholder="Buscar operador..."
                  emptyLabel="Nenhum operador encontrado."
                />
              </div>
            )}

            {mode !== "close" && (
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Marinheiro acompanhante
                </label>
                {requiresCrewMember ? (
                  <>
                    <input
                      type="text"
                      value={formData.crewMemberName}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          crewMemberName: event.target.value,
                        }))
                      }
                      placeholder="Nome do marinheiro responsavel pelo acompanhamento"
                      className="w-full rounded-xl border border-black/8 bg-slate-50 px-4 py-3 transition-colors focus:border-amber-300 focus:outline-none"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Obrigatorio para Barra e para Passeio com lancha grande.
                    </p>
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    Este campo so e habilitado em Barra e em Passeio com lancha grande.
                  </div>
                )}
              </div>
            )}

            {mode !== "close" && (
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Lancha *
                </label>
                <SearchableSelect
                  value={formData.lanchaId}
                  onChange={(lanchaId) =>
                    setFormData((current) => ({
                      ...current,
                      lanchaId,
                    }))
                  }
                  options={availableLanchas}
                  placeholder="Buscar lancha livre..."
                  emptyLabel="Nenhuma lancha livre encontrada."
                  getOptionText={getLanchaText}
                />
              </div>
            )}

            {mode !== "close" && (
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Status *
                </label>
                {shouldLockStatusUntilLancha ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    Escolha a lancha primeiro para liberar os status possiveis.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {selectableStatuses.map((status) => (
                        <button
                          key={status.id}
                          type="button"
                          onClick={() =>
                            setFormData((current) => ({
                              ...current,
                              statusId: status.id,
                            }))
                          }
                          className={`rounded-xl border px-4 py-3 text-sm font-bold transition-colors ${getStatusButtonClasses(
                            status.label,
                            formData.statusId === status.id,
                          )}`}
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {mode === "edit" && formData.finishedAt.trim()
                        ? "Com encerramento informado, o status Livre tambem fica disponivel."
                        : "O status Livre so aparece quando a operacao estiver sendo encerrada."}
                    </p>
                  </>
                )}
              </div>
            )}

            {(mode === "edit" || mode === "create") && (
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Inicio da operacao
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
            )}

            {mode === "edit" && (
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
            )}

            {mode === "close" && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Fim da operacao
                  </label>
                  <input
                    type="datetime-local"
                    required
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

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
                    Status final
                  </p>
                  <p className="mt-1 font-semibold">
                    {closingStatus?.label || "Livre"}
                  </p>
                  <p className="mt-1 text-xs text-emerald-700/80">
                    O horario ja vem com agora, mas pode ser ajustado antes de dar baixa.
                  </p>
                </div>
              </>
            )}
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
              {isSubmitting ? "Salvando..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
