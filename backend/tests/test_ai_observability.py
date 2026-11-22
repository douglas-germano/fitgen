"""Sentry tracing for AI: AI routes always sampled, one gen_ai.chat span per OpenRouter call."""
import os
os.environ.setdefault('SECRET_KEY', 'isolated-test-secret-key')
os.environ.setdefault('JWT_SECRET_KEY', 'isolated-test-jwt-secret-key-32-chars')
os.environ.setdefault('DATABASE_URL', 'sqlite://')
import json
import unittest
from unittest.mock import MagicMock, patch

import sentry_sdk

from app.modules.coach.infrastructure import ai_service
from app.modules.coach.infrastructure.ai_service import AIDeadlineExceeded, AIService
from app.shared.monitoring import make_traces_sampler

FAKE_DSN = 'https://public@o0.ingest.us.sentry.io/0'
USAGE = {'prompt_tokens': 1200, 'completion_tokens': 300, 'total_tokens': 1500, 'cost': 0.0042,
         'completion_tokens_details': {'reasoning_tokens': 120}, 'prompt_tokens_details': {'cached_tokens': 800}}


def reply(usage=USAGE, content='{"ok": true}'):
    resp = MagicMock(status_code=200)
    resp.json.return_value = {'model': 'anthropic/claude-haiku-5.5', 'usage': usage,
                              'choices': [{'message': {'content': content}, 'finish_reason': 'stop'}]}
    return resp


def ctx(method=None, path=None, name='', parent=None):
    return {'wsgi_environ': {'REQUEST_METHOD': method, 'PATH_INFO': path} if method else {},
            'transaction_context': {'name': name}, 'parent_sampled': parent}


class SamplerTests(unittest.TestCase):
    def setUp(self):
        self.sample = make_traces_sampler(0.1, 1.0)

    def test_ai_routes_and_jobs_are_always_traced(self):
        for path in ('/api/chat', '/api/diet/generate', '/api/nutrition/analyze', '/api/onboarding/generate-workout/'):
            self.assertEqual(self.sample(ctx('POST', path)), 1.0, path)
        self.assertEqual(self.sample(ctx(name='ai.onboarding_workout_job')), 1.0)

    def test_other_routes_keep_the_default_rate_or_follow_the_app(self):
        self.assertEqual(self.sample(ctx('GET', '/api/auth/me')), 0.1)
        self.assertEqual(self.sample(ctx('GET', '/api/chat/history')), 0.1)
        self.assertEqual(self.sample(ctx('GET', '/api/workouts', parent=True)), 1.0)
        self.assertEqual(self.sample(ctx('GET', '/api/workouts', parent=False)), 0.0)


class AISpanTests(unittest.TestCase):
    def setUp(self):
        env = patch.dict(os.environ, {'OPENROUTER_API_KEY': 'test-key'})
        env.start(); self.addCleanup(env.stop)
        self.events = []
        sentry_sdk.init(dsn=FAKE_DSN, traces_sample_rate=1.0, default_integrations=False,
                        before_send_transaction=lambda e, h: self.events.append(e) or None)
        self.addCleanup(lambda: sentry_sdk.init(dsn=None))
        self.ai = AIService(model='anthropic/claude-haiku-5.5')

    def spans(self):
        sentry_sdk.flush()
        return [s for e in self.events for s in e.get('spans', []) if s.get('op') == 'gen_ai.chat']

    def test_span_carries_feature_model_tokens_and_cost_but_no_prompt(self):
        with patch.object(ai_service.requests, 'post', return_value=reply()) as post, \
             sentry_sdk.start_transaction(name='test', op='test'):
            self.ai.generate_json('segredo do usuário: dieta sem glúten', feature='diet_week')
        self.assertEqual(post.call_args.kwargs['json']['usage'], {'include': True})
        [span] = self.spans()
        data = span['data']
        self.assertEqual(data['fitgen.ai.feature'], 'diet_week')
        self.assertEqual(data['gen_ai.request.model'], 'anthropic/claude-haiku-5.5')
        self.assertEqual(data['gen_ai.usage.input_tokens'], 1200)
        self.assertEqual(data['gen_ai.usage.input_tokens.cached'], 800)
        self.assertEqual(data['gen_ai.usage.output_tokens'], 300)
        self.assertEqual(data['gen_ai.usage.output_tokens.reasoning'], 120)
        self.assertEqual(data['gen_ai.usage.cost'], 0.0042)
        self.assertNotIn('segredo', json.dumps(self.events, default=str))

    def test_usage_adds_up_across_the_coach_rounds(self):
        tool_round = MagicMock(status_code=200)
        tool_round.json.return_value = {'usage': USAGE, 'choices': [{'finish_reason': 'tool_calls', 'message': {
            'content': '', 'tool_calls': [{'id': 'c1', 'function': {'name': 'get_hydration_status', 'arguments': '{}'}}]}}]}
        with patch.object(ai_service.requests, 'post', side_effect=[tool_round, reply(content='Beba água!')]):
            text = self.ai.generate_with_functions('oi', [{'type': 'function'}], lambda n, a: {'ml': 500})
        self.assertEqual(text, 'Beba água!')
        self.assertEqual(self.ai.usage['calls'], 2)
        self.assertEqual(self.ai.usage['input_tokens'] + self.ai.usage['output_tokens'], 3000)
        self.assertAlmostEqual(self.ai.usage['cost_usd'], 0.0084)

    def test_timeout_is_recorded_on_the_span(self):
        with patch.object(ai_service.requests, 'post', side_effect=ai_service.requests.Timeout()), \
             sentry_sdk.start_transaction(name='test', op='test'):
            with self.assertRaises(AIDeadlineExceeded):
                self.ai.chat_completion([{'role': 'user', 'content': 'oi'}], feature='coach', timeout=5)
        [span] = self.spans()
        self.assertEqual(span['status'], 'deadline_exceeded')
        self.assertEqual(span['data']['fitgen.ai.error'], 'AIDeadlineExceeded')

    def test_provider_without_usage_still_works(self):
        with patch.object(ai_service.requests, 'post', return_value=reply(usage=None)):
            self.assertEqual(self.ai.generate_json('x'), {'ok': True})
        self.assertEqual(self.ai.usage['input_tokens'], 0)


if __name__ == '__main__':
    unittest.main()
