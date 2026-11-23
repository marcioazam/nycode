"""The speech emoji strip removes the vendored spans and leaves other characters."""

import importlib.util
from pathlib import Path
from typing import Protocol, cast

_MODULE = (
    Path(__file__).resolve().parents[1]
    / "apps"
    / "p2"
    / "voice-server"
    / "emoji_spans.py"
)
_HELPER = _MODULE.with_name("supertonic_helper.py")


class _Spans(Protocol):
    def strip_emojis(self, text: str) -> str: ...


def _load() -> _Spans:
    spec = importlib.util.spec_from_file_location("emoji_spans", _MODULE)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    # importlib returns ModuleType; the file is the implementation of this protocol.
    return cast(_Spans, module)


def test_span_characters_are_removed_and_text_stays() -> None:
    spans = _load()
    # First span, a BMP span, and the last span. U+1F650 sits in none of them.
    assert (
        spans.strip_emojis("a\U0001f600b\u2600c\U0001f1e6d\U0001f650")
        == "abcd\U0001f650"
    )


def test_vendored_helper_no_longer_compiles_one_non_bmp_class() -> None:
    helper = _HELPER.read_text(encoding="utf-8")
    assert "\\U0001f600" not in helper
    assert "strip_emojis" in helper
