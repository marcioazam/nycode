"""Relato de falhas dos hooks para a caixa de entrada de diagnóstico ($NYCODE_DIAG_INBOX); nunca lança."""

import os


def _campo(s: object) -> str:
    return str(s).replace("\r", "").replace("\t", "\\t").replace("\n", "\\n")


def relatar(sev: int, fonte: str, tipo: str, msg: str, detalhe: str = "") -> None:
    try:
        caminho = os.environ.get("NYCODE_DIAG_INBOX")
        if not caminho:
            return
        campos = [str(sev), fonte, tipo, msg] + ([detalhe] if detalhe else [])
        with open(caminho, "a", encoding="utf-8") as f:
            f.write("\t".join(_campo(c) for c in campos) + "\n")
    except Exception:  # noqa: BLE001, S110 - diagnóstico nunca quebra o chamador
        pass
