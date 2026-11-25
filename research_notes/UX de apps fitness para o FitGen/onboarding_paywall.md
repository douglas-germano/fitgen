# Onboarding, time-to-first-value e freemium/paywall em apps de saúde e fitness com assinatura (notas para o FitGen)

Fontes principais: RevenueCat State of Subscription Apps (SOSA) 2025 e 2026, Adapty State of In-App Subscriptions (SOIS) 2026, State of Paywalls 2026 e State of Onboarding 2026, e o case study da Superwall sobre o Cal AI. Lembrete de escopo: o SOSA 2026 cobre dados de 2025 de mais de 115 mil apps e US$16 bi em receita ([RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)). A categoria Health & Fitness do SOSA também inclui apps médicos ([rirlift summary](https://www.rirlift.com/blog/fitness-app-statistics/)).

## 1. Benchmarks de assinatura em Health & Fitness (trial, paywall, mix de planos, LatAm/Brasil)

### Takeaway
Health & Fitness é uma das categorias que melhor monetizam: tem a maior receita por install, a maior conversão de trial e é dominada por plano anual. Quase toda a decisão acontece no Dia 0, e paywalls no onboarding com trial são os que mais convertem. LatAm converte download→pago perto do piso global, mas é a região que mais cresce. Em LatAm, H&F tem a menor taxa de início de trial por visualização de paywall de todas as categorias.

### Cited Findings
**Conversão (RevenueCat, 2025 data / SOSA 2026)**
- Mediana de H&F: 6,9% de download→trial em até 30 dias (top performers >23%), 37,7% de trial→pago (top quartil >51,4%) e 2,9% de download→pago no D35 (top quartil >6,2%) — [rirlift, citing RevenueCat SOSA 2026](https://www.rirlift.com/blog/fitness-app-statistics/); [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)
- H&F lidera a receita por install (RPI) no D14, com mediana de US$0,48 (Gaming: US$0,08). O RPI do D60 é US$0,66 — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps); [rirlift](https://www.rirlift.com/blog/fitness-app-statistics/)
- No ano anterior (SOSA 2025), a mediana de trial→pago de H&F era 39,9% e o top 10% chegava a 68,3% — [RevenueCat SOSA 2025](https://www.revenuecat.com/state-of-subscription-apps-2025)
- 82,1% dos inícios de trial em H&F acontecem no Dia 0. "Users who don't try immediately rarely try at all." Os dias 1–3 captam a maior parte do restante (5–12%) — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)
- 55% de todos os cancelamentos de trials de 3 dias acontecem no Dia 0. O "aha" precisa vir na primeira sessão — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)
- Hard paywall vs. freemium (todas as categorias): download→pago no D35 de 10,7% vs. 2,1% (cerca de 5x), com retenção no ano 1 "nearly identical". O RPI do D14 é US$2,32 vs. US$0,27. O RevenueCat diz que o freemium "remains the right call when free users drive word of mouth, network effects, or long-term brand scale" — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps); [RevenueCat blog](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026)

**Mix de planos e preço**
- 68% das assinaturas de H&F são anuais (Gaming: 82% semanal; Productivity: 77% mensal). O anual gera 59% da receita de H&F — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)
- Na Adapty, a fatia de receita do anual em H&F subiu de 51% para 61% em dois anos. É a única categoria em que o anual está crescendo, enquanto o semanal gera 55,6% da receita no mercado geral — [Adapty on X / SOIS 2026](https://x.com/adapty/status/2036139195073221058); [Adapty H&F benchmarks](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/)
- Os preços de H&F se concentram em US$9,99/mês e US$39,94/ano — [rirlift, citing RevenueCat](https://www.rirlift.com/blog/fitness-app-statistics/). O plano mensal mediano de H&F fica no topo das categorias (US$9,99), e o semanal, no piso — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)
- O anual gera cerca de 2x o RPI do mensal e cerca de 5x o do semanal (RPI D14 de US$0,36 / US$0,18 / US$0,07) — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)
- Apps de H&F com preço alto (top 25%) ganham bem mais. Em H&F, o anual caro rende 4,5x mais por usuário do que o barato. A diferença de preço do anual entre países chega a 4,4x (Alemanha vs. Turquia) — [Adapty H&F benchmarks](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/); [Adapty on X](https://x.com/adapty/status/2036139195073221058)
- H&F tem o maior LTV por install de todas as categorias: US$1,21 — [Adapty H&F benchmarks](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/)

**Duração do trial**
- Em H&F, trials de 5–9 dias convertem mais do que os de 10–16 dias (46,8% vs. 40,4%). A primeira renovação sobe com trials mais longos, de 51,5% (≤4 dias) a 77,1% (17–32 dias). A recomendação é verificar se o usuário continua treinando nos dias extras — [RevenueCat, free trial length (Aug 2025–Jul 2026, 17k+ apps)](https://www.revenuecat.com/blog/growth/free-trial-length)
- Nos planos mensais em LatAm, MEA e IN/SEA, a conversão é maior com trial de 5–9 dias e menor com 17–32 dias — [RevenueCat, free trial length](https://www.revenuecat.com/blog/growth/free-trial-length)
- 79% dos trials no geral duram 1–3 dias, mas 55% dos trials de H&F duram 4–7 dias. H&F tem menos cancelamentos precoces e o maior trial→pago. Trials de 7 dias performam melhor em planos mensais e anuais. 32% dos trials são cancelados em até 1 hora e 44% em até 24 horas — [Adapty State of Paywalls 2026 blog](https://adapty.io/blog/paywall-optimization-tests/)
- Usuários de trial renovam 8–60% melhor na primeira renovação do que compradores diretos. Para o anual em H&F, o trial aumenta o LTV — [Adapty H&F benchmarks](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/)

**Posicionamento do paywall**
- Paywalls no onboarding convertem quase 4x mais do que os posteriores (0,85% vs. 0,23% das visualizações). 93% das primeiras compras acontecem no dia do install e 60% dos compradores assinam na primeira visualização do paywall. Ainda assim, paywalls depois da primeira sessão trazem 38% da receita de assinaturas. H&F é a categoria em que 40% dos compradores precisam de mais de uma exposição — [Adapty State of Paywalls 2026 blog](https://adapty.io/blog/paywall-optimization-tests/)
- Paywall de onboarding com trial é a melhor combinação, com 1,78% de install→pago em média (num post da Adapty no X aparece 1,35%; os dois números constam em materiais da Adapty, então a discrepância é anotada) — [Adapty H&F benchmarks](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/); [Adapty on X](https://x.com/adapty/status/2036139195073221058)
- Em H&F, quem converte o faz no Dia 0 ou nos dias 4–7 (fim de um trial de 7 dias), com "almost nothing in between". Recomendação: um caminho no Dia 0, uma reativação nos dias 4–7 e pouco investimento em nudges nos dias 1–3 — [Adapty H&F benchmarks](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/)
- Hard paywall: LTV 21% maior. Soft paywall: cerca de 50% mais conversão bruta — [Adapty H&F benchmarks](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/)
- O layout com o anual pré-selecionado e o trial nele aumentou o ARPU em 25–40% nos testes vencedores. Telas explicando o trial: +12–36%. Onboarding personalizado: +13–35%. Só 2% dos headlines de paywall usam respostas do onboarding e só 4% dos apps mostram uma segunda oferta quando o paywall é fechado — [Adapty State of Paywalls 2026 blog](https://adapty.io/blog/paywall-optimization-tests/)
- Desconto só depois que o usuário fecha o paywall do onboarding. Nove em cada dez assinaturas são vendidas a preço cheio — [Adapty on X](https://x.com/adapty/status/2036139195073221058)

**LatAm / Brasil**
- O download→pago no D35 em LatAm (1,5%) fica perto do piso (IN/SEA: 1,4%). As diferenças geográficas de conversão são menores do que as de receita — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)
- LatAm tem o maior crescimento mediano de receita (17,2%) entre as regiões de sede de desenvolvedores — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)
- O LTV realizado por pagante no ano 1 tem mediana global de US$23 e de US$32 na América do Norte. Em H&F, o RLTV de 1 ano é US$35,64 — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps); [rirlift](https://www.rirlift.com/blog/fitness-app-statistics/)
- H&F tem a menor taxa de início de trial de todas as regiões fora dos EUA: 1,46% dos que veem o paywall em LatAm e MEA (2,93% na Europa). Depois do trial, porém, H&F é a categoria que mais converte (19,8% em MEA a 33,3% nos EUA). "The drop happens at the paywall" — [Adapty State of Paywalls 2026 blog](https://adapty.io/blog/paywall-optimization-tests/)
- A conversão mediana de visualização→pago em LatAm subiu 5% entre o FY24 e o FY26 — [Adapty State of Paywalls 2026 blog](https://adapty.io/blog/paywall-optimization-tests/)
- A mediana do anual cai de US$39,99 nos EUA para US$30,11 em LatAm, enquanto o semanal fica em cerca de US$6,99. H&F é a categoria mais barata em todas as regiões — [Adapty State of Paywalls 2026 blog](https://adapty.io/blog/paywall-optimization-tests/)
- Um caso de LatAm citado no SOSA 2026: ancorar o anual padrão ao equivalente mensal ("só R$X por mês") aumentou o início de trial em 30% sem afetar o trial→pago e elevou a adoção do anual em 10% — [RevenueCat SOSA 2026 (contributor essay)](https://www.revenuecat.com/state-of-subscription-apps)
- A Apple recomenda preços cerca de 21% abaixo dos EUA, mas a maioria dos apps vai 50–80% abaixo. Um app (Impulse) removeu o plano anual no Brasil — [RevenueCat price localization](https://www.revenuecat.com/blog/growth/price-localization-for-apps)

### Inferences
- R$299/ano ≈ US$50–55 e R$29,90/mês ≈ US$5–5,5, dependendo do câmbio. O anual do FitGen está acima da mediana de LatAm (US$30) e da mediana global de H&F (US$39,94), e o mensal está abaixo da mediana de H&F (US$9,99). A relação anual/mensal de cerca de 10x é mais alta do que a típica (cerca de 4x). Vale testar um anual mais barato ou exibir o anual como "R$24,92/mês".
- O trial de 7 dias está na faixa ideal para H&F (5–9 dias) e para planos mensais em LatAm.
- Freemium com gate de IA tende a ter conversão de download→pago perto dos 2,1% do freemium, e não dos 10,7% do hard paywall. Para manter a base gratuita sem abrir mão do Dia 0, o caminho é um soft paywall forte no fim do onboarding (depois da revelação do plano), mais uma segunda oferta e paywalls contextuais.
- Pix, que é pré-pago e não renova automaticamente, provavelmente não se encaixa nas curvas de renovação dos benchmarks. Acompanhar à parte.

### Gaps
- Não encontrei taxas de conversão do Brasil isoladamente, nem dados de checkout Pix vs. IAP. Os relatórios só agregam "Latin America".
- Não verifiquei se a seção "AI vs non-AI" do SOSA 2026 tem números de trial/RPI para apps de IA (o conteúdo existe, mas eu não o extraí).

## 2. Boas práticas de onboarding (tamanho, personalização, revelação do plano, permissões, conta)

### Takeaway
Onboardings de H&F são longos (12 telas na mediana) e quase sempre personalizados (88%). Fluxos longos completam menos, mas geram trials mais qualificados e mais receita por abertura. A maior perda é na primeira tela. O paywall deve vir no fim, depois de uma tela de "gerando seu plano", e repetindo as respostas do usuário.

### Cited Findings
- A mediana de onboarding tem 5 telas, mas H&F tem 12. A conclusão cai de 89,7% (1–5 telas) para 62,8% (21+), mas fluxos com 21+ telas rendem US$1,39 por abertura, contra US$0,36 nos curtos. H&F tem a menor conclusão entre as categorias (65,1%) — [Adapty State of Onboarding 2026](https://adapty.io/state-of-onboarding/)
- O trial→pago sobe de 19,7% (fluxos de 1–5 telas) para cerca de 30% (11+ telas), e o cancelamento no primeiro dia cai de 59,8% para 36–41% — [Adapty State of Onboarding 2026](https://adapty.io/state-of-onboarding/)
- 10,2% das sessões terminam na primeira tela, 5x mais do que em qualquer tela posterior. A partir da tela 3, cada tela perde ≤1,5% — [Adapty State of Onboarding 2026](https://adapty.io/state-of-onboarding/)
- 14 de 20 apps top mostram o primeiro paywall depois da última tela do onboarding. 94,7% de quem completa o onboarding vê um paywall em até 1 dia, contra 1,2% de quem desiste antes — [Adapty State of Onboarding 2026](https://adapty.io/state-of-onboarding/)
- 88% dos apps top de H&F personalizam o onboarding (quiz, montagem do plano, tela que repete as respostas), mas só 9% dos paywalls mostram nome, objetivo ou data-alvo. A mediana de onboarding→pago em 30 dias é 1,75% — [Adapty State of Onboarding 2026](https://adapty.io/state-of-onboarding/)
- Tela de carregamento do plano personalizado ("Analisando suas preferências, montando seu plano…") com prova social entre a última pergunta e o paywall — [Adapty on X / SOIS 2026](https://x.com/adapty/status/2036139195073221058)
- O Cal AI usa mais de 25 cards de onboarding antes de um paywall sob medida — [Adapty personalization guide](https://adapty.io/blog/how-to-personalize-onboarding-and-paywalls-in-your-mobile-app/). Rodou 61 experimentos só no paywall do onboarding — [Superwall Cal AI case study](https://superwall.com/case-studies/cal-ai)
- Permission priming: uma tela explicativa antes do prompt do sistema aumenta o opt-in de push em 30–40% (cerca de 60–70% com priming vs. 40–50% sem). Essa é uma fonte de agência secundária atribuindo o dado à RevenueCat/OneSignal, sem conferência no original — [Bolder Apps](https://www.bolderapps.com/blog-posts/app-onboarding-flow-architecture-2026). Fazer o pedido no momento em que gera valor (o Headspace pede notificações no fim de uma sessão) — [Appcues](https://www.appcues.com/blog/mobile-permission-priming)

### Inferences
- O chat do Otto pode servir de "quiz" e de tela de montagem do plano. A primeira mensagem precisa ser de baixo esforço, porque é ali que acontece a maior perda.
- O momento de revelação do plano (o treino gerado) deve vir imediatamente antes do paywall, e o headline deve repetir o objetivo e o prazo informados pelo usuário (só 9% dos concorrentes fazem isso).
- Pedir notificações no momento do lembrete do primeiro treino e HealthKit/Health Connect na hora de registrar a primeira atividade, e não em sequência na abertura.

### Gaps
- Não encontrei dados confiáveis sobre o momento de criar a conta (antes ou depois do paywall). O mesmo vale para taxas de opt-in de HealthKit/Health Connect especificamente.

## 3. Retenção D1/D7/D30 em apps fitness

### Takeaway
As fontes divergem bastante. A faixa plausível para H&F é D1 de 20–30%, D7 de 7–18% e D30 de 3–10%. O melhor preditor de D30 é concluir uma ação significativa no primeiro dia.

### Cited Findings
- Mediana de H&F: D1 25% / D7 10% / D30 5%. Top performers: 35–45% / 15–22% / 8–12%. "Apps that nail first-session activation retain at 2-3x the rate" — [UXCam 2026](https://uxcam.com/blog/mobile-app-retention-benchmarks/)
- H&F: D1 28% / D7 18,13% / D30 8,48% (dados da OneSignal via GetStream) — [GetStream](https://getstream.io/blog/app-retention-guide/). Números conflitantes: D1 20–27%, D7 cerca de 7%, D30 cerca de 3% (Sendbird, via Lovable) — [Lovable](https://lovable.dev/guides/what-is-a-good-retention-rate-for-an-app)
- Todos os apps (AppsFlyer, dados do 3º tri de 2024): iOS 23,9% / 8,3% / 3,7%; Android 20,3% / 5,6% / 2,1% — [GetStream citing AppsFlyer](https://getstream.io/blog/app-retention-guide/)
- Média global da Adjust: D1 26% / D7 13% / D30 7%. O iOS retém mais do que o Android — [Adjust](https://www.adjust.com/resources/guides/user-retention/)
- Renovação de assinatura mensal: a 1ª renovação fica em 53–61% na mediana das categorias, subindo para 73–82% na 3ª. Usuários de mensal reativam em 18–24% dos casos depois de cancelar, contra 4–6% no anual — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)

### Inferences
- Meta para o FitGen: D1 ≥30% e D7 ≥15%, para ficar acima da mediana. Medir "completou o 1º treino do plano no D0/D1" como evento de ativação no PostHog.

### Gaps
- Não encontrei retenção específica do Brasil para fitness. Os benchmarks das agregadoras têm metodologia pouco transparente.

## 4. Como apps fitness "AI-first" travam a IA e apresentam o upgrade

### Takeaway
O caso mais documentado é o Cal AI: hard paywall no fim de um onboarding longo, mais dezenas de gatilhos contextuais ao longo do ciclo de vida. Não encontrei fontes primárias de 2024–2026 sobre os paywalls de Fitbod, Future e Ladder.

### Cited Findings
- Cal AI: 123 testes A/B, 46 pontos de gatilho, 160 designs e 424 variantes. A receita mensal mais que triplicou em 10 meses e o trial→pago subiu 31%. Começou com "one onboarding paywall" e foi adicionando prompts em "moments where intent was high". Chegou a cerca de US$40M/ano e foi adquirido pelo MyFitnessPal em março de 2026 — [Superwall Cal AI case study](https://superwall.com/case-studies/cal-ai)
- O paywall do Cal AI usa o anual no topo, pré-selecionado, com o trial nele — [Adapty State of Paywalls 2026 blog](https://adapty.io/blog/paywall-optimization-tests/)
- Críticas de usuários a esse modelo: "painfully long [onboarding], only to end at a paywall… expensive" (discussão anedótica no Reddit) — [Reddit r/SaaS](https://www.reddit.com/r/SaaS/comments/1i0mthc/how_the_fastgrowing_calai_app_is_converting_like/)
- A receita de apps de H&F foi de US$4,5 bi em 2025 (+13%), com a IA como tema de crescimento — [Sensor Tower via rirlift](https://www.rirlift.com/blog/fitness-app-statistics/) (original: [Sensor Tower](https://sensortower.com/blog/health-and-fitness-apps-ai))

### Inferences
- Para o FitGen, o padrão aplicável é: registro grátis e paywalls contextuais nos pontos de alta intenção (abrir o chat do Otto depois do onboarding, pedir um plano novo, estimar uma refeição por foto, pedir um plano de dieta). Cada gatilho deve mostrar uma prévia do resultado (por exemplo, o plano gerado parcialmente visível) e oferecer o trial de 7 dias. A segunda oferta com desconto fica só para depois que o usuário fecha o paywall.
- Um trial grátis de uma ação de IA (por exemplo, a primeira geração de plano no onboarding) serve como aha no Dia 0, o que conversa com o dado de que 82% dos trials começam no Dia 0.

### Gaps
- Não consegui verificar como Fitbod, Future e Ladder fazem o gate e o paywall (o rate limit da busca impediu mais pesquisa). Faltam também dados sobre os limites de mensagens em coaches de IA freemium. Recomendo uma pesquisa manual (App Store e screenshots do Mobbin).
