#!/usr/bin/env python3
"""Renomeia pi -> nycode em um worktree. Uso: rename.py ROOT [--fork] [--dry]

Sem --fork (o padrao, usado por all.sh) renomeia a arvore do upstream e tem de reproduzir f523ebd25 (08 §10.1 item 5).
Com --fork aplica tambem as regras da arvore do nycode (D-45)."""

import collections
import os
import re
import subprocess
import sys

root = sys.argv[1]
dry = "--dry" in sys.argv
fork = "--fork" in sys.argv
os.chdir(root)

SKIP_NAMES = {"package-lock.json", "flake.lock", "LICENSE", "NOTICE"}
SKIP_BASENAME_RE = re.compile(r"^CHANGELOG(\..*)?\.md$")
SKIP_PATH_PARTS = ("/third-party/", "examples/extensions/doom-overlay/doom/")
# Only for the fork tree (--fork, D-45). Paths that name the pi on purpose:
# the plan, the measured arms, the rename machinery, the migration from pi.
# Each one is also covered by scripts/ci/lint/residuo/residuo-allow.txt or by the gate's fixed exemptions.
SKIP_PATH_PREFIXES = (
    "import/",
    "bench/",
    "README.md",
    ".gitleaksignore",
    ".github/",
    "docs/bench/",
    "docs/fork/",
    "docs/harness/",
    "docs/migration/",
    "docs/specs/",
    "scripts/fork/",
    "scripts/ci/lint/criterio2/",
    "scripts/ci/lint/residuo/",
    "packages/coding-agent/src/migrations/from-pi",
    "packages/coding-agent/test/harness/migrations/from-pi",
    "packages/coding-agent/test/harness/hooks/fixtures/",  # payloads captured from a real session
)

files = subprocess.check_output(["git", "ls-files", "-z"], text=True).split("\0")
files = [f for f in files if not f.endswith(".jsonl")]
files = [f for f in files if f and os.path.isfile(f) and not os.path.islink(f)]

WORKSPACE_PI = "agent-core|ai|codemode|coding-agent-install|coding-agent|durable|env|evals|mcp|schema|telemetry|tui"
KEEP_SCOPE = (
    r"@earendil-works/(?:gondolin[\w./-]*|elanor[\w./-]*|design-tokens|dev-probe|p2-contracts|p2\b|"
    r"pi-agent-old|pi-server|pi-client|pi-protocol|schema\b|x\b|undeclared)"
)

FORK_HEAD_MASKS = [
    # records under docs/ keep their file names (docs/harness/pi-*.md, docs/research/*-pi-*.md)
    re.compile(r"docs/(?:[\w.-]+/)*[\w.-]*?(?<![A-Za-z0-9])pi[-_][\w.-]+"),
    # the contract title the headless-lean extension still accepts from the origin harness (`# Working contract (pi)`)
    re.compile(r"(?<![\w)])\(pi\)|\(\?:pi\|nycode\)"),
    re.compile(r"from-pi[\w-]*"),  # `nycode migrate from-pi` and the files that hold it
    re.compile(
        r"(?<![\w.?)\]])\.pi(?![\w-])"
    ),  # the `.pi` directory: the legacy location tests assert is ignored (D-33)
    re.compile(r"\bPI_CODING_AGENT_DIR\b"),
    re.compile(
        r"\bPI_CODE_\w*"
    ),  # old pi-code variables that tests assert are no longer read (D-33)
]
FORK_MASKS_AFTER_REPO = [
    re.compile(
        r"(?<=from )earendil-works/pi(?![\w-])"
    ),  # attribution comments name the upstream repository
    re.compile(
        r"@earendil-works\\/pi-(?:server|client|protocol|agent-old)"
    ),  # KEEP_SCOPE with an escaped slash
]
PI_MONO_MASK = re.compile(
    r"(?<=earendil-works\))\\?/pi-mono"
    if fork
    else r"(?<=\(\?:badlogic\|earendil-works\)/)pi-mono"
)  # fork: LEGACY_REPO_RE, with or without the escaped slash

masks = [
    *(FORK_HEAD_MASKS if fork else []),
    re.compile(r"@mariozechner/[\w./-]*"),
    re.compile(r"HazAT/pi-[\w-]+"),
    re.compile(r"badlogic/pi-observers"),
    re.compile(r"pi-markdown-preview"),
    re.compile(r"pi-interactive-subagents"),
    re.compile(
        r"(?:earendil-works|badlogic)/pi(?:-mono)?/(?:issues|pull|discussions)/\d+"
    ),
    re.compile(r"(?:earendil-works|badlogic)/pi(?:-mono)?#\d+"),
    re.compile(r"(?<!@)earendil-works/pi-(?!mono)[\w-]+"),
    PI_MONO_MASK,
    *(FORK_MASKS_AFTER_REPO if fork else []),
    re.compile(r"npm:pi-[\w@.-]*"),
    re.compile(r"@oh-my-pi/[\w.-]+"),
    re.compile(r"[pP]\{Pi\}"),
    re.compile(r"\bpi-(?:formatter|tools)\b"),
    re.compile(r"pi\.dev"),
    re.compile(r"pkg\.earendil\.com"),
    re.compile(r"pi\.LICENSE"),
    re.compile(r"earendil-works/pi-agent-old"),
    re.compile(KEEP_SCOPE),
    re.compile(
        r"[A-Za-z0-9+/=]{40,}"
    ),  # filtrado abaixo: so base64 (digito + maiuscula)
]

