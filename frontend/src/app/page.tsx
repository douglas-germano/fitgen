"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Check,
  Dumbbell,
  Target,
  TrendingUp,
  Award,
  Shield,
  Clock,
  Home,
  Building2,
  LineChart,
  BadgeCheck,
  Info,
} from "lucide-react";

export default function LandingPage() {
  const checkoutUrl = "https://pay.kiwify.com.br/14AVh4x";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm text-muted-foreground">
              <BadgeCheck className="h-4 w-4 text-primary" />
              Treinos personalizados e ajustados continuamente
            </div>

            <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-7xl bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-1000">
              Treino personalizado que se adapta à sua rotina e à sua evolução.
            </h1>

            <p className="mt-6 text-lg sm:text-xl leading-8 text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-150">
              O FitGen cria um plano de treino adequado ao seu nível, objetivos e tempo disponível — e ajusta a progressão
              conforme você executa e registra seus treinos. Sem planilhas genéricas. Sem “achismo”.
            </p>

            <div className="mt-10 flex items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
              <Link href={checkoutUrl}>
                <Button
                  size="lg"
                  className="text-lg px-8 py-6 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
                >
                  Começar teste gratuito de 7 dias
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-sm text-muted-foreground animate-in fade-in duration-1000 delay-500">
              7 dias grátis • Cancele quando quiser • Sem fidelidade
            </p>

            {/* Trust mini-grid */}
            <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                {
                  icon: Clock,
                  title: "Compatível com rotinas curtas",
                  desc: "Treinos ajustados ao tempo que você realmente tem.",
                },
                {
                  icon: LineChart,
                  title: "Progressão baseada em execução",
                  desc: "Ajustes conforme seu desempenho e histórico.",
                },
                {
                  icon: Shield,
                  title: "Cancelamento simples",
                  desc: "Sem burocracia para cancelar quando quiser.",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border bg-card/50 p-6 text-left hover:bg-card transition-colors"
                >
                  <item.icon className="h-6 w-6 text-primary" />
                  <p className="mt-3 font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Problem / Context */}
      <section className="py-24 sm:py-32 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              A maioria das pessoas não falha por falta de disciplina.
              <span className="text-primary"> Falha por seguir um plano que não se encaixa.</span>
            </h2>

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-8">
                <p className="text-lg font-semibold">O que acontece na prática</p>
                <ul className="mt-4 space-y-3 text-muted-foreground">
                  {[
                    "Treinos genéricos ignoram rotina, tempo e limitações.",
                    "A intensidade costuma estar errada (excesso ou subcarga).",
                    "Sem ajuste, a evolução trava e o treino perde sentido.",
                    "O resultado vira dor, frustração e abandono.",
                  ].map((t, i) => (
                    <li key={i} className="flex gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-border bg-card p-8">
                <p className="text-lg font-semibold">O que normalmente tentam fazer</p>
                <div className="mt-4 space-y-4 text-muted-foreground">
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    Trocar o treino toda semana sem critério.
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    Seguir planilhas prontas que não consideram seu nível.
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    Aumentar carga ou volume “no impulso”, sem progressão.
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-5">
                  <p className="text-foreground font-semibold">O problema real</p>
                  <p className="mt-2 text-muted-foreground">
                    Falta um sistema que acompanhe execução e ajuste o plano com consistência.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-10 text-lg text-muted-foreground">
              Treino que funciona não é o mais “difícil”. É o que você consegue executar com regularidade e evoluir
              com progressão coerente.
            </p>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              O FitGen foi criado para resolver o ponto que quase todos ignoram: adaptação contínua.
            </h2>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Você começa com um plano compatível com o seu contexto. A partir daí, o sistema ajusta volume, intensidade
              e progressão com base no que você executa — para manter evolução consistente sem “achismo”.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                icon: Target,
                title: "Plano alinhado ao seu objetivo",
                desc: "Emagrecimento, condicionamento, força ou ganho de massa, respeitando seu nível atual.",
              },
              {
                icon: TrendingUp,
                title: "Ajuste conforme histórico real",
                desc: "O treino evolui conforme sua execução e feedback, mantendo progressão sustentável.",
              },
              {
                icon: Dumbbell,
                title: "Treino em casa ou academia",
                desc: "O plano se adapta ao ambiente e ao equipamento disponível.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-border bg-card p-8 hover:shadow-xl hover:border-primary/40 transition-all"
              >
                <item.icon className="h-10 w-10 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 sm:py-32 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-12">Como funciona</h2>
          </div>

          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Defina objetivo, nível e disponibilidade",
                  desc: "Você informa sua rotina, experiência e ambiente de treino.",
                  icon: Target,
                },
                {
                  step: "2",
                  title: "Receba um plano compatível com seu contexto",
                  desc: "Sem generalidades: treino dimensionado para você executar de verdade.",
                  icon: Dumbbell,
                },
                {
                  step: "3",
                  title: "Registre e evolua com ajustes automáticos",
                  desc: "O sistema ajusta progressão conforme seu histórico e resposta ao treino.",
                  icon: TrendingUp,
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="relative flex flex-col p-8 bg-card rounded-2xl border border-border hover:border-primary/50 transition-all hover:shadow-xl"
                >
                  <div className="absolute -top-4 left-8 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold shadow-lg">
                    {item.step}
                  </div>
                  <item.icon className="h-10 w-10 text-primary mt-6 mb-4" />
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-2xl border border-border bg-card p-8">
              <div className="flex items-start gap-4">
                <Info className="h-6 w-6 text-primary mt-1" />
                <div>
                  <p className="font-semibold">Importante</p>
                  <p className="mt-1 text-muted-foreground">
                    O FitGen auxilia na construção e ajuste do treino com base nas informações fornecidas e no seu
                    histórico. Se você tem lesões, dores persistentes ou condições clínicas, busque liberação médica
                    antes de iniciar qualquer rotina de treino.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-12">
              O que muda quando você treina com um sistema
            </h2>
          </div>

          <div className="mx-auto mt-16 max-w-5xl grid grid-cols-1 gap-6 md:grid-cols-2">
            {[
              {
                title: "Treino coerente com seu nível",
                desc: "Você começa no ponto certo e evolui com progressão planejada, reduzindo risco de excesso ou subcarga.",
              },
              {
                title: "Mais consistência, menos fricção",
                desc: "Quando o treino cabe na rotina, a frequência aumenta — e o resultado aparece como consequência.",
              },
              {
                title: "Evolução mensurável",
                desc: "Histórico e acompanhamento para você entender o que está funcionando e por quê.",
              },
              {
                title: "Flexibilidade sem bagunça",
                desc: "Mudou a rotina? O plano se ajusta sem você precisar recomeçar do zero.",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border bg-card p-8 hover:border-primary/40 hover:shadow-xl transition-all"
              >
                <div className="flex items-start gap-4">
                  <Check className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-lg font-semibold">{item.title}</p>
                    <p className="mt-2 text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-14 max-w-5xl rounded-2xl border border-border bg-muted/30 p-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="flex items-center gap-3">
                <Home className="h-5 w-5 text-primary" />
                <p className="text-muted-foreground">Treino em casa</p>
              </div>
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-primary" />
                <p className="text-muted-foreground">Treino na academia</p>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <p className="text-muted-foreground">Rotinas curtas ou completas</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Differential */}
      <section className="py-24 sm:py-32 bg-primary/5">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="bg-card border-2 border-primary/20 rounded-2xl p-8 md:p-12 shadow-xl">
              <Award className="h-12 w-12 text-primary mb-6" />
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
                Treino pronto não é personalização. É apenas conteúdo.
              </h2>
              <p className="text-lg text-muted-foreground">
                O FitGen não entrega uma planilha fixa. Ele opera como um sistema: você executa, registra, e o plano é
                ajustado para manter progressão e aderência à rotina.
              </p>
              <div className="mt-8">
                <Link href={checkoutUrl}>
                  <Button size="lg" className="text-lg px-8 py-6 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                    Começar teste gratuito de 7 dias
                  </Button>
                </Link>
                <p className="mt-3 text-sm text-muted-foreground">
                  7 dias grátis • Cancele quando quiser • Sem fidelidade
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">Acesso completo ao FitGen</h2>

            <div className="mt-10 flex flex-col items-center gap-6">
              <div className="text-center">
                <p className="text-5xl font-bold tracking-tight">R$ 19,90</p>
                <p className="text-lg text-muted-foreground mt-2">por mês</p>
              </div>

              <p className="text-lg text-muted-foreground max-w-xl">
                Teste por 7 dias. Se fizer sentido para sua rotina, continue. Se não fizer, cancele em poucos cliques.
              </p>

              <Link href={checkoutUrl}>
                <Button size="lg" className="text-lg px-8 py-6 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                  Começar teste gratuito de 7 dias
                </Button>
              </Link>

              <div className="mt-8 p-6 bg-muted/50 rounded-2xl border border-border max-w-xl">
                <Shield className="h-8 w-8 text-primary mx-auto mb-4" />
                <p className="text-sm text-center text-foreground/90">
                  <strong>Sem fidelidade.</strong> Se o FitGen não se encaixar na sua rotina, basta cancelar. Sem taxas,
                  sem burocracia.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 sm:py-32 bg-muted/30">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Perguntas frequentes</h2>
          </div>

          <div className="space-y-6">
            {[
              {
                q: "O que é o FitGen?",
                a: "O FitGen é um aplicativo que cria e ajusta planos de treino de forma personalizada, com base nos seus objetivos, nível físico, rotina e evolução ao longo do tempo.",
              },
              {
                q: "Serve para iniciantes?",
                a: "Sim. O plano é montado de acordo com seu nível atual. Você começa com um treino adequado e evolui de forma gradual.",
              },
              {
                q: "Preciso treinar em academia?",
                a: "Não. O FitGen adapta o plano para treino em casa ou na academia, considerando o equipamento disponível.",
              },
              {
                q: "Quanto tempo preciso treinar por dia?",
                a: "O FitGen ajusta o treino ao tempo que você informa ter disponível, criando rotinas curtas ou completas de forma realista.",
              },
              {
                q: "O plano muda com o tempo?",
                a: "Sim. Conforme seu histórico e feedback, o sistema ajusta progressão, volume e intensidade para manter evolução consistente.",
              },
              {
                q: "O FitGen cria dieta?",
                a: "O FitGen pode oferecer orientações gerais e hidratação. Não substitui acompanhamento nutricional clínico.",
              },
              {
                q: "É seguro para quem tem limitações físicas?",
                a: "O sistema considera restrições informadas, mas quem possui lesões, dores persistentes ou condições clínicas deve buscar liberação médica antes de iniciar treinos.",
              },
              {
                q: "Como funciona o teste gratuito?",
                a: "Você tem 7 dias para testar. Se fizer sentido para sua rotina, continue. Se não fizer, você pode cancelar.",
              },
              {
                q: "Posso cancelar quando quiser?",
                a: "Sim. Cancelamento a qualquer momento, sem fidelidade.",
              },
              {
                q: "Qual o valor?",
                a: "R$ 19,90 por mês após o período de teste gratuito.",
              },
              {
                q: "Para quem não é indicado?",
                a: "Para quem precisa de acompanhamento médico/fisioterapêutico específico, ou para quem não pretende seguir nenhuma rotina de treino.",
              },
            ].map((faq, index) => (
              <details
                key={index}
                className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 transition-all"
              >
                <summary className="flex cursor-pointer items-center justify-between p-6 font-semibold text-foreground list-none">
                  <span className="text-lg">{faq.q}</span>
                  <svg
                    className="h-6 w-6 flex-shrink-0 text-muted-foreground group-open:rotate-180 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-6 text-muted-foreground">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
              Se você quer evoluir sem depender de “treino pronto”, comece pelo teste.
            </h2>
            <p className="text-lg text-muted-foreground mb-10">
              Você não precisa decidir agora. Teste por 7 dias, veja se o FitGen encaixa na sua rotina e, se não fizer
              sentido, cancele.
            </p>
            <Link href={checkoutUrl}>
              <Button size="lg" className="text-lg px-8 py-6 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                Começar teste gratuito de 7 dias
              </Button>
            </Link>
            <p className="mt-6 text-sm text-muted-foreground">7 dias grátis • Cancele quando quiser • Sem fidelidade</p>
          </div>
        </div>
      </section>
    </div>
  );
}