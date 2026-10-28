"""
DocuTrace Comparison Engine
Orchestrates KMP, Rabin-Karp, Edit Distance, Jaccard, and Cryptographic Hashing.
"""

import time
from typing import Dict, Any, List, Tuple
from ..algorithms.kmp import kmp_search
from ..algorithms.rabin_karp import rabin_karp_search, rabin_karp_passage_matcher
from ..algorithms.edit_distance import compute_edit_distance
from ..algorithms.jaccard import compute_jaccard_similarity
from ..algorithms.hasher import compute_hashes
from .preprocessor import split_into_sentences, normalize_text


def compare_two_documents(
    doc_a_name: str,
    doc_a_text: str,
    doc_b_name: str,
    doc_b_text: str,
    jaccard_ngram: int = 2,
    edit_mode: str = "word",
    rabin_karp_window: int = 4
) -> Dict[str, Any]:
    """
    Performs comprehensive multi-algorithm comparison between Document A and Document B.
    """
    start_total_time = time.perf_counter()

    # 1. Exact Duplicate Analysis via SHA-256 Hashes
    hash_a = compute_hashes(doc_a_text)
    hash_b = compute_hashes(doc_b_text)
    
    is_exact_binary_duplicate = (hash_a["raw_sha256"] == hash_b["raw_sha256"])
    is_exact_text_duplicate = (hash_a["normalized_sha256"] == hash_b["normalized_sha256"])

    # 2. Preprocessing & Sentence Extraction
    sentences_a = split_into_sentences(doc_a_text)
    sentences_b = split_into_sentences(doc_b_text)

    # 3. Dynamic Programming Edit Distance on overall documents
    # (If document is very long, limit to first 120 words for full DP matrix, but compute fast distance)
    words_a = doc_a_text.split()
    words_b = doc_b_text.split()
    sample_a = " ".join(words_a[:70])
    sample_b = " ".join(words_b[:70])
    
    dp_result = compute_edit_distance(
        sample_a,
        sample_b,
        mode=edit_mode,
        include_full_matrix=True,
        max_matrix_dim=35
    )

    # 4. Jaccard Similarity (Word n-grams)
    jaccard_1gram = compute_jaccard_similarity(doc_a_text, doc_b_text, n_gram=1, mode="word")
    jaccard_ngram_res = compute_jaccard_similarity(doc_a_text, doc_b_text, n_gram=jaccard_ngram, mode="word")

    # 5. Rabin-Karp Rolling Hash Passage Matcher
    rabin_karp_res = rabin_karp_passage_matcher(
        doc_a=doc_a_text,
        doc_b=doc_b_text,
        window_word_size=rabin_karp_window
    )

    # 6. Sentence-by-Sentence Alignment & Mutation Detection
    # For every sentence in Doc B, find closest matching sentence in Doc A
    sentence_matches: List[Dict[str, Any]] = []
    kmp_benchmarks: List[Dict[str, Any]] = []
    
    exact_sentence_matches_count = 0
    modified_sentence_matches_count = 0
    unique_sentence_count = 0

    for idx_b, s_b in enumerate(sentences_b):
        clean_sb = normalize_text(s_b)
        best_match_idx_a = -1
        best_similarity = 0.0
        best_sentence_a = ""
        best_edit_ops = None
        best_diff_details = None

        if not clean_sb:
            continue

        for idx_a, s_a in enumerate(sentences_a):
            clean_sa = normalize_text(s_a)
            if not clean_sa:
                continue

            if clean_sb == clean_sa:
                best_similarity = 1.0
                best_match_idx_a = idx_a
                best_sentence_a = s_a
                best_edit_ops = {"matches": len(s_b.split()), "substitutions": 0, "insertions": 0, "deletions": 0}
                break
            else:
                # Word-level edit distance for sentence pair
                pair_edit = compute_edit_distance(s_a, s_b, mode="word", include_full_matrix=False)
                if pair_edit["similarity_score"] > best_similarity:
                    best_similarity = pair_edit["similarity_score"]
                    best_match_idx_a = idx_a
                    best_sentence_a = s_a
                    best_edit_ops = pair_edit["operations"]
                    best_diff_details = pair_edit["alignment"]

        # Classify sentence match
        if best_similarity >= 0.98:
            match_type = "EXACT_MATCH"
            exact_sentence_matches_count += 1
        elif best_similarity >= 0.60:
            match_type = "MODIFIED_TEXT"
            modified_sentence_matches_count += 1
        elif best_similarity >= 0.35:
            match_type = "PARTIAL_SIMILARITY"
            modified_sentence_matches_count += 1
        else:
            match_type = "UNIQUE_CONTENT"
            unique_sentence_count += 1

        # Run KMP search for prominent phrases of s_b inside Doc A
        words_sb = s_b.split()
        if len(words_sb) >= 3 and len(kmp_benchmarks) < 3:
            key_phrase = " ".join(words_sb[:min(4, len(words_sb))])
            kmp_run = kmp_search(doc_a_text, key_phrase, case_sensitive=False)
            kmp_benchmarks.append(kmp_run)

        # Highlight differences if modified
        diff_highlights = []
        if match_type in ["MODIFIED_TEXT", "PARTIAL_SIMILARITY"] and best_diff_details:
            for item in best_diff_details:
                diff_highlights.append({
                    "type": item["type"],
                    "from_doc_a": item["token1"],
                    "to_doc_b": item["token2"]
                })

        sentence_matches.append({
            "doc_b_index": idx_b,
            "doc_b_sentence": s_b,
            "matched_doc_a_index": best_match_idx_a,
            "matched_doc_a_sentence": best_sentence_a,
            "match_type": match_type,
            "similarity_score": round(best_similarity, 4),
            "similarity_percentage": round(best_similarity * 100, 1),
            "edit_operations": best_edit_ops,
            "diff_highlights": diff_highlights[:10]
        })

    # Overall Composite Score Calculation
    total_b_sentences = max(1, len(sentence_matches))
    sentence_coverage = (exact_sentence_matches_count * 1.0 + modified_sentence_matches_count * 0.7) / total_b_sentences
    jaccard_score = jaccard_ngram_res["similarity_score"]
    rabin_karp_score = rabin_karp_res["passage_similarity_ratio"]
    edit_score = dp_result["similarity_score"]

    if is_exact_binary_duplicate or is_exact_text_duplicate:
        composite_score = 100.0
        classification = "EXACT_DUPLICATE"
    else:
        # Weighted formula blending DAA algorithms
        raw_composite = (sentence_coverage * 0.40) + (rabin_karp_score * 0.25) + (jaccard_score * 0.20) + (edit_score * 0.15)
        composite_score = round(min(100.0, raw_composite * 100), 1)
        
        if composite_score >= 80:
            classification = "HIGH_SIMILARITY_COPIED"
        elif composite_score >= 45:
            classification = "MODERATE_SIMILARITY_PARAPHRASED"
        elif composite_score >= 20:
            classification = "LOW_SIMILARITY_SLIGHT_OVERLAP"
        else:
            classification = "DISTINCT_ORIGINAL"

    total_time_ms = round((time.perf_counter() - start_total_time) * 1000, 3)

    return {
        "doc_a_name": doc_a_name,
        "doc_b_name": doc_b_name,
        "is_exact_duplicate": is_exact_binary_duplicate or is_exact_text_duplicate,
        "duplicate_type": "Binary Identical" if is_exact_binary_duplicate else ("Text Identical" if is_exact_text_duplicate else "Not an Exact Duplicate"),
        "composite_similarity_percentage": composite_score,
        "classification": classification,
        "stats": {
            "doc_a_char_count": len(doc_a_text),
            "doc_b_char_count": len(doc_b_text),
            "doc_a_word_count": len(words_a),
            "doc_b_word_count": len(words_b),
            "doc_a_sentence_count": len(sentences_a),
            "doc_b_sentence_count": len(sentences_b),
            "exact_matching_sentences": exact_sentence_matches_count,
            "modified_sentences": modified_sentence_matches_count,
            "unique_sentences": unique_sentence_count
        },
        "algorithm_metrics": {
            "jaccard_1gram": jaccard_1gram,
            "jaccard_ngram": jaccard_ngram_res,
            "rabin_karp": rabin_karp_res,
            "edit_distance_dp": dp_result,
            "kmp_sample_searches": kmp_benchmarks
        },
        "sentence_matches": sentence_matches,
        "hashes": {
            "doc_a": hash_a,
            "doc_b": hash_b
        },
        "execution_time_ms": total_time_ms
    }
