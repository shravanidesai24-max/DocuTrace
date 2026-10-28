/**
 * DocuTrace — Main Frontend Application Controller
 * Subject: Design and Analysis of Algorithms (DAA)
 */

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
  window.app = app;
  window.loadAndRunScenario = (scenarioKey) => app.loadAndRunScenario(scenarioKey);
  app.init();
});


const app = {
  activeTab: "dashboard",
  documents: [],
  selectedFile: null,
  activeVizAlgo: "kmp",

  init() {
    this.setupNavigation();
    this.setupFileUpload();
    this.setupEventListeners();
    visualizer.init("viz-workspace-container");
    this.loadInitialData();
  },

  showToast(message, type = "info") {
    const existing = document.querySelector(".toast-notification");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
      <svg style="width:20px; height:20px; color:${type === 'error' ? 'var(--rose)' : 'var(--emerald)'};" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  setupNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => {
      item.addEventListener("click", () => {
        const tab = item.getAttribute("data-tab");
        this.switchTab(tab);
      });
    });
  },

  switchTab(tabId) {
    this.activeTab = tabId;

    // Update active nav button
    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
    });

    // Update visible panel
    document.querySelectorAll(".tab-panel").forEach(panel => {
      panel.classList.toggle("active", panel.id === `panel-${tabId}`);
    });

    // Update page heading
    const titles = {
      dashboard: { title: "System Overview & Dashboard", sub: "Intelligent multi-layer verification and similarity analysis platform" },
      upload: { title: "Document Upload & Corpus Manager", sub: "Upload PDF, Word, and text documents into system corpus" },
      compare: { title: "Plagiarism Comparison & Diff Analysis", sub: "Multi-layer text matching and sentence-by-sentence diff analysis" },
      verify: { title: "Document Authenticity & Integrity Audit", sub: "Dedicated authenticity analysis for certificates, signatures, and timestamps" },
      benchmark: { title: "Performance Benchmark Laboratory", sub: "Comparative processing speed and runtime analysis across document sizes" },
      visualizer: { title: "Interactive Analysis Visualizer", sub: "Inspect phrase search tables, dynamic alignment matrices, window slides, and vocabulary overlap" }
    };

    const heading = titles[tabId] || titles.dashboard;
    document.getElementById("page-heading").textContent = heading.title;
    document.getElementById("page-subheading").textContent = heading.sub;

    if (tabId === "visualizer") {
      this.runVisualizerStep();
    }
  },

  async loadInitialData() {
    try {
      const health = await api.getHealth();
      await this.refreshDocumentsList();

      // Run initial visualizer preview
      this.runVisualizerStep();
    } catch (err) {
      console.error("Initialization error:", err);
      this.showToast("Could not connect to backend server.", "error");
    }
  },

  async refreshDocumentsList() {
    try {
      const docs = await api.getDocuments();
      this.documents = docs;

      // Update Dashboard Counters
      document.getElementById("stat-total-docs").textContent = docs.length;
      const dupCount = docs.filter(d => d.duplicate_of || d.title.includes("Duplicate")).length;
      document.getElementById("stat-exact-dups").textContent = dupCount;

      // Populate Corpus Table
      const tbody = document.getElementById("corpus-tbody");
      if (tbody) {
        if (docs.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td colspan="5" style="text-align:center; padding:2.5rem; color:var(--text-muted); font-size:0.92rem;">
                <div style="font-weight:600; margin-bottom:0.25rem;">No documents in the repository</div>
                <div style="font-size:0.82rem;">Upload PDF, DOCX, or text documents from the <strong>Document Upload</strong> tab to start analysis.</div>
              </td>
            </tr>
          `;
        } else {
          tbody.innerHTML = docs.map(d => {
            const safeTitle = (d.title || d.filename || 'Untitled').replace(/'/g, "\\'");
            return `
            <tr>
              <td>
                <div class="table-doc-title">${escapeHtml(d.title)}</div>
                <div class="table-doc-filename">${escapeHtml(d.filename)}</div>
              </td>
              <td><span class="scenario-badge badge-indigo">${escapeHtml(d.category || 'General')}</span></td>
              <td>${d.word_count} words</td>
              <td><code class="hash-code">${d.raw_sha256}</code></td>
              <td>
                <div style="display:flex; gap:0.4rem; flex-wrap:wrap; align-items:center;">
                  <button class="btn btn-sm btn-doc-action btn-view" onclick="app.viewCompleteDocument('${d.id}')" title="View complete document text and metadata">
                    <svg class="btn-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    View
                  </button>
                  <button class="btn btn-sm btn-secondary" onclick="app.loadForCompare('${d.id}')" title="Compare this document">Compare</button>
                  <button class="btn btn-sm btn-secondary" onclick="app.loadForVerify('${d.id}')" title="Verify authenticity">Verify</button>
                  <button class="btn btn-sm btn-doc-action btn-delete" onclick="app.confirmDeleteDocument('${d.id}', '${safeTitle}')" title="Delete document from corpus">
                    <svg class="btn-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          `;
          }).join("");
        }

      }

      // Populate Comparison Dropdowns
      const selectA = document.getElementById("select-doc-a");
      const selectB = document.getElementById("select-doc-b");
      const selectVerify = document.getElementById("select-verify-doc");

      const optionsHtml = docs.length === 0
        ? `<option value="">-- No documents uploaded yet --</option>`
        : docs.map(d => `<option value="${d.id}">${d.title} (${d.filename})</option>`).join("");

      if (selectA) selectA.innerHTML = optionsHtml;
      if (selectB) selectB.innerHTML = optionsHtml;
      if (selectVerify) selectVerify.innerHTML = optionsHtml;

      // Dynamically select target documents (Original: Research_Paper_01, Suspect: Research_Paper_02)
      const { docA, docB } = this.getScenarioDocs();
      if (docA && selectA) selectA.value = docA.id;
      if (docB && selectB) selectB.value = docB.id;
      if (docB && selectVerify) selectVerify.value = docB.id;

      // Update Dashboard scenario cards to show current uploaded documents
      this.updateScenarioCardsUI();

    } catch (err) {
      console.error("Error fetching documents:", err);
    }
  },

  getScenarioDocs() {
    if (!this.documents || this.documents.length === 0) {
      return {
        docA: { id: null, title: "Research_Paper_01", filename: "Research_Paper1.docx" },
        docB: { id: null, title: "Research_Paper_02", filename: "Research_Paper2.docx" }
      };
    }
    // Search for Doc A (Original / Reference): look for "1" or "01" in title or filename
    let docA = this.documents.find(d => /(_01|paper1|paper_1|01)/i.test(d.title || d.filename)) || this.documents[0];

    // Search for Doc B (Suspect / Submitted): look for "2" or "02" in title or filename (different from docA)
    let docB = this.documents.find(d => d.id !== docA.id && /(_02|paper2|paper_2|02)/i.test(d.title || d.filename));
    if (!docB) {
      docB = this.documents.find(d => d.id !== docA.id) || this.documents[0];
    }

    return { docA, docB };
  },

  updateScenarioCardsUI() {
    const { docA, docB } = this.getScenarioDocs();
    const titleA = docA?.title || "Research_Paper_01";
    const titleB = docB?.title || "Research_Paper_02";

    const idsA = ["sc1-doc-a", "sc2-doc-a", "sc4-doc-a"];
    const idsB = ["sc1-doc-b", "sc2-doc-b", "sc3-doc-b", "sc4-doc-b"];

    idsA.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = titleA;
    });

    idsB.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = titleB;
    });
  },

  setupFileUpload() {
    const dropZone = document.getElementById("file-drop-zone");
    const fileInput = document.getElementById("file-input");
    const fileBadge = document.getElementById("selected-file-display");
    const textarea = document.getElementById("upload-doc-text");
    const charCounter = document.getElementById("char-counter");
    const wordCounter = document.getElementById("word-counter");

    if (dropZone && fileInput) {
      dropZone.addEventListener("click", () => fileInput.click());

      dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
      });

      dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
      });

      dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.handleFileSelected(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files[0]) {
          this.handleFileSelected(e.target.files[0]);
        }
      });
    }

    if (textarea) {
      textarea.addEventListener("input", () => {
        const text = textarea.value;
        charCounter.textContent = `${text.length} characters`;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        wordCounter.textContent = `${words} words`;
      });
    }
  },

  handleFileSelected(file) {
    this.selectedFile = file;
    const badge = document.getElementById("selected-file-display");
    badge.style.display = "inline-block";
    badge.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    
    const titleInput = document.getElementById("upload-doc-title");
    if (titleInput && !titleInput.value) {
      titleInput.value = file.name.replace(/\.[^/.]+$/, "");
    }
  },

  setupEventListeners() {
    // Upload header button
    document.getElementById("btn-header-upload")?.addEventListener("click", () => {
      this.switchTab("upload");
    });

    // Submit upload form
    document.getElementById("btn-submit-upload")?.addEventListener("click", async () => {
      await this.executeUpload();
    });

    // Clear upload form
    document.getElementById("btn-clear-upload")?.addEventListener("click", () => {
      this.clearUploadForm();
    });

    // Refresh corpus
    document.getElementById("btn-refresh-corpus")?.addEventListener("click", () => {
      this.refreshDocumentsList();
    });

    // Swap documents in comparison
    document.getElementById("btn-swap-docs")?.addEventListener("click", () => {
      const selectA = document.getElementById("select-doc-a");
      const selectB = document.getElementById("select-doc-b");
      if (selectA && selectB) {
        const temp = selectA.value;
        selectA.value = selectB.value;
        selectB.value = temp;
      }
    });

    // Trigger comparison button
    document.getElementById("btn-trigger-compare")?.addEventListener("click", async () => {
      await this.executeComparison();
    });

    // View switcher: PDF Format vs Text Cards
    document.getElementById("btn-view-pdf")?.addEventListener("click", () => {
      this.switchInspectionView("pdf");
    });
    document.getElementById("btn-view-text")?.addEventListener("click", () => {
      this.switchInspectionView("text");
    });

    // Open PDF Fullscreen in New Tab
    document.getElementById("btn-open-pdf-tab")?.addEventListener("click", () => {
      if (this.currentPdfBlobUrl) {
        window.open(this.currentPdfBlobUrl, "_blank");
      } else {
        this.showToast("Inspection PDF preview is not ready yet.", "info");
      }
    });

    // Export PDF Report button
    document.getElementById("btn-export-pdf")?.addEventListener("click", async () => {
      await this.exportInspectionToPdf();
    });

    // Run verification button
    document.getElementById("btn-run-verification")?.addEventListener("click", async () => {
      await this.executeVerification();
    });

    // Benchmark Suite execution
    document.getElementById("btn-run-benchmark")?.addEventListener("click", async () => {
      await this.executeBenchmark();
    });

    // Visualizer Algorithm sub-tabs
    document.querySelectorAll(".viz-tab").forEach(tabBtn => {
      tabBtn.addEventListener("click", () => {
        document.querySelectorAll(".viz-tab").forEach(b => b.classList.remove("active"));
        tabBtn.classList.add("active");
        this.activeVizAlgo = tabBtn.getAttribute("data-algo");

        // Update labels based on chosen algorithm
        const labelText2 = document.getElementById("viz-label-text2");
        const groupText2 = document.getElementById("viz-group-text2");
        const input2 = document.getElementById("viz-input-text2");

        if (this.activeVizAlgo === "kmp" || this.activeVizAlgo === "rabin_karp") {
          groupText2.style.display = "flex";
          labelText2.textContent = "Search Pattern";
          input2.value = "Campus System";
        } else if (this.activeVizAlgo === "edit_distance") {
          groupText2.style.display = "flex";
          labelText2.textContent = "Target Sequence";
          input2.value = "The Smart Campus Portal helps students report issues";
        } else if (this.activeVizAlgo === "jaccard") {
          groupText2.style.display = "flex";
          labelText2.textContent = "Document B Text";
          input2.value = "Smart Campus platform assists students to log complaints and issues";
        }

        this.runVisualizerStep();
      });
    });

    document.getElementById("btn-run-viz-step")?.addEventListener("click", () => {
      this.runVisualizerStep();
    });

    // Real-Life DAA Test Scenario Cards Click Handlers
    const scenarioKeys = ["smart_campus", "duplicate", "certificate", "distinct"];
    scenarioKeys.forEach((key, index) => {
      const card = document.getElementById(`card-scenario-${index + 1}`);
      if (card) {
        card.style.cursor = "pointer";
        card.addEventListener("click", (e) => {
          if (e.target.closest(".btn-scenario")) return; // Button already has onclick
          this.loadAndRunScenario(key);
        });
      }
    });
  },

  clearUploadForm() {
    this.selectedFile = null;
    document.getElementById("file-input").value = "";
    document.getElementById("selected-file-display").style.display = "none";
    document.getElementById("upload-doc-title").value = "";
    document.getElementById("upload-doc-text").value = "";
    document.getElementById("char-counter").textContent = "0 characters";
    document.getElementById("word-counter").textContent = "0 words";
  },

  async executeUpload() {
    const title = document.getElementById("upload-doc-title").value;
    const category = document.getElementById("upload-doc-category").value;
    const textContent = document.getElementById("upload-doc-text").value;

    if (!this.selectedFile && !textContent.trim()) {
      this.showToast("Please select a file or paste text content.", "error");
      return;
    }

    try {
      this.showToast("Extracting text and computing cryptographic hashes...", "info");
      const res = await api.uploadDocument({
        file: this.selectedFile,
        title,
        textContent,
        category
      });

      if (res.success) {
        this.showToast(`Document "${res.document.title}" added to corpus!`, "success");
        this.clearUploadForm();
        await this.refreshDocumentsList();
        this.loadForCompare(res.document.id);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      this.showToast(err.message, "error");
    }
  },

  loadForCompare(docId) {
    this.switchTab("compare");
    const selectB = document.getElementById("select-doc-b");
    if (selectB) {
      selectB.value = docId;
    }
  },

  loadForVerify(docId) {
    this.switchTab("verify");
    const selectVerify = document.getElementById("select-verify-doc");
    if (selectVerify) {
      selectVerify.value = docId;
      this.executeVerification();
    }
  },

  async viewCompleteDocument(docId) {
    this.closeDocViewerModal();
    this.closeDeleteModal();

    try {
      this.showToast("Loading original document...", "info");
      const [doc, preview] = await Promise.all([
        api.getDocument(docId),
        api.getDocumentPreview(docId).catch(() => ({ type: "text", text: "" }))
      ]);

      if (!doc) throw new Error("Document could not be retrieved.");

      const modal = document.createElement("div");
      modal.id = "doc-viewer-modal";
      modal.className = "doc-modal-overlay";

      const rawHash = doc.hashes?.raw_sha256 || doc.raw_sha256 || "N/A";
      const normHash = doc.hashes?.normalized_sha256 || doc.normalized_sha256 || "N/A";
      const fileUrl = `/api/documents/${doc.id}/file`;
      const isDocx = (doc.filename || "").toLowerCase().endsWith(".docx");
      const isPdf = (doc.filename || "").toLowerCase().endsWith(".pdf");

      let originalContentHtml = "";
      if (preview.type === "pdf" || isPdf) {
        originalContentHtml = `
          <div style="background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid var(--border-light); box-shadow:var(--shadow-sm);">
            <iframe src="${fileUrl}" class="doc-orig-iframe"></iframe>
          </div>
        `;
      } else if (preview.type === "docx" && preview.html) {
        originalContentHtml = `
          <div class="doc-orig-wrapper">
            <div class="doc-word-sheet">
              ${preview.html}
            </div>
          </div>
        `;
      } else {
        originalContentHtml = `
          <div class="doc-orig-wrapper">
            <div class="doc-word-sheet">
              <pre style="white-space:pre-wrap; font-family:var(--font-sans); font-size:0.95rem; line-height:1.7;">${escapeHtml(doc.text || "(Document text is empty)")}</pre>
            </div>
          </div>
        `;
      }

      modal.innerHTML = `
        <div class="doc-viewer-box">
          <div class="doc-modal-header">
            <div class="doc-modal-title-wrap">
              <div class="doc-modal-title">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--primary);"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                ${escapeHtml(doc.title || doc.filename)}
              </div>
              <div class="doc-modal-subtitle">
                <span class="scenario-badge badge-indigo">${escapeHtml(doc.category || 'General')}</span>
                <span>📄 ${escapeHtml(doc.filename)}</span>
                <span>🕒 Uploaded: ${doc.uploaded_at || 'Recently'}</span>
                <span>📊 ${doc.word_count || 0} words</span>
              </div>
            </div>

            <div style="display:flex; align-items:center; gap:0.5rem;">
              <a href="${fileUrl}?download=true" class="btn btn-sm btn-primary" title="Download original file" download>
                <svg class="btn-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download Original
              </a>
              <a href="${fileUrl}" target="_blank" class="btn btn-sm btn-secondary" title="Open original in browser tab">
                <svg class="btn-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Open in Tab
              </a>
              <button class="doc-modal-close-btn" onclick="app.closeDocViewerModal()" title="Close">&times;</button>
            </div>
          </div>

          <div class="doc-viewer-body">
            <!-- View Mode Tabs -->
            <div class="doc-view-nav">
              <button class="doc-view-tab-btn active" id="tab-btn-orig" onclick="app.switchDocViewTab('orig')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Original Document
              </button>
              <button class="doc-view-tab-btn" id="tab-btn-text" onclick="app.switchDocViewTab('text')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
                Extracted Text
              </button>
              <button class="doc-view-tab-btn" id="tab-btn-meta" onclick="app.switchDocViewTab('meta')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Hashes &amp; Metadata
              </button>
            </div>

            <!-- Panel 1: Original Document (Active by Default) -->
            <div id="doc-view-panel-orig">
              ${originalContentHtml}
            </div>

            <!-- Panel 2: Extracted Text -->
            <div id="doc-view-panel-text" style="display:none;">
              <div class="doc-text-card">
                <div class="doc-text-toolbar">
                  <div style="display:flex; align-items:center; gap:0.5rem;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--primary);"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    <span>Extracted Plain Text</span>
                    <span style="font-weight:500; font-size:0.75rem; color:var(--text-muted);">(${doc.text ? doc.text.length : 0} characters)</span>
                  </div>
                  <button class="doc-copy-btn" id="btn-copy-doc-text" onclick="app.copyFullDocumentText('${doc.id}')">
                    <svg class="btn-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy Plain Text
                  </button>
                </div>
                <div class="doc-text-content" id="doc-full-text-content">${escapeHtml(doc.text || "(This document contains no text)")}</div>
              </div>
            </div>

            <!-- Panel 3: Hashes & Metadata -->
            <div id="doc-view-panel-meta" style="display:none;">
              <!-- Stats Grid -->
              <div class="doc-meta-pills-grid" style="margin-bottom:1rem;">
                <div class="doc-meta-pill-card">
                  <span class="doc-meta-pill-label">Word Count</span>
                  <span class="doc-meta-pill-val">${doc.word_count || (doc.text ? doc.text.trim().split(/\\s+/).length : 0)} words</span>
                </div>
                <div class="doc-meta-pill-card">
                  <span class="doc-meta-pill-label">Character Count</span>
                  <span class="doc-meta-pill-val">${doc.char_count || (doc.text ? doc.text.length : 0)} chars</span>
                </div>
                <div class="doc-meta-pill-card">
                  <span class="doc-meta-pill-label">Sentence Count</span>
                  <span class="doc-meta-pill-val">${doc.sentence_count || 'Analyzed'}</span>
                </div>
                <div class="doc-meta-pill-card">
                  <span class="doc-meta-pill-label">System Doc ID</span>
                  <span class="doc-meta-pill-val" style="font-family:var(--font-mono); font-size:0.85rem;">${doc.id}</span>
                </div>
              </div>

              <!-- Cryptographic Fingerprints -->
              <div class="doc-hash-strip">
                <div class="doc-hash-line">
                  <span class="doc-hash-label">Raw SHA-256 Digest:</span>
                  <code class="doc-hash-val">${rawHash}</code>
                  <button class="doc-copy-btn" onclick="app.copyToClipboard('${rawHash}', this)">Copy Hash</button>
                </div>
                <div class="doc-hash-line">
                  <span class="doc-hash-label">Normalized SHA-256:</span>
                  <code class="doc-hash-val">${normHash}</code>
                  <button class="doc-copy-btn" onclick="app.copyToClipboard('${normHash}', this)">Copy Hash</button>
                </div>
              </div>
            </div>
          </div>

          <div class="doc-modal-footer">
            <button class="btn btn-secondary" onclick="app.closeDocViewerModal()">Close</button>
            <button class="btn btn-secondary" onclick="app.closeDocViewerModal(); app.loadForCompare('${doc.id}')">Compare Document →</button>
            <button class="btn btn-primary" onclick="app.closeDocViewerModal(); app.loadForVerify('${doc.id}')">Run Authenticity Audit →</button>
          </div>
        </div>
      `;

      modal.addEventListener("click", (e) => {
        if (e.target === modal) this.closeDocViewerModal();
      });

      document.body.appendChild(modal);
      this._viewedDocText = doc.text || "";

    } catch (err) {
      console.error("View document error:", err);
      this.showToast(err.message || "Could not view document", "error");
    }
  },

  switchDocViewTab(tabKey) {
    document.querySelectorAll(".doc-view-tab-btn").forEach(b => b.classList.remove("active"));
    const btn = document.getElementById(`tab-btn-${tabKey}`);
    if (btn) btn.classList.add("active");

    const panels = {
      orig: document.getElementById("doc-view-panel-orig"),
      text: document.getElementById("doc-view-panel-text"),
      meta: document.getElementById("doc-view-panel-meta")
    };
    Object.keys(panels).forEach(k => {
      if (panels[k]) panels[k].style.display = (k === tabKey) ? "block" : "none";
    });
  },


  closeDocViewerModal() {
    const existing = document.getElementById("doc-viewer-modal");
    if (existing) existing.remove();
  },

  copyFullDocumentText(docId) {
    if (this._viewedDocText) {
      navigator.clipboard.writeText(this._viewedDocText).then(() => {
        this.showToast("Complete document text copied to clipboard!", "success");
        const btn = document.getElementById("btn-copy-doc-text");
        if (btn) {
          const oldHtml = btn.innerHTML;
          btn.innerHTML = `✓ Copied!`;
          setTimeout(() => { btn.innerHTML = oldHtml; }, 2000);
        }
      }).catch(err => {
        console.error("Clipboard copy failed:", err);
        this.showToast("Could not copy to clipboard", "error");
      });
    }
  },

  copyToClipboard(text, btnEl) {
    navigator.clipboard.writeText(text).then(() => {
      this.showToast("Copied to clipboard!", "success");
      if (btnEl) {
        const oldText = btnEl.textContent;
        btnEl.textContent = "✓ Copied!";
        setTimeout(() => { btnEl.textContent = oldText; }, 1500);
      }
    }).catch(err => {
      this.showToast("Failed to copy", "error");
    });
  },

  confirmDeleteDocument(docId, docTitle) {
    this.closeDeleteModal();
    this.closeDocViewerModal();

    const modal = document.createElement("div");
    modal.id = "doc-delete-modal";
    modal.className = "doc-modal-overlay";
    modal.innerHTML = `
      <div class="doc-delete-box">
        <div class="doc-delete-icon-wrapper">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </div>
        <h3 class="doc-delete-title">Delete Document?</h3>
        <p class="doc-delete-msg">
          Are you sure you want to permanently delete <span class="doc-delete-highlight">${escapeHtml(docTitle)}</span> from the document repository?
          <br><br>
          <small style="color:var(--text-light);">This will remove its extracted text, cryptographic hashes, and associated comparison records from the system database.</small>
        </p>
        <div class="doc-delete-actions">
          <button class="btn btn-secondary" onclick="app.closeDeleteModal()">Cancel</button>
          <button class="btn btn-danger" id="btn-confirm-delete" onclick="app.executeDeleteDocument('${docId}', '${docTitle.replace(/'/g, "\\'")}')">
            <svg class="btn-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Delete Document
          </button>
        </div>
      </div>
    `;

    modal.addEventListener("click", (e) => {
      if (e.target === modal) this.closeDeleteModal();
    });

    document.body.appendChild(modal);
  },

  closeDeleteModal() {
    const existing = document.getElementById("doc-delete-modal");
    if (existing) existing.remove();
  },

  async executeDeleteDocument(docId, docTitle) {
    const btn = document.getElementById("btn-confirm-delete");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Deleting...";
    }

    try {
      await api.deleteDocument(docId);
      this.closeDeleteModal();
      this.showToast(`Document "${docTitle || docId}" deleted successfully.`, "success");
      await this.refreshDocumentsList();
    } catch (err) {
      console.error("Delete failed:", err);
      this.showToast(err.message || "Failed to delete document", "error");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Delete Document";
      }
    }
  },


  // =====================================================================
  // SCENARIO DATA — Rich real-world academic documents for each scenario
  // =====================================================================
  SCENARIO_DATA: {
    smart_campus: {
      docA: {
        title: "Smart Campus System — Original Reference Report",
        text: `The Smart Campus System is an innovative solution designed to help students report problems related to classroom equipment, internet connectivity, and campus cleanliness. Students can submit complaints through a centralized web dashboard, which allows administrators to monitor the status of each issue in real-time. The platform supports uploading photos and specifying physical locations using GPS coordinates. A centralized REST API processes all submissions and sends automated notifications to the responsible department. The system uses token-based security to ensure that only authorized users can submit or view sensitive complaint data. Turnaround time for issue resolution has significantly improved since the platform was deployed in the institution. The system was tested extensively using automated scripts and achieved a 99.7% uptime during the academic semester.`
      },
      docB: {
        title: "Smart Campus System — Suspect Paraphrased Submission",
        text: `The Smart Campus Portal is an advanced tool designed to assist students in logging issues related to lecture hall equipment, network connectivity, and the cleanliness of campus facilities. Students can file complaints through a unified web interface, which enables administrators to track the progress of each problem in real-time. The application supports attaching images and indicating exact physical positions using GPS data. A unified REST API handles all submissions and dispatches automated alerts to the relevant department. The platform employs token-based authentication to verify that only registered users can create or access sensitive complaint records. Resolution turnaround time for problems has greatly improved since the portal was introduced in the university. The system underwent thorough testing using automated frameworks and maintained a 99.7% availability throughout the academic year.`
      }
    },
    duplicate: {
      docA: {
        title: "Network Lab Report — Original Reference (Student A)",
        text: `This experiment analyzes the performance of TCP and UDP protocols in a simulated local area network environment. The objective was to measure packet loss, latency, and throughput under varying levels of network congestion. We used the Wireshark tool to capture and analyze network packets in real-time. The experimental setup included three client machines and one server connected via a 100Mbps Ethernet switch. Results showed that UDP achieved higher throughput but suffered significant packet loss at 80% network load, while TCP maintained reliable delivery using its sliding window congestion control mechanism. The experiment concluded that protocol selection must be aligned with application requirements: real-time streaming favors UDP while file transfer applications require TCP reliability guarantees.`
      },
      docB: {
        title: "Assignment_Final_v3.txt — Suspect Resubmission (Student B)",
        text: `This experiment analyzes the performance of TCP and UDP protocols in a simulated local area network environment. The objective was to measure packet loss, latency, and throughput under varying levels of network congestion. We used the Wireshark tool to capture and analyze network packets in real-time. The experimental setup included three client machines and one server connected via a 100Mbps Ethernet switch. Results showed that UDP achieved higher throughput but suffered significant packet loss at 80% network load, while TCP maintained reliable delivery using its sliding window congestion control mechanism. The experiment concluded that protocol selection must be aligned with application requirements: real-time streaming favors UDP while file transfer applications require TCP reliability guarantees.`
      }
    },
    certificate: {
      docA: {
        title: "Academic_Honors_Cert.pdf — Suspect Submitted Credential",
        text: `CERTIFICATE OF ACADEMIC HONORS\nThis certifies that Rаhul Shаrma has successfully completed the Bachelor of Technology program in Computer Science and Engineering with distinction at DocuTrace State University. The student has demonstrated exceptional academic performance and has been awarded the President's Gold Medal for outstanding achievement. This сertificate is issued under the authority of the University Registrar and bears the official digital seal of the institution. Issued on: 15th March 2019. Valid from: June 2020. This document is an official academic credential recognized by the National Board of Higher Education.`
      }
    },
    distinct: {
      docA: {
        title: "Smart Campus Complaint System — Reference Document",
        text: `The Smart Campus System is an innovative solution designed to help students report problems related to classroom equipment, internet connectivity, and campus cleanliness. Students can submit complaints through a centralized web dashboard which allows administrators to monitor the status of each issue in real-time. The platform supports uploading photos and specifying physical locations using GPS coordinates. A centralized REST API processes all submissions and sends automated notifications to the responsible department. Token-based security ensures only authorized users can submit or view complaint data.`
      },
      docB: {
        title: "Decentralized Microgrids Paper — Independent Submission",
        text: `Decentralized microgrid systems offer a transformative approach to electrical energy distribution in remote and semi-urban areas. Unlike traditional centralized power grids, microgrids operate independently using renewable energy sources such as solar photovoltaic panels, wind turbines, and battery storage systems. This paper presents a mathematical optimization model for load balancing within a microgrid cluster using linear programming techniques. Our experiments demonstrate that intelligent energy routing reduces transmission losses by 34% compared to conventional distribution methods. The proposed architecture employs peer-to-peer energy trading protocols based on blockchain verification to ensure transparent and tamper-proof energy exchange between prosumer nodes.`
      }
    }
  },

  async loadAndRunScenario(scenarioKey) {
    const { docA, docB } = this.getScenarioDocs();
    const docAName = docA?.title || "Research_Paper_01";
    const docBName = docB?.title || "Research_Paper_02";

    // Animate the clicked scenario card
    const cardMap = { smart_campus: 1, duplicate: 2, certificate: 3, distinct: 4 };
    const card = document.getElementById(`card-scenario-${cardMap[scenarioKey]}`);
    if (card) {
      card.style.opacity = "0.6";
      card.style.transform = "scale(0.97)";
    }

    // Show the full-screen loading overlay on dashboard
    this.showScenarioModal("loading", scenarioKey, { docAName, docBName });

    try {
      if (scenarioKey === "certificate") {
        // ─── Scenario 3: Authenticity Audit on Suspect Document ───
        this.showToast(`Auditing Suspect Document (${docBName}) for authenticity...`, "info");
        let verifyResult;
        if (docB && docB.id) {
          verifyResult = await api.verifyDocument({ docId: docB.id, filename: docB.filename });
        } else {
          verifyResult = await api.verifyDocument({
            customText: this.SCENARIO_DATA.certificate.docA.text,
            filename: docB?.filename || "Research_Paper2.docx"
          });
        }
        this.lastScenarioVerifyResult = { result: verifyResult, docTitle: docBName, docB };
        this.showScenarioModal("verify_result", scenarioKey, {
          verifyResult,
          docTitle: docBName,
          docAName,
          docBName
        });

      } else {
        // ─── Scenarios 1, 2, 4: Plagiarism & Similarity Comparison ───
        this.showToast(`Comparing Original (${docAName}) vs Suspect (${docBName})...`, "info");

        let compareResult;
        if (docA && docB && docA.id && docB.id) {
          compareResult = await api.compareDocuments({
            docAId: docA.id,
            docBId: docB.id,
            docAName: docAName,
            docBName: docBName,
            jaccardNgram: 2,
            editMode: "word",
            rkWindow: 4
          });
        } else {
          compareResult = await api.compareDocuments({
            customTextA: this.SCENARIO_DATA.smart_campus.docA.text,
            customTextB: this.SCENARIO_DATA.smart_campus.docB.text,
            docAName: docAName,
            docBName: docBName,
            jaccardNgram: 2,
            editMode: "word",
            rkWindow: 4
          });
        }

        this.lastScenarioCompareResult = {
          result: compareResult,
          docAName,
          docBName,
          scenarioKey,
          docA,
          docB
        };

        this.showScenarioModal("compare_result", scenarioKey, {
          compareResult,
          docAName,
          docBName,
          scenarioKey
        });
      }

    } catch (err) {
      console.error("Scenario error:", err);
      this.showScenarioModal("error", scenarioKey, { message: err.message });
    } finally {
      if (card) {
        card.style.opacity = "";
        card.style.transform = "";
      }
    }
  },

  showScenarioModal(state, scenarioKey, data = {}) {
    // Remove existing modal if any
    const existing = document.getElementById("scenario-result-modal");
    if (existing) existing.remove();

    if (state === "loading") {
      const scenarioLabels = {
        smart_campus: `Plagiarism & Diff Test: ${data.docAName || 'Research_Paper_01'} vs ${data.docBName || 'Research_Paper_02'}`,
        duplicate: `Cryptographic SHA-256 Identity Check: ${data.docAName || 'Research_Paper_01'} vs ${data.docBName || 'Research_Paper_02'}`,
        certificate: `Suspect Document Authenticity Audit: ${data.docBName || 'Research_Paper_02'}`,
        distinct: `Lexical Diversity & Originality Verification: ${data.docAName || 'Research_Paper_01'} vs ${data.docBName || 'Research_Paper_02'}`
      };
      const modal = document.createElement("div");
      modal.id = "scenario-result-modal";
      modal.className = "scenario-modal-overlay";
      modal.innerHTML = `
        <div class="scenario-modal-box">
          <div class="scenario-modal-header">
            <div class="scenario-spinner"></div>
            <h2 class="scenario-modal-title">Running Live DAA Analysis</h2>
            <p class="scenario-modal-sub">${scenarioLabels[scenarioKey] || ""}</p>
          </div>
          <div class="scenario-steps">
            <div class="scenario-step active">⚡ Loading documents: ${data.docAName || 'Research_Paper_01'} vs ${data.docBName || 'Research_Paper_02'}...</div>
            <div class="scenario-step">🔐 Computing SHA-256 cryptographic digests in O(N)...</div>
            <div class="scenario-step">🔍 Executing KMP pattern matching (O(N+M))...</div>
            <div class="scenario-step">🪟 Sliding Rabin-Karp rolling hash windows...</div>
            <div class="scenario-step">📊 Calculating Edit Distance dynamic programming matrix...</div>
            <div class="scenario-step">🔗 Computing Jaccard n-gram similarity set overlap...</div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Animate steps
      let step = 0;
      const steps = modal.querySelectorAll(".scenario-step");
      const interval = setInterval(() => {
        if (step < steps.length) {
          if (step > 0) steps[step - 1].classList.remove("active");
          steps[step].classList.add("active", "done");
          step++;
        } else {
          clearInterval(interval);
        }
      }, 500);
      modal._stepInterval = interval;
      return;
    }

    if (state === "error") {
      const modal = document.createElement("div");
      modal.id = "scenario-result-modal";
      modal.className = "scenario-modal-overlay";
      modal.innerHTML = `
        <div class="scenario-modal-box">
          <div style="text-align:center; padding:2rem;">
            <div style="font-size:3rem; margin-bottom:1rem;">❌</div>
            <h2 style="color:var(--rose); margin-bottom:0.5rem;">Analysis Failed</h2>
            <p style="color:var(--text-muted);">${data.message || "An unexpected error occurred."}</p>
            <button class="btn btn-primary" onclick="document.getElementById('scenario-result-modal').remove()" style="margin-top:1.5rem;">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      return;
    }

    // ─── COMPARISON RESULT MODAL ───
    if (state === "compare_result") {
      const r = data.compareResult;
      const score = r.composite_similarity_percentage;
      const isDup = r.is_exact_duplicate;
      const docAName = data.docAName || r.doc_a_name || "Research_Paper_01";
      const docBName = data.docBName || r.doc_b_name || "Research_Paper_02";

      let verdict = "", verdictColor = "", verdictIcon = "", verdictDetail = "";
      if (isDup) {
        verdict = "EXACT DUPLICATE DETECTED";
        verdictColor = "#f43f5e";
        verdictIcon = "🔴";
        verdictDetail = `SHA-256 hashes are identical. Both documents are byte-for-byte the same. Detected instantaneously via cryptographic hashing O(N).`;
      } else if (score >= 75) {
        verdict = "PLAGIARISM DETECTED";
        verdictColor = "#f43f5e";
        verdictIcon = "🔴";
        verdictDetail = `${score}% composite similarity. Systematic word substitutions detected by Edit Distance DP. Sentence structure preserved.`;
      } else if (score >= 35) {
        verdict = "PARAPHRASING DETECTED";
        verdictColor = "#f59e0b";
        verdictIcon = "🟡";
        verdictDetail = `${score}% similarity between ${docAName} and ${docBName}. KMP and Rabin-Karp found matching phrases, and Edit Distance DP mapped word substitutions.`;
      } else {
        verdict = "ORIGINAL WORK — NO PLAGIARISM";
        verdictColor = "#10b981";
        verdictIcon = "🟢";
        verdictDetail = `Only ${score}% overlap detected. Documents are thematically independent with different authorial structures.`;
      }

      const kmp = r.algorithm_metrics?.kmp_sample_searches || [];
      const rk = r.algorithm_metrics?.rabin_karp || {};
      const ed = r.algorithm_metrics?.edit_distance_dp || {};
      const jac = r.algorithm_metrics?.jaccard_ngram || {};
      const ops = ed.operations || {};
      const subs = r.sentence_matches?.filter(s => s.match_type === "MODIFIED_TEXT" || s.match_type === "EXACT_MATCH").slice(0, 3) || [];

      // Scenario-specific banner callouts
      let scenarioSpecificBanner = "";
      if (scenarioKey === "duplicate") {
        scenarioSpecificBanner = `
          <div style="background: ${isDup ? '#fff1f2' : '#f0fdf4'}; border: 1px solid ${isDup ? '#fecdd3' : '#bbf7d0'}; border-radius: 14px; padding: 1.15rem; margin-bottom: 1.5rem;">
            <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; font-weight:800; color:${isDup ? '#e11d48' : '#16a34a'}; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.5rem;">
              <span>⚡</span> Cryptographic SHA-256 Identity Check — O(N) Linear Time Comparison
            </div>
            <div style="font-size:0.8rem; color:#475569; font-family:var(--font-mono); line-height:1.6; word-break:break-all; background:#ffffff; padding:0.65rem 0.85rem; border-radius:8px; border:1px solid #e2e8f0;">
              <div><strong>Original (${docAName}) Hash:</strong> ${r.hashes?.doc_a?.normalized_sha256 || "—"}</div>
              <div><strong>Suspect (${docBName}) Hash:</strong> ${r.hashes?.doc_b?.normalized_sha256 || "—"}</div>
            </div>
            <p style="font-size:0.82rem; color:#475569; margin-top:0.5rem; line-height:1.5;">
              ${isDup 
                ? "✓ 100% Exact Duplicate: Hashes match byte-for-byte in O(N) linear time." 
                : `✓ Hashes differ: Suspect is NOT an exact byte-for-byte re-upload. DocuTrace's O(N) hashing confirmed different digests in < 1 ms, while deep DAA Edit Distance & KMP analysis revealed ${score}% paraphrased overlap.`}
            </p>
          </div>
        `;
      } else if (scenarioKey === "distinct") {
        scenarioSpecificBanner = `
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; padding: 1.15rem; margin-bottom: 1.5rem;">
            <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; font-weight:800; color:#16a34a; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.5rem;">
              <span>🌱</span> Authorial Independence & Lexical Diversity Verification
            </div>
            <p style="font-size:0.82rem; color:#334155; margin-top:0.35rem; line-height:1.5;">
              Suspect document (<strong>${docBName}</strong>) contains <strong>${r.stats?.unique_sentences || 0} unique original sentences</strong> and independent vocabulary. DAA algorithms distinguish original research contributions from plagiarized segments, ensuring zero false-positive accusations.
            </p>
          </div>
        `;
      } else {
        scenarioSpecificBanner = `
          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 14px; padding: 1.15rem; margin-bottom: 1.5rem;">
            <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; font-weight:800; color:#b45309; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.5rem;">
              <span>🔍</span> DAA Paraphrasing & Diff Inspection: ${docAName} vs ${docBName}
            </div>
            <p style="font-size:0.82rem; color:#451a03; margin-top:0.35rem; line-height:1.5;">
              Detected <strong>${r.stats?.exact_matching_sentences || 0} exact matching sentences</strong> and <strong>${r.stats?.modified_sentences || 0} modified/substituted sentences</strong>. Edit Distance DP isolated exact word replacements while KMP & Rabin-Karp matched sentence subsequences.
            </p>
          </div>
        `;
      }

      const modal = document.createElement("div");
      modal.id = "scenario-result-modal";
      modal.className = "scenario-modal-overlay";
      modal.innerHTML = `
        <div class="scenario-modal-box scenario-result-box">
          <div class="scenario-result-header">
            <span style="font-size:2.5rem;">${verdictIcon}</span>
            <div>
              <h2 class="scenario-result-verdict" style="color:${verdictColor};">${verdict}</h2>
              <p class="scenario-result-sub">${verdictDetail}</p>
            </div>
          </div>

          <!-- Document Comparison Pairing Banner -->
          <div class="scenario-pairing-banner">
            <div class="pairing-card original-card">
              <div class="pairing-badge-label">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                Original / Reference Document (Doc A)
              </div>
              <div class="pairing-title">${docAName}</div>
            </div>
            <div class="pairing-vs-circle">VS</div>
            <div class="pairing-card suspect-card">
              <div class="pairing-badge-label">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                Suspect / Submitted Document (Doc B)
              </div>
              <div class="pairing-title">${docBName}</div>
            </div>
          </div>

          ${scenarioSpecificBanner}

          <div class="scenario-algo-grid">
            <div class="scenario-algo-card">
              <div class="algo-card-label">🔍 KMP Pattern Match</div>
              <div class="algo-card-value">${kmp.length} phrases checked</div>
              <div class="algo-card-sub">O(N+M) linear time</div>
            </div>
            <div class="scenario-algo-card">
              <div class="algo-card-label">🪟 Rabin-Karp Hash</div>
              <div class="algo-card-value">${rk.total_matches_found || 0} passage matches</div>
              <div class="algo-card-sub">${((rk.passage_similarity_ratio || 0) * 100).toFixed(1)}% word coverage</div>
            </div>
            <div class="scenario-algo-card">
              <div class="algo-card-label">📊 Edit Distance DP</div>
              <div class="algo-card-value">${ops.substitutions || 0} word substitutions</div>
              <div class="algo-card-sub">${ed.similarity_percentage || 0}% DP match</div>
            </div>
            <div class="scenario-algo-card">
              <div class="algo-card-label">🔗 Jaccard N-gram</div>
              <div class="algo-card-value">${jac.cardinality_intersection || 0} / ${jac.cardinality_union || 0} shared</div>
              <div class="algo-card-sub">${jac.similarity_percentage || 0}% set overlap</div>
            </div>
          </div>

          <div class="scenario-score-row">
            <div class="scenario-score-circle" style="--score-color:${verdictColor};">
              <span class="score-big">${score}%</span>
              <span class="score-label">Composite Similarity</span>
            </div>
            <div class="scenario-stats-list">
              <div class="stat-row"><span>✅ Exact matching sentences</span><strong>${r.stats?.exact_matching_sentences || 0}</strong></div>
              <div class="stat-row"><span>🔄 Modified / paraphrased</span><strong>${r.stats?.modified_sentences || 0}</strong></div>
              <div class="stat-row"><span>🆕 Unique original sentences</span><strong>${r.stats?.unique_sentences || 0}</strong></div>
              <div class="stat-row"><span>⚡ Execution time</span><strong>${r.execution_time_ms} ms</strong></div>
            </div>
          </div>

          ${subs.length > 0 ? `
          <div class="scenario-matches-section">
            <div class="matches-section-title">📝 Top Matching Sentence Pairs Found by Algorithm</div>
            ${subs.map(s => `
              <div class="scenario-match-pair">
                <div class="match-pair-badge ${s.match_type === 'EXACT_MATCH' ? 'badge-rose' : 'badge-amber'}">${s.match_type === 'EXACT_MATCH' ? '🔴 Exact Copy' : `🟡 Paraphrased (${s.similarity_percentage}%)`}</div>
                <div class="match-columns">
                  <div class="match-col">
                    <span class="match-col-label" style="color:var(--primary); font-weight:800;">Original / Reference (${docAName})</span>
                    <p>${s.matched_doc_a_sentence || "—"}</p>
                  </div>
                  <div class="match-col">
                    <span class="match-col-label" style="color:#e11d48; font-weight:800;">Suspect / Submitted (${docBName})</span>
                    <p>${s.doc_b_sentence || "—"}</p>
                  </div>
                </div>
                ${(s.diff_highlights || []).filter(h => h.type === "substitution").length > 0 ? `
                <div class="match-substitutions">
                  <span>Word substitutions: </span>
                  ${(s.diff_highlights || []).filter(h => h.type === "substitution").map(h => `<span class="sub-chip"><span style="color:#f87171">${h.from_doc_a}</span> → <span style="color:#fbbf24">${h.to_doc_b}</span></span>`).join("")}
                </div>` : ""}
              </div>
            `).join("")}
          </div>` : ""}

          <div class="scenario-modal-actions">
            <button class="btn btn-secondary" onclick="document.getElementById('scenario-result-modal').remove()">Close</button>
            <button class="btn btn-primary" onclick="app.goToFullAnalysis()">View Full Analysis →</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
      return;
    }

    // ─── VERIFICATION RESULT MODAL ───
    if (state === "verify_result") {
      const vr = data.verifyResult;
      const score = vr.trust_score;
      const docTitle = data.docTitle || data.docBName || "Research_Paper_02";
      let scoreColor = score >= 85 ? "#10b981" : score >= 65 ? "#f59e0b" : "#f43f5e";
      let riskLabel = vr.risk_level.replace(/_/g, " ");

      const modal = document.createElement("div");
      modal.id = "scenario-result-modal";
      modal.className = "scenario-modal-overlay";
      modal.innerHTML = `
        <div class="scenario-modal-box scenario-result-box">
          <div class="scenario-result-header">
            <span style="font-size:2.5rem;">${score >= 85 ? "✅" : score >= 65 ? "⚠️" : "🚨"}</span>
            <div>
              <h2 class="scenario-result-verdict" style="color:${scoreColor};">${riskLabel}</h2>
              <p class="scenario-result-sub">Multi-vector authenticity audit completed. Trust Score: ${score}/100</p>
            </div>
          </div>

          <!-- Document Under Audit Banner -->
          <div class="scenario-pairing-banner">
            <div class="pairing-card suspect-card" style="width: 100%;">
              <div class="pairing-badge-label">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                Suspect / Submitted Document Under Authenticity Audit
              </div>
              <div class="pairing-title">${docTitle}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.35rem;">
                Target: Audited for Cyrillic/Greek homoglyphs, zero-width spaces, digital signature presence, and metadata timestamp integrity
              </div>
            </div>
          </div>

          <div class="scenario-algo-grid">
            <div class="scenario-algo-card ${vr.anomaly_counts?.homoglyphs > 0 ? 'algo-card-danger' : ''}">
              <div class="algo-card-label">🔤 Homoglyph Scanner</div>
              <div class="algo-card-value">${vr.anomaly_counts?.homoglyphs || 0} Cyrillic/Greek chars</div>
              <div class="algo-card-sub">Linear O(N) character scan</div>
            </div>
            <div class="scenario-algo-card ${vr.anomaly_counts?.zero_width > 0 ? 'algo-card-danger' : ''}">
              <div class="algo-card-label">👁 Zero-Width Detector</div>
              <div class="algo-card-value">${vr.anomaly_counts?.zero_width || 0} invisible chars</div>
              <div class="algo-card-sub">Hash evasion detection</div>
            </div>
            <div class="scenario-algo-card ${vr.has_digital_signature ? '' : 'algo-card-warn'}">
              <div class="algo-card-label">🔏 Digital Signature</div>
              <div class="algo-card-value">${vr.has_digital_signature ? "✓ Present" : "✗ Missing"}</div>
              <div class="algo-card-sub">PKCS#7 ByteRange scan</div>
            </div>
            <div class="scenario-algo-card">
              <div class="algo-card-label">📅 Timestamp Integrity</div>
              <div class="algo-card-value">${(vr.findings || []).some(f => f.code === "TIMESTAMP_PARADOX") ? "⚠ Backdated" : "✓ Consistent"}</div>
              <div class="algo-card-sub">Metadata cross-validation</div>
            </div>
          </div>

          <div class="scenario-score-row">
            <div class="scenario-score-circle" style="--score-color:${scoreColor};">
              <span class="score-big">${score}</span>
              <span class="score-label">Trust Score</span>
            </div>
            <div class="scenario-stats-list">
              ${(vr.findings || []).map(f => `
                <div class="stat-row finding-row">
                  <span class="finding-severity severity-${f.severity?.toLowerCase()}">${f.severity}</span>
                  <span>${f.title}</span>
                </div>
              `).join("") || `<div class="stat-row"><span>✅ No anomalies detected — document verified genuine</span></div>`}
            </div>
          </div>

          <div class="scenario-modal-actions">
            <button class="btn btn-secondary" onclick="document.getElementById('scenario-result-modal').remove()">Close</button>
            <button class="btn btn-primary" onclick="app.goToFullVerify()">View Full Audit →</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
    }
  },

  goToFullAnalysis() {
    document.getElementById("scenario-result-modal")?.remove();
    this.switchTab("compare");
    if (this.lastScenarioCompareResult) {
      const { docA, docB } = this.getScenarioDocs();
      const selectA = document.getElementById("select-doc-a");
      const selectB = document.getElementById("select-doc-b");
      if (docA && selectA) selectA.value = docA.id;
      if (docB && selectB) selectB.value = docB.id;
      this.renderComparisonResults(this.lastScenarioCompareResult.result);
    }
    setTimeout(() => {
      document.getElementById("compare-results-container")?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  },

  goToFullVerify() {
    document.getElementById("scenario-result-modal")?.remove();
    this.switchTab("verify");
    if (this.lastScenarioVerifyResult) {
      const { docB } = this.getScenarioDocs();
      const selectVerify = document.getElementById("select-verify-doc");
      if (docB && selectVerify) selectVerify.value = docB.id;
      this.renderVerificationResults(this.lastScenarioVerifyResult.result);
    }
    setTimeout(() => {
      document.getElementById("verify-results-container")?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  },

  async executeComparison() {
    const docAId = document.getElementById("select-doc-a").value;
    const docBId = document.getElementById("select-doc-b").value;
    const jaccardNgram = document.getElementById("param-jaccard-ngram").value;
    const editMode = document.getElementById("param-edit-mode").value;
    const rkWindow = document.getElementById("param-rk-window").value;

    if (!docAId || !docBId) {
      this.showToast("Please select two documents to compare.", "error");
      return;
    }

    try {
      this.showToast("Analyzing document similarity and text structure...", "info");
      const result = await api.compareDocuments({
        docAId,
        docBId,
        jaccardNgram,
        editMode,
        rkWindow
      });

      this.renderComparisonResults(result);
      this.showToast(`Comparison completed in ${result.execution_time_ms} ms!`, "success");
    } catch (err) {
      console.error("Comparison error:", err);
      this.showToast(err.message, "error");
    }
  },

  renderComparisonResults(data) {
    this.lastComparisonResult = data;
    const container = document.getElementById("compare-results-container");
    container.style.display = "block";

    // 1. Exact Duplicate Banner
    const dupBanner = document.getElementById("banner-duplicate-status");
    if (data.is_exact_duplicate) {
      dupBanner.style.display = "flex";
      document.getElementById("dup-banner-title").textContent = `Exact Duplicate Document Detected (${data.duplicate_type})!`;
      document.getElementById("dup-banner-desc").textContent = 
        `Both documents produce identical SHA-256 hashes (${data.hashes.doc_a.normalized_sha256.substring(0, 16)}...). No modifications found.`;
    } else {
      dupBanner.style.display = "none";
    }

    // 2. Score Hero Card
    const scoreVal = data.composite_similarity_percentage;
    document.getElementById("display-composite-score").textContent = `${scoreVal}%`;
    
    // Animate circular ring (circumference is 2 * PI * 52 ~ 326.7)
    const progressRing = document.getElementById("score-progress-ring");
    const circumference = 326.7;
    const offset = circumference - (scoreVal / 100) * circumference;
    progressRing.style.strokeDashoffset = offset;

    // Colorize ring based on similarity
    let ringColor = "var(--emerald)";
    let badgeClass = "badge-emerald";
    let narrativeTitle = "Low Plagiarism Overlap";
    let narrativeBody = "The documents are largely distinct and exhibit high originality with minimal textual overlap.";

    if (scoreVal >= 80) {
      ringColor = "var(--rose)";
      badgeClass = "badge-rose";
      narrativeTitle = "Severe Plagiarism / Copied Assignment Detected";
      narrativeBody = "Substantial portions of sentences, phrasing, and structure match the original reference document. Words appear systematically replaced with synonyms.";
    } else if (scoreVal >= 45) {
      ringColor = "var(--amber)";
      badgeClass = "badge-amber";
      narrativeTitle = "Moderate Similarity & Paraphrasing Detected";
      narrativeBody = "Multiple matching word sequences and paraphrased sentences were detected via Dynamic Programming and Rolling Hashes.";
    } else if (scoreVal >= 20) {
      ringColor = "var(--cyan)";
      badgeClass = "badge-cyan";
      narrativeTitle = "Slight Lexical Overlap";
      narrativeBody = "Shared technical keywords or common introductory terms, but original authorial sentence construction.";
    }

    progressRing.style.stroke = ringColor;
    const badgeElem = document.getElementById("display-classification-badge");
    badgeElem.className = `classification-badge ${badgeClass}`;
    badgeElem.textContent = data.classification.replace(/_/g, " ");
    document.getElementById("display-narrative-title").textContent = narrativeTitle;
    document.getElementById("display-narrative-text").textContent = narrativeBody;

    // Stats Chips
    document.getElementById("chip-exact-sentences").textContent = data.stats.exact_matching_sentences;
    document.getElementById("chip-modified-sentences").textContent = data.stats.modified_sentences;
    document.getElementById("chip-unique-sentences").textContent = data.stats.unique_sentences;
    document.getElementById("chip-execution-time").textContent = `${data.execution_time_ms} ms`;

    // 3. Algorithm Breakdown Cards
    const kmpSearches = data.algorithm_metrics.kmp_sample_searches || [];
    const totalKmpComps = kmpSearches.reduce((acc, curr) => acc + (curr.comparisons || 0), 0);
    document.getElementById("kmp-phrases-count").textContent = `${kmpSearches.length} Key Phrases Checked`;
    document.getElementById("kmp-comparisons-count").textContent = `${totalKmpComps} comparisons (O(N+M))`;

    const rk = data.algorithm_metrics.rabin_karp || {};
    document.getElementById("rk-passages-count").textContent = `${rk.total_matches_found || 0} Passage Matches`;
    document.getElementById("rk-coverage-ratio").textContent = `${((rk.passage_similarity_ratio || 0) * 100).toFixed(1)}% Word Overlap`;

    const ed = data.algorithm_metrics.edit_distance_dp || {};
    const ops = ed.operations || {};
    document.getElementById("ed-operations-count").textContent = 
      `${ops.substitutions || 0} subs, ${ops.insertions || 0} ins, ${ops.deletions || 0} dels`;
    document.getElementById("ed-similarity-ratio").textContent = `${ed.similarity_percentage || 0}% DP Match`;

    const jac = data.algorithm_metrics.jaccard_ngram || {};
    document.getElementById("jac-intersection-val").textContent = `${jac.cardinality_intersection || 0} shared / ${jac.cardinality_union || 0} union`;
    document.getElementById("jac-score-val").textContent = `${jac.similarity_percentage || 0}% (${jac.n_gram}-gram)`;

    // 4. Dual-Pane Side-by-Side Sentence Alignment Diff
    const alignmentContainer = document.getElementById("sentence-alignment-container");
    const sentenceMatches = data.sentence_matches || [];

    if (sentenceMatches.length === 0) {
      alignmentContainer.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:1.5rem;">No sentences available for alignment.</p>`;
    } else {
      alignmentContainer.innerHTML = sentenceMatches.map(sm => {
        let badgeType = "pair-unique";
        let badgeLabel = "Unique Content";
        let boxClass = "";

        if (sm.match_type === "EXACT_MATCH") {
          badgeType = "pair-exact";
          badgeLabel = "Exact Duplicate Sentence (100%)";
          boxClass = "highlight-exact";
        } else if (sm.match_type === "MODIFIED_TEXT" || sm.match_type === "PARTIAL_SIMILARITY") {
          badgeType = "pair-modified";
          badgeLabel = `Paraphrased (${sm.similarity_percentage}%)`;
          boxClass = "highlight-modified";
        }

        let diffMutationChips = "";
        if (sm.diff_highlights && sm.diff_highlights.length > 0) {
          const subs = sm.diff_highlights.filter(h => h.type === "substitution");
          if (subs.length > 0) {
            diffMutationChips = `
              <div class="diff-mutations-row">
                <span style="color:var(--amber); font-weight:700;">Word Substitutions Detected:</span>
                ${subs.map(s => `
                  <span class="mutation-chip">
                    <span style="color:#f87171;">${s.from_doc_a}</span> &rarr; <span style="color:#fbbf24;">${s.to_doc_b}</span>
                  </span>
                `).join("")}
              </div>
            `;
          }
        }

        return `
          <div class="sentence-pair-card">
            <div class="sentence-pair-header">
              <span class="pair-badge ${badgeType}">${badgeLabel}</span>
              <span class="pair-similarity">Similarity: ${sm.similarity_percentage}%</span>
            </div>
            <div class="sentence-columns">
              <div class="doc-sentence-box ${boxClass}">
                <span class="sentence-role-tag">${data.doc_a_name} (Reference)</span>
                <div>${sm.matched_doc_a_sentence || '<em style="color:var(--text-muted);">No matching sentence in Doc A</em>'}</div>
              </div>
              <div class="doc-sentence-box ${boxClass}">
                <span class="sentence-role-tag">${data.doc_b_name} (Submitted)</span>
                <div>${sm.doc_b_sentence}</div>
              </div>
            </div>
            ${diffMutationChips}
          </div>
        `;
      }).join("");
    }

    // Render the Sentence-by-Sentence PDF directly in the inspection viewer
    this.renderPdfInspectionPreview(data);

    // Scroll smoothly to results
    container.scrollIntoView({ behavior: "smooth" });
  },

  switchInspectionView(mode) {
    const pdfBtn = document.getElementById("btn-view-pdf");
    const textBtn = document.getElementById("btn-view-text");
    const pdfWrapper = document.getElementById("pdf-viewer-wrapper");
    const textWrapper = document.getElementById("text-view-wrapper");

    if (mode === "pdf") {
      if (pdfBtn) pdfBtn.classList.add("active");
      if (textBtn) textBtn.classList.remove("active");
      if (pdfWrapper) pdfWrapper.style.display = "block";
      if (textWrapper) textWrapper.style.display = "none";
    } else {
      if (textBtn) textBtn.classList.add("active");
      if (pdfBtn) pdfBtn.classList.remove("active");
      if (textWrapper) textWrapper.style.display = "block";
      if (pdfWrapper) pdfWrapper.style.display = "none";
    }
  },

  async fetchInspectionPdfBlob(payload) {
    if (typeof api !== "undefined" && typeof api.exportInspectionPdf === "function") {
      return await api.exportInspectionPdf(payload);
    }
    // Direct robust fallback in case api.js is cached by browser
    const res = await fetch(`${window.location.origin}/api/export-inspection-pdf`, {
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

  async renderPdfInspectionPreview(data) {
    const frame = document.getElementById("pdf-inspection-frame");
    const loading = document.getElementById("pdf-loading-indicator");

    // Make sure PDF view is selected by default
    this.switchInspectionView("pdf");

    if (loading) loading.style.display = "flex";
    if (frame) frame.style.display = "none";

    try {
      const payload = {
        doc_a_name: data.doc_a_name || "Reference Document",
        doc_b_name: data.doc_b_name || "Submitted Document",
        composite_similarity_percentage: data.composite_similarity_percentage || 0,
        classification: data.classification || "ANALYSIS",
        sentence_matches: data.sentence_matches || []
      };

      const blob = await this.fetchInspectionPdfBlob(payload);
      if (this.currentPdfBlobUrl) {
        window.URL.revokeObjectURL(this.currentPdfBlobUrl);
      }
      this.currentPdfBlobUrl = window.URL.createObjectURL(blob);

      if (frame) {
        frame.src = this.currentPdfBlobUrl;
        frame.style.display = "block";
      }
    } catch (err) {
      console.error("Error loading PDF preview:", err);
      if (frame) {
        frame.style.display = "none";
      }
      this.showToast("Could not load inline PDF preview. Please use Download PDF.", "error");
    } finally {
      if (loading) loading.style.display = "none";
    }
  },

  async exportInspectionToPdf() {
    if (!this.lastComparisonResult || !this.lastComparisonResult.sentence_matches) {
      this.showToast("Please run a comparison first before exporting.", "error");
      return;
    }

    const exportBtn = document.getElementById("btn-export-pdf");
    const originalContent = exportBtn ? exportBtn.innerHTML : "";
    if (exportBtn) {
      exportBtn.disabled = true;
      exportBtn.innerHTML = `
        <svg style="animation: spin 1s linear infinite; width:16px; height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M4 12a8 8 0 0 1 8-8"></path>
        </svg>
        <span>Generating PDF...</span>
      `;
    }

    try {
      const cleanName = ((this.lastComparisonResult.doc_b_name || "Inspection").replace(/[^a-zA-Z0-9_\-]/g, "_"));
      let blobUrl = this.currentPdfBlobUrl;
      let needRevoke = false;

      if (!blobUrl) {
        this.showToast("Generating Sentence-by-Sentence Plagiarism & Substitution Inspection PDF...", "info");
        const payload = {
          doc_a_name: this.lastComparisonResult.doc_a_name || "Reference Document",
          doc_b_name: this.lastComparisonResult.doc_b_name || "Submitted Document",
          composite_similarity_percentage: this.lastComparisonResult.composite_similarity_percentage || 0,
          classification: this.lastComparisonResult.classification || "ANALYSIS",
          sentence_matches: this.lastComparisonResult.sentence_matches || []
        };
        const blob = await this.fetchInspectionPdfBlob(payload);
        blobUrl = window.URL.createObjectURL(blob);
        needRevoke = true;
      }

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `DocuTrace_Plagiarism_Report_${cleanName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (needRevoke) window.URL.revokeObjectURL(blobUrl);

      this.showToast("PDF Inspection Report successfully downloaded!", "success");
    } catch (err) {
      console.error("PDF export error:", err);
      this.showToast(err.message || "Failed to download PDF report", "error");
    } finally {
      if (exportBtn) {
        exportBtn.disabled = false;
        exportBtn.innerHTML = originalContent;
      }
    }
  },

  async executeVerification() {
    const docId = document.getElementById("select-verify-doc").value;
    if (!docId) {
      this.showToast("Please select a document to verify.", "error");
      return;
    }

    try {
      this.showToast("Auditing document metadata, digital seals, and homoglyphs...", "info");
      const res = await api.verifyDocument({ docId });
      this.renderVerificationResults(res);
      this.showToast("Authenticity verification audit complete!", "success");
    } catch (err) {
      console.error("Verification error:", err);
      this.showToast(err.message, "error");
    }
  },

  renderVerificationResults(data) {
    const container = document.getElementById("verify-results-container");
    container.style.display = "block";

    const trustScore = data.trust_score !== undefined ? data.trust_score : 100;
    const isPass = trustScore >= 85;
    const isWarn = trustScore >= 50 && trustScore < 85;
    const isFail = trustScore < 50;

    const banner = document.getElementById("auth-exec-banner");
    const pill = document.getElementById("auth-status-pill");
    const scoreBadge = document.getElementById("display-trust-score-badge");
    const trustBadge = document.getElementById("display-trust-badge");
    const docTitleEl = document.getElementById("auth-verified-doc-title");
    const summaryEl = document.getElementById("display-trust-summary");
    const quickVerdict = document.getElementById("auth-quick-verdict");
    const quickAnomalies = document.getElementById("auth-quick-anomalies");

    if (banner) {
      banner.className = `auth-executive-banner ${isFail ? 'status-high-risk' : isWarn ? 'status-suspicious' : ''}`;
    }
    if (pill) {
      pill.className = `auth-score-pill ${isFail ? 'pill-rose' : isWarn ? 'pill-amber' : ''}`;
    }
    if (scoreBadge) scoreBadge.textContent = `${trustScore}% TRUST SCORE`;
    if (trustBadge) trustBadge.textContent = (data.risk_level || "VERIFIED").replace(/_/g, " ");
    if (docTitleEl) docTitleEl.textContent = data.doc_title || data.filename || "Research_Paper_02";

    let summaryText = "Document exhibits high integrity with verified digital metadata, clean character encodings, and no evasion artifacts.";
    let verdictText = "PASS";
    let verdictColor = "var(--emerald)";

    if (isFail) {
      summaryText = "HIGH RISK OF TAMPERING DETECTED. Document exhibits character evasion techniques, Cyrillic lookalikes, or impossible timestamp modifications.";
      verdictText = "FLAGGED";
      verdictColor = "var(--rose)";
    } else if (isWarn) {
      summaryText = "SUSPICIOUS ATTRIBUTES FOUND. Potential anomalies in creation tools, missing digital seals, or altered passages warrant manual inspection.";
      verdictText = "REVIEW";
      verdictColor = "var(--amber)";
    }

    if (summaryEl) summaryEl.textContent = summaryText;
    if (quickVerdict) {
      quickVerdict.textContent = verdictText;
      quickVerdict.style.color = verdictColor;
    }

    const anomalyCount = (data.anomaly_counts?.homoglyphs || 0) + (data.anomaly_counts?.zero_width || 0) + ((data.findings || []).length);
    if (quickAnomalies) {
      quickAnomalies.textContent = anomalyCount === 0 ? "0 Flags" : `${anomalyCount} Flag${anomalyCount > 1 ? 's' : ''}`;
      quickAnomalies.style.color = anomalyCount === 0 ? "var(--emerald)" : isFail ? "var(--rose)" : "var(--amber)";
    }

    // 4 Clean Security Vectors Cards (No Big Symbols)
    const vectorsContainer = document.getElementById("auth-vectors-container");
    if (vectorsContainer) {
      const hasSig = data.has_digital_signature;
      const homoglyphs = data.anomaly_counts?.homoglyphs || 0;
      const zeroWidth = data.anomaly_counts?.zero_width || 0;
      const hasDateParadox = (data.findings || []).some(f => f.code === "TIMESTAMP_PARADOX");

      vectorsContainer.innerHTML = `
        <div class="auth-vector-card">
          <div class="auth-vector-card-inner">
            <div class="auth-icon-box ${hasSig ? 'icon-indigo' : 'icon-amber'}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <div class="auth-vector-info">
              <div class="auth-vector-top">
                <span class="auth-vector-name">Digital Signature</span>
                <span class="auth-vector-badge ${hasSig ? 'badge-pass' : 'badge-warn'}">${hasSig ? 'PASS' : 'UNSEALED'}</span>
              </div>
              <div class="auth-vector-val">${hasSig ? '✓ Verified Present' : '— Not Embedded'}</div>
              <div class="auth-vector-sub">Cryptographic PKCS#7 ByteRange digital seal inspection</div>
            </div>
          </div>
        </div>

        <div class="auth-vector-card">
          <div class="auth-vector-card-inner">
            <div class="auth-icon-box ${homoglyphs === 0 ? 'icon-emerald' : 'icon-rose'}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>
            </div>
            <div class="auth-vector-info">
              <div class="auth-vector-top">
                <span class="auth-vector-name">Homoglyph Scanner</span>
                <span class="auth-vector-badge ${homoglyphs === 0 ? 'badge-pass' : 'badge-fail'}">${homoglyphs === 0 ? 'CLEAN' : 'FLAGGED'}</span>
              </div>
              <div class="auth-vector-val">${homoglyphs === 0 ? '0 Spoofs Detected' : `${homoglyphs} Characters`}</div>
              <div class="auth-vector-sub">Linear O(N) Cyrillic/Greek lookalike spoof screening</div>
            </div>
          </div>
        </div>

        <div class="auth-vector-card">
          <div class="auth-vector-card-inner">
            <div class="auth-icon-box ${zeroWidth === 0 ? 'icon-cyan' : 'icon-rose'}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle><line x1="2" y1="2" x2="22" y2="22" style="${zeroWidth === 0 ? 'display:none' : ''}"></line></svg>
            </div>
            <div class="auth-vector-info">
              <div class="auth-vector-top">
                <span class="auth-vector-name">Hidden Characters</span>
                <span class="auth-vector-badge ${zeroWidth === 0 ? 'badge-pass' : 'badge-fail'}">${zeroWidth === 0 ? 'CLEAN' : 'FLAGGED'}</span>
              </div>
              <div class="auth-vector-val">${zeroWidth === 0 ? '0 Zero-Width Spaces' : `${zeroWidth} Invisible`}</div>
              <div class="auth-vector-sub">Steganographic hash &amp; plagiarism evasion detection</div>
            </div>
          </div>
        </div>

        <div class="auth-vector-card">
          <div class="auth-vector-card-inner">
            <div class="auth-icon-box ${!hasDateParadox ? 'icon-emerald' : 'icon-rose'}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><polyline points="9 16 11 18 15 14"></polyline></svg>
            </div>
            <div class="auth-vector-info">
              <div class="auth-vector-top">
                <span class="auth-vector-name">Timestamp Integrity</span>
                <span class="auth-vector-badge ${!hasDateParadox ? 'badge-pass' : 'badge-fail'}">${!hasDateParadox ? 'VALID' : 'PARADOX'}</span>
              </div>
              <div class="auth-vector-val">${!hasDateParadox ? '✓ Chronologically Valid' : '⚠ Backdated'}</div>
              <div class="auth-vector-sub">Metadata lifecycle &amp; revision chronology cross-check</div>
            </div>
          </div>
        </div>
      `;
    }

    // Metadata Provenance Table
    const metaTable = document.getElementById("metadata-property-table");
    const m = data.metadata_inspected || {};
    if (metaTable) {
      metaTable.innerHTML = `
        <div class="meta-prop-row">
          <span class="meta-prop-key">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            Target Document:
          </span>
          <span class="meta-prop-val">${data.doc_title || data.filename}</span>
        </div>
        <div class="meta-prop-row">
          <span class="meta-prop-key">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
            Original Filename:
          </span>
          <span class="meta-prop-val">${data.filename}</span>
        </div>
        <div class="meta-prop-row">
          <span class="meta-prop-key">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            Claimed Author:
          </span>
          <span class="meta-prop-val">${m.author || 'None'}</span>
        </div>
        <div class="meta-prop-row">
          <span class="meta-prop-key">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
            Authoring Software:
          </span>
          <span class="meta-prop-val">${m.creator || m.producer || 'Standard Processing Tool'}</span>
        </div>
        <div class="meta-prop-row">
          <span class="meta-prop-key">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            Creation Timestamp:
          </span>
          <span class="meta-prop-val">${m.created_date || 'Unspecified'}</span>
        </div>
        <div class="meta-prop-row">
          <span class="meta-prop-key">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            Last Modification Date:
          </span>
          <span class="meta-prop-val">${m.modified_date || 'Unspecified'}</span>
        </div>
      `;
    }

    // Findings List
    const findingsList = document.getElementById("findings-container");
    if (findingsList) {
      if (data.findings && data.findings.length > 0) {
        findingsList.innerHTML = data.findings.map(f => `
          <div class="finding-card severity-${f.severity}">
            <div class="finding-title">
              ${f.severity === 'HIGH' ?
                `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>` :
                f.severity === 'MEDIUM' ?
                `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>` :
                `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
              }
              <span class="auth-vector-badge ${f.severity === 'HIGH' ? 'badge-fail' : f.severity === 'MEDIUM' ? 'badge-warn' : 'badge-pass'}">${f.severity}</span>
              <span>${f.title}</span>
            </div>
            <div class="finding-desc">${f.detail}</div>
            ${f.samples && f.samples.length > 0 ? `
              <div style="margin-top:0.45rem; font-size:0.75rem; font-family:var(--font-mono); color:var(--text-muted); background:rgba(0,0,0,0.03); padding:0.35rem 0.6rem; border-radius:4px;">
                Artifacts: ${f.samples.map(s => `${s.suspicious_char || s.char_name} (pos ${s.position})`).join(", ")}
              </div>
            ` : ''}
          </div>
        `).join("");

      } else {
        findingsList.innerHTML = `
          <div class="finding-card severity-LOW">
            <div class="finding-title">
              <span class="auth-vector-badge badge-pass">PASSED</span>
              <span>Clean Authenticity Audit Ledger</span>
            </div>
            <div class="finding-desc">No tampering indicators, backdated timestamps, or character evasion artifacts discovered in this document.</div>
          </div>
        `;
      }
    }

    container.scrollIntoView({ behavior: "smooth" });
  },

  async executeBenchmark() {
    const tbody = document.getElementById("benchmark-tbody");
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 2rem; color: var(--cyan);">
          Running DAA Benchmark Suite (KMP, Rabin-Karp, Edit Distance DP, Jaccard)... Please wait.
        </td>
      </tr>
    `;

    try {
      this.showToast("Executing multi-scale DAA benchmarks...", "info");
      const bench = await api.runBenchmark({ documentSizes: [10, 50, 100, 250, 500], iterations: 3 });
      
      const results = bench.results || [];
      tbody.innerHTML = results.map(r => `
        <tr>
          <td><strong>${r.num_words}</strong> words</td>
          <td>${r.char_count} chars</td>
          <td style="color:var(--cyan); font-weight:700;">${r.kmp_time_ms} ms</td>
          <td>${r.kmp_comparisons}</td>
          <td style="color:#a5b4fc; font-weight:700;">${r.rabin_karp_time_ms} ms</td>
          <td>${r.rabin_karp_hashes}</td>
          <td style="color:var(--amber); font-weight:700;">${r.edit_distance_time_ms} ms <small>(${r.edit_distance_cells} cells)</small></td>
          <td style="color:var(--emerald); font-weight:700;">${r.jaccard_time_ms} ms</td>
          <td><strong>${r.total_similarity_time_ms} ms</strong></td>
        </tr>
      `).join("");

      // Render Charts
      benchmarkCharts.renderMatchingChart("svg-chart-matching", results);
      benchmarkCharts.renderSimilarityChart("svg-chart-similarity", results);

      this.showToast("Benchmark suite executed successfully!", "success");
    } catch (err) {
      console.error("Benchmark error:", err);
      tbody.innerHTML = `<tr><td colspan="9" style="color:var(--rose); text-align:center;">${err.message}</td></tr>`;
      this.showToast(err.message, "error");
    }
  },

  async runVisualizerStep() {
    const text1 = document.getElementById("viz-input-text1").value;
    const text2 = document.getElementById("viz-input-text2").value;

    try {
      const res = await api.runAlgoDemo({
        algorithm: this.activeVizAlgo,
        text1,
        text2
      });

      if (this.activeVizAlgo === "kmp") {
        visualizer.renderKMP(res);
      } else if (this.activeVizAlgo === "rabin_karp") {
        visualizer.renderRabinKarp(res);
      } else if (this.activeVizAlgo === "edit_distance") {
        visualizer.renderEditDistance(res);
      } else if (this.activeVizAlgo === "jaccard") {
        visualizer.renderJaccard(res);
      }
    } catch (err) {
      console.error("Visualizer error:", err);
    }
  }
};

// Expose app and scenario runner globally for inline onclick handlers and external callers
window.app = app;
window.loadAndRunScenario = function(scenarioKey) {
  return app.loadAndRunScenario(scenarioKey);
};
