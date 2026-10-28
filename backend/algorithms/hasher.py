"""
Cryptographic and Normalized Hashing for Exact Duplicate Detection
Subject: Design and Analysis of Algorithms (DAA)

Time Complexity: O(N) linear scan over document bytes
Lookup Complexity: O(1) hash table lookup
"""

import hashlib
import re
from typing import Dict, Any, Union


def compute_hashes(content: Union[str, bytes]) -> Dict[str, str]:
    """
    Computes both raw binary SHA-256 and whitespace/case normalized text SHA-256.
    """
    if isinstance(content, str):
        byte_data = content.encode("utf-8")
        text_str = content
    else:
        byte_data = content
        try:
            text_str = content.decode("utf-8", errors="ignore")
        except Exception:
            text_str = ""

    # Raw SHA-256
    raw_hash = hashlib.sha256(byte_data).hexdigest()

    # Normalized text hash (ignores case, extra spaces, line returns)
    clean_text = re.sub(r'\s+', ' ', text_str.lower()).strip()
    norm_hash = hashlib.sha256(clean_text.encode("utf-8")).hexdigest()

    return {
        "raw_sha256": raw_hash,
        "normalized_sha256": norm_hash,
        "byte_size": len(byte_data),
        "normalized_char_count": len(clean_text)
    }
