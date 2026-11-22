from app.modules.coach.infrastructure.ai_service import AIService, build_user_content
from datetime import datetime
import os
import time

from app.shared.extensions import release_db_connection

# Tools that save something: if time runs out after one of them, the user must not retry blindly.
WRITE_TOOLS = {"log_meal", "log_water", "log_exercise_set", "log_body_metric", "start_workout_session"}


def coach_deadline_seconds():
    """Total time for one coach answer (all AI rounds + tools), env COACH_DEADLINE_SECONDS.

    The app's fetch has no timeout of its own, so iOS gives up after ~60 s without data;
    45 s leaves margin. gunicorn's gevent workers don't kill long requests, so past this
    the server would keep spending tokens on an answer nobody receives.
    """
    try:
        return max(5.0, float(os.environ.get("COACH_DEADLINE_SECONDS", "45")))
    except ValueError:
        return 45.0


def coach_timeout_reply(executed_tools):
    if WRITE_TOOLS.intersection(executed_tools):
        return ("Já registrei o que você pediu, mas demorei demais para montar a resposta. "
                "Confira no app antes de pedir de novo, para não registrar em dobro.")
    return "Demorei demais para responder agora. Pode tentar de novo em instantes?"

class CoachAIService:
    """
    Serviço específico para o Coach Virtual (LLM via OpenRouter)
    """
    
    @staticmethod
    def build_system_instruction(context):
        """
        Cria instrução do sistema com dados do usuário
        
        Args:
            context: dict com user_info, metrics, workouts, nutrition, goals
        """
        user = context.get('user_info', {})
        metrics = context.get('metrics', {})
        workouts = context.get('workouts', {})
        nutrition = context.get('nutrition', {})
        goals = context.get('goals', {})
        
        instruction = f"""Você é Otto, o assistente de fitness e nutrição do FitGen, personalizado para {user.get('name', 'o usuário')}.

PERFIL DO USUÁRIO:
- Peso atual: {metrics.get('current_weight', 'N/A')}kg
- Altura: {user.get('height', 'N/A')}cm
- IMC: {metrics.get('bmi', 'N/A')}
- % Gordura: {metrics.get('body_fat', 'N/A')}%
- Objetivo: {goals.get('fitness_goal', 'N/A')}
- Nível: {user.get('fitness_level', 'iniciante')}

PROGRESSO (Últimos 7 dias):
- Peso 7 dias atrás: {metrics.get('weight_7d_ago', 'N/A')}kg
- Variação: {metrics.get('weight_change', 'N/A')}kg
- Treinos concluídos: {workouts.get('completed', 0)}/{workouts.get('planned', 0)}
- Média calorias: N/A kcal/dia

HOJE ({datetime.now().strftime('%d/%m/%Y')}):
- Calorias: {nutrition.get('today_calories', 0)}/{nutrition.get('target_calories', 'N/A')}kcal
- Proteína: {nutrition.get('today_protein', 0)}g
- Hidratação: {nutrition.get('today_water', 0)}/{goals.get('hydration_goal', 2500)}ml
- Próximo treino: {workouts.get('next_workout', 'Nenhum agendado')}

DIRETRIZES:
1. Seja motivador, empático e realista
2. Use SEMPRE dados específicos do usuário nas respostas
3. Responda em português brasileiro coloquial
4. Seja conciso: máximo 150 palavras
5. Se faltar dados, pergunte ao usuário
6. Dê sugestões ACIONÁVEIS e específicas
7. Use emojis com moderação (1-2 por mensagem)
8. Seja encorajador mas honesto sobre desafios

IMPORTANTE - USO DE FUNÇÕES (CRÍTICO):
🚨 VOCÊ NÃO TEM PERMISSÃO PARA CONFIRMAR REGISTROS SEM EXECUTAR A FUNÇÃO 🚨

REGRA DE OURO: Para "comer", "beber", "pesar" -> CHAME A FUNÇÃO PRIMEIRO.

1. IDENTIFIQUE a intenção (comer, beber água, peso).
2. EXTRAIA os dados (se faltar, PERGUNTE).
3. EXECUTE a função silenciosamente (`log_meal`, `log_water`, etc.).
4. AGUARDE o retorno da função.
5. SÓ ENTÃO responda ao usuário: "Registrei X..."

PROIBIDO:
- NUNCA diga "Já anotei aqui" se você não tiver disparado a ferramenta.
- NUNCA use sua "memória" para salvar dados. Dados só existem se a função for chamada.

INTENÇÕES ESPECÍFICAS:
- "Comi [alimento]" -> Chame `log_meal(meal_name=..., calories=..., protein=...)`. Estime calorias/proteínas se o usuário não der.
- "Bebi [água]" -> Chame `log_water(amount_ml=...)`.
- "Meu peso é [X]" -> Chame `log_body_metric(weight=...)`.

Se você responder "Registrado" sem chamar a função, você FALHOU na sua missão.
- Após executar a função, confirme com os dados retornados pela função

EXEMPLOS DE BOM COACHING:
❌ "Você precisa treinar mais"
✅ "Vejo que você treinou {workouts.get('completed', 0)}x essa semana - parabéns! 💪 Faltam {max(0, workouts.get('planned', 0) - workouts.get('completed', 0))} treinos para bater sua meta. Que tal agendar um para amanhã?"

❌ "Sua dieta está ruim"  
✅ "Você consumiu {nutrition.get('today_calories', 0)}kcal hoje, meta {nutrition.get('target_calories', 2000)}. Faltam {max(0, nutrition.get('target_calories', 2000) - nutrition.get('today_calories', 0))}kcal. Sugestão para completar!"

IMPORTANTE: Nunca invente dados. Se não tiver informação, diga "não tenho esses dados ainda" e peça ao usuário.
"""
        return instruction
    
    @staticmethod
    def chat(user_context, message_history, new_message, media_attachments=None):
        """
        Envia mensagem e recebe resposta do coach
        
        Args:
            user_context: dict com contexto do usuário
            message_history: lista de dict com role e content
            new_message: string com nova mensagem do usuário
            media_attachments: lista de dict com 'mime_type' e 'data' (bytes)
            
        Returns:
            dict com {response, tokens_used, response_time_ms}
        """
        try:
            from app.modules.coach.application.coach_functions import CoachFunctions, COACH_FUNCTION_DECLARATIONS
            
            ai = AIService()
            
            # Instrução do sistema vai como mensagem "system"
            system_instruction = CoachAIService.build_system_instruction(user_context)
            
            # Monta prompt textual com histórico
            if len(message_history) == 0:
                text_prompt = new_message
            else:
                conversation = ""
                for msg in message_history[-10:]:  # Últimas 10 mensagens
                    role_label = "USUÁRIO" if msg['role'] == 'user' else "COACH"
                    conversation += f"{role_label}: {msg['content']}\n\n"
                
                text_prompt = f"""HISTÓRICO DA CONVERSA:
{conversation}

USUÁRIO: {new_message}"""

            # Prepara conteúdo (Multimodal ou Texto)
            content = build_user_content(text_prompt, media_attachments)
           
            # Create function executor that includes user_id
            user_id = user_context.get('user_info', {}).get('user_id') or user_context.get('user_id')
            
            def function_executor(function_name, args):
                """Execute coach function with user_id injected"""
                # Add user_id to args
                args['user_id'] = user_id
                
                # Get the function from CoachFunctions class
                if hasattr(CoachFunctions, function_name):
                    func = getattr(CoachFunctions, function_name)
                    try:
                        return func(**args)
                    finally:
                        # Free the DB connection before the next AI round trip
                        release_db_connection()
                else:
                    return {"success": False, "error": f"Function {function_name} not found"}
            
            # Envia mensagem com function calling
            start_time = time.time()
            response_text = ai.generate_with_functions(
                content,
                COACH_FUNCTION_DECLARATIONS,
                function_executor,
                system_prompt=system_instruction,
                deadline_seconds=coach_deadline_seconds(),
                timeout_reply=coach_timeout_reply,
            )
            response_time_ms = int((time.time() - start_time) * 1000)
            
            if not response_text:
                return {
                    "response": "Desculpe, tive um problema técnico. Tente novamente em instantes.",
                    "tokens_used": 0,
                    "response_time_ms": 0,
                    "error": "No response from AI provider"
                }
            
            return {
                "response": response_text,
                "tokens_used": None,
                "response_time_ms": response_time_ms
            }
            
        except Exception as e:
            print(f"❌ Coach AI error: {e}")
            import traceback
            traceback.print_exc()
            return {
                "response": "Desculpe, tive um problema técnico. Tente novamente em instantes.",
                "tokens_used": 0,
                "response_time_ms": 0,
                "error": str(e)
            }

