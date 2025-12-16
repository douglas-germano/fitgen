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
            if response:
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
            # We assume message_full_data is the 'body' from webhook
            
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
                            # Ensure it's treated as Buffer if it looks like Base64
                            # Evolution/Baileys might expect { type: 'Buffer', data: [...] } or just Base64 string depending on version.
                            # But since we got 400, let's try strict Buffer emulation if simple string failed.
                            # Helper to convert base64 string to list of ints
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

            # The API expects the full WAMessage object structure in the "message" field
            payload = {
                "message": clean_message,
                "convertToMp4": False
            }
            
            print(f"DEBUG: Sending getBase64 payload: {payload}")
            
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
                    # Response might be a stream? use text
                    print(f"Response Body: {response.text}")
            except:
                pass
            return None

    @staticmethod
    def process_webhook(data):
        """Processa webhook recebido da Evolution API"""
        try:
            print(f"DEBUG: Processing webhook data: {data}")
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
            
            # Check for Text
            if 'conversation' in message_content:
                text = message_content['conversation']
                
                # Check if this is a confirmation response to a pending action
                from app.modules.analytics.application.pending_actions import pending_actions  
                from app.modules.coach.application.coach_functions import CoachFunctions
                
                text_lower = text.lower().strip()
                if text_lower in ['sim', 's', 'confirmar', 'ok', 'yes']:
                    # User is confirming - get the most recent pending action
                    user = User.query.filter_by(phone=phone).first()
                    if user:
                        pending_action = pending_actions.get_latest_action_for_user(str(user.id))
                        
                        if pending_action:
                            action_id = pending_action['action_id']
                            action_type = pending_action['action_type']
                            params = pending_action['params']
                            params['user_id'] = str(user.id)
                            
                            print(f"🔧 Executing confirmed action: {action_type} with {params}")
                            
                            # Execute the function
                            if hasattr(CoachFunctions, action_type):
                                func = getattr(CoachFunctions, action_type)
                                result = func(**params)
                                
                                # Remove from pending
                                pending_actions.remove_action(action_id)
                                
                                # Send confirmation
                                if result.get('success'):
                                    message = result.get('message', '✅ Registrado com sucesso!')
                                    if action_type == 'log_water':
                                        message += f"\n💧 Total hoje: {result.get('today_total_ml', 0)}ml / {result.get('goal_ml', 2500)}ml"
                                    elif action_type == 'log_meal':
                                        data = result.get('data', {})
                                        message += f"\n🍽️ {data.get('calories', 0)} kcal | P: {data.get('protein', 0)}g"
                                    
                                    WhatsAppService.send_message(phone, message,
                                        current_app.config.get('EVOLUTION_INSTANCE_NAME') or os.environ.get('EVOLUTION_INSTANCE_NAME', 'FitGen'),
                                        current_app.config.get('EVOLUTION_API_URL') or os.environ.get('EVOLUTION_API_URL'),
                                        current_app.config.get('EVOLUTION_API_KEY') or os.environ.get('EVOLUTION_API_KEY'))
                                else:
                                    WhatsAppService.send_message(phone, f"❌ Erro: {result.get('error', 'Erro desconhecido')}",
                                        current_app.config.get('EVOLUTION_INSTANCE_NAME') or os.environ.get('EVOLUTION_INSTANCE_NAME', 'FitGen'),
                                        current_app.config.get('EVOLUTION_API_URL') or os.environ.get('EVOLUTION_API_URL'),
                                        current_app.config.get('EVOLUTION_API_KEY') or os.environ.get('EVOLUTION_API_KEY'))
                                
                                return {"status": "ok", "action_executed": True}
                        else:
                            # No pending action found - just process as normal text
                            pass
                            
                elif text_lower in ['nao', 'não', 'n', 'cancelar', 'cancel', 'no']:
                    # User is cancelling
                    user = User.query.filter_by(phone=phone).first()
                    if user:
                        pending_action = pending_actions.get_latest_action_for_user(str(user.id))
                        if pending_action:
                            pending_actions.remove_action(pending_action['action_id'])
                    
                    WhatsAppService.send_message(
                        phone,
                        "Ok, cancelado! 👍",
                        current_app.config.get('EVOLUTION_INSTANCE_NAME') or os.environ.get('EVOLUTION_INSTANCE_NAME', 'FitGen'),
                        current_app.config.get('EVOLUTION_API_URL') or os.environ.get('EVOLUTION_API_URL'),
                        current_app.config.get('EVOLUTION_API_KEY') or os.environ.get('EVOLUTION_API_KEY')
                    )
                    return {"status": "ok", "message": "Action cancelled"}
                    
            elif 'extendedTextMessage' in message_content:
                text = message_content['extendedTextMessage'].get('text')
            elif 'buttonResponseMessage' in message_content:
                # User clicked a button!
                button_response = message_content['buttonResponseMessage']
                selected_button_id = button_response.get('selectedButtonId')
                
                print(f"DEBUG: Button clicked: {selected_button_id}")
                
                # Handle button confirmation
                from app.modules.analytics.application.pending_actions import pending_actions
                from app.modules.coach.application.coach_functions import CoachFunctions
                
                if selected_button_id == 'cancel':
                    # User cancelled
                    WhatsAppService.send_message(
                        phone, 
                        "Ok, cancelado! 👍", 
                        current_app.config.get('EVOLUTION_INSTANCE_NAME') or os.environ.get('EVOLUTION_INSTANCE_NAME', 'FitGen'),
                        current_app.config.get('EVOLUTION_API_URL') or os.environ.get('EVOLUTION_API_URL'),
                        current_app.config.get('EVOLUTION_API_KEY') or os.environ.get('EVOLUTION_API_KEY')
                    )
                    return {"status": "ok", "message": "Action cancelled"}
                
                # Extract action_id from button (format: confirm_{action_type}_{action_id})
                if selected_button_id.startswith('confirm_'):
                    parts = selected_button_id.split('_')
                    if len(parts) >= 3:
                        action_id = parts[-1]  # Last part is the action_id
                        
                        action = pending_actions.get_action(action_id)
                        
                        if not action:
                            WhatsAppService.send_message(
                                phone,
                                "⏰ Esta ação expirou. Por favor, tente novamente.",
                                current_app.config.get('EVOLUTION_INSTANCE_NAME') or os.environ.get('EVOLUTION_INSTANCE_NAME', 'FitGen'),
                                current_app.config.get('EVOLUTION_API_URL') or os.environ.get('EVOLUTION_API_URL'),
                                current_app.config.get('EVOLUTION_API_KEY') or os.environ.get('EVOLUTION_API_KEY')
                            )
                            return {"status": "error", "message": "Action expired"}
                        
                        # Execute the function!
                        action_type = action['action_type']
                        params = action['params']
                        params['user_id'] = action['user_id']  # Add user_id
                        
                        print(f"🔧 Executing confirmed action: {action_type} with {params}")
                        
                        # Call the appropriate function
                        if hasattr(CoachFunctions, action_type):
                            func = getattr(CoachFunctions, action_type)
                            result = func(**params)
                            
                            # Remove from pending actions
                            pending_actions.remove_action(action_id)
                            
                            # Send confirmation message
                            if result.get('success'):
                                message = result.get('message', '✅ Registrado com sucesso!')
                                # Add extra context for water/meals
                                if action_type == 'log_water':
                                    message += f"\n💧 Total hoje: {result.get('today_total_ml', 0)}ml / {result.get('goal_ml', 2500)}ml"
                                elif action_type == 'log_meal':
                                    data = result.get('data', {})
                                    message += f"\n🍽️ {data.get('calories', 0)} kcal | P: {data.get('protein', 0)}g"
                                    
                                WhatsAppService.send_message(
                                    phone,
                                    message,
                                    current_app.config.get('EVOLUTION_INSTANCE_NAME') or os.environ.get('EVOLUTION_INSTANCE_NAME', 'FitGen'),
                                    current_app.config.get('EVOLUTION_API_URL') or os.environ.get('EVOLUTION_API_URL'),
                                    current_app.config.get('EVOLUTION_API_KEY') or os.environ.get('EVOLUTION_API_KEY')
                                )
                            else:
                                WhatsAppService.send_message(
                                    phone,
                                    f"❌ Erro: {result.get('error', 'Erro desconhecido')}",
                                    current_app.config.get('EVOLUTION_INSTANCE_NAME') or os.environ.get('EVOLUTION_INSTANCE_NAME', 'FitGen'),
                                    current_app.config.get('EVOLUTION_API_URL') or os.environ.get('EVOLUTION_API_URL'),
                                    current_app.config.get('EVOLUTION_API_KEY') or os.environ.get('EVOLUTION_API_KEY')
                                )
                            
                            return {"status": "ok", "action_executed": True}
                
                return {"status": "ok", "message": "Button processed"}
            elif 'imageMessage' in message_content:
                text = message_content['imageMessage'].get('caption') # Caption is the text
                print(f"DEBUG: Detected Image Message. Caption: {text}")
                
                # Get Config
                api_url = current_app.config.get('EVOLUTION_API_URL') or os.environ.get('EVOLUTION_API_URL')
                api_key = current_app.config.get('EVOLUTION_API_KEY') or os.environ.get('EVOLUTION_API_KEY')
                instance_name = current_app.config.get('EVOLUTION_INSTANCE_NAME') or os.environ.get('EVOLUTION_INSTANCE_NAME', 'FitGen')
                
                if api_url and api_key:
                    # Clean URL
                    api_url = api_url.rstrip('/')
                    
                    base64_data = WhatsAppService.get_media_base64(
                        body, # Pass the whole WAMessage object (data found in webhook)
                        instance_name,
                        api_url,
                        api_key
                    )
                    
                    if base64_data:
                        # Convert to bytes
                        # API might return "data:image/jpeg;base64,..." prefix
                        import base64
                        if ',' in base64_data:
                            base64_data = base64_data.split(',')[1]
                            
                        media_attachments.append({
                            "mime_type": message_content['imageMessage'].get('mimetype', 'image/jpeg'),
                            "data": base64.b64decode(base64_data)
                        })
                        print("DEBUG: Image processed successfully")
            
            elif 'audioMessage' in message_content:
                 print("DEBUG: Detected Audio Message")
                 
                 # Get Config
                 api_url = current_app.config.get('EVOLUTION_API_URL') or os.environ.get('EVOLUTION_API_URL')
                 api_key = current_app.config.get('EVOLUTION_API_KEY') or os.environ.get('EVOLUTION_API_KEY')
                 instance_name = current_app.config.get('EVOLUTION_INSTANCE_NAME') or os.environ.get('EVOLUTION_INSTANCE_NAME', 'FitGen')
                 
                 if api_url and api_key:
                    api_url = api_url.rstrip('/')
                    base64_data = WhatsAppService.get_media_base64(
                        body, # Pass the whole WAMessage object
                        instance_name,
                        api_url,
                        api_key
                    )
                    
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
                            text = transcription  # Use transcribed text as main message
                            print(f"DEBUG: Audio transcribed successfully: {text}")
                        else:
                            text = "[Áudio não pôde ser transcrito]"
                            print("DEBUG: Audio transcription failed")
                        
                        # NOTE: We do NOT add audio to media_attachments because it interferes with function calling
                        # The transcribed text is enough for the Coach to understand and execute commands
                        print("DEBUG: Audio processed successfully")
                 else:
                     text = "[Áudio recebido mas configuração da API está incorreta]"

            # Final check: If no text and no media, ignore
            if not text and not media_attachments:
                print("DEBUG: No text or supported media found")
                return {"status": "ignored", "reason": "no_content"}
                
            # If plain media without caption, provide a default text for context
            if not text and media_attachments:
                if 'imageMessage' in message_content:
                    text = "Analise esta imagem."
                elif 'audioMessage' in message_content:
                     text = "Transcreva e responda este áudio."

            print(f"📩 WhatsApp received from {phone}: {text} (Media: {len(media_attachments)})")
            
            # BEFORE sending to Gemini, check if this is an actionable intent
            # If so, send confirmation buttons instead
            if text and not media_attachments:  # Only for pure text/audio (images go to Gemini)
                from app.modules.analytics.application.action_detector import detect_action_from_text
                from app.modules.analytics.application.pending_actions import pending_actions
                
                detected_action = detect_action_from_text(text)
                
                if detected_action:
                    print(f"🎯 Detected action: {detected_action['type']} with {detected_action['params']}")
                    
                    # Get user first to get user_id
                    user = User.query.filter_by(phone=phone).first()
                    if not user:
                        print(f"User not found for phone {phone}")
                        return {"status": "error", "reason": "user_not_found"}
                    
                    # Create pending action
                    action_id = pending_actions.create_action(
                        user_id=str(user.id),
                        action_type=detected_action['type'],
                        params=detected_action['params']
                    )
                    
                    # Send confirmation request as simple text
                    api_url = current_app.config.get('EVOLUTION_API_URL') or os.environ.get('EVOLUTION_API_URL')
                    api_key = current_app.config.get('EVOLUTION_API_KEY') or os.environ.get('EVOLUTION_API_KEY')
                    instance_name = current_app.config.get('EVOLUTION_INSTANCE_NAME') or os.environ.get('EVOLUTION_INSTANCE_NAME', 'FitGen')
                    
                    if api_url and api_key:
                        api_url = api_url.rstrip('/')
                        
                        confirmation_text = f"{detected_action['button_text']}\n\nResponda 'SIM' para confirmar ou 'NÃO' para cancelar."
                        
                        WhatsAppService.send_message(phone, confirmation_text)
                        
                        print(f"📤 Sent confirmation request for {detected_action['type']}")
                        return {"status": "ok", "action_detected": True, "awaiting_confirmation": True}
            
            # ... Rest of the function (User lookup, Context, History) ...
            
            # 1. Busca usuário pelo telefone
            user = User.query.filter_by(phone=phone).first()
            if not user:
                print(f"User not found for phone {phone}")
                return {"status": "error", "reason": "user_not_found"}

            # 2. Obtém contexto
            user_id = str(user.id)
            context = CoachContextService.get_user_context(user_id)
            if "error" in context:
                 print(f"Context error for user {user_id}: {context['error']}")
                 return {"status": "error", "reason": "context_error"}

            # Busca histórico
            history = ChatMessage.query.filter_by(
                user_id=user_id
            ).order_by(ChatMessage.created_at.desc()).limit(10).all()
            
            history_list = [
                {"role": msg.role, "content": msg.content}
                for msg in reversed(history)
            ]
            
            # 3. Processa com Gemini (passando attachments)
            result = CoachGeminiService.chat(context, history_list, text, media_attachments)
            
            response_text = result.get('response')
            if not response_text:
                response_text = "Desculpe, não consegui processar sua mensagem."
                
            # 4. Salva conversa no banco
            user_msg = ChatMessage(
                user_id=user_id,
                role='user',
                content=text + (f" [Anexo: {'Imagem' if 'imageMessage' in message_content else 'Áudio'}]" if media_attachments else ""),
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
            
            # 5. Envia resposta via WhatsApp
            WhatsAppService.send_message(phone, response_text)
            
            return {"status": "success"}
            
        except Exception as e:
            print(f"❌ Webhook processing error: {e}")
            import traceback
            traceback.print_exc()
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def send_button_message(phone: str, text: str, buttons: list, instance_name: str, api_url: str, api_key: str):
        """
        Sends an interactive button message via Evolution API
        
        Args:
            phone: Phone number (e.g., '556692073166')
            text: Message text
            buttons: List of dicts with 'id' and 'text' keys
            instance_name: Evolution instance name
            api_url: Evolution API base URL
            api_key: Evolution API key
            
        Returns:
            dict with success status
        """
        try:
            # Evolution API v2 uses /message/sendText with buttons option
            url = f"{api_url}/message/sendText/{instance_name}"
            
            # Format buttons for Evolution API v2
            formatted_buttons = [
                {
                    "buttonId": btn['id'],
                    "buttonText": {"displayText": btn['text']}
                }
                for btn in buttons
            ]
            
            payload = {
                "number": phone,
                "text": text,  # Text at root level, not nested
                "options": {
                    "delay": 0,
                    "presence": "composing"
                },
                "buttons": formatted_buttons
            }
            
            print(f"DEBUG: Button payload: {payload}")
            
            headers = {
                "apikey": api_key,
                "Content-Type": "application/json"
            }
            
            response = requests.post(url, json=payload, headers=headers)
            
            # Log response for debugging
            print(f"DEBUG: Button response status: {response.status_code}")
            if response.status_code != 200:
                print(f"DEBUG: Button response body: {response.text}")
            
            response.raise_for_status()
            
            return {"success": True}
        except Exception as e:
            print(f"Error sending button message: {e}")
            return {"success": False, "error": str(e)}
