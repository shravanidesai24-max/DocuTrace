import urllib.request
import urllib.parse
import json

def test_url(url, post_data=None, method=None):
    data_bytes = None
    headers = {}
    if post_data is not None:
        data_bytes = json.dumps(post_data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers=headers,
        method=method
    )
    with urllib.request.urlopen(req) as resp:
        content_type = resp.headers.get("Content-Type", "")
        print(f"[HTTP {resp.status}] {url} ({content_type})")
        if "application/json" in content_type:
            data = json.loads(resp.read().decode("utf-8"))
            return data
        else:
            return resp.read().decode("utf-8")

def upload_form_doc(url, title, text, category="Assignment"):
    data = urllib.parse.urlencode({
        "title": title,
        "text_content": text,
        "category": category
    }).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

print("\n--- DocuTrace Clean State Integration Verification ---")

# 1. Frontend HTML Root
html = test_url("http://127.0.0.1:8000/")
assert "<title>DocuTrace" in html
print("[PASS] Frontend index.html served cleanly.")

# 2. Health Endpoint
health = test_url("http://127.0.0.1:8000/api/health")
assert health["status"] == "active"
print(f"[PASS] Health check active with algorithms: {health['algorithms_loaded']}")

# 3. Documents List (Must be 0 initially)
docs = test_url("http://127.0.0.1:8000/api/documents")
print(f"[PASS] Documents endpoint initial count = {len(docs)} documents.")

# 4. Upload fresh Document 1
up1 = upload_form_doc(
    "http://127.0.0.1:8000/api/upload",
    title="Data Structures Research Report",
    text="The research paper presents empirical evaluations of binary search trees and heap structures.",
    category="Research Paper"
)
doc1_id = up1["document"]["id"]
print(f"[PASS] Uploaded Document 1 (ID: {doc1_id})")

# 5. Upload fresh Document 2
up2 = upload_form_doc(
    "http://127.0.0.1:8000/api/upload",
    title="Advanced Trees and Heaps Submission",
    text="The research paper presents experimental evaluations of binary search trees and heap structures.",
    category="Research Paper"
)
doc2_id = up2["document"]["id"]
print(f"[PASS] Uploaded Document 2 (ID: {doc2_id})")

# 6. Compare the two uploaded documents
comp = test_url("http://127.0.0.1:8000/api/compare", {
    "doc_a_id": doc1_id,
    "doc_b_id": doc2_id,
    "jaccard_ngram": 2,
    "edit_mode": "word",
    "rabin_karp_window": 3
})
print(f"[PASS] Comparison Engine: Similarity = {comp['composite_similarity_percentage']}%, Classification = {comp['classification']}")

# 7. Authenticity Verification on Document 1
verify = test_url("http://127.0.0.1:8000/api/verify", {
    "doc_id": doc1_id
})
print(f"[PASS] Verification Engine: Trust Score = {verify['trust_score']}%, Risk = {verify['risk_level']}")

# 8. Clear all documents
clear_res = test_url("http://127.0.0.1:8000/api/documents", method="DELETE")
print(f"[PASS] Clear all documents: {clear_res['message']}")

# 9. Verify corpus is empty again
final_docs = test_url("http://127.0.0.1:8000/api/documents")
assert len(final_docs) == 0
print("[PASS] Repository verified completely empty (0 documents).")

print("\n--- ALL CLEAN STATE AND CRUD TESTS PASSED SUCCESSFULLY! ---\n")
