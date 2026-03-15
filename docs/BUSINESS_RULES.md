# Regras de Negócio - FitGen

Este documento descreve as principais regras de negócio, lógica de aplicação e restrições do sistema FitGen.

## 1. Visão Geral
O **FitGen** é uma plataforma de fitness e nutrição impulsionada por IA (Google Gemini) que cria treinos personalizados, planos de dieta e oferece um Coach Virtual interativo.

## 2. Usuários e Perfis

### 2.1. Contas de Usuário
- **Funções (Roles)**:
  - `user`: Usuário padrão com acesso às funcionalidades básicas/premium conforme assinatura.
  - `admin`: Acesso total ao sistema e painéis administrativos.
- **Status da Conta**:
  - `active`: Usuário pode acessar o sistema.
  - `suspended`: Acesso bloqueado (ex: falta de pagamento ou violação de termos).
- **Soft Delete**: Usuários não são removidos fisicamente do banco de dados imediatamente. O campo `deleted_at` é preenchido, desativando a conta e preservando histórico para auditoria.

### 2.2. Perfil Físico e Cálculos
- **Dados Obrigatórios**: Idade, Gênero, Altura, Peso Atual, Nível de Atividade, Objetivo (emagrecimento, hipertrofia, etc.).
- **Cálculos Automáticos**:
  - **TMB (Taxa Metabólica Basal)**: Energia gasta em repouso.
  - **GET (Gasto Energético Total / TDEE)**: Calorias diárias necessárias para manter o peso atual, considerando o nível de atividade.
- **Gamificação**:
  - Usuários acumulam `XP` (Experiência) e sobem de `Level` ao completar treinos e registrar refeições.

## 3. Geração de Treinos (Workout Planner)

### 3.1. Estrutura do Plano
- Um usuário pode ter apenas **um** plano de treino `active` por vez.
- **Hierarquia**:
  1. `WorkoutPlan` (O programa geral, ex: "Hipertrofia 12 Semanas")
  2. `WorkoutDay` (Divisão semanal, ex: "Segunda - Peito e Tríceps")
  3. `Exercise` (Atividades individuais, ex: "Supino Reto")

### 3.2. Regras de Geração (IA)
- **Motor de IA**: Utiliza Google Gemini via `GeminiService`.
- **Duração Padrão**: Planos são gerados para um ciclo de **12 semanas**.
- **Restrição de Exercícios**:
  - A IA é estritamente proibida de inventar nomes de exercícios.
  - **Deve** utilizar apenas exercícios cadastrados na `ExerciseLibrary` (Tabela de referência).
  - Caso um exercício sugerido não exista, a IA deve escolher o substituto mais próximo (fallback) ou o sistema trunca o nome para 50 caracteres (regra de segurança).
- **Parâmetros de Entrada**: Considera equipamentos disponíveis (ex: halteres, peso do corpo), lesões/limitações e dias disponíveis na semana.

### 3.3. Execução e Logs
- O usuário registra o progresso em `WorkoutSession`.
- Cada exercício possui `ExerciseLog` onde são salvos: Carga utilizada, Repetições feitas e Status de conclusão.

## 4. Coach Virtual (IA)

### 4.1. Personalidade e Diretrizes
- O Coach atua como Personal Trainer e Nutricionista.
- **Tom de Voz**: Motivador, empático, realista, coloquial (PT-BR).
- **Contexto**: A IA recebe o histórico recente (últimos 7 dias) de peso, treinos realizados e alimentação do dia atual.

### 4.2. Function Calling e Comandos
O Coach detecta intenções do usuário e executa funções no backend automaticamente:
- **Log de Alimentação**: Frases como "comi arroz e frango" acionam `log_meal`.
- **Log de Hidratação**: Frases como "bebi um copo d água" acionam `log_water`.
- **Log de Peso**: Frases como "me pesei hoje, deu 70kg" acionam `log_body_metric`.
- **Regra de Ouro**: A IA nunca deve responder "registrado" sem efetivamente ter chamado a função e recebido sucesso do sistema.

## 5. Nutrição e Dieta

### 5.1. Preferências
- O sistema armazena restrições alimentares (ex: vegetarianismo, intolerância à lactose), orçamento disponível e habilidades culinárias.
- Metas calóricas e de macronutrientes são calculadas com base no objetivo (Déficit para emagrecimento, Superávit para ganho de massa).

### 5.2. Planos de Dieta
- Gerados por IA considerando as preferências.
- Incluem:
  - Menu semanal.
  - Lista de compras consolidada.
  - Metas de macros (Proteína, Carbo, Gordura).

## 6. Integrações e Notificações (Previsto)
- **WhatsApp**: Integração planejada para envio de lembretes e interação rápida (via twilio/evolution api mencionado no histórico).
- **Push Notifications**: Lembretes de treino e água.
