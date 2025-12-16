import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Dumbbell, Zap, Trophy, Target, TrendingUp, Shield, Star, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center justify-center">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background -z-20" />
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px] -z-10" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10" />

        <div className="container relative mx-auto px-4 py-20 z-20">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold shadow-[0_0_15px_rgba(var(--primary),0.3)] animate-pulse">
              <Sparkles className="h-3.5 w-3.5" />
              Planos Personalizados com IA
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
              Personal Trainer de
              <span className="block text-primary mt-2 drop-shadow-[0_0_20px_rgba(var(--primary),0.5)]">Inteligência Artificial</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Treinos personalizados que se adaptam ao seu corpo e rotina. Menos que um café por dia, resultados para a vida toda.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <Link href="https://pay.kiwify.com.br/14AVh4x">
                <Button size="lg" className="text-lg px-8 h-14 shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-105 transition-all duration-300">
                  Começar Teste Grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="text-lg px-8 h-14 glass-card hover:bg-white/10 border-white/10">
                  Já sou cliente
                </Button>
              </Link>
            </div>

            <p className="text-sm text-muted-foreground pt-4">
              7 dias grátis • R$ 19,90/mês • Cancele quando quiser
            </p>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 border-y border-white/5 bg-white/[0.02]">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
              Cansado de treinar sem ver resultados?
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                "Treinos genéricos que não evoluem com você",
                "Personal trainer caro que só atende 1h por dia",
                "Começar e parar por falta de motivação",
                "Dúvidas sobre exercícios e execução correta",
              ].map((pain, i) => (
                <div key={i} className="flex items-center gap-4 bg-background/40 p-6 rounded-xl border border-red-500/10 hover:border-red-500/30 transition-colors group">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                    <X className="h-4 w-4 text-red-500" />
                  </div>
                  <p className="text-lg text-muted-foreground group-hover:text-foreground transition-colors">{pain}</p>
                </div>
              ))}
            </div>

            <div className="mt-16 p-8 glass-card border-primary/20 shadow-[0_0_30px_rgba(var(--primary),0.05)] text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-primary/5 -z-10" />
              <p className="text-xl md:text-2xl font-semibold">
                O problema não é falta de vontade.
                <span className="block text-primary mt-2">É a falta de um plano verdadeiramente inteligente.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background -z-10" />
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                FitGen Premium
              </h2>
              <p className="text-xl text-muted-foreground">
                IA que aprende com seu corpo e evolui com você
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
              {[
                {
                  icon: Zap,
                  title: "IA Adaptativa",
                  description: "Treinada com dados de milhares de atletas e personal trainers certificados"
                },
                {
                  icon: Target,
                  title: "Ajuste Inteligente",
                  description: "Aumenta ou diminui intensidade baseado no seu progresso e recuperação"
                },
                {
                  icon: TrendingUp,
                  title: "Adaptação Imediata",
                  description: "Muda treinos instantaneamente baseado em equipamentos disponíveis"
                }
              ].map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <Card key={i} className="glass-card border-white/10 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
                    <CardHeader>
                      <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Icon className="h-7 w-7 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                      <CardDescription className="text-base leading-relaxed mt-2">
                        {feature.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white/[0.02] border-y border-white/5">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
              Tudo que você precisa em um só lugar
            </h2>

            <div className="space-y-4">
              {[
                "Treinos personalizados ilimitados com IA",
                "Acompanhamento completo de métricas e progresso",
                "Planos de dieta e hidratação integrados",
                "Sistema de conquistas para manter motivação",
                "Suporte prioritário quando você precisar",
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-4 glass-card p-4 rounded-lg border-white/5 hover:border-primary/20 transition-all cursor-default">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20">
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                  <span className="text-lg">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-16">
              Resultados reais de quem já usa
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              {[
                {
                  name: "Ana L., 34 anos",
                  quote: "Eu pagava R$ 300 em um Personal que mal olhava para mim. Com o FitGen, pago R$ 19,90 e tenho planos detalhados. Em 3 meses, perdi 8kg e sinto muito mais disposição.",
                },
                {
                  name: "Marcos P., 28 anos",
                  quote: "Como trabalho em casa, precisava de algo flexível. A IA adapta meus treinos para a minha sala. É surreal a precisão. Melhor investimento fitness que já fiz.",
                }
              ].map((testimonial, i) => (
                <Card key={i} className="glass-card border-white/10 hover:bg-white/5 transition-colors">
                  <CardContent className="p-8">
                    <div className="flex gap-1 mb-6">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="h-5 w-5 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6 leading-relaxed text-lg italic">
                      "{testimonial.quote}"
                    </p>
                    <p className="font-bold text-primary">{testimonial.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-8 mt-20 max-w-3xl mx-auto bg-white/5 rounded-2xl p-8 border border-white/5 backdrop-blur-sm">
              <div className="text-center border-r border-white/10 last:border-0">
                <div className="text-4xl font-bold text-primary mb-2">10k+</div>
                <div className="text-sm text-muted-foreground uppercase tracking-wide">Usuários Ativos</div>
              </div>
              <div className="text-center border-r border-white/10 last:border-0">
                <div className="text-4xl font-bold text-primary mb-2">95%</div>
                <div className="text-sm text-muted-foreground uppercase tracking-wide">Satisfação</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">50k+</div>
                <div className="text-sm text-muted-foreground uppercase tracking-wide">Treinos Gerados</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_var(--tw-gradient-stops))] from-primary/10 via-background to-background -z-10" />
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">
                Plano simples e transparente
              </h2>
              <p className="text-xl text-muted-foreground">
                Menos que um café por dia
              </p>
            </div>

            <Card className="glass-card shadow-2xl border-primary/30 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
              <CardHeader className="text-center pb-2 pt-12">
                <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold mb-6 mx-auto uppercase tracking-wider shadow-lg shadow-primary/25">
                  Mais Popular
                </div>
                <CardTitle className="text-3xl mb-4">FitGen Premium</CardTitle>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-6xl font-black text-primary drop-shadow-md">R$ 19,90</span>
                  <span className="text-xl text-muted-foreground font-medium">/mês</span>
                </div>
                <CardDescription className="mt-4 text-base">
                  7 dias grátis • Cancele quando quiser
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-10 pb-12 px-8 sm:px-12">
                <div className="space-y-4 mb-10">
                  {[
                    "Treinos personalizados ilimitados",
                    "Acompanhamento completo de métricas",
                    "Planos de dieta e hidratação",
                    "Sistema de conquistas",
                    "Suporte prioritário",
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                        <Check className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-lg">{feature}</span>
                    </div>
                  ))}
                </div>

                <Link href="https://pay.kiwify.com.br/14AVh4x" className="block">
                  <Button size="lg" className="w-full text-lg h-16 shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-all hover:scale-[1.02]">
                    Começar Agora
                    <Trophy className="ml-2 h-5 w-5" />
                  </Button>
                </Link>

                <div className="mt-8 p-4 bg-background/40 rounded-xl border border-white/5 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Shield className="h-5 w-5 text-primary" />
                    <p className="font-semibold">Garantia de 7 dias</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Não gostou? Cancele sem custo algum
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground opacity-60">
                Pagamento seguro processado via Stripe
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-10">
            <h2 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
              Comece sua transformação hoje
            </h2>

            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed">
              Junte-se a milhares de pessoas que já transformaram seus corpos com treinos inteligentes
            </p>

            <Link href="https://pay.kiwify.com.br/14AVh4x">
              <Button size="lg" className="text-lg px-12 h-20 shadow-xl shadow-primary/20 hover:scale-105 transition-all text-xl">
                Iniciar Teste Grátis de 7 Dias
                <ArrowRight className="ml-3 h-6 w-6" />
              </Button>
            </Link>

            <p className="text-sm text-muted-foreground">
              Sem compromisso • Cancele quando quiser
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
