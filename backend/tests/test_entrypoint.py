"""The container entrypoint must parse: a stray quote there takes every deploy down."""
import shutil
import subprocess
import unittest
from pathlib import Path

ENTRYPOINT = Path(__file__).resolve().parents[1] / 'entrypoint.sh'


class EntrypointTests(unittest.TestCase):
    @unittest.skipUnless(shutil.which('sh'), 'needs a POSIX shell')
    def test_entrypoint_is_valid_shell(self):
        result = subprocess.run(['sh', '-n', str(ENTRYPOINT)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_startup_block_has_no_single_quote_inside(self):
        # The startup tasks run inside sh -ec '...': an apostrophe in a comment ends the quoted block.
        text = ENTRYPOINT.read_text()
        block = text.split("sh -ec '", 1)[1].split("\n'\n", 1)[0]
        self.assertNotIn("'", block)


if __name__ == '__main__':
    unittest.main()
