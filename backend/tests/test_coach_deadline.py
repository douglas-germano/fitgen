"""Coach total deadline: per-call time budget, final answer round, timeout replies."""
import os
os.environ.setdefault('SECRET_KEY', 'isolated-test-secret-key')
os.environ.setdefault('JWT_SECRET_KEY', 'isolated-test-jwt-secret-key-32-chars')
os.environ.setdefault('DATABASE_URL', 'sqlite://')
import unittest
from unittest.mock import MagicMock, patch

import gevent

from app.modules.coach.application import coach_ai_service
from app.modules.coach.infrastructure import ai_service
from app.modules.coach.infrastructure.ai_service import AIDeadlineExceeded, AIService

TOOLS = [{'type': 'function', 'function': {'name': 'log_meal', 'parameters': {}}}]


def reply(message):
    resp = MagicMock(status_code=200)
    resp.json.return_value = {'choices': [{'message': message, 'finish_reason': 'stop'}]}
    return resp


def tool_call(name='log_meal'):
    return reply({'content': '', 'tool_calls': [{'id': 'c1', 'function': {'name': name, 'arguments': '{}'}}]})


class Clock:
    """Fake time.monotonic: each AI call 'takes' `step` seconds."""
    def __init__(self, step):
        self.now, self.step = 1000.0, step

    def monotonic(self):
        return self.now


class CoachDeadlineTests(unittest.TestCase):
    def setUp(self):
        env = patch.dict(os.environ, {'OPENROUTER_API_KEY': 'test-key'})
        env.start(); self.addCleanup(env.stop)
        self.ai = AIService(model='test/model')

    def run_loop(self, replies, step, deadline=45, executor=lambda n, a: {'success': True}):
        clock = Clock(step)
        calls = []

        def post(url, headers, json, timeout):
            calls.append({'timeout': timeout, 'tool_choice': json.get('tool_choice')})
            clock.now += clock.step
            return replies.pop(0)

        with patch.object(ai_service.time, 'monotonic', clock.monotonic), \
             patch.object(ai_service.requests, 'post', side_effect=post):
            text = self.ai.generate_with_functions('oi', TOOLS, executor, deadline_seconds=deadline,
                                                   timeout_reply=coach_ai_service.coach_timeout_reply)
        return text, calls

    def test_each_call_only_gets_the_time_left(self):
        text, calls = self.run_loop([tool_call(), reply({'content': 'Pronto!'})], step=10)
        self.assertEqual(text, 'Pronto!')
        self.assertEqual([c['timeout'] for c in calls], [45, 35])

    def test_last_seconds_force_an_answer_without_more_tools(self):
        # 3 rounds of 12 s leave 9 s (< 15 s reserve): the 4th call must not offer tools
        replies = [tool_call(), tool_call(), tool_call(), reply({'content': 'Resumo com o que tenho.'})]
        text, calls = self.run_loop(replies, step=12)
        self.assertEqual(text, 'Resumo com o que tenho.')
        self.assertEqual([c['tool_choice'] for c in calls], ['auto', 'auto', 'auto', 'none'])
        self.assertEqual(calls[-1]['timeout'], 9)

    def test_timeout_after_a_write_tool_warns_not_to_retry(self):
        def post_then_timeout():
            yield tool_call('log_meal')
            raise ai_service.requests.Timeout()
        gen = post_then_timeout()
        with patch.object(ai_service.requests, 'post', side_effect=lambda *a, **k: next(gen)):
            text = self.ai.generate_with_functions('comi arroz', TOOLS, lambda n, a: {'success': True},
                                                   deadline_seconds=45,
                                                   timeout_reply=coach_ai_service.coach_timeout_reply)
        self.assertIn('Já registrei', text)

    def test_timeout_with_only_reads_suggests_trying_again(self):
        with patch.object(ai_service.requests, 'post', side_effect=ai_service.requests.Timeout()):
            text = self.ai.generate_with_functions('como estou?', TOOLS, lambda n, a: {}, deadline_seconds=45,
                                                   timeout_reply=coach_ai_service.coach_timeout_reply)
        self.assertIn('Demorei demais', text)

    def test_gevent_timeout_cuts_a_call_that_never_finishes(self):
        # OpenRouter keep-alive whitespace means requests' own timeout may never fire
        with patch.object(ai_service, '_gevent_active', return_value=True), \
             patch.object(ai_service.requests, 'post', side_effect=lambda *a, **k: gevent.sleep(5)):
            with self.assertRaises(AIDeadlineExceeded):
                self.ai.chat_completion([{'role': 'user', 'content': 'oi'}], timeout=0.2)

    def test_no_time_left_fails_fast_without_calling(self):
        with patch.object(ai_service.requests, 'post') as post:
            with self.assertRaises(AIDeadlineExceeded):
                self.ai.chat_completion([{'role': 'user', 'content': 'oi'}], timeout=0)
        post.assert_not_called()

    def test_deadline_env(self):
        with patch.dict(os.environ, {'COACH_DEADLINE_SECONDS': '30'}):
            self.assertEqual(coach_ai_service.coach_deadline_seconds(), 30)
        with patch.dict(os.environ, {'COACH_DEADLINE_SECONDS': 'x'}):
            self.assertEqual(coach_ai_service.coach_deadline_seconds(), 45)


if __name__ == '__main__':
    unittest.main()
