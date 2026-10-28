"""
DocuTrace Database Engine
Persistent SQLite connectivity for enterprise document verification,
cryptographic hash tracking, comparison records, and tamper audit trails.
"""

import os
import json
import sqlite3
import time
from typing import List, Dict, Any, Optional

DB_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(DB_DIR, "docutrace.db")


def get_connection() -> sqlite3.Connection:
    """Creates a thread-safe connection to the SQLite database."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def init_db():
    """Initializes the database schema with required tables and indexes."""
    with get_connection() as conn:
        cursor = conn.cursor()

        # 1. Documents Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                filename TEXT NOT NULL,
                category TEXT,
                description TEXT,
                text TEXT NOT NULL,
                metadata_json TEXT,
                raw_sha256 TEXT NOT NULL,
                normalized_sha256 TEXT NOT NULL,
                simhash TEXT,
                word_count INTEGER DEFAULT 0,
                char_count INTEGER DEFAULT 0,
                sentence_count INTEGER DEFAULT 0,
                is_sample INTEGER DEFAULT 0,
                duplicate_of TEXT,
                uploaded_at TEXT NOT NULL
            );
        """)

        # Indexes for fast duplicate lookups and hash queries
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_doc_normalized_sha ON documents(normalized_sha256);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_doc_raw_sha ON documents(raw_sha256);")

        # 2. Comparisons Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS comparisons (
                id TEXT PRIMARY KEY,
                doc_a_id TEXT,
                doc_b_id TEXT,
                doc_a_name TEXT,
                doc_b_name TEXT,
                similarity_percentage REAL,
                classification TEXT,
                compared_at TEXT NOT NULL,
                summary_json TEXT
            );
        """)

        # 3. Audit Logs Table (Tamper-evident system activity log)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                entity_id TEXT,
                details TEXT,
                timestamp TEXT NOT NULL
            );
        """)

        conn.commit()


def save_document(doc: Dict[str, Any]) -> None:
    """Inserts or updates a document record in the database."""
    metadata_str = json.dumps(doc.get("metadata", {}))
    hashes = doc.get("hashes", {})
    raw_sha = hashes.get("raw_sha256", "")
    norm_sha = hashes.get("normalized_sha256", "")
    simhash = hashes.get("simhash", "")

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO documents (
                id, title, filename, category, description, text, metadata_json,
                raw_sha256, normalized_sha256, simhash, word_count, char_count,
                sentence_count, is_sample, duplicate_of, uploaded_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            doc["id"],
            doc.get("title", doc.get("filename", "Untitled")),
            doc.get("filename", "document.txt"),
            doc.get("category", "Uploaded Document"),
            doc.get("description", ""),
            doc.get("text", ""),
            metadata_str,
            raw_sha,
            norm_sha,
            simhash,
            doc.get("word_count", len(doc.get("text", "").split())),
            doc.get("char_count", len(doc.get("text", ""))),
            doc.get("sentence_count", 0),
            1 if doc.get("is_sample") else 0,
            doc.get("duplicate_of"),
            doc.get("uploaded_at", time.strftime("%Y-%m-%d %H:%M:%S"))
        ))

        # Log audit trail
        cursor.execute("""
            INSERT INTO audit_logs (event_type, entity_id, details, timestamp)
            VALUES (?, ?, ?, ?)
        """, (
            "DOCUMENT_REGISTERED",
            doc["id"],
            f"Stored '{doc.get('title')}' ({doc.get('word_count')} words, SHA-256: {norm_sha[:12]}...)",
            time.strftime("%Y-%m-%d %H:%M:%S")
        ))
        conn.commit()


