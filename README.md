# DocuTrace — Intelligent Document Verification & Similarity Detection System

> **Subject:** Design and Analysis of Algorithms (DAA)  
> **Course Project & Academic Implementation**  
> **Tech Stack:** Python 3 (FastAPI, Uvicorn, PyPDF, Python-Docx) + Modern Vanilla Web Frontend (HTML5, Custom CSS3, ES6 JavaScript)

---

## 1. Project Overview

**DocuTrace** is an intelligent document-analysis system engineered to solve three major academic and organizational challenges:
1. **Copied Assignments & Paraphrasing:** Detects when students submit reports containing copied paragraphs where words have been systematically replaced with synonyms (e.g. *"problems"* substituted with *"issues"*).
2. **Duplicate Documents:** Instantly flags exact duplicate files or documents with identical extracted text under different filenames using $O(1)$ cryptographic hashing.
3. **Suspicious Certificates & Official Records:** Audits claimed certificates and records for digital signature presence, metadata timestamp paradoxes (e.g., modified date earlier than creation date), and Unicode spoofing attacks (Cyrillic homoglyphs and hidden zero-width spaces).

---

## 2. DAA Algorithm Suite & Mathematical Formulation

DocuTrace directly implements and evaluates four foundational algorithms from the **Design and Analysis of Algorithms (DAA)** curriculum:

### A. Knuth-Morris-Pratt (KMP) String Matching
* **Purpose:** Efficient exact pattern and keyphrase matching across documents.
* **Mechanism:** Precomputes the Longest Proper Prefix which is also a Suffix ($\pi$ / LPS array). When a mismatch occurs between the text and pattern, the pattern pointer jumps to `lps[j-1]` instead of resetting to index 0, eliminating backtracking in the main text pointer.
* **Time Complexity:** 
  $$\text{Preprocessing: } O(M), \quad \text{Matching: } O(N), \quad \text{Total: } O(N + M)$$
* **Space Complexity:** $O(M)$ for the LPS array.

### B. Rabin-Karp Rolling Hash Algorithm
* **Purpose:** Multi-word passage matching and copied block detection.
* **Mechanism:** Slides a window of length $M$ across text using a polynomial rolling hash:
  $$H = \left(\sum_{k=0}^{M-1} c_k \cdot b^{M-1-k}\right) \pmod p$$
  When sliding the window from index $i$ to $i+1$, the next hash is computed in $O(1)$ time:
  $$H_{i+1} = \Big(b \cdot (H_i - c_i \cdot b^{M-1}) + c_{i+M}\Big) \pmod p$$
  Character verification is executed only upon a hash match to detect and handle spurious collisions.
* **Time Complexity:** Average $O(N + M)$, Worst-Case $O(N \times M)$ (during hash collisions).
* **Space Complexity:** $O(1)$ auxiliary space.

### C. Levenshtein Edit Distance (Dynamic Programming)
* **Purpose:** Quantifies textual modifications, paraphrasing, and word substitutions.
* **Recurrence Relation:**
  $$D[i, 0] = i \cdot \text{cost}_{\text{del}}, \quad D[0, j] = j \cdot \text{cost}_{\text{ins}}$$
  $$D[i, j] = \min \begin{cases}
  D[i-1, j] + 1 & \text{(Deletion)} \\
  D[i, j-1] + 1 & \text{(Insertion)} \\
  D[i-1, j-1] + (0 \text{ if } s_1[i-1] == s_2[j-1] \text{ else } 1) & \text{(Substitution)}
  \end{cases}$$
* **Traceback:** Traverses the $(N+1) \times (M+1)$ DP grid from $D[N, M]$ back to $D[0, 0]$ to pinpoint the exact sequence of substitutions, insertions, and deletions.
* **Normalized Similarity Score:**
  $$\text{Similarity Ratio} = 1.0 - \frac{\text{Edit Distance}}{\max(|s_1|, |s_2|)}$$
* **Time Complexity:** $O(N \times M)$
* **Space Complexity:** $O(N \times M)$ for full traceback matrix.

### D. Jaccard Similarity (N-gram Shingling)
* **Purpose:** Evaluates set-theoretic lexical overlap independent of word order.
* **Mechanism:** Decomposes text into contiguous $N$-gram shingles (e.g., bi-grams or tri-grams), generating sets $A$ and $B$:
  $$J(A, B) = \frac{|A \cap B|}{|A \cup B|}, \quad \text{Jaccard Distance } d_J(A, B) = 1 - J(A, B)$$
* **Time Complexity:** $O(N + M)$ for tokenization and hash-set operations.
* **Space Complexity:** $O(|A| + |B|)$.

### E. Cryptographic SHA-256 Duplicate Detector
* Computes dual SHA-256 hashes: raw binary bytes and whitespace-normalized text.
* Provides instantaneous $O(1)$ lookup for duplicate assignments or re-uploaded documents.

