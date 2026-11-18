import type { Metadata } from "next";
import StoreLinks from "./store-links";

export const metadata: Metadata = {
  title: "Assinatura confirmada | FitGen",
  description: "Sua assinatura do FitGen está ativa. Baixe o app e entre com o mesmo email.",
  robots: { index: false },
};

/** Stripe Checkout success_url: works without any stored session (new tab, in-app browser…). */
export default function SubscriptionConfirmedPage() {
  return <StoreLinks />;
}
