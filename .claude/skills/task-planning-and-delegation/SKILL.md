---
name: task-planning-and-delegation
description: "The Super Agent's procedure for turning a natural-language request into task records with owners, dependencies, allowed files and acceptance criteria, dispatching specialists (parallel only when independent), and moving tasks through BACKLOG→READY→IN_PROGRESS→IN_REVIEW→VERIFIED. Use for any multi-step or multi-domain request."
---

# Task Planning and Delegation

## When to use
Any request touching more than one domain or file, or needing review.

## Required inputs
The owner's request; `docs/project-state/PROJECT-STATE.md`; `docs/project-state/TASK-REGISTER.md`; `docs/project-state/FILE-OWNERSHIP.md`; `docs/project-state/OPEN-QUESTIONS.md`.

## Procedure
1. **Restate** the request as 1–5 concrete deliverables. Write down anything ambiguous. If it changes the approach, ask the owner (AskUserQuestion) before planning further.
2. **Route** each deliverable using the routing table in `docs/project-state/AGENT-OPERATING-MANUAL.md` §3.
3. **Decompose** into tasks small enough for one agent in one pass. Give each a register row: ID (`T-nnn`), objective, priority (P0 critical blocker · P1 high · P2 gap · P3 improvement · P4 future idea), owner, inputs, dependencies, files allowed to change, deliverables, acceptance criteria, verification method, status, blockers, review outcome.
4. **Dependency graph:** mark tasks `READY` only when all dependencies are `VERIFIED` (or the dependency is read-only input). A task blocked on an owner decision is `BLOCKED` with the OQ-ID.
5. **File ownership:** before dispatching edit tasks, write the owner per file into `docs/project-state/FILE-OWNERSHIP.md`. Two concurrent tasks must never share a file. First passes are read-only.
6. **Dispatch:** put independent `READY` tasks in one message as multiple `Agent` calls. Dependent tasks wait. Each prompt contains the task row, the allowed files (or "READ-ONLY"), the sources to read, and "Return in the format of AGENT-OPERATING-MANUAL §5".
7. **Receive:** check each return has findings, files modified, evidence, assumptions and questions. Missing evidence means `NEEDS_REVISION`.
8. **Integrate:** compare outputs for conflicts (same fact stated differently, overlapping edits). Resolve with sources, or log to `OPEN-QUESTIONS.md`.
9. **Review:** high-impact tasks go to `independent-reviewer` with criteria and modified files. `REJECT` sends the task to `NEEDS_REVISION` with the blocking list. Re-review after the fix.
10. **Close:** `VERIFIED` only with an `APPROVE`/`APPROVE_WITH_NOTES` verdict or reproducible check output recorded in the register. Release file ownership.

## Validation checklist
- [ ] Every dispatched task has a register row first
- [ ] No two in-flight tasks share an allowed file
- [ ] No task marked VERIFIED by its own author
- [ ] Owner-decision items are BLOCKED, not guessed

## Failure cases
Agent edits files outside its allowance (revert only with owner approval; flag in review); agent returns no evidence; a dependency is rejected (downstream tasks return to BLOCKED).

## Sequential fallback
If the `Agent` tool is unavailable, perform each task yourself in dependency order. Label every output "SEQUENTIAL FALLBACK: performed by Super Agent acting as <role>". Run the `independent-code-review` checklist yourself as a separate, explicit pass, and say in the final report that review was not independent.

## Completion report
Return: what was checked, results with citations, files changed (or none), commands run with their actual output, items `NOT RUN` and why, open questions raised.
