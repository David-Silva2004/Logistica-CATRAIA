import { useEffect, useState } from "react";
import { DashboardCards } from "./components/DashboardCards";
import { DailyOperationsReport } from "./components/DailyOperationsReport";
import { DesktopWindowBar } from "./components/DesktopWindowBar";
import { EmptyState } from "./components/EmptyState";
import { ErrorState } from "./components/ErrorState";
import { LanchaUsageReport } from "./components/LanchaUsageReport";
import { LoadingState } from "./components/LoadingState";
import { LoginScreen } from "./components/LoginScreen";
import { OpenOperationsReport } from "./components/OpenOperationsReport";
import { OperatorProductivityReport } from "./components/OperatorProductivityReport";
import { PeriodConsolidatedReport } from "./components/PeriodConsolidatedReport";
import {
  OperationModal,
  type OperationModalMode,
  type OperationFormState,
} from "./components/OperationModal";
import { OperationTable } from "./components/OperationTable";
import { SetupPanel } from "./components/SetupPanel";
import { TopBar } from "./components/TopBar";
import type {
  AuthSession,
  BootstrapPayload,
  OperationRecord,
  SelectOption,
} from "./types";

interface AppOptionsState {
  operators: SelectOption[];
  lanchas: SelectOption[];
  statuses: SelectOption[];
  users: SelectOption[];
  types: SelectOption[];
}

interface OperationFiltersState {
  searchTerm: string;
  statusFilter: string;
  lanchaFilter: string;
  operatorFilter: string;
}

const PERSISTENT_SESSION_STORAGE_KEY = "logistica-catraia.local-session";
const TEMPORARY_SESSION_STORAGE_KEY = "logistica-catraia.temp-session";

const emptyOptions: AppOptionsState = {
  operators: [],
  lanchas: [],
  statuses: [],
  users: [],
  types: [],
};

const initialOperationFilters: OperationFiltersState = {
  searchTerm: "",
  statusFilter: "all",
  lanchaFilter: "all",
  operatorFilter: "all",
};

const AUTO_REFRESH_INTERVAL_MS = 15_000;

function getTodayLocalDate() {
  const currentDate = new Date();
  const timezoneOffset = currentDate.getTimezoneOffset();
  const localDate = new Date(currentDate.getTime() - timezoneOffset * 60_000);

  return localDate.toISOString().split("T")[0];
}

function buildCsvValue(value: string | number | null) {
  if (value === null || value === undefined) {
    return '""';
  }

  const text = String(value).replaceAll('"', '""');
  return `"${text}"`;
}

function readStoredSession() {
  try {
    const persistentValue = window.localStorage.getItem(
      PERSISTENT_SESSION_STORAGE_KEY,
    );
    const temporaryValue = window.sessionStorage.getItem(
      TEMPORARY_SESSION_STORAGE_KEY,
    );
    const rawValue = persistentValue || temporaryValue;

    if (!rawValue) {
      return null;
    }

    const parsedSession = JSON.parse(rawValue) as Partial<AuthSession>;

    if (
      typeof parsedSession.id !== "number" ||
      typeof parsedSession.name !== "string" ||
      typeof parsedSession.login !== "string"
    ) {
      return null;
    }

    return {
      id: parsedSession.id,
      name: parsedSession.name,
      login: parsedSession.login,
      email:
        typeof parsedSession.email === "string" ? parsedSession.email : null,
      role: parsedSession.role === "normal" ? "normal" : "admin",
    };
  } catch {
    return null;
  }
}

function buildSessionHeaders(session: AuthSession, headers?: HeadersInit) {
  return {
    ...(headers || {}),
    "x-user-id": String(session.id),
  };
}

