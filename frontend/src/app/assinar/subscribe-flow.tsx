"use client";

/**
 * fitgen.pro/assinar — web checkout through Stripe: card subscription (7-day trial) or a
 * prepaid Pix payment for 30 days (Pix Automático is not enabled on the Stripe account yet).
 *
 * 1. The visitor signs in or creates a FitGen account (same API as the app).
 * 2. The backend creates a Stripe Checkout session for that user (`/subscriptions/stripe/checkout`)
 *    and we redirect to it. The session survives the round trip in sessionStorage.
 * 3. Stripe sends the visitor back with `?checkout=sucesso`; the Stripe webhook updates the
 *    backend and we poll `profile/me` until `has_access` flips, then point to the app.
 *
 * The app itself never links here (App Store rule 3.1.1); this page is reached from the site.
 */
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import site from "../landing.module.css";
import styles from "./assinar.module.css";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://dev-api.fitgen.pro/api").replace(/\/$/, "");
const ENABLED = process.env.NEXT_PUBLIC_WEB_CHECKOUT === "1";
type Plan = "monthly" | "yearly";
const PLANS: Record<Plan, { label: string; price: string; per: string; note: string; pix: string }> = {
  monthly: { label: "Mensal", price: "R$ 29,90", per: "/mês", note: "", pix: "Pagar 30 dias com Pix · R$ 29,90" },
  yearly: { label: "Anual", price: "R$ 299,00", per: "/ano", note: "Equivale a R$ 24,92/mês: 2 meses grátis.", pix: "Pagar 1 ano com Pix · R$ 299,00" },
};
const TRIAL = "7 dias";
const SUPPORT = "mailto:suporte@fitgen.com?subject=Assinatura%20FitGen";
const SESSION_KEY = "fitgen.assinar.session";

type Session = { token: string; email: string };
type Step = "account" | "offer" | "confirming" | "done";

class ApiError extends Error {
  constructor(message: string, readonly status = 0) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError("Não foi possível conectar. Verifique sua internet e tente de novo.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fieldErrors = data?.errors && Object.values(data.errors).flat().filter(Boolean);
    throw new ApiError(String(fieldErrors?.[0] || data?.msg || data?.message || "Algo deu errado. Tente de novo."), res.status);
  }
  return data as T;
}

function passwordError(password: string) {
  if (password.length < 8) return "Use pelo menos 8 caracteres.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return "Inclua uma letra maiúscula, uma minúscula e um número.";
  }
  return "";
}

