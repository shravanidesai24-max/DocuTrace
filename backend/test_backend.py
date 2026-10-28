"""
DocuTrace System Test Suite
Verifies all DAA algorithms and backend services with standalone test inputs.
"""

import sys
import os

# Add parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.algorithms.kmp import compute_lps_array, kmp_search
from backend.algorithms.rabin_karp import rabin_karp_search, rabin_karp_passage_matcher
from backend.algorithms.edit_distance import compute_edit_distance
from backend.algorithms.jaccard import compute_jaccard_similarity
from backend.algorithms.hasher import compute_hashes
from backend.core.preprocessor import split_into_sentences, inspect_anomalies
from backend.core.verifier import verify_document_authenticity
from backend.core.engine import compare_two_documents


# Standalone test fixtures for verification
TEST_TEXT_ORIGINAL = (
    "The document tracking system helps researchers detect text duplication, sentence modification, "
    "and structural changes across academic papers. It provides detailed metrics and hash verifications."
)

TEST_TEXT_MODIFIED = (
    "The document tracking platform helps researchers discover text duplication, paragraph alteration, "
    "and structural changes across academic papers. It provides detailed metrics and hash verifications."
)

TEST_TEXT_IDENTICAL = (
    "The document tracking system helps researchers detect text duplication, sentence modification, "
    "and structural changes across academic papers. It provides detailed metrics and hash verifications."
)

TEST_CERT_TAMPERED = (
    "DocuTrace St\u0430te Univ\u0435rsity — Official C\u0435rtific\u0430te of Academic Excellence.\u200B "
    "This certifies distinction honors grade."
)


def test_kmp():
    pattern = "AABAACAABAA"
    lps, trace, comps = compute_lps_array(pattern)
    assert lps == [0, 1, 0, 1, 2, 0, 1, 2, 3, 4, 5], f"LPS failed: {lps}"
    
    text = "The document verification system monitors text similarity and patterns"
    res = kmp_search(text, "text similarity")
    assert res["match_count"] == 1
    assert res["matches"][0] == text.lower().find("text similarity")
    print("[PASS] KMP Algorithm passed all tests.")


def test_rabin_karp():
    text = "The document verification system monitors text similarity and patterns"
    res = rabin_karp_search(text, "verification system")
    assert res["match_count"] == 1
    
    passage_res = rabin_karp_passage_matcher(
        TEST_TEXT_ORIGINAL,
        TEST_TEXT_MODIFIED,
        window_word_size=3
    )
    assert passage_res["total_matches_found"] > 0
    print("[PASS] Rabin-Karp Rolling Hash passed all tests.")


def test_edit_distance():
    # Word level substitution test
    s1 = "The student submits a report"
    s2 = "The student uploads a report"
    res = compute_edit_distance(s1, s2, mode="word")
    assert res["edit_distance"] == 1
    assert res["operations"]["substitutions"] == 1
    assert res["operations"]["matches"] == 4
    assert res["similarity_percentage"] > 75.0
    print("[PASS] Edit Distance (DP) passed all tests.")


def test_jaccard():
    s1 = "classroom equipment internet connectivity campus cleanliness"
    s2 = "classroom equipment internet connectivity campus cleanliness"
    res_identical = compute_jaccard_similarity(s1, s2, n_gram=2)
    assert res_identical["similarity_score"] == 1.0

    s3 = "classroom equipment network connectivity campus hygiene"
    res_similar = compute_jaccard_similarity(s1, s3, n_gram=1)
    assert 0.0 < res_similar["similarity_score"] < 1.0
    print("[PASS] Jaccard Similarity passed all tests.")


def test_hasher():
    t1 = "Hello World"
    t2 = "Hello    World\n"
    h1 = compute_hashes(t1)
    h2 = compute_hashes(t2)
    assert h1["normalized_sha256"] == h2["normalized_sha256"]
    print("[PASS] SHA-256 Duplicate Detector passed all tests.")


def test_authenticity_verifier():
    # Test suspicious certificate with Cyrillic homoglyphs & paradox timestamp
    meta = {
        "author": "Unknown / Modified",
        "creator": "GIMP 2.10 Image Editor",
        "producer": "Canva PDF Export v1.2",
        "created_date": "2025-11-20 10:00:00",
        "modified_date": "2024-01-05 08:30:00"  # Paradoxical backdated timestamp!
    }
    res = verify_document_authenticity(
        filename="Official_Academic_Honors_Certificate.pdf",
        raw_text=TEST_CERT_TAMPERED,
        metadata=meta
    )
    assert res["risk_level"] in ["SUSPICIOUS_ANOMALIES", "HIGH_RISK_ALTERED"]
    assert res["anomaly_counts"]["homoglyphs"] > 0
    assert any(f["code"] == "TIMESTAMP_PARADOX" for f in res["findings"])
    print("[PASS] Authenticity Verification Engine passed all tests.")


def test_comparison_engine():
    res = compare_two_documents(
        "Doc A",
        TEST_TEXT_ORIGINAL,
        "Doc B",
        TEST_TEXT_MODIFIED
    )
    assert res["classification"] in ["HIGH_SIMILARITY_COPIED", "MODERATE_SIMILARITY_PARAPHRASED"]
    assert res["stats"]["modified_sentences"] > 0
    
    # Test exact duplicate
    dup_res = compare_two_documents(
        "Doc A",
        TEST_TEXT_ORIGINAL,
        "Doc A Duplicate",
        TEST_TEXT_IDENTICAL
    )
    assert dup_res["is_exact_duplicate"] is True
    assert dup_res["composite_similarity_percentage"] == 100.0
    print("[PASS] Comparison Engine integration passed all tests.")


if __name__ == "__main__":
    print("\n--- Running DocuTrace DAA Verification Suite ---")
    test_kmp()
    test_rabin_karp()
    test_edit_distance()
    test_jaccard()
    test_hasher()
    test_authenticity_verifier()
    test_comparison_engine()
    print("--- ALL BACKEND ALGORITHMS AND MODULES VERIFIED SUCCESSFULLY! ---\n")
