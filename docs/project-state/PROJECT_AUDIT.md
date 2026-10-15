# Project Audit

**Project:** The Campus Is Glitching (DESG310 Game Design, FLAME University)
**Audit date:** 9 October 2026, about 23:50 IST
**Audited by:** Claude Code session acting as Super Agent (Phase 1 of the agent-system build)
**Method:** Read every file in the repository, the three `.docx` originals in `~/Downloads`, the Claude Code CLI help (v2.1.295), and the user-level Claude configuration. No files were modified during the audit.

> **Concurrency warning.** While this audit ran, a second Claude Code session (`campus-is-glitching-gaurisaxena-e3`) was actively writing `docs/00`–`docs/11` and the root `README.md`. Doc 11 appeared at 23:49:14, and docs 06 and 10 were rewritten at 23:49:47. This audit reflects the files as of about 23:50. Anything that session changes later needs re-checking (see task T-001 in [TASK-REGISTER.md](./TASK-REGISTER.md)).

---

## 1. What Exists

### 1.1 Repository contents

| Path | Type | Git state | Notes |
| --- | --- | --- | --- |
| `README.md` | Project README (about 4.7 KB) | Modified, uncommitted | Rewritten by the peer session. The committed version is a two-line description. |
| `docs/Description.md` (was `docs/README.md` until 23:51) | Copy of the original two-line README | Untracked | Renamed by someone other than this session. Duplicates the committed README text. Purpose unclear (see OQ-A3). |
| `docs/00-DOCUMENTATION-INDEX.md` … `docs/11-DECISIONS-AND-OPEN-QUESTIONS.md` | 12 Markdown design documents | Untracked | Version 1.0 (brief is 1.1), all dated 9 Oct 2026 |
| `.git/` | One commit, `17bb8c9 Initial commit` | — | Remote `origin/main`; nothing beyond the original README has ever been committed |

**Not present:** application code, `package.json` or any manifest, build configuration, tests, assets, map art, fonts, `.env` files, CI, `.claude/`, `CLAUDE.md`, hooks.

### 1.2 Source documents outside the repository

| File | Words | Relationship to the repo |
| --- | --- | --- |
| `~/Downloads/01_Project_Brief.docx` (plus an identical `(1)` copy) | 564 | Original of `docs/01`. Faithfully carried over. |
| `~/Downloads/02_Game_Design_Document.docx` (plus an identical `(1)` copy) | 587 | Original of `docs/02`. **Several details lost or changed** (section 4). |
| `~/Downloads/04_User_Flow_and_Screen_Specification.docx` | 354 | Original of `docs/04`. **Navigation model and squad states lost** (section 4). |

**Not found:** the "long consolidated documentation source" mentioned in the setup request. No `.docx` originals exist for docs 03 or 05–11. A Spotlight search of the home folder for "Campus Is Glitching" returned only the files above. See OQ-A1.

### 1.3 Claude Code environment (verified)

| Mechanism | Status | Evidence |
| --- | --- | --- |
| Claude Code CLI | v2.1.295 | `claude --version` |
| Project instructions `CLAUDE.md` | Supported; none existed before | Repository listing |
| Project subagents `.claude/agents/*.md` | Supported; none existed before. The user's other repo has a working example with `name`, `description`, `tools` frontmatter. | `~/Gauri-Saxena_Capstone-Project_.../.claude/agents/super-agent.md` |
| Main-thread agent | `claude --agent <name>` flag and an `agent` setting | `claude --help` |
| Project skills `.claude/skills/<name>/SKILL.md` | Supported; user-level examples use `name` and `description` frontmatter | `~/.claude/skills/build-log/SKILL.md` |
| Nested delegation | Subagents *can* spawn subagents (up to three layers) only if their `tools` include `Agent`. In this system only `super-agent` has `Agent`, so specialists cannot delegate further. | code.claude.com/docs/en/sub-agents (fetched 9 Oct 2026 by a `claude-code-guide` subagent) |
| Frontmatter rules | Subagent: `name` + `description` required; `tools` comma string or list; `skills` YAML list preloads skills. Skill: `name`, `description` (≤1,536 chars with `when_to_use`); folder name `synced` reserved. | Same source |
| Hooks | Supported, but none exist for this repo and none are needed yet | — |
| Peer sessions | `ListAgents` / `SendMessage` available; one peer session active | `ListAgents` output |

---

## 2. Implementation Status

| Category | Items |
| --- | --- |
| **Implemented** | Nothing. There is no code. |
| **Partially implemented** | Documentation only: 12 design documents drafted, under review, uncommitted. |
| **Planned, not implemented** | Screens S1–S14; mission state machine; timestamp timer; derived token logic; local persistence; illustrated campus map; optional geolocation; photo submissions; squad features (open question); backend (not required). |
| **Broken** | Nothing executable exists, so nothing can be broken. Documentation defects are listed in section 3. |
| **Unverified** | All nine destinations ("To be verified" in doc 03); every test in doc 08 is "Not run"; all of doc 05's colour, type and contrast values; map usage rights; the A1–A6 assumptions in doc 11. |

