import os
import google.generativeai as genai
import json

class GeminiService:
    def __init__(self):
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')

    def generate_json(self, prompt):
        """
        Generates structured JSON response from Gemini.
        Appends instruction to return JSON format.
        """
        full_prompt = f"""
        {prompt}
        
        IMPORTANT: Return the result ONLY as valid JSON. Do not include markdown formatting (like ```json ... ```) or any other text.
        """
        
        try:
            response = self.model.generate_content(full_prompt)
            text = response.text.strip()
            
            # Clean up potential markdown formatting if the model disregards instructions
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
                
            return json.loads(text.strip())
        except Exception as e:
            print(f"Error generating content: {e}")
            return None
    
    def generate_text(self, prompt):
        """
        Generates text response from Gemini without JSON parsing.
        """
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"Error generating text: {e}")
            return None

    def analyze_image(self, prompt, images_data=None):
        """
        Analyzes images using Gemini Vision capabilities.
        Accepts images_data as a list of dictionaries: [{'data': bytes, 'mime_type': str}]
        """
        parts = [prompt]
        
        if images_data:
            for img in images_data:
                parts.append({
                    "mime_type": img.get('mime_type', 'image/jpeg'),
                    "data": img['data']
                })
        
        full_prompt = f"""
        IMPORTANT: Return the result ONLY as valid JSON. Do not include markdown formatting.
        """
        parts.append(full_prompt)
        
        try:
            response = self.model.generate_content(parts)
            text = response.text.strip()
            
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
                
            return json.loads(text.strip())
        except Exception as e:
            print(f"Error analyzing image: {e}")
            try:
                print(f"Raw response was: {response.text}")
            except:
                pass
            return None

