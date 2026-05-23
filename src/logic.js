export const sampleDraft = `Short, synthetic example for a learning-science reflection:

Spacing practice sessions across several days improves later recall compared with doing all review in one block [E1]. In my course notes, the hardest concepts were not the longest sections but the ones where I had no retrieval question. Informal observation notes suggest question prompts shifted review time from rereading to checking answers. A two-column review sheet can reduce rereading because it forces each claim to connect to a prompt or source [E2]. Therefore, next week I should turn every weak paragraph into one claim, one cue, and one piece of evidence. This plan will guarantee higher exam scores for every learner.`;

export const sampleEvidence = `E1 | Example reading note | The reading summary says spaced practice tends to support longer-term recall better than massed review. This is an example note, not a real citation.
E2 | Synthetic class-observation note | When each paragraph had a question beside it, the student spent less time rereading and more time checking whether the answer was supported.
E3 | Example limitation note | The observation was informal and should not be treated as a general conclusion without a stronger source.`;

const stopWords = new Set([
  "about",
  "across",
  "after",
  "all",
  "also",
  "and",
  "any",
  "are",
  "because",
  "before",
  "being",
  "between",
  "but",
  "can",
  "claim",
  "could",
  "during",
  "each",
  "evidence",
  "every",
  "for",
  "from",
  "had",
  "has",
  "have",
  "into",
  "later",
  "more",
  "most",
  "much",
  "next",
  "not",
  "only",
  "one",
  "our",
  "other",
  "over",
  "source",
  "same",
  "should",
  "than",
  "that",
  "the",
  "their",
  "there",
  "these",
  "this",
  "those",
  "through",
  "under",
  "using",
  "where",
  "which",
  "while",
  "with",
  "without",
  "would",
  "your",
  "were",
  "will"
]);

const strongClaimPattern =
  /\b(always|argues|better|causes|compared|conclude|demonstrates|effective|forces|higher|improves|increases|indicates|less|lower|must|never|proves|reduces|significant|shows|suggest|suggests|therefore|worse)\b|\b\d+(?:\.\d+)?\s?(?:%|x|times)?\b/i;

export function normalizeTokens(text) {
  return Array.from(
    new Set(
      String(text)
        .toLowerCase()
        .replace(/[\[\](),.;:!?'"`/\\]/g, " ")
        .split(/\s+/)
        .map((token) => token.replace(/[^a-z0-9-]/g, ""))
        .filter((token) => token.length > 2 && !stopWords.has(token))
    )
  );
}

export function splitClaims(draft) {
  return String(draft)
    .replace(/\r/g, "")
    .split(/\n+/)
    .flatMap((paragraph) => paragraph.match(/[^.!?。！？]+[.!?。！？]?/g) || [])
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 20 && /[a-z0-9]/i.test(sentence))
    .map((text, index) => ({
      id: `C${index + 1}`,
      text,
      strong: strongClaimPattern.test(text)
    }));
}

export function parseEvidence(input) {
  return String(input)
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const pipeParts = line.split("|").map((part) => part.trim());
      if (pipeParts.length >= 3) {
        return makeEvidence(pipeParts[0], pipeParts[1], pipeParts.slice(2).join(" | "), index);
      }

      const keyed = line.match(/^([A-Za-z][A-Za-z0-9_-]{0,12}|\d{1,3})\s*[:\-]\s*(.+)$/);
      if (keyed) {
        return makeEvidence(keyed[1], `Evidence ${keyed[1]}`, keyed[2], index);
      }

      return makeEvidence(`E${index + 1}`, `Evidence ${index + 1}`, line, index);
    });
}

function makeEvidence(rawId, rawLabel, rawText, index) {
  const id = sanitizeId(rawId || `E${index + 1}`);
  const label = String(rawLabel || `Evidence ${id}`).slice(0, 80);
  const text = String(rawText || "").trim();
  return {
    id,
    label,
    text,
    tokens: normalizeTokens(`${label} ${text}`)
  };
}

function sanitizeId(value) {
  const cleaned = String(value).trim().replace(/[^A-Za-z0-9_-]/g, "");
  return cleaned || "E";
}

