"""Classificação conservadora de Bash para os modos: "readonly", "edit" ou None (não comprovado => ASK).
Nunca executa o comando; só shlex, glob limitado e os.path. Qualquer construção desconhecida devolve None."""

import glob
import os
import re
import shlex
from typing import Any

from permissions.paths import (  # type: ignore[import-not-found,unused-ignore]
    HOME,
    is_critical,
    no_protected_below,
    resolve,
    scoped_target,
)

FORBIDDEN_CHARS = set(
    "`$<>\n\r\\{}!()"
)  # substituição, redirect, continuação, grupos, expansão de chaves
SEPS = {";", "&&", "||", "|"}
PUNCT = set("();<>|&")
GLOB_CHARS = set("*?[")
GLOB_LIMIT = 200

READONLY = {
    "ls",
    "cat",
    "head",
    "tail",
    "wc",
    "pwd",
    "echo",
    "date",
    "whoami",
    "uname",
    "id",
    "stat",
    "file",
    "du",
    "df",
    "which",
    "true",
    "false",
    "basename",
    "dirname",
    "realpath",
    "readlink",
    "sort",
    "uniq",
    "cut",
    "tr",
    "diff",
    "cmp",
    "grep",
    "egrep",
    "fgrep",
    "rg",
    "tree",
    "nl",
    "find",
}  # git fora: config do repositório (core.fsmonitor, textconv) executa comando; todo git é ask
BANNED_ARGS = {  # opções que executam programas ou gravam arquivos
    "find": {
        "-exec",
        "-execdir",
        "-ok",
        "-okdir",
        "-delete",
        "-fprint",
        "-fprint0",
        "-fprintf",
        "-fls",
        "-files0-from",
    },
    "sort": {
        "-o",
        "--output",
        "--compress-program",
        "-T",
        "--temporary-directory",
        "--files0-from",
    },
    "wc": {"--files0-from"},
    "du": {"--files0-from"},
    "tree": {"-o", "-R"},
    "date": {"-s", "--set"},
    "file": {"-C", "--compile", "-f", "--files-from"},
    "rg": {"--pre", "--pre-glob", "--hostname-bin", "-z", "--search-zip"},
}
GNU_LONG = {
    "sort",
    "date",
    "file",
    "wc",
    "du",
}  # getopt_long aceita prefixo único de opção longa (--out, --comp): comparamos por prefixo
BANNED_PREFIXES = {
    "sort": (
        "--output=",
        "--compress-program=",
        "--temporary-directory=",
        "--files0-from=",
    ),
    "wc": ("--files0-from=",),
    "du": ("--files0-from=",),
    "file": ("--files-from=",),
    "rg": ("--pre=", "--pre-glob=", "--hostname-bin="),
}
SED_S = re.compile(
    r"^s(?P<d>[/|,#:@])(?:(?!(?P=d))[^\\\n])*(?P=d)(?:(?!(?P=d))[^\\\n])*(?P=d)[gIip0-9]*$"
)
SED_INPLACE = re.compile(r"^-i[A-Za-z0-9._~]*$")


def tokens(cmd: Any) -> Any:
    if not isinstance(cmd, str) or any(c in FORBIDDEN_CHARS for c in cmd):
        return None
    try:
        lex = shlex.shlex(cmd, posix=True, punctuation_chars=True)
        lex.whitespace_split = True
        lex.commenters = ""
        return list(lex) or None
    except ValueError:
        return None


def split_segments(toks: Any) -> Any:
    segs: list[Any] = []
    cur: list[Any] = []
    for t in toks:
        if t in SEPS:
            if not cur:
                return None
            segs.append(cur)
            cur = []
        elif t and set(t) <= PUNCT:
            return None
        else:
            cur.append(t)
    if cur:
        segs.append(cur)
    return segs or None


def has_glob(s: Any) -> Any:
    return any(c in GLOB_CHARS for c in s)


