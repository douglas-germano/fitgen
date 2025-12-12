from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.chat_message import ChatMessage
from app.services.coach_gemini_service import CoachGeminiService
from app.services.coach_context_service import CoachContextService
from app.extensions import db
from app.utils.timezone import now_cuiaba

chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/', methods=['POST'])
@jwt_required()
def send_message():
    """
    Envia mensagem para o coach virtual
    
    Body: { message: string }
    Response: { answer: string, tokens_used: int, response_time_ms: int }
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    message = data.get('message', '').strip()
    if not message:
        return jsonify({"msg": "Message is required"}), 400
    
    try:
        # 1. Coleta contexto do usuário
        context = CoachContextService.get_user_context(user_id)
        
        if "error" in context:
            return jsonify({"msg": context["error"]}), 404
        
        # 2. Busca histórico recente (últimas 10 mensagens)
        history = ChatMessage.query.filter_by(
            user_id=user_id
        ).order_by(ChatMessage.created_at.desc()).limit(10).all()
        
        history_list = [
            {"role": msg.role, "content": msg.content}
            for msg in reversed(history)  # Ordem cronológica
        ]
        
        # 3. Envia para Gemini
        result = CoachGeminiService.chat(context, history_list, message)
        
        if "error" in result and not result.get("response"):
            return jsonify({"msg": "AI service error", "error": result["error"]}), 500
        
        # 4. Salva mensagens no banco
        user_msg = ChatMessage(
            user_id=user_id,
            role='user',
            content=message,
            created_at=now_cuiaba()
        )
        db.session.add(user_msg)
        
        coach_msg = ChatMessage(
            user_id=user_id,
            role='model',
            content=result['response'],
            tokens_used=result.get('tokens_used'),
            response_time_ms=result.get('response_time_ms'),
            created_at=now_cuiaba()
        )
        db.session.add(coach_msg)
        db.session.commit()
        
        return jsonify({
            "answer": result['response'],
            "tokens_used": result.get('tokens_used'),
            "response_time_ms": result.get('response_time_ms')
        }), 200
        
    except Exception as e:
        print(f"Chat error: {e}")
        db.session.rollback()
        return jsonify({"msg": "Error processing message", "error": str(e)}), 500

@chat_bp.route('/history', methods=['GET'])
@jwt_required()
def get_history():
    """Retorna histórico de chat do usuário"""
    user_id = get_jwt_identity()
    limit = request.args.get('limit', 50, type=int)
    
    messages = ChatMessage.query.filter_by(
        user_id=user_id
    ).order_by(ChatMessage.created_at.desc()).limit(limit).all()
    
    return jsonify([
        {
            "id": msg.id,
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at.isoformat()
        }
        for msg in reversed(messages)  # Ordem cronológica
    ]), 200

@chat_bp.route('/clear', methods=['DELETE'])
@jwt_required()
def clear_history():
    """Limpa histórico de chat do usuário"""
    user_id = get_jwt_identity()
    
    ChatMessage.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    
    return jsonify({"msg": "History cleared"}), 200
