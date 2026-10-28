"""
DocuTrace — Intelligent Document Verification & Similarity Detection System
FastAPI Backend Server
Subject: Design and Analysis of Algorithms (DAA)
"""

import os
import sys
import uuid
import time
import random
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Response
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .algorithms.kmp import kmp_search, compute_lps_array
from .algorithms.rabin_karp import rabin_karp_search, rabin_karp_passage_matcher
from .algorithms.edit_distance import compute_edit_distance
from .algorithms.jaccard import compute_jaccard_similarity
from .algorithms.hasher import compute_hashes
from .core.text_extractor import extract_text_and_metadata
from .core.preprocessor import split_into_sentences, normalize_text
from .core.verifier import verify_document_authenticity
from .core.engine import compare_two_documents
from .core.pdf_generator import generate_inspection_pdf
from .samples.sample_docs import SAMPLE_DOCUMENTS
from .database.db import (
    init_db,
    save_document,
    get_document as db_get_document,
    list_documents as db_list_documents,
    delete_document as db_delete_document,
    clear_all_documents as db_clear_all_documents,
    find_duplicate_by_normalized_sha,
    record_comparison,
    get_db_stats
)

# Initialize FastAPI App
app = FastAPI(
    title="DocuTrace API",
    description="Intelligent Document Verification & Similarity Detection System (DAA Subject Project)",
    version="1.0.0"
)

