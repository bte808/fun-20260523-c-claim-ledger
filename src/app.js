import { analyzeLedger, exportMarkdown, sampleDraft, sampleEvidence } from "./logic.js";

const draftInput = document.querySelector("#draft-input");
const evidenceInput = document.querySelector("#evidence-input");
const analyzeButton = document.querySelector("#analyze-button");
const sampleButton = document.querySelector("#sample-button");
const clearButton = document.querySelector("#clear-button");
const copyButton = document.querySelector("#copy-button");
const downloadButton = document.querySelector("#download-button");
const statusLine = document.querySelector("#status-line");
const statsGrid = document.querySelector("#stats-grid");
const ledgerBody = document.querySelector("#ledger-body");
const mobileLedger = document.querySelector("#mobile-ledger");
const filterStrip = document.querySelector("#filter-strip");
const evidenceList = document.querySelector("#evidence-list");
const exportOutput = document.querySelector("#export-output");
const barSegments = document.querySelector("#bar-segments");

let currentMarkdown = "";
let currentAnalysis = null;
let activeFilter = "all";

const filterOptions = [
  ["all", "All"],
  ["needs-source", "Needs source"],
  ["candidate", "Candidate"],
  ["linked", "Linked"],
  ["context", "Context"]
];

function loadSample() {
  activeFilter = "all";
  draftInput.value = sampleDraft;
  evidenceInput.value = sampleEvidence;
  runAnalysis();
}

function clearAll() {
  activeFilter = "all";
  draftInput.value = "";
  evidenceInput.value = "";
  runAnalysis();
  draftInput.focus();
}

function runAnalysis() {
  const analysis = analyzeLedger(draftInput.value, evidenceInput.value);
  currentAnalysis = analysis;
  currentMarkdown = exportMarkdown(analysis);
  renderSummary(analysis);
  renderFilters(analysis);
  renderLedger(analysis);
  renderEvidence(analysis);
  exportOutput.value = currentMarkdown;
  const hasClaims = analysis.summary.total > 0;
  copyButton.disabled = !hasClaims;
  downloadButton.disabled = !hasClaims;
  updateStatusLine(analysis);
}

function updateStatusLine(analysis) {
  const hasClaims = analysis.summary.total > 0;
  if (!hasClaims) {
    statusLine.textContent = "Paste a draft and evidence notes, or load the sample to start.";
    return;
  }

  const sourceCount = analysis.summary.counts["needs-source"];
  const warningSuffix = analysis.summary.warningCount
    ? ` ${analysis.summary.warningCount} evidence or claim caution${
        analysis.summary.warningCount === 1 ? "" : "s"
      } need review.`
    : "";
  const filterLabel = filterOptions.find(([key]) => key === activeFilter)?.[1] || "Filtered";
  const rows = getFilteredRows(analysis);
  const filterPrefix = activeFilter === "all" ? "" : `${rows.length} ${filterLabel.toLowerCase()} ${rows.length === 1 ? "claim" : "claims"} shown. `;
  statusLine.textContent = `${filterPrefix}${analysis.summary.total} claims reviewed. ${sourceCount} ${
    sourceCount === 1 ? "claim needs" : "claims need"
  } a source before reuse.${warningSuffix}`;
}

function renderSummary(analysis) {
  const { counts, riskScore, total, evidenceCount } = analysis.summary;
  const statItems = [
    ["Claims", total, "Sentences treated as reviewable claims."],
    ["Evidence", evidenceCount, "Source notes available in the ledger."],
    ["Linked", counts.linked, "Claims that explicitly cite a record."],
    ["Needs source", counts["needs-source"], "Strong claims without a visible source link."],
    ["Warnings", analysis.summary.warningCount, "Evidence or claim cautions that need review."],
    ["Risk score", `${riskScore}%`, "Higher means more claims need source review."]
  ];

  statsGrid.innerHTML = statItems
    .map(
      ([label, value, hint]) => `
        <article class="stat">
          <span>${label}</span>
          <strong>${value}</strong>
          <small>${hint}</small>
        </article>
      `
    )
    .join("");

  const segmentItems = [
    ["good", counts.linked, "Linked"],
    ["watch", counts.candidate, "Candidate"],
    ["risk", counts["needs-source"], "Needs source"],
    ["quiet", counts.context, "Context"]
  ];

  barSegments.innerHTML = segmentItems
    .map(([tone, value, label]) => {
      const width = total ? Math.max(3, Math.round((value / total) * 100)) : 25;
      return `<span class="bar-segment ${tone}" style="width: ${width}%" title="${label}: ${value}"></span>`;
    })
    .join("");
}

