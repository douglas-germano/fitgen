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
        
        full_prompt = """
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
    
    def generate_with_functions(self, prompt, function_declarations, function_executor, max_iterations=5):
        """
        Generates response with function calling support.
        
        Args:
            prompt: The conversation prompt
            function_declarations: List of function declarations for Gemini
            function_executor: Callable that executes functions by name
            max_iterations: Maximum number of function call rounds
            
        Returns:
            Final text response after all function calls are resolved
        """
        try:
            print(f"🔧 DEBUG: Starting function calling with {len(function_declarations)} declarations")
            print(f"🔧 DEBUG: Declarations: {function_declarations}")
            
            # Create model with tools and tool config to encourage function calling
            tool_config = genai.protos.ToolConfig(
                function_calling_config=genai.protos.FunctionCallingConfig(
                    mode=genai.protos.FunctionCallingConfig.Mode.AUTO
                )
            )
            
            model_with_tools = genai.GenerativeModel(
                'gemini-2.0-flash',
                tools=function_declarations,
                tool_config=tool_config
            )
            
            chat = model_with_tools.start_chat()
            print(f"🔧 DEBUG: Sending prompt: {prompt[:100]}...")
            response = chat.send_message(prompt)
            
            print(f"🔧 DEBUG: Got response, candidates: {len(response.candidates) if response.candidates else 0}")
            
            iteration = 0
            
            while iteration < max_iterations:
                # Check if response contains function calls
                if not response.candidates:
                    print("🔧 DEBUG: No candidates in response")
                    break
                    
                candidate = response.candidates[0]
                
                # Check if there are function calls in the response
                if not candidate.content.parts:
                    print("🔧 DEBUG: No parts in candidate content")
                    break
                
                print(f"🔧 DEBUG: Candidate has {len(candidate.content.parts)} parts")
                
                function_calls = [
                    part.function_call 
                    for part in candidate.content.parts 
                    if hasattr(part, 'function_call') and part.function_call
                ]
                
                print(f"🔧 DEBUG: Found {len(function_calls)} function calls")
                
                if not function_calls:
                    # No more function calls, return final text
                    print("🔧 DEBUG: No function calls, extracting text response")
                    break
                
                # Execute all function calls and collect responses
                function_responses = []
                for fc in function_calls:
                    function_name = fc.name
                    function_args = dict(fc.args)
                    
                    print(f"🔧 Executing function: {function_name} with args: {function_args}")
                    
                    # Execute the function
                    result = function_executor(function_name, function_args)
                    
                    print(f"🔧 Function result: {result}")
                    
                    # Create function response
                    function_responses.append(
                        genai.protos.Part(
                            function_response=genai.protos.FunctionResponse(
                                name=function_name,
                                response={"result": result}
                            )
                        )
                    )
                
                # Send function responses back to model
                print(f"🔧 DEBUG: Sending {len(function_responses)} function responses back to model")
                response = chat.send_message(function_responses)
                iteration += 1
            
            # Return final text response
            if response.candidates and response.candidates[0].content.parts:
                text_parts = [
                    part.text 
                    for part in response.candidates[0].content.parts 
                    if hasattr(part, 'text') and part.text
                ]
                final_text = '\n'.join(text_parts).strip()
                print(f"🔧 DEBUG: Final text response: {final_text[:100]}...")
                return final_text
            
            print("🔧 DEBUG: No text in final response")
            return "Desculpe, não consegui processar sua solicitação."
            
        except Exception as e:
            print(f"Error in function calling: {e}")
            import traceback
            traceback.print_exc()
            return None

