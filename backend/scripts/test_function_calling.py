#!/usr/bin/env python3
"""
Smoke test: validates OpenRouter tool calling with the real coach tool declarations.
No database writes — tool calls are captured and answered with a fake result.

Usage (from backend/):
    OPENROUTER_API_KEY=... python scripts/test_function_calling.py ["Comi uma banana"]
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.modules.coach.infrastructure.ai_service import AIService  # noqa: E402
from app.modules.coach.application.coach_functions import COACH_FUNCTION_DECLARATIONS  # noqa: E402

if not os.environ.get("OPENROUTER_API_KEY"):
    print("❌ OPENROUTER_API_KEY not set")
    sys.exit(1)

message = sys.argv[1] if len(sys.argv) > 1 else "Comi uma banana"
calls = []


def fake_executor(name, args):
    calls.append((name, args))
    return {"success": True, "message": f"{name} executed (fake)"}


ai = AIService()
print(f"🧪 Model: {ai.model}")
print(f"💬 Sending: {message!r}")

reply = ai.generate_with_functions(
    message,
    COACH_FUNCTION_DECLARATIONS,
    fake_executor,
    system_prompt="Você é um coach de fitness. Use as funções disponíveis para registrar dados.",
)

for name, args in calls:
    print(f"  ✅ FUNCTION CALL: {name} {args}")
if not calls:
    print("  ⚠️ No function calls made")
print(f"\n💬 Final reply: {reply}")
