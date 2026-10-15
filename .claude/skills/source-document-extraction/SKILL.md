---
name: source-document-extraction
description: "Extract text from the owner's original .docx documents (read-only) and compare it requirement-by-requirement with the Markdown docs to find dropped, changed or added requirements. Use for source-fidelity checks, before rewriting a doc, or when a requirement's origin is disputed."
---

# Source Document Extraction

## When to use
Checking whether a Markdown doc preserved its original; tracing where a requirement came from; before any doc rewrite.

## Required inputs
Path to the `.docx` originals (currently `~/Downloads/01_Project_Brief.docx`, `02_Game_Design_Document.docx`, `04_User_Flow_and_Screen_Specification.docx`) and the Markdown doc(s) to compare.

## Procedure
1. **Never open the `.docx` for writing.** Extract into the session scratchpad, not the repo:
   `python3 -I .claude/skills/source-document-extraction/extract_docx.py "<file>.docx" <scratchpad>/<name>.txt`
   (Fallback on macOS: `textutil -convert txt -output <out> "<file>.docx"`.)
2. Identify duplicates (`cmp` the extracted text) and use one canonical copy.
3. Split the source into atomic requirements: one row per rule, list item, table row or state.
4. For each requirement, search the Markdown (`grep -n`) and classify it as **Preserved** (same meaning), **Changed** (meaning differs: quote both), **Missing**, or **Added in Markdown** (no source).
5. Record each Changed or Missing item with an ID (continue the `SRC-nn` series in `docs/project-state/PROJECT_AUDIT.md` §4), quoting the original exactly.

## Outputs
A table: ID | original quote (with section) | Markdown location or "absent" | classification | impact.

## Validation checklist
- [ ] Quotes are verbatim from the extracted text
- [ ] Every source section was covered (list the section headings checked)
- [ ] No classification of "Preserved" based on topic alone: the meaning must match

## Failure cases
Extraction loses table structure (table cells come out one per line, so re-read the context); `.docx` missing (record "Not found", never reconstruct from memory).

## Ask for clarification when
Two sources conflict and neither has an owner decision. Never pick a winner.

## Completion report
Return: what was checked, results with citations, files changed (or none), commands run with their actual output, items `NOT RUN` and why, open questions raised.
