"""
Text Preprocessor and Normalizer
DocuTrace - DAA Project
"""

import re
import unicodedata
from typing import List, Dict, Any, Tuple

# Common abbreviations to avoid false sentence splits
ABBREVIATIONS = {
    "dr.", "mr.", "mrs.", "ms.", "prof.", "sr.", "jr.", "vs.",
    "e.g.", "i.e.", "etc.", "fig.", "dept.", "approx.", "univ."
}

# Unicode characters often abused to bypass plagiarism detection
ZERO_WIDTH_CHARS = {
    '\u200B': 'Zero-Width Space',
    '\u200C': 'Zero-Width Non-Joiner',
    '\u200D': 'Zero-Width Joiner',
    '\uFEFF': 'Zero-Width No-Break Space (BOM)',
    '\u2060': 'Word Joiner',
}

# Common Cyrillic and Greek homoglyphs replacing Latin characters
HOMOGLYPH_MAP = {
    '\u0430': 'a',  # Cyrillic small letter a
    '\u0441': 'c',  # Cyrillic small letter es
    '\u0435': 'e',  # Cyrillic small letter ie
    '\u0456': 'i',  # Cyrillic small letter byelorussian-ukrainian i
    '\u0458': 'j',  # Cyrillic small letter je
    '\u043E': 'o',  # Cyrillic small letter o
    '\u0440': 'p',  # Cyrillic small letter er
    '\u0455': 's',  # Cyrillic small letter dze
    '\u0445': 'x',  # Cyrillic small letter ha
    '\u0443': 'y',  # Cyrillic small letter u
    '\u03BF': 'o',  # Greek small letter omicron
    '\u03BD': 'v',  # Greek small letter nu
}


def split_into_sentences(text: str) -> List[str]:
    """
    Splits text into cohesive sentences while handling abbreviations and punctuation.
    """
    if not text:
        return []

    # Clean multi-newlines and tabs
    clean_lines = [line.strip() for line in text.splitlines() if line.strip()]
    unified_text = " ".join(clean_lines)

    # Regex matching sentence terminal punctuation (.!?) followed by space and capital letter or end
    raw_sentences = re.split(r'(?<=[.!?])\s+', unified_text)
    refined_sentences = []

    for s in raw_sentences:
        s = s.strip()
        if not s:
            continue
        # Check if the split happened on an abbreviation
        tokens = s.split()
        if tokens and tokens[-1].lower() in ABBREVIATIONS and refined_sentences:
            refined_sentences[-1] += " " + s
        else:
            refined_sentences.append(s)

    return refined_sentences if refined_sentences else [text.strip()]


def normalize_text(text: str, remove_punct: bool = True) -> str:
    """
    Converts to lowercase, normalizes unicode, and collapses whitespace.
    """
    # Normalize unicode to NFKC
    norm = unicodedata.normalize('NFKC', text)
    if remove_punct:
        norm = re.sub(r'[^\w\s]', ' ', norm)
    norm = re.sub(r'\s+', ' ', norm).strip().lower()
    return norm


def inspect_anomalies(text: str) -> Dict[str, Any]:
    """
    Scans for hidden zero-width characters and homoglyph spoofing.
    """
    zero_width_found = []
    homoglyphs_found = []

    for idx, char in enumerate(text):
        if char in ZERO_WIDTH_CHARS:
            zero_width_found.append({
                "char_name": ZERO_WIDTH_CHARS[char],
                "hex": hex(ord(char)),
                "position": idx
            })
        elif char in HOMOGLYPH_MAP:
            homoglyphs_found.append({
                "suspicious_char": char,
                "latin_equivalent": HOMOGLYPH_MAP[char],
                "unicode_name": unicodedata.name(char, "UNKNOWN"),
                "position": idx
            })

    return {
        "zero_width_count": len(zero_width_found),
        "zero_width_details": zero_width_found[:20],
        "homoglyph_count": len(homoglyphs_found),
        "homoglyph_details": homoglyphs_found[:20]
    }
