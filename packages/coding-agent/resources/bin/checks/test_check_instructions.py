"""Tests for check-instructions.py on synthetic resource trees."""

import importlib.util
import json
import os
import subprocess
import tempfile
import unittest
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
from typing import Any
from unittest import mock

spec = importlib.util.spec_from_file_location(
    "check_instructions", Path(__file__).resolve().parent / "check-instructions.py"
)
assert spec is not None and spec.loader is not None
ci = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ci)


def write(path: Path, text: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    return path


class Helpers(unittest.TestCase):
    def test_strip_block_comments_keeps_fenced_code(self) -> None:
        text = "a\n<!-- one-line -->\n<!--\nhidden\n-->\n```\n<!-- kept -->\n```\nb"
        self.assertEqual(ci.strip_block_comments(text), "a\n```\n<!-- kept -->\n```\nb")

    def test_split_frontmatter(self) -> None:
        self.assertEqual(ci.split_frontmatter("---\na: 1\n---\nbody"), ("a: 1", "body"))
        self.assertEqual(ci.split_frontmatter("body"), (None, "body"))

    def test_code_spans_skip_fences(self) -> None:
        spans = ci.code_spans("see `x` here\n```\n`y`\n```\n`z`")
        self.assertEqual([s for _, s in spans], ["x", "z"])

    def test_check_paths(self) -> None:
        self.assertEqual(
            ci.check_paths("~/definitely/missing/file.txt."),
            ["caminho inexistente: ~/definitely/missing/file.txt"],
        )
        self.assertEqual(ci.check_paths("~/glob/*"), [])
        self.assertEqual(ci.check_paths("~/.nycode/agent/claude-hud.json"), [])


class CheckFile(unittest.TestCase):
    def check(
        self,
        kind: str,
        text: str,
        tools: set[str] | None = None,
        servers: set[str] | None = None,
    ) -> list[str]:
        with tempfile.TemporaryDirectory() as tmp:
            path = write(Path(tmp) / "f.md", text)
            with mock.patch.object(ci, "SKILLS", {"known-skill"}):
                return ci.check_file(path, kind, tools, servers, {"help", "skill"})  # type: ignore[no-any-return]

    def test_rule_frontmatter(self) -> None:
        self.assertEqual(self.check("rule", "---\npaths: x\n---\nok"), [])
        self.assertTrue(
            any(
                "só aceita paths" in p
                for p in self.check("rule", "---\nname: x\n---\nok")
            )
        )
        self.assertTrue(
            any(
                "frontmatter inválido" in p
                for p in self.check("rule", "---\na: [\n---\nok")
            )
        )

    def test_command_needs_description(self) -> None:
        self.assertIn(
            "command sem description", self.check("command", "---\nx: 1\n---\nbody")
        )
        self.assertEqual(self.check("command", "---\ndescription: d\n---\nbody"), [])
        self.assertTrue(
            any(
                "frontmatter inválido" in p
                for p in self.check("command", "---\na: [\n---\nb")
            )
        )

    def test_contract_limits_and_imports(self) -> None:
        long_text = "\n".join(["line"] * 200)
        self.assertTrue(any("linhas" in p for p in self.check("claude", long_text)))
        self.assertTrue(
            any(
                "@foo seria tratado" in p for p in self.check("claude", "use @foo here")
            )
        )
        self.assertEqual(self.check("claude", "use `@foo` here"), [])

    def test_names_commands_skills(self) -> None:
        text = "`unknown-name` `known-skill` `/help` `/nope` `/skill:known-skill` `/skill:missing` `/skill:<name>`"
        probs = self.check("rule", text)
        self.assertIn("nome desconhecido (skill/agente?): unknown-name", probs)
        self.assertIn("comando inexistente no nycode: /nope", probs)
        self.assertIn("skill inexistente: missing", probs)
        self.assertEqual(len(probs), 3)

    def test_mcp_names(self) -> None:
        text = "`mcp__ghost__tool` `mcp__real__nope` `mcp__real__yes`"
        probs = self.check("rule", text, {"mcp__real__yes"}, {"real"})
        self.assertEqual(
            probs,
            [
                "servidor MCP inexistente: mcp__ghost__tool",
                "ferramenta MCP inexistente: mcp__real__nope",
            ],
        )
        self.assertEqual(self.check("rule", text), [])

    def test_claude_only_vocabulary(self) -> None:
        probs = self.check("rule", "Use ToolSearch now\nNo ToolSearch here")
        self.assertEqual(probs, ["linha 1: ToolSearch (nycode: tool_search)"])


class Tree(unittest.TestCase):
    def test_check_skills(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write(root / "skills/ok/SKILL.md", "---\nname: ok\ndescription: d\n---\n")
            write(root / "skills/nofm/SKILL.md", "body")
            write(root / "skills/badyaml/SKILL.md", "---\na: [\n---\n")
            write(root / "skills/notmap/SKILL.md", "---\n- a\n---\n")
            write(
                root / "skills/wrong/SKILL.md",
                "---\nname: other\ndescription: ' '\n---\n",
            )
            (root / "skills/empty").mkdir()
            with mock.patch.object(ci, "RESOURCES", root):
                probs = ci.check_skills()
        self.assertEqual(len(probs), 5)
        self.assertIn("skills/nofm/SKILL.md: sem frontmatter", probs)
        self.assertTrue(any("YAML inválido" in p for p in probs))
        self.assertIn("skills/notmap/SKILL.md: frontmatter não é um mapa", probs)
        self.assertIn("skills/wrong/SKILL.md: name 'other' != diretório 'wrong'", probs)
        self.assertIn("skills/wrong/SKILL.md: description ausente ou vazia", probs)

    def test_slash_commands(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write(root / "ext/a.ts", 'api.registerCommand("alpha", {})')
            write(root / "slash.md", "| `/beta [x]` | d |\n")
            write(root / "res/commands/gamma.md", "x")
            with (
                mock.patch.object(ci, "EXT_DIRS", [root / "ext"]),
                mock.patch.object(ci, "SLASH_DOC", root / "slash.md"),
                mock.patch.object(ci, "RESOURCES", root / "res"),
            ):
                self.assertEqual(
                    ci.slash_commands(), {"skill", "alpha", "beta", "gamma"}
                )

    def test_mcp_tools_from_cache_and_without_binary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            cache = Path(tmp) / "mcp.json"
            data = {"servers": [{"name": "my-srv", "tools": ["t-1", {"name": "t2"}]}]}
            cache.write_text(json.dumps(data))
            with mock.patch.object(ci, "CACHE", cache):
                self.assertEqual(
                    ci.mcp_tools(False),
                    ({"mcp__my_srv__t_1", "mcp__my_srv__t2"}, {"my_srv"}),
                )
                with mock.patch.object(ci.shutil, "which", return_value=None):
                    self.assertIsNone(ci.mcp_tools(True))
                done = subprocess.CompletedProcess(
                    [], 0, stdout=json.dumps({"servers": []})
                )
                with (
                    mock.patch.object(ci.shutil, "which", return_value="/bin/nycode"),
                    mock.patch.object(ci.subprocess, "run", return_value=done),
                ):
                    self.assertEqual(ci.mcp_tools(True), (set(), set()))

    def test_check_arg_expansion(self) -> None:
        hits = json.dumps([{"file": "skills/x/SKILL.md", "line": 3, "text": "run $1"}])
        done = subprocess.CompletedProcess([], 0, stdout=hits)
        with mock.patch.object(ci.subprocess, "run", return_value=done):
            self.assertEqual(len(ci.check_arg_expansion()), 1)
        with mock.patch.object(ci.subprocess, "run", side_effect=OSError("no node")):
            self.assertIn("detector de $N falhou", ci.check_arg_expansion()[0])

    def test_main_reports_problems_and_clean_tree(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write(root / "instructions/contract.md", "clean")
            write(root / "rules/r.md", "bad `/nope`")
            write(root / "rules/ref/x.md", "ref")
            write(root / "commands/c.md", "---\ndescription: d\n---\nbody")
            write(root / "skills/s/SKILL.md", "---\nname: s\ndescription: d\n---\n")
            with (
                mock.patch.object(ci, "RESOURCES", root),
                mock.patch.object(ci, "mcp_tools", return_value=None),
                mock.patch.object(ci, "slash_commands", return_value={"c"}),
                mock.patch.object(ci, "check_arg_expansion", return_value=[]),
                mock.patch.object(
                    ci, "SOURCES", []
                ),  # the machine's ~/.claude is not part of this tree
                mock.patch.object(ci.sys, "argv", ["check-instructions.py"]),
            ):
                out = StringIO()
                with redirect_stdout(out):
                    self.assertEqual(ci.main(), 1)
                self.assertIn(
                    "rules/r.md: comando inexistente no nycode: /nope", out.getvalue()
                )
                write(root / "rules/r.md", "fine")
                out = StringIO()
                with redirect_stdout(out):
                    self.assertEqual(ci.main(), 0)
                self.assertIn("0 problema(s)", out.getvalue())


class Sources(unittest.TestCase):
    """The divergence check against the Claude sources, on a throwaway HOME."""

    def setUp(self) -> None:
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.home = Path(tmp.name)
        self.src = write(self.home / ".claude/CLAUDE.md", "contract v1")
        self.hook = write(self.home / ".claude/hooks/plan/plan_gate.py", "gate v1")
        write(self.home / ".claude/settings.json", json.dumps({"hooks": {"Stop": []}}))
        agent = self.home / "agent"
        patches: list[Any] = [
            mock.patch.object(ci, "HOME", self.home),
            mock.patch.object(ci, "SOURCES", [self.src, self.hook]),
            mock.patch.object(
                ci,
                "PORTS",
                {self.src: "resources/instructions/contract.md", self.hook: "x"},
            ),
            mock.patch.object(ci, "HOOK_NOT_PORTED", set()),
            mock.patch.object(ci, "MANIFEST", agent / "instructions.sources.json"),
            mock.patch.object(ci, "SNAPSHOT", agent / "instructions.sources"),
        ]
        patches.append(
            mock.patch.dict(os.environ, {"HOME": str(self.home)})
        )  # `~` expands to the throwaway HOME
        for patch in patches:
            patch.start()
            self.addCleanup(patch.stop)

    def run_check(
        self, accept: bool = False, diff: bool = False
    ) -> tuple[list[str], str]:
        out = StringIO()
        with redirect_stdout(out):
            probs = ci.check_sources(accept, diff)
        return probs, out.getvalue()

    def test_skipped_without_any_source(self) -> None:
        self.src.unlink()
        self.hook.unlink()
        probs, out = self.run_check()
        self.assertEqual(probs, [])
        self.assertIn("checagem de divergência pulada", out)

    def test_missing_manifest_is_reported_and_accept_writes_it(self) -> None:
        probs, _ = self.run_check()
        self.assertTrue(any(p.startswith("manifesto ausente") for p in probs))
        probs, out = self.run_check(accept=True)
        self.assertEqual(probs, [])
        self.assertIn("manifesto e snapshot gravados", out)
        self.assertTrue(ci.MANIFEST.exists())
        self.assertEqual(ci.snapshot_of(self.src).read_text(), "contract v1")

    def test_changed_source_is_reported_with_its_diff(self) -> None:
        self.run_check(accept=True)
        self.src.write_text("contract v2")
        probs, out = self.run_check(diff=True)
        self.assertEqual(
            probs,
            [
                "fonte mudou desde a porta: ~/.claude/CLAUDE.md (--diff, portar a mudança, depois --accept-sources)"
            ],
        )
        self.assertIn("-contract v1", out)
        self.assertIn("+contract v2", out)

    def test_new_rule_hook_and_changed_inventory_are_reported(self) -> None:
        self.run_check(accept=True)
        write(self.home / ".claude/rules/extra.md", "r")
        write(self.home / ".claude/hooks/new_hook.py", "h")
        write(self.home / ".claude/hooks/tests/skip.py", "t")
        write(
            self.home / ".claude/settings.json",
            json.dumps({"hooks": {"Stop": [{"matcher": "x"}]}}),
        )
        probs, out = self.run_check(diff=True)
        self.assertIn("rule nova no Claude, sem porta: ~/.claude/rules/extra.md", probs)
        self.assertTrue(
            any(
                "hook novo no Claude, sem porta: ~/.claude/hooks/new_hook.py" in p
                for p in probs
            )
        )
        self.assertFalse(any("skip.py" in p for p in probs))
        self.assertTrue(
            any(p.startswith("inventário de hooks do Claude mudou") for p in probs)
        )
        self.assertIn("inventário atual", out)

    def test_source_missing_from_the_manifest_is_reported(self) -> None:
        self.run_check(accept=True)
        saved = json.loads(ci.MANIFEST.read_text())
        del saved["~/.claude/CLAUDE.md"]
        ci.MANIFEST.write_text(json.dumps(saved))
        probs, _ = self.run_check()
        self.assertEqual(
            probs,
            [
                "fonte sem registro no manifesto: ~/.claude/CLAUDE.md (conferir a porta, depois --accept-sources)"
            ],
        )

    def test_inventory_follows_enabled_plugins(self) -> None:
        install = self.home / "plugins/p"
        write(install / "hooks/hooks.json", json.dumps({"Stop": [1]}))
        write(
            install / ".claude-plugin/plugin.json", json.dumps({"hooks": "extra.json"})
        )
        write(install / "extra.json", json.dumps({"PreToolUse": []}))
        write(
            self.home / ".claude/plugins/installed_plugins.json",
            json.dumps(
                {
                    "plugins": {
                        "p": [{"installPath": str(install)}],
                        "off": [{"installPath": str(install)}],
                    }
                }
            ),
        )
        write(
            self.home / ".claude/settings.json",
            json.dumps({"enabledPlugins": {"p": True, "off": False, "gone": True}}),
        )
        data = json.loads(ci.hook_inventory())
        self.assertEqual(list(data["plugins"]), ["p"])
        self.assertEqual(data["plugins"]["p"]["hooks.json"], {"Stop": [1]})
        self.assertEqual(
            data["plugins"]["p"]["plugin.json hooks"],
            {"extra.json": {"PreToolUse": []}},
        )

    def test_diff_without_a_snapshot_says_so(self) -> None:
        out = StringIO()
        with redirect_stdout(out):
            ci.show_diff(self.src)
            ci.show_inventory_diff()
        self.assertIn("sem snapshot da porta anterior", out.getvalue())
        self.assertIn("sem snapshot do inventário anterior", out.getvalue())


if __name__ == "__main__":
    unittest.main()
