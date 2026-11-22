"""The Alembic history stays a single line from the baseline (it was broken before:
a revision pointing at a missing parent, and two heads both called add_phone_to_user)."""
import os
import unittest

from alembic.config import Config
from alembic.script import ScriptDirectory

MIGRATIONS = os.path.join(os.path.dirname(__file__), '..', 'migrations')


class MigrationHistoryTests(unittest.TestCase):
    def setUp(self):
        config = Config()
        config.set_main_option('script_location', MIGRATIONS)
        self.script = ScriptDirectory.from_config(config)
        self.revisions = list(self.script.walk_revisions())

    def test_one_head_one_root_no_missing_parents(self):
        self.assertEqual(len(self.script.get_heads()), 1, 'two migrations share a parent: merge them')
        roots = [r.revision for r in self.revisions if r.down_revision is None]
        self.assertEqual(roots, ['0001_baseline'])
        known = {r.revision for r in self.revisions}
        for rev in self.revisions:
            parents = rev.down_revision if isinstance(rev.down_revision, tuple) else (rev.down_revision,)
            for parent in parents:
                self.assertTrue(parent is None or parent in known, f'{rev.revision} points at missing {parent}')

    def test_deploy_stamps_the_root(self):
        from app.commands import BASELINE_REVISION
        self.assertEqual(BASELINE_REVISION, '0001_baseline')


if __name__ == '__main__':
    unittest.main()
