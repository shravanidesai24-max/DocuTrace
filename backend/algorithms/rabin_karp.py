"""
Rabin-Karp String Matching & Rolling Hash Algorithm
Subject: Design and Analysis of Algorithms (DAA)

Time Complexity:
  - Average Case: O(N + M)
  - Worst Case: O(N * M) (occurs when multiple hash collisions occur)
Space Complexity: O(1) auxiliary space (excluding match storage)

Key Innovation:
Uses rolling polynomial hash values to test substrings in O(1) time per window,
performing full string comparison only upon hash collision.
"""

import time
from typing import List, Dict, Any, Tuple


def rabin_karp_search(
    text: str,
    pattern: str,
    base: int = 256,
    prime: int = 1000000007,
    case_sensitive: bool = False,
    max_trace_steps: int = 150
) -> Dict[str, Any]:
    """
    Finds all occurrences of `pattern` in `text` using Rabin-Karp rolling hash.
    
    Returns metrics including:
      - Match positions
      - Number of hash calculations
      - Spurious hits (hash matched, but character verification failed)
      - Character comparisons
      - Step-by-step rolling hash animation states
      - Execution time in milliseconds
    """
    start_time = time.perf_counter()

    n = len(text)
    m = len(pattern)
    matches: List[int] = []
    spurious_hits = 0
    hash_calculations = 0
    char_comparisons = 0
    trace_steps: List[Dict[str, Any]] = []

    if m == 0 or n == 0 or m > n:
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        return {
            "algorithm": "Rabin-Karp Rolling Hash",
            "pattern": pattern,
            "text_length": n,
            "pattern_length": m,
            "matches": matches,
            "match_count": 0,
            "hash_calculations": 0,
            "spurious_hits": 0,
            "char_comparisons": 0,
            "trace_steps": [],
            "pattern_hash": 0,
            "base": base,
            "prime": prime,
            "time_ms": round(elapsed_ms, 4),
            "theoretical_complexity": "Average O(N + M), Worst O(N * M)"
        }

    norm_text = text if case_sensitive else text.lower()
    norm_pattern = pattern if case_sensitive else pattern.lower()

    # Precompute h = base^(m-1) % prime
    h = 1
    for _ in range(m - 1):
        h = (h * base) % prime

    # Calculate initial hash value for pattern and first window of text
    pattern_hash = 0
    window_hash = 0
    for k in range(m):
        pattern_hash = (base * pattern_hash + ord(norm_pattern[k])) % prime
        window_hash = (base * window_hash + ord(norm_text[k])) % prime
    hash_calculations += 2

    # Slide window across text
    for i in range(n - m + 1):
        is_hash_match = (pattern_hash == window_hash)
        is_spurious = False
        is_exact = False

        if is_hash_match:
            # Hash matches; verify characters one by one
            exact_match = True
            for j in range(m):
                char_comparisons += 1
                if norm_text[i + j] != norm_pattern[j]:
                    exact_match = False
                    break
            
            if exact_match:
                matches.append(i)
                is_exact = True
            else:
                spurious_hits += 1
                is_spurious = True

        if len(trace_steps) < max_trace_steps:
            trace_steps.append({
                "window_idx": i,
                "window_text": text[i:i + m],
                "window_hash": window_hash,
                "pattern_hash": pattern_hash,
                "hash_match": is_hash_match,
                "exact_match": is_exact,
                "spurious_hit": is_spurious,
                "status": "match" if is_exact else ("collision" if is_spurious else "no_match")
            })

        # Calculate rolling hash for next window:
        # window_hash = (base * (window_hash - norm_text[i]*h) + norm_text[i + m]) % prime
        if i < n - m:
            window_hash = (base * (window_hash - ord(norm_text[i]) * h) + ord(norm_text[i + m])) % prime
            if window_hash < 0:
                window_hash += prime
            hash_calculations += 1

    elapsed_ms = (time.perf_counter() - start_time) * 1000

    return {
        "algorithm": "Rabin-Karp Rolling Hash",
        "pattern": pattern,
        "text_length": n,
        "pattern_length": m,
        "matches": matches,
        "match_count": len(matches),
        "hash_calculations": hash_calculations,
        "spurious_hits": spurious_hits,
        "char_comparisons": char_comparisons,
        "trace_steps": trace_steps,
        "pattern_hash": pattern_hash,
        "base": base,
        "prime": prime,
        "time_ms": round(elapsed_ms, 4),
        "theoretical_complexity": "Average O(N + M), Worst O(N * M)"
    }


def rabin_karp_passage_matcher(
    doc_a: str,
    doc_b: str,
    window_word_size: int = 5,
    base: int = 256,
    prime: int = 1000000007
) -> Dict[str, Any]:
    """
    Compares two documents by extracting word-based shingle rolling hashes.
    Identifies common passages, matching sentences, and calculates passage coverage.
    """
    start_time = time.perf_counter()

    words_a = doc_a.split()
    words_b = doc_b.split()
    
    if len(words_a) < window_word_size or len(words_b) < window_word_size:
        return {
            "matching_passages": [],
            "matched_word_count": 0,
            "passage_similarity_ratio": 0.0,
            "total_windows_checked": 0,
            "time_ms": round((time.perf_counter() - start_time) * 1000, 4)
        }

    # Index word n-grams of doc_a using hash table
    def hash_shingle(words_list: List[str]) -> int:
        shingle_str = " ".join(words_list).lower()
        h = 0
        for ch in shingle_str:
            h = (base * h + ord(ch)) % prime
        return h

    shingles_a: Dict[int, List[int]] = {}
    for idx in range(len(words_a) - window_word_size + 1):
        window = words_a[idx:idx + window_word_size]
        h = hash_shingle(window)
        shingles_a.setdefault(h, []).append(idx)

    # Search shingles of doc_b against doc_a
    matches = []
    matched_indices_a = set()
    matched_indices_b = set()

    for idx_b in range(len(words_b) - window_word_size + 1):
        window_b = words_b[idx_b:idx_b + window_word_size]
        h_b = hash_shingle(window_b)
        
        if h_b in shingles_a:
            for idx_a in shingles_a[h_b]:
                window_a = words_a[idx_a:idx_a + window_word_size]
                # Exact verification
                if [w.lower() for w in window_a] == [w.lower() for w in window_b]:
                    matches.append({
                        "doc_a_start_word": idx_a,
                        "doc_b_start_word": idx_b,
                        "passage_text": " ".join(window_a),
                        "hash_value": h_b
                    })
                    for w_i in range(window_word_size):
                        matched_indices_a.add(idx_a + w_i)
                        matched_indices_b.add(idx_b + w_i)

    # Deduplicate overlapping matches
    unique_passages = []
    seen = set()
    for m in matches:
        p_text = m["passage_text"]
        if p_text not in seen:
            seen.add(p_text)
            unique_passages.append(m)

    total_words_eval = max(len(words_a), len(words_b))
    coverage = len(matched_indices_b) / total_words_eval if total_words_eval > 0 else 0.0

    return {
        "matching_passages": unique_passages[:30],
        "total_matches_found": len(unique_passages),
        "doc_a_matched_words": len(matched_indices_a),
        "doc_b_matched_words": len(matched_indices_b),
        "passage_similarity_ratio": round(coverage, 4),
        "time_ms": round((time.perf_counter() - start_time) * 1000, 4)
    }