# Enable CORS for development flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prevent browser from serving stale cached assets
@app.middleware("http")
async def add_no_cache_headers(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# Initialize SQLite Database & Tables
init_db()

# Preload any sample documents if defined
for sample_id, sample in SAMPLE_DOCUMENTS.items():
    if not db_get_document(sample_id):
        text = sample["text"]
        hashes = compute_hashes(text)
        save_document({
            "id": sample_id,
            "title": sample["title"],
            "filename": sample["filename"],
            "category": sample["category"],
            "description": sample["description"],
            "text": text,
            "metadata": sample["metadata"],
            "hashes": hashes,
            "word_count": len(text.split()),
            "char_count": len(text),
            "sentence_count": len(split_into_sentences(text)),
            "is_sample": True,
            "uploaded_at": "Preloaded Academic Sample"
        })


# Models for API requests
class CompareRequest(BaseModel):
    doc_a_id: Optional[str] = None
    doc_b_id: Optional[str] = None
    custom_text_a: Optional[str] = None
    custom_text_b: Optional[str] = None
    doc_a_name: Optional[str] = None
    doc_b_name: Optional[str] = None
    jaccard_ngram: int = 2
    edit_mode: str = "word"
    rabin_karp_window: int = 4


class ExportPdfRequest(BaseModel):
    doc_a_name: Optional[str] = "Reference Document"
    doc_b_name: Optional[str] = "Submitted Document"
    composite_similarity_percentage: Optional[float] = 0.0
    classification: Optional[str] = "ANALYSIS"
    sentence_matches: List[Dict[str, Any]] = []


class VerifyRequest(BaseModel):
    doc_id: Optional[str] = None
    custom_text: Optional[str] = None
    filename: Optional[str] = "custom_document.pdf"
    metadata: Optional[Dict[str, Any]] = None


class BenchmarkRequest(BaseModel):
    document_sizes: List[int] = [10, 50, 100, 250, 500]
    iterations_per_size: int = 3


class AlgoDemoRequest(BaseModel):
    algorithm: str  # "kmp", "rabin_karp", "edit_distance", "jaccard"
    text1: str
    text2: Optional[str] = ""
    ngram: Optional[int] = 2
    mode: Optional[str] = "word"


@app.get("/api/health")
def health_check():
    db_stats = get_db_stats()
    return {
        "status": "active",
        "service": "DocuTrace Engine",
        "database": db_stats,
        "documents_in_db": db_stats["total_documents"]
    }


@app.get("/api/database/stats")
def database_stats():
    return get_db_stats()


@app.get("/api/samples")
def get_sample_documents():
    return list(SAMPLE_DOCUMENTS.values())


UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def find_document_file(doc_id: str, filename: str = "") -> Optional[str]:
    """Finds original file on disk in uploads or project directories."""
    # 1. Match in uploads/ with doc_id prefix
    if os.path.exists(UPLOAD_DIR):
        for f in os.listdir(UPLOAD_DIR):
            if f.startswith(f"{doc_id}_") or f == filename or f == f"{doc_id}.bin":
                return os.path.join(UPLOAD_DIR, f)

    # 2. Match in test_documents/
    test_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test_documents")
    if filename and os.path.exists(test_dir):
        candidate = os.path.join(test_dir, filename)
        if os.path.exists(candidate):
            return candidate

    # 3. Fallback check user desktop or common paths if filename matches
    if filename:
        desktop_paths = [
            os.path.expanduser(r"~\OneDrive\Desktop"),
            os.path.expanduser(r"~\Desktop"),
            os.path.expanduser(r"~\Downloads")
        ]
        for dp in desktop_paths:
            candidate = os.path.join(dp, filename)
            if os.path.exists(candidate):
                return candidate

    return None


@app.get("/api/documents")
def list_documents():
    return db_list_documents()


@app.get("/api/documents/{doc_id}")
def get_document(doc_id: str):
    doc = db_get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@app.get("/api/documents/{doc_id}/file")
def get_document_file(doc_id: str, download: bool = False):
    """Streams the raw original file with proper MIME type."""
    doc = db_get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    filename = doc["filename"]
    fpath = find_document_file(doc_id, filename)

    if not fpath or not os.path.exists(fpath):
        # Fallback: create temporary text file from stored text
        fpath = os.path.join(UPLOAD_DIR, f"{doc_id}_{filename}")
        with open(fpath, "w", encoding="utf-8") as tf:
            tf.write(doc.get("text", ""))

    lower = filename.lower()
    if lower.endswith(".pdf"):
        media_type = "application/pdf"
    elif lower.endswith(".docx"):
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif lower.endswith(".txt"):
        media_type = "text/plain; charset=utf-8"
    else:
        media_type = "application/octet-stream"

    content_disposition = f"attachment; filename=\"{filename}\"" if download else f"inline; filename=\"{filename}\""
    return FileResponse(
        path=fpath,
        media_type=media_type,
        filename=filename,
        headers={"Content-Disposition": content_disposition}
    )


@app.get("/api/documents/{doc_id}/preview")
def get_document_preview(doc_id: str):
    """Provides formatted preview for viewing original document."""
    doc = db_get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    filename = doc["filename"]
    fpath = find_document_file(doc_id, filename)
    lower = filename.lower()

    if lower.endswith(".pdf"):
        return {
            "type": "pdf",
            "filename": filename,
            "title": doc["title"],
            "url": f"/api/documents/{doc_id}/file",
            "word_count": doc["word_count"],
            "char_count": doc["char_count"]
        }

    elif lower.endswith(".docx") and fpath and os.path.exists(fpath):
        try:
            import mammoth
            with open(fpath, "rb") as docx_file:
                conv = mammoth.convert_to_html(docx_file)
                return {
                    "type": "docx",
                    "filename": filename,
                    "title": doc["title"],
                    "html": conv.value,
                    "url": f"/api/documents/{doc_id}/file",
                    "word_count": doc["word_count"],
                    "char_count": doc["char_count"]
                }
        except Exception:
            pass

    return {
        "type": "text",
        "filename": filename,
        "title": doc["title"],
        "text": doc.get("text", ""),
        "url": f"/api/documents/{doc_id}/file",
        "word_count": doc["word_count"],
        "char_count": doc["char_count"]
    }


@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str):
    fpath = find_document_file(doc_id, "")
    if fpath and os.path.exists(fpath):
        try:
            os.remove(fpath)
        except Exception:
            pass
    success = db_delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted successfully", "id": doc_id}


@app.delete("/api/documents")
def clear_all_documents():
    count = db_clear_all_documents()
    return {"message": "All documents removed successfully", "count": count}



