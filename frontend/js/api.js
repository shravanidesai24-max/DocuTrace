/**
 * DocuTrace Frontend API Service
 * Subject: Design and Analysis of Algorithms (DAA)
 */

const API_BASE = window.location.origin;

const api = {
  async getHealth() {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      return await res.json();
    } catch (err) {
      console.error("Health check error:", err);
      return { status: "offline", error: err.message };
    }
  },

  async getDocuments() {
    const res = await fetch(`${API_BASE}/api/documents`);
    if (!res.ok) throw new Error("Failed to fetch documents corpus.");
    return await res.json();
  },

  async getDocument(docId) {
    const res = await fetch(`${API_BASE}/api/documents/${docId}`);
    if (!res.ok) throw new Error("Document not found.");
    return await res.json();
  },

  async getDocumentPreview(docId) {
    const res = await fetch(`${API_BASE}/api/documents/${docId}/preview`);
    if (!res.ok) throw new Error("Failed to load document preview.");
    return await res.json();
  },


  async deleteDocument(docId) {
    const res = await fetch(`${API_BASE}/api/documents/${docId}`, {
      method: "DELETE"
    });
    if (!res.ok) throw new Error("Failed to delete document.");
    return await res.json();
  },

  async clearAllDocuments() {
    const res = await fetch(`${API_BASE}/api/documents`, {
      method: "DELETE"
    });
    if (!res.ok) throw new Error("Failed to clear documents repository.");
    return await res.json();
  },

  async uploadDocument({ file, title, textContent, category }) {
    const formData = new FormData();
    if (file) formData.append("file", file);
    if (title) formData.append("title", title);
    if (textContent) formData.append("text_content", textContent);
    if (category) formData.append("category", category);

    const res = await fetch(`${API_BASE}/api/upload`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Upload failed.");
    }
    return await res.json();
  },

  async compareDocuments({ docAId, docBId, customTextA, customTextB, docAName, docBName, jaccardNgram, editMode, rkWindow }) {
    const payload = {
      doc_a_id: docAId || null,
      doc_b_id: docBId || null,
      custom_text_a: customTextA || null,
      custom_text_b: customTextB || null,
      doc_a_name: docAName || null,
      doc_b_name: docBName || null,
      jaccard_ngram: parseInt(jaccardNgram || 2),
      edit_mode: editMode || "word",
      rabin_karp_window: parseInt(rkWindow || 4)
    };

    const res = await fetch(`${API_BASE}/api/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Comparison failed.");
    }
    return await res.json();
  },

  async verifyDocument({ docId, customText, filename, metadata }) {
    const payload = {
      doc_id: docId || null,
      custom_text: customText || null,
      filename: filename || "custom_document.pdf",
      metadata: metadata || null
    };

    const res = await fetch(`${API_BASE}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Verification failed.");
    }
    return await res.json();
  },

  async runBenchmark({ documentSizes = [10, 50, 100, 250, 500], iterations = 3 } = {}) {
    const res = await fetch(`${API_BASE}/api/benchmark`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_sizes: documentSizes,
        iterations_per_size: iterations
      })
    });

    if (!res.ok) throw new Error("Benchmark suite execution failed.");
    return await res.json();
  },

  async exportInspectionPdf(payload) {
    const res = await fetch(`${API_BASE}/api/export-inspection-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Failed to generate PDF inspection report.");
    }
    return await res.blob();
  },

  async runAlgoDemo({ algorithm, text1, text2, ngram = 2, mode = "word" }) {
    const res = await fetch(`${API_BASE}/api/algorithm-demo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        algorithm,
        text1,
        text2,
        ngram,
        mode
      })
    });

    if (!res.ok) throw new Error("Algorithm demo execution failed.");
    return await res.json();
  }
};