---

## 3. Documentation Defects and Contradictions

| ID | Severity | Finding | Location |
| --- | --- | --- | --- |
| DOC-01 | Medium | The roadmap says there are "13 Markdown documents". There are 12 numbered docs plus `README.md`, so the count only works if the README is included. | `docs/10` Phase 1 |
| DOC-02 | Low | The roadmap says "README rewritten". The root README was rewritten, but `docs/README.md` still holds the original two lines. | `docs/10`, `docs/README.md` |
| DOC-03 | Medium | The brief scopes out items "for the first build", but `docs/01` says "unless specifically implemented". That is a softer scope boundary. | `docs/01` §7 vs `.docx` |
| DOC-04 | Medium | Mobile navigation is "Map and Journal" only. The original five-tab navigation is missing (see SRC-01). | `docs/05` §13, `docs/04` |
| DOC-05 | Low | `docs/04` S8 lists Time Loop's place name as an input, while `docs/06` §9 makes it optional. These are consistent but the wording is easy to misread. | `docs/04` S8, `docs/06` §9 |
| DOC-06 | Medium | Q15 mentions the README's "social media interactions", but the rewritten README no longer says this, so the question has lost its evidence trail. The committed README (`git show HEAD:README.md`) still has it. | `docs/11` Q15 |
| DOC-07 | Info | Decisions D3, D5, D6, D9, D10, D12, D13 and D16 cite "Documentation requirements provided by the project owner". That requirements text is not in the repository, so these decisions cannot be traced to a stored source. | `docs/11` §1 |
| DOC-08 | Medium | The mission state model drops the original intermediate states `PHYSICAL COMPLETE` and `DIGITAL COMPLETE`. The two boolean flags are equivalent, but D6 records the three-state version as "Confirmed" without noting the change. | `docs/02` §7, `docs/11` D6 |

---

## 4. Source-Fidelity Gaps (original `.docx` → Markdown)

These are requirements present in the user's original documents that are **missing from or changed in** the Markdown pack. Under the rule "never silently remove requirements", each needs a decision (see [OPEN-QUESTIONS.md](./OPEN-QUESTIONS.md)).

| ID | Original requirement (`.docx`) | Markdown state | Impact |
| --- | --- | --- | --- |
| SRC-01 | **Navigation: MAP, QUESTS, INVENTORY, SQUAD, STATUS** (`04` §2) | Absent. The Markdown has Map plus Quest Journal only. There are no Inventory, Squad or Status screens. | High: changes the information architecture. The setup request also names "map, quests, items, squad and status navigation". |
| SRC-02 | **Seven game elements table** (Players, Goals, Rules, Space, Time, Resources, Conflict) (`02` §2) | Absent | High for academic alignment: this is a course framework. |
| SRC-03 | **Candidate area per mission** (Plaza route, landscaped/garden area, common area or Plaza, player-selected, open common area) (`02` §4) | Absent. Doc 03 says assignments are "Proposed" with no candidates listed. | Medium |
| SRC-04 | Missing Connection physical task: "**Walk with** a willing participant **or** have a short conversation" | Generalised to "voluntary interaction" | Low |
| SRC-05 | Habit/theme labels: Lost Colour = *Environmental awareness*, Time Loop = *Rushing through routine*, Low Battery = *Not pausing* | Changed to *Rushing past surroundings*, *Autopilot routines*, *Endless scrolling and sedentary screen time* | Medium: changes design rationale |
| SRC-06 | **Timeout default:** "stop accepting new mission starts … allow the player to view progress but do not auto-complete anything" | Reworded as a pure open question (Q5) with a *different* recommendation | Medium |
| SRC-07 | GPS denied: "clearly **label location as unverified**". GPS unavailable: "**offer retry** and manual alternative". | Retry and the "unverified" label are missing | Medium |
| SRC-08 | **Squad:** "local test profiles"; "Squad unavailable: allow solo-compatible missions; do not fabricate live squad presence"; "**invite code** option"; "**Stale squad position**: show last update time and mark location stale"; SQUAD tab for "consent-based sharing state" | Reduced to "open question" (Q4); invite code, stale position and squad tab dropped | High for the Squad workstream |
| SRC-09 | **End state:** results show "squad contributions if available" and must "**distinguish completed, incomplete, and unverified activities**" | S13 shows only repaired count, tokens and submissions | Medium |
| SRC-10 | **Mission card:** candidate location, physical task *expected duration*, accepted evidence, *location verification state*, *squad requirement* | S6 omits these | Medium |
| SRC-11 | Game balance: do not require players to "approach roads, interrupt classes, or collect information about strangers" | Partly covered in doc 07; "interrupt classes" and "approach roads" are missing | Low |
| SRC-12 | Physical task: "Records manual confirmation **and optional tracking**" | Doc 04 S7 has manual confirmation only | Low |
| SRC-13 | Original "Resources" include "evidence … squad contributions"; "INVENTORY: repair tokens and collected evidence/records" | No inventory concept | Medium (linked to SRC-01) |

