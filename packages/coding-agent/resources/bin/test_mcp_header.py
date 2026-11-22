"""mcp-header.sh with a fake secrets directory (a temporary HOME, never the real one)."""

import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent / "mcp-header.sh"


class McpHeaderTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.home = Path(self.tmp.name)
        secrets = self.home / ".config" / "claude-secrets"
        secrets.mkdir(parents=True)
        (secrets / "srv").write_text("Bearer abc\r\n")
        (secrets / "hdr").write_text("X-Key: val\n")
        (secrets / ".hid").write_text("dot-secret\n")
        (self.home / ".config" / "leak").write_text("outside-secret\n")

    def run_script(self, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["sh", str(SCRIPT), *args],
            env={"HOME": str(self.home), "PATH": "/usr/bin:/bin"},
            capture_output=True,
            text=True,
            check=False,
        )

    def test_accepts_a_plain_server_name(self) -> None:
        for name, want in [("srv", "Bearer abc"), ("hdr", "val")]:
            with self.subTest(name=name):
                done = self.run_script(name)
                self.assertEqual((done.returncode, done.stdout), (0, want))

    def test_refuses_names_that_leave_the_secrets_directory(self) -> None:
        for name in ["", "../leak", "a/b", "..", ".hid", "-x", "a..b"]:
            with self.subTest(name=name):
                done = self.run_script(name)
                self.assertNotEqual(done.returncode, 0)
                self.assertEqual(done.stdout, "")
                self.assertNotEqual(done.stderr, "")

    def test_refuses_a_missing_argument(self) -> None:
        done = self.run_script()
        self.assertNotEqual(done.returncode, 0)
        self.assertEqual(done.stdout, "")

    def test_a_missing_secret_is_reported(self) -> None:
        done = self.run_script("nope")
        self.assertEqual(done.returncode, 1)
        self.assertIn("missing", done.stderr)


if __name__ == "__main__":
    unittest.main()