export default function App() {
  const [activeView, setActiveView] = useState("operations");
  const [selectedDate, setSelectedDate] = useState(() => getTodayLocalDate());
  const [session, setSession] = useState<AuthSession | null>(() =>
    typeof window === "undefined" ? null : readStoredSession(),
  );
  const [operations, setOperations] = useState<OperationRecord[]>([]);
  const [options, setOptions] = useState<AppOptionsState>(emptyOptions);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [operationFilters, setOperationFilters] = useState<OperationFiltersState>(
    initialOperationFilters,
  );
  const [operationModalMode, setOperationModalMode] =
    useState<OperationModalMode>("create");
  const [editingOperation, setEditingOperation] = useState<OperationRecord | null>(
    null,
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    let ignore = false;

    async function loadData({ silent = false } = {}) {
      if (silent && isModalOpen) {
        return;
      }

      const shouldShowBlockingLoading = !silent && !hasLoadedOnce;

      if (shouldShowBlockingLoading) {
        setIsLoading(true);
      }

      if (!silent) {
        setHasError(false);
        setErrorMessage("");
      }

      try {
        const response = await fetch(`/api/bootstrap?date=${selectedDate}`, {
          headers: buildSessionHeaders(session),
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null);
          throw new Error(
            errorPayload?.error || "Falha ao carregar a API.",
          );
        }

        const payload: BootstrapPayload = await response.json();

        if (!ignore) {
          setOperations(payload.operations);
          setOptions(payload.options);
          setHasLoadedOnce(true);
          setHasError(false);
          setErrorMessage("");
        }
      } catch (error) {
        if (!ignore) {
          const nextErrorMessage =
            error instanceof Error
              ? error.message
              : "Nao foi possivel carregar os dados do sistema.";

          if (
            nextErrorMessage.includes("Sessao invalida") ||
            nextErrorMessage.includes("Entre novamente")
          ) {
            setSession(null);
            window.localStorage.removeItem(PERSISTENT_SESSION_STORAGE_KEY);
            window.sessionStorage.removeItem(TEMPORARY_SESSION_STORAGE_KEY);
            return;
          }

          if (!silent || !hasLoadedOnce) {
            setHasError(true);
            setErrorMessage(nextErrorMessage);
          }
        }
      } finally {
        if (!ignore && shouldShowBlockingLoading) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    const intervalId = window.setInterval(() => {
      void loadData({ silent: true });
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, [hasLoadedOnce, isModalOpen, reloadToken, selectedDate, session]);

  const handleRefresh = () => {
    setReloadToken((current) => current + 1);
  };

  const handleLogin = (
    nextSession: AuthSession,
    options?: { rememberUser?: boolean },
  ) => {
    const shouldRememberUser = options?.rememberUser ?? true;

    setSession(nextSession);
    window.localStorage.removeItem(PERSISTENT_SESSION_STORAGE_KEY);
    window.sessionStorage.removeItem(TEMPORARY_SESSION_STORAGE_KEY);

    const storage = shouldRememberUser
      ? window.localStorage
      : window.sessionStorage;
    const storageKey = shouldRememberUser
      ? PERSISTENT_SESSION_STORAGE_KEY
      : TEMPORARY_SESSION_STORAGE_KEY;

    storage.setItem(storageKey, JSON.stringify(nextSession));
  };

  const handleLogout = () => {
    setSession(null);
    window.localStorage.removeItem(PERSISTENT_SESSION_STORAGE_KEY);
    window.sessionStorage.removeItem(TEMPORARY_SESSION_STORAGE_KEY);
  };

  const missingItems = [
    options.operators.length === 0 ? "operadores" : null,
    options.lanchas.length === 0 ? "lanchas" : null,
    options.statuses.length === 0 ? "status" : null,
  ].filter(Boolean) as string[];

  const handleAddOperation = () => {
    setOperationModalMode("create");
    setEditingOperation(null);
    setIsModalOpen(true);
  };

  const handleEditOperation = (operation: OperationRecord) => {
    setOperationModalMode("edit");
    setEditingOperation(operation);
    setIsModalOpen(true);
  };

  const handleCloseOperation = (operation: OperationRecord) => {
    setOperationModalMode("close");
    setEditingOperation(operation);
    setIsModalOpen(true);
  };

  const handleDeleteOperation = async (operation: OperationRecord) => {
    try {
      if (session.role !== "admin") {
        throw new Error("Somente administradores podem excluir operacoes.");
      }

      const confirmed = window.confirm(
        `Excluir a operacao OP${String(operation.id).padStart(4, "0")} da lancha ${operation.lanchaName}?`,
      );

      if (!confirmed) {
        return;
      }

      const response = await fetch(`/api/operations/${operation.id}`, {
        method: "DELETE",
        headers: buildSessionHeaders(session),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(
          errorPayload?.error || "Nao foi possivel excluir a operacao.",
        );
      }

      handleRefresh();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Nao foi possivel excluir a operacao.",
      );
    }
  };

  const handleSaveOperation = async (formData: OperationFormState) => {
    const payload = {
      operatorId: formData.operatorId,
      lanchaId: formData.lanchaId,
      statusId: formData.statusId,
      userId: session.id,
      crewMemberName: formData.crewMemberName || null,
      startedAt: formData.startedAt,
      finishedAt: formData.finishedAt || null,
      notes: formData.notes,
    };

    const response = await fetch(
      editingOperation
        ? `/api/operations/${editingOperation.id}`
        : "/api/operations",
      {
        method: editingOperation ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildSessionHeaders(session),
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      throw new Error(errorPayload?.error || "Nao foi possivel salvar a operacao.");
    }

    setIsModalOpen(false);
    setOperationModalMode("create");
    setEditingOperation(null);
    handleRefresh();
  };

  const handleExport = () => {
    const headers = [
      "ID",
      "Operador",
      "Lancha",
      "Tipo",
      "Status",
      "Marinheiro",
      "Inicio",
      "Fim",
      "Observacao",
    ];

    const csv = [
      headers.join(","),
      ...operations.map((operation) =>
        [
          operation.id,
          buildCsvValue(operation.operatorName),
          buildCsvValue(operation.lanchaName),
          buildCsvValue(operation.typeName),
          buildCsvValue(operation.statusName),
          buildCsvValue(operation.crewMemberName),
          buildCsvValue(operation.startedAt),
          buildCsvValue(operation.finishedAt),
          buildCsvValue(operation.notes),
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `operacoes-${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const stats = {
    totalOperations: operations.length,
    openOperations: operations.filter((item) => !item.finishedAt).length,
    finishedOperations: operations.filter((item) => item.finishedAt).length,
    activeOperators: new Set(operations.map((item) => item.operatorId)).size,
  };

  const setupSection = (
    <SetupPanel
      operators={options.operators}
      users={options.users}
      session={session}
      onRefresh={handleRefresh}
    />
  );

  const renderMainContent = () => {
    if (isLoading) {
      return <LoadingState />;
    }

    if (hasError) {
      return <ErrorState onRetry={handleRefresh} message={errorMessage} />;
    }

    if (activeView === "dashboard") {
      return (
        <div className="space-y-6">
          <DashboardCards {...stats} />
          <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-xl">
            <h3 className="mb-2 text-xl font-black text-slate-900">
              Resumo do banco conectado
            </h3>
            <p className="mb-4 text-slate-600">
              A interface agora esta lendo dados reais da API local ligada ao
              PostgreSQL e com visual adaptado para a identidade da empresa.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-black/5 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Operadores cadastrados</p>
                <p className="text-2xl font-black text-slate-900">
                  {options.operators.length}
                </p>
              </div>
              <div className="rounded-xl border border-black/5 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Lanchas cadastradas</p>
                <p className="text-2xl font-black text-slate-900">
                  {options.lanchas.length}
                </p>
              </div>
              <div className="rounded-xl border border-black/5 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Tipos cadastrados</p>
                <p className="text-2xl font-black text-slate-900">
                  {options.types.length}
                </p>
              </div>
              <div className="rounded-xl border border-black/5 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Status disponiveis</p>
                <p className="text-2xl font-black text-slate-900">
                  {options.statuses.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeView === "reports") {
      return (
        <div className="space-y-6">
          <PeriodConsolidatedReport
            selectedDate={selectedDate}
            session={session}
          />
          <DailyOperationsReport
            data={operations}
            selectedDate={selectedDate}
            lanchas={options.lanchas}
            operators={options.operators}
          />
          <OpenOperationsReport
            data={operations}
            selectedDate={selectedDate}
            lanchas={options.lanchas}
            operators={options.operators}
          />
          <OperatorProductivityReport
            data={operations}
            selectedDate={selectedDate}
          />
          <LanchaUsageReport
            data={operations}
            selectedDate={selectedDate}
          />
        </div>
      );
    }

    if (activeView === "settings") {
      return (
        <div className="space-y-6">
          {setupSection}
          <div className="rounded-[2rem] border border-black/5 bg-white p-8 text-center shadow-xl">
            <h3 className="mb-2 text-xl font-black text-slate-900">
              Login e conexao
            </h3>
            <p className="text-slate-600">
              O login agora usa usuarios reais do PostgreSQL, com sessao local
              no desktop e configuracao centralizada em{" "}
              <code>server/database/postgres.js</code>.
            </p>
          </div>
        </div>
      );
    }

    if (operations.length === 0) {
      return (
        <div className="space-y-6">
          <EmptyState onAdd={handleAddOperation} missingItems={missingItems} />
          {setupSection}
        </div>
      );
    }

    return (
      <OperationTable
        data={operations}
        lanchas={options.lanchas}
        operators={options.operators}
        canDelete={session.role === "admin"}
        searchTerm={operationFilters.searchTerm}
        statusFilter={operationFilters.statusFilter}
        lanchaFilter={operationFilters.lanchaFilter}
        operatorFilter={operationFilters.operatorFilter}
        onAdd={handleAddOperation}
        onCloseOperation={handleCloseOperation}
        onEdit={handleEditOperation}
        onDelete={handleDeleteOperation}
        onExport={handleExport}
        onSearchTermChange={(searchTerm) =>
          setOperationFilters((current) => ({
            ...current,
            searchTerm,
          }))
        }
        onStatusFilterChange={(statusFilter) =>
          setOperationFilters((current) => ({
            ...current,
            statusFilter,
          }))
        }
        onLanchaFilterChange={(lanchaFilter) =>
          setOperationFilters((current) => ({
            ...current,
            lanchaFilter,
          }))
        }
        onOperatorFilterChange={(operatorFilter) =>
          setOperationFilters((current) => ({
            ...current,
            operatorFilter,
          }))
        }
      />
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#fbfaf7] via-[#f6f4ef] to-[#fcfbf8]">
      <DesktopWindowBar />

      {!session ? (
        <main className="flex-1">
          <LoginScreen onLogin={handleLogin} />
        </main>
      ) : (
        <>
          <TopBar
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            activeView={activeView}
            onViewChange={setActiveView}
            currentUserName={session.name}
            currentUserRole={session.role}
            onLogout={handleLogout}
          />

          <main className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-[1600px]">{renderMainContent()}</div>
          </main>

          <OperationModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setOperationModalMode("create");
              setEditingOperation(null);
            }}
            onSave={handleSaveOperation}
            mode={operationModalMode}
            operation={editingOperation}
            operations={operations}
            operators={options.operators}
            lanchas={options.lanchas}
            statuses={options.statuses}
          />
        </>
      )}
    </div>
  );
}