### Items requested but not found in any source

| ID | Item | Finding |
| --- | --- | --- |
| NF-01 | "Ten communication signals" | **Not found** in any repo file or `.docx` original. The only "signal" concept is Low Battery's single "recharge signal". Do not invent the list. See OQ-A2. |
| NF-02 | "Long consolidated documentation source" | **Not found.** See OQ-A1. |
| NF-03 | Assignment brief or rubric for DESG310 | **Not found.** Academic alignment cannot be verified against real criteria. See OQ-A4. |
| NF-04 | Original docs 03, 05–11 | No `.docx` originals found. These may have been generated from a prompt and need owner review. |

---

## 5. Sources of Truth

Precedence, highest first:

1. **Owner decisions** recorded with a date in `docs/11-DECISIONS-AND-OPEN-QUESTIONS.md` §1 (D1–D20), plus approvals recorded in [DECISION-LOG.md](./DECISION-LOG.md).
2. **Original `.docx` documents** in `~/Downloads` (01, 02, 04) as the user's authored intent. Where the Markdown differs, the difference is an **open question**, not an automatic override either way.
3. **Markdown design pack** `docs/00`–`docs/11` for detail.
4. **External references:** the [official campus map](https://www.flame.edu.in/images/events/orientation/FLAME-University-Campus-Map-2025.jpg) for geography only.
5. **Agent-system files** in `docs/project-state/` hold *status*, not requirements.

The original `.docx` files must never be modified. They are read-only.

---

## 6. Task Independence

| Can run in parallel (read-only reviews, different scopes) | Has dependencies |
| --- | --- |
| Documentation completeness review | Any doc edits wait for the peer session to finish and for owner decisions on SRC-01…13 |
| Game rules and mission consistency review | Code implementation waits for Q9 (framework choice) |
| UI/UX consistency review | Screen specs for Inventory/Squad/Status wait for SRC-01 decision |
| Privacy/safety/accessibility review | Map art waits for Q10 (rights) and destination verification |
| Academic alignment review | Academic alignment of rubric waits for the assignment brief (NF-03) |
| GPS and squad feature audit | GPS implementation waits for Q2 and Q9; calibration needs on-site work |
| Technical architecture audit | Test execution waits for any build to exist |

## 7. Decisions Requiring Owner Approval

See [OPEN-QUESTIONS.md](./OPEN-QUESTIONS.md) for the full list. The most urgent:

1. **SRC-01 / SRC-08:** restore the five-tab navigation (MAP, QUESTS, INVENTORY, SQUAD, STATUS) and squad states from the original, or confirm the simplified two-tab model.
2. **Q9 (narrowed):** the build route is now decided (D19: coded web app built with Claude Code, no Figma Make per D17). Still open: **which web framework and tooling**. This blocks all engineering.
3. **SRC-05 / SRC-06:** which habit labels and timeout default are authoritative.
4. **OQ-A1 / OQ-A2 / OQ-A4:** supply the consolidated source, the "ten communication signals" list and the assignment brief, or confirm they don't exist.
5. Committing the uncommitted documentation, and confirming that the deletion and rewrite of the original README was intended.

---

## 8. Changes During the Audit (recorded 9 Oct 2026, about 23:56 IST)

| Time | Change | By | Effect on this system |
| --- | --- | --- | --- |
| 23:49–23:53 | Docs 04, 05, 06, 09, 11 revised. D17–D20 added. Doc 09 marked SUPERSEDED. Q9 narrowed to framework choice. | Peer session `campus-is-glitching-gaurisaxena-e3` | Owner confirmed D17–D20 directly to this session. Agents and skills encode them. |
| 23:51 | `docs/agents/` moved to root `agents/`; `.claude/` moved into `agents/.claude/`; `docs/README.md` renamed `docs/Description.md` | Not this session. Actor unconfirmed. | Owner chose: `.claude/` back at the repo root (required for Claude Code to load it) and state files in `agents/`. This session moved `agents/.claude` → `.claude` at 23:56. |
| 10 Oct 00:11 | Root `agents/` moved to `docs/project-state/` | This session, on owner request (AD-07) | One agent folder remains: `.claude/agents/`. |

**Owner-confirmed decisions affecting agents (from `docs/11`):**
- **D17:** Figma Make removed entirely: no tool, workflow, deliverable or dependency.
- **D18:** Phone-sized game viewport (about 9:19.5, max about 390–430 CSS px wide, fitted to the browser height) centred in a MacBook browser window. No laptop frame, no desktop dashboard.
- **D19:** Coded web app built with Claude Code.
- **D20:** UI/UX specifies, Engineering implements, QA and Independent Reviewer verify the **real rendered app** at phone size and MacBook browser size. Mockups and design text are never evidence.

**Re-check needed:** sections 3–4 were audited against the 23:50 versions of docs 04, 05 and 06. Task T-002 re-verifies SRC-01…13 against the revised docs.
