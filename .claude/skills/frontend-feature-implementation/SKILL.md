---
name: frontend-feature-implementation
description: "Procedure for implementing a documented feature in the coded web app (D19) with Claude Code: inspect the stack, confirm the spec and approvals, implement in small steps within allowed files, add tests, run build/lint/tests, verify the real render at phone and MacBook sizes, and update docs/06 status. Use for any code change."
---

# Frontend Feature Implementation

## When to use
Any code task assigned to engineering-agent.

## Required inputs
Task row (allowed files, acceptance criteria); relevant spec sections (`docs/04`, `05`, `06`, `08`); approved framework decision (Q9) in `docs/project-state/DECISION-LOG.md`.

## Procedure
1. **Gate:** if no framework is approved, stop and return BLOCKED (Q9). Never scaffold a project or install packages without a logged owner approval.
2. **Inspect:** read the manifest, folder layout, existing patterns, test setup and scripts. Match the existing style.
3. **Spec check:** list the exact spec lines being implemented. Ambiguity goes back to the Super Agent, not to guessing.
4. **Implement small:** one behaviour at a time, only in allowed files. Core logic (state machine, timer, tokens) is pure and testable, with UI separate.
5. **Honesty rules in code:** no fake success; simulated data tagged and visibly labelled; storage failures surfaced; location never requested on load.
6. **Viewport (D18):** root container is phone-sized (about 9:19.5, max about 390–430 CSS px wide, height fitted with `100dvh` or equivalent), centred, with no frame graphic. Check that the phone itself renders full-screen.
7. **Tests:** unit tests for the logic; browser or component tests for the flow; viewport tests at 390×844 and 1440×900 if the tooling exists.
8. **Run:** build, lint, type-check and tests. Attach exact commands and output, including failures.
9. **Render:** start the app and look at it (screenshot or browser automation). Record what actually happened.
10. **Docs:** update the `docs/06` §2 status row only if you own it in this task; otherwise propose the change.

## Validation checklist
- [ ] Only allowed files changed (`git status --short`)
- [ ] Tests added and passing (output attached)
- [ ] Real render checked at both sizes (or NOT RUN with reason)
- [ ] No new dependency without approval; no secrets

## Failure cases
Tests fail (report honestly, status NEEDS_REVISION); the tool can't render (NOT RUN); the spec conflicts with code reality (escalate).

## Ask for clarification when
A dependency, framework, data store, network call or destructive command is needed.

## Completion report
Return: what was checked, results with citations, files changed (or none), commands run with their actual output, items `NOT RUN` and why, open questions raised.
