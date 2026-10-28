"""
Knuth-Morris-Pratt (KMP) String Matching Algorithm
Subject: Design and Analysis of Algorithms (DAA)

Time Complexity:
  - Preprocessing (LPS computation): O(M), where M = len(pattern)
  - Matching phase: O(N), where N = len(text)
  - Total Time Complexity: O(N + M)
Space Complexity: O(M) for the LPS array

Key Innovation:
Avoids backtracking in the text pointer by utilizing the Longest Proper Prefix
which is also a Suffix (LPS/pi array).
"""

import time
from typing import List, Dict, Any, Tuple


def compute_lps_array(pattern: str) -> Tuple[List[int], List[Dict[str, Any]], int]:
    """
    Computes the Longest Proper Prefix which is also Suffix (LPS) array.
    Also produces an educational trace for visual understanding.
    
    Returns:
        lps: Array of prefix-suffix lengths for each prefix of pattern
        trace: Step-by-step state transitions during LPS construction
        comparisons: Total character comparisons performed
    """
    m = len(pattern)
    lps = [0] * m
    trace = []
    comparisons = 0
    
    if m == 0:
        return lps, trace, comparisons

    # Length of previous longest prefix suffix
    length = 0
    i = 1

    trace.append({
        "step": 0,
        "i": 0,
        "length": 0,
        "char": pattern[0],
        "lps_snapshot": list(lps),
        "explanation": f"lps[0] = 0 by definition (single char has no proper prefix/suffix)"
    })

    while i < m:
        comparisons += 1
        if pattern[i].lower() == pattern[length].lower():
            length += 1
            lps[i] = length
            trace.append({
                "step": len(trace),
                "i": i,
                "length": length,
                "char": pattern[i],
                "matched_with": pattern[length - 1],
                "action": "match",
                "lps_snapshot": list(lps),
                "explanation": f"Match found: pattern[{i}] ('{pattern[i]}') == pattern[{length-1}]. Increment length to {length}, lps[{i}] = {length}"
            })
            i += 1
        else:
            if length != 0:
                old_length = length
                length = lps[length - 1]
                trace.append({
                    "step": len(trace),
                    "i": i,
                    "length": length,
                    "char": pattern[i],
                    "action": "fallback",
                    "lps_snapshot": list(lps),
                    "explanation": f"Mismatch at pattern[{i}] ('{pattern[i]}') vs pattern[{old_length}]. Fallback length to lps[{old_length-1}] = {length}"
                })
            else:
                lps[i] = 0
                trace.append({
                    "step": len(trace),
                    "i": i,
                    "length": 0,
                    "char": pattern[i],
                    "action": "zero",
                    "lps_snapshot": list(lps),
                    "explanation": f"Mismatch and length is 0. lps[{i}] = 0. Advance i to {i+1}"
                })
                i += 1

    return lps, trace, comparisons


def kmp_search(
    text: str,
    pattern: str,
    case_sensitive: bool = False,
    max_trace_steps: int = 150
) -> Dict[str, Any]:
    """
    Searches for exact occurrences of `pattern` in `text` using KMP.
    
    Returns:
        dict containing match indices, counts, comparison metrics, LPS array,
        and execution runtime in milliseconds.
    """
    start_time = time.perf_counter()
    
    n = len(text)
    m = len(pattern)
    matches: List[int] = []
    trace_steps: List[Dict[str, Any]] = []
    comparisons = 0
    shifts = 0

    if m == 0 or n == 0 or m > n:
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        return {
            "algorithm": "KMP (Knuth-Morris-Pratt)",
            "pattern": pattern,
            "text_length": n,
            "pattern_length": m,
            "matches": matches,
            "match_count": 0,
            "comparisons": comparisons,
            "shifts": shifts,
            "lps": [],
            "lps_trace": [],
            "search_trace": [],
            "time_ms": round(elapsed_ms, 4),
            "theoretical_complexity": "O(N + M) time, O(M) space"
        }

    # Preprocessing
    lps, lps_trace, lps_comparisons = compute_lps_array(pattern)
    comparisons += lps_comparisons

    norm_text = text if case_sensitive else text.lower()
    norm_pattern = pattern if case_sensitive else pattern.lower()

    i = 0  # index for text
    j = 0  # index for pattern

    while i < n:
        comparisons += 1
        if norm_pattern[j] == norm_text[i]:
            if len(trace_steps) < max_trace_steps:
                trace_steps.append({
                    "text_idx": i,
                    "pat_idx": j,
                    "char_text": text[i],
                    "char_pat": pattern[j],
                    "status": "match",
                    "action": f"Chars match ('{text[i]}'). Advance both pointers."
                })
            i += 1
            j += 1

        if j == m:
            match_start = i - j
            matches.append(match_start)
            if len(trace_steps) < max_trace_steps:
                trace_steps.append({
                    "text_idx": i - 1,
                    "pat_idx": j - 1,
                    "status": "full_match",
                    "action": f"Pattern fully found at index {match_start}! Shift j to lps[{j-1}] = {lps[j-1]}"
                })
            j = lps[j - 1]
            shifts += 1
        elif i < n and norm_pattern[j] != norm_text[i]:
            shifts += 1
            if len(trace_steps) < max_trace_steps:
                trace_steps.append({
                    "text_idx": i,
                    "pat_idx": j,
                    "char_text": text[i],
                    "char_pat": pattern[j],
                    "status": "mismatch",
                    "action": f"Mismatch: '{text[i]}' != '{pattern[j]}'. " +
                              (f"Jump pattern pointer to lps[{j-1}]={lps[j-1]} (no text backtracks)" if j != 0 else "Advance text pointer.")
                })
            if j != 0:
                j = lps[j - 1]
            else:
                i += 1

    elapsed_ms = (time.perf_counter() - start_time) * 1000

    return {
        "algorithm": "KMP (Knuth-Morris-Pratt)",
        "pattern": pattern,
        "text_length": n,
        "pattern_length": m,
        "matches": matches,
        "match_count": len(matches),
        "comparisons": comparisons,
        "shifts": shifts,
        "lps": lps,
        "lps_trace": lps_trace[:50],
        "search_trace": trace_steps,
        "time_ms": round(elapsed_ms, 4),
        "theoretical_complexity": "O(N + M) time, O(M) space"
    }
