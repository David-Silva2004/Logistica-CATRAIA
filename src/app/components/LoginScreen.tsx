import {
  useEffect,
  useState,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  AlertTriangle,
  Anchor,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import type { AuthSession, AuthStatusPayload } from "../types";

interface LoginScreenProps {
  onLogin: (session: AuthSession, options?: { rememberUser?: boolean }) => void;
}

const REMEMBERED_LOGIN_STORAGE_KEY = "logistica-catraia.remembered-login";

function validateName(value: string) {
  if (!value.trim()) {
    return "Informe o nome do usuario.";
  }

  return "";
}

function validateLogin(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return "Informe seu usuario para entrar.";
  }

  return "";
}

function normalizeLogin(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, ".");
}

function normalizeLoginOrIdentifier(value: string) {
  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue.includes("@")) {
    return normalizedValue;
  }

  return normalizeLogin(normalizedValue);
}

function validatePassword(value: string) {
  if (!value.trim()) {
    return "Informe sua senha para continuar.";
  }

  if (value.length < 6) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }

  return "";
}

function validatePasswordConfirmation(password: string, confirmation: string) {
  if (!confirmation.trim()) {
    return "Confirme a senha para concluir o cadastro.";
  }

  if (password !== confirmation) {
    return "As senhas informadas precisam ser iguais.";
  }

  return "";
}

