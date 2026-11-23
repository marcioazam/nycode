"""Emoji spans copied out of the vendored Supertone preprocessor.

A single character class of these non-BMP spans overlaps a surrogate range
(CodeQL py/overly-large-range). Code points remove the same characters.
"""

_EMOJI_SPANS: tuple[tuple[int, int], ...] = (
    (0x1F600, 0x1F64F),
    (0x1F300, 0x1F5FF),
    (0x1F680, 0x1F6FF),
    (0x1F700, 0x1F77F),
    (0x1F780, 0x1F7FF),
    (0x1F800, 0x1F8FF),
    (0x1F900, 0x1F9FF),
    (0x1FA00, 0x1FA6F),
    (0x1FA70, 0x1FAFF),
    (0x2600, 0x26FF),
    (0x2700, 0x27BF),
    (0x1F1E6, 0x1F1FF),
)


def strip_emojis(text: str) -> str:
    """Drop characters in the vendored spans and leave every other character."""
    return "".join(character for character in text if not _is_emoji(character))


def _is_emoji(character: str) -> bool:
    code = ord(character)
    return any(start <= code <= end for start, end in _EMOJI_SPANS)