function storeSession(s: Session | null) {
  try {
    if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* private mode: the user just signs in again after checkout */
  }
}

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function SubscribeFlow() {
  const [step, setStep] = useState<Step>("account");
  const [plan, setPlan] = useState<Plan>("yearly");
  const [mode, setMode] = useState<"register" | "login">("register");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [session, setSession] = useState<Session | null>(null);
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);
  const [paid, setPaid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const change = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function waitForAccess(s: Session) {
    setStep("confirming");
    for (let i = 0; i < 30; i++) {
      try {
        const me = await call<{ has_access?: boolean }>("/profile/me", { token: s.token });
        if (me.has_access) break;
      } catch {
        /* keep waiting: the webhook usually lands within seconds */
      }
      await sleep(3000);
    }
    setPaid(true);
    setStep("done");
  }

  async function loadOffer(s: Session) {
    const me = await call<{ has_access?: boolean }>("/profile/me", { token: s.token });
    if (me.has_access) {
      setAlreadySubscribed(true);
      setStep("done");
    } else {
      setStep("offer");
    }
  }

  // Coming back from Stripe Checkout.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("checkout");
    const saved = readSession();
    if (!result || !saved) return;
    window.history.replaceState(null, "", window.location.pathname);
    setSession(saved);
    if (result === "sucesso") {
      void waitForAccess(saved);
    } else {
      setNotice("Pagamento não concluído. Você pode tentar de novo quando quiser.");
      loadOffer(saved).catch(() => {
        storeSession(null);
        setSession(null);
        setStep("account");
      });
    }
  }, []);

  async function submitAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const email = form.email.trim().toLowerCase();
    if (mode === "register") {
      if (!form.name.trim()) return setError("Informe seu nome.");
      const pwd = passwordError(form.password);
      if (pwd) return setError(pwd);
    }
    setBusy(true);
    try {
      if (mode === "register") {
        await call("/auth/register", { method: "POST", body: JSON.stringify({ name: form.name.trim(), email, password: form.password }) });
      }
      const login = await call<{ access_token: string; user: { email: string } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password: form.password }),
      });
      const s = { token: login.access_token, email: login.user.email };
      setSession(s);
      storeSession(s);
      await loadOffer(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function subscribe(method: "card" | "pix" = "card") {
    if (!session) return;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const { checkout_url } = await call<{ checkout_url: string }>(method === "pix" ? "/subscriptions/stripe/pix" : "/subscriptions/stripe/checkout", { method: "POST", token: session.token, body: JSON.stringify({ plan }) });
      window.location.assign(checkout_url);
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiError && err.status === 409) {
        setAlreadySubscribed(true);
        setStep("done");
        return;
      }
      if (err instanceof ApiError && err.status === 401) {
        storeSession(null);
        setSession(null);
        setStep("account");
        setMode("login");
        setError("Sua sessão expirou. Entre de novo para continuar.");
        return;
      }
      setError(err instanceof Error ? err.message : "Não foi possível iniciar o pagamento.");
    }
  }

  async function manage() {
    if (!session) return;
    setBusy(true);
    try {
      const { portal_url } = await call<{ portal_url: string }>("/subscriptions/stripe/portal", { method: "POST", token: session.token });
      window.location.assign(portal_url);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Não foi possível abrir o gerenciamento.");
    }
  }

  const current = { account: 0, offer: 1, confirming: 1, done: 2 }[step];

  return (
    <div className={`${site.site} ${styles.page}`}>
      <header className={site.dark}>
        <div className={site.header}>
          <Link href="/" className={site.darkLogo} aria-label="FitGen, página inicial">
            <Image src="/brand/fitgen-logo.png" alt="FitGen" width={104} height={30} unoptimized />
            <Image src="/brand/fitgen-logo.png" alt="" width={104} height={30} unoptimized className={site.logoSymbol} />
          </Link>
          <Link href="/" className={styles.back}><ArrowLeft size={16} aria-hidden="true" /> Voltar</Link>
        </div>
      </header>

      <main className={`${site.wrap} ${styles.main}`}>
        <ol className={styles.steps} aria-label="Etapas">
          {["Conta", "Pagamento", "Pronto"].map((label, i) => (
            <li key={label} data-state={i < current ? "done" : i === current ? "current" : "todo"}>{label}</li>
          ))}
        </ol>

        {!ENABLED && (
          <section className={styles.card}>
            <h1>Assinatura pelo site em breve</h1>
            <p>Enquanto isso, fale com a gente para assinar o FitGen.</p>
            <a className={site.button} href={SUPPORT} style={{ marginTop: 20 }}>Falar com o suporte</a>
          </section>
        )}

        {ENABLED && step === "account" && (
          <section className={styles.card}>
            <h1>{mode === "register" ? "Crie sua conta" : "Entre na sua conta"}</h1>
            <p>Use o mesmo email e senha para entrar no app FitGen depois.</p>
            <form onSubmit={submitAccount} className={styles.form} noValidate>
              {mode === "register" && (
                <label>Nome<input value={form.name} onChange={change("name")} autoComplete="name" required /></label>
              )}
              <label>Email<input type="email" value={form.email} onChange={change("email")} autoComplete="email" inputMode="email" required /></label>
              <label>
                Senha
                <input type="password" value={form.password} onChange={change("password")} autoComplete={mode === "register" ? "new-password" : "current-password"} required />
                {mode === "register" && <small>Mínimo de 8 caracteres, com maiúscula, minúscula e número.</small>}
              </label>
              {error && <p className={styles.error} role="alert">{error}</p>}
              <button className={site.button} type="submit" disabled={busy}>
                {busy && <Loader2 size={16} className={styles.spin} aria-hidden="true" />}
                {mode === "register" ? "Criar conta e continuar" : "Entrar e continuar"}
              </button>
            </form>
            <button type="button" className={styles.switch} onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); }}>
              {mode === "register" ? "Já tenho conta" : "Ainda não tenho conta"}
            </button>
          </section>
        )}

        {ENABLED && (step === "offer" || step === "confirming") && (
          <section className={`${styles.card} ${styles.offer}`}>
            <div className={styles.planHead}><h1>FitGen Completo</h1></div>
            <div className={styles.toggle} role="radiogroup" aria-label="Plano">
              {(Object.keys(PLANS) as Plan[]).map((key) => (
                <button key={key} type="button" role="radio" aria-checked={plan === key} data-active={plan === key}
                  onClick={() => setPlan(key)} disabled={step === "confirming"}>
                  {PLANS[key].label}{key === "yearly" && <small>2 meses grátis</small>}
                </button>
              ))}
            </div>
            <p className={styles.price}>{PLANS[plan].price}<span>{PLANS[plan].per}</span></p>
            {PLANS[plan].note && <p className={styles.save}>{PLANS[plan].note}</p>}
            <p className={styles.trial}><strong>{TRIAL} grátis</strong> para novos assinantes. A primeira cobrança só acontece depois do teste, e você pode cancelar antes.</p>
            <ul className={styles.benefits}>
              {["Treinos e dieta gerados por IA", "IA Coach 24h", "Medidas, progresso e hidratação", "Sem fidelidade: cancele quando quiser"].map((b) => (
                <li key={b}><Check size={18} aria-hidden="true" />{b}</li>
              ))}
            </ul>
            <p className={styles.account}>Conta: <strong>{session?.email}</strong></p>
            {notice && <p className={styles.notice} role="status">{notice}</p>}
            {error && <p className={styles.error} role="alert">{error}</p>}
            <button className={site.button} type="button" onClick={() => subscribe("card")} disabled={busy || step === "confirming"}>
              {(busy || step === "confirming") && <Loader2 size={16} className={styles.spin} aria-hidden="true" />}
              {step === "confirming" ? "Confirmando pagamento…" : `Começar ${TRIAL} grátis no cartão`}
            </button>
            {step !== "confirming" && (
              <>
                <div className={styles.or}><span>ou</span></div>
                <button className={styles.pix} type="button" onClick={() => subscribe("pix")} disabled={busy}>
                  {PLANS[plan].pix}
                </button>
                <p className={styles.fine}>O Pix libera {plan === "yearly" ? "1 ano" : "30 dias"} de acesso, sem renovação automática.</p>
              </>
            )}
            <p className={styles.fine}><ShieldCheck size={14} aria-hidden="true" /> Pagamento seguro processado pela Stripe.</p>
          </section>
        )}

        {step === "done" && (
          <section className={`${styles.card} ${styles.done}`}>
            <span className={styles.doneIcon}><Smartphone size={26} aria-hidden="true" /></span>
            <h1>{alreadySubscribed ? "Você já tem acesso" : "Assinatura ativa"}</h1>
            <p>
              Abra o app FitGen no iPhone e entre com <strong>{session?.email}</strong>. Tudo já está liberado.
            </p>
            {paid && <p className={styles.fine}>A Stripe envia o recibo para o seu email.</p>}
            {error && <p className={styles.error} role="alert">{error}</p>}
            <button type="button" className={styles.switch} onClick={manage} disabled={busy}>Gerenciar assinatura</button>
            <a className={styles.switch} href={SUPPORT}>Precisa de ajuda? Fale com o suporte</a>
          </section>
        )}
      </main>
    </div>
  );
}