@app.post("/api/upload")
async def upload_document(
    file: Optional[UploadFile] = File(None),
    title: Optional[str] = Form(None),
    text_content: Optional[str] = Form(None),
    category: Optional[str] = Form("Uploaded Document")
):
    """
    Handles file upload (PDF, DOCX, TXT) or raw pasted text.
    """
    doc_id = str(uuid.uuid4())[:8]
    raw_text = ""
    filename = "Pasted_Text_Submission.txt"
    file_bytes = b""
    metadata: Dict[str, Any] = {}

    if file:
        filename = file.filename or "uploaded_file.txt"
        file_bytes = await file.read()
        extracted = extract_text_and_metadata(filename, file_bytes)
        raw_text = extracted["text"]
        metadata = extracted["metadata"]
        try:
            save_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{filename}")
            with open(save_path, "wb") as f_out:
                f_out.write(file_bytes)
        except Exception as e:
            print(f"Error saving file: {e}")
    elif text_content:
        raw_text = text_content
        file_bytes = text_content.encode("utf-8")
        metadata = {
            "filename": filename,
            "file_size_bytes": len(file_bytes),
            "pages_or_sections": 1,
            "author": "Manual Entry",
            "created_date": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        try:
            save_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{filename}")
            with open(save_path, "wb") as f_out:
                f_out.write(file_bytes)
        except Exception as e:
            print(f"Error saving text file: {e}")
    else:
        raise HTTPException(status_code=400, detail="Either a file or text_content must be provided.")

    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="Document contains no extractable text.")

    hashes = compute_hashes(file_bytes if file_bytes else raw_text)
    doc_title = title.strip() if title and title.strip() else filename

    # Check for exact duplicate in SQLite database
    duplicate_of = find_duplicate_by_normalized_sha(hashes["normalized_sha256"])

    doc_entry = {
        "id": doc_id,
        "title": doc_title,
        "filename": filename,
        "category": category,
        "description": f"User upload on {time.strftime('%Y-%m-%d %H:%M')}",
        "text": raw_text,
        "file_bytes": file_bytes,
        "metadata": metadata,
        "hashes": hashes,
        "word_count": len(raw_text.split()),
        "char_count": len(raw_text),
        "sentence_count": len(split_into_sentences(raw_text)),
        "is_sample": False,
        "duplicate_of": duplicate_of,
        "uploaded_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }

    save_document(doc_entry)

    return {
        "success": True,
        "document": {
            "id": doc_id,
            "title": doc_title,
            "filename": filename,
            "word_count": doc_entry["word_count"],
            "char_count": doc_entry["char_count"],
            "sentence_count": doc_entry["sentence_count"],
            "duplicate_of": duplicate_of,
            "hashes": hashes
        }
    }


@app.post("/api/compare")
def compare_documents(req: CompareRequest):
    """
    Compares two documents using KMP, Rabin-Karp, Edit Distance (DP), Jaccard, and SHA-256.
    """
    doc_a_name = req.doc_a_name or "Document A (Reference / Original)"
    doc_a_text = ""
    doc_b_name = req.doc_b_name or "Document B (Suspect / Submitted)"
    doc_b_text = ""

    if req.doc_a_id:
        doc_a = db_get_document(req.doc_a_id)
        if not doc_a:
            raise HTTPException(status_code=404, detail="Document A not found")
        doc_a_name = doc_a["title"]
        doc_a_text = doc_a["text"]
    elif req.custom_text_a:
        doc_a_text = req.custom_text_a
        if req.doc_a_name:
            doc_a_name = req.doc_a_name

    if req.doc_b_id:
        doc_b = db_get_document(req.doc_b_id)
        if not doc_b:
            raise HTTPException(status_code=404, detail="Document B not found")
        doc_b_name = doc_b["title"]
        doc_b_text = doc_b["text"]
    elif req.custom_text_b:
        doc_b_text = req.custom_text_b
        if req.doc_b_name:
            doc_b_name = req.doc_b_name

    if not doc_a_text.strip() or not doc_b_text.strip():
        raise HTTPException(status_code=400, detail="Both documents must contain non-empty text.")

    result = compare_two_documents(
        doc_a_name=doc_a_name,
        doc_a_text=doc_a_text,
        doc_b_name=doc_b_name,
        doc_b_text=doc_b_text,
        jaccard_ngram=req.jaccard_ngram,
        edit_mode=req.edit_mode,
        rabin_karp_window=req.rabin_karp_window
    )

    # Record comparison in database
    comp_id = str(uuid.uuid4())[:8]
    record_comparison(
        comp_id=comp_id,
        doc_a_id=req.doc_a_id or "custom_a",
        doc_b_id=req.doc_b_id or "custom_b",
        doc_a_name=doc_a_name,
        doc_b_name=doc_b_name,
        similarity_pct=result.get("composite_similarity_percentage", 0.0),
        classification=result.get("classification", "ANALYSIS"),
        summary={
            "execution_time_ms": result.get("execution_time_ms", 0),
            "sentence_count": len(result.get("sentence_matches", []))
        }
    )

    return result


@app.post("/api/export-inspection-pdf")
def export_inspection_pdf(req: ExportPdfRequest):
    """
    Generates and downloads a PDF report for the Sentence-by-Sentence Plagiarism & Substitution Inspection.
    """
    pdf_bytes = generate_inspection_pdf(
        doc_a_name=req.doc_a_name or "Reference Document",
        doc_b_name=req.doc_b_name or "Submitted Document",
        composite_similarity_percentage=req.composite_similarity_percentage or 0.0,
        classification=req.classification or "ANALYSIS",
        sentence_matches=req.sentence_matches or []
    )

    clean_name = "".join(c for c in (req.doc_b_name or "Inspection") if c.isalnum() or c in ("-", "_")).strip()
    if not clean_name:
        clean_name = "Inspection"
    filename = f"DocuTrace_Plagiarism_Report_{clean_name}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@app.post("/api/verify")
def verify_document(req: VerifyRequest):
    """
    Runs the Authenticity Verification module on a document.
    """
    filename = req.filename or "unknown.pdf"
    doc_title = filename
    if req.doc_id:
        doc = db_get_document(req.doc_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        text = doc["text"]
        filename = doc["filename"]
        doc_title = doc["title"]
        metadata = doc.get("metadata", {})
        file_bytes = doc.get("file_bytes", b"")
    elif req.custom_text:
        text = req.custom_text

    if not text.strip():
        raise HTTPException(status_code=400, detail="Document text is required for verification.")

    result = verify_document_authenticity(
        filename=filename,
        raw_text=text,
        metadata=metadata,
        file_bytes=file_bytes
    )
    result["doc_title"] = doc_title
    result["filename"] = filename
    result["doc_id"] = req.doc_id
    return result


@app.post("/api/benchmark")
def run_performance_benchmarks(req: BenchmarkRequest):
    """
    Generates experimental evaluation and performance comparison table as requested in Section 7.
    Evaluates KMP, Rabin-Karp, Edit Distance (DP), and Jaccard across varied document sizes.
    """
    # Sample vocabulary for synthetic document generation
    vocab = [
        "the", "smart", "campus", "system", "helps", "students", "report", "problems",
        "related", "to", "classroom", "equipment", "internet", "connectivity", "and",
        "cleanliness", "real-time", "dashboard", "administrators", "monitor", "complaints",
        "resolution", "status", "photos", "physical", "locations", "gps", "coordinates",
        "architecture", "centralized", "rest", "api", "automated", "notification",
        "security", "tokens", "access", "control", "turnaround", "testing", "academic"
    ]

    results_table = []

    for size in req.document_sizes:
        # Generate two documents of 'size' words with controlled ~40% overlap
        words_a = [random.choice(vocab) for _ in range(size)]
        words_b = list(words_a)
        # Mutate 40% of words in doc B
        num_mutations = max(1, int(size * 0.4))
        for _ in range(num_mutations):
            idx = random.randint(0, size - 1)
            words_b[idx] = random.choice(vocab) + "_mod"

        text_a = " ".join(words_a)
        text_b = " ".join(words_b)

        # Select a search pattern from text_a (e.g. 4 words)
        pattern_words = words_a[min(2, len(words_a) - 1):min(6, len(words_a))]
        pattern = " ".join(pattern_words) if pattern_words else "smart campus"

        # 1. KMP Benchmark
        kmp_times = []
        kmp_comparisons = 0
        for _ in range(req.iterations_per_size):
            res_kmp = kmp_search(text_a, pattern)
            kmp_times.append(res_kmp["time_ms"])
            kmp_comparisons = res_kmp["comparisons"]
        avg_kmp_time = round(sum(kmp_times) / len(kmp_times), 4)

        # 2. Rabin-Karp Benchmark
        rk_times = []
        rk_hashes = 0
        for _ in range(req.iterations_per_size):
            res_rk = rabin_karp_search(text_a, pattern)
            rk_times.append(res_rk["time_ms"])
            rk_hashes = res_rk["hash_calculations"]
        avg_rk_time = round(sum(rk_times) / len(rk_times), 4)

        # 3. Dynamic Programming Edit Distance Benchmark
        # (For Edit Distance, if size > 150, sample first 120 words to keep O(N*M) response snappy)
        eval_size = min(size, 100)
        sub_a = " ".join(words_a[:eval_size])
        sub_b = " ".join(words_b[:eval_size])

        ed_times = []
        ed_cell_comps = 0
        for _ in range(req.iterations_per_size):
            res_ed = compute_edit_distance(sub_a, sub_b, mode="word", include_full_matrix=False)
            ed_times.append(res_ed["time_ms"])
            ed_cell_comps = res_ed["cell_computations"]
        avg_ed_time = round(sum(ed_times) / len(ed_times), 4)

        # 4. Jaccard Similarity Benchmark
        jac_times = []
        for _ in range(req.iterations_per_size):
            res_jac = compute_jaccard_similarity(text_a, text_b, n_gram=2, mode="word")
            jac_times.append(res_jac["time_ms"])
        avg_jac_time = round(sum(jac_times) / len(jac_times), 4)

        total_similarity_time = round(avg_ed_time + avg_jac_time, 4)

        results_table.append({
            "num_words": size,
            "char_count": len(text_a),
            "kmp_time_ms": avg_kmp_time,
            "kmp_comparisons": kmp_comparisons,
            "rabin_karp_time_ms": avg_rk_time,
            "rabin_karp_hashes": rk_hashes,
            "edit_distance_time_ms": avg_ed_time,
            "edit_distance_cells": ed_cell_comps,
            "jaccard_time_ms": avg_jac_time,
            "total_similarity_time_ms": total_similarity_time,
            "eval_words_for_dp": eval_size
        })

    return {
        "benchmark_summary": "Design and Analysis of Algorithms (DAA) Experimental Evaluation",
        "description": "Comparative runtime analysis of string matching (KMP vs Rabin-Karp) and similarity metrics (Edit Distance vs Jaccard).",
        "results": results_table,
        "theoretical_complexities": {
            "KMP": {"time": "O(N + M)", "space": "O(M)", "description": "Linear time pattern matching via LPS array"},
            "Rabin_Karp": {"time": "Average O(N + M), Worst O(N * M)", "space": "O(1)", "description": "Rolling polynomial hash matching"},
            "Edit_Distance": {"time": "O(N * M)", "space": "O(N * M) or O(min(N,M))", "description": "2D dynamic programming grid"},
            "Jaccard_Similarity": {"time": "O(N + M)", "space": "O(|A| + |B|)", "description": "Set intersection and union on shingles"}
        }
    }


@app.post("/api/algorithm-demo")
def algorithm_demo(req: AlgoDemoRequest):
    """
    Dedicated educational DAA playground endpoint that generates step-by-step
    data structures and matrices for visualization.
    """
    algo = req.algorithm.lower().replace("-", "_")

    if algo == "kmp":
        pattern = req.text2 if req.text2 else req.text1
        text = req.text1
        res = kmp_search(text=text, pattern=pattern, max_trace_steps=100)
        return res

    elif algo in ["rabin_karp", "rk"]:
        pattern = req.text2 if req.text2 else req.text1
        text = req.text1
        res = rabin_karp_search(text=text, pattern=pattern, max_trace_steps=100)
        return res

    elif algo in ["edit_distance", "levenshtein"]:
        mode = req.mode or "char"
        res = compute_edit_distance(
            seq1=req.text1,
            seq2=req.text2 or req.text1,
            mode=mode,
            include_full_matrix=True,
            max_matrix_dim=40
        )
        return res

    elif algo == "jaccard":
        res = compute_jaccard_similarity(
            text1=req.text1,
            text2=req.text2 or "",
            n_gram=req.ngram or 2,
            mode=req.mode or "word"
        )
        return res

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported algorithm '{req.algorithm}'.")


# Mount static files directory for frontend
static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")