---

## 3. System Architecture & Directory Structure

```
DocuTrace1/
├── backend/
│   ├── app.py                # FastAPI REST Server & static file mounter
│   ├── algorithms/
│   │   ├── __init__.py
│   │   ├── kmp.py            # KMP algorithm with LPS tracking & search trace
│   │   ├── rabin_karp.py     # Rabin-Karp rolling hash & passage matcher
│   │   ├── edit_distance.py  # Levenshtein 2D DP matrix & traceback alignment
│   │   ├── jaccard.py        # N-gram shingling & set intersection/union math
│   │   └── hasher.py         # SHA-256 raw & normalized duplicate hasher
│   ├── core/
│   │   ├── text_extractor.py # PDF (pypdf), DOCX (python-docx), TXT parser
│   │   ├── preprocessor.py   # Sentence splitter, tokenization, anomaly scanner
│   │   ├── verifier.py       # Authenticity scoring, homoglyphs, metadata audit
│   │   └── engine.py         # Orchestrates comparisons & composite scoring
│   ├── samples/
│   │   └── sample_docs.py    # Preloaded scenarios (Smart Campus, certificates)
│   └── test_backend.py       # Comprehensive unit tests for all DAA algorithms
├── frontend/
│   ├── index.html            # Main UI with Dashboard, Compare, Verify, Benchmark, Visualizer
│   ├── css/
│   │   └── style.css         # Modern dark theme with glassmorphism & gradients
│   └── js/
│       ├── api.js            # Client API service
│       ├── visualizer.js     # Step-by-step visualizer (LPS, DP Matrix, Rolling Hash, Venn)
│       ├── charts.js         # Pure SVG benchmark curve generator
│       └── app.js            # Main controller & scenario runners
├── test_live_server.py       # HTTP integration test suite
├── start.bat                 # One-click Windows launcher
└── README.md                 # Complete DAA documentation
```

---

## 4. How to Run DocuTrace

### Step 1: Install Required Dependencies
Ensure Python 3.10+ is installed, open a terminal in the project root directory, and run:
```bash
pip install -r requirements.txt
```
*(Dependencies: `fastapi`, `uvicorn`, `python-multipart`, `reportlab`, `pypdf`, `python-docx`)*

### Step 2: Start the Application Server

* **Option A (One-Click Launcher for Windows):**
  Double-click `start.bat` in the project root directory.

* **Option B (Command Line in PowerShell / CMD):**
  ```bash
  python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
  ```

### Step 3: Open in Browser
Open your preferred web browser and go to:
```
http://127.0.0.1:8000/
```

---

## 5. User Upload & Analysis Workflow

DocuTrace starts with a clean, empty repository (0 documents), allowing you to upload and evaluate your own documents:

1. **Step 1: Upload Documents**
   - Navigate to the **Document Upload** tab.
   - Upload any two or more `.pdf`, `.docx`, or `.txt` documents (or paste text directly).
   - *Tip:* You can use sample test documents provided in the [`test_documents/`](./test_documents) folder.
   - The engine automatically extracts text, analyzes metadata, and generates SHA-256 cryptographic hashes.
2. **Step 2: Detect Exact Duplicates**
   - If an identical file is uploaded under a different name, the system flags it instantaneously in $O(1)$ time.
3. **Step 3: Plagiarism & Similarity Detection**
   - Go to the **Plagiarism Comparison** tab, select **Document A** (Reference) and **Document B** (Submitted).
   - Click **Run Comparison**.
   - The system executes multi-layer matching and calculates composite similarity and sentence alignments.
4. **Step 4: Sentence-by-Sentence PDF Inspection & Export**
   - Scroll down to the **Sentence-by-Sentence Plagiarism & Substitution Inspection** panel.
   - The interactive inspection report is rendered directly in **PDF Format** on your screen.
   - 🟢 **Copied duplicate text** is highlighted in green.
   - 🟡 **Substituted words** are highlighted in yellow/amber showing exact word replacements.
   - Click **Download PDF** to save the formal report to your computer, or **Open Fullscreen** to view in a dedicated browser tab.
   - You can also toggle to **Text Cards View** for collapsible text cards.
5. **Step 5: Authenticity Verification**
   - Go to the **Document Authenticity** tab to audit any certificate or document.
   - Evaluates digital signature presence, metadata timestamp consistency, and Unicode evasion (Cyrillic homoglyphs and zero-width spaces).
6. **Step 6: Performance Benchmark Laboratory**
   - Run empirical performance evaluations measuring execution times across varying document sizes (10 to 500+ words).
   - Generates the comparative analysis table and interactive SVG runtime scaling curves.
7. **Step 7: Interactive Analysis Visualizer**
   - Inspect phrase search tables, dynamic alignment matrices, window slides, and vocabulary overlap.

