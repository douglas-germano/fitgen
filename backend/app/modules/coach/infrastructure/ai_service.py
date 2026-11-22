"""
AI provider client backed by OpenRouter (OpenAI-compatible Chat Completions API).

Env vars:
    OPENROUTER_API_KEY  (required)
    OPENROUTER_MODEL    (optional, default: google/gemini-2.5-pro)
    OPENROUTER_BASE_URL (optional, default: https://openrouter.ai/api/v1)
    OPENROUTER_TIMEOUT  (optional, seconds, default: 120)
    AI_MAX_TOKENS_<FEATURE> (optional) overrides one entry of MAX_TOKENS, e.g. AI_MAX_TOKENS_DIET_WEEK=16000
    AI_REASONING_MAX_TOKENS (optional, default 2000; 0 = don't send) caps reasoning ("thinking") tokens
"""
import base64
import json
import logging
import os

import requests

log = logging.getLogger(__name__)

DEFAULT_MODEL = "google/gemini-2.5-pro"

# Output cap per feature (OpenRouter `max_tokens`). Without it OpenRouter reserves the
# model's whole output window (65k tokens) and asks for credit to cover it. Reasoning
# models spend part of this budget thinking, so keep headroom over the visible answer.
MAX_TOKENS = {
    "default": 4000,
    "coach": 3000,            # each round of the coach's tool loop
    "diet_week": 16000,       # 7 days x meals + shopping list (~5-6k visible tokens)
    "diet_day": 4000,
    "workout_plan": 12000,
    "meal_estimate": 1500,
    "meal_photo": 2000,
    "moderation": 1000,       # {"allowed": .., "reason": ..} plus thinking
    "group_summary": 1000,
    "transcription": 3000,
}


def max_tokens_for(feature):
    """Cap for a feature, overridable with env AI_MAX_TOKENS_<FEATURE>."""
    default = MAX_TOKENS.get(feature, MAX_TOKENS["default"])
    try:
        return int(os.environ.get(f"AI_MAX_TOKENS_{feature.upper()}", default))
    except ValueError:
        return default


