"""Léxico de Bash do guard: máscara de heredoc, substituições, tokens, segmentos e wrappers.
Nunca executa nada. Todo laço é linear no tamanho do comando (auditoria 2026-11-19, seguranca 16 e perf 20)."""

import os
import re
import shlex
from bisect import bisect_left, bisect_right
from collections import defaultdict
from collections.abc import Callable

MAX_CMD = (
    262_144  # acima disso o guard pergunta em vez de analisar (nunca allow silencioso)
)
SHELLS = {"sh", "bash", "zsh", "dash", "ksh", "fish"}
FETCHERS = {"curl", "wget"}
PRIV = {"sudo", "su", "doas"}
SEPARATORS = {";", "&&", "||", "|", "&", "|&", "\n", ";;", ";&", ";;&"}
CASE_SEPARATORS = {";;", ";&", ";;&"}
PLAIN_SUBST = "__SUBST__"  # lugar de $( ), crase e <( ) no texto externo; o interior é analisado à parte
FETCH_SUBST = "__FETCHSUBST__"  # idem, quando o interior baixa ou decodifica (alimenta um interpretador => deny)
ASSIGN_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")
HEREDOC_HEAD_RE = re.compile(r"<<[-~]?[ \t]*(['\"]?)(\w+)\1")
SHELL_WORD_RE = re.compile(
    r"(?<![\w.-])(?:(?:ba|z|da|k|fi)?sh|source|eval)\b(?!\.)|(?<![\w.-])\.(?![\w.-])"
)
INTERP_RE = re.compile(r"^(python[\d.]*|perl|ruby|node)$")
BOMB_BODY_RE = re.compile(r"\s*(\S{1,64}?)\s*\|\s*(\S{1,64}?)\s*&\s*\}")
FETCH_HINT_RE = re.compile(
    r"\b(curl|wget)\b|base64\s+-\w*[dD]|--decode|xxd\s+-\w*r|openssl\s+enc"
)
BOMB_OPEN_RE = re.compile(r"\(\)\s*\{")
WORD_START = " \t\n;&|("  # um # só abre comentário depois disso

# wrappers: nome -> (opções que consomem o valor seguinte, posicionais consumidos antes do comando)
WRAPPERS: dict[str, tuple[frozenset[str], str]] = {
    "env": (frozenset({"-u", "-C", "-S", "--unset", "--chdir", "--split-string"}), ""),
    "nice": (frozenset({"-n", "--adjustment"}), ""),
    "nohup": (frozenset(), ""),
    "setsid": (frozenset(), ""),
    "command": (frozenset(), ""),
    "exec": (frozenset({"-a"}), ""),
    "time": (frozenset({"-f", "-o", "--format", "--output"}), ""),
    "stdbuf": (frozenset({"-i", "-o", "-e", "--input", "--output", "--error"}), ""),
    "timeout": (frozenset({"-s", "-k", "--signal", "--kill-after"}), "duration"),
    "ionice": (
        frozenset(
            {
                "-c",
                "-n",
                "-p",
                "-P",
                "-u",
                "--class",
                "--classdata",
                "--pid",
                "--pgid",
                "--uid",
            }
        ),
        "",
    ),
    "chrt": (
        frozenset(
            {"-T", "-P", "-D", "--sched-runtime", "--sched-period", "--sched-deadline"}
        ),
        "one",
    ),
    "taskset": (frozenset({"-c", "--cpu-list"}), "mask"),
    "busybox": (frozenset(), ""),
    "toybox": (frozenset(), ""),
    "builtin": (frozenset({"-p"}), ""),
    "coproc": (frozenset(), ""),
}
PRIV_VALUE_OPTS = frozenset(
    {
        "-u",
        "-g",
        "-C",
        "-h",
        "-p",
        "-c",
        "-r",
        "-t",
        "-U",
        "-D",
        "-R",
        "-T",
        "--user",
        "--group",
        "--chdir",
        "--host",
        "--prompt",
        "--role",
        "--type",
        "--other-user",
        "--close-from",
        "--chroot",
    }
)
START_DROP = {
    "{",
    "}",
    "!",
    "then",
    "do",
    "else",
    "elif",
    "if",
    "while",
    "until",
    "fi",
    "done",
    "esac",
    "builtin",
    "coproc",
}


