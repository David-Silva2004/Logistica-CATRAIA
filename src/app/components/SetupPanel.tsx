import {
  useMemo,
  useState,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from "react";
import { Pencil, Search, ShieldCheck, Trash2, UserCog } from "lucide-react";
import type { AuthSession, SelectOption, UserRole } from "../types";

interface SetupPanelProps {
  operators: SelectOption[];
  users: SelectOption[];
  session: AuthSession;
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
  users,
  session,
  onRefresh,
}: SetupPanelProps) {
  const isAdmin = session.role === "admin";
  const [adminSearch, setAdminSearch] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [operatorSearch, setOperatorSearch] = useState("");
  const [editingOperatorId, setEditingOperatorId] = useState<number | null>(null);
  const [editingOperatorName, setEditingOperatorName] = useState("");
  const [operatorActionId, setOperatorActionId] = useState<number | null>(null);
  const [userName, setUserName] = useState("");
  const [userLogin, setUserLogin] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("normal");
  const [userSearch, setUserSearch] = useState("");
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingUserName, setEditingUserName] = useState("");
  const [editingUserLogin, setEditingUserLogin] = useState("");
  const [editingUserRole, setEditingUserRole] = useState<UserRole>("normal");
  const [editingUserPassword, setEditingUserPassword] = useState("");
  const [editingUserPasswordConfirmation, setEditingUserPasswordConfirmation] =
    useState("");
  const [userActionId, setUserActionId] = useState<number | null>(null);
  const [userPassword, setUserPassword] = useState("");
  const [userPasswordConfirmation, setUserPasswordConfirmation] = useState("");
  const [feedback, setFeedback] = useState("");

  const filteredOperators = useMemo(() => {
    const search = adminSearch.trim().toLowerCase();
    const quickSearch = operatorSearch.trim().toLowerCase();

    if (!search && !quickSearch) {
      return operators;
    }

    return operators.filter((operator) => {
      const normalizedLabel = operator.label.toLowerCase();
      const matchesAdminSearch =
        !search ||
        normalizedLabel.includes(search) ||
        String(operator.id).includes(search);
      const matchesQuickSearch =
        !quickSearch ||
        normalizedLabel.includes(quickSearch) ||
        String(operator.id).includes(quickSearch);

      return matchesAdminSearch && matchesQuickSearch;
    });
  }, [adminSearch, operatorSearch, operators]);

  const filteredUsers = useMemo(() => {
    const search = adminSearch.trim().toLowerCase();
    const quickSearch = userSearch.trim().toLowerCase();

    if (!search && !quickSearch) {
      return users;
    }

    return users.filter((user) => {
      const normalizedLabel = user.label.toLowerCase();
      const normalizedHint = user.hint?.toLowerCase() ?? "";
      const userId = String(user.id);
      const matchesAdminSearch =
        !search ||
        normalizedLabel.includes(search) ||
        normalizedHint.includes(search) ||
        userId.includes(search);
      const matchesQuickSearch =
        !quickSearch ||
        normalizedLabel.includes(quickSearch) ||
        normalizedHint.includes(quickSearch) ||
        userId.includes(quickSearch);

      return matchesAdminSearch && matchesQuickSearch;
    });
  }, [adminSearch, userSearch, users]);

  async function submitJson(
    url: string,
    payload: object,
    method = "POST",
  ) {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-user-id": String(session.id),
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

  async function handleUpdateOperator(operatorId: number) {
    if (!isAdmin) {
      setFeedback("Somente administradores podem editar operadores.");
      return;
    }

    setOperatorActionId(operatorId);

    try {
      await submitJson(`/api/operators/${operatorId}`, {
        name: editingOperatorName,
      }, "PUT");
      setEditingOperatorId(null);
      setEditingOperatorName("");
      setFeedback("Operador atualizado com sucesso.");
      onRefresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro ao atualizar operador.");
    } finally {
      setOperatorActionId(null);
    }
  }

  async function handleDeleteOperator(operatorId: number) {
    if (!isAdmin) {
      setFeedback("Somente administradores podem excluir operadores.");
      return;
    }

    setOperatorActionId(operatorId);

    try {
      const response = await fetch(`/api/operators/${operatorId}`, {
        method: "DELETE",
        headers: {
          "x-user-id": String(session.id),
        },
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Nao foi possivel excluir o operador.");
      }

      if (editingOperatorId === operatorId) {
        setEditingOperatorId(null);
        setEditingOperatorName("");
      }

      setFeedback("Operador excluido com sucesso.");
      onRefresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro ao excluir operador.");
    } finally {
      setOperatorActionId(null);
    }
  }

  async function handleCreateUser(event: FormEvent) {
    event.preventDefault();

    if (!isAdmin) {
      setFeedback("Somente administradores podem cadastrar usuarios.");
      return;
    }

    if (userPassword !== userPasswordConfirmation) {
      setFeedback("As senhas do usuario precisam ser iguais.");
      return;
    }

    try {
      await submitJson("/api/users", {
        name: userName,
        login: userLogin,
        role: userRole,
        password: userPassword,
      });
      setUserName("");
      setUserLogin("");
      setUserRole("normal");
      setUserPassword("");
      setUserPasswordConfirmation("");
      setFeedback("Usuario cadastrado com sucesso.");
      onRefresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro ao cadastrar usuario.");
    }
  }

  async function handleUpdateUser(userId: number) {
    if (!isAdmin) {
      setFeedback("Somente administradores podem editar usuarios.");
      return;
    }

    if (editingUserPassword !== editingUserPasswordConfirmation) {
      setFeedback("As senhas do usuario precisam ser iguais.");
      return;
    }

    setUserActionId(userId);

    try {
      await submitJson(
        `/api/users/${userId}`,
        {
          name: editingUserName,
          login: editingUserLogin,
          role: editingUserRole,
          password: editingUserPassword,
        },
        "PUT",
      );
      setEditingUserId(null);
      setEditingUserName("");
      setEditingUserLogin("");
      setEditingUserRole("normal");
      setEditingUserPassword("");
      setEditingUserPasswordConfirmation("");
      setFeedback("Usuario atualizado com sucesso.");
      onRefresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro ao atualizar usuario.");
    } finally {
      setUserActionId(null);
    }
  }

  async function handleDeleteUser(userId: number) {
    if (!isAdmin) {
      setFeedback("Somente administradores podem excluir usuarios.");
      return;
    }

    setUserActionId(userId);

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: {
          "x-user-id": String(session.id),
        },
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Nao foi possivel excluir o usuario.");
      }

      if (editingUserId === userId) {
        setEditingUserId(null);
        setEditingUserName("");
        setEditingUserLogin("");
        setEditingUserRole("normal");
        setEditingUserPassword("");
        setEditingUserPasswordConfirmation("");
      }

      setFeedback("Usuario excluido com sucesso.");
      onRefresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro ao excluir usuario.");
    } finally {
      setUserActionId(null);
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
          base. Agora voce pode cadastrar aqui os operadores e usuarios sem sair
          da interface.
        </p>

        {!isAdmin && (
          <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm text-sky-900">
            Seu acesso pode cadastrar operadores, mas edicao e exclusao de
            operadores e toda a gestao de usuarios ficam restritas ao
            administrador.
          </div>
        )}

        {isAdmin && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
            Controle administrativo ativo. Este acesso pode gerenciar usuarios e
            controlar edicao e exclusao de cadastros.
          </div>
        )}

        <div className="mt-4">
          <label className="mb-2 block text-sm font-bold text-slate-700">
            Pesquisa geral de cadastros
          </label>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={adminSearch}
              onChange={(event) => setAdminSearch(event.target.value)}
              placeholder="Buscar em operadores e usuarios..."
              className="w-full rounded-xl border border-black/8 bg-slate-50 px-4 py-3 pl-10 text-slate-900 outline-none transition-colors focus:border-amber-300"
            />
          </div>
        </div>
      </div>

      {feedback && (
        <div className="mb-5 rounded-xl border border-amber-200/70 bg-amber-50/40 px-4 py-3 text-sm text-amber-900">
          {feedback}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
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

          <div className="mt-4 border-t border-black/5 pt-4">
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Pesquisa rapida
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={operatorSearch}
                onChange={(event) => setOperatorSearch(event.target.value)}
                placeholder="Buscar operador..."
                className="w-full rounded-xl border border-black/8 bg-slate-50 px-4 py-3 pl-10 text-slate-900 outline-none transition-colors focus:border-amber-300"
              />
            </div>

            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
              {filteredOperators.length === 0 && (
                <div className="rounded-xl border border-dashed border-black/10 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Nenhum operador encontrado.
                </div>
              )}

              {filteredOperators.map((operator) => {
                const isEditing = editingOperatorId === operator.id;
                const isProcessing = operatorActionId === operator.id;

                return (
                  <div
                    key={operator.id}
                    className="rounded-xl border border-black/8 bg-slate-50/80 px-3 py-3"
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingOperatorName}
                          onChange={(event) =>
                            setEditingOperatorName(event.target.value)
                          }
                          className="w-full rounded-xl border border-black/8 bg-white px-4 py-3 text-slate-900 outline-none transition-colors focus:border-amber-300"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateOperator(operator.id)}
                            disabled={isProcessing}
                            className="flex-1 rounded-xl border border-amber-200 bg-amber-100 px-4 py-2.5 text-sm font-bold text-amber-950 transition-colors hover:bg-amber-200 disabled:opacity-70"
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingOperatorId(null);
                              setEditingOperatorName("");
                            }}
                            className="rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-300"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {operator.label}
                          </p>
                          <p className="text-xs text-slate-500">
                            ID {operator.id}
                          </p>
                        </div>

                        {isAdmin && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingOperatorId(operator.id);
                                setEditingOperatorName(operator.label);
                              }}
                              className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-white hover:text-amber-900"
                              title="Editar operador"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOperator(operator.id)}
                              disabled={isProcessing}
                              className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-white hover:text-red-700 disabled:opacity-60"
                              title="Excluir operador"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CreateCard>

        {isAdmin && (
          <CreateCard
            icon={ShieldCheck}
            title="Usuarios"
            description="Acessos reais para entrar no sistema."
            count={users.length}
          >
          <form onSubmit={handleCreateUser} className="space-y-3">
            <input
              type="text"
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              placeholder="Nome do usuario"
              className="w-full rounded-xl border border-black/8 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-amber-300"
            />
            <input
              type="text"
              value={userLogin}
              onChange={(event) => setUserLogin(event.target.value)}
              placeholder="Login de acesso"
              className="w-full rounded-xl border border-black/8 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-amber-300"
            />
            <select
              value={userRole}
              onChange={(event) => setUserRole(event.target.value as UserRole)}
              className="w-full cursor-pointer rounded-xl border border-black/8 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-amber-300"
            >
              <option value="normal">Usuario normal</option>
              <option value="admin">Administrador</option>
            </select>
            <input
              type="password"
              value={userPassword}
              onChange={(event) => setUserPassword(event.target.value)}
              placeholder="Senha do usuario"
              className="w-full rounded-xl border border-black/8 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-amber-300"
            />
            <input
              type="password"
              value={userPasswordConfirmation}
              onChange={(event) => setUserPasswordConfirmation(event.target.value)}
              placeholder="Confirmar senha"
              className="w-full rounded-xl border border-black/8 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-amber-300"
            />
            <button
              type="submit"
              className="w-full rounded-xl border border-amber-200 bg-amber-100 px-4 py-3 font-bold text-amber-950 transition-colors hover:bg-amber-200"
            >
              Cadastrar usuario
            </button>
          </form>

          <div className="mt-4 border-t border-black/5 pt-4">
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Pesquisa rapida
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Buscar usuario por nome ou login..."
                className="w-full rounded-xl border border-black/8 bg-slate-50 px-4 py-3 pl-10 text-slate-900 outline-none transition-colors focus:border-amber-300"
              />
            </div>

            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
              {filteredUsers.length === 0 && (
                <div className="rounded-xl border border-dashed border-black/10 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Nenhum usuario encontrado.
                </div>
              )}

              {filteredUsers.map((user) => {
                const isEditing = editingUserId === user.id;
                const isProcessing = userActionId === user.id;

                return (
                  <div
                    key={user.id}
                    className="rounded-xl border border-black/8 bg-slate-50/80 px-3 py-3"
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingUserName}
                          onChange={(event) => setEditingUserName(event.target.value)}
                          placeholder="Nome do usuario"
                          className="w-full rounded-xl border border-black/8 bg-white px-4 py-3 text-slate-900 outline-none transition-colors focus:border-amber-300"
                        />
                        <input
                          type="text"
                          value={editingUserLogin}
                          onChange={(event) => setEditingUserLogin(event.target.value)}
                          placeholder="Login de acesso"
                          className="w-full rounded-xl border border-black/8 bg-white px-4 py-3 text-slate-900 outline-none transition-colors focus:border-amber-300"
                        />
                        <select
                          value={editingUserRole}
                          onChange={(event) =>
                            setEditingUserRole(event.target.value as UserRole)
                          }
                          className="w-full cursor-pointer rounded-xl border border-black/8 bg-white px-4 py-3 text-slate-900 outline-none transition-colors focus:border-amber-300"
                        >
                          <option value="normal">Usuario normal</option>
                          <option value="admin">Administrador</option>
                        </select>
                        <input
                          type="password"
                          value={editingUserPassword}
                          onChange={(event) =>
                            setEditingUserPassword(event.target.value)
                          }
                          placeholder="Nova senha opcional"
                          className="w-full rounded-xl border border-black/8 bg-white px-4 py-3 text-slate-900 outline-none transition-colors focus:border-amber-300"
                        />
                        <input
                          type="password"
                          value={editingUserPasswordConfirmation}
                          onChange={(event) =>
                            setEditingUserPasswordConfirmation(event.target.value)
                          }
                          placeholder="Confirmar nova senha"
                          className="w-full rounded-xl border border-black/8 bg-white px-4 py-3 text-slate-900 outline-none transition-colors focus:border-amber-300"
                        />
                        <p className="text-xs text-slate-500">
                          Deixe a senha em branco para manter a atual.
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateUser(user.id)}
                            disabled={isProcessing}
                            className="flex-1 rounded-xl border border-amber-200 bg-amber-100 px-4 py-2.5 text-sm font-bold text-amber-950 transition-colors hover:bg-amber-200 disabled:opacity-70"
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUserId(null);
                              setEditingUserName("");
                              setEditingUserLogin("");
                              setEditingUserPassword("");
                              setEditingUserPasswordConfirmation("");
                            }}
                            className="rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-300"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {user.label}
                          </p>
                          <p className="text-xs text-slate-500">
                            Login {user.hint || "nao informado"} •{" "}
                            {user.role === "admin" ? "Administrador" : "Usuario normal"}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-slate-500">
                            ID {user.id}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUserId(user.id);
                              setEditingUserName(user.label);
                              setEditingUserLogin(user.hint || "");
                              setEditingUserRole(user.role || "normal");
                              setEditingUserPassword("");
                              setEditingUserPasswordConfirmation("");
                            }}
                            className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-white hover:text-amber-900"
                            title="Editar usuario"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={isProcessing}
                            className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-white hover:text-red-700 disabled:opacity-60"
                            title="Excluir usuario"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          </CreateCard>
        )}
      </div>
    </section>
  );
}
