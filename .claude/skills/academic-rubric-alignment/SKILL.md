---
name: academic-rubric-alignment
description: "Map the project's deliverables, process and design rationale to the DESG310 assignment requirements and rubric — only once the owner supplies them — and otherwise to frameworks already in the project's sources (e.g. the seven game elements). Flags unsupported claims. Use when preparing a submission or checking coverage."
---

# Academic Rubric Alignment

## When to use
Preparing the submission; checking whether deliverables meet the assignment; writing the rationale.

## Required inputs
**The DESG310 assignment brief and rubric (not yet in the repo: request it from the owner).** Also `docs/01` §9 deliverables, `docs/02` §14 rationale, `docs/11`, `docs/project-state/PROJECT-STATE.md`, git log.

## Procedure
1. **Brief check:** if the brief or rubric is missing, say so first and continue only with the source frameworks. Never invent criteria, weights, deadlines or word counts.
2. **Extract criteria** verbatim from the brief, one row each.
3. **Map evidence:** criterion → artefact (file and section) → status (Implemented / Documented / Proposed / Missing).
4. **Seven game elements** (from the original GDD `.docx`, SRC-02): Players, Goals, Rules, Space, Time, Resources, Conflict. Show where each is designed and where it is implemented.
5. **Process evidence:** from `git log`, file timestamps, `docs/project-state/DECISION-LOG.md` and `docs/11` change log. Record dates and what changed. No invented playtests or interviews.
6. **Gaps:** list missing evidence and propose tasks to the Super Agent.

## Validation checklist
- [ ] Each criterion quoted from a real brief (or "brief not supplied")
- [ ] Every "Implemented" matches PROJECT-STATE
- [ ] No fabricated research

## Failure cases
No brief (partial alignment only, labelled); claims without artefacts (mark Missing).

## Ask for clarification when
Always, if the brief or rubric isn't available.

## Completion report
Return: what was checked, results with citations, files changed (or none), commands run with their actual output, items `NOT RUN` and why, open questions raised.
