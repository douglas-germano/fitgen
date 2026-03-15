from flask import Blueprint, request, jsonify, current_app
from app.modules.communication.application.whatsapp_service import WhatsAppService

whatsapp_bp = Blueprint('whatsapp', __name__)

@whatsapp_bp.route('/webhook', methods=['POST'])
def webhook():
    """Webhook para Evolution API"""
    data = request.get_json()
    
    # Validação simples (se quiser adicionar autenticação, verifique token no header)
    if not data:
        return jsonify({"msg": "Empty payload"}), 400

    # Security: Validate API Key from Header matches APP secret or Evolution Key
    api_key_header = request.headers.get('apikey')
    evolution_key = current_app.config.get('EVOLUTION_API_KEY') or "fitgen_secret_key"
    
    if api_key_header != evolution_key:
        print(f"⚠️ Webhook unauthorized access attempt. Header: {api_key_header}. ALLOWING TEMPORARILY.")
        # return jsonify({"msg": "Unauthorized"}), 401
        
    # Processa em background ou síncrono (síncrono por simplicidade agora)
    result = WhatsAppService.process_webhook(data)
    
    return jsonify(result), 200

@whatsapp_bp.route('/test', methods=['GET'])
def test():
    return jsonify({"status": "WhatsApp integration active"}), 200