def read_blocked(arg: Any, cwd: Any, read_denied: Any) -> Any:
    """True se o argumento (ou o valor de --opt=valor, ou um glob expandido) for um segredo de leitura negada."""
    val = arg
    if arg.startswith("--"):
        if "=" not in arg:
            return False
        val = arg.split("=", 1)[1]
    elif arg.startswith("-") and len(arg) > 2:
        # valor colado a opção curta (-f.env, -nf.env, -c5): testa a cauda a partir de cada posição
        return any(
            read_blocked(arg[i:], cwd, read_denied)
            for i in range(2, len(arg))
            if arg[i:] and not arg[i:].startswith("-")
        ) or ("=" in arg and read_blocked(arg.split("=", 1)[1], cwd, read_denied))
    elif arg.startswith("-"):
        return False
    if val.startswith("~") and not (val == "~" or val.startswith("~/")):
        return True
    if not val:
        return False
    cands = [val]
    if has_glob(val):
        pat = HOME + val[1:] if val.startswith("~/") else val
        found = glob.glob(pat if os.path.isabs(pat) else os.path.join(cwd, pat))
        if len(found) > GLOB_LIMIT:
            return True
        cands += found
    for c in cands:
        r = resolve(c, cwd)
        if r and (read_denied(r[0]) or read_denied(r[1])):
            return True
    return False


def banned_option(name: Any, a: Any) -> Any:
    """True se `a` for (ou puder abreviar/agrupar) uma opção proibida de `name`."""
    banned = BANNED_ARGS.get(name, ())
    if a in banned or a.startswith(BANNED_PREFIXES.get(name, ())):
        return True
    if a.startswith("--"):
        key = a.split("=", 1)[0]
        return (
            name in GNU_LONG
            and len(key) >= 3
            and any(b.startswith(key) for b in banned if b.startswith("--"))
        )
    if a.startswith("-") and len(a) > 2 and a[1] != "-":
        # grupo curto (-ro, -ofile, -T/tmp): qualquer letra proibida no grupo rejeita; opções longas de uma letra só (find usa -o como OU)
        return name != "find" and any(
            len(b) == 2 and b[1] in a[1:] for b in banned if not b.startswith("--")
        )
    return False


CONTENT_SEARCH = {"grep", "egrep", "fgrep", "rg", "diff"}
GREP_RECURSION_LONG = ("--recursive", "--dereference-recursive", "--directories")
RG_FLAGS = {
    "-n",
    "-i",
    "-S",
    "-F",
    "-w",
    "-c",
    "-l",
    "-H",
    "-N",
    "-s",
    "-v",
    "-q",
    "--line-number",
    "--ignore-case",
    "--fixed-strings",
    "--word-regexp",
    "--count",
    "--files-with-matches",
    "--no-heading",
    "--with-filename",
    "--no-line-number",
    "--invert-match",
    "--quiet",
}
DIFF_FLAGS = {
    "-u",
    "-q",
    "-s",
    "-i",
    "-w",
    "-b",
    "-B",
    "-a",
    "-y",
    "--unified",
    "--brief",
    "--report-identical-files",
    "--ignore-case",
    "--ignore-all-space",
    "--ignore-space-change",
    "--ignore-blank-lines",
    "--text",
    "--side-by-side",
}


def explicit_regular_files(operands: Any, cwd: Any, read_denied: Any) -> Any:
    """True se há operandos e todos são arquivos regulares existentes (não symlink, sem glob, sem leitura negada)."""
    if not operands:
        return False
    for o in operands:
        r = resolve(o, cwd) if o != "-" and not has_glob(o) else None
        if (
            r is None
            or os.path.islink(r[0])
            or not os.path.isfile(r[1])
            or read_denied(r[0])
            or read_denied(r[1])
        ):
            return False
    return True


def grep_recursive(a: Any) -> Any:
    if a == "recurse" or "recurse" in a:
        return True
    if a.startswith("--"):
        key = a.split("=", 1)[0]
        return len(key) >= 4 and any(b.startswith(key) for b in GREP_RECURSION_LONG)
    return a.startswith("-") and len(a) > 1 and bool(set(a[1:]) & {"r", "R"})