def join_continuations(cmd: str) -> str:
    """Remove `\\\\\\n` fora de aspas simples. Dentro de aspas simples a barra é literal."""
    out: list[str] = []
    i, n, quote = 0, len(cmd), ""
    while i < n:
        c = cmd[i]
        if quote == "'":
            out.append(c)
            if c == "'":
                quote = ""
        elif c == "\\" and i + 1 < n and cmd[i + 1] == "\n":
            i += 1
        elif c == "\\" and i + 1 < n:
            out.append(cmd[i : i + 2])
            i += 1
        elif c in "'\"" and not quote:
            out.append(c)
            quote = c
        elif c == '"' and quote == '"':
            out.append(c)
            quote = ""
        else:
            out.append(c)
        i += 1
    return "".join(out)


def _newlines_to_separators(cmd: str) -> str:
    """Newline outside quotes separates commands; inside quotes it stays (a `bash -c` script keeps its lines)."""
    out: list[str] = []
    quote = ""
    i, n = 0, len(cmd)
    while i < n:
        c = cmd[i]
        if quote:
            out.append(c)
            if c == "\\" and quote == '"' and i + 1 < n:
                out.append(cmd[i + 1])
                i += 1
            elif c == quote:
                quote = ""
        elif c == "\\" and i + 1 < n:
            out.append(cmd[i : i + 2])
            i += 1
        elif c in "'\"":
            quote = c
            out.append(c)
        else:
            out.append(" ; " if c == "\n" else c)
        i += 1
    return "".join(out)


def tokenize(cmd: str) -> list[str]:
    try:
        lex = shlex.shlex(
            _newlines_to_separators(cmd), posix=True, punctuation_chars=True
        )
        lex.whitespace_split = True
        lex.commenters = ""
        return list(lex)
    except ValueError:  # aspas desbalanceadas: corte grosseiro, melhor que nada
        return re.findall(r"\|\||&&|[;|&]|[^\s;|&]+", cmd.replace("\n", " ; "))


def short_flags(args: list[str]) -> set[str]:
    flags: set[str] = set()
    for a in args:
        if a.startswith("--"):
            flags.add(a)
        elif a.startswith("-") and len(a) > 1:
            flags.update("-" + c for c in a[1:])
    return flags


def long_opt(flags: set[str], full: str) -> bool:
    """GNU getopt_long: `--rec` abrevia `--recursive` (prefixo único de 3+ caracteres, contando o `--`)."""
    return any(
        len(k) >= 3 and full.startswith(k)
        for k in (f.split("=", 1)[0] for f in flags if f.startswith("--"))
    )


# ---------- heredoc ----------


def _comment_start(cmd: str, i: int) -> bool:
    return i == 0 or cmd[i - 1] in WORD_START


class LineIndex:
    """Índice de linhas: onde cada texto de linha (sem espaços nas pontas) aparece, para achar o terminador de heredoc
    por bisect em vez de regex com retrocesso."""

    def __init__(self, cmd: str) -> None:
        self.offsets = [0]
        self.where: defaultdict[str, list[int]] = defaultdict(list)
        for idx, line in enumerate(cmd.split("\n")):
            self.offsets.append(self.offsets[-1] + len(line) + 1)
            s = line.strip(" \t")
            if s:
                self.where[s].append(idx)

    def line_of(self, pos: int) -> int:
        return bisect_right(self.offsets, pos) - 1

    def terminator(self, tag: str, first_line: int) -> int | None:
        """Primeira linha >= first_line cujo texto é `tag`."""
        lines = self.where.get(tag, [])
        k = bisect_left(lines, first_line)
        return lines[k] if k < len(lines) else None


def _subst_keep(cmd: str, start: int, end: int) -> set[int]:
    """Índices de `$( )` e crase num heredoc sem aspas: o shell executa isso, o resto do corpo é texto."""
    keep: set[int] = set()
    i, quote = start, ""
    while i < end:
        c = cmd[i]
        if quote == "'":
            quote = "" if c == "'" else quote
            i += 1
            continue
        if c == "\\":
            i += 2
            continue
        if c == "'":
            quote = "'"
            i += 1
            continue
        if c == '"':
            quote = "" if quote == '"' else '"'
            i += 1
            continue
        if c == "`":
            j = i + 1
            while j < end and cmd[j] != "`":
                j += 2 if cmd[j] == "\\" else 1
            if j < end:
                keep.update(range(i, j + 1))
                i = j + 1
                continue
        if c == "$" and i + 1 < end and cmd[i + 1] == "(":
            j = _match_paren(cmd, i + 2, [])
            if 0 <= j < end:
                keep.update(range(i, j + 1))
                i = j + 1
                continue
        i += 1
    return keep