function readRememberedLogin() {
  try {
    return window.localStorage.getItem(REMEMBERED_LOGIN_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

async function readJsonResponse(response: Response) {
  return response.json().catch(() => null);
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const rememberedLogin =
    typeof window === "undefined" ? "" : readRememberedLogin();
  const [name, setName] = useState("");
  const [login, setLogin] = useState(rememberedLogin);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [nameError, setNameError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordConfirmationError, setPasswordConfirmationError] =
    useState("");
  const [generalError, setGeneralError] = useState("");
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [rememberUser, setRememberUser] = useState(Boolean(rememberedLogin));
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [requiresInitialUser, setRequiresInitialUser] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadAuthStatus() {
      setIsCheckingAccess(true);
      setGeneralError("");

      try {
        const response = await fetch("/api/auth/status");

        if (!response.ok) {
          throw new Error("Nao foi possivel verificar o acesso ao sistema.");
        }

        const payload = (await response.json()) as AuthStatusPayload;

        if (!ignore) {
          setRequiresInitialUser(!payload.hasUsers);
        }
      } catch (error) {
        if (!ignore) {
          setGeneralError(
            error instanceof Error
              ? error.message
              : "Falha ao carregar o login.",
          );
        }
      } finally {
        if (!ignore) {
          setIsCheckingAccess(false);
        }
      }
    }

    loadAuthStatus();

    return () => {
      ignore = true;
    };
  }, []);

  const updateCapsLockState = (
    event: KeyboardEvent<HTMLInputElement> | FocusEvent<HTMLInputElement>,
  ) => {
    setCapsLockActive(event.getModifierState("CapsLock"));
  };

  const clearCapsLockState = () => {
    setCapsLockActive(false);
  };

  const persistRememberedLogin = (nextLogin: string) => {
    try {
      if (rememberUser) {
        window.localStorage.setItem(REMEMBERED_LOGIN_STORAGE_KEY, nextLogin);
        return;
      }

      window.localStorage.removeItem(REMEMBERED_LOGIN_STORAGE_KEY);
    } catch {
      // Ignores local persistence errors on the desktop shell.
    }
  };

  const handleLoginSuccess = (session: AuthSession, normalizedLogin: string) => {
    persistRememberedLogin(normalizedLogin);
    onLogin(session, { rememberUser });
  };

  const validateLoginForm = () => {
    const nextLoginError = validateLogin(login);
    const nextPasswordError = validatePassword(password);

    setLoginError(nextLoginError);
    setPasswordError(nextPasswordError);

    return !(nextLoginError || nextPasswordError);
  };

  const validateBootstrapForm = () => {
    const nextNameError = validateName(name);
    const nextLoginError = validateLogin(login);
    const nextPasswordError = validatePassword(password);
    const nextPasswordConfirmationError = validatePasswordConfirmation(
      password,
      passwordConfirmation,
    );

    setNameError(nextNameError);
    setLoginError(nextLoginError);
    setPasswordError(nextPasswordError);
    setPasswordConfirmationError(nextPasswordConfirmationError);

    return !(
      nextNameError ||
      nextLoginError ||
      nextPasswordError ||
      nextPasswordConfirmationError
    );
  };

  const handleLoginSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!validateLoginForm()) {
      return;
    }

    setIsSubmitting(true);
    setGeneralError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login: normalizeLoginOrIdentifier(login),
          password,
        }),
      });
      const payload = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(payload?.error || "Nao foi possivel entrar.");
      }

      handleLoginSuccess(
        payload.session as AuthSession,
        normalizeLoginOrIdentifier(login),
      );
    } catch (error) {
      setGeneralError(
        error instanceof Error ? error.message : "Erro ao autenticar.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBootstrapSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!validateBootstrapForm()) {
      return;
    }

    setIsSubmitting(true);
    setGeneralError("");

    try {
      const response = await fetch("/api/auth/bootstrap-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          login: normalizeLogin(login),
          password,
        }),
      });
      const payload = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(payload?.error || "Nao foi possivel criar o primeiro acesso.");
      }

      setRequiresInitialUser(false);
      handleLoginSuccess(payload.session as AuthSession, normalizeLogin(login));
    } catch (error) {
      setGeneralError(
        error instanceof Error ? error.message : "Erro ao criar o primeiro acesso.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginChange = (value: string) => {
    setLogin(value);

    if (loginError) {
      setLoginError(validateLogin(value));
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);

    if (passwordError) {
      setPasswordError(validatePassword(value));
    }

    if (passwordConfirmationError && passwordConfirmation) {
      setPasswordConfirmationError(
        validatePasswordConfirmation(value, passwordConfirmation),
      );
    }
  };

  const passwordInputType = isPasswordVisible ? "text" : "password";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.10),_transparent_28%),linear-gradient(135deg,_#fcfbf7_0%,_#f8f6f1_55%,_#fdfcf9_100%)] px-4 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] border border-black/5 bg-white/88 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="inline-flex items-center gap-3 rounded-full border border-amber-200/80 bg-amber-50/70 px-4 py-2 text-sm font-semibold text-amber-900">
            <Anchor size={18} />
            Logistica Fabiana
          </div>

          <h1 className="mt-6 max-w-xl text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
            Gestao operacional com clareza e praticidade.
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Um painel pensado para organizar as operacoes do dia, facilitar o
            acompanhamento da equipe e centralizar as informacoes mais
            importantes da rotina.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-black/5 bg-slate-50/70 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
                Operacao
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                Registro simples do dia
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Fluxo objetivo para registrar, consultar e acompanhar as
                operacoes com mais agilidade.
              </p>
            </div>

            <div className="rounded-2xl border border-black/5 bg-slate-50/70 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
                Gestao
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                Informacao centralizada
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Uma base organizada para acompanhar a rotina operacional de
                forma mais clara e confiavel.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <ShieldCheck className="text-amber-700" size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.15em] text-amber-700">
                Acesso
              </p>
              <h2 className="text-2xl font-black text-slate-900">
                {requiresInitialUser ? "Criar acesso inicial" : "Entrar no painel"}
              </h2>
            </div>
          </div>

          {isCheckingAccess ? (
            <div className="rounded-2xl border border-amber-200/70 bg-amber-50/50 px-4 py-3 text-sm text-amber-900">
              Verificando os usuarios cadastrados no PostgreSQL...
            </div>
          ) : (
            <form
              onSubmit={
                requiresInitialUser ? handleBootstrapSubmit : handleLoginSubmit
              }
              className="space-y-4"
            >
              {requiresInitialUser && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
                  Nenhum usuario foi encontrado. Cadastre agora o primeiro acesso
                  administrador do sistema.
                </div>
              )}

              {generalError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {generalError}
                </div>
              )}

              {requiresInitialUser && (
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Nome completo
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setName(nextValue);

                      if (nameError) {
                        setNameError(validateName(nextValue));
                      }
                    }}
                    onBlur={(event) => setNameError(validateName(event.target.value))}
                    placeholder="Nome do responsavel"
                    aria-invalid={Boolean(nameError)}
                    className={`w-full rounded-2xl border bg-slate-50/70 px-4 py-3 text-slate-900 outline-none transition-colors ${
                      nameError
                        ? "border-red-300 focus:border-red-400"
                        : "border-black/8 focus:border-amber-300"
                    }`}
                  />
                  {nameError && (
                    <p className="mt-2 text-sm font-medium text-red-600">
                      {nameError}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Usuario
                </label>
                <input
                  type="text"
                  value={login}
                  onChange={(event) => handleLoginChange(event.target.value)}
                  onBlur={(event) => setLoginError(validateLogin(event.target.value))}
                  placeholder="ex: admin"
                  aria-invalid={Boolean(loginError)}
                  className={`w-full rounded-2xl border bg-slate-50/70 px-4 py-3 text-slate-900 outline-none transition-colors ${
                    loginError
                      ? "border-red-300 focus:border-red-400"
                      : "border-black/8 focus:border-amber-300"
                  }`}
                />
                {loginError && (
                  <p className="mt-2 text-sm font-medium text-red-600">
                    {loginError}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={passwordInputType}
                    value={password}
                    onChange={(event) => handlePasswordChange(event.target.value)}
                    onBlur={(event) => {
                      setPasswordError(validatePassword(event.target.value));
                      clearCapsLockState();
                    }}
                    onFocus={updateCapsLockState}
                    onKeyDown={updateCapsLockState}
                    onKeyUp={updateCapsLockState}
                    placeholder="Digite sua senha"
                    aria-invalid={Boolean(passwordError)}
                    className={`w-full rounded-2xl border bg-slate-50/70 px-4 py-3 pr-12 text-slate-900 outline-none transition-colors ${
                      passwordError
                        ? "border-red-300 focus:border-red-400"
                        : "border-black/8 focus:border-amber-300"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setIsPasswordVisible((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                    title={isPasswordVisible ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {capsLockActive && (
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-900">
                    <AlertTriangle size={16} />
                    Caps Lock ativado.
                  </div>
                )}
                {passwordError && (
                  <p className="mt-2 text-sm font-medium text-red-600">
                    {passwordError}
                  </p>
                )}
              </div>

              {requiresInitialUser && (
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Confirmar senha
                  </label>
                  <input
                    type={passwordInputType}
                    value={passwordConfirmation}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setPasswordConfirmation(nextValue);

                      if (passwordConfirmationError) {
                        setPasswordConfirmationError(
                          validatePasswordConfirmation(password, nextValue),
                        );
                      }
                    }}
                    onBlur={(event) =>
                      setPasswordConfirmationError(
                        validatePasswordConfirmation(password, event.target.value),
                      )
                    }
                    placeholder="Repita a senha"
                    aria-invalid={Boolean(passwordConfirmationError)}
                    className={`w-full rounded-2xl border bg-slate-50/70 px-4 py-3 text-slate-900 outline-none transition-colors ${
                      passwordConfirmationError
                        ? "border-red-300 focus:border-red-400"
                        : "border-black/8 focus:border-amber-300"
                    }`}
                  />
                  {passwordConfirmationError && (
                    <p className="mt-2 text-sm font-medium text-red-600">
                      {passwordConfirmationError}
                    </p>
                  )}
                </div>
              )}

              <label className="flex items-start gap-3 rounded-2xl border border-black/5 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={rememberUser}
                  onChange={(event) => setRememberUser(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-700 focus:ring-amber-500"
                />
                <span>
                  Lembrar meu acesso neste computador.
                </span>
              </label>

              <div className="rounded-2xl border border-amber-200/70 bg-amber-50/50 px-4 py-3 text-sm text-amber-900">
                {requiresInitialUser
                  ? "Esse acesso sera salvo no PostgreSQL e usado como entrada oficial do sistema."
                  : "A autenticacao agora usa usuario e senha cadastrados no PostgreSQL da empresa."}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-100 px-5 py-3 font-bold text-amber-950 transition-colors hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting
                  ? requiresInitialUser
                    ? "Criando acesso..."
                    : "Entrando..."
                  : requiresInitialUser
                    ? "Criar primeiro acesso"
                    : "Entrar"}
                <ArrowRight size={18} />
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
