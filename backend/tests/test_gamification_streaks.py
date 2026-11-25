"""A stored streak goes stale when a day is missed; the API must report it as broken."""
import os
os.environ.setdefault('SECRET_KEY', 'isolated-test-secret-key')
os.environ.setdefault('JWT_SECRET_KEY', 'isolated-test-jwt-secret-key-32-chars')
os.environ.setdefault('DATABASE_URL', 'sqlite://')
import unittest
from datetime import date

from app.modules.gamification.interface.routes import live_streak


class LiveStreakTests(unittest.TestCase):
    def test_alive_today_and_yesterday(self):
        today = date(2026, 11, 25)
        self.assertEqual(live_streak(3, date(2026, 11, 25), today), 3)
        self.assertEqual(live_streak(3, date(2026, 11, 24), today), 3)

    def test_broken_after_a_missed_day(self):
        today = date(2026, 11, 25)
        self.assertEqual(live_streak(5, date(2026, 11, 23), today), 0)
        self.assertEqual(live_streak(1, date(2026, 11, 18), today), 0)

    def test_missing_data_is_zero(self):
        self.assertEqual(live_streak(None, None, date(2026, 11, 25)), 0)
        self.assertEqual(live_streak(0, date(2026, 11, 25), date(2026, 11, 25)), 0)


if __name__ == '__main__':
    unittest.main()
