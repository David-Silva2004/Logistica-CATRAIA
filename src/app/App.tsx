import { useEffect, useState } from "react";
import { DashboardCards } from "./components/DashboardCards";
import { EmptyState } from "./components/EmptyState";
import { ErrorState } from "./components/ErrorState";
import { LoadingState } from "./components/LoadingState";
import { LoginScreen } from "./components/LoginScreen";
import {
  OperationModal,
  type OperationFormState,
} from "./components/OperationModal";
import { OperationTable } from "./components/OperationTable";
import { SetupPanel } from "./components/SetupPanel";
import { TopBar } from "./components/TopBar";
import type { BootstrapPayload, OperationRecord, SelectOption } from "./types";

interface AppOptionsState {
  operators: SelectOption[];
  lanchas: SelectOption[];
  statuses: SelectOption[];
  users: SelectOption[];
  types: SelectOption[];
}

interface LocalSession {
  name: string;
  email: string;
}

const SESSION_STORAGE_KEY = "logistica-catraia.local-session";

const emptyOptions: AppOptionsState = {
  operators: [],
  lanchas: [],
  statuses: [],
  users: [],
  types: [],
};

function buildCsvValue(value: string | number | null) {
  if (value === null || value === undefined) {
    return '""';
  }

  const text = String(value).replaceAll('"', '""');
  return `"${text}"`;
}

function readStoredSession() {
  try {
    const rawValue = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return rawValue ? (JSON.parse(rawValue) as LocalSession) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [activeView, setActiveView] = useState("operations");
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [session, setSession] = useState<LocalSession | null>(() =>
    typeof window === "undefined" ? null : readStoredSession(),
  );
  const [operations, setOperations] = useState<OperationRecord[]>([]);
  const [options, setOptions] = useState<AppOptionsState>(emptyOptions);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOperation, setEditingOperation] = useState<OperationRecord | null>(
    null,
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    let ignore = false;

    async function loadData() {
      setIsLoading(true);
      setHasError(false);

      try {
        const response = await fetch(`/api/bootstrap?date=${selectedDate}`);

        if (!response.ok) {
          throw new Error("Falha ao carregar a API.");
        }

        const payload: BootstrapPayload = await response.json();

        if (!ignore) {
          setOperations(payload.operations);
          setOptions(payload.options);
        }
      } catch {
        if (!ignore) {
          setHasError(true);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [reloadToken, selectedDate, session]);

  const handleRefresh = () => {
    setReloadToken((current) => current + 1);
  };

  const handleLogin = (nextSession: LocalSession) => {
    setSession(nextSession);
    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify(nextSession),
    );
  };

  const handleLogout = () => {
    setSession(null);
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  const missingItems = [
    options.operators.length === 0 ? "operadores" : null,
    options.lanchas.length === 0 ? "lanchas" : null,
    options.statuses.length === 0 ? "status" : null,
  ].filter(Boolean) as string[];

  const handleAddOperation = () => {
    setEditingOperation(null);
    setIsModalOpen(true);
  };

  const handleEditOperation = (operation: OperationRecord) => {
    setEditingOperation(operation);
    setIsModalOpen(true);
  };

  const handleSaveOperation = async (formData: OperationFormState) => {
    const payload = {
      operatorId: formData.operatorId,
      lanchaId: formData.lanchaId,
      statusId: formData.statusId,
      userId: formData.userId,
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
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      throw new Error(errorPayload?.error || "Nao foi possivel salvar a operacao.");
    }

    setIsModalOpen(false);
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
      "Inicio",
      "Fim",
      "Usuario",
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
          buildCsvValue(operation.startedAt),
          buildCsvValue(operation.finishedAt),
          buildCsvValue(operation.userName),
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
      lanchas={options.lanchas}
      types={options.types}
      onRefresh={handleRefresh}
    />
  );

  const renderMainContent = () => {
    if (isLoading) {
      return <LoadingState />;
    }

    if (hasError) {
      return <ErrorState onRetry={handleRefresh} />;
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
        <div className="rounded-[2rem] border border-black/5 bg-white p-8 text-center shadow-xl">
          <h3 className="mb-2 text-xl font-black text-slate-900">
            Modulo de relatorios
          </h3>
          <p className="text-slate-600">
            Use a tabela principal para exportar o CSV das operacoes filtradas
            por data.
          </p>
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
              A tela de login atual esta em modo provisório e a conexao com o
              banco continua no backend local em <code>server/database/postgres.js</code>.
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
      <div className="space-y-6">
        <DashboardCards {...stats} />
        <OperationTable
          data={operations}
          onAdd={handleAddOperation}
          onEdit={handleEditOperation}
          onExport={handleExport}
        />
      </div>
    );
  };

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#fbfaf7] via-[#f6f4ef] to-[#fcfbf8]">
      <TopBar
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        activeView={activeView}
        onViewChange={setActiveView}
        currentUserName={session.name}
        onLogout={handleLogout}
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-[1600px]">{renderMainContent()}</div>
      </main>

      <OperationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingOperation(null);
        }}
        onSave={handleSaveOperation}
        operation={editingOperation}
        operators={options.operators}
        lanchas={options.lanchas}
        statuses={options.statuses}
        users={options.users}
      />
    </div>
  );
}
