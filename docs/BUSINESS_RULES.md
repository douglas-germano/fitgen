# Regras de Negócio - FitGen

Este documento descreve as principais regras de negócio, lógica de aplicação e restrições do sistema FitGen.

## 1. Visão Geral
O **FitGen** é uma plataforma de fitness e nutrição impulsionada por IA (Google Gemini) que cria treinos personalizados, planos de dieta e oferece um Coach Virtual interativo com gamificação.

## 2. Usuários e Perfis

### 2.1. Contas de Usuário
- **Funções (Roles)**:
  - `user`: Usuário padrão com acesso às funcionalidades básicas/premium conforme assinatura.
  - `admin`: Acesso total ao sistema e painéis administrativos.
- **Status da Conta**:
  - `active`: Usuário pode acessar o sistema.
  - `suspended`: Acesso bloqueado (ex: falta de pagamento ou violação de termos).
- **Soft Delete**: Usuários não são removidos fisicamente do banco de dados. O campo `deleted_at` é preenchido, desativando a conta e preservando histórico para auditoria.
- **Último Login**: O sistema registra o `last_login_at` a cada autenticação.

### 2.2. Perfil Físico e Cálculos
- **Dados Obrigatórios**: Idade, Gênero, Altura, Peso Atual, Nível de Atividade, Objetivo (emagrecimento, hipertrofia, etc.).
- **Cálculos Automáticos**:
  - **TMB (Taxa Metabólica Basal)**: Energia gasta em repouso.
  - **GET (Gasto Energético Total / TDEE)**: Calorias diárias necessárias para manter o peso atual, considerando o nível de atividade.
- **Gamificação**:
  - Usuários acumulam `XP` (Experiência) e sobem de `Level` ao completar treinos e registrar refeições.

### 2.3. Autenticação
- **JWT** com access token (30 min) e refresh token (30 dias).
- **Reset de Senha**: Token enviado por email (Brevo) com expiração.
- **Alteração de Senha**: Requer senha atual para validação.

## 3. Geração de Treinos (Workout Planner)

### 3.1. Estrutura do Plano
- Um usuário pode ter apenas **um** plano de treino `active` por vez.
- **Hierarquia**:
  1. `WorkoutPlan` (O programa geral, ex: "Hipertrofia 12 Semanas")
  2. `WorkoutDay` (Divisão semanal, ex: "Segunda - Peito e Tríceps")
  3. `Exercise` (Atividades individuais, ex: "Supino Reto")

### 3.2. Regras de Geração (IA)
- **Motor de IA**: Google Gemini via `GeminiService`.
- **Duração Padrão**: Planos de **12 semanas**.
- **Restrição de Exercícios**:
  - A IA é estritamente proibida de inventar nomes de exercícios.
  - **Deve** utilizar apenas exercícios cadastrados na `ExerciseLibrary`.
  - Caso um exercício sugerido não exista, a IA escolhe o substituto mais próximo ou o sistema trunca o nome para 50 caracteres (fallback).
- **Parâmetros de Entrada**: Equipamentos disponíveis, lesões/limitações e dias disponíveis na semana.

### 3.3. Execução e Logs
- O usuário registra o progresso em `WorkoutSession` (duração, calorias, conclusão).
- Cada exercício possui `ExerciseLog` onde são salvos: Carga utilizada, Repetições feitas, Número da série e Status.

## 4. Coach Virtual (IA)

### 4.1. Personalidade e Diretrizes
- O Coach atua como Personal Trainer e Nutricionista.
- **Tom de Voz**: Motivador, empático, realista, coloquial (PT-BR).
- **Contexto**: A IA recebe o histórico recente (últimos 7 dias) de peso, treinos realizados e alimentação do dia atual.

### 4.2. Function Calling e Comandos
O Coach detecta intenções do usuário e executa funções no backend automaticamente:
- **Log de Alimentação**: Frases como "comi arroz e frango" acionam `log_meal`.
- **Log de Hidratação**: Frases como "bebi um copo d'água" acionam `log_water`.
- **Log de Peso**: Frases como "me pesei hoje, deu 70kg" acionam `log_body_metric`.
- **Início de Treino**: Frases como "vou treinar" acionam `start_workout_session`.
- **Log de Exercício**: Frases como "fiz 3x12 supino com 40kg" acionam `log_exercise_set`.
- **Regra de Ouro**: A IA **nunca** deve responder "registrado" sem efetivamente ter chamado a função e recebido sucesso do sistema.

## 5. Nutrição e Dieta

### 5.1. Preferências
- O sistema armazena restrições alimentares (ex: vegetarianismo, intolerância à lactose), orçamento disponível e habilidades culinárias.
- Metas calóricas e de macronutrientes são calculadas com base no objetivo (Déficit para emagrecimento, Superávit para ganho de massa).

### 5.2. Planos de Dieta
- Gerados por IA (Gemini) para ciclos de **12 semanas**.
- Incluem:
  - Menu semanal detalhado.
  - Lista de compras consolidada.
  - Metas de macros (Proteína, Carboidratos, Gordura).
- É possível regenerar um dia específico sem alterar o resto do plano.
- Cache de dieta desabilitado para evitar dados obsoletos.

### 5.3. Registro de Refeições
- Refeições podem ser registradas por texto ou análise de foto (IA vision).
- Macros estimados: calorias, proteína, carboidratos, gordura, fibra.

### 5.4. Hidratação
- Registro de ingestão de água em ml.
- Meta diária configurável pelo usuário.
- Streak de hidratação acompanhada pela gamificação.

## 6. Métricas e Progresso

### 6.1. Métricas Corporais
- Peso, percentual de gordura corporal e massa muscular registrados ao longo do tempo.
- Detecção de tendência de peso nos últimos 7 dias.

### 6.2. Metas
- Usuário define metas com valor alvo e valor atual.
- Acompanhamento de progresso percentual.

### 6.3. Fotos de Progresso
- Snapshots com fotos antes/depois para acompanhamento visual.

## 7. Gamificação

### 7.1. Sistema de XP e Nível
- XP concedido por: completar treinos, registrar refeições.
- Progressão de nível baseada em XP acumulado.

### 7.2. Streaks (Sequências)
- **Treino**: Dias consecutivos com sessão completada.
- **Nutrição**: Dias consecutivos com refeição registrada.
- **Hidratação**: Dias consecutivos com meta de água atingida.

### 7.3. Conquistas (Achievements)
- Desbloqueadas ao atingir critérios específicos.
- Registro de data/hora do desbloqueio.
- Cada conquista pode conceder XP bônus.

## 8. Integrações e Notificações

### 8.1. Push Notifications
- **Firebase Cloud Messaging (FCM)**: Notificações nativas para iOS/Android.
- **Web Push API**: Notificações no navegador.
- Device tokens armazenados por usuário.

### 8.2. Email
- **Brevo (Sendinblue)**: Envio de emails transacionais (reset de senha, boas-vindas).

### 8.3. WhatsApp
- **Evolution API**: Integração para envio de lembretes e interação via WhatsApp.
- Webhook para recebimento de mensagens.

### 8.4. Pagamentos
- **Stripe**: Checkout de assinaturas, webhook para atualização de status.
- Status de assinatura: `active`, `suspended`, `canceled`, `past_due`.

## 9. Administração

### 9.1. Painel Admin
- Listagem e gerenciamento de usuários (ativar, suspender, excluir, alterar role).
- Estatísticas do sistema.
- Gerenciamento de biblioteca de exercícios.
- Visualização de audit logs.

### 9.2. Auditoria
- Ações administrativas registradas em `AuditLog` com timestamp, ação e detalhes.
