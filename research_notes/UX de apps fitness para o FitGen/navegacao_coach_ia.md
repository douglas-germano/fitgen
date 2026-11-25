# Navegação/IA de apps de saúde multi-domínio + UX de coach de IA (FitGen)

Contexto: FitGen = Expo native tabs, 5 abas só com ícone e sem rótulo (Home=feed social público, Treino, Comunidade, Dieta, Medidas); Medidas mistura medidas corporais com o resumo do dia; FAB "+" por aba abre action sheet; coach IA "Otto".
Nota de método: a Firecrawl atingiu o limite de taxa no meio da pesquisa; algumas páginas primárias (Apple HIG tab bars, M3, PubMed/Nature) não puderam ser lidas na íntegra. Os pontos com essa limitação estão marcados.

## 1. Tab bars: rótulos, quantidade, abas só com ícone (HIG, Material 3, NN/g)

### Takeaway
As três fontes concordam: de 3 a 5 destinos, com rótulos de texto curtos sempre visíveis. Abas só com ícone contrariam a orientação de acessibilidade do Material 3 e a evidência da NN/g. As abas "Comunidade" vs "Home (feed)" e "Medidas" são justamente os ícones mais ambíguos do FitGen.

### Cited Findings
- NN/g: "a text label must be present alongside an icon to clarify its meaning"; "Icon labels should be visible at all times"; os ícones de navegação são os que mais precisam de rótulo. Poucos ícones são universais (home, print, search); a maioria é ambígua. "Obscure icon = wasted feature": em um estudo com um ícone de relógio, nenhum participante clicou nele. — [NN/g Icon Usability](https://www.nngroup.com/articles/icon-usability/); vídeo [Yes, Icons Need Text Labels](https://www.nngroup.com/videos/icon-text-labels/)
- Página de acessibilidade da navigation bar do Material 3: "To remain accessible, ensure the full label is always visible. Use a filled icon with a bold label for selected destinations." — [M3 Navigation bar accessibility](https://m3.material.io/components/navigation-bar/accessibility) (trecho do resultado de busca; a página completa não renderizou)
- Diretrizes do M3: "The label text should be a short, meaningful description of each navigation destination and another way for people to understand an icon's meaning." — [M3 Navigation bar guidelines](https://m3.material.io/components/navigation-bar/guidelines) (trecho do resultado de busca)
- Versões antigas do HIG: "In general, use between three and five tabs on iPhone"; usar badges com parcimônia. — [espelho antigo do HIG iOS](https://codershigh.github.io/guidelines/ios/human-interface-guidelines/ui-bars/tab-bars/index.html). A página atual do HIG diz "Use the appropriate number of tabs required to help people navigate your app" — [Apple HIG Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars). AVISO: não consegui extrair o texto completo atual. A orientação de "abas são destinos, não ações; rótulos de uma palavra; evite esconder a tab bar" veio de um resumo gerado por modelo, não de uma citação literal. Confira na página antes de citar.

### Inferences
- Rotular as 5 abas (as native tabs do Expo/UITabBar já suportam títulos) é a mudança de navegação mais barata e de maior evidência.
- "Home" mostrando um feed público e "Comunidade" como aba separada parecem dois destinos sociais. É provável que o usuário não saiba distingui-los só pelo ícone.

### Gaps
- Não encontrei taxas de acerto quantitativas recentes (2024-2026) da NN/g especificamente para tab bars mobile só com ícone.

## 2. Como os principais apps estruturam home e abas

### Takeaway
A tendência de 2025-2026 é uma home no formato "Hoje": um painel denso e rolável com o estado e as ações do dia. O social fica em uma aba própria (o Home do Strava é um feed, mas o app é social antes de tudo). Mesmo uma reformulação centrada no "Hoje" pode sair pela culatra se esconder o fluxo de registro principal (MyFitnessPal 2026).

### Cited Findings
- MyFitnessPal (prévia em fev/2026, lançamento ~abr/2026): o Diário passou a ser a tela de abertura "Today", o hub de registro diário. Plans fica à esquerda do "+" central e Progress à direita. Não dá para voltar ao layout antigo. — [MFP community: new Today tab](https://community.myfitnesspal.com/en/discussion/10950333/introducing-the-brand-new-today-tab); [MFP support](https://support.myfitnesspal.com/hc/en-us/articles/39985611667341); [Progress Overview](https://support.myfitnesspal.com/hc/en-us/articles/45246617814669)
- Reação ao MFP: relatos de que o diário ficou escondido atrás de "View All", que o swipe entre dias foi removido e de uma queda grande na nota média (~1,7 estrela, segundo fonte secundária e não verificada). — [PiunikaWeb](https://piunikaweb.com/2026/04/24/myfitnesspal-new-update-complaints/); [mwm.ai](https://mwm.ai/articles/myfitnesspal-v26-16-0-replaces-diary-with-new-ui-sparking-rating-drop-in-april-2026)
- Strava: as abas mudaram de Feed/Explore/Record/Profile/Training para Home/Maps/Record/Groups/You. Perfil e treino foram fundidos em "You"; Record continua sendo o destino de ação. — [Cycling Weekly](https://cyclingweekly.com/news/product-news/a-new-look-for-strava-app-with-updates-to-the-navigation-bar-498270); [BikeRadar](https://www.bikeradar.com/news/strava-beta-test-layout/); [the5krunner 2025](https://the5krunner.com/2025/07/16/strava-app-redesign/)
- Whoop: a home mostra os scores do dia de Sleep/Recovery/Strain "at a glance". A reformulação de 2025 trocou várias abas com swipe por uma home densa e rolável. O botão "+" e o botão do WHOOP Coach foram reposicionados depois de críticas de que passavam despercebidos. — [WHOOP: all-new home screen](https://www.whoop.com/us/en/thelocker/the-all-new-whoop-home-screen/); [the5krunner Oct 2025](https://the5krunner.com/2025/10/15/whoop-homescreen-gets-a-revamp/); [WHOOP nav bar update](https://www.whoop.com/us/en/thelocker/app-update-navigation-bar)
- Fitbit: app reformulado com o coach Gemini integrado, lançado para usuários Premium (out/2025). — [TechCrunch](https://techcrunch.com/2025/10/27/fitbits-revamped-app-with-gemini-powered-health-coach-rolls-out-to-premium-users/)

### Inferences
- Para o FitGen: mover o resumo do dia (hoje está em Medidas) para uma home de "Hoje" e deixar o feed público como aba "Comunidade" segue o padrão de Whoop/MFP/Fitbit. Mantenha o registro principal (refeição/treino) a um toque, sem esconder atrás de "ver tudo", que foi a lição do MFP.
- O padrão "You" do Strava (perfil + estatísticas + progresso) é um bom modelo para Medidas/Progresso.

### Gaps
- Não verifiquei a estrutura atual de abas de Apple Fitness/Health, Google Fit, Hevy, Oura, Samsung Health e Huawei Health (o limite de taxa interrompeu a busca). Não registrei nenhuma afirmação sobre eles.

## 3. FAB vs ações inline, action sheets

### Takeaway
O Material trata o FAB como a ação primária e construtiva da tela, normalmente uma por tela. O iOS prefere ações na barra de ferramentas/navegação e não dentro de abas. Um FAB que abre um menu de várias ações dilui o "uma ação primária", e o Whoop teve problemas de descoberta com o "+".

### Cited Findings
- Recomenda-se um FAB por tela para a ação mais comum; ocasionalmente dois, para ações distintas e igualmente importantes; nem toda tela precisa de um; o FAB deve ser construtivo (criar, compartilhar, explorar). — [Material 1 FAB](https://m1.material.io/components/buttons-floating-action-button.html); [M2 FAB](https://m2.material.io/develop/ios/components/fabs); [Google Design: Absolutely FAB](https://design.google/library/absolutely-fab-button)
- Guia de layout do Android: para as ações de maior importância, ofereça só uma de cada vez nesse nível. — [Android layout & nav patterns](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns)
- O "+" e o botão do coach do Whoop foram movidos depois de críticas de que passavam despercebidos. — [the5krunner](https://the5krunner.com/2025/10/15/whoop-homescreen-gets-a-revamp/)
- O MFP 2026 usa um "+" central fixo na tab bar como ponto global de registro. — [MFP community](https://community.myfitnesspal.com/en/discussion/10950333/introducing-the-brand-new-today-tab)

### Inferences
- Para o FitGen, em cada aba: se uma ação domina (ex.: Dieta → "registrar refeição"), o FAB deve fazê-la direto. Use o action sheet só quando houver de fato 2 a 4 ações equivalentes. Na home "Hoje", prefira ações inline em cards (ex.: "registrar almoço") a um sheet genérico.

### Gaps
- Não encontrei teste A/B nem estudo da NN/g comparando especificamente FAB→action sheet com ações inline.

## 4. Acessibilidade básica

### Takeaway
Alvos de toque de 44×44 pt, contraste de texto de 4,5:1 (3:1 para texto grande/negrito) verificado nos modos claro e escuro, Dynamic Type sem tamanhos de fonte fixos e rótulos visíveis na navegação.

### Cited Findings
- Alvo de toque mínimo de 44×44 pt (tamanho mínimo de controle no iOS: 28×28 pt); tabela de contraste 4,5:1 até 17 pt e 3:1 para ≥18 pt ou negrito; verificar nos modos claro e escuro; oferecer esquema de maior contraste quando Increase Contrast estiver ativo. — [Apple HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility.md); a tabela foi confirmada por um espelho em [unpkg apple-hig-mcp](https://unpkg.com/apple-hig-mcp@1.1.3/content/accessibility.md) (não vi a tabela diretamente na página da Apple)
- Dynamic Type é uma configuração do sistema; evite fontes de tamanho fixo e teste nos tamanhos grandes. — [Flutter a11y guide](https://docs.flutter.dev/ui/accessibility/ui-design-and-styling.html)
- O WCAG 2.2 AA exige 24 px no mínimo; a regra mais nova da Deque para iOS também usa 24 pt, então os 44 pt da Apple são o padrão mais rígido. — [Deque iOS rules 2025](https://docs.deque.com/devtools-mobile/2025.7.2/en/ios-rules)
- Material 3: rótulo completo sempre visível; selecionado = ícone preenchido + rótulo em negrito. — [M3 nav bar a11y](https://m3.material.io/components/navigation-bar/accessibility)

### Gaps
- Não encontrei orientação de acessibilidade específica para fitness (ex.: legibilidade durante o exercício). Para paletas "volt"/neon, verifique o contraste das cores de destaque sobre fundos escuros e claros.

## 5. UX de coach de IA: proativo vs reativo, transparência, guardrails, confiança, evidências

### Takeaway
Os principais produtos (Whoop Coach, Oura Advisor, Google/Fitbit Health Coach) combinam chat sob demanda com insights proativos baseados nos dados do usuário, se posicionam como "não médicos" com avisos de "a IA pode errar" e (no Google) usam uma estrutura formal de avaliação de segurança. A evidência de eficácia dos chatbots em dieta e atividade física é promissora, mas inconsistente e de baixa qualidade. As estimativas de refeição por foto têm erro grande, então é preciso mostrar a estimativa e exigir revisão do usuário.

### Cited Findings
- WHOOP Coach (lançado em set/2023, GPT-4, ajustado com dados anonimizados de membros + algoritmos da WHOOP): responde a perguntas sobre os dados do próprio usuário sob demanda (ex.: "What was my lowest resting heart rate ever?"). — [OpenAI: WHOOP](https://openai.com/index/whoop/)
- Oura Advisor (31/mar/2025): chat conversacional sobre sono, atividade e tendências; a Oura afirma que ele funciona de forma proativa em segundo plano (detecta mudanças de baseline e ajusta a orientação) e tem "Memories" de padrões anteriores. O aspecto proativo é uma alegação da empresa, sem verificação independente. — [Business Wire](https://www.businesswire.com/news/home/20250331565896/en/Oura-Advisor-an-AI-powered-Personal-Health-Companion-Now-Rolling-Out-to-All-Oura-Members); [Android Central](https://www.androidcentral.com/wearables/oura-ring/oura-rolls-out-its-ai-powered-personal-trainer); [T3](https://www.t3.com/active/fitness-trackers/your-oura-ring-just-got-a-free-upgrade-and-it-might-be-the-smartest-one-yet)
- Google/Fitbit personal health coach: prévia pública nos EUA para Fitbit Premium em 28/out/2025; virou "Google Health Coach" (incluído no Google Health Premium) em mai/2026 e está sendo expandido para outros países. Atua como coach de fitness, especialista em sono e conselheiro de bem-estar. — [Android Authority preview](https://www.androidauthority.com/google-personal-health-coach-preview-launch-3610243/); [Android Authority rebrand](https://androidauthority.com/google-health-app-coach-rebrand-3664205/); [Google blog](https://blog.google/products-and-platforms/products/google-health/google-health-coach/)
- Guardrails do Google: avaliado pela estrutura SHARP (safety, helpfulness, accuracy, relevance, personalization), com >1M de anotações humanas e >100 mil horas de revisão humana por generalistas e especialistas. — [Google Research](https://research.google/blog/how-we-are-building-the-personal-health-coach/); [SHARP PDF](https://services.google.com/fh/files/blogs/winslow_2025_sharp_framework.pdf)
- Avisos do Google: não usar para doença ou condição grave; "AI and can make mistakes"; "not intended for medical purposes". — [Fitbit Help](https://support.google.com/fitbit/answer/16961408?hl=en); [Google AU blog](https://blog.google/intl/en-au/products/devices-services/google-health-coach-is-now-available-in-australia/)
- Precisão da estimativa de refeição por IA: um estudo de 2026 com apoio do NIH (MFP, Lose It!, Cal AI, Appediet; >100 refeições de cozinha metabólica) encontrou erro médio de 250 a 345 kcal por app, com subestimação de ~1/3. Os resultados são preliminares e ainda não passaram por revisão por pares completa. — [Healio](https://www.healio.com/news/primary-care/20260804/ai-photobased-calorietracking-tools-underestimate-them-by-33); [MedicineNet](https://www.medicinenet.com/how_accurate_are_photo_based_calorie_apps/news.htm); [ScienceDaily](https://sciencedaily.com/releases/2026/07/260726015237.htm)
- O fluxo do Meal Scan do MFP inclui uma etapa de revisão: o usuário confere os itens selecionados e ajusta as porções. — [MFP blog: Meal Scan](https://blog.myfitnesspal.com/meal-scan/)
- Evidência: revisão sistemática (JMIR mHealth 2025) de 7 ECRs com chatbots de NLP para dieta, atividade física e tabagismo. Em adultos, a eficácia para dieta e atividade física foi inconsistente; cerca de metade dos estudos tinha alto risco de viés; os participantes viram os chatbots como úteis, críveis e viáveis financeiramente. — [JMIR mHealth 2025 e66403](https://mhealth.jmir.org/2025/1/e66403); [PubMed 40503914](https://pubmed.ncbi.nlm.nih.gov/40503914/)
- Meta-análise anterior (npj Digital Medicine 2023, Zhang/Oh/Fukuoka): chatbots podem melhorar a atividade física e o consumo de frutas e verduras. Não consegui extrair os tamanhos de efeito (paywall/redirect). — [npj Digit Med](https://www.nature.com/articles/s41746-023-00856-1); revisões de viabilidade e aceitabilidade: [JMIR Hum Factors 2023](https://humanfactors.jmir.org/2023/1/e43227), [JMIR 2023 e40789](https://www.jmir.org/2023/1/e40789/), [JMIR mHealth 2023 e39649](https://mhealth.jmir.org/2023/1/e39649)

### Inferences
- Otto deve: (a) mostrar estimativas de refeição como faixas ou valores editáveis, com uma etapa de confirmação, e sinalizar quando a confiança é baixa; (b) ancorar as respostas nos dados registrados pelo próprio usuário e citá-los ("com base nos seus 3 últimos treinos..."); (c) ter um aviso persistente e leve de "não é conselho médico" e um encaminhamento fixo para sintomas, transtornos alimentares, gestação e condições crônicas; (d) aparecer proativamente como um card de insight na home de "Hoje", não só como uma tela de chat (padrão de Whoop/Oura).
- Como a evidência de eficácia é fraca ou inconsistente, posicione Otto como uma ferramenta de conveniência e adesão, e não faça promessas de resultado.

### Gaps
- Noom e as funções de IA do MFP além do Meal Scan não foram pesquisados (limite de taxa).
- Não encontrei estudos revisados por pares sobre calibração de confiança e indicadores de incerteza em coaches LLM de fitness.
- Não verifiquei se a Oura/Whoop mostram indicadores de confiança ou citações de fonte na interface do chat.
