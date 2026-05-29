# Claim Ledger Lite

Claim Ledger Lite is a small local academic-writing helper. Paste a draft paragraph or study note, paste evidence records, and it turns the text into a claim-by-claim review ledger.

It is built for one narrow job: make unsupported claims visible before they become polished prose.

## What It Can Do

- Split a draft into reviewable claims.
- Parse simple evidence records such as `E1 | label | excerpt`.
- Detect explicit evidence links like `[E1]`.
- Suggest candidate evidence when a claim and evidence note share key wording.
- Flag strong claims that have no visible support.
- Surface review warnings for duplicate IDs, thin excerpts, placeholder evidence, and over-strong claims.
- Filter the review ledger by linked, candidate, needs-source, or context rows.
- Export a Markdown table for a paper checklist, lab notebook, study guide, or reviewer comment.

## Good Study And Research Use Cases

- Checking a literature-review paragraph before adding it to a paper draft.
- Turning lecture notes into a source-aware revision checklist.
- Reviewing lab-report conclusions against observation notes.
- Marking which claims in a study guide are source-backed and which are interpretation.

## Why It Is Useful

Academic notes often fail quietly: the prose sounds reasonable, but the evidence path is unclear. This tool does not judge truth. It forces a concrete workflow:

1. Name the claim.
2. Point to evidence.
3. Mark candidate matches.
4. Rewrite or soften unsupported statements.

That makes paper reading, course revision, and lab writing easier to audit.

## Why It Is Interesting

It treats citation hygiene as a visible ledger instead of a last-minute formatting task. The fun part is watching a paragraph become a dashboard of linked, candidate, and risky claims without sending text to any service.

## Inspiration

This project was inspired by recent public discussion around human-in-the-loop academic writing workflows and evidence ledgers:

- Academic Research Skills for Claude Code, a recent public project around research/write/review/revise workflows and integrity checks: <https://github.com/Imbad0202/academic-research-skills>
- Open Knowledge Maps as an example of making literature work visible through maps: <https://openknowledgemaps.org/>
- Claim-Evidence-Reasoning teaching materials that frame academic explanation as claims supported by sufficient evidence and reasoning: <https://aroles.github.io/biol211/articles/CER_framework.html>

The implementation here is original and does not copy source code, design, protected text, papers, or data.

## Important Limits

- It does not verify whether a claim is true.
- It does not fetch or summarize papers.
- It does not create citations.
- It does not replace textbooks, source papers, instructors, reviewers, or domain experts.
- The bundled sample is synthetic example data and must not be treated as a real citation or research conclusion.

## Run Locally

```bash
npm install
npm start
```

Then open:

```text
http://localhost:5176/
```

There are no runtime dependencies. `npm install` only creates a normal npm project state; the app itself is static HTML, CSS, and JavaScript.

## Core Usage

1. Paste draft claims or load the sample.
2. Paste evidence notes, one per line.
3. Use bracket IDs such as `[E1]` in the draft when a claim has support.
4. Read the Claim Review table.
5. Review any warning badges before reusing a claim.
6. Copy or download the Markdown export.

Evidence format:

```text
E1 | Article note | The source says spaced practice supports later recall.
E2 | Lab observation | Trial 2 had lower error after calibration.
```

## Validation

```bash
npm run check
```

The check runs syntax validation for the browser modules and a Node smoke test for claim parsing, evidence linking, status counts, and Markdown export.

## License

MIT

## Later Extensions

- Import/export JSON sessions.
- Add a source-strength field such as primary study, review, lecture, or observation.
- Add per-claim confidence notes.
- Add a print stylesheet for paper-margin review.
