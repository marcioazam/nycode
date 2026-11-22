"""Escopo, caminhos protegidos e críticos para os modos. Só os.path (sem executar nada); symlinks via realpath."""

import os
from typing import Any

HOME = os.path.expanduser("~")
PROTECTED_DIR_NAMES = {
    ".git",
    ".vscode",
    ".idea",
    ".husky",
    ".cargo",
    ".devcontainer",
    ".yarn",
    ".mvn",
    ".claude",
    ".nycode",
}
PROTECTED_FILES = {
    ".gitconfig",
    ".gitmodules",
    ".bashrc",
    ".bash_profile",
    ".bash_login",
    ".bash_aliases",
    ".bash_logout",
    ".zshrc",
    ".zprofile",
    ".zshenv",
    ".zlogin",
    ".zlogout",
    ".profile",
    ".envrc",
    ".npmrc",
    ".yarnrc",
    ".yarnrc.yml",
    ".pnp.cjs",
    ".pnp.loader.mjs",
    ".pnpmfile.cjs",
    "bunfig.toml",
    ".bunfig.toml",
    ".bazelrc",
    ".bazelversion",
    ".bazeliskrc",
    ".pre-commit-config.yaml",
    "lefthook.yml",
    "lefthook.yaml",
    ".lefthook.yml",
    ".lefthook.yaml",
    "gradle-wrapper.properties",
    "maven-wrapper.properties",
    ".devcontainer.json",
    ".ripgreprc",
    "pyrightconfig.json",
    ".mcp.json",
    ".claude.json",
}


def resolve(arg: Any, cwd: Any) -> Any:
    """(léxico, real) ou None. `real` resolve symlinks antes de `..` como o kernel faz (link/../x)."""
    if not isinstance(arg, str) or not arg or "\0" in arg:
        return None
    if arg == "~" or arg.startswith("~/"):
        arg = HOME + arg[1:]
    elif arg.startswith("~"):
        return None
    joined = arg if os.path.isabs(arg) else os.path.join(cwd, arg)
    return os.path.normpath(joined), os.path.realpath(joined)


def scope_roots(cwd: Any, project: Any) -> Any:
    roots = []
    for r in (cwd, project):
        if r:
            real = os.path.realpath(r)
            if real != "/" and real not in roots:
                roots.append(real)
    return roots


def inside(path: Any, root: Any) -> Any:
    return path == root or path.startswith(root.rstrip("/") + "/")


def in_scope(path: Any, roots: Any) -> Any:
    return any(inside(path, r) for r in roots)


def is_protected(path: Any) -> Any:
    parts = [p for p in path.split("/") if p]
    for i, p in enumerate(parts):
        if p in PROTECTED_DIR_NAMES:
            if p == ".claude" and parts[i + 1 : i + 2] == ["worktrees"]:
                continue
            return True
        if p == ".config" and parts[i + 1 : i + 2] == ["git"]:
            return True
    return bool(parts) and parts[-1] in PROTECTED_FILES


def is_critical(path: Any, roots: Any) -> Any:
    """Alvos que rm/rmdir nunca recebem aprovação automática: raiz, filhos diretos da raiz, home, escopo e ancestrais."""
    if path == "/" or os.path.dirname(path) == "/":
        return True
    return any(inside(r, path) for r in list(roots) + [os.path.realpath(HOME)])


def scoped_target(arg: Any, cwd: Any, roots: Any) -> Any:
    """(léxico, real) se ambos estão no escopo e nenhum é protegido; senão None."""
    r = resolve(arg, cwd)
    if r is None:
        return None
    lex, real = r
    if (
        not (in_scope(lex, roots) and in_scope(real, roots))
        or is_protected(lex)
        or is_protected(real)
    ):
        return None
    return r


WALK_LIMIT = 5000


class UnreadableTree(Exception):
    pass


def _walk_error(err: Any) -> None:
    raise UnreadableTree(str(err))


def no_protected_below(real: Any) -> Any:
    """True se a árvore sob `real` (sem seguir symlinks) não contém caminho protegido. Fail-closed: raiz inexistente, erro de leitura
    em qualquer subdiretório ou árvore grande demais contam como não provada. Instantâneo (TOCTOU): o conteúdo pode mudar depois."""
    if not os.path.lexists(real):
        return False
    if not os.path.isdir(real) or os.path.islink(real):
        return True
    seen = 0
    try:
        for dirpath, dirs, files in os.walk(
            real, followlinks=False, onerror=_walk_error
        ):
            for n in dirs + files:
                seen += 1
                if seen > WALK_LIMIT or is_protected(os.path.join(dirpath, n)):
                    return False
    except UnreadableTree:
        return False
    return True
