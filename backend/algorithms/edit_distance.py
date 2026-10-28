"""
Levenshtein Edit Distance (Dynamic Programming)
Subject: Design and Analysis of Algorithms (DAA)

Recurrence Relation:
  D[i, 0] = i * cost_del
  D[0, j] = j * cost_ins
  D[i, j] = min(
      D[i-1, j] + cost_del,                          (Deletion)
      D[i, j-1] + cost_ins,                          (Insertion)
      D[i-1, j-1] + (0 if s1[i-1] == s2[j-1] else 1) (Substitution)
  )

Time Complexity: O(N * M)
Space Complexity: O(N * M) for full traceback matrix
"""

import time
from typing import List, Dict, Any, Tuple


def compute_edit_distance(
    seq1: str,
    seq2: str,
    mode: str = "word",
    include_full_matrix: bool = True,
    max_matrix_dim: int = 50
) -> Dict[str, Any]:
    """
    Computes minimum edit operations to transform seq1 into seq2.
    
    Parameters:
      seq1: Original source string
      seq2: Modified target string
      mode: 'word' (splits on whitespace) or 'char' (character-by-character)
      include_full_matrix: whether to return 2D DP matrix for visualization
      max_matrix_dim: cap on matrix dimension to prevent massive payload over wire
      
    Returns:
      dict with edit distance, similarity score (0.0 to 1.0), operations breakdown,
      alignment traceback, DP matrix for visualizer, and runtime.
    """
    start_time = time.perf_counter()

    if mode == "word":
        tokens1 = seq1.split()
        tokens2 = seq2.split()
    else:
        tokens1 = list(seq1)
        tokens2 = list(seq2)

    n = len(tokens1)
    m = len(tokens2)

    # Initialize DP table (n+1) x (m+1)
    dp = [[0] * (m + 1) for _ in range(n + 1)]

    # Base cases
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j

    cell_computations = 0

    # Fill DP table
    for i in range(1, n + 1):
        t1 = tokens1[i - 1].lower() if mode == "word" else tokens1[i - 1]
        for j in range(1, m + 1):
            cell_computations += 1
            t2 = tokens2[j - 1].lower() if mode == "word" else tokens2[j - 1]
            cost_sub = 0 if t1 == t2 else 1

            dp[i][j] = min(
                dp[i - 1][j] + 1,        # Deletion from seq1
                dp[i][j - 1] + 1,        # Insertion into seq1
                dp[i - 1][j - 1] + cost_sub  # Substitution or match
            )

    edit_distance = dp[n][m] if n > 0 or m > 0 else 0
    max_len = max(n, m)
    similarity_ratio = 1.0 - (edit_distance / max_len) if max_len > 0 else 1.0

    # Backtracking for alignment & operations breakdown
    alignment = []
    i, j = n, m
    ops_count = {"matches": 0, "substitutions": 0, "insertions": 0, "deletions": 0}
    backtrack_path = []

    while i > 0 or j > 0:
        backtrack_path.append((i, j))
        if i > 0 and j > 0:
            t1 = tokens1[i - 1].lower() if mode == "word" else tokens1[i - 1]
            t2 = tokens2[j - 1].lower() if mode == "word" else tokens2[j - 1]
            cost_sub = 0 if t1 == t2 else 1

            if dp[i][j] == dp[i - 1][j - 1] + cost_sub:
                if cost_sub == 0:
                    alignment.append({
                        "type": "equal",
                        "token1": tokens1[i - 1],
                        "token2": tokens2[j - 1],
                        "cost": 0
                    })
                    ops_count["matches"] += 1
                else:
                    alignment.append({
                        "type": "substitution",
                        "token1": tokens1[i - 1],
                        "token2": tokens2[j - 1],
                        "cost": 1
                    })
                    ops_count["substitutions"] += 1
                i -= 1
                j -= 1
                continue

        if i > 0 and dp[i][j] == dp[i - 1][j] + 1:
            alignment.append({
                "type": "deletion",
                "token1": tokens1[i - 1],
                "token2": None,
                "cost": 1
            })
            ops_count["deletions"] += 1
            i -= 1
        else:
            alignment.append({
                "type": "insertion",
                "token1": None,
                "token2": tokens2[j - 1],
                "cost": 1
            })
            ops_count["insertions"] += 1
            j -= 1

    alignment.reverse()
    backtrack_path.append((0, 0))
    backtrack_path.reverse()

    elapsed_ms = (time.perf_counter() - start_time) * 1000

    matrix_data = None
    if include_full_matrix and n <= max_matrix_dim and m <= max_matrix_dim:
        matrix_data = {
            "row_headers": ["<start>"] + tokens1,
            "col_headers": ["<start>"] + tokens2,
            "matrix": dp,
            "path": backtrack_path
        }

    return {
        "algorithm": "Levenshtein Edit Distance (DP)",
        "mode": mode,
        "length_seq1": n,
        "length_seq2": m,
        "edit_distance": edit_distance,
        "similarity_score": round(similarity_ratio, 4),
        "similarity_percentage": round(similarity_ratio * 100, 2),
        "operations": ops_count,
        "cell_computations": cell_computations,
        "alignment": alignment[:100],
        "dp_matrix": matrix_data,
        "time_ms": round(elapsed_ms, 4),
        "theoretical_complexity": f"Time: O(N * M) ({n} * {m} = {n * m} ops), Space: O(N * M)"
    }
