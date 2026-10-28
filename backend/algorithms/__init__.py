"""
DAA (Design and Analysis of Algorithms) Implementation Package
DocuTrace - Intelligent Document Verification & Similarity Detection System
"""

from .kmp import kmp_search, compute_lps_array
from .rabin_karp import rabin_karp_search, rabin_karp_passage_matcher
from .edit_distance import compute_edit_distance
from .jaccard import compute_jaccard_similarity
from .hasher import compute_hashes

__all__ = [
    "kmp_search",
    "compute_lps_array",
    "rabin_karp_search",
    "rabin_karp_passage_matcher",
    "compute_edit_distance",
    "compute_jaccard_similarity",
    "compute_hashes",
]
