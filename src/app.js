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
const evidenceList = document.querySelector("#evidence-list");
const exportOutput = document.querySelector("#export-output");
const barSegments = document.querySelector("#bar-segments");

let currentMarkdown = "";

function loadSample() {
  draftInput.value = sampleDraft;
  evidenceInput.value = sampleEvidence;
  runAnalysis();
}

function clearAll() {
  draftInput.value = "";
  evidenceInput.value = "";
  runAnalysis();
  draftInput.focus();
}

function runAnalysis() {
  const analysis = analyzeLedger(draftInput.value, evidenceInput.value);
  currentMarkdown = exportMarkdown(analysis);
  renderSummary(analysis);
  renderLedger(analysis);
  renderEvidence(analysis);
  exportOutput.value = currentMarkdown;
  const hasClaims = analysis.summary.total > 0;
  copyButton.disabled = !hasClaims;
  downloadButton.disabled = !hasClaims;
  const sourceCount = analysis.summary.counts["needs-source"];
  statusLine.textContent = hasClaims
    ? `${analysis.summary.total} claims reviewed. ${sourceCount} ${sourceCount === 1 ? "claim needs" : "claims need"} a source before reuse.`
    : "Paste a draft and evidence notes, or load the sample to start.";
}

function renderSummary(analysis) {
  const { counts, riskScore, total, evidenceCount } = analysis.summary;
  const statItems = [
    ["Claims", total, "Sentences treated as reviewable claims."],
    ["Evidence", evidenceCount, "Source notes available in the ledger."],
    ["Linked", counts.linked, "Claims that explicitly cite a record."],
    ["Needs source", counts["needs-source"], "Strong claims without a visible source link."],
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
  if (!analysis.rows.length) {
    ledgerBody.innerHTML = `<tr><td colspan="5" class="empty">No claims yet.</td></tr>`;
    mobileLedger.innerHTML = `<p class="empty">No claims yet.</p>`;
    return;
  }

  ledgerBody.innerHTML = analysis.rows
    .map(
      (row) => `
        <tr>
          <td><span class="claim-id">${row.id}</span></td>
          <td><span class="pill ${row.status.tone}">${row.status.label}</span></td>
          <td>${escapeHtml(row.text)}</td>
          <td>${renderEvidenceBadges(row)}</td>
          <td>${escapeHtml(row.prompt)}</td>
        </tr>
      `
    )
    .join("");

  mobileLedger.innerHTML = analysis.rows
    .map(
      (row) => `
        <article class="claim-card">
          <div class="claim-card-header">
            <span class="claim-id">${row.id}</span>
            <span class="pill ${row.status.tone}">${row.status.label}</span>
          </div>
          <p>${escapeHtml(row.text)}</p>
          <div class="badge-row">${renderEvidenceBadges(row)}</div>
          <small>${escapeHtml(row.prompt)}</small>
        </article>
      `
    )
    .join("");
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

analyzeButton.addEventListener("click", runAnalysis);
sampleButton.addEventListener("click", loadSample);
clearButton.addEventListener("click", clearAll);
copyButton.addEventListener("click", copyMarkdown);
downloadButton.addEventListener("click", downloadMarkdown);
draftInput.addEventListener("input", runAnalysis);
evidenceInput.addEventListener("input", runAnalysis);

loadSample();
