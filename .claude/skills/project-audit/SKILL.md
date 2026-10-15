---
name: project-audit
description: "Repeatable procedure for auditing The Campus Is Glitching repository state — what exists, what is implemented, partially implemented, planned, broken or unverified, sources of truth, dependencies and approval items. Use at the start of a large request, after major changes, or when asked for a project-wide audit."
---

# Project Audit

## When to use
Start of a project-wide request; after code is first added; after a peer session or the owner restructures files; before a submission.

## Required inputs
Repository root; previous audit `docs/project-state/PROJECT_AUDIT.md`; `docs/project-state/PROJECT-STATE.md`.

## Procedure
1. **Inventory:** `git status --short`, `git log --oneline -20`, `find . -path ./.git -prune -o -type f -print`. Note untracked, modified and deleted files.
2. **Detect stack:** look for `package.json`, lockfiles, `tsconfig.json`, `vite.config.*`, `index.html`, `src/`, test configs. If none, record "no code".
3. **Detect concurrent editors:** run `ListAgents`, and compare file mtimes (`ls -laT docs agents`) with the session start. If another session is active, coordinate before editing.
4. **Read the sources:** every `docs/*.md`, `README.md`, `CLAUDE.md`, and the `.docx` originals via `source-document-extraction`.
5. **Classify every feature** in `docs/06` §2 as Implemented / Partially / Planned / Broken / Unverified. "Implemented" needs code **and** a passing check you ran.
6. **Run checks:** `python3 .claude/skills/documentation-completeness/check_links.py`; existing test commands if code exists.
7. **Diff against the previous audit:** list new, resolved and changed findings.
8. **Write or refresh** `docs/project-state/PROJECT_AUDIT.md`, keeping the section layout (1 Exists, 2 Status, 3 Defects, 4 Source gaps, 5 Sources of truth, 6 Independence, 7 Approvals, 8 Changes).

## Relevant files
`docs/project-state/PROJECT_AUDIT.md`, `docs/06` §1–2, `docs/11`, `docs/project-state/PROJECT-STATE.md`.

## Validation checklist
- [ ] Every claim has a file, command or source citation
- [ ] No feature marked Implemented without code plus check output
- [ ] Source conflicts are listed, not resolved
- [ ] Approval items listed separately

## Failure cases
Files changing during the audit (record times and re-check); unreadable `.docx` (record NOT RUN); missing sources (record as "Not found").

## Ask for clarification when
Files were moved or deleted by someone else; a source document referenced by the owner cannot be found.

## Completion report
Return: what was checked, results with citations, files changed (or none), commands run with their actual output, items `NOT RUN` and why, open questions raised.
