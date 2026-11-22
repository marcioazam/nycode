"""Decisão por modo, aplicada pelo guard DEPOIS de qualquer deny legado. Devolve None (allow) ou ("ask", motivo)."""

from typing import Any

from permissions import modes  # type: ignore[import-not-found,unused-ignore]
from permissions.paths import scope_roots, scoped_target  # type: ignore[import-not-found,unused-ignore]
from permissions.shell import analyze  # type: ignore[import-not-found,unused-ignore]

RM_RECURSIVE_REASON = "rm recursivo"  # mesmo texto de guard.check_segment; o teste do guard mantém os dois alinhados
EDIT_TOOLS = ("Edit", "Write", "MultiEdit")


def ask(mode: Any, reasons: Any) -> Any:
    return "ask", f"Confirmação necessária (modo {mode}): " + "; ".join(
        dict.fromkeys(reasons)
    )


def decide_mode(
    mode: Any,
    tool: Any,
    ti: Any,
    cwd: Any,
    project: Any,
    asks: Any,
    read_denied: Any,
    env: Any,
) -> Any:
    """asks: motivos ASK do guard legado (sem deny). mode: um de modes.MODES."""
    if modes.bypass_active(env):
        return None  # ortogonal ao modo (inclusive plan); os DENY já foram decididos pelo guard
    if mode == modes.BYPASS:
        mode = modes.DEFAULT  # legado sem NYCODE_BYPASS_PERMISSIONS, falha fechado
    if mode == modes.PLAN:
        # leitura/escrita do plan mode pertence ao nycode; aqui só vale o guard legado
        return ask(mode, asks) if asks else None
    if tool in EDIT_TOOLS:
        path = ti.get("file_path")
        roots = scope_roots(cwd, project)
        if (
            mode == modes.ACCEPT_EDITS
            and not asks
            and isinstance(path, str)
            and scoped_target(path, cwd, roots)
        ):
            return None
        why = (
            ["edição fora do escopo seguro (caminho protegido, externo ou symlink)"]
            if mode == modes.ACCEPT_EDITS
            else ["edição requer confirmação"]
        )
        return ask(mode, list(asks) + why)
    if tool == "Bash":
        cmd = ti.get("command")
        kind = (
            analyze(cmd, cwd, scope_roots(cwd, project), read_denied)
            if isinstance(cmd, str)
            else None
        )
        proven = kind == "readonly" or (kind == "edit" and mode == modes.ACCEPT_EDITS)
        remaining = [
            r for r in asks if not (kind == "edit" and r == RM_RECURSIVE_REASON)
        ]
        if proven and not remaining:
            return None
        return ask(
            mode, remaining + ([] if proven else ["comando não comprovadamente seguro"])
        )
    return ask(mode, asks) if asks else None
