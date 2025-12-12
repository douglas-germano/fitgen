from app.services.gemini_service import GeminiService
from datetime import datetime
import time

class CoachGeminiService:
    """
    Serviço específico para o Coach Virtual usando Gemini
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
        
        instruction = f"""Você é um coach de fitness e nutrição personalizado para {user.get('name', 'o usuário')}.

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

IMPORTANTE - USO DE FUNÇÕES:
🔴 VOCÊ TEM ACESSO A FUNÇÕES QUE DEVEM SER USADAS OBRIGATORIAMENTE:
- Quando o usuário mencionar que COMEU algo: CHAME a função log_meal com estimativas nutricionais
- Quando o usuário mencionar que BEBEU água: CHAME a função log_water
- NUNCA apenas confirme ou diga que registrou - EXECUTE A FUNÇÃO PRIMEIRO!
- Após executar a função, confirme o registro com os dados retornados

EXEMPLOS DE BOM COACHING:
❌ "Você precisa treinar mais"
✅ "Vejo que você treinou {workouts.get('completed', 0)}x essa semana - parabéns! 💪 Faltam {max(0, workouts.get('planned', 0) - workouts.get('completed', 0))} treinos para bater sua meta. Que tal agendar um para amanhã?"

❌ "Sua dieta está ruim"  
✅ "Você consumiu {nutrition.get('today_calories', 0)}kcal hoje, meta {nutrition.get('target_calories', 2000)}. Faltam {max(0, nutrition.get('target_calories', 2000) - nutrition.get('today_calories', 0))}kcal. Sugestão para completar!"

IMPORTANTE: Nunca invente dados. Se não tiver informação, diga "não tenho esses dados ainda" e peça ao usuário.
"""
        return instruction
    
    @staticmethod
    def chat(user_context, message_history, new_message):
        """
        Envia mensagem e recebe resposta do coach
        
        Args:
            user_context: dict com contexto do usuário
            message_history: lista de dict com role e content
            new_message: string com nova mensagem do usuário
            
        Returns:
            dict com {response, tokens_used, response_time_ms}
        """
        try:
            from app.services.coach_functions import CoachFunctions, COACH_FUNCTION_DECLARATIONS
            
            gemini = GeminiService()
            
            # Monta instrução do sistema
            system_instruction = CoachGeminiService.build_system_instruction(user_context)
            
            # Monta prompt completo
            # Primeira mensagem: inclui system instruction
            if len(message_history) == 0:
                full_prompt = f"""{system_instruction}

USUÁRIO: {new_message}

COACH:"""
            else:
                # Mensagens subsequentes: inclui histórico
                conversation = ""
                for msg in message_history[-10:]:  # Últimas 10 mensagens
                    role_label = "USUÁRIO" if msg['role'] == 'user' else "COACH"
                    conversation += f"{role_label}: {msg['content']}\n\n"
                
                full_prompt = f"""{system_instruction}

HISTÓRICO DA CONVERSA:
{conversation}

USUÁRIO: {new_message}

COACH:"""
           
            # Create function executor that includes user_id
            user_id = user_context.get('user_info', {}).get('user_id') or user_context.get('user_id')
            
            def function_executor(function_name, args):
                """Execute coach function with user_id injected"""
                # Add user_id to args
                args['user_id'] = user_id
                
                # Get the function from CoachFunctions class
                if hasattr(CoachFunctions, function_name):
                    func = getattr(CoachFunctions, function_name)
                    return func(**args)
                else:
                    return {"success": False, "error": f"Function {function_name} not found"}
            
            # Envia mensagem com function calling
            start_time = time.time()
            response_text = gemini.generate_with_functions(
                full_prompt, 
                COACH_FUNCTION_DECLARATIONS,
                function_executor
            )
            response_time_ms = int((time.time() - start_time) * 1000)
            
            if not response_text:
                return {
                    "response": "Desculpe, tive um problema técnico. Tente novamente em instantes.",
                    "tokens_used": 0,
                    "response_time_ms": 0,
                    "error": "No response from Gemini"
                }
            
            return {
                "response": response_text,
                "tokens_used": None,  # Gemini SDK não expõe contagem de tokens facilmente
                "response_time_ms": response_time_ms
            }
            
        except Exception as e:
            print(f"❌ Coach Gemini error: {e}")
            import traceback
            traceback.print_exc()
            return {
                "response": "Desculpe, tive um problema técnico. Tente novamente em instantes.",
                "tokens_used": 0,
                "response_time_ms": 0,
                "error": str(e)
            }

