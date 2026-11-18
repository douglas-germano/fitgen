"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { ArrowUpRight, CircleCheck, Mail, Smartphone } from "lucide-react";
import site from "../landing.module.css";
import styles from "./confirmada.module.css";

const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL?.trim();
const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL?.trim();
const SUPPORT = "mailto:suporte@fitgen.com?subject=Assinatura%20FitGen";

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

const noopSubscribe = () => () => {};

function StoreButton({ store, url, primary }: { store: "apple" | "google"; url?: string; primary: boolean }) {
  const label = store === "apple" ? "App Store" : "Google Play";
  const small = store === "apple" ? "Baixar na" : "Disponível no";
  if (!url) {
    return (
      <span className={`${styles.store} ${styles.soon}`} aria-disabled="true">
        <small>Em breve na</small>
        <strong>{label}</strong>
      </span>
    );
  }
  return (
    <a className={`${styles.store} ${primary ? styles.primary : ""}`} href={url} rel="noopener">
      <small>{small}</small>
      <strong>{label} <ArrowUpRight size={16} aria-hidden="true" /></strong>
    </a>
  );
}

export default function StoreLinks() {
  // Static export: "other" while prerendering, the real device after hydration.
  const platform = useSyncExternalStore(noopSubscribe, detectPlatform, () => "other" as Platform);

  useEffect(() => {
    // Clear the checkout session kept by /assinar for the Stripe round trip.
    try { sessionStorage.removeItem("fitgen.assinar.session"); } catch { /* ignore */ }
  }, []);

  const stores = [
    { store: "apple" as const, url: APP_STORE_URL, primary: platform === "ios" },
    { store: "google" as const, url: PLAY_STORE_URL, primary: platform === "android" },
  ];
  if (platform === "android") stores.reverse();
  const anyStore = Boolean(APP_STORE_URL || PLAY_STORE_URL);

  return (
    <div className={`${site.site} ${styles.page}`}>
      <header className={site.dark}>
        <div className={site.header}>
          <Link href="/" className={site.darkLogo} aria-label="FitGen, página inicial">
            <Image src="/brand/fitgen-logo.png" alt="FitGen" width={104} height={30} unoptimized />
            <Image src="/brand/fitgen-logo.png" alt="" width={104} height={30} unoptimized className={site.logoSymbol} />
          </Link>
        </div>
      </header>

      <main className={`${site.wrap} ${styles.main}`}>
        <section className={styles.card}>
          <span className={styles.badge}><CircleCheck size={28} aria-hidden="true" /></span>
          <h1>Assinatura confirmada!</h1>
          <p>Agora é só baixar o app FitGen e entrar com o <strong>mesmo email e senha</strong> que você usou na assinatura. Tudo já está liberado.</p>

          <div className={styles.stores}>
            {stores.map((s) => <StoreButton key={s.store} {...s} />)}
          </div>
          {!anyStore && (
            <p className={styles.note}>O app está chegando às lojas. Avisaremos pelo seu email assim que ele estiver disponível para download.</p>
          )}

          <ol className={styles.steps}>
            <li><Smartphone size={18} aria-hidden="true" /><span>Baixe o FitGen no seu celular.</span></li>
            <li><Mail size={18} aria-hidden="true" /><span>Toque em <strong>Entrar</strong> e use o email da assinatura.</span></li>
            <li><CircleCheck size={18} aria-hidden="true" /><span>Pronto: treinos, dieta e IA Coach liberados.</span></li>
          </ol>

          <p className={styles.fine}>
            Pagou com Pix? A liberação acontece assim que o banco confirma, normalmente em segundos.
            O recibo chega no seu email.
          </p>
        </section>

        <nav className={styles.links} aria-label="Ajuda">
          <Link href="/assinar">Gerenciar assinatura</Link>
          <a href={SUPPORT}>Falar com o suporte</a>
        </nav>
      </main>
    </div>
  );
}
