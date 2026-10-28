"""
Jaccard Similarity & Shingling Algorithm
Subject: Design and Analysis of Algorithms (DAA)

Mathematical Formulation:
  J(A, B) = |A ∩ B| / |A ∪ B|
  Jaccard Distance = 1 - J(A, B)

Time Complexity:
  - Tokenization / N-gram Shingling: O(N + M)
  - Hash Set Operations (Intersection & Union): O(|A| + |B|) average
  - Total Time Complexity: O(N + M)
Space Complexity: O(|A| + |B|)
"""

import time
import re
from typing import List, Dict, Any, Set, Tuple


def generate_ngrams(tokens: List[str], n: int = 2) -> List[str]:
    """Generates contiguous n-grams from a list of tokens."""
    if len(tokens) < n:
        return [" ".join(tokens)] if tokens else []
    return [" ".join(tokens[i:i + n]) for i in range(len(tokens) - n + 1)]


def compute_jaccard_similarity(
    text1: str,
    text2: str,
    n_gram: int = 2,
    mode: str = "word"
) -> Dict[str, Any]:
    """
    Computes Jaccard Similarity between two texts based on word or character n-grams.
    
    Returns:
      - similarity score (0.0 to 1.0)
      - distance (0.0 to 1.0)
      - set cardinalities: |A|, |B|, |A ∩ B|, |A ∪ B|
      - shared elements
      - unique elements
      - execution time in ms
    """
    start_time = time.perf_counter()

    # Preprocessing
    clean1 = re.sub(r'[^\w\s]', '', text1.lower()).strip()
    clean2 = re.sub(r'[^\w\s]', '', text2.lower()).strip()

    if mode == "word":
        tokens1 = clean1.split()
        tokens2 = clean2.split()
    else:
        tokens1 = list(clean1)
        tokens2 = list(clean2)

    # Generate shingles / n-grams
    shingles1 = generate_ngrams(tokens1, n_gram)
    shingles2 = generate_ngrams(tokens2, n_gram)

    set_a: Set[str] = set(shingles1)
    set_b: Set[str] = set(shingles2)

    intersection = set_a.intersection(set_b)
    union = set_a.union(set_b)

    cardinality_a = len(set_a)
    cardinality_b = len(set_b)
    cardinality_inter = len(intersection)
    cardinality_union = len(union)

    similarity = cardinality_inter / cardinality_union if cardinality_union > 0 else (1.0 if not set_a and not set_b else 0.0)
    distance = 1.0 - similarity

    elapsed_ms = (time.perf_counter() - start_time) * 1000

    return {
        "algorithm": f"Jaccard Similarity ({n_gram}-gram {mode})",
        "n_gram": n_gram,
        "mode": mode,
        "cardinality_A": cardinality_a,
        "cardinality_B": cardinality_b,
        "cardinality_intersection": cardinality_inter,
        "cardinality_union": cardinality_union,
        "similarity_score": round(similarity, 4),
        "similarity_percentage": round(similarity * 100, 2),
        "jaccard_distance": round(distance, 4),
        "shared_samples": sorted(list(intersection))[:25],
        "unique_to_A_samples": sorted(list(set_a - set_b))[:15],
        "unique_to_B_samples": sorted(list(set_b - set_a))[:15],
        "time_ms": round(elapsed_ms, 4),
        "theoretical_complexity": "O(N + M) time, O(|A| + |B|) space",
        "formula": f"|A ∩ B| / |A ∪ B| = {cardinality_inter} / {cardinality_union} = {round(similarity, 4)}"
    }
