/**
 * DocuTrace DAA Benchmark Chart Renderer (Pure SVG)
 * Renders runtime curves comparing KMP vs Rabin-Karp, and Edit Distance vs Jaccard.
 */

const benchmarkCharts = {
  renderMatchingChart(svgId, results) {
    const svg = document.getElementById(svgId);
    if (!svg || !results || results.length === 0) return;

    const width = 500;
    const height = 240;
    const padding = { top: 25, right: 30, bottom: 40, left: 60 };

    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Determine max values for scaling
    const maxWords = Math.max(...results.map(r => r.num_words), 100);
    const maxTime = Math.max(...results.flatMap(r => [r.kmp_time_ms, r.rabin_karp_time_ms]), 0.05) * 1.2;

    const scaleX = (val) => padding.left + (val / maxWords) * chartW;
    const scaleY = (val) => padding.top + chartH - (val / maxTime) * chartH;

    // Generate points
    const kmpPoints = results.map(r => `${scaleX(r.num_words)},${scaleY(r.kmp_time_ms)}`).join(" ");
    const rkPoints = results.map(r => `${scaleX(r.num_words)},${scaleY(r.rabin_karp_time_ms)}`).join(" ");

    let svgHtml = `
      <!-- Grid Lines -->
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="#cbd5e1" stroke-width="1.5"/>
      <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="#cbd5e1" stroke-width="1.5"/>
      
      <!-- Horizontal reference lines -->
      <line x1="${padding.left}" y1="${scaleY(maxTime / 2)}" x2="${width - padding.right}" y2="${scaleY(maxTime / 2)}" stroke="#e2e8f0" stroke-dasharray="4"/>
      <line x1="${padding.left}" y1="${scaleY(maxTime)}" x2="${width - padding.right}" y2="${scaleY(maxTime)}" stroke="#e2e8f0" stroke-dasharray="4"/>

      <!-- Y Axis Labels -->
      <text x="${padding.left - 10}" y="${height - padding.bottom}" fill="#64748b" font-size="10" font-weight="600" text-anchor="end">0 ms</text>
      <text x="${padding.left - 10}" y="${scaleY(maxTime / 2)}" fill="#64748b" font-size="10" font-weight="600" text-anchor="end">${(maxTime / 2).toFixed(2)} ms</text>
      <text x="${padding.left - 10}" y="${scaleY(maxTime) + 4}" fill="#64748b" font-size="10" font-weight="600" text-anchor="end">${maxTime.toFixed(2)} ms</text>

      <!-- Curves -->
      <polyline fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" points="${kmpPoints}"/>
      <polyline fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" points="${rkPoints}"/>

      <!-- Data Dots -->
      ${results.map(r => `
        <circle cx="${scaleX(r.num_words)}" cy="${scaleY(r.kmp_time_ms)}" r="4.5" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>
        <circle cx="${scaleX(r.num_words)}" cy="${scaleY(r.rabin_karp_time_ms)}" r="4.5" fill="#6366f1" stroke="#ffffff" stroke-width="2"/>
        <!-- X Axis Label -->
        <text x="${scaleX(r.num_words)}" y="${height - padding.bottom + 16}" fill="#64748b" font-size="10" font-weight="600" text-anchor="middle">${r.num_words}</text>
      `).join("")}

      <!-- X Axis Title -->
      <text x="${width / 2}" y="${height - 6}" fill="#475569" font-size="11" font-weight="600" text-anchor="middle">Input Document Size (Words)</text>

      <!-- Legend -->
      <rect x="${width - 165}" y="10" width="10" height="10" rx="2" fill="#0284c7"/>
      <text x="${width - 150}" y="19" fill="#0f172a" font-size="11" font-weight="600">KMP O(N+M)</text>

      <rect x="${width - 85}" y="10" width="10" height="10" rx="2" fill="#6366f1"/>
      <text x="${width - 70}" y="19" fill="#0f172a" font-size="11" font-weight="600">Rabin-Karp</text>
    `;

    svg.innerHTML = svgHtml;
  },

  renderSimilarityChart(svgId, results) {
    const svg = document.getElementById(svgId);
    if (!svg || !results || results.length === 0) return;

    const width = 500;
    const height = 240;
    const padding = { top: 25, right: 30, bottom: 40, left: 60 };

    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxWords = Math.max(...results.map(r => r.num_words), 100);
    const maxTime = Math.max(...results.flatMap(r => [r.edit_distance_time_ms, r.jaccard_time_ms]), 0.5) * 1.25;

    const scaleX = (val) => padding.left + (val / maxWords) * chartW;
    const scaleY = (val) => padding.top + chartH - (val / maxTime) * chartH;

    const edPoints = results.map(r => `${scaleX(r.num_words)},${scaleY(r.edit_distance_time_ms)}`).join(" ");
    const jacPoints = results.map(r => `${scaleX(r.num_words)},${scaleY(r.jaccard_time_ms)}`).join(" ");

    let svgHtml = `
      <!-- Grid Lines -->
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="#cbd5e1" stroke-width="1.5"/>
      <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="#cbd5e1" stroke-width="1.5"/>
      
      <!-- Horizontal reference lines -->
      <line x1="${padding.left}" y1="${scaleY(maxTime / 2)}" x2="${width - padding.right}" y2="${scaleY(maxTime / 2)}" stroke="#e2e8f0" stroke-dasharray="4"/>
      <line x1="${padding.left}" y1="${scaleY(maxTime)}" x2="${width - padding.right}" y2="${scaleY(maxTime)}" stroke="#e2e8f0" stroke-dasharray="4"/>

      <!-- Y Axis Labels -->
      <text x="${padding.left - 10}" y="${height - padding.bottom}" fill="#64748b" font-size="10" font-weight="600" text-anchor="end">0 ms</text>
      <text x="${padding.left - 10}" y="${scaleY(maxTime / 2)}" fill="#64748b" font-size="10" font-weight="600" text-anchor="end">${(maxTime / 2).toFixed(1)} ms</text>
      <text x="${padding.left - 10}" y="${scaleY(maxTime) + 4}" fill="#64748b" font-size="10" font-weight="600" text-anchor="end">${maxTime.toFixed(1)} ms</text>

      <!-- Curves -->
      <polyline fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" points="${edPoints}"/>
      <polyline fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" points="${jacPoints}"/>

      <!-- Data Dots -->
      ${results.map(r => `
        <circle cx="${scaleX(r.num_words)}" cy="${scaleY(r.edit_distance_time_ms)}" r="4.5" fill="#d97706" stroke="#ffffff" stroke-width="2"/>
        <circle cx="${scaleX(r.num_words)}" cy="${scaleY(r.jaccard_time_ms)}" r="4.5" fill="#059669" stroke="#ffffff" stroke-width="2"/>
        <!-- X Axis Label -->
        <text x="${scaleX(r.num_words)}" y="${height - padding.bottom + 16}" fill="#64748b" font-size="10" font-weight="600" text-anchor="middle">${r.num_words}</text>
      `).join("")}

      <!-- X Axis Title -->
      <text x="${width / 2}" y="${height - 6}" fill="#475569" font-size="11" font-weight="600" text-anchor="middle">Input Document Size (Words)</text>

      <!-- Legend -->
      <rect x="${width - 175}" y="10" width="10" height="10" rx="2" fill="#d97706"/>
      <text x="${width - 160}" y="19" fill="#0f172a" font-size="11" font-weight="600">Edit Dist O(NM)</text>

      <rect x="${width - 80}" y="10" width="10" height="10" rx="2" fill="#059669"/>
      <text x="${width - 65}" y="19" fill="#0f172a" font-size="11" font-weight="600">Jaccard</text>
    `;

    svg.innerHTML = svgHtml;
  }
};
