"""Retry da geração do treino inicial (Sentry FITGEN-BACKEND-C / FITGEN-BACKEND-D).

Em produção o OpenRouter respondeu HTTP 429 e as 3 tentativas saíram em ~170 ms:
AIService.generate_json devolve None em vez de levantar, então o time.sleep que só
existia no except nunca rodava. Agora há espera crescente entre tentativas.
"""
import os
os.environ.setdefault('SECRET_KEY', 'isolated-test-secret-key')
os.environ.setdefault('JWT_SECRET_KEY', 'isolated-test-jwt-secret-key-32-chars')
os.environ.setdefault('DATABASE_URL', 'sqlite://')
import unittest
from unittest.mock import MagicMock, patch

from app.modules.training.application import workout_generator as wg


class WorkoutGeneratorRetryTests(unittest.TestCase):
    def setUp(self):
        self.enterContext(patch.object(wg, 'release_db_connection'))

    def _service(self, responses):
        service = wg.WorkoutGeneratorService.__new__(wg.WorkoutGeneratorService)
        service.ai = MagicMock()
        service.ai.generate_json.side_effect = responses
        service._build_prompt = MagicMock(return_value=('prompt', {}))
        service._save_plan_to_db = MagicMock(return_value='plano')
        return service

    def test_waits_between_attempts_when_ai_returns_none(self):
        service = self._service([None, None, {'days': []}])
        with patch.object(wg.time, 'sleep') as sleep:
            self.assertEqual(service.generate_workout_plan(MagicMock(), MagicMock()), 'plano')
        self.assertEqual(service.ai.generate_json.call_count, 3)
        delays = [c.args[0] for c in sleep.call_args_list]
        self.assertEqual(len(delays), 2)
        self.assertGreater(delays[0], 0)
        self.assertGreater(delays[1], delays[0])

    def test_no_wait_after_last_failed_attempt(self):
        service = self._service([None, RuntimeError('HTTP 429'), None])
        with patch.object(wg.time, 'sleep') as sleep:
            with self.assertRaisesRegex(Exception, 'Failed to generate workout plan from AI'):
                service.generate_workout_plan(MagicMock(), MagicMock())
        self.assertEqual(sleep.call_count, 2)
        service._save_plan_to_db.assert_not_called()

    def test_no_wait_when_first_attempt_succeeds(self):
        service = self._service([{'days': []}])
        with patch.object(wg.time, 'sleep') as sleep:
            service.generate_workout_plan(MagicMock(), MagicMock())
        sleep.assert_not_called()


if __name__ == '__main__':
    unittest.main()
