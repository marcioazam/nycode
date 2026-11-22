"""Regras do guard que não dependem do léxico: dispositivos, git push, leitura negada e Grep.
Nenhuma executa nada; só os.path e listagem de diretório."""

import os
import re
import shlex

from permissions.parse import SEPARATORS, mask_text, short_flags, strip_prefixes  # type: ignore[import-not-found,unused-ignore]

Finding = tuple[str, str]
HOME = os.path.expanduser("~")
HOMES = {
    HOME,
    os.path.realpath(HOME),
}  # a lista de segredos vale para o HOME e para o caminho real dele
PROTECTED_BRANCHES = {"main", "master"}
DEV_SAFE_RE = re.compile(
    r"^/dev/(null|zero|full|stdout|stderr|stdin|tty|fd/.+|pts/.+|shm/.+)$"
)
PUSH_VALUE_OPTS = {"-o", "--push-option", "--repo", "--receive-pack", "--exec"}
GIT_VALUE_OPTS = {"-C", "-c", "--git-dir", "--work-tree"}
GREP_LISTING_LIMIT = 20_000

READ_DENY_DIR_NAMES = (".ssh", ".config/claude-secrets", ".gnupg")
READ_DENY_FILE_NAMES = (
    ".codex/auth.json",
    ".config/mcp/secrets.env",
    ".nycode/agent/auth.json",
    ".nycode/agent/mcp-auth.json",
    ".nycode/agent/.credentials.json",
    ".nycode/agent/claude-home/.credentials.json",
    ".nycode/agent/local.env",
    ".aws/credentials",
    ".netrc",
    ".git-credentials",
    ".config/gh/hosts.yml",
    ".docker/config.json",
    ".kube/config",
    ".npmrc",
    ".pypirc",
)
READ_DENY_DIRS = [os.path.join(h, d) for h in HOMES for d in READ_DENY_DIR_NAMES]
READ_DENY_FILES = {os.path.join(h, f) for h in HOMES for f in READ_DENY_FILE_NAMES}
CLAUDE_CREDENTIALS_RE = re.compile(
    r"^("
    + "|".join(re.escape(h) for h in HOMES)
    + r")/\.claude(-[^/]+)?/\.credentials\.json$"
)
READ_DENY_ENV_RE = re.compile(r"^\.env(\..+)?$")  # G7: todo .env.<x> ...
READ_ENV_SAFE_SUFFIXES = (
    ".example",
    ".sample",
    ".template",
    ".dist",
)  # ... exceto modelos sem segredo
PROC_ENVIRON_RE = re.compile(r"^/proc/[^/]+(/task/[^/]+)?/environ$")


# ---------- dispositivos (D8) ----------


def dev_blocked(target: str) -> bool:
    """Escrita em /dev/* é negada fora de null, zero, full, stdout, stderr, stdin, tty, fd/*, pts/* e shm/*,
    depois de normalizar o caminho (`/dev//sda`, `/dev/./sda`, `/dev/shm/../sda`)."""
    if not target.startswith("/"):
        return False
    p = re.sub(r"^/+", "/", os.path.normpath(target))
    return p.startswith("/dev/") and not DEV_SAFE_RE.match(p)


# ---------- git (D7) ----------


def _is_force(flag: str) -> bool:
    return flag == "-f" or flag.startswith("--force")


def _deletes_protected(rest: list[str]) -> bool:
    def strip(a: str) -> str:
        return a.removeprefix("refs/heads/")

    pos = [a for a in rest if not a.startswith("-")]
    if any(
        a.lstrip("+").startswith(":") and strip(a.lstrip("+")[1:]) in PROTECTED_BRANCHES
        for a in pos
    ):
        return True
    return bool(short_flags(rest) & {"--delete", "-d"}) and any(
        strip(a) in PROTECTED_BRANCHES for a in pos
    )


def current_branch(cwd: str) -> str | None:
    """Branch atual lendo HEAD (`.git/HEAD` ou o gitdir de worktree) a partir de cwd, sem subprocesso."""
    d = os.path.abspath(cwd) if cwd else ""
    try:
        while d:
            g = os.path.join(d, ".git")
            if os.path.isfile(g):
                with open(g, encoding="utf-8") as f:
                    first = f.readline().strip()
                if not first.startswith("gitdir:"):
                    return None
                g = os.path.join(d, first[7:].strip())
            if os.path.isdir(g):
                with open(os.path.join(g, "HEAD"), encoding="utf-8") as f:
                    head = f.readline().strip()
                return (
                    head.removeprefix("ref: refs/heads/")
                    if head.startswith("ref: refs/heads/")
                    else None
                )
            parent = os.path.dirname(d)
            if parent == d:
                break
            d = parent
    except (OSError, UnicodeDecodeError):
        pass
    return None


