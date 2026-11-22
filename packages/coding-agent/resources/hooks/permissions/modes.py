"""Enum de modos lido de NYCODE_PERMISSION_MODE. Valor ausente = guard legado; inválido = default. `ask`=default, `auto`=acceptEdits."""

from typing import Any

MODE_ENV = "NYCODE_PERMISSION_MODE"
BYPASS_ENV = "NYCODE_BYPASS_PERMISSIONS"
DEFAULT, ACCEPT_EDITS, PLAN, BYPASS = (
    "default",
    "acceptEdits",
    "plan",
    "bypassPermissions",
)
MODES = (DEFAULT, ACCEPT_EDITS, PLAN, BYPASS)
_ALIASES = {
    "default": DEFAULT,
    "manual": DEFAULT,
    "ask": DEFAULT,
    "acceptedits": ACCEPT_EDITS,
    "auto": ACCEPT_EDITS,
    "plan": PLAN,
    "bypasspermissions": BYPASS,
}


def truthy(value: Any) -> Any:
    return str(value or "").strip().lower() in ("1", "true", "on", "yes")


def current_mode(env: Any) -> Any:
    """None quando o modo não está definido (comportamento legado, bit a bit); senão um de MODES.
    Valor desconhecido falha fechado para default, nunca para um modo mais permissivo."""
    raw = (env.get(MODE_ENV) or "").strip()
    if not raw:
        return None
    return _ALIASES.get(raw.lower(), DEFAULT)


def bypass_active(env: Any) -> Any:
    """Bypass é ortogonal ao modo: NYCODE_BYPASS_PERMISSIONS verdadeiro libera ASKs em qualquer modo (DENY nunca)."""
    return truthy(env.get(BYPASS_ENV))
