from app.services.gemini_service import GeminiService

class NutritionAnalyzerService:
    def __init__(self):
        self.gemini = GeminiService()

    def analyze_meal(self, images_data, description=None, mime_type='image/jpeg'):
        """
        Analyzes a meal image using AI
        images_data can be bytes (single) or list of dicts (multiple)
        """
        prompt = """
        Você é um nutricionista especialista. Analise esta imagem de comida e forneça uma estimativa nutricional precisa.
        """
        
        if description:
            prompt += f"\nContexto adicional fornecido pelo usuário: {description}\n"
            
        prompt += """
        Identifique o prato e estime:
        1. Calorias totais (kcal)
        2. Proteínas (g)
        3. Carboidratos (g)
        4. Gorduras (g)
        5. Nome do prato/alimentos identificados

        FORMATO JSON:
        {
            "name": "Salada Caesar com Frango",
            "calories": 450,
            "protein": 35,
            "carbs": 12,
            "fats": 28
        }
        
        Se não for possível identificar comida na imagem, retorne:
        {
            "error": "Não foi possível identificar alimentos nesta imagem."
        }
        """
        
        if isinstance(images_data, list):
             result = self.gemini.analyze_image(prompt, images_data)
        else:
             # Legacy support or single image -> wrap in list
             result = self.gemini.analyze_image(prompt, [{'data': images_data, 'mime_type': mime_type}])
        
        # Normalize field names if needed
        if result and 'food_name' in result:
            result['name'] = result.pop('food_name')
        
        return result