def mask_heredocs(cmd: str) -> str:
    """Mesmo tamanho, corpo de heredoc em branco (quebras mantidas), exceto quando a linha do `<<` tem um shell
    (`bash <<EOF`, `<<EOF | sh`): ali o texto roda. Só vale `<<` fora de aspas; a busca do terminador é um índice
    de linhas (sem regex com retrocesso). Heredoc sem terminador não mascara nada."""
    if "<<" not in cmd:
        return cmd
    n = len(cmd)
    index = LineIndex(cmd)
    offsets = index.offsets
    out = list(cmd)
    next_line: dict[
        int, int
    ] = {}  # linha do cabeçalho -> primeira linha livre depois do último corpo dela
    jump: dict[int, int] = {}  # fim da linha do cabeçalho -> fim da linha do terminador
    quote = ""
    i = 0
    while i < n:
        c = cmd[i]
        if c == "\n" and i in jump:
            i = jump[i]
            continue
        if quote == "'":
            quote = "" if c == "'" else quote
        elif c == "\\":
            i += 1
        elif quote == '"':
            quote = "" if c == '"' else quote
        elif c in "'\"":
            quote = c
        elif c == "#" and _comment_start(cmd, i):
            nl = cmd.find("\n", i)
            i = n if nl < 0 else nl
            continue
        elif c == "<" and (i == 0 or cmd[i - 1] != "<") and cmd.startswith("<<", i):
            m = HEREDOC_HEAD_RE.match(cmd, i)
            if m:
                head = index.line_of(i)
                first = next_line.get(head, head + 1)
                term = index.terminator(m.group(2), first)
                if term is not None:
                    next_line[head] = term + 1
                    jump[offsets[head + 1] - 1] = offsets[term + 1] - 1
                    if not SHELL_WORD_RE.search(
                        cmd, offsets[head], offsets[head + 1] - 1
                    ):
                        keep = (
                            set()
                            if m.group(1)
                            else _subst_keep(cmd, offsets[first], offsets[term])
                        )
                        for p in range(offsets[first], offsets[term]):
                            if out[p] != "\n" and p not in keep:
                                out[p] = " "
                i = m.end()
                continue
        i += 1
    return "".join(out)


def mask_text(cmd: str) -> str:
    """Mesmo tamanho, com corpo de heredoc e conteúdo entre aspas trocados: texto citado não é comando.
    Heredoc lido por um shell (`bash <<EOF`) fica: ali o texto roda."""
    out = list(mask_heredocs(cmd))
    quote = None
    for i, c in enumerate(out):
        if quote:
            if c == quote and (quote == "'" or out[i - 1] != "\\"):
                quote = None
            else:
                out[i] = "x"
        elif c in ("'", '"'):
            quote = c
    return "".join(out)


# ---------- fork bomb ----------


def fork_bomb(text: str) -> bool:
    """`nome(){ nome|nome& }` (qualquer nome). Uma passada: cada `(){` olha só uma janela curta."""
    for m in BOMB_OPEN_RE.finditer(text):
        j = m.start()
        while j > 0 and text[j - 1] in " \t\n\r\f\v":
            j -= 1
        b = BOMB_BODY_RE.match(text, m.end())
        if b and b.group(1) == b.group(2) and text.endswith(b.group(1), 0, j):
            return True
    return False


# ---------- substituições ----------