def content_search_ok(name: Any, args: Any, cwd: Any, read_denied: Any) -> Any:
    """Busca de conteúdo que recursa ou consome diretório/cwd implícito é ask; só arquivos regulares explícitos passam
    (rg e diff) ou grep sem recursão. Opções fora da lista de rg/diff => não provado."""
    if name in ("grep", "egrep", "fgrep"):
        return not any(grep_recursive(a) for a in args)
    allowed = RG_FLAGS if name == "rg" else DIFF_FLAGS
    flags: list[Any] = []
    operands: list[Any] = []
    for a in args:
        if operands or not a.startswith("-") or a == "-":
            operands.append(a)
        elif a in allowed:
            flags.append(a)
        else:
            return False
    if name == "rg":
        operands = operands[1:]  # primeiro operando é o padrão
    elif len(operands) != 2:
        return False
    return explicit_regular_files(operands, cwd, read_denied)


def uniq_operands(args: Any) -> Any:
    """Operandos de `uniq`, com a mesma regra de `parse_operands`: `-` e o que vem depois de `--` são operandos.
    `-f`/`-s`/`-w` consomem o valor seguinte. Opção desconhecida devolve None (não é somente-leitura)."""
    value_short = set("fsw")
    value_long = {"--skip-fields", "--skip-chars", "--check-chars", "--group"}
    known_long = value_long | {
        "--count",
        "--repeated",
        "--all-repeated",
        "--ignore-case",
        "--unique",
        "--zero-terminated",
    }
    operands, dd, i = [], False, 0
    while i < len(args):
        a = args[i]
        if dd or a == "-" or not a.startswith("-"):
            operands.append(a)
        elif a == "--":
            dd = True
        elif a.startswith("--"):
            key, eq, _ = a.partition("=")
            if key not in known_long:
                return None
            if key in value_long and not eq:
                if i + 1 >= len(args):
                    return None
                i += 1
        else:
            chars, j = a[1:], 0
            while j < len(chars):
                c = chars[j]
                if c in value_short:
                    if not chars[j + 1 :]:
                        if i + 1 >= len(args):
                            return None
                        i += 1
                    break
                if c not in "cdDiuz":
                    return None
                j += 1
        i += 1
    return operands


def readonly_ok(
    name: Any, args: Any, cwd: Any, read_denied: Any, piped: Any = False
) -> Any:
    if name in CONTENT_SEARCH and not content_search_ok(name, args, cwd, read_denied):
        return False
    if any(banned_option(name, a) for a in args):
        return False
    if name == "uniq":
        operands = uniq_operands(args)
        if operands is None or len(operands) > 1 or (piped and operands):
            return False  # segundo operando, ou qualquer operando depois de pipe, é arquivo de saída
    return not any(read_blocked(a, cwd, read_denied) for a in args)


def parse_operands(args: Any, allowed_flags: Any) -> Any:
    """(flags, operandos) ou None. Flags curtas agrupadas são expandidas; só as permitidas passam."""
    flags, operands, dd = set(), [], False
    for a in args:
        if dd or a == "-" or not a.startswith("-"):
            operands.append(a)
        elif a == "--":
            dd = True
        elif a.startswith("--"):
            if a not in allowed_flags:
                return None
            flags.add(a)
        else:
            for c in a[1:]:
                if "-" + c not in allowed_flags:
                    return None
                flags.add("-" + c)
    return flags, operands


def targets_ok(operands: Any, cwd: Any, roots: Any, critical: Any) -> Any:
    for o in operands:
        if has_glob(o):
            return False
        r = scoped_target(o, cwd, roots)
        if r is None or (
            critical and (is_critical(r[0], roots) or is_critical(r[1], roots))
        ):
            return False
    return True


def sed_kind(args: Any, cwd: Any, roots: Any, read_denied: Any) -> Any:
    inplace, script, operands, dd, i = False, None, [], False, 0
    while i < len(args):
        a = args[i]
        if dd or a == "-" or not a.startswith("-"):
            operands.append(a)
        elif a == "--":
            dd = True
        elif a in ("-n", "-E", "-r"):
            pass
        elif SED_INPLACE.match(a):
            inplace = True
        elif a == "-e" and script is None and i + 1 < len(args):
            i += 1
            script = args[i]
        else:
            return None
        i += 1
    if script is None:
        if not operands:
            return None
        script = operands.pop(0)
    if not SED_S.match(script) or (inplace and not operands):
        return None
    if not targets_ok(operands, cwd, roots, False) or any(
        read_blocked(o, cwd, read_denied) for o in operands
    ):
        return None
    return "edit" if inplace else "readonly"


