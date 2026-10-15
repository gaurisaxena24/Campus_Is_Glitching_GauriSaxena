---
name: independent-code-review
description: "Independent reviewer's procedure for evaluating any deliverable (docs or code) against its acceptance criteria with evidence: ownership check via git, source-fidelity diff, unsupported-claim scan, regression, privacy/safety/accessibility, real-render verification, and an APPROVE / APPROVE_WITH_NOTES / REJECT verdict. Use for every high-impact change."
---

# Independent Code Review

## When to use
Every high-impact deliverable before it can be VERIFIED; also self-review in sequential fallback (labelled non-independent).

## Required inputs
Task ID, acceptance criteria, allowed files, modified files, the author's report. Missing any of these means REJECT ("incomplete handoff").

## Procedure
1. **Ownership:** `git status --short` and `git diff --stat`. Any file outside the allowed list is a blocking issue.
2. **Read the actual change**, not the summary: `git diff <files>` (for untracked files, read in full and compare with the pre-change snapshot if one was provided).
3. **Criteria:** for each acceptance criterion, record met / not met / unverifiable, with evidence.
4. **Source fidelity:** removed lines (`git diff -U0 | grep '^-[^-]'`) are each justified by an approval. Cross-check the `docs/project-state/PROJECT_AUDIT.md` §4 SRC list.
5. **Unsupported claims scan:** grep the change for "Implemented", "Pass", "verified", "tested", "research shows", "students said", coordinates and distances. Each needs a source or evidence.
6. **Re-run the evidence:** re-execute the author's verification commands (link checker, tests, contrast). A result that differs from the author's report is blocking.
7. **Real render (UI/code):** if a build exists, check the app at phone and MacBook sizes, or mark NOT RUN. Mockups are rejected as evidence (D20).
8. **Privacy, safety and accessibility:** quick pass against the `privacy-and-safety-audit` copy scan and the `docs/05` checklist.
9. **Verdict** in the format defined in `.claude/agents/independent-reviewer.md`.

## Validation checklist
- [ ] Verdict cites commands actually run
- [ ] Every blocking issue has file:line and a required fix
- [ ] Not-checked items listed

## Failure cases
Can't run the app (NOT RUN; if the criterion requires it, REJECT); the author's claims can't be reproduced (REJECT).

## Ask for clarification when
The acceptance criteria themselves are ambiguous. Return the ambiguity to the Super Agent; don't invent criteria.

## Completion report
Return: what was checked, results with citations, files changed (or none), commands run with their actual output, items `NOT RUN` and why, open questions raised.
