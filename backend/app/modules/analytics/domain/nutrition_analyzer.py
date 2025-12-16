from app.modules.coach.infrastructure.gemini_service import GeminiService

class NutritionAnalyzerService:
    def __init__(self):
        self.gemini = GeminiService()

    def analyze_meal(self, images_data, description=None, mime_type='image/jpeg'):
        """
        Analyzes a meal image using AI
        images_data can be bytes (single) or list of dicts (multiple)
        """
        prompt = """
        Você é um nutricionista especialista. Analise esta imagem e forneça uma estimativa nutricional precisa.
        
        A imagem pode conter:
        - Refeições completas (pratos preparados)
        - Alimentos individuais (frutas, vegetais, carnes, etc.)
        - Bebidas (sucos, refrigerantes, cafés, shakes, água de coco, etc.)
        - Alimentos processados e embalados (barras de cereais, bolachas, chips, chocolates, etc.)
        - Lanches rápidos (sanduíches, salgados, etc.)
        """
        
        if description:
            prompt += f"\nContexto adicional fornecido pelo usuário: {description}\n"
            
        prompt += """
        Identifique o(s) alimento(s)/bebida(s) e estime:
        1. Calorias totais (kcal)
        2. Proteínas (g)
        3. Carboidratos (g)
        4. Gorduras (g)
        5. Nome do alimento/bebida ou prato identificado

        FORMATO JSON:
        {
            "name": "Salada Caesar com Frango",
            "calories": 450,
            "protein": 35,
            "carbs": 12,
            "fats": 28
        }
        
        EXEMPLOS:
        - Para bebidas: {"name": "Suco de Laranja (300ml)", "calories": 120, "protein": 2, "carbs": 28, "fats": 0}
        - Para snacks: {"name": "Barra de Cereais", "calories": 110, "protein": 2, "carbs": 23, "fats": 2}
        
        Se não for possível identificar alimentos ou bebidas na imagem, retorne:
        {
            "error": "Não foi possível identificar alimentos ou bebidas nesta imagem."
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