FS_FLAGS = {
    "mkdir": ({"-p", "-v", "--parents", "--verbose"}, 1, False),
    "touch": (set(), 1, False),
    "rmdir": ({"-v", "--verbose"}, 1, True),
    "rm": ({"-r", "-R", "-v", "-f", "--recursive", "--verbose", "--force"}, 1, True),
    "mv": ({"-v", "-n", "-f", "--verbose", "--no-clobber", "--force"}, 2, True),
    "cp": ({"-v", "-n", "-p", "-f", "--verbose", "--no-clobber", "--force"}, 2, False),
}


def file_pair_ok(name: Any, operands: Any, cwd: Any) -> Any:
    """cp/mv: exatamente dois operandos; origem arquivo regular (não symlink), destino inexistente ou arquivo regular (não symlink,
    nunca diretório: o destino final seria <dir>/<base> e pode ser symlink), pai existente; cp sobre destino com nlink>1 grava no
    inode compartilhado => ask."""
    if len(operands) != 2:
        return False
    src, dst = (resolve(o, cwd) for o in operands)
    if (
        src is None
        or dst is None
        or os.path.islink(src[0])
        or not os.path.isfile(src[1])
    ):
        return False
    if (
        os.path.islink(dst[0])
        or os.path.isdir(dst[1])
        or operands[1].endswith("/")
        or not os.path.isdir(os.path.dirname(dst[1]))
    ):
        return False
    if os.path.lexists(dst[1]):
        return os.path.isfile(dst[1]) and (
            name == "mv" or os.stat(dst[1]).st_nlink == 1
        )
    return True


def fs_ok(name: Any, args: Any, cwd: Any, roots: Any, read_denied: Any) -> Any:
    allowed, minimum, critical = FS_FLAGS[name]
    parsed = parse_operands(args, allowed)
    if parsed is None:
        return False
    flags, operands = parsed
    recursive = bool(flags & {"-r", "-R", "--recursive"})
    if len(operands) < minimum or (
        name == "rm" and recursive and flags & {"-f", "--force"}
    ):
        return False
    if name == "cp" and any(read_blocked(o, cwd, read_denied) for o in operands):
        return False
    if not targets_ok(operands, cwd, roots, critical):
        return False
    if name in ("cp", "mv"):
        return file_pair_ok(name, operands, cwd)
    if name == "rm" and recursive:
        # fail-closed: operando por symlink (lexical != real), inexistente ou árvore ilegível => ask
        return all(
            resolve(o, cwd)[0] == resolve(o, cwd)[1]
            and no_protected_below(resolve(o, cwd)[1])
            for o in operands
        )
    return True


def segment_kind(
    argv: Any, cwd: Any, roots: Any, read_denied: Any, piped: Any = False
) -> Any:
    name, args = argv[0], argv[1:]
    if "/" in name or "=" in name:
        return None
    if name == "sed":
        return sed_kind(args, cwd, roots, read_denied)
    if name in FS_FLAGS:
        return "edit" if fs_ok(name, args, cwd, roots, read_denied) else None
    if name in READONLY:
        return "readonly" if readonly_ok(name, args, cwd, read_denied, piped) else None
    return None


def _piped_flags(toks: Any, segs: Any) -> Any:
    flags, piped, started = [], False, False
    for t in toks:
        if t in SEPS:
            if started:
                flags.append(piped)
            piped, started = t == "|", False
        else:
            started = True
    if started:
        flags.append(piped)
    return flags if len(flags) == len(segs) else None


def analyze(cmd: Any, cwd: Any, roots: Any, read_denied: Any) -> Any:
    """ "readonly": só leitura comprovada (cadeias/pipes permitidos). "edit": UM comando de filesystem em escopo. Senão None."""
    toks = tokens(cmd)
    segs = split_segments(toks) if toks else None
    if not segs:
        return None
    piped = _piped_flags(toks, segs)
    if piped is None:
        return None
    kinds = [segment_kind(s, cwd, roots, read_denied, p) for s, p in zip(segs, piped)]
    if None in kinds:
        return None
    if "edit" in kinds:
        return "edit" if len(segs) == 1 else None
    return "readonly"