function renderLedger(analysis) {
  const rows = getFilteredRows(analysis);
  if (!rows.length) {
    const emptyText = analysis.rows.length ? "No claims match this filter." : "No claims yet.";
    ledgerBody.innerHTML = `<tr><td colspan="5" class="empty">${emptyText}</td></tr>`;
    mobileLedger.innerHTML = `<p class="empty">${emptyText}</p>`;
    return;
  }

  ledgerBody.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td><span class="claim-id">${row.id}</span></td>
          <td><span class="pill ${row.status.tone}">${row.status.label}</span></td>
          <td>${escapeHtml(row.text)}</td>
          <td>${renderEvidenceBadges(row)}</td>
          <td>${renderPromptCell(row)}</td>
        </tr>
      `
    )
    .join("");

  mobileLedger.innerHTML = rows
    .map(
      (row) => `
        <article class="claim-card">
          <div class="claim-card-header">
            <span class="claim-id">${row.id}</span>
            <span class="pill ${row.status.tone}">${row.status.label}</span>
          </div>
          <p>${escapeHtml(row.text)}</p>
          <div class="badge-row">${renderEvidenceBadges(row)}</div>
          ${renderRowDiagnostics(row)}
          <small>${escapeHtml(row.prompt)}</small>
        </article>
      `
    )
    .join("");
}

function renderFilters(analysis) {
  const countFor = (key) => (key === "all" ? analysis.summary.total : analysis.summary.counts[key] || 0);
  filterStrip.innerHTML = filterOptions
    .map(([key, label]) => {
      const active = key === activeFilter;
      return `
        <button
          type="button"
          class="filter-chip ${active ? "active" : ""}"
          data-filter="${key}"
          aria-pressed="${active}"
        >
          <span>${label}</span>
          <strong>${countFor(key)}</strong>
        </button>
      `;
    })
    .join("");
}

function getFilteredRows(analysis) {
  if (activeFilter === "all") {
    return analysis.rows;
  }
  return analysis.rows.filter((row) => row.status.key === activeFilter);
}

function renderEvidenceBadges(row) {
  const direct = row.mentionedEvidenceIds.map((id) => `<span class="evidence-badge direct">${escapeHtml(id)}</span>`);
  const directIds = new Set(row.mentionedEvidenceIds);
  const suggested = row.suggestedEvidence
    .filter((item) => !directIds.has(item.id))
    .map((item) => `<span class="evidence-badge suggested">${escapeHtml(item.id)}?</span>`);
  return [...direct, ...suggested].join("") || `<span class="muted">none</span>`;
}

function renderEvidence(analysis) {
  if (!analysis.evidence.length) {
    evidenceList.innerHTML = `<p class="empty">No evidence records yet.</p>`;
    return;
  }

  const unusedIds = new Set(analysis.summary.unusedEvidence.map((item) => item.id));
  evidenceList.innerHTML = analysis.evidence
    .map(
      (item) => `
        <article class="evidence-item ${unusedIds.has(item.id) ? "unused" : ""}">
          <div>
            <strong>${escapeHtml(item.id)}</strong>
            <span>${escapeHtml(item.label)}</span>
          </div>
          <p>${escapeHtml(item.text)}</p>
          ${renderEvidenceFlags(item)}
        </article>
      `
    )
    .join("");
}

async function copyMarkdown() {
  try {
    await navigator.clipboard.writeText(currentMarkdown);
    statusLine.textContent = "Markdown copied to clipboard.";
  } catch {
    exportOutput.focus();
    exportOutput.select();
    statusLine.textContent = "Clipboard blocked. Select the export box manually.";
  }
}

function downloadMarkdown() {
  const blob = new Blob([currentMarkdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "claim-ledger.md";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  statusLine.textContent = "Markdown file prepared for download.";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderPromptCell(row) {
  return `${renderRowDiagnostics(row)}<div>${escapeHtml(row.prompt)}</div>`;
}

function renderRowDiagnostics(row) {
  if (!row.diagnostics.length) {
    return "";
  }

  return `
    <div class="note-list">
      ${row.diagnostics
        .map((diagnostic) => `<p class="row-note">${escapeHtml(diagnostic.message)}</p>`)
        .join("")}
    </div>
  `;
}

function renderEvidenceFlags(item) {
  if (!item.qualityFlags.length) {
    return "";
  }

  return `
    <div class="mini-badges">
      ${item.qualityFlags
        .map((flag) => `<span class="quality-badge">${escapeHtml(flag.label)}</span>`)
        .join("")}
    </div>
  `;
}

analyzeButton.addEventListener("click", runAnalysis);
sampleButton.addEventListener("click", loadSample);
clearButton.addEventListener("click", clearAll);
copyButton.addEventListener("click", copyMarkdown);
downloadButton.addEventListener("click", downloadMarkdown);
draftInput.addEventListener("input", runAnalysis);
evidenceInput.addEventListener("input", runAnalysis);
filterStrip.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-filter]");
  if (!button || !currentAnalysis) {
    return;
  }
  activeFilter = button.dataset.filter;
  renderFilters(currentAnalysis);
  renderLedger(currentAnalysis);
  updateStatusLine(currentAnalysis);
});

initializeApp();

function initializeApp() {
  if (draftInput.value.trim() || evidenceInput.value.trim()) {
    runAnalysis();
    return;
  }
  loadSample();
}