def _check_push(rest: list[str], cwd: str = "") -> list[Finding]:
    flags = short_flags(rest)
    pos: list[str] = []
    skip = False
    for a in rest:
        if skip:
            skip = False
        elif a in PUSH_VALUE_OPTS:
            skip = True
        elif not a.startswith("-"):
            pos.append(a)
    refspecs = pos[1:]  # o primeiro posicional é o remoto
    force = any(_is_force(f) for f in flags) or any(a.startswith("+") for a in pos)
    targets = {a.lstrip("+").split(":")[-1].removeprefix("refs/heads/") for a in pos}
    head = current_branch(cwd) or ""
    targets |= {head for t in targets if t in ("HEAD", "@")}
    if _deletes_protected(rest):
        return [("deny", "git push apagando main/master")]
    if any(
        f == "--mirror" or (len(f) >= 5 and "--mirror".startswith(f)) for f in flags
    ):
        return [("deny", "git push forçado para main/master")]
    if force and targets & PROTECTED_BRANCHES:
        return [("deny", "git push forçado para main/master")]
    # Sem refspec (ou só HEAD/@) o destino é o ramo atual, lido do HEAD; --all inclui main. Ramo desconhecido: ask.
    implicit = not refspecs or any(a.lstrip("+") in {"HEAD", "@"} for a in refspecs)
    if force and any(f == "--all" for f in flags):
        return [("deny", "git push forçado com --all inclui main/master")]
    if force and implicit and head in PROTECTED_BRANCHES:
        return [("deny", "git push forçado da branch main/master")]
    return [("ask", "git push" + (" --force" if force else ""))]


def check_git(args: list[str], cwd: str = "") -> list[Finding]:
    found: list[Finding] = []
    i = 0
    while i < len(args) and args[i].startswith("-"):
        a = args[i]
        if (
            a == "-c" and i + 1 < len(args) and args[i + 1].lower().startswith("alias.")
        ) or a.lower().startswith("-calias."):
            found.append(("ask", "git com alias definido em linha (-c alias.x=...)"))
        if a in ("-C", "--git-dir", "--work-tree") or a.startswith(
            ("--git-dir=", "--work-tree=")
        ):
            cwd = ""  # repositório diferente do cwd: branch desconhecida
        i += 2 if a in GIT_VALUE_OPTS else 1
    if i >= len(args):
        return found
    sub, rest = args[i], args[i + 1 :]
    flags = short_flags(rest)
    if sub == "push":
        return found + _check_push(rest, cwd)
    if sub == "reset" and "--hard" in rest:
        return found + [("ask", "git reset --hard")]
    if sub == "clean" and flags & {"-f", "--force"}:
        return found + [("ask", "git clean -f")]
    if sub == "rebase":
        return found + [("ask", "git rebase")]
    if sub == "branch" and flags & {"-D"}:
        return found + [("ask", "git branch -D")]
    if sub == "checkout" and ("--" in rest or "." in rest):
        return found + [("ask", "git checkout descartando mudanças")]
    return found


# ---------- leitura negada (D9) e Grep (D10) ----------


def inside(path: str, root: str) -> bool:
    return bool(root) and (path == root or path.startswith(root.rstrip("/") + "/"))


def _env_denied(base: str) -> bool:
    return bool(READ_DENY_ENV_RE.match(base)) and not base.endswith(
        READ_ENV_SAFE_SUFFIXES
    )


def read_denied(p: str) -> bool:
    """`p` já absoluto e normalizado (o chamador testa também o realpath)."""
    return (
        p in READ_DENY_FILES
        or any(inside(p, d) for d in READ_DENY_DIRS)
        or bool(CLAUDE_CREDENTIALS_RE.match(p))
        or _env_denied(os.path.basename(p))
        or bool(PROC_ENVIRON_RE.match(p))
    )


def _absolute(path: str, cwd: str) -> str:
    return os.path.abspath(
        os.path.expanduser(
            path
            if os.path.isabs(path) or path.startswith("~")
            else os.path.join(cwd or os.getcwd(), path)
        )
    )


def check_read(path: str, cwd: str) -> list[Finding]:
    if not path:
        return []
    p = _absolute(path, cwd)
    if read_denied(p) or read_denied(os.path.realpath(p)):
        return [("deny", f"leitura de segredo bloqueada: {p}")]
    return []


def _covers_secret(p: str) -> str:
    """Caminho que contém um segredo mais fundo, ou qualquer coisa em /proc. Vazio se não cobre."""
    if p == "/proc" or p.startswith("/proc/"):
        return "/proc"
    root = p.rstrip("/") or "/"
    prefix = root + os.sep
    for secret in (*READ_DENY_FILES, *READ_DENY_DIRS):
        if secret != root and secret.startswith(prefix):
            return secret
    return ""