def _match_paren(cmd: str, i: int, lazy: list[LineIndex]) -> int:
    """Índice do `)` que fecha o `(` aberto antes de i (aspas e escapes respeitados); -1 se não fecha."""
    depth, quote, n = 1, "", len(cmd)
    while i < n:
        c = cmd[i]
        if quote == "'":
            quote = "" if c == "'" else quote
        elif c == "\\":
            i += 1
        elif quote == '"':
            quote = "" if c == '"' else quote
        elif c in "'\"":
            quote = c
        elif (
            c == "<"
            and cmd.startswith("<<", i)
            and (i == 0 or cmd[i - 1] != "<")
            and (h := HEREDOC_HEAD_RE.match(cmd, i))
        ):
            if not lazy:
                lazy.append(LineIndex(cmd))
            term = lazy[0].terminator(h.group(2), lazy[0].line_of(i) + 1)
            i = lazy[0].offsets[term + 1] - 1 if term is not None else h.end()
            continue
        elif c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def extract_substitutions(
    cmd: str, is_fetch: Callable[[str], bool]
) -> tuple[str, list[str]]:
    """Troca `$( )`, crases e `<( )`/`>( )` (fora de aspas simples) por um marcador e devolve os interiores."""
    if "$(" not in cmd and "`" not in cmd and "<(" not in cmd and ">(" not in cmd:
        return cmd, []
    out: list[str] = []
    inners: list[str] = []
    quote, i, n = "", 0, len(cmd)
    lazy: list[
        LineIndex
    ] = []  # índice de linhas, criado só se um heredoc aparecer dentro de $( )
    while i < n:
        c = cmd[i]
        if quote == "'":
            out.append(c)
            quote = "" if c == "'" else quote
        elif c == "\\":
            out.append(cmd[i : i + 2])
            i += 1
        elif c == "'" and not quote:
            out.append(c)
            quote = c
        elif c == '"':
            out.append(c)
            quote = "" if quote else c
        elif c == "#" and not quote and _comment_start(cmd, i):
            nl = cmd.find("\n", i)
            end = n if nl < 0 else nl
            out.append(cmd[i:end])
            i = end - 1
        elif (c == "$" or (not quote and c in "<>")) and cmd.startswith("(", i + 1):
            j = _match_paren(cmd, i + 2, lazy)
            inner = cmd[i + 2 :] if j < 0 else cmd[i + 2 : j]
            inners.append(inner)
            out.append(FETCH_SUBST if is_fetch(inner) else PLAIN_SUBST)
            i = n if j < 0 else j
        elif c == "`":
            j = i + 1
            while j < n and cmd[j] != "`":
                j += 2 if cmd[j] == "\\" else 1
            inner = cmd[i + 1 : j]
            inners.append(inner)
            out.append(FETCH_SUBST if is_fetch(inner) else PLAIN_SUBST)
            i = j
        else:
            out.append(c)
        i += 1
    return "".join(out), inners


# ---------- segmentos ----------


def _paren_only(t: str, ch: str) -> bool:
    return bool(t) and set(t) == {ch}


def _structure(cur: list[str], case_pattern: bool) -> tuple[list[list[str]], bool]:
    """Tira a sintaxe de shell que não é comando: `( { then do else if while fi done`, padrões de `case`, `name()`.
    Devolve (comandos, abriu_case_sem_padrao_fechado). Só o primeiro token decide: um `)` entre aspas no meio fica.
    `name ( ) rest` também sai inteiro: com aspas (`rm "(" ")" -rf ~`) é um rm, não uma definição de função."""
    opened_case = False
    extra: list[list[str]] = []
    if case_pattern and ")" in cur:
        cur = cur[cur.index(")") + 1 :]
    while cur:
        t = cur[0]
        if t == "$" and len(cur) > 1 and _paren_only(cur[1], "("):
            cur = cur[
                2:
            ]  # `$ (` is a syntax error for the shell, but whatever follows is still judged
        elif t in START_DROP or _paren_only(t, "(") or _paren_only(t, ")"):
            cur = cur[1:]
        elif t == "case":
            rest = cur[1:]
            if "in" in rest:
                rest = rest[rest.index("in") + 1 :]
            if ")" in rest:
                opened_case = False
                cur = rest[rest.index(")") + 1 :]
            else:
                opened_case = True
                cur = []
        elif t in ("for", "select"):
            return [], False
        elif t == "function":
            cur = cur[2:]
            if cur and cur[0] == "()":
                cur = cur[1:]
        elif len(cur) >= 2 and cur[1] == "()":  # shlex junta `()` num token só
            extra.append(cur)
            cur = cur[2:]
        elif len(cur) >= 3 and cur[1] == "(" and cur[2] == ")":
            extra.append(cur)
            cur = cur[3:]
        else:
            break
    while cur and (cur[-1] == "}" or _paren_only(cur[-1], ")")):
        cur = cur[:-1]
    return ([cur] if cur else []) + extra, opened_case


def segments(tokens: list[str]) -> list[tuple[list[str], bool]]:
    """Lista de (argv, piped_from_previous)."""
    out: list[tuple[list[str], bool]] = []
    # A spaced `$ (` is a syntax error for the shell, but what follows is still a command to judge.
    joined: list[str] = []
    for k, t in enumerate(tokens):
        if t == "(" and k > 0 and tokens[k - 1] == "$":
            joined[-1] = ";"
        elif (
            t == "("
            and k > 0
            and tokens[k - 1] not in SEPARATORS
            and (tokens[k + 1 : k + 2] or [""])[0] != ")"
        ):
            joined.append(
                ";"
            )  # a lone `(` after a word starts a new command (never a quoted `"(" ")"` pair)
        elif t == ")" and k > 0 and tokens[k - 1] != "(":
            joined.append(
                ";"
            )  # a lone `)` closes the previous command; what follows is judged on its own
        else:
            joined.append(t)
    tokens = joined
    cur: list[str] = []
    piped = next_piped = pattern_next = False
    in_case = 0

    def flush() -> None:
        nonlocal pattern_next, in_case
        if not cur:
            return
        is_case = cur[0] == "case"
        if cur[0] == "esac":
            in_case = max(0, in_case - 1)
        argvs, opened = _structure(list(cur), pattern_next and in_case > 0)
        if is_case:
            in_case += 1
        pattern_next = opened
        out.extend((argv, piped) for argv in argvs)

    for t in tokens:
        if t in SEPARATORS:
            flush()
            pattern_next = pattern_next or (t in CASE_SEPARATORS and in_case > 0)
            cur, piped = [], False
            next_piped = t in ("|", "|&")
            continue
        if not cur:
            piped, next_piped = next_piped, False
        cur.append(t)
    flush()
    return out