def reasoning_for(max_tokens):
    """OpenRouter `reasoning` cap, or None. Kept under half of max_tokens so the answer fits.

    Measured on the weekly diet prompt with openrouter/free: without a cap some models spent
    the whole 16k budget thinking and returned cut JSON (2 of 3 runs); with 2000, 6 of 6 valid
    and 2-3x faster. Models that don't reason ignore it.
    """
    try:
        cap = int(os.environ.get("AI_REASONING_MAX_TOKENS", "2000"))
    except ValueError:
        cap = 2000
    if cap <= 0:
        return None
    return {"max_tokens": min(cap, max_tokens // 2)}
DEFAULT_BASE_URL = "https://openrouter.ai/api/v1"

JSON_ONLY_INSTRUCTION = (
    "IMPORTANT: Return the result ONLY as valid JSON. "
    "Do not include markdown formatting (like ```json ... ```) or any other text."
)

# OpenRouter `input_audio.format` values, keyed by MIME subtype
_AUDIO_FORMATS = {
    "mpeg": "mp3",
    "mp3": "mp3",
    "x-wav": "wav",
    "wave": "wav",
    "wav": "wav",
    "mp4": "m4a",
    "x-m4a": "m4a",
    "m4a": "m4a",
    "aac": "aac",
    "ogg": "ogg",
    "opus": "ogg",
    "flac": "flac",
    "aiff": "aiff",
    "x-aiff": "aiff",
    "webm": "webm",
}


class AIServiceError(Exception):
    pass


def _clean_mime(mime_type, default):
    return (mime_type or default).split(";")[0].strip().lower()


def _to_b64(data):
    if isinstance(data, (bytes, bytearray)):
        return base64.b64encode(data).decode("ascii")
    # Already base64 text (possibly a data URL)
    data = str(data)
    return data.split(",", 1)[1] if data.startswith("data:") else data


def media_part(data, mime_type):
    """Converts raw media into an OpenAI/OpenRouter message content part."""
    mime = _clean_mime(mime_type, "application/octet-stream")
    b64 = _to_b64(data)

    if mime.startswith("image/"):
        return {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}}

    if mime.startswith("audio/"):
        subtype = mime.split("/", 1)[1]
        return {
            "type": "input_audio",
            "input_audio": {"data": b64, "format": _AUDIO_FORMATS.get(subtype, subtype)},
        }

    ext = mime.split("/", 1)[1] if "/" in mime else "bin"
    return {
        "type": "file",
        "file": {"filename": f"attachment.{ext}", "file_data": f"data:{mime};base64,{b64}"},
    }


def build_user_content(prompt, attachments=None):
    """Text-only prompts stay a string; with attachments, returns a list of parts."""
    if not attachments:
        return prompt
    parts = [{"type": "text", "text": prompt}]
    for att in attachments:
        parts.append(media_part(att["data"], att.get("mime_type")))
    return parts


def parse_json_text(text):
    """Parses JSON from a model reply, tolerating markdown fences and surrounding text."""
    text = (text or "").strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.rstrip().endswith("```"):
            text = text.rstrip()[:-3]
        text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    for open_ch, close_ch in (("{", "}"), ("[", "]")):
        start, end = text.find(open_ch), text.rfind(close_ch)
        if start != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                continue
    raise ValueError("Model response is not valid JSON")


class AIService:
    def __init__(self, model=None):
        self.api_key = os.environ.get("OPENROUTER_API_KEY")
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY environment variable not set")
        self.model = model or os.environ.get("OPENROUTER_MODEL") or DEFAULT_MODEL
        self.base_url = (os.environ.get("OPENROUTER_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")
        self.timeout = float(os.environ.get("OPENROUTER_TIMEOUT", "120"))

    # ------------------------------------------------------------------ core

    def chat_completion(self, messages, tools=None, feature="default", **extra):
        """Calls OpenRouter and returns the first choice's message dict."""
        payload = {"model": self.model, "messages": messages, "max_tokens": max_tokens_for(feature)}
        reasoning = reasoning_for(payload["max_tokens"])
        if reasoning:
            payload["reasoning"] = reasoning
        payload.update(extra)
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-Title": "FitGen",
        }
        referer = os.environ.get("OPENROUTER_SITE_URL")
        if referer:
            headers["HTTP-Referer"] = referer

        resp = requests.post(
            f"{self.base_url}/chat/completions",
            headers=headers,
            json=payload,
            timeout=self.timeout,
        )
        try:
            body = resp.json()
        except ValueError:
            raise AIServiceError(f"OpenRouter HTTP {resp.status_code}: {resp.text[:300]}")

        if resp.status_code >= 400 or "error" in body:
            err = body.get("error", body)
            msg = err.get("message", err) if isinstance(err, dict) else err
            raise AIServiceError(f"OpenRouter HTTP {resp.status_code}: {msg}")

        choices = body.get("choices") or []
        if not choices:
            raise AIServiceError("OpenRouter returned no choices")
        if choices[0].get("finish_reason") == "length":
            # Answer cut at max_tokens: JSON will likely fail to parse. Raise AI_MAX_TOKENS_<FEATURE>.
            log.warning("AI answer truncated at max_tokens=%s (feature=%s, model=%s, usage=%s)",
                        payload["max_tokens"], feature, self.model, body.get("usage"))
        return choices[0].get("message") or {}

    def _complete_text(self, content, feature="default"):
        message = self.chat_completion([{"role": "user", "content": content}], feature=feature)
        return (message.get("content") or "").strip()

    # ------------------------------------------------------------ public API

    def generate_text(self, prompt, feature="default"):
        """Generates a plain-text response. Returns None on failure."""
        try:
            return self._complete_text(prompt, feature)
        except Exception as e:
            print(f"Error generating text: {e}")
            return None

    def generate_json(self, prompt, feature="default"):
        """Generates and parses a JSON response. Returns None on failure."""
        try:
            text = self._complete_text(f"{prompt}\n\n{JSON_ONLY_INSTRUCTION}", feature)
            return parse_json_text(text)
        except Exception as e:
            print(f"Error generating content: {e}")
            return None

    def analyze_image(self, prompt, images_data=None, feature="default"):
        """
        Analyzes images and returns parsed JSON.
        images_data: [{'data': bytes, 'mime_type': str}]
        """
        text = None
        try:
            content = build_user_content(f"{prompt}\n\n{JSON_ONLY_INSTRUCTION}", images_data)
            text = self._complete_text(content, feature)
            return parse_json_text(text)
        except Exception as e:
            print(f"Error analyzing image: {e}")
            if text:
                print(f"Raw response was: {text}")
            return None

    def transcribe_audio(self, audio_data, mime_type="audio/ogg"):
        """Transcribes audio (bytes) to Portuguese text. Returns None on failure."""
        try:
            content = build_user_content(
                "Transcreva o áudio em português. Retorne apenas o texto transcrito, sem comentários adicionais.",
                [{"data": audio_data, "mime_type": mime_type}],
            )
            transcription = self._complete_text(content, "transcription")
            if transcription:
                print(f"🎤 Audio transcribed: {transcription}")
                return transcription
            print("⚠️ No transcription returned from AI provider")
            return None
        except Exception as e:
            print(f"❌ Error transcribing audio: {e}")
            return None

    def generate_with_functions(self, content, tools, function_executor, max_iterations=5,
                                system_prompt=None, feature="coach"):
        """
        Runs a tool-calling loop.

        Args:
            content: user message content (string, or list of content parts)
            tools: OpenAI-format tool definitions
            function_executor: callable(name, args_dict) -> JSON-serializable result
            max_iterations: maximum rounds of tool execution
            system_prompt: optional system message

        Returns:
            Final assistant text, or None on failure.
        """
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": content})

            message = self.chat_completion(messages, tools=tools, feature=feature)

            for _ in range(max_iterations):
                tool_calls = message.get("tool_calls") or []
                if not tool_calls:
                    break

                messages.append({
                    "role": "assistant",
                    "content": message.get("content") or "",
                    "tool_calls": tool_calls,
                })

                for call in tool_calls:
                    fn = call.get("function", {})
                    name = fn.get("name")
                    try:
                        args = json.loads(fn.get("arguments") or "{}") or {}
                    except json.JSONDecodeError:
                        args = {}

                    print(f"🔧 Executing function: {name} with args: {args}")
                    try:
                        result = function_executor(name, args)
                    except Exception as e:
                        result = {"success": False, "error": str(e)}
                    print(f"🔧 Function result: {result}")

                    messages.append({
                        "role": "tool",
                        "tool_call_id": call.get("id"),
                        "name": name,
                        "content": json.dumps({"result": result}, ensure_ascii=False, default=str),
                    })

                message = self.chat_completion(messages, tools=tools, feature=feature)

            final_text = (message.get("content") or "").strip()
            return final_text or "Desculpe, não consegui processar sua solicitação."

        except Exception as e:
            print(f"Error in function calling: {e}")
            import traceback
            traceback.print_exc()
            return None