REPO = r"(?:earendil-works|badlogic)/pi(?:-mono)?(?![\w-])"
FORK_PRE = [
    # pi-code (the extension pack) is not the pi: it becomes nycode (D-48)
    (re.compile(r"(?<![\w-])pi-code(?![A-Za-z0-9])"), "nycode"),
    # statements about the upstream agent stay true: "pi 1.5.2" -> "upstream 1.5.2"
    (re.compile(r"(?<![\w-])[pP]i(?= v?\d+\.\d)"), "upstream"),
    (re.compile(r"(?<=[uU]pstream )[pP]i(?![\w-])"), "agent"),
    (re.compile(r"(?<=Upstream \()pi (?=v?\d)"), ""),
]
pre = [
    *(FORK_PRE if fork else []),
    # URLs do repo
    (
        re.compile(
            r"(?:(?<=github\.com/)|(?<=github:)|(?<=github\.com:)|(?<![\w@./:-]))"
            + REPO
        ),
        "marcioazam/nycode",
    ),
]
WS = "agent-core|ai|codemode|coding-agent-install|coding-agent|durable|env|evals|mcp|schema|telemetry|tui"
SEP = r"(\\\\|\\/|/|\+|[\"'`]\s*,\s*[\"'`])"
scope = [
    (
        re.compile(r"@earendil-works" + SEP + rf"pi-({WS})(?![A-Za-z0-9-])"),
        r"@nycode\1\2",
    ),
    (
        re.compile(
            r"@earendil-works"
            + SEP
            + r"(chord|p3-sign-in|p3-sessions|p3-runner|p3-control|p3)(?![A-Za-z0-9-])"
        ),
        r"@nycode\1\2",
    ),
    (re.compile(r"@earendil-works/pi-(?=[\"'`])"), "@nycode/"),
]
words = [
    (re.compile(r"\bPI_(?=[A-Z0-9])"), "NYCODE_"),
    (re.compile(r"(?<![A-Za-z0-9])pi(?![a-z0-9])"), "nycode"),
    (re.compile(r"(?<![A-Za-z])Pi(?![a-z])"), "Nycode"),
    (re.compile(r"(?<=[a-z])Pi(?![a-z])"), "Nycode"),
]

seen: collections.Counter[str] = collections.Counter()


def transform(text: str, path: str) -> str:
    hold: list[str] = []

    def keep(m: re.Match[str]) -> str:
        s = m.group(0)
        if len(s) >= 40 and not (
            re.search(r"\d", s) and re.search(r"[A-Z]", s) and re.search(r"[a-z]", s)
        ):
            return s  # caminho ou identificador longo, nao base64
        hold.append(s)
        return f"\x00{len(hold) - 1}\x00"

    for rx in masks:
        text = rx.sub(keep, text)
    for rx, rep in pre + scope:
        text = rx.sub(rep, text)
    for rx, rep in words:
        if dry:
            for m in rx.finditer(text):
                a, b = max(0, m.start() - 14), min(len(text), m.end() + 14)
                seen[re.sub(r"\s+", " ", text[a:b])] += 1
        text = rx.sub(rep, text)
    return re.sub(r"\x00(\d+)\x00", lambda m: hold[int(m.group(1))], text)


def skipped(f: str) -> bool:
    return bool(
        os.path.basename(f) in SKIP_NAMES
        or SKIP_BASENAME_RE.match(os.path.basename(f))
        or (fork and f.startswith(SKIP_PATH_PREFIXES))
        or any(p in "/" + f for p in SKIP_PATH_PARTS)
    )


changed = 0
for f in files:
    if skipped(f):
        continue
    with open(f, "rb") as src:
        raw = src.read()
    if b"\0" in raw:
        continue
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        continue
    new = transform(text, f)
    if new != text:
        changed += 1
        if not dry:
            with open(f, "wb") as dst:
                dst.write(new.encode("utf-8"))
print("arquivos de conteudo alterados:", changed)

# renomeia caminhos (componentes)
renames = []
for f in files:
    if skipped(f):
        continue
    new = "/".join(
        re.sub(
            r"(?<![A-Za-z])Pi(?=[A-Z])",
            "Nycode",
            re.sub(r"(?<![A-Za-z0-9])pi(?![a-z0-9])", "nycode", part),
        )
        for part in f.split("/")
    )
    if new != f:
        renames.append((f, new))
for a, b in renames:
    print("mv", a, "->", b)
    if not dry:
        os.makedirs(os.path.dirname(b) or ".", exist_ok=True)
        subprocess.check_call(["git", "mv", a, b])

if dry:
    sys.stdout.writelines(f"{v:6d}  {k}\n" for k, v in seen.most_common())
