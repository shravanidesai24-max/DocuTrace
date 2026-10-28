/**
 * DocuTrace DAA Algorithm Step-by-Step Visualizer
 * Renders LPS tables, DP matrices, rolling hash slides, and Venn sets.
 */

const visualizer = {
  container: null,

  init(containerId) {
    this.container = document.getElementById(containerId);
  },

  renderKMP(data) {
    if (!this.container) return;
    const lps = data.lps || [];
    const pattern = data.pattern || "";
    const matches = data.matches || [];
    const trace = data.search_trace || [];

    let html = `
      <div class="viz-section">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h4 style="color:var(--text-main); font-size:1.05rem; font-weight:700;">Knuth-Morris-Pratt (KMP) &pi; (LPS) Preprocessing Array</h4>
          <span class="complexity-tag" style="font-size:0.75rem;">Time: O(N + M) | Space: O(M)</span>
        </div>
        <p style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:1.25rem;">
          The LPS (Longest Proper Prefix which is also Suffix) array stores the length of the longest matching prefix for each prefix of the pattern. When a character mismatch occurs, the pattern pointer jumps to <code>lps[j-1]</code> rather than resetting to 0, eliminating text pointer backtracking.
        </p>

        <!-- LPS Array Grid Table -->
        <div class="lps-table-wrapper">
          <table class="lps-matrix-table">
            <tr>
              <td class="lps-cell lps-header">Index (i)</td>
              ${pattern.split("").map((_, idx) => `<td class="lps-cell lps-header">${idx}</td>`).join("")}
            </tr>
            <tr>
              <td class="lps-cell lps-char">Pattern[i]</td>
              ${pattern.split("").map(ch => `<td class="lps-cell lps-char">${ch === " " ? "&blank;" : ch}</td>`).join("")}
            </tr>
            <tr>
              <td class="lps-cell lps-val">LPS[i] (&pi;)</td>
              ${lps.map(val => `<td class="lps-cell lps-val">${val}</td>`).join("")}
            </tr>
          </table>
        </div>

        <!-- Search Results Summary -->
        <div class="algo-metric-row" style="margin-top:1.25rem; font-size:0.85rem;">
          <span>Occurrences Found: <strong style="color:var(--emerald);">${matches.length}</strong> at indices [${matches.join(", ")}]</span>
          <span>Total Comparisons: <strong style="color:var(--cyan);">${data.comparisons}</strong></span>
          <span>Pointer Shifts: <strong style="color:var(--amber);">${data.shifts}</strong></span>
          <span>Execution Time: <strong style="color:var(--text-main);">${data.time_ms} ms</strong></span>
        </div>

        <!-- Matching Step Trace Preview -->
        <h5 style="color:var(--text-main); font-size:0.9rem; font-weight:700; margin-top:1.5rem; margin-bottom:0.75rem;">Execution Trace Steps (First ${Math.min(trace.length, 12)} Steps):</h5>
        <div style="display:flex; flex-direction:column; gap:0.45rem; max-height:240px; overflow-y:auto;">
          ${trace.slice(0, 15).map(step => `
            <div style="background:#f8fafc; border:1px solid var(--border-subtle); padding:0.45rem 0.75rem; border-radius:6px; font-size:0.78rem; display:flex; justify-content:space-between; border-left:3px solid ${step.status === 'match' ? 'var(--cyan)' : (step.status === 'full_match' ? 'var(--emerald)' : 'var(--rose)')};">
              <span style="color:var(--text-main); font-weight:500;">Text Pos [${step.text_idx}] ('${step.char_text || ''}') vs Pat [${step.pat_idx}] ('${step.char_pat || ''}')</span>
              <span style="color:${step.status === 'match' ? 'var(--cyan)' : (step.status === 'full_match' ? 'var(--emerald)' : 'var(--text-muted)')}; font-weight:600;">${step.action}</span>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    this.container.innerHTML = html;
  },

  renderRabinKarp(data) {
    if (!this.container) return;
    const steps = data.trace_steps || [];
    const patternHash = data.pattern_hash;

    let html = `
      <div class="viz-section">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h4 style="color:var(--text-main); font-size:1.05rem; font-weight:700;">Rabin-Karp Rolling Polynomial Hash</h4>
          <span class="complexity-tag" style="font-size:0.75rem;">Average: O(N + M) | Worst: O(N &times; M)</span>
        </div>
        <p style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:1rem;">
          Calculates hash of a sliding window in O(1) time using Horner's rolling polynomial scheme: <code>H<sub>i+1</sub> = (base &times; (H<sub>i</sub> - text[i]&times;h) + text[i+m]) % prime</code>. Full string comparison is only performed when hashes match.
        </p>

        <div style="background:#f8fafc; border:1px solid var(--border-subtle); border-radius:8px; padding:0.85rem; margin-bottom:1.25rem; display:flex; gap:1.5rem; flex-wrap:wrap; font-size:0.82rem; color:var(--text-main);">
          <div>Pattern: <strong style="color:var(--cyan);">${data.pattern}</strong></div>
          <div>Pattern Hash: <strong style="color:#4338ca; font-family:var(--font-mono);">${patternHash}</strong></div>
          <div>Hash Base: <strong>${data.base}</strong></div>
          <div>Mod Prime: <strong>${data.prime}</strong></div>
          <div>Matches Found: <strong style="color:var(--emerald);">${data.match_count}</strong></div>
          <div>Spurious Collisions: <strong style="color:var(--amber);">${data.spurious_hits}</strong></div>
        </div>

        <h5 style="color:var(--text-main); font-size:0.9rem; font-weight:700; margin-bottom:0.75rem;">Sliding Window Hashes:</h5>
        <div class="rk-slide-viewer" style="max-height:300px; overflow-y:auto;">
          ${steps.slice(0, 25).map(step => `
            <div class="rk-step-row ${step.exact_match ? 'is-match' : ''}">
              <span style="color:var(--text-muted); width:60px;">Win [${step.window_idx}]</span>
              <span class="rk-window-text">"${step.window_text}"</span>
              <span class="rk-hash-badge">Hash: ${step.window_hash}</span>
              ${step.exact_match ? 
                '<span style="color:var(--emerald); font-weight:700; margin-left:auto;">[EXACT MATCH]</span>' : 
                (step.spurious_hit ? 
                  '<span style="color:var(--amber); font-weight:700; margin-left:auto;">[COLLISION / SPURIOUS]</span>' : 
                  '<span style="color:var(--text-muted); margin-left:auto;">Hash Mismatch</span>')}
            </div>
          `).join("")}
        </div>
      </div>
    `;

    this.container.innerHTML = html;
  },

  renderEditDistance(data) {
    if (!this.container) return;
    const matrixData = data.dp_matrix;
    const ops = data.operations || {};
    const alignment = data.alignment || [];

    let matrixHtml = "";
    if (matrixData && matrixData.matrix) {
      const rows = matrixData.row_headers;
      const cols = matrixData.col_headers;
      const mat = matrixData.matrix;
      const pathSet = new Set(matrixData.path.map(p => `${p[0]},${p[1]}`));

      matrixHtml = `
        <div class="dp-matrix-container">
          <table class="dp-table">
            <thead>
              <tr>
                <th>&epsilon;</th>
                ${cols.map(c => `<th>${c}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${rows.map((r, i) => `
                <tr>
                  <th>${r}</th>
                  ${mat[i].map((val, j) => {
                    const isPath = pathSet.has(`${i},${j}`);
                    return `<td class="dp-cell ${isPath ? 'in-path' : ''}">${val}</td>`;
                  }).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    } else {
      matrixHtml = `
        <p style="color:var(--text-muted); font-size:0.85rem; padding:1.5rem; text-align:center;">
          (Full DP Matrix omitted because text size exceeds 40 tokens; traceback and alignment shown below)
        </p>
      `;
    }

    let html = `
      <div class="viz-section">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h4 style="color:var(--text-main); font-size:1.05rem; font-weight:700;">Levenshtein Edit Distance (2D Dynamic Programming Grid)</h4>
          <span class="complexity-tag" style="font-size:0.75rem;">Time: O(N &times; M) | Space: O(N &times; M)</span>
        </div>
        <p style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:1rem;">
          Cell <code>D[i, j]</code> represents the minimum operations (insertions, deletions, substitutions) to convert prefix <code>s1[1..i]</code> into <code>s2[1..j]</code>. The highlighted green cells trace the optimal transformation path from <code>D[0,0]</code> to <code>D[N,M]</code>.
        </p>

        <div style="background:#f8fafc; border:1px solid var(--border-subtle); border-radius:8px; padding:0.85rem; margin-bottom:1.25rem; display:flex; gap:1.5rem; flex-wrap:wrap; font-size:0.82rem; color:var(--text-main);">
          <div>Edit Distance: <strong style="color:var(--amber);">${data.edit_distance}</strong></div>
          <div>Similarity: <strong style="color:var(--emerald);">${data.similarity_percentage}%</strong></div>
          <div>Matches: <strong style="color:var(--cyan);">${ops.matches || 0}</strong></div>
          <div>Substitutions: <strong style="color:var(--rose);">${ops.substitutions || 0}</strong></div>
          <div>Insertions: <strong style="color:var(--amber);">${ops.insertions || 0}</strong></div>
          <div>Deletions: <strong style="color:var(--amber);">${ops.deletions || 0}</strong></div>
          <div>DP Cell Computations: <strong>${data.cell_computations}</strong></div>
        </div>

        ${matrixHtml}

        <h5 style="color:var(--text-main); font-size:0.9rem; font-weight:700; margin-top:1.5rem; margin-bottom:0.75rem;">Optimal Sequence Alignment Traceback:</h5>
        <div style="display:flex; flex-wrap:wrap; gap:0.5rem; max-height:180px; overflow-y:auto; padding:0.65rem; background:#f8fafc; border:1px solid var(--border-subtle); border-radius:6px;">
          ${alignment.map(item => `
            <span style="font-size:0.78rem; font-family:var(--font-mono); padding:0.25rem 0.5rem; border-radius:4px; ${
              item.type === 'equal' ? 'background:#ecfdf5; color:#047857; border:1px solid #a7f3d0;' :
              (item.type === 'substitution' ? 'background:#fffbeb; color:#b45309; border:1px solid #fde68a;' :
              'background:#fff1f2; color:#be123c; border:1px solid #fecdd3;')
            }">
              ${item.token1 || '&empty;'} &rarr; ${item.token2 || '&empty;'} (${item.type})
            </span>
          `).join("")}
        </div>
      </div>
    `;

    this.container.innerHTML = html;
  },

  renderJaccard(data) {
    if (!this.container) return;

    let html = `
      <div class="viz-section">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h4 style="color:var(--text-main); font-size:1.05rem; font-weight:700;">Jaccard Similarity & Shingle Set Overlap</h4>
          <span class="complexity-tag" style="font-size:0.75rem;">Time: O(N + M) | Space: O(|A| + |B|)</span>
        </div>
        <p style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:1rem;">
          Breaks down documents into ${data.n_gram}-gram word shingles. The Jaccard Index computes the ratio of the intersection set over the union set: <code>J(A, B) = |A &cap; B| / |A &cup; B|</code>.
        </p>

        <div style="background:#f8fafc; border:1px solid var(--border-subtle); border-radius:8px; padding:0.85rem; margin-bottom:1.25rem; display:flex; gap:1.5rem; flex-wrap:wrap; font-size:0.85rem; color:var(--text-main);">
          <div>Formula: <strong style="color:var(--cyan); font-family:var(--font-mono);">${data.formula}</strong></div>
          <div>Jaccard Similarity: <strong style="color:var(--emerald);">${data.similarity_percentage}%</strong></div>
          <div>Jaccard Distance: <strong style="color:var(--amber);">${data.jaccard_distance}</strong></div>
          <div>Time Taken: <strong>${data.time_ms} ms</strong></div>
        </div>

        <div class="venn-container">
          <div class="venn-card-box">
            <div class="venn-card-title">
              <span style="color:var(--cyan);">Set A Shingles</span>
              <span class="complexity-tag">|A| = ${data.cardinality_A}</span>
            </div>
            <div class="shingle-tokens-cloud">
              ${(data.unique_to_A_samples || []).map(s => `<span class="shingle-tag">"${s}"</span>`).join("")}
              ${(data.unique_to_A_samples || []).length === 0 ? '<span style="color:var(--text-muted); font-size:0.8rem;">No unique shingles to Set A</span>' : ''}
            </div>
          </div>

          <div class="venn-card-box" style="border-color:var(--emerald-border); background:#f0fdf4;">
            <div class="venn-card-title">
              <span style="color:var(--emerald);">Intersection (A &cap; B)</span>
              <span class="complexity-tag" style="color:var(--emerald); background:#d1fae5;">|A &cap; B| = ${data.cardinality_intersection}</span>
            </div>
            <div class="shingle-tokens-cloud">
              ${(data.shared_samples || []).map(s => `<span class="shingle-tag intersect">"${s}"</span>`).join("")}
              ${(data.shared_samples || []).length === 0 ? '<span style="color:var(--text-muted); font-size:0.8rem;">No common shingles</span>' : ''}
            </div>
          </div>

          <div class="venn-card-box">
            <div class="venn-card-title">
              <span style="color:var(--amber);">Set B Shingles</span>
              <span class="complexity-tag">|B| = ${data.cardinality_B}</span>
            </div>
            <div class="shingle-tokens-cloud">
              ${(data.unique_to_B_samples || []).map(s => `<span class="shingle-tag">"${s}"</span>`).join("")}
              ${(data.unique_to_B_samples || []).length === 0 ? '<span style="color:var(--text-muted); font-size:0.8rem;">No unique shingles to Set B</span>' : ''}
            </div>
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
  }
};
