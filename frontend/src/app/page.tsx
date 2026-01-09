"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, Dumbbell, Target, TrendingUp, Calendar, Award, Shield } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-1000">
              Você não precisa de mais motivação.
            </h1>
            <p className="mt-6 text-2xl sm:text-3xl font-semibold text-foreground/90 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-150">
              Precisa de um plano de treino que se adapte a você.
            </p>
            <p className="mt-8 text-lg leading-8 text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
              O FitGen é um aplicativo que cria e ajusta seus treinos automaticamente,
              com base no seu corpo, rotina e evolução real.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
              <Link href="https://pay.kiwify.com.br/14AVh4x">
                <Button size="lg" className="text-lg px-8 py-6 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                  Começar meu teste gratuito agora
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground animate-in fade-in duration-1000 delay-700">
              7 dias grátis • Cancele quando quiser • Sem fidelidade
            </p>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 sm:py-32 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-destructive/90">
              O problema não é falta de disciplina.
              <br />
              É falta de adaptação.
            </h2>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              A maioria das pessoas começa a treinar com vontade, mas desiste por um motivo simples:
              seguem planos genéricos que não consideram tempo, limitações físicas, nível real ou rotina.
            </p>
            <p className="mt-4 text-lg font-semibold text-foreground">
              O resultado é previsível: dores, estagnação ou abandono.
            </p>
            <div className="mt-8 p-6 bg-destructive/10 border-2 border-destructive/20 rounded-lg">
              <p className="text-base text-foreground/90 font-medium">
                Treinos fixos não funcionam para pessoas reais com rotinas variáveis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              O FitGen resolve isso criando um plano de treino dinâmico, que evolui com você.
            </h2>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Você informa seus objetivos, nível atual e rotina.
              <br />
              O sistema gera o treino ideal e ajusta conforme seu progresso.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 sm:py-32 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-12">
              O funcionamento é simples
            </h2>
          </div>
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Você informa seus dados e objetivos",
                  icon: Target,
                },
                {
                  step: "2",
                  title: "O FitGen monta seu plano personalizado",
                  icon: Dumbbell,
                },
                {
                  step: "3",
                  title: "A cada treino, o sistema ajusta volume, carga e intensidade",
                  icon: TrendingUp,
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="relative flex flex-col items-center p-8 bg-card rounded-2xl border border-border hover:border-primary/50 transition-all hover:shadow-xl"
                >
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold shadow-lg">
                    {item.step}
                  </div>
                  <item.icon className="h-12 w-12 text-primary mt-4 mb-4" />
                  <h3 className="text-lg font-semibold text-center">{item.title}</h3>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-12">
              Com o FitGen, você:
            </h2>
          </div>
          <div className="mx-auto mt-16 max-w-4xl">
            <ul className="space-y-4">
              {[
                "Treina com um plano realmente compatível com seu nível",
                "Evita lesões por excesso ou subcarga",
                "Evolui com ajustes automáticos, sem achismo",
                "Treina em casa ou na academia",
                "Acompanha sua evolução de forma clara",
              ].map((benefit, index) => (
                <li
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Check className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-lg text-foreground/90">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Differential */}
      <section className="py-24 sm:py-32 bg-primary/5">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="bg-card border-2 border-primary/20 rounded-2xl p-8 md:p-12 shadow-xl">
              <Award className="h-12 w-12 text-primary mb-6" />
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
                Diferente de aplicativos com treinos prontos, o FitGen não entrega um plano fixo.
              </h2>
              <p className="text-lg text-muted-foreground">
                Ele reage às suas respostas e adapta o treino continuamente, como um treinador faria.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
              Acesso completo ao FitGen
            </h2>
            <div className="mt-10 flex flex-col items-center gap-6">
              <div className="text-center">
                <p className="text-5xl font-bold tracking-tight">R$ 19,90</p>
                <p className="text-lg text-muted-foreground mt-2">por mês</p>
              </div>
              <p className="text-lg text-muted-foreground max-w-xl">
                Você pode testar gratuitamente por 7 dias e cancelar quando quiser.
              </p>
              <Link href="https://pay.kiwify.com.br/14AVh4x">
                <Button size="lg" className="text-lg px-8 py-6 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                  Começar meu teste gratuito agora
                </Button>
              </Link>
              <div className="mt-8 p-6 bg-muted/50 rounded-lg border border-border max-w-xl">
                <Shield className="h-8 w-8 text-primary mx-auto mb-4" />
                <p className="text-sm text-center text-foreground/90">
                  <strong>Garantia Total:</strong> Se o FitGen não se encaixar na sua rotina, basta cancelar.
                  Sem fidelidade, sem burocracia.
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
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Perguntas Frequentes
            </h2>
          </div>
          <div className="space-y-6">
            {[
              {
                q: "O que é o FitGen?",
                a: "O FitGen é um aplicativo que cria e ajusta planos de treino de forma personalizada, com base nos seus objetivos, nível físico, rotina e evolução ao longo do tempo."
              },
              {
                q: "O FitGen substitui um personal trainer?",
                a: "O FitGen não é um personal presencial, mas funciona como um sistema de treino inteligente. Ele ajusta volume, intensidade e progressão automaticamente, algo que treinos prontos ou planilhas não fazem."
              },
              {
                q: "O FitGen serve para iniciantes?",
                a: "Sim. O plano é criado de acordo com o seu nível atual. Quem nunca treinou começa com treinos básicos e seguros, com evolução gradual."
              },
              {
                q: "Preciso treinar em academia?",
                a: "Não. O FitGen adapta os treinos para: Treino em casa, Academia, Poucos ou nenhum equipamento. Você informa o que tem disponível, e o plano é ajustado."
              },
              {
                q: "Quanto tempo preciso treinar por dia?",
                a: "O tempo varia conforme seu objetivo e disponibilidade. O FitGen cria treinos compatíveis com rotinas curtas ou mais longas, de forma realista."
              },
              {
                q: "O plano muda com o tempo?",
                a: "Sim. O diferencial do FitGen é justamente o ajuste contínuo. Conforme seu desempenho e feedback, o treino é recalculado."
              },
              {
                q: "O FitGen cria dieta também?",
                a: "O FitGen pode fornecer orientações alimentares gerais e plano de hidratação. Ele não substitui acompanhamento nutricional clínico."
              },
              {
                q: "É seguro para quem tem limitações físicas?",
                a: "O sistema considera restrições informadas pelo usuário. Ainda assim, pessoas com lesões ou condições específicas devem buscar liberação médica antes de iniciar qualquer treino."
              },
              {
                q: "Preciso entender de musculação para usar?",
                a: "Não. Os treinos são descritos de forma clara e objetiva, facilitando a execução mesmo para iniciantes."
              },
              {
                q: "Funciona para quem quer emagrecer?",
                a: "Sim. O FitGen ajusta treinos e intensidade conforme o objetivo informado, incluindo emagrecimento, ganho de força ou condicionamento."
              },
              {
                q: "Funciona para quem quer ganhar massa muscular?",
                a: "Sim. Os planos consideram progressão de carga, volume e descanso, respeitando o nível do usuário."
              },
              {
                q: "Como funciona o período de teste?",
                a: "Você pode testar o FitGen gratuitamente por 7 dias. Durante esse período, tem acesso às funcionalidades principais."
              },
              {
                q: "Posso cancelar quando quiser?",
                a: "Sim. O cancelamento pode ser feito a qualquer momento, sem fidelidade ou taxas adicionais."
              },
              {
                q: "Qual o valor do FitGen?",
                a: "O acesso completo custa R$19,90 por mês após o período de teste gratuito."
              },
              {
                q: "Meus dados ficam seguros?",
                a: "Sim. As informações são utilizadas apenas para personalização dos treinos e funcionamento do aplicativo."
              },
              {
                q: "Para quem o FitGen não é indicado?",
                a: "O FitGen não é indicado para: Quem busca acompanhamento médico ou fisioterapêutico, Quem não pretende seguir nenhum tipo de rotina de treino."
              },
            ].map((faq, index) => (
              <details
                key={index}
                className="group bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-all"
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
                <div className="px-6 pb-6 text-muted-foreground">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-8">
              Pronto para começar sua evolução?
            </h2>
            <Link href="https://pay.kiwify.com.br/14AVh4x">
              <Button size="lg" className="text-lg px-8 py-6 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                Começar meu teste gratuito agora
              </Button>
            </Link>
            <p className="mt-6 text-sm text-muted-foreground">
              7 dias grátis • Cancele quando quiser • Sem fidelidade
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
