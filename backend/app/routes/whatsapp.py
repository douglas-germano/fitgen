from flask import Blueprint, request, jsonify, current_app
from app.services.whatsapp_service import WhatsAppService

whatsapp_bp = Blueprint('whatsapp', __name__)

@whatsapp_bp.route('/webhook', methods=['POST'])
def webhook():
    """Webhook para Evolution API"""
    data = request.get_json()
    
    # Validação simples (se quiser adicionar autenticação, verifique token no header)
    if not data:
        return jsonify({"msg": "Empty payload"}), 400
        
    # Processa em background ou síncrono (síncrono por simplicidade agora)
    result = WhatsAppService.process_webhook(data)
    
    return jsonify(result), 200

@whatsapp_bp.route('/test', methods=['GET'])
def test():
    return jsonify({"status": "WhatsApp integration active"}), 200
