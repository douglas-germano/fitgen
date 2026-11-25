# UX de registro alimentar (nutrition/calorie logging) — evidência para o FitGen

Escopo: MacroFactor, Cal AI, MyFitnessPal, Lose It!, Cronometer, MyNetDiary, Yazio, Fitia. Pesquisa feita em 2026-11-24. Muitas fontes de 2026 são de fornecedores (MyNetDiary, Callie, Calorix) e isso está sinalizado.

## 1. Atrito de registro (ações por entrada, recentes, copiar ontem, templates, quick add, código de barras, voz)

### Takeaway
O único estudo de contagem de ações realista (MyNetDiary, jan/2026, feito pela própria MyNetDiary) mostra de 5,6 a cerca de 8 ações por alimento. O que mais pesa é busca enquanto digita (search-as-you-type), um histórico/recentes bem ordenado e porções flexíveis (frações, unidades caseiras), não o tamanho do banco. A frequência de registro tem relação forte, por degraus, com o resultado.

### Cited Findings
- Teste de 7 dias com 127 entradas idênticas (70 alimentos únicos, 13 leituras de código de barras) em 7 apps. Total de ações: MyNetDiary 711 (5,60 por alimento), Lose It! 872, MacroFactor 877, Noom 896, Yazio 997, Cronometer 1.003, MyFitnessPal 1.035 (+46%). O teste excluiu de propósito "copiar ontem", templates de refeição e escaneamento por IA. A MyNetDiary declara interesse comercial e publicou o dataset. — [MyNetDiary speed test](https://www.mynetdiary.com/which-calorie-tracker-app-is-the-fastest.html)
- O que atrasou cada app: MyFitnessPal não tem search-as-you-type (exige tocar em "Buscar") e tem entradas duplicadas. Cronometer só aceita porção em decimal (15 de 26 biscoitos = 0,577). Yazio usa 100 g como padrão e mostra um popup inevitável após cada refeição. Noom e Yazio exigem rolar uma lista de recentes sem ordenação. No dia 5, a maioria dos registros já era de alimentos repetidos, então histórico acessível é decisivo. O MacroFactor não tinha 10 dos 70 alimentos. — [MyNetDiary speed test](https://www.mynetdiary.com/which-calorie-tracker-app-is-the-fastest.html)
- O MacroFactor criou o Food Logging Speed Index (FLSI), que conta toques em fluxos isolados (2 buscas, multi-add, 1 código de barras, 1 quick-add) em cerca de 20 apps. A MyNetDiary critica o FLSI por usar alimentos genéricos ("banana"). — [MacroFactor FLSI 2025](https://macrofactorapp.com/fastest-food-logger-2025/); [crítica MyNetDiary](https://www.mynetdiary.com/which-calorie-tracker-app-is-the-fastest.html)
- O MacroFactor usa uma linha do tempo em vez de baldes café/almoço/jantar: o alimento recebe o horário automaticamente ("tap +, choose food, log"). Isso elimina a decisão "é lanche ou café?" e evita o desestímulo de registrar algo fora do plano. Selecionar com um toque permite copiar, mover ou remover vários alimentos, horas ou dias inteiros. Há atalhos "Para hoje" e "Para amanhã" e Multi-Paste para planejar a semana. — [MacroFactor Timeline 2.0](https://macrofactor.com/timeline-based-food-logger/)
- O teclado customizado do MacroFactor já abre com a quantidade selecionada e as porções mais comuns ao alcance do polegar. — [MacroFactor Timeline 2.0](https://macrofactor.com/timeline-based-food-logger/)
- Coorte JMIR 2026 (n=5.132 usuários da MyNetDiary, 6 meses): quem registrou 6–7 dias/semana perdeu 11,33% do peso, contra 6,84% de quem registrou menos de 2 dias/semana. Cada dia extra por semana elevou em 35% as chances de perder ≥5% (aOR 1,35). Quem registrou 2–3 dias/semana ainda perdeu 7,35%. Os autores são funcionários da MyNetDiary e o desenho é observacional. — [PMC13472486 / JMIR 2026](https://pmc.ncbi.nlm.nih.gov/articles/PMC13472486/); [resumo MyNetDiary](https://www.mynetdiary.com/food-tracking-and-weight-loss-study.html)
- Sequências de registro acima de 90 dias foram associadas a 11,6% de perda média e 81,2% de usuários com perda ≥5%. — [MyNetDiary study summary](https://www.mynetdiary.com/food-tracking-and-weight-loss-study.html)
- Lose It! (coorte retrospectiva, JMIR mHealth 2019): o uso do recurso de foto foi associado a maior perda de peso, efeito mediado por mais dias registrados. Os autores ressalvam que pode ser apenas autosseleção de usuários mais motivados. — [Neriah et al., JMIR mHealth 2019](https://mhealth.jmir.org/2019/6/e11917)

### Inferences
- No FitGen, a foto ou o texto pelo Otto já cobre o "primeiro registro" rápido. O ganho seguinte vem dos repetidos: recentes e frequentes ordenados no topo, "repetir refeição de ontem" e porções em medida caseira (colher, concha, unidade, fatia) em vez de gramas.
- Vale evitar baldes rígidos ou permitir registrar sem escolher a refeição, inferindo pelo horário como faz o MacroFactor.
- A mensagem "registrar 2–3 dias já ajuda" sustenta um tom de "consistência > perfeição".

### Gaps
- Não encontrei dado de ações por entrada para Fitia, Cal AI ou Yazio com IA. Também não achei dados medidos sobre registro por voz nem sobre o efeito de "copiar ontem" na adesão.

## 2. Registro por foto/IA: precisão, telas de revisão, edição de porção, comunicação de incerteza

### Takeaway
A estimativa só por foto costuma errar 14–36% e tende a subestimar, sobretudo gordura/óleo, porções grandes e pratos mistos. Corrigir ingredientes e quantidades antes de salvar é a maior alavanca: o erro do ChatGPT-5 caiu de 30,5% para 13,9%. O padrão recomendado é mostrar a estimativa, não salvar antes de o usuário confirmar e deixar ele ajustar porção e gordura.

### Cited Findings
- NIH/NIDDK (resumo de congresso, NUTRITION 2026, sem revisão por pares): fotos de 102 refeições pesadas em cozinha metabólica. MyFitnessPal, Lose It!, Cal AI e Appediet subestimaram entre 252 e 345 kcal por refeição (cerca de 1/3), com gordura cerca de 30 g abaixo. Por app: Appediet −252, MFP −327, Lose It −333, Cal AI −345. Refeições keto tiveram resultado pior. — [EurekAlert NIDDK](https://www.eurekalert.org/news-releases/1136415); [Healio](https://www.healio.com/news/primary-care/20260804/ai-photobased-calorietracking-tools-underestimate-them-by-33)
- Aaron Hengist (NIDDK): "People using a photo-based tracking app without adjusting the portions or entering the amounts of food should take the results with a grain of salt." — [EurekAlert](https://www.eurekalert.org/news-releases/1136415)
- ChatGPT-5 em 195 pratos: erro de 30,5% só com foto, 24,4% com descrição curta, 13,9% com foto + ingredientes e quantidades e 18,1% só com ingredientes. — [Rodríguez-Jiménez et al., Nutrients 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12655113/)
- GPT-4o e Claude 3.5 Sonnet erraram 35,8% e Gemini 1.5 Pro errou 64,2% em 52 fotos. A subestimação cresceu com o tamanho da porção e o erro de proteína ficou entre 60,7% e 109,9%. Os autores concluem que os modelos ainda não servem para avaliação precisa. — [Fridolfsson et al., Curr Dev Nutr 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12513282/)
- O ChatGPT-4 identificou 93% dos alimentos em 114 fotos, mas subestimou o peso de refeições médias e grandes. Erro relativo de energia de 27,3%. — [PMC11858203, Nutrients 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC11858203/)
- Revisão sistemática de 52 estudos (2010–2023): erro calórico médio de 0,1% a 38,3%, menor em alimentos simples, com a IA comparável a humanos. — [Shonkoff et al., Ann Med 2023](https://pubmed.ncbi.nlm.nih.gov/38060823/)
- Preprint 2026 com 802 refeições em ensaio de alimentação: 3 de 6 modelos ficaram dentro de 10% na média, mas nenhum atingiu ≤30% de erro por refeição. Todos subestimaram proteína. Ou seja, erro médio baixo não garante acerto em cada refeição. — [Li, arXiv 2610.26538](https://arxiv.org/abs/2610.26538)
- Refeições hospitalares (n=15): os melhores modelos igualaram nutricionistas em energia (r>0,8), mas todos superestimaram gordura em mais de 20%. Os autores pedem "human-in-the-loop". — [Isobe et al., Nutrients 2026](https://doi.org/10.3390/nu18060966)
- Padrões de UX citados por apps: o Callie mostra a estimativa e não salva nada até a confirmação, para o usuário adicionar o óleo ou corrigir a porção. No Cal AI, dá para editar kcal, proteína, carboidrato, gordura e porção tocando em cada valor. Dicas práticas: registrar óleo, manteiga e molho como itens separados (1 colher de sopa de óleo ≈ 120 kcal), "corrigir a porção, manter o alimento" e descrever pratos mistos. — [Callie (fornecedor)](https://www.mycallie.app/en/blog/ai-calorie-accuracy-research); [Reddit sobre Cal AI](https://www.reddit.com/r/Healthy_Recipes/comments/1c21nch/are_imagebased_calorie_apps_like_cal_ai_accurate/)
- Erro clássico de correspondência no banco: "couscous" ligado ao valor do produto seco (376 kcal/100 g) em vez do cozido (112), quase o triplo. Relato anedótico. — [Reddit r/loseit](https://www.reddit.com/r/loseit/comments/1ug4mar/i_checked_whether_ai_photo_calorie_tracking/)
- Leigh Frame (GWU): essas ferramentas são "behavior-change aids rather than precision nutrition instruments". — [Healio](https://www.healio.com/news/primary-care/20260804/ai-photobased-calorietracking-tools-underestimate-them-by-33)
- Reconhecimento de cozinhas fora dos EUA é pior: o cofundador da SnapCalorie admitiu viés para comida americana. Uma tese sobre pratos libaneses chegou a 78,66% de reconhecimento. — [Callie compilação](https://www.mycallie.app/en/blog/ai-calorie-accuracy-research); [TechCrunch 2023](https://techcrunch.com/2023/06/26/snapcalorie-computer-vision-health-app-raises-3m/)

### Inferences
- O Otto deve mostrar uma tela de revisão antes de salvar, com itens decompostos, porção editável em medida caseira e uma pergunta ativa sobre óleo, azeite, manteiga ou molho (principal fonte de subestimação). Pratos brasileiros típicos como feijão com gordura, arroz refogado, farofa e frituras reforçam essa necessidade.
- Faixa de incerteza: mostrar "~650 kcal (±150)" ou um rótulo "estimativa" é coerente com a evidência. Sem evidência de UX testada sobre isso, é uma inferência.
- Texto + foto supera foto sozinha. Vale incentivar o usuário a escrever "com 1 colher de azeite".
- Quando o usuário corrigir um prato, salvar como refeição recorrente para reaproveitar sem novo custo de IA.

### Gaps
- Nenhum estudo mede o que os usuários de fato salvam depois de editar a estimativa num app comercial (a compilação Callie também registra essa lacuna). Não encontrei avaliação de UX de exibição de incerteza nem dados de precisão da IA para comida brasileira.

## 3. Metas de calorias e macros: TDEE, metas adaptativas, metas desconhecidas

### Takeaway
O MacroFactor é a referência: uma tendência de peso suavizada filtra o ruído do dia a dia e o gasto energético é recalculado pela relação entre ingestão registrada e variação da tendência. A meta é ajustada semanalmente e de forma "adherence-neutral", sem punir o usuário por não seguir o plano.

### Cited Findings
- O MacroFactor calcula uma "Trend Weight" que não reage demais a flutuações curtas, mas detecta tendências reais em cerca de 4–5 dias. A partir dela estima o déficit ou superávit e ajusta as metas (por exemplo, de 2500 para 2600 kcal quando o usuário perde peso mais rápido que o previsto). — [MacroFactor algorithms & philosophy](https://macrofactor.com/macrofactors-algorithms-and-core-philosophy/); [Weight Trend help](https://help.macrofactorapp.com/en/articles/21-weight-trend)
- O algoritmo V3 é pelo menos 15% mais preciso para prever a variação semanal e 5% para a mensal. Ele mitiga sinais falsos da água ao trocar entre cutting e bulking e trata ganho e perda de forma simétrica. A estimativa de gasto tende a ficar 0–130 kcal/dia menor que no V2. — [MacroFactor V3](https://macrofactor.com/expenditure-v3/); [Reddit anúncio](https://www.reddit.com/r/MacroFactor/comments/1fzchnu/an_indepth_look_at_macrofactors_new_v3/)
- O MacroFactor publica a precisão do algoritmo, medindo o desvio entre o peso previsto e o observado em um mês. — [MacroFactor algorithm accuracy](https://macrofactor.com/algorithm-accuracy/)
- Se o registro mostra déficit e o peso não mudou em 3 semanas, o registro provavelmente está subestimado, o que conecta o viés da IA ao ajuste adaptativo. — [Callie](https://www.mycallie.app/en/blog/ai-calorie-accuracy-research)

### Inferences
- O fallback fixo de 2000 kcal do FitGen vai contra a prática dos líderes. Melhor estimar o TDEE inicial a partir de perfil e atividade (Mifflin-St Jeor etc.) e marcar como "estimativa inicial". Sem dados, mostrar "meta ainda não definida — crie seu plano com o Otto" em vez de um número arbitrário que vira julgamento.
- Um ajuste adaptativo a partir dos pesos e registros também compensa a subestimação sistemática das fotos.

### Gaps
- Não encontrei pesquisa sobre como exibir metas quando o TDEE é desconhecido nem dados de Fitia e Yazio sobre metas adaptativas.

## 4. Design sem julgamento, riscos de transtorno alimentar, cores vermelho/verde, streaks

### Takeaway
Há associação consistente, ainda que transversal e autorrelatada, entre apps de contagem de calorias e sintomas de transtorno alimentar. A abordagem "adherence-neutral" do MacroFactor (nunca pintar de laranja ou vermelho quem passou da meta) é o exemplo de mercado. Streaks se associam a melhores resultados, mas não há estudo sobre o dano de quebrar uma sequência.

### Cited Findings
- Em 105 pessoas com diagnóstico de transtorno alimentar, cerca de 75% usaram MyFitnessPal e 73% delas acharam que o app contribuiu para o transtorno (30% "muito"). Os autores sugerem psicoeducação e encaminhamento dentro dos apps. — [Levinson et al. 2017, PMC5700836](https://pmc.ncbi.nlm.nih.gov/articles/PMC5700836/)
- Numa amostra comunitária, 71% já tinham usado app de calorias e quem usou relatou mais comer desordenado orientado a magreza e muscularidade. Quem usava por motivo de peso ou forma relatou mais preocupação com comida, pensamento tudo-ou-nada e ansiedade alimentar do que quem usava por saúde. — [Eating Behaviors 2021](https://www.sciencedirect.com/science/article/abs/pii/S1471015321000957)
- O MacroFactor afirma que os círculos de meta no calendário "never turn orange or red, staying true to MacroFactor's adherence-neutral approach". As recomendações de calorias são "adherence-neutral": o usuário não precisa ser perfeito. — [MacroFactor Timeline](https://macrofactor.com/timeline-based-food-logger/); [MacroFactor app](https://macrofactor.com/macrofactor/)
- A tendência de peso também foi pensada para reduzir a catastrofização diante de uma pesagem ruim. — [MacroFactor philosophy](https://macrofactor.com/macrofactors-algorithms-and-core-philosophy/)
- Sequências acima de 90 dias foram associadas aos melhores resultados (dado observacional da MyNetDiary). — [MyNetDiary](https://www.mynetdiary.com/food-tracking-and-weight-loss-study.html)

### Inferences
- Não usar vermelho para "acima da meta". Usar cor neutra e linguagem descritiva ("2.150 de ~2.000 kcal"). Evitar "você estourou".
- Se houver streak, conte "dias registrados na semana" em vez de uma sequência que zera, coerente com o dado "2–3 dias já ajuda". Isto é uma inferência.
- Incluir um caminho de saída: opção de ocultar números de calorias e um link de ajuda para transtorno alimentar (no Brasil, CAPS e serviços como o AMBULIM/HC-FMUSP, a confirmar).

### Gaps
- Não encontrei estudo experimental sobre o efeito de cores vermelho/verde nem sobre o efeito da perda de streak em apps alimentares.

## 5. Registro de hidratação

### Takeaway
A evidência é fraca: só achei padrões de produto (copos predefinidos, registro com um toque, widgets, lembretes, gamificação) e nenhum estudo de UX ou adesão.

### Cited Findings
- WaterMinder: registro rápido "em segundos", copos padrão editáveis e botão "+" para novos copos. — [WaterMinder](https://waterminder.com/)
- Waterllama: personagens, widgets, desafios e app para Apple Watch como motivadores. — [Waterllama](https://waterllama.com/)
- Apps independentes destacam widgets na tela inicial para registro instantâneo, metas e tamanhos de copo customizáveis e lembretes. — [Reddit HydrateTap](https://www.reddit.com/r/iosapps/comments/1n39h4h/i_struggled_with_kidney_stones_my_whole_life_so_i/)

### Inferences
- Para o FitGen: chips de copo de 200/300/500 ml com um toque e desfazer, e talvez um widget. Não justifica um fluxo complexo.

### Gaps
- Não encontrei estudos peer-reviewed sobre UX ou adesão em registro de hidratação.

## 6. Queda de adesão ao longo do tempo e o que ajuda

### Takeaway
O automonitoramento cai rápido: começa a cair entre as semanas 3 e 5, e na semana 10 menos da metade ainda registra. Feedback personalizado ou suporte desaceleram a queda. Menos esforço por registro e foto parecem ajudar, mas a evidência é observacional.

### Cited Findings
- Em dois RCTs mHealth de 24 semanas, menos da metade dos participantes ainda registrava após a semana 10. Outros estudos mostram início da queda entre as semanas 3 e 5. O melhor marcador de adesão foi registrar ≥2 ocasiões alimentares por dia. Os autores recomendam intervenções adaptativas precoces. — [PMC6856872](https://pmc.ncbi.nlm.nih.gov/articles/PMC6856872/)
- Num programa digital (JMIR 2025), a adesão caiu em todos os grupos, mais rápido no grupo de autogestão do que nos grupos com feedback personalizado ou suporte intensivo. Os autores atribuem a queda à carga cognitiva e à perda da novidade. — [JMIR 2025 e65431](https://www.jmir.org/2025/1/e65431/)
- Mais semanas de automonitoramento consistente se associaram a maior perda percentual de peso. — [PMC9159560](https://pmc.ncbi.nlm.nih.gov/articles/PMC9159560/)
- A adesão a registrar alimentação e peso cai significativamente com o tempo, ao contrário da de atividade física. — [Butryn et al. 2020](https://pure.johnshopkins.edu/en/publications/digital-self-monitoring-does-adherence-or-association-with-outcom/)
- Há protocolo de 2026 testando lembretes com enquadramento de perda versus de consistência para aumentar o registro de refeições (sem resultados ainda). — [JMIR Res Protoc 2026](https://www.researchprotocols.org/2026/1/e100239)
- Automonitoramento detalhado versus simplificado foi comparado num programa digital. — [Patel et al., JMIR Formative 2022](https://formative.jmir.org/2022/12/e42191) (não li os resultados completos)

### Inferences
- As semanas 3–5 são a janela crítica. Um contato proativo do Otto quando a frequência de registro cair, mais feedback personalizado semanal, se alinha à evidência.
- Um modo "registro simplificado" (só foto, sem macros) pode reter quem abandonaria, mas falta confirmar com o resultado de Patel 2022.

### Gaps
- Faltam resultados do estudo de lembretes de 2026 e do Patel 2022. Não há dados de retenção de Cal AI ou Fitia.

## Nota: banco de dados de alimentos brasileiros (TACO / TBCA)

### Cited Findings
- A TACO (UNICAMP), 4ª edição de 2011, cobre cerca de 597 alimentos em 15 categorias. — [TACO 4ª ed. PDF (CFN)](https://cfn.org.br/wp-content/uploads/2017/03/taco_4_edicao_ampliada_e_revisada.pdf); [app TACO na Play Store](https://play.google.com/store/apps/details?id=com.defapp.tacopremium)
- A TBCA (USP/BRASILFOODS) é desenvolvida desde 2013 e está na 7ª versão, com app próprio. É a alternativa mais atualizada. — [TBCA](https://www.tbca.net.br/); [Jornal da USP](https://jornal.usp.br/universidade/aplicativo-traz-versao-atualizada-da-tabela-brasileira-de-alimentos/)
- Ferramentas brasileiras combinam TACO, a tabela do IBGE (POF) e marcas comerciais. — [Tabela TACO Online](https://www.tabelatacoonline.com.br/)

### Inferences
- Para o Otto, ancorar as estimativas em TBCA/TACO + IBGE e diferenciar cru de cozido (o erro do cuscuz se repete com arroz e feijão) tende a reduzir erros de correspondência.

### Gaps
- Não encontrei estudo comparando a precisão de MyFitnessPal, FatSecret ou Fitia em alimentos brasileiros, nem avaliação de IA por foto em pratos brasileiros.