def get_document(doc_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a single document by its ID."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
        row = cursor.fetchone()
        if not row:
            return None

        metadata = {}
        if row["metadata_json"]:
            try:
                metadata = json.loads(row["metadata_json"])
            except Exception:
                metadata = {}

        return {
            "id": row["id"],
            "title": row["title"],
            "filename": row["filename"],
            "category": row["category"],
            "description": row["description"],
            "text": row["text"],
            "metadata": metadata,
            "hashes": {
                "raw_sha256": row["raw_sha256"],
                "normalized_sha256": row["normalized_sha256"],
                "simhash": row["simhash"]
            },
            "word_count": row["word_count"],
            "char_count": row["char_count"],
            "sentence_count": row["sentence_count"],
            "is_sample": bool(row["is_sample"]),
            "duplicate_of": row["duplicate_of"],
            "uploaded_at": row["uploaded_at"]
        }


def list_documents() -> List[Dict[str, Any]]:
    """Returns a list of all documents in the corpus."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM documents ORDER BY uploaded_at DESC")
        rows = cursor.fetchall()

        result = []
        for row in rows:
            result.append({
                "id": row["id"],
                "title": row["title"],
                "filename": row["filename"],
                "category": row["category"],
                "word_count": row["word_count"],
                "char_count": row["char_count"],
                "sentence_count": row["sentence_count"],
                "is_sample": bool(row["is_sample"]),
                "raw_sha256": (row["raw_sha256"][:12] + "...") if row["raw_sha256"] else "",
                "normalized_sha256": row["normalized_sha256"],
                "duplicate_of": row["duplicate_of"],
                "uploaded_at": row["uploaded_at"]
            })
        return result


def find_duplicate_by_normalized_sha(normalized_sha: str) -> Optional[str]:
    """Finds existing document ID that shares the exact same normalized SHA-256."""
    if not normalized_sha:
        return None
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM documents WHERE normalized_sha256 = ? LIMIT 1", (normalized_sha,))
        row = cursor.fetchone()
        return row["id"] if row else None


def delete_document(doc_id: str) -> bool:
    """Deletes a document from the database."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM comparisons WHERE doc_a_id = ? OR doc_b_id = ?", (doc_id, doc_id))
        cursor.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
        deleted = cursor.rowcount > 0
        if deleted:
            cursor.execute("""
                INSERT INTO audit_logs (event_type, entity_id, details, timestamp)
                VALUES (?, ?, ?, ?)
            """, ("DOCUMENT_DELETED", doc_id, f"Document {doc_id} deleted by user", time.strftime("%Y-%m-%d %H:%M:%S")))
        conn.commit()
        return deleted



def clear_all_documents() -> int:
    """Deletes all documents from the database."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS cnt FROM documents")
        count = cursor.fetchone()["cnt"]
        cursor.execute("DELETE FROM documents")
        cursor.execute("""
            INSERT INTO audit_logs (event_type, entity_id, details, timestamp)
            VALUES (?, ?, ?, ?)
        """, ("DATABASE_CLEARED", "ALL", f"Cleared {count} documents", time.strftime("%Y-%m-%d %H:%M:%S")))
        conn.commit()
        return count


def record_comparison(comp_id: str, doc_a_id: str, doc_b_id: str, doc_a_name: str, doc_b_name: str, similarity_pct: float, classification: str, summary: Dict[str, Any]) -> None:
    """Saves a comparison execution result in the comparisons table."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO comparisons (
                id, doc_a_id, doc_b_id, doc_a_name, doc_b_name,
                similarity_percentage, classification, compared_at, summary_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            comp_id,
            doc_a_id,
            doc_b_id,
            doc_a_name,
            doc_b_name,
            similarity_pct,
            classification,
            time.strftime("%Y-%m-%d %H:%M:%S"),
            json.dumps(summary)
        ))
        conn.commit()


def get_db_stats() -> Dict[str, Any]:
    """Returns status metrics about the database connection and storage."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS total_docs FROM documents")
        total_docs = cursor.fetchone()["total_docs"]

        cursor.execute("SELECT COUNT(*) AS total_comparisons FROM comparisons")
        total_comparisons = cursor.fetchone()["total_comparisons"]

        cursor.execute("SELECT COUNT(*) AS total_audits FROM audit_logs")
        total_audits = cursor.fetchone()["total_audits"]

        file_size_kb = 0
        if os.path.exists(DB_PATH):
            file_size_kb = round(os.path.getsize(DB_PATH) / 1024, 1)

        return {
            "status": "connected",
            "engine": "SQLite 3",
            "database_file": os.path.basename(DB_PATH),
            "database_path": DB_PATH,
            "file_size_kb": file_size_kb,
            "total_documents": total_docs,
            "total_comparisons": total_comparisons,
            "total_audit_events": total_audits
        }
