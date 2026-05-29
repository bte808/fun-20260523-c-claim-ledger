import { analyzeLedger, exportMarkdown, parseEvidence, sampleDraft, sampleEvidence } from "../src/logic.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const analysis = analyzeLedger(sampleDraft, sampleEvidence);

assert(analysis.summary.total >= 4, "sample should produce at least four claim rows");
assert(analysis.summary.evidenceCount === 3, "sample should parse three evidence records");
assert(analysis.summary.counts.linked >= 2, "sample should detect linked evidence records");
assert(analysis.summary.counts.candidate >= 1, "sample should detect at least one candidate match");
assert(analysis.summary.counts["needs-source"] >= 1, "sample should flag at least one unsupported strong claim");
assert(analysis.rows.some((row) => row.suggestedEvidence.length > 0), "sample should suggest candidate evidence");

const markdown = exportMarkdown(analysis);
assert(markdown.includes("# Claim Ledger"), "export should include a title");
assert(markdown.includes("Generated locally"), "export should include the local-review warning");
assert(markdown.includes("## Review Warnings"), "export should include a review warnings section");
assert(markdown.includes("| ID | Status | Claim | Evidence | Revision prompt |"), "export should include ledger table");

const custom = analyzeLedger(
  "The method improves recall [S1]. This claim proves every learner will benefit.",
  "S1 | Test source | The source says recall improved in one small classroom example."
);

assert(custom.summary.counts.linked === 1, "custom citation should link to S1");
assert(custom.summary.counts["needs-source"] === 1, "universal unsupported claim should need a source");
assert(custom.summary.rowWarnings.length >= 1, "limited linked evidence should surface a claim caution");
assert(custom.rows[0].diagnostics.length >= 1, "linked strong claim should include at least one diagnostic");

const parsedEvidence = parseEvidence(
  "E1 | | Brief note\nE1 | Duplicate source | Synthetic example note, not a real citation."
);

assert(parsedEvidence[0].qualityFlags.some((flag) => flag.key === "missing-label"), "blank labels should be flagged");
assert(parsedEvidence[0].qualityFlags.some((flag) => flag.key === "low-detail"), "brief excerpts should be flagged");
assert(parsedEvidence.every((item) => item.qualityFlags.some((flag) => flag.key === "duplicate-id")), "duplicate IDs should be flagged");
assert(parsedEvidence[1].qualityFlags.some((flag) => flag.key === "placeholder"), "sample-like evidence should be flagged");

console.log("Smoke tests passed: claim parsing, evidence linking, warning flags, status counts, and Markdown export.");
