---
name: project-handoff-and-status-report
description: "Produce the standard status or handoff report from the shared source of truth: what changed, what is verified and how, what is unverified or incomplete, blockers, items needing owner approval, and the next N tasks. Use at the end of every Super Agent task and whenever the owner asks for status."
---

# Project Handoff and Status Report

## When to use
End of every Super Agent task; "what's the status?"; before ending a session; handing off to another session.

## Required inputs
`docs/project-state/PROJECT-STATE.md`, `docs/project-state/TASK-REGISTER.md`, `docs/project-state/OPEN-QUESTIONS.md`, `docs/project-state/DECISION-LOG.md`, `git status --short`.

## Procedure
1. **Refresh facts:** run `git status --short`. Read the register and state files. Do not report from memory of earlier turns without re-reading.
2. **Classify** each task touched: Done and VERIFIED (cite the verdict or command) · Done but unverified · In progress · Blocked (cite the OQ or dependency) · Not started.
3. **Next tasks:** pick the top N `READY` tasks by priority, then by dependency unlock count.
4. **Approvals:** list every pending owner decision with its ID and a one-line recommendation.
5. **Update** `docs/project-state/PROJECT-STATE.md` "Last updated" and status lines, but only with evidenced facts.
6. **Write the report** in the `docs/project-state/AGENT-OPERATING-MANUAL.md` §7 format.

## Validation checklist
- [ ] Every "verified" item has evidence
- [ ] Uncommitted changes are mentioned (the owner decides on commits)
- [ ] No promises about future sessions remembering anything not written in `docs/project-state/`

## Failure cases
Register and reality disagree (report the discrepancy and fix the register); a peer session changed files (report what changed and when).

## Ask for clarification when
Priorities conflict and need an owner choice.

## Completion report
Return: what was checked, results with citations, files changed (or none), commands run with their actual output, items `NOT RUN` and why, open questions raised.
