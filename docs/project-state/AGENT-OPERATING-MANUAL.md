# Agent Operating Manual

**Project:** The Campus Is Glitching
**Created:** 10 October 2026
**Owner of this file:** super-agent

This manual defines how the Super Agent and specialists work together in Claude Code. Agent definitions are in `.claude/agents/`, and reusable procedures in `.claude/skills/`.

---

## 1. How the system runs in Claude Code

| Piece | Mechanism | Notes |
| --- | --- | --- |
| Super Agent | `CLAUDE.md` makes every default session in this repo act as the Super Agent. Optionally run `claude --agent super-agent` to use the agent file as the main thread. | The main thread has the `Agent` tool and can delegate. |
| Specialists | `.claude/agents/<name>.md` subagents, invoked with the `Agent` tool (`subagent_type: "<name>"`) | Specialists do **not** have the `Agent` tool, so there is no uncontrolled nesting. |
| Skills | `.claude/skills/<name>/SKILL.md`, preloaded into agents via the `skills:` frontmatter, or invoked with `/name` | Three skills bundle read-only helper scripts. |
| Shared memory | Files in `docs/project-state/` | The only memory that persists between sessions. Never assume anything else carried over. |
| Peer sessions | `ListAgents` / `SendMessage` | Coordinate file ownership with any other Claude session working in this repo. |

New or edited agent files may need a new Claude Code session (or `/agents`) before they appear as `subagent_type` options.

## 2. Workflow

```text
REQUEST
 → SUPER AGENT ANALYSES        (read PROJECT-STATE, TASK-REGISTER, OPEN-QUESTIONS)
 → TASK PLAN CREATED           (task rows in TASK-REGISTER, status BACKLOG/READY)
 → DEPENDENCIES IDENTIFIED     (READY only when dependencies VERIFIED; owner decisions → BLOCKED)
 → SPECIALISTS ASSIGNED        (FILE-OWNERSHIP updated before any edit task)
 → INDEPENDENT WORK EXECUTED   (parallel Agent calls only for independent tasks; status IN_PROGRESS)
 → DELIVERABLES RETURNED       (§5 return format)
 → INTEGRATION AND CONFLICT CHECK (Super Agent; conflicts → OPEN-QUESTIONS)
 → INDEPENDENT REVIEW          (independent-reviewer; status IN_REVIEW)
 → FIXES AND RE-REVIEW         (REJECT → NEEDS_REVISION → owner agent fixes → re-review)
 → VERIFIED PROJECT STATE UPDATED (PROJECT-STATE, DECISION-LOG, release FILE-OWNERSHIP)
 → FINAL REPORT TO OWNER       (§7)
```

The detailed procedure is in the `task-planning-and-delegation` skill.

## 3. Routing table

| Request is about… | Owner | Reviewer focus |
| --- | --- | --- |
| Doc structure, links, index, source fidelity | documentation-agent | Removals, broken links |
| Rules, missions, tokens, timer rules, balance | game-design-agent | Consistency across docs |
| Screens, navigation, tokens, art direction, viewport (D18), a11y design | ui-ux-agent | Real-render evidence |
| Destinations, map modes, placement | campus-map-agent | Invented geography |
| Code, architecture, state, persistence, tests | engineering-agent | Tests and real render |
| Location, movement, calibration | gps-movement-agent | Simulated-as-real |
| Squads, presence, Missing Connection | squad-social-agent | Fabricated success |
| Test plan, privacy, safety, a11y verification | qa-safety-agent | Evidence standard |
| Assignment, rationale, demo, jury | academic-presentation-agent | Unsupported claims |
| Any high-impact deliverable | independent-reviewer | Everything in its checklist |

**High-impact** means any edit to `docs/00`–`11`, `README.md`, code, game rules, privacy, safety, location or squad behaviour. These always go to independent review.

## 4. Task statuses

| Status | Meaning | Who sets it |
| --- | --- | --- |
| `BACKLOG` | Recorded, not yet schedulable | Super Agent |
| `READY` | Dependencies met; can be dispatched | Super Agent |
| `IN_PROGRESS` | Dispatched to an agent | Super Agent |
| `BLOCKED` | Waiting on an owner decision (cite OQ-ID) or a dependency | Super Agent |
| `IN_REVIEW` | Deliverable returned; with independent-reviewer | Super Agent |
| `NEEDS_REVISION` | Reviewer rejected it or evidence is missing | Super Agent |
| `VERIFIED` | Reviewer approved **or** reproducible check output is recorded | Super Agent only, never the author |
| `CANCELLED` | Dropped (reason recorded) | Super Agent, owner approval if scope shrinks |

A task is **never** `VERIFIED` just because the agent finished writing.

## 4a. Task fields

Every task in `TASK-REGISTER.md` has: **Task ID** (`T-nnn`) · **Objective** · **Priority** (P0 critical blocker · P1 high · P2 missing feature / doc gap · P3 improvement · P4 future idea) · **Owner** · **Required inputs** · **Dependencies** · **Files allowed to change** (or "read-only") · **Expected deliverables** · **Acceptance criteria** · **Verification method** · **Status** · **Blockers** · **Review outcome**. Backlog rows may use a compact subset until the task moves to `READY`.

A task whose dependency is not `VERIFIED`, or whose files are locked by another owner (including a peer session), is `BLOCKED`, never `READY`.

## 5. Specialist return format

```
Task ID:
Summary: (2–4 sentences)
Findings: (numbered; each with file:line or doc §, and a status label)
Proposed changes: (numbered; target file + exact change; mark which need owner approval)
Files modified: (paths, or "none: read-only")
Verification evidence: (commands run + actual output, or NOT RUN + reason)
Assumptions:
Unresolved questions: (→ candidate OQ entries)
Escalations: (anything outside scope or needing approval)
```

## 6. Sequential fallback

If the `Agent` tool or a specialist type is unavailable, the Super Agent performs the task itself, in dependency order, and:
1. Prefixes the output with `SEQUENTIAL FALLBACK: Super Agent acting as <role>`.
2. Follows that role's agent file and skills as written.
3. Runs the `independent-code-review` checklist as a separate pass, and labels the result **"self-review, not independent"**.
4. Says so in the final report.

Using a `general-purpose` subagent loaded with a role's instructions counts as delegated, but must be labelled with the role it emulated.

## 7. Final report format (to the owner)

```
## What changed
## Verified (with evidence: command/verdict)
## Done but not yet verified
## Not done / blocked (with reason or OQ-ID)
## Needs your approval
## Next tasks (top 5 READY)
```

Mention any uncommitted changes. Commits are always the owner's call.

## 8. File ownership rules

- `docs/project-state/FILE-OWNERSHIP.md` lists default owners and any **active lock** (task ID plus agent).
- A lock is taken before an edit task is dispatched and released when the task is VERIFIED or CANCELLED.
- Two active locks on one file are not allowed. Later tasks wait (`BLOCKED` on the earlier task).
- Peer Claude sessions: agree ownership via `SendMessage` and record it in FILE-OWNERSHIP.

## 9. Evidence standard

| Claim | Minimum evidence |
| --- | --- |
| Doc is consistent | Checker output plus reviewer verdict |
| Feature Implemented | Code path (file:line) plus passing test output |
| UI correct | Real-app screenshot or browser-test output at phone **and** MacBook sizes (D18, D20) |
| Test Pass | Date, environment, steps, observed result |
| Destination verified | Who, when, what was seen on the official map image |
| Research finding | Source document or dataset |

Prompts, mockups, design text and agent self-assessment are **never** evidence.