def _grep_denied(p: str) -> str:
    """Motivo (vazio = livre) para um caminho de Grep já absoluto: segredo, dentro de diretório negado,
    $HOME, a raiz, ancestral de um segredo, /proc, ou diretório que guarda direto um segredo."""
    if read_denied(p):
        return "segredo"
    if p in HOMES or p == "/":
        return "diretório amplo (home ou raiz)"
    covered = _covers_secret(p)
    if covered:
        return f"ancestral de {covered}"
    if not os.path.isdir(p):
        return ""
    try:
        with os.scandir(p) as it:
            for k, e in enumerate(it):
                if k >= GREP_LISTING_LIMIT:
                    return "diretório grande demais para conferir"
                if read_denied(e.path) or (
                    e.is_symlink() and read_denied(os.path.realpath(e.path))
                ):
                    return f"guarda {e.name}"
    except OSError:
        return ""
    return ""


def check_grep(path: str | None, cwd: str) -> list[Finding]:
    """Ferramenta Grep (caminho ausente = cwd): o mesmo deny do Read, em arquivo, árvore ou diretório."""
    p = _absolute(path, cwd) if path else os.path.abspath(cwd)
    for cand in dict.fromkeys((p, os.path.realpath(p))):
        why = _grep_denied(cand)
        if why:
            return [("deny", f"Grep em área de segredos bloqueado ({why}): {p}")]
    return []


# ---------- auto-kill: pkill -f / pgrep -f que casa com a própria linha do shell ----------


# Opções do pkill/pgrep que consomem o argumento seguinte (procps-ng).
PGREP_VALUE_OPTS = {
    "-u",
    "-U",
    "-g",
    "-G",
    "-P",
    "-s",
    "-t",
    "-d",
    "--signal",
    "--euid",
    "--uid",
    "--pgroup",
    "--group",
    "--parent",
    "--session",
    "--terminal",
    "--delimiter",
    "--ns",
    "--nslist",
}
PGREP_KILL_RE = re.compile(r"\bpgrep\s+([^|;&)`]*)")
SELF_KILL_MSG = (
    "{0} -f com padrão que casa com a própria linha de comando do shell (o bash -c que roda isto morre, "
    "exit 143/144); use o colchete, ex. '[c]hrome', ou o PID salvo"
)


def full_match_pattern(args: list[str]) -> str | None:
    """Padrão de pkill/pgrep quando -f/--full está presente; senão None."""
    if not (short_flags(args) & {"-f", "--full"}):
        return None
    rest: list[str] = []
    skip = False
    for a in args:
        if skip:
            skip = False
        elif a in PGREP_VALUE_OPTS:
            skip = True
        elif not a.startswith("-"):
            rest.append(a)
    return rest[-1] if rest else None


def matches_self(pattern: str, cmd: str) -> bool:
    try:
        return re.search(pattern, cmd) is not None
    except (
        re.error,
        OverflowError,
        RecursionError,
    ):  # invalid or too large pattern: literal text
        return pattern in cmd


def check_self_kill(cmd: str, top: str) -> list[Finding]:
    """pgrep -f cuja saída vai para kill (`| xargs kill`, `kill $(...)`, crases) e casa com o próprio shell.
    O padrão casa com a linha inteira (o `bash -c` carrega tudo), mas só conta pgrep/kill fora de texto citado."""
    found: list[Finding] = []
    masked = mask_text(cmd)
    for m in PGREP_KILL_RE.finditer(masked):
        before, after = masked[: m.start()], masked[m.end() :]
        to_kill = re.match(r"\s*\|\s*xargs\b[^|;&]*\bkill\b", after) or re.search(
            r"\bkill\b[^;|&]*(\$\(|`)\s*$", before
        )
        if not to_kill:
            continue
        raw = cmd[m.start(1) : m.end(1)]
        try:
            args = shlex.split(raw)
        except ValueError:
            args = raw.split()
        pattern = full_match_pattern(args)
        if pattern and matches_self(pattern, top):
            found.append(("deny", SELF_KILL_MSG.format("pgrep")))
    return found


def pkill_self_match(tokens: list[str], top: str) -> list[Finding]:
    """pkill -f whose pattern matches the shell's own command line. Judged on pieces split only at real command
    separators: a stray parenthesis inside the pattern text does not hide the pattern."""
    found: list[Finding] = []
    piece: list[str] = []
    for t in [*tokens, ";"]:
        if t not in SEPARATORS:
            piece.append(t)
            continue
        real, _ = strip_prefixes(piece)
        piece = []
        if real and real[0] == "pkill":
            pattern = full_match_pattern(real[1:])
            if pattern and matches_self(pattern, top):
                found.append(("deny", SELF_KILL_MSG.format("pkill")))
    return found