# ---------- wrappers ----------


def _su_command(args: list[str]) -> str | None:
    for k, a in enumerate(args):
        if a in ("-c", "--command") and k + 1 < len(args):
            return args[k + 1]
        if a.startswith("--command="):
            return a.split("=", 1)[1]
    return None


def strip_prefixes(argv: list[str]) -> tuple[list[str], bool]:
    """Remove VAR=x, wrappers (com o valor das próprias opções) e sudo; devolve (argv_real, usou_privilegio).
    `su -c STR` vira `sh -c STR` (o guard reanalisa o interior); `env -S STR` é expandido no lugar."""
    argv = list(argv)
    priv = False
    i = 0
    while i < len(argv):
        w = argv[i]
        base = os.path.basename(w)
        if ASSIGN_RE.match(w):
            i += 1
        elif base in PRIV:
            priv = True
            if base == "su":
                su = _su_command(argv[i + 1 :])
                if su is not None:
                    return ["sh", "-c", su], True
            i += 1
            while i < len(argv) and argv[i].startswith("-"):  # flags do sudo/su/doas
                flag = argv[i]
                i += 1
                if base != "su" and flag in PRIV_VALUE_OPTS and i < len(argv):
                    i += 1
        elif base in WRAPPERS:
            values, positional = WRAPPERS[base]
            i += 1
            list_given = False
            while i < len(argv) and argv[i].startswith("-"):
                flag = argv[i]
                i += 1
                key, eq, val = flag.partition("=")
                list_given = list_given or key in ("-c", "--cpu-list")
                glued_s = (
                    base == "env"
                    and flag.startswith("-S")
                    and not flag.startswith("--")
                    and flag != "-S"
                )
                if base == "env" and (key in ("-S", "--split-string") or glued_s):
                    if glued_s:
                        val = flag[2:]
                    elif not eq and i < len(argv):
                        val, i = argv[i], i + 1
                    argv, i = tokenize(val) + argv[i:], 0
                    break
                if key in values and not eq and i < len(argv):
                    i += 1
            else:
                if i < len(argv) and (
                    positional == "one"
                    or (positional == "mask" and not list_given)
                    or (positional == "duration" and re.match(r"^[\d.]", argv[i]))
                ):
                    i += 1
        else:
            break
    return argv[i:], priv


def fetch_tag(real: list[str]) -> bool:
    """O segmento baixa ou decodifica dados (curl, wget, base64 -d, xxd -r, openssl enc -d)."""
    if not real:
        return False
    name, args = os.path.basename(real[0]), real[1:]
    flags = short_flags(args)
    if name in FETCHERS:
        return True
    if name == "base64":
        return bool(flags & {"-d", "-D", "--decode"})
    if name == "xxd":
        return "-r" in flags
    return name == "openssl" and args[:1] == ["enc"] and "-d" in flags


def is_interpreter(name: str) -> bool:
    return name in SHELLS or bool(INTERP_RE.match(name))


def reads_stdin(args: list[str]) -> bool:
    """Interpretador sem arquivo de script (e `-`) lê o programa do stdin."""
    positional = [a for a in args if not a.startswith("-") or a == "-"]
    return not positional or "-" in positional


def fetches(inner: str, depth: int = 0) -> bool:
    """Algum comando do texto baixa ou decodifica (para marcar `$(curl ...)` como FETCH_SUBST). A recursão em
    substituições aninhadas pára no 2º nível, onde vale só a busca por palavra (custo linear em aninhamento fundo)."""
    if depth >= 2:
        return bool(FETCH_HINT_RE.search(inner))
    text, _ = extract_substitutions(
        mask_heredocs(inner), lambda s: fetches(s, depth + 1)
    )
    return FETCH_SUBST in text or any(
        fetch_tag(strip_prefixes(argv)[0]) for argv, _ in segments(tokenize(text))
    )
