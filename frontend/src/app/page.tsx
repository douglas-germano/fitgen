"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Check,
  X,
  Dumbbell,
  Zap,
  Trophy,
  Target,
  TrendingUp,
  Shield,
  Star,
  ArrowRight,
  Sparkles,
  MessageCircle,
  Clock,
  Brain,
  ChevronDown
} from "lucide-react";
import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background overflow-x-hidden selection:bg-primary/20 selection:text-primary">

      {/* Background Effects */}
      <div className="fixed inset-0 -z-30 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
      <div className="fixed inset-0 -z-20 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))]"></div>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-20 pb-16">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-8 animate-fade-in-up">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary shadow-[0_0_15px_-3px_rgba(var(--primary),0.3)] animate-pulse hover:bg-primary/20 transition-colors cursor-default">
              <Sparkles className="h-4 w-4" />
              <span>O Futuro do Fitness Chegou</span>
            </div>

            {/* Headline */}
            <div className="max-w-4xl mx-auto space-y-4">
              <h1 className="text-4xl font-extrabold tracking-tight lg:text-7xl">
                Seu corpo, sua biologia.
                <span className="block mt-2 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent drop-shadow-sm">
                  Um treino único.
                </span>
              </h1>
              <p className="mx-auto max-w-[700px] text-lg text-muted-foreground md:text-xl leading-relaxed">
                Esqueça treinos genéricos de PDF. O <span className="text-primary font-semibold">FitGen</span> usa Inteligência Artificial para criar, adaptar e evoluir sua rotina dia após dia. É como ter um personal trainer de elite no seu bolso, 24/7.
              </p>
            </div>

            {/* CTA Buttons - Consistent Widths */}
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto min-w-[300px] justify-center pt-4">
              <Link href="https://pay.kiwify.com.br/14AVh4x" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:min-w-[240px] h-14 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all duration-300">
                  Começar Teste Grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:min-w-[240px] h-14 text-base bg-background/50 backdrop-blur-sm border-white/10 hover:bg-white/5 hover:border-primary/20 transition-all duration-300">
                  Já sou Aluno
                </Button>
              </Link>
            </div>

            <div className="pt-8 flex items-center justify-center gap-8 text-sm text-muted-foreground grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" /> 7 Dias de Garantia
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" /> Cancelamento Fácil
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Comparison Section (Old Way vs New Way) */}
      <section className="py-24 border-y border-white/5 bg-white/[0.02]">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Por que o FitGen é superior?</h2>
            <p className="text-muted-foreground mt-4 text-lg">A evolução do personal trainer tradicional.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* The Old Way */}
            <Card className="bg-background/20 border-red-500/10 shadow-none relative overflow-hidden group">
              <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-red-500/20 to-red-500/0"></div>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-red-500/80">
                  <X className="h-6 w-6" /> O Jeito Antigo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  "Treinos genéricos (copia e cola)",
                  "Personal caro (R$ 300+ /mês)",
                  "Horários restritos e inflexíveis",
                  "Demora para ajustar o plano",
                  "Sem acompanhamento diário"
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-muted-foreground group-hover:text-red-400/80 transition-colors">
                    <X className="h-5 w-5 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* The FitGen Way */}
            <Card className="bg-gradient-to-b from-primary/5 to-background border-primary/20 shadow-2xl shadow-primary/5 relative overflow-hidden group transform md:-translate-y-4 md:scale-105 transition-all">
              <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50"></div>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-primary">
                  <Check className="h-6 w-6" /> O Jeito FitGen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  "100% Personalizado pela IA",
                  "Acessível (R$ 19,90/mês)",
                  "Treine onde e quando quiser",
                  "Ajustes em tempo real",
                  "Coach disponível no WhatsApp 24/7"
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 font-medium text-foreground group-hover:text-primary transition-colors">
                    <Check className="h-5 w-5 shrink-0 mt-0.5 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works (Steps) */}
      <section className="py-24 relative">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        <div className="container px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tighter md:text-5xl">Como funciona</h2>
            <p className="mt-4 text-muted-foreground text-xl">Sua jornada para o corpo ideal em 3 passos</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative max-w-6xl mx-auto">
            {/* Connector Line for Desktop */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent -z-10"></div>

            {[
              {
                icon: MessageCircle,
                title: "1. Converse",
                desc: "Conte seus objetivos, limitações e equipamentos para nossa IA no cadastro ou WhatsApp."
              },
              {
                icon: Brain,
                title: "2. A IA Cria",
                desc: "Nossos algoritmos analisam seus dados e geram o plano perfeito para sua biologia."
              },
              {
                icon: TrendingUp,
                title: "3. Evolua",
                desc: "Faça o treino, dê feedback e a IA ajusta a intensidade para o próximo dia."
              }
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex flex-col items-center text-center group">
                  <div className="w-24 h-24 rounded-3xl bg-background border border-white/10 shadow-xl flex items-center justify-center mb-6 group-hover:border-primary/50 group-hover:shadow-[0_0_30px_-5px_rgba(var(--primary),0.3)] transition-all duration-500 relative z-10">
                    <Icon className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed px-4">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 bg-white/[0.02]">
        <div className="container px-4 md:px-6">
          <h2 className="text-3xl font-bold text-center mb-16 tracking-tight">Quem usa, recomenda</h2>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                name: "Ricardo S.",
                role: "Empresário",
                content: "Não tenho tempo a perder. O FitGen me dá exatamente o que preciso fazer em 40min. Resultados incríveis em 2 meses."
              },
              {
                name: "Juliana M.",
                role: "Mãe e Advogada",
                content: "O melhor é poder treinar em casa quando meus filhos dormem. A IA adaptou tudo para os pesos que tenho na sala.",
              },
              {
                name: "Pedro H.",
                role: "Dev",
                content: "Achei que era papo de marketing, mas a progressão de carga é muito inteligente. Evoluí mais aqui do que na academia cara."
              }
            ].map((d, i) => (
              <Card key={i} className="bg-white/5 border-white/5 hover:bg-white/10 transition-colors">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map(s => <Star key={s} className="h-4 w-4 fill-primary text-primary" />)}
                  </div>
                  <p className="text-lg mb-6 italic text-gray-300">"{d.content}"</p>
                  <div>
                    <p className="font-semibold text-white">{d.name}</p>
                    <p className="text-sm text-muted-foreground">{d.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing / Offer Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 -z-10 skew-y-3 transform origin-bottom-right"></div>
        <div className="container px-4 md:px-6">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Investimento Inteligente</h2>
            <p className="text-xl text-muted-foreground">Menos que um café. Mais resultados que uma academia inteira.</p>
          </div>

          <Card className="max-w-lg mx-auto bg-background/80 backdrop-blur-xl border-primary/30 shadow-2xl shadow-primary/10 overflow-hidden">
            <div className="h-2 w-full bg-primary"></div>
            <CardHeader className="text-center pt-8">
              <span className="mx-auto px-3 py-1 bg-primary/10 text-primary text-xs font-bold uppercase rounded-full tracking-wider mb-4">Oferta Limitada</span>
              <CardTitle className="text-3xl">FitGen Premium</CardTitle>
              <div className="flex justify-center items-baseline gap-1 mt-4">
                <span className="text-5xl font-black">R$ 19,90</span>
                <span className="text-xl text-muted-foreground">/mês</span>
              </div>
              <p className="text-sm text-primary font-medium mt-2">7 dias grátis • Cancele quando quiser</p>
            </CardHeader>
            <CardContent className="p-8">
              <ul className="space-y-4 mb-8">
                {[
                  "Acesso ilimitado ao AI Personal",
                  "Integração com WhatsApp",
                  "Planos de Dieta e Hidratação",
                  "Histórico e Métricas detalhadas",
                  "Acesso imediato"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-lg">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="https://pay.kiwify.com.br/14AVh4x" className="block">
                <Button size="lg" className="w-full h-16 text-xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform">
                  QUERO COMEÇAR AGORA
                  <Trophy className="ml-2 h-6 w-6" />
                </Button>
              </Link>
            </CardContent>
            <CardFooter className="justify-center border-t border-white/5 py-4 bg-white/[0.02]">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" /> Garantia incondicional de 7 dias
              </div>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 border-t border-white/5">
        <div className="container px-4 md:px-6 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Perguntas Frequentes</h2>
          <Accordion type="single" collapsible className="w-full">
            {[
              { q: "O FitGen serve para iniciantes?", a: "Absolutamente! Nossa IA adapta o treino para o seu nível, mesmo que você nunca tenha pisado numa academia." },
              { q: "Preciso de equipamentos?", a: "Não. Se você treina em casa sem peso, a IA cria treinos de calistenia (peso do corpo). Se tem equipamentos, ela os inclui." },
              { q: "Posso cancelar se não gostar?", a: "Sim. Você tem 7 dias de garantia total, e depois disso pode cancelar a assinatura a qualquer momento com um clique." },
              { q: "Como acesso o Coach no WhatsApp?", a: "Logo após o cadastro, você ativa o Coach com seu número e já pode conversar com ele 24hs por dia." }
            ].map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-white/10">
                <AccordionTrigger className="text-lg text-left">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 bg-black/20">
        <div className="container px-4 text-center text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-4 text-foreground font-bold text-xl">
            <Sparkles className="h-5 w-5 text-primary" /> FitGen
          </div>
          <p className="mb-8 max-w-md mx-auto">Sua melhor versão, construída com inteligência e dados.</p>
          <p className="text-sm">© 2024 FitGen AI. Todos os direitos reservados.</p>
        </div>
      </footer>

    </main>
  );
}
