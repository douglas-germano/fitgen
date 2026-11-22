"""max_tokens sent to OpenRouter per feature; no real provider calls."""
import os
os.environ.setdefault('SECRET_KEY', 'isolated-test-secret-key')
os.environ.setdefault('JWT_SECRET_KEY', 'isolated-test-jwt-secret-key-32-chars')
os.environ.setdefault('DATABASE_URL', 'sqlite://')
import unittest
from unittest.mock import MagicMock, patch

from app.modules.coach.infrastructure import ai_service
from app.modules.coach.infrastructure.ai_service import AIService, MAX_TOKENS, max_tokens_for, reasoning_for


def reply(content='{"ok": true}', finish_reason='stop'):
    resp = MagicMock(status_code=200)
    resp.json.return_value = {'choices': [{'message': {'content': content}, 'finish_reason': finish_reason}],
                              'usage': {'completion_tokens': 10}}
    return resp


class MaxTokensTests(unittest.TestCase):
    def setUp(self):
        env = patch.dict(os.environ, {'OPENROUTER_API_KEY': 'test-key'})
        env.start(); self.addCleanup(env.stop)
        self.ai = AIService(model='test/model')

    def sent(self, post):
        return post.call_args.kwargs['json']

    def test_every_call_sends_the_feature_cap(self):
        with patch.object(ai_service.requests, 'post', return_value=reply()) as post:
            self.ai.generate_json('x', feature='diet_week')
            self.assertEqual(self.sent(post)['max_tokens'], MAX_TOKENS['diet_week'])
            self.ai.generate_text('x')
            self.assertEqual(self.sent(post)['max_tokens'], MAX_TOKENS['default'])
            self.ai.transcribe_audio(b'abc', 'audio/ogg')
            self.assertEqual(self.sent(post)['max_tokens'], MAX_TOKENS['transcription'])
            self.ai.generate_with_functions('oi', [{'type': 'function'}], lambda n, a: {})
            self.assertEqual(self.sent(post)['max_tokens'], MAX_TOKENS['coach'])

    def test_env_overrides_one_feature_and_ignores_garbage(self):
        with patch.dict(os.environ, {'AI_MAX_TOKENS_DIET_WEEK': '20000', 'AI_MAX_TOKENS_COACH': 'lots'}):
            self.assertEqual(max_tokens_for('diet_week'), 20000)
            self.assertEqual(max_tokens_for('coach'), MAX_TOKENS['coach'])
        self.assertEqual(max_tokens_for('unknown_feature'), MAX_TOKENS['default'])

    def test_reasoning_is_capped_under_half_the_answer_budget(self):
        with patch.object(ai_service.requests, 'post', return_value=reply()) as post:
            self.ai.generate_json('x', feature='diet_week')
            self.assertEqual(self.sent(post)['reasoning'], {'max_tokens': 2000})
            self.ai.generate_json('x', feature='moderation')  # max_tokens 1000
            self.assertEqual(self.sent(post)['reasoning'], {'max_tokens': 500})
        with patch.dict(os.environ, {'AI_REASONING_MAX_TOKENS': '0'}):
            self.assertIsNone(reasoning_for(16000))

    def test_truncated_answer_is_logged(self):
        with patch.object(ai_service.requests, 'post', return_value=reply('{"a": ', 'length')), \
             self.assertLogs(ai_service.log, level='WARNING') as logs:
            self.assertIsNone(self.ai.generate_json('x', feature='diet_day'))
        self.assertIn('feature=diet_day', logs.output[0])


if __name__ == '__main__':
    unittest.main()