function findMentionedEvidenceIds(text, evidenceItems) {
  const haystack = String(text).toLowerCase();
  return evidenceItems
    .filter((item) => {
      const id = item.id.toLowerCase();
      return (
        haystack.includes(`[${id}]`) ||
        haystack.includes(`(${id})`) ||
        new RegExp(`\\b${escapeRegExp(id)}\\b`, "i").test(text)
      );
    })
    .map((item) => item.id);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scoreEvidence(claimTokens, evidence) {
  if (!claimTokens.length || !evidence.tokens.length) {
    return { score: 0, overlap: [] };
  }
  const overlap = claimTokens.filter((token) => evidence.tokens.includes(token));
  const score = overlap.length / Math.max(4, claimTokens.length);
  return { score, overlap };
}

export function analyzeLedger(draft, evidenceInput) {
  const claims = splitClaims(draft);
  const evidence = parseEvidence(evidenceInput);
  const rows = claims.map((claim) => {
    const claimTokens = normalizeTokens(claim.text);
    const mentionedEvidenceIds = findMentionedEvidenceIds(claim.text, evidence);
    const scored = evidence
      .map((item) => ({
        ...item,
        ...scoreEvidence(claimTokens, item)
      }))
      .filter((item) => item.score >= 0.18 && item.overlap.length >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return {
      ...claim,
      tokens: claimTokens,
      mentionedEvidenceIds,
      suggestedEvidence: scored,
      status: decideStatus(claim, mentionedEvidenceIds, scored),
      prompt: makePrompt(claim, mentionedEvidenceIds, scored)
    };
  });

  const summary = summarizeRows(rows, evidence);
  return { rows, evidence, summary };
}

function decideStatus(claim, mentionedEvidenceIds, suggestedEvidence) {
  if (mentionedEvidenceIds.length) {
    return {
      key: "linked",
      label: "Linked",
      tone: "good",
      explanation: "The claim names at least one evidence record in the ledger."
    };
  }
  if (suggestedEvidence.length && claim.strong) {
    return {
      key: "candidate",
      label: "Candidate match",
      tone: "watch",
      explanation: "The wording overlaps with evidence, but the claim is not explicitly linked."
    };
  }
  if (claim.strong) {
    return {
      key: "needs-source",
      label: "Needs source",
      tone: "risk",
      explanation: "The sentence reads like a factual or causal claim without a nearby evidence link."
    };
  }
  return {
    key: "context",
    label: "Context",
    tone: "quiet",
    explanation: "This looks more like framing, reflection, or a plan than a source-backed claim."
  };
}

function makePrompt(claim, mentionedEvidenceIds, suggestedEvidence) {
  if (mentionedEvidenceIds.length) {
    return `Verify that ${mentionedEvidenceIds.join(", ")} really supports the exact wording, scope, and strength of this sentence.`;
  }
  if (suggestedEvidence.length) {
    return `Consider linking ${suggestedEvidence.map((item) => item.id).join(", ")} or rewriting the sentence as interpretation.`;
  }
  if (claim.strong) {
    return "Add a source note, soften the wording, or mark this as a hypothesis before using it in a paper or study guide.";
  }
  return "Keep if it helps the reader follow the argument; no evidence link is required unless it states a fact from a source.";
}

function summarizeRows(rows, evidence) {
  const total = rows.length;
  const counts = rows.reduce(
    (acc, row) => {
      acc[row.status.key] = (acc[row.status.key] || 0) + 1;
      return acc;
    },
    { linked: 0, candidate: 0, "needs-source": 0, context: 0 }
  );

  const usedIds = new Set(rows.flatMap((row) => row.mentionedEvidenceIds));
  const unusedEvidence = evidence.filter((item) => !usedIds.has(item.id));
  const riskScore = total ? Math.round(((counts["needs-source"] + counts.candidate * 0.5) / total) * 100) : 0;

  return {
    total,
    counts,
    evidenceCount: evidence.length,
    unusedEvidence,
    riskScore
  };
}

export function exportMarkdown(analysis) {
  const lines = [
    "# Claim Ledger",
    "",
    "> Generated locally. This ledger helps review claim support; it does not verify truth or replace source reading.",
    "",
    "## Summary",
    "",
    `- Claims: ${analysis.summary.total}`,
    `- Evidence records: ${analysis.summary.evidenceCount}`,
    `- Linked: ${analysis.summary.counts.linked}`,
    `- Candidate matches: ${analysis.summary.counts.candidate}`,
    `- Needs source: ${analysis.summary.counts["needs-source"]}`,
    `- Context only: ${analysis.summary.counts.context}`,
    "",
    "## Claim Review",
    "",
    "| ID | Status | Claim | Evidence | Revision prompt |",
    "| --- | --- | --- | --- | --- |"
  ];

  analysis.rows.forEach((row) => {
    const evidenceIds =
      row.mentionedEvidenceIds.length > 0
        ? row.mentionedEvidenceIds.join(", ")
        : row.suggestedEvidence.map((item) => `${item.id}?`).join(", ") || "none";
    lines.push(
      `| ${row.id} | ${row.status.label} | ${escapeTable(row.text)} | ${escapeTable(evidenceIds)} | ${escapeTable(row.prompt)} |`
    );
  });

  lines.push("", "## Evidence Records", "");
  analysis.evidence.forEach((item) => {
    lines.push(`- **${item.id}** (${item.label}): ${item.text}`);
  });

  return lines.join("\n");
}

function escapeTable(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}
