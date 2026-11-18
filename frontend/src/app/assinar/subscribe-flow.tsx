"use client";

/**
 * fitgen.pro/assinar — web checkout (RevenueCat Web Billing, charged through Stripe).
 *
 * 1. The visitor signs in or creates a FitGen account (same API as the app).
 * 2. The RevenueCat SDK is configured with the FitGen user id as `appUserId`, so the web
 *    purchase unlocks the same `premium` entitlement the iPhone app uses.
 * 3. After paying, the RevenueCat webhook updates the backend; we poll `profile/me` until
 *    `has_access` flips and tell the user to open the app.
 *
 * The app itself never links here (App Store rule 3.1.1); this page is reached from the site.
 */
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Check, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import type { Package, Purchases as PurchasesClient } from "@revenuecat/purchases-js";
import site from "../landing.module.css";
import styles from "./assinar.module.css";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://dev-api.fitgen.pro/api").replace(/\/$/, "");
const RC_WEB_KEY = process.env.NEXT_PUBLIC_REVENUECAT_WEB_KEY?.trim();
const SUPPORT = "mailto:suporte@fitgen.com?subject=Assinatura%20FitGen";

type Session = { token: string; userId: string; email: string; name: string };
type Step = "account" | "offer" | "confirming" | "done";

class ApiError extends Error {}

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
    throw new ApiError(String(fieldErrors?.[0] || data?.msg || data?.message || "Algo deu errado. Tente de novo."));
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

/** "P1W" / "P7D" / "P1M" → "7 dias" / "1 mês". */
function describePeriod(iso?: string | null) {
  const match = iso?.match(/^P(\d+)([DWMY])$/);
  if (!match) return null;
  const n = Number(match[1]);
  const [unit, plural] = { D: ["dia", "dias"], W: ["semana", "semanas"], M: ["mês", "meses"], Y: ["ano", "anos"] }[match[2] as "D"];
  if (match[2] === "W") return `${n * 7} dias`;
  return `${n} ${n === 1 ? unit : plural}`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function SubscribeFlow() {
  const [step, setStep] = useState<Step>("account");
  const [mode, setMode] = useState<"register" | "login">("register");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [session, setSession] = useState<Session | null>(null);
  const [purchases, setPurchases] = useState<PurchasesClient | null>(null);
  const [pkg, setPkg] = useState<Package | null>(null);
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const change = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function loadOffer(s: Session) {
    const me = await call<{ has_access?: boolean }>("/profile/me", { token: s.token });
    if (me.has_access) {
      setAlreadySubscribed(true);
      setStep("done");
      return;
    }
    if (!RC_WEB_KEY) throw new ApiError("A assinatura pelo site abre em breve. Fale com a gente pelo suporte.");
    const { Purchases } = await import("@revenuecat/purchases-js");
    const client = Purchases.configure({ apiKey: RC_WEB_KEY, appUserId: s.userId });
    const offerings = await client.getOfferings({ currency: "BRL" });
    const offer = offerings.current?.availablePackages[0];
    if (!offer) throw new ApiError("Nenhum plano disponível agora. Tente de novo em instantes.");
    setPurchases(client);
    setPkg(offer);
    setStep("offer");
  }

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
      const login = await call<{ access_token: string; user: { id: string; email: string; name: string } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password: form.password }),
      });
      const s = { token: login.access_token, userId: login.user.id, email: login.user.email, name: login.user.name };
      setSession(s);
      await loadOffer(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function subscribe() {
    if (!purchases || !pkg || !session) return;
    setError("");
    setBusy(true);
    try {
      await purchases.purchase({ rcPackage: pkg, customerEmail: session.email, selectedLocale: "pt" });
    } catch (err) {
      const { ErrorCode, PurchasesError } = await import("@revenuecat/purchases-js");
      setBusy(false);
      if (err instanceof PurchasesError && err.errorCode === ErrorCode.UserCancelledError) return;
      setError(err instanceof Error ? err.message : "Não foi possível concluir o pagamento.");
      return;
    }
    // Paid. The webhook usually lands within seconds; wait for the backend to agree.
    setStep("confirming");
    for (let i = 0; i < 20; i++) {
      try {
        const me = await call<{ has_access?: boolean }>("/profile/me", { token: session.token });
        if (me.has_access) break;
      } catch {
        /* keep waiting */
      }
      await sleep(3000);
    }
    setBusy(false);
    setStep("done");
  }

  const product = pkg?.webBillingProduct;
  const trial = describePeriod(product?.freeTrialPhase?.periodDuration);
  const period = describePeriod(product?.normalPeriodDuration);

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
          {["Conta", "Pagamento", "Pronto"].map((label, i) => {
            const current = { account: 0, offer: 1, confirming: 1, done: 2 }[step];
            return <li key={label} data-state={i < current ? "done" : i === current ? "current" : "todo"}>{label}</li>;
          })}
        </ol>

        {!RC_WEB_KEY && (
          <section className={styles.card}>
            <h1>Assinatura pelo site em breve</h1>
            <p>Enquanto isso, fale com a gente para assinar o FitGen.</p>
            <a className={site.button} href={SUPPORT} style={{ marginTop: 20 }}>Falar com o suporte</a>
          </section>
        )}

        {RC_WEB_KEY && step === "account" && (
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

        {(step === "offer" || step === "confirming") && product && (
          <section className={`${styles.card} ${styles.offer}`}>
            <div className={styles.planHead}><h1>FitGen Completo</h1>{period && <span>{period === "1 mês" ? "MENSAL" : period.toUpperCase()}</span>}</div>
            <p className={styles.price}>
              {product.currentPrice.formattedPrice}
              {period && <span>/{period === "1 mês" ? "mês" : period}</span>}
            </p>
            {trial && <p className={styles.trial}><strong>{trial} grátis</strong>. A primeira cobrança só acontece depois do teste, e você pode cancelar antes.</p>}
            <ul className={styles.benefits}>
              {["Treinos e dieta gerados por IA", "IA Coach 24h", "Medidas, progresso e hidratação", "Sem fidelidade: cancele quando quiser"].map((b) => (
                <li key={b}><Check size={18} aria-hidden="true" />{b}</li>
              ))}
            </ul>
            <p className={styles.account}>Conta: <strong>{session?.email}</strong></p>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <button className={site.button} type="button" onClick={subscribe} disabled={busy}>
              {busy && <Loader2 size={16} className={styles.spin} aria-hidden="true" />}
              {step === "confirming" ? "Confirmando pagamento…" : trial ? `Começar ${trial} grátis` : "Assinar agora"}
            </button>
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
            <p className={styles.fine}>Enviamos o recibo e o link para gerenciar a assinatura para o seu email.</p>
            <a className={styles.switch} href={SUPPORT}>Precisa de ajuda? Fale com o suporte</a>
          </section>
        )}
      </main>
    </div>
  );
}
