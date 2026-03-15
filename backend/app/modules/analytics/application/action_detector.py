"""
Action Detection Helper

Detects user intents from transcribed messages and creates button prompts.
"""

import re
from typing import Optional, Dict, Any


def detect_action_from_text(text: str) -> Optional[Dict[str, Any]]:
    """
    Detects actionable intents from user message text
    
    Args:
        text: User message (transcribed from audio or direct text)
        
    Returns:
        Action dict with type, params, and button_text, or None if no action detected
    """
    text_lower = text.lower()
    
    # Water detection - numeric patterns
    water_numeric_patterns = [
        r'bebi\s+(\d+)\s*ml',
        r'bebi\s+(\d+)\s*mililitros',
        r'tomei\s+(\d+)\s*ml',
        r'(\d+)\s*ml\s+de\s+água',
        r'água.*?(\d+)\s*ml',
    ]
    
    for pattern in water_numeric_patterns:
        match = re.search(pattern, text_lower)
        if match:
            amount_ml = int(match.group(1))
            return {
                'type': 'log_water',
                'params': {'amount_ml': amount_ml},
                'button_text': f'Registrar {amount_ml}ml de água?',
                'amount_display': f'{amount_ml}ml'
            }
    
    # Water detection - volume expressions (litros, meio litro, etc)
    if any(word in text_lower for word in ['bebi', 'tomei']) and 'água' in text_lower:
        amount_ml = None
        
        # Check for specific volumes
        if 'meio litro' in text_lower or '500ml' in text_lower or '500 ml' in text_lower:
            amount_ml = 500
        elif '1 litro' in text_lower or 'um litro' in text_lower or '1l' in text_lower:
            amount_ml = 1000
        elif '2 litros' in text_lower or 'dois litros' in text_lower or '2l' in text_lower:
            amount_ml = 2000
        elif 'garrafa' in text_lower:
            amount_ml = 500  # Garrafa padrão
        elif 'copo' in text_lower:
            amount_ml = 200  # Copo médio
        elif 'lata' in text_lower:
            amount_ml = 350  # Lata padrão
        else:
            # Generic water mention without specific volume
            amount_ml = 200  # Default: copo
        
        if amount_ml:
            return {
                'type': 'log_water',
                'params': {'amount_ml': amount_ml},
                'button_text': f'Registrar {amount_ml}ml de água?',
                'amount_display': f'{amount_ml}ml'
            }
    
    # Weight detection
    weight_patterns = [
        r'pesei\s+(\d+(?:[.,]\d+)?)\s*kg',
        r'estou\s+com\s+(\d+(?:[.,]\d+)?)\s*kg',
        r'meu\s+peso\s+é\s+(\d+(?:[.,]\d+)?)',
        r'peso\s+atual\s+(\d+(?:[.,]\d+)?)'
    ]
    
    for pattern in weight_patterns:
        match = re.search(pattern, text_lower)
        if match:
            weight = float(match.group(1).replace(',', '.'))
            return {
                'type': 'log_weight',
                'params': {'weight': weight},
                'button_text': f'Registrar peso: {weight}kg?',
                'amount_display': f'{weight}kg'
            }

    # Meal detection (simple keyword matching for now)
    meal_keywords = ['comi', 'almocei', 'jantei', 'lanche', 'café']
    if any(word in text_lower for word in meal_keywords):
        return {
            'type': 'log_meal',
            'params': {},
            'button_text': 'Registrar refeição?',
            'amount_display': 'Refeição'
        }
    
    return None
