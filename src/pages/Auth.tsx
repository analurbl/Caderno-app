import { cloneElement, useId, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { sha256 } from "../lib/api";
import { Mascot, TopBar, askText, confirmAction, showMessage } from "../components/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SignUpForm = { name: string; email: string; password: string; confirm: string };

function validate(form: SignUpForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (!form.name.trim()) e.name = "Informe seu nome.";
  if (!EMAIL_RE.test(form.email.trim())) e.email = "Informe um e-mail válido, como nome@exemplo.com.";
  if (form.password.length < 6) e.password = "A senha precisa ter pelo menos 6 caracteres.";
  if (form.confirm !== form.password) e.confirm = "As senhas não são iguais.";
  return e;
}

export function SignUp() {
  const signUp = useStore((s) => s.signUp);
  const existing = useStore((s) => s.account);
  const nav = useNavigate();
  const [form, setForm] = useState<SignUpForm>({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);


  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    setTouched(true);
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    if (existing && !(await confirmAction("Já existe uma conta neste dispositivo. Criar uma nova apaga a anterior e seus dados. Continuar?", { danger: true }))) return;
    if (existing) useStore.getState().deleteAllData();
    signUp({ name: form.name.trim(), email: form.email.trim().toLowerCase(), passwordHash: await sha256(form.password), createdAt: Date.now() });
    nav("/configurar", { replace: true });
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = { ...form, [k]: e.target.value };
    setForm(next);
    if (touched) setErrors(validate(next));
  };

  return (
    <>
      <TopBar title="Criar conta" back="/bem-vindo" />
      <form className="page" onSubmit={submit} noValidate>
        <div className="row">
          <Mascot mood="motivacao" size={56} />
          <p className="muted">Leva menos de um minuto. Você pode ajustar tudo depois.</p>
        </div>
        <Field label="Nome" error={errors.name}>
          <input className="input" autoComplete="name" value={form.name} onChange={set("name")} aria-invalid={!!errors.name} />
        </Field>
        <Field label="E-mail" error={errors.email}>
          <input className="input" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={set("email")} aria-invalid={!!errors.email} />
        </Field>
        <Field label="Senha" error={errors.password} hint="Mínimo de 6 caracteres.">
          <input className="input" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} aria-invalid={!!errors.password} />
        </Field>
        <Field label="Confirmar senha" error={errors.confirm}>
          <input className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} aria-invalid={!!errors.confirm} />
        </Field>
        <p className="tiny muted">
          Nesta versão, a conta e os dados ficam salvos apenas neste dispositivo. A sincronização entre dispositivos chega em uma próxima versão.
        </p>
        <button className="btn btn-primary btn-lg btn-block" type="submit">
          Criar conta
        </button>
        <p className="center small">
          Já tem conta? <Link to="/entrar" className="link-btn">Entrar</Link>
        </p>
      </form>
    </>
  );
}

export function Login() {
  const account = useStore((s) => s.account);
  const logIn = useStore((s) => s.logIn);
  const nav = useNavigate();
  const [email, setEmail] = useState(account?.email ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!account) {
      setError("Não encontramos uma conta neste dispositivo. Crie uma conta para começar.");
      return;
    }
    if (email.trim().toLowerCase() !== account.email || (await sha256(password)) !== account.passwordHash) {
      setError("E-mail ou senha incorretos. Confira e tente de novo.");
      return;
    }
    logIn();
    nav(useStore.getState().prefs.setupDone ? "/" : "/configurar", { replace: true });
  };

  const resetPassword = async () => {
    const pwd = await askText("Nova senha", "", { message: "Como os dados ficam apenas neste dispositivo, você pode definir uma nova senha aqui (mínimo 6 caracteres)." });
    if (!pwd) return;
    if (pwd.length < 6) {
      await showMessage("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (!account) return;
    useStore.setState({ account: { ...account, passwordHash: await sha256(pwd) } });
    setShowRecovery(false);
    setError("");
    await showMessage("Senha redefinida. Entre com a nova senha.", "Pronto");
  };

  return (
    <>
      <TopBar title="Entrar" back="/bem-vindo" />
      <form className="page" onSubmit={submit} noValidate>
        <div className="row">
          <Mascot mood="foco" size={56} />
          <p className="muted">{account ? `Que bom te ver de novo, ${account.name.split(" ")[0]}!` : "Entre com seu e-mail e senha."}</p>
        </div>
        <Field label="E-mail">
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Senha">
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary btn-lg btn-block" type="submit">
          Entrar
        </button>
        <button type="button" className="link-btn" onClick={() => setShowRecovery((v) => !v)}>
          Esqueci minha senha
        </button>
        {showRecovery && (
          <div className="card stack">
            <p className="small">
              Sua conta está salva somente neste dispositivo, então não há e-mail de recuperação nesta versão. Você pode redefinir a senha aqui
              mesmo; seus dados de estudo são mantidos.
            </p>
            <button type="button" className="btn btn-soft" onClick={resetPassword} disabled={!account}>
              Redefinir senha
            </button>
          </div>
        )}
        {!account && (
          <Link to="/cadastro" className="btn btn-ghost btn-block">
            Criar conta
          </Link>
        )}
      </form>
    </>
  );
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactElement }) {
  const id = useId();
  const descId = `${id}-desc`;
  const control = cloneElement(children, { id, "aria-describedby": hint || error ? descId : undefined, "aria-invalid": error ? true : undefined });
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {control}
      {hint && !error && (
        <span className="hint" id={descId}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field-error" id={descId}>
          {error}
        </span>
      )}
    </div>
  );
}
