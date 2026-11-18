import type { Metadata } from "next";
import SubscribeFlow from "./subscribe-flow";

export const metadata: Metadata = {
  title: "Assinar o FitGen",
  description: "Crie sua conta e assine o FitGen pelo site. Depois é só entrar no app com o mesmo email.",
};

export default function SubscribePage() {
  return <SubscribeFlow />;
}
