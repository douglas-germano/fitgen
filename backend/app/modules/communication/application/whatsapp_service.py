import requests
from flask import current_app
import os
from app.modules.identity.domain.models import User
from app.modules.coach.application.coach_gemini_service import CoachGeminiService
from app.modules.coach.application.coach_context_service import CoachContextService
from app.modules.coach.domain.chat_message import ChatMessage
from app.shared.extensions import db
from app.shared.utils.timezone import now_cuiaba
import re

class WhatsAppService:
    @staticmethod
    def sanitize_phone(phone):
        """Metodo para limpar o telefone e garantir que apenas números sejam usados."""
        return re.sub(r'\D', '', phone)

    @staticmethod
    def send_message(phone, text):
        """Envia mensagem de texto via Evolution API"""
        api_url = current_app.config.get('EVOLUTION_API_URL') or os.environ.get('EVOLUTION_API_URL')
        api_key = current_app.config.get('EVOLUTION_API_KEY') or os.environ.get('EVOLUTION_API_KEY')
        instance_name = current_app.config.get('EVOLUTION_INSTANCE_NAME') or os.environ.get('EVOLUTION_INSTANCE_NAME', 'FitGen')
        
        if not api_url or not api_key:
            print(f"❌ Evolution API configuration missing. URL: {api_url}, Key: {api_key}")
            return False
            
        # Ensure URL doesn't end with slash
        api_url = api_url.rstrip('/')
        
        url = f"{api_url}/message/sendText/{instance_name}"
        
        payload = {
            "number": phone,
            "text": text
        }
        
        headers = {
            "apikey": api_key,
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            return True
        except Exception as e:
            print(f"❌ Error sending WhatsApp message: {e}")
            if 'response' in locals() and response:
                print(f"Response: {response.text}")
            return False

    @staticmethod
    def get_media_base64(message_full_data, instance_name, api_url, api_key):
        """
        Retrieves base64 content of a media message from Evolution API v2
        """
        try:
            url = f"{api_url}/chat/getBase64FromMediaMessage/{instance_name}"
            
            # Construct a clean minimal WAMessage to avoid "ephemeralMessage" errors in Evolution
            
            clean_message = {
                "key": message_full_data.get("key"),
                "pushName": message_full_data.get("pushName"),
                "messageTimestamp": message_full_data.get("messageTimestamp"),
                "messageContextInfo": message_full_data.get("messageContextInfo"),
                "message": {}
            }
            
            # Copy only the media part to the new message object
            original_msg_content = message_full_data.get("message", {})
            
            if "imageMessage" in original_msg_content:
                clean_message["message"]["imageMessage"] = original_msg_content["imageMessage"]
            elif "audioMessage" in original_msg_content:
                clean_message["message"]["audioMessage"] = original_msg_content["audioMessage"]
            elif "videoMessage" in original_msg_content:
                clean_message["message"]["videoMessage"] = original_msg_content["videoMessage"]
            elif "documentMessage" in original_msg_content:
                clean_message["message"]["documentMessage"] = original_msg_content["documentMessage"]
            elif "stickerMessage" in original_msg_content:
                clean_message["message"]["stickerMessage"] = original_msg_content["stickerMessage"]
            else: # Fallback
                print(f"DEBUG: Unknown media type in get_media_base64")
                clean_message["message"] = original_msg_content

            # Sanitize types (String -> Int, Base64 -> Buffer format) because Evolution API might expect specific types
            def sanitize_for_api(obj):
                if isinstance(obj, dict):
                    new_obj = {}
                    for k, v in obj.items():
                        if k == 'fileLength' and isinstance(v, str) and v.isdigit():
                            new_obj[k] = int(v)
                        elif k in ['mediaKey', 'fileSha256', 'fileEncSha256', 'jpegThumbnail', 'firstScanSidecar', 'scansSidecar', 'midQualityFileSha256'] and isinstance(v, str):
                            new_obj[k] = v 
                        else:
                            new_obj[k] = sanitize_for_api(v)
                    return new_obj
                elif isinstance(obj, list):
                    return [sanitize_for_api(i) for i in obj]
                else:
                    return obj

            # Apply cleaning only to the inner media message
            for mtype in ["imageMessage", "audioMessage", "videoMessage", "documentMessage"]:
                if mtype in clean_message["message"]:
                    clean_message["message"][mtype] = sanitize_for_api(clean_message["message"][mtype])

            payload = {
                "message": clean_message,
                "convertToMp4": False
            }
            
            headers = {
                "apikey": api_key,
                "Content-Type": "application/json"
            }
            
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            return data.get('base64')
            
        except Exception as e:
            print(f"❌ Error getting media base64: {e}")
            try:
                if 'response' in locals():
                    print(f"Response Body: {response.text}")
            except:
                pass
            return None

    @staticmethod
    def process_webhook(data):
        """Processa webhook recebido da Evolution API"""
        try:
            print(f"DEBUG: Processing webhook data...")
            event_type = data.get('event')
            
            if event_type != 'messages.upsert':
                print(f"DEBUG: Ignored event type: {event_type}")
                return {"status": "ignored", "reason": f"event_type: {event_type}"}
                
            body = data.get('data', {})
            key = body.get('key', {})
            
            if key.get('fromMe'):
                print("DEBUG: Ignored message fromMe")
                return {"status": "ignored", "reason": "fromMe"}
                
            remote_jid = key.get('remoteJid')
            if not remote_jid:
                print("DEBUG: No remoteJid found")
                return {"status": "ignored", "reason": "no_remoteJid"}
                
            phone = remote_jid.split('@')[0]
            
            # Extract Message Content
            message_content = body.get('message', {})
            
            # Initialize variables
            text = None
            media_attachments = []
            
            # --- MESSAGE TYPE HANDLING ---
            
            # 1. Plain Text
            if 'conversation' in message_content:
                text = message_content['conversation']
            elif 'extendedTextMessage' in message_content:
                text = message_content['extendedTextMessage'].get('text')
                
            # 2. Image
            elif 'imageMessage' in message_content:
                text = message_content['imageMessage'].get('caption', "Analise esta imagem.")
                print(f"DEBUG: Detected Image Message. Caption: {text}")
                
                # Fetch Image Base64
                api_url = current_app.config.get('EVOLUTION_API_URL') or os.environ.get('EVOLUTION_API_URL')
                api_key = current_app.config.get('EVOLUTION_API_KEY') or os.environ.get('EVOLUTION_API_KEY')
                instance_name = current_app.config.get('EVOLUTION_INSTANCE_NAME') or os.environ.get('EVOLUTION_INSTANCE_NAME', 'FitGen')
                
                if api_url and api_key:
                    api_url = api_url.rstrip('/')
                    base64_data = WhatsAppService.get_media_base64(body, instance_name, api_url, api_key)
                    
                    if base64_data:
                        import base64
                        if ',' in base64_data:
                            base64_data = base64_data.split(',')[1]
                            
                        media_attachments.append({
                            "mime_type": message_content['imageMessage'].get('mimetype', 'image/jpeg'),
                            "data": base64.b64decode(base64_data)
                        })
            
            # 3. Audio
            elif 'audioMessage' in message_content:
                 print("DEBUG: Detected Audio Message")
                 
                 api_url = current_app.config.get('EVOLUTION_API_URL') or os.environ.get('EVOLUTION_API_URL')
                 api_key = current_app.config.get('EVOLUTION_API_KEY') or os.environ.get('EVOLUTION_API_KEY')
                 instance_name = current_app.config.get('EVOLUTION_INSTANCE_NAME') or os.environ.get('EVOLUTION_INSTANCE_NAME', 'FitGen')
                 
                 if api_url and api_key:
                    api_url = api_url.rstrip('/')
                    base64_data = WhatsAppService.get_media_base64(body, instance_name, api_url, api_key)
                    
                    if base64_data:
                        import base64
                        if ',' in base64_data:
                            base64_data = base64_data.split(',')[1]
                            
                        audio_bytes = base64.b64decode(base64_data)
                        mime_type = message_content['audioMessage'].get('mimetype', 'audio/ogg; codecs=opus')
                        
                        # Transcribe audio using Gemini
                        from app.modules.coach.infrastructure.gemini_service import GeminiService
                        gemini = GeminiService()
                        transcription = gemini.transcribe_audio(audio_bytes, mime_type)
                        
                        if transcription:
                            text = transcription
                            print(f"DEBUG: Audio transcribed: {text}")
                        else:
                            text = "[Áudio não transcrito]"
                            
                 else:
                     text = "[Erro de Configuração de Áudio]"

            if not text and not media_attachments:
                print("DEBUG: No supported content found")
                return {"status": "ignored", "reason": "no_content"}

            print(f"📩 WhatsApp received from {phone}: {text} (Media: {len(media_attachments)})")

            # --- DIRECT GEMINI PROCESSING (NO INTERCEPTORS) ---
            
            # 1. Lookup User
            user = User.query.filter_by(phone=phone).first()
            
            # --- ACTIVATION FLOW START ---
            if not user:
                print(f"Unknown number {phone}. Starting activation flow.")
                
                # Check if message looks like an email using regex
                import re
                email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
                match = re.search(email_pattern, text or "")
                
                if match:
                    email_candidate = match.group(0)
                    print(f"Email detected: {email_candidate}")
                    
                    # Try to find user by email
                    user_candidate = User.query.filter_by(email=email_candidate).first()
                    
                    if user_candidate:
                        # Link phone to user
                        user_candidate.phone = phone
                        db.session.commit()
                        
                        welcome_msg = (
                            f"✅ *Coach Ativado com Sucesso!*\n\n"
                            f"Olá {user_candidate.name}, acabei de vincular este WhatsApp à sua conta.\n"
                            f"Sou seu AI Coach pessoal. Pode me contar o que comeu, seus treinos ou pedir dicas.\n\n"
                            f"O que vamos fazer agora?"
                        )
                        WhatsAppService.send_message(phone, welcome_msg)
                        return {"status": "activated", "user_id": str(user_candidate.id)}
                    else:
                        fail_msg = (
                            f"❌ Não encontrei uma conta com o email *{email_candidate}*.\n"
                            f"Por favor, verifique se digitou corretamente ou crie sua conta no nosso site."
                        )
                        WhatsAppService.send_message(phone, fail_msg)
                        return {"status": "activation_failed", "reason": "email_not_found"}
                
                else:
                    # Not an email, prompts for it
                    prompt_msg = (
                        "👋 Olá! Não reconheci este número no meu sistema.\n\n"
                        "Para ativar seu AI Coach, por favor responda com seu **EMAIL** de cadastro.\n"
                        "(Aquele que você usou na compra/registro)"
                    )
                    WhatsAppService.send_message(phone, prompt_msg)
                    return {"status": "activation_prompted"}

            # --- ACTIVATION FLOW END ---
            
            # 2. Get Context
            user_id = str(user.id)
            context = CoachContextService.get_user_context(user_id)
            if "error" in context:
                 print(f"Context error for user {user_id}: {context['error']}")
                 return {"status": "error", "reason": "context_error"}

            # 3. Get History
            history = ChatMessage.query.filter_by(
                user_id=user_id
            ).order_by(ChatMessage.created_at.desc()).limit(10).all()
            
            history_list = [
                {"role": msg.role, "content": msg.content}
                for msg in reversed(history)
            ]
            
            # 4. Process with Gemini 2.5 Pro
            result = CoachGeminiService.chat(context, history_list, text, media_attachments)
            
            response_text = result.get('response')
            if not response_text:
                response_text = "Desculpe, não consegui processar sua mensagem."
                
            # 5. Save Conversation
            user_msg = ChatMessage(
                user_id=user_id,
                role='user',
                content=text + (f" [Anexo]" if media_attachments else ""),
                created_at=now_cuiaba()
            )
            db.session.add(user_msg)
            
            coach_msg = ChatMessage(
                user_id=user_id,
                role='model',
                content=response_text,
                tokens_used=result.get('tokens_used'),
                response_time_ms=result.get('response_time_ms'),
                created_at=now_cuiaba()
            )
            db.session.add(coach_msg)
            db.session.commit()
            
            # 6. Send Response
            WhatsAppService.send_message(phone, response_text)
            
            return {"status": "success"}
            
        except Exception as e:
            print(f"❌ Webhook processing error: {e}")
            import traceback
            traceback.print_exc()
            return {"success": False, "error": str(e)}
