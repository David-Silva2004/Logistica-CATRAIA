import { useState, type FormEvent } from "react";
import { Anchor, ArrowRight, ShieldCheck } from "lucide-react";

interface LoginScreenProps {
  onLogin: (session: { name: string; email: string }) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      return;
    }

    const displayName = normalizedEmail.split("@")[0] || "Operador";

    onLogin({
      name: displayName,
      email: normalizedEmail,
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.10),_transparent_28%),linear-gradient(135deg,_#fcfbf7_0%,_#f8f6f1_55%,_#fdfcf9_100%)] px-4 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] border border-black/5 bg-white/88 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="inline-flex items-center gap-3 rounded-full border border-amber-200/80 bg-amber-50/70 px-4 py-2 text-sm font-semibold text-amber-900">
            <Anchor size={18} />
            Logistica CATRAIA
          </div>

          <h1 className="mt-6 max-w-xl text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
            Painel operacional com a cara da empresa.
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            A tela de login ja ficou pronta para a proxima etapa. Por enquanto,
            o acesso funciona em modo provisório, sem autenticação real, para
            voce conseguir entrar e validar o layout e o fluxo.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-black/5 bg-slate-50/70 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
                Visual
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                Identidade em amarelo ouro
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Ajustado para um amarelo mais quente, puxando para o ovo e o
                dourado da marca.
              </p>
            </div>

            <div className="rounded-2xl border border-black/5 bg-slate-50/70 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
                Proximo passo
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                Cadastro real de usuarios
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Quando voce me passar o fluxo exato, eu conecto essa tela ao
                banco e fecho a autenticacao.
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
                Entrar no painel
              </h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seuemail@empresa.com"
                className="w-full rounded-2xl border border-black/8 bg-slate-50/70 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-amber-300"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite sua senha"
                className="w-full rounded-2xl border border-black/8 bg-slate-50/70 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-amber-300"
              />
            </div>

            <div className="rounded-2xl border border-amber-200/70 bg-amber-50/50 px-4 py-3 text-sm text-amber-900">
              Login provisório para validação visual. O fluxo real de contas e
              permissões entra na próxima etapa com a sua ajuda.
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-100 px-5 py-3 font-bold text-amber-950 transition-colors hover:bg-amber-200"
            >
              Entrar
              <ArrowRight size={18} />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
