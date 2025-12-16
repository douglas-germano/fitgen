#!/usr/bin/env python3
"""
Test script to validate Gemini function calling is working correctly
"""
import os
import google.generativeai as genai

# Configure Gemini
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("❌ GEMINI_API_KEY not set")
    exit(1)

genai.configure(api_key=api_key)

# Define a simple test function
def log_meal(name: str, calories: int, protein: int = 0, carbs: int = 0, fats: int = 0):
    """Logs a meal with nutritional information"""
    return {
        "success": True,
        "message": f"Logged {name} with {calories} calories"
    }

# Test with function declarations
test_declarations = [
    {
        "name": "log_meal",
        "description": "Logs a meal. When user mentions food, estimate nutritional values and call this function.",
        "parameters": {
            "type_": "OBJECT",
            "properties": {
                "name": {"type_": "STRING", "description": "Meal name"},
                "calories": {"type_": "INTEGER", "description": "Estimated calories"},
                "protein": {"type_": "INTEGER", "description": "Protein in grams"},
                "carbs": {"type_": "INTEGER", "description": "Carbs in grams"},
                "fats": {"type_": "INTEGER", "description": "Fats in grams"}
            },
            "required": ["name", "calories", "protein", "carbs", "fats"]
        }
    }
]

print("🧪 Testing Gemini Function Calling...")
print(f"📋 Declarations: {test_declarations}")

try:
    model = genai.GenerativeModel('gemini-2.0-flash', tools=test_declarations)
    chat = model.start_chat()
    
    print("\n💬 Sending: 'Comi uma banana'")
    response = chat.send_message("Comi uma banana")
    
    print(f"\n📤 Response candidates: {len(response.candidates)}")
    
    if response.candidates:
        candidate = response.candidates[0]
        print(f"📦 Content parts: {len(candidate.content.parts)}")
        
        for i, part in enumerate(candidate.content.parts):
            print(f"\n  Part {i}:")
            if hasattr(part, 'function_call') and part.function_call:
                print(f"    ✅ FUNCTION CALL: {part.function_call.name}")
                print(f"    📊 Args: {dict(part.function_call.args)}")
            elif hasattr(part, 'text') and part.text:
                print(f"    💬 TEXT: {part.text[:100]}")
    
    print("\n✅ Test completed!")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
