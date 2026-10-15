---
name: documentation-completeness
description: "Check the documentation pack for broken links and anchors, missing sections, inconsistent status labels, terminology drift, stale implementation claims and removed requirements. Includes a bundled read-only link checker (check_links.py). Use after any documentation edit and before marking a doc task VERIFIED."
---

# Documentation Completeness

## When to use
After any edit to `docs/`, `README.md` or `docs/project-state/`; when the index changes; before a submission.

## Required inputs
The list of changed files (or the whole pack).

## Procedure
1. **Links:** `python3 .claude/skills/documentation-completeness/check_links.py docs README.md agents`. Zero broken links is required. Attach the output.
2. **Index coverage:** every file in `docs/` is listed in `docs/00` and `README.md`, and every listed file exists.
3. **Status labels:** `grep -nE "Confirmed|Proposed|Assumption|Open question|Not implemented|Implemented" <file>`. Check every rule-like statement carries one, and that "Confirmed" items map to a D-number in `docs/11`.
4. **Terminology:** mission names exact (`grep -n "Frozen Character\|Lost Colour\|Missing Connection\|Time Loop\|Low Battery"`); "Lost Color" (US spelling) is a defect; states only `UNDISCOVERED`/`ACTIVE`/`REPAIRED`; destination names match `docs/03` §3.
5. **Stale claims:** any "Implemented" or "Pass" must match `docs/project-state/PROJECT-STATE.md` and code.
6. **Removal check:** `git diff --stat` and `git diff -U0 <file> | grep '^-[^-]'` for tracked files. For untracked files, compare against a pre-edit copy. Every removed requirement line needs an approval reference.
7. **Superseded docs:** `docs/09` must stay marked SUPERSEDED (D17). No active doc may tell anyone to use Figma Make.

## Validation checklist
- [ ] Link checker exit code 0
- [ ] Index ↔ folder match
- [ ] No unlabeled rule; no Confirmed without a D-number
- [ ] No silent removals

## Failure cases
Anchor slug differences (the checker uses GitHub-style slugs, so verify edge cases manually); untracked files have no git baseline (snapshot before editing).

## Ask for clarification when
A removal or rename looks intentional but has no recorded decision.

## Completion report
Return: what was checked, results with citations, files changed (or none), commands run with their actual output, items `NOT RUN` and why, open questions raised.
