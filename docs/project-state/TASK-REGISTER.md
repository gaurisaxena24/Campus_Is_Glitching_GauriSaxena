# Task Register

**Owner of this file:** super-agent
**Statuses:** `BACKLOG` · `READY` · `IN_PROGRESS` · `BLOCKED` · `IN_REVIEW` · `NEEDS_REVISION` · `VERIFIED` · `CANCELLED` (definitions: `docs/project-state/AGENT-OPERATING-MANUAL.md` §4)
**Priorities:** P0 critical blocker · P1 high · P2 missing feature / doc gap · P3 improvement · P4 future idea
**Task fields:** see `AGENT-OPERATING-MANUAL.md` §4a. Backlog tables use a compact subset; the full fields are filled in when a task moves to READY.

## 1. Agent-system setup tasks

| ID | Objective | Pri | Owner | Inputs | Depends on | Files allowed | Deliverables | Acceptance criteria | Verification | Status | Blockers | Review |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-001 | Phase 1 project audit | P0 | super-agent | Repo, `.docx` originals | — | `docs/project-state/PROJECT_AUDIT.md` | Audit file | All sections 1–8; every claim cited | Re-read; link check | IN_REVIEW | Docs and code changed after the audit (§8) | §4 source gaps re-confirmed by T-010; §4 and headers checked in T-902. §1–2 implementation status is superseded by PROJECT-STATE §6. A full independent review is still pending |
| T-002 | Re-verify SRC-01…13 against revised docs | P1 | documentation-agent | Audit §4 | — (reads T-001 output; does not need T-001 VERIFIED) | read-only | Findings | Each SRC marked still-missing / addressed / changed | Citations | VERIFIED (done as T-010) | — | SRC-01 partial, SRC-08 partial, SRC-13 mostly missing, other 10 still missing |
| T-003 | Create agent and skill definitions | P0 | super-agent | Claude Code docs | — | `CLAUDE.md`, `.claude/**` | 11 agents, 16 skills | Load in a fresh session; valid frontmatter | Headless `claude -p` listing; `claude plugin validate` | VERIFIED | — | Evidence: `AGENT-SYSTEM-TEST-REPORT.md` §2 (headless `claude -p` listed all 11 agents and 16 skills; native agents used in T-901/T-902) |
| T-004 | Create shared context files | P0 | super-agent | Audit | T-001 | `docs/project-state/*`, `CLAUDE.md` | 8 files + reviews | All Phase 5 topics covered with sources | Link check; independent review | VERIFIED | — | T-902 REJECT (7) → fixed; T-903 REJECT (2) → fixed; **T-904 APPROVE_WITH_NOTES** (notes applied) |

## 2. First project-wide review (Phase 7, read-only)

All dispatched 10 Oct 2026, about 00:05 IST, in parallel (independent and read-only, so no file conflicts). Dispatched as `general-purpose` subagents emulating each role, because the new agent types load only in sessions started after their creation (manual §6).

| ID | Workstream | Owner (emulated) | Files allowed | Status | Review |
| --- | --- | --- | --- | --- | --- |
| T-010 | A. Documentation completeness and source reconciliation | documentation-agent | read-only | VERIFIED (findings report) | Findings accepted; Super Agent re-ran link check |
| T-011 | B. Game rules and mission consistency | game-design-agent | read-only | VERIFIED (findings report) | Accepted; code claims spot-checked (state.js lines confirmed) |
| T-012 | C. UI/UX and visual design consistency | ui-ux-agent | read-only | VERIFIED (findings report) | Accepted; contrast output reproducible |
| T-013 | Campus map source validation (OQ-07) | campus-map-agent | read-only | VERIFIED (findings report) | Accepted; Super Agent viewed map and confirmed hash vs official URL |
| T-014 | D. Technical implementation and architecture audit | engineering-agent | read-only | VERIFIED (findings report) | Accepted; `node --test` re-run 30/30 at 00:07:45 |
| T-015 | E1. GPS and movement audit | gps-movement-agent | read-only | VERIFIED (findings report) | Accepted |
| T-016 | E2. Squad and social audit | squad-social-agent | read-only | VERIFIED (findings report) | Accepted; MAX_SQUAD confirmed |
| T-017 | F. Privacy, accessibility and QA audit | qa-safety-agent | read-only | VERIFIED (findings report) | Accepted |
| T-018 | G. Academic alignment and presentation readiness | academic-presentation-agent | read-only | VERIFIED (findings report) | Accepted |
| T-901 | System test: native super-agent summarises status and delegates T-901a to native documentation-agent | super-agent | read-only | VERIFIED | Delegation succeeded; super-agent reproduced the link check (137 links, 0 broken) and confirmed hashes unchanged |
| T-902 | System test: native independent-reviewer reviews T-004 | independent-reviewer | read-only | VERIFIED | REJECT of T-004 with 7 legitimate blocking issues. Fixes applied (see T-004) |
| T-900 | Reviewer rejection test (synthetic fixture in scratchpad) | independent-reviewer | read-only | VERIFIED | REJECT with 8 blocking issues: all 7 planted flaws plus the false modification claim |

> Condensed copies of every findings report are stored in `reviews/PHASE-7-FINDINGS.md`. "VERIFIED (findings report)" means the *read-only report* was checked by the Super Agent (spot-checks noted). It does not mean the findings are fixed.

## 3. Master backlog (prioritised from T-010…T-018, 10 Oct 2026 00:08)

**Ownership note:** code and `docs/00`–`11` are currently locked by the peer session (`docs/project-state/FILE-OWNERSHIP.md` §2). Implementation tasks below are `READY` for this system **only after** the peer releases those locks, or must be handed to the peer. Nothing below has been implemented.

### P0: critical blockers

| ID | Task | Owner | Depends on | Files allowed | Acceptance criteria | Verification | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-100 | Owner decisions on OQ-01/16 (navigation and labels), OQ-02 (framework), OQ-05/10 (timeout and pause), OQ-09 (reveal) | **Owner** | — | — | Answers recorded in DECISION-LOG and `docs/11` | — | BLOCKED (awaiting owner) |
| T-101 | Remove unapproved rule decisions from code, or document them as Proposed: reveal gating, pause/timeout blocking, MAX_SQUAD, fixed mission→destination mapping | engineering-agent + game-design-agent | T-100 | `src/js/game/state.js`, `src/js/data/missions.js`, `docs/02` | Code behaviour = documented, approved rules; tests updated | `node --test`; reviewer | BLOCKED (T-100, peer lock) |
| T-102 | Build the UI: `index.html`, D18 viewport, screens, routing, timer tick, error screen, storage warning | engineering-agent (peer session) | T-100 | code | Renders at 390×844 and 1440×900; T-VP tests pass | Real render plus browser tests; reviewer | IN_REVIEW: peer reports done. Super-agent reproduced e2e 21/21 and reviewed screenshots (07:08). Defects T-160/T-161 found. Built before T-100, so rule defaults await the owner (`docs/11` §2.1, Q17–Q19). Independent review pending |

### P1: high-priority fixes

| ID | Task | Owner | Depends on | Files allowed | Acceptance criteria | Status |
| --- | --- | --- | --- | --- | --- | --- |
| T-110 | Privacy risk R1: whitelist `SAVE_DRAFT` fields so photo data never reaches localStorage | engineering-agent (peer) | — | `state.js`, `persistence.js`, tests | Test proves non-text draft fields are dropped | VERIFIED: `sanitizeDraft` (`state.js:228`) plus test `persistence.test.js:68`; `npm test` 31/31 at 07:06 |
| T-111 | Fill `docs/07` §5 data-handling statement for the browser-stored session, drafts and settings (P8/P9) | qa-safety-agent | T-110 | `docs/07` | Matches the actual storage keys; owner approves wording | BLOCKED (owner wording, peer lock) |
| T-112 | Fix stale "no code" claims and the `docs/agents/` paths in `docs/00`, `docs/06`, README | documentation-agent (peer) | — | those files | Statements match the repo; link check 0 broken | VERIFIED: `grep` finds no `docs/agents` or "documentation only" in `docs/00`, `docs/06`, README (07:07) |
| T-113 | `npm run check` failed (missing `check.mjs` at 00:06, then missing `src/js/main.js` at 00:14) | engineering-agent (peer build) | T-102 | — | `npm run check` exits 0 | VERIFIED: resolved by the peer's build. `npm run check` → "check: OK (12 JS modules, 7 HTML refs, 5 stylesheets)", exit 0 (T-904 and super-agent re-run, 10 Oct about 00:18) |
| T-114 | Destination register: apply OQ-07 decision; record map-printed names (FLAME Entrance, HOUSING, COMMON AREAS, EATERIES); mark verified entries with who/when/what | campus-map-agent | owner OQ-07 | `docs/03`, `destinations.js` | Each destination cites its legend number; reviewer APPROVE | BLOCKED (owner) |
| T-115 | Contrast fixes: restrict fern, ochre, terracotta and glitch to large text or decoration; ink on ochre for tokens; define the focus-ring colour; darken terracotta for buttons | ui-ux-agent | owner approves palette | `docs/05`, CSS | Every text pair ≥ 4.5:1 per contrast.py | BLOCKED (owner palette approval) |
| T-116 | Remove the `docs/05` §13.3 optional frame and "rounded corners" safe-area wording (D18) | ui-ux-agent | OQ-15 | `docs/05` | No frame language; reviewer APPROVE | BLOCKED (OQ-15, peer lock) |

### New from build verification (10 Oct 07:09)

| ID | Task | Pri | Owner | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| T-160 | Map labels overlap/clip at 390px | P1 | engineering-agent (peer session) | — | VERIFIED: declutter in `src/js/ui/map.js`; `labelCollisions()` in `scripts/e2e.mjs` (lines 117, 379, 401–404). Super-agent re-ran at 07:10: `npm test` 31/31, check OK, e2e 21/21, and reviewed screenshots `18-phone-390-map.png` and `18b-phone-390-map-fit.png`: no overlap or clipping |
| T-161 | The official map image is reproduced directly on the title and map screens while Q10 (rights) is open. Owner to decide: use with attribution, or redraw | P1 | **Owner** → campus-map-agent | Q10 | BLOCKED (owner) |
| T-163 | Declutter hides labels on active glitch pins (e.g. the Eating Place glitch pin is unlabelled at default zoom while plain places keep labels; zoomed out only Shantiniketan is labelled). Consider short labels, label-on-focus, or always labelling the selected and active glitch | P3 | ui-ux-agent → engineering-agent | T-160 | BACKLOG |
| T-164 | Review the gameplay overhaul once the peer releases it: game rules vs D7 (game-design), honest squad labelling vs D14 (squad-social), streak/daily data vs `docs/07` (qa-safety), real render at phone and MacBook sizes (ui-ux, reviewer) | P1 | super-agent → specialists | Peer release; OQ-17 | BLOCKED (peer lock) |
| T-162 | Independent review of the playable build (T-102) at phone and MacBook sizes, incl. contrast on the real render and keyboard/screen-reader pass | P1 | independent-reviewer + qa-safety-agent | — | READY |

### P2: missing features and documentation gaps

| ID | Task | Owner | Depends on | Status |
| --- | --- | --- | --- | --- |
| T-120 | Restore source requirements per owner decisions: SRC-02 seven elements, SRC-03 candidate areas, SRC-04/05 wording, SRC-09/10 card and results fields, SRC-11 roads/classes, SRC-12 optional tracking note, SRC-13 inventory records | documentation-agent + game-design-agent + ui-ux-agent | OQ-04, OQ-06, OQ-08 | BLOCKED (owner) |
| T-121 | Location state table: add timeout, stale and page-hidden rows with copy; a retry action; the "Location unverified" label (SRC-07); `device/manual/simulated` provenance and timestamp/accuracy fields in `docs/06` §11 | gps-movement-agent | Q2 | BACKLOG |
| T-122 | Squad: state and copy table for the chosen model; local test profiles labelled "Sample"; S13 squad contributions; consent step | squad-social-agent | OQ-03/Q4 | BLOCKED (owner) |
| T-123 | Test plan additions: T-VPT-01…05 (viewport, D18/D20), T-MIS-06/07, T-VAL-10, T-LOC-06/07, T-ACC-08, T-HON-04, T-PER-06; rules R8/R12 and pause blocking; fix the AC6 row | qa-safety-agent | — | BLOCKED (peer lock) |
| T-124 | Screen-spec gaps: Back on S3/S4; the session-bar menu; the confirmation overlay spec; S13 exit; bottom-nav visibility on S6–S9; pause/timeout during S7/S8; expired returning session; S10 empty state; spec the SIGNAL / PHYSICAL_COMPLETE / DIGITAL_COMPLETE display states | ui-ux-agent | OQ-09 for SIGNAL | BLOCKED (peer lock) |
| T-125 | `docs/11` hygiene: Q16 is stale and out of order; DOC-01 says "13 documents"; index `docs/Description.md` or retire it (OQ-A3) | documentation-agent | — | BLOCKED (peer lock) |
| T-126 | Rename destination IDs to avoid collision with decision IDs (OQ-13) | documentation-agent + campus-map-agent | owner OK | BLOCKED (owner) |

### P3: improvements

| ID | Task | Owner | Depends on | Status |
| --- | --- | --- | --- | --- |
| T-130 | Align code names with spec (`pausedMs` → `accumulatedPausedMs`, `celebrated` → `tokensAwarded`), or update `docs/06` | engineering-agent | — | BACKLOG |
| T-131 | Copy: "running out of energy" → "low on energy" (Low Battery) so the safety grep stays clean | game-design-agent | — | BACKLOG |
| T-132 | Art-direction guardrails: avoid metric-tile look on S9/S17; keep scanline and pixel effects contained | ui-ux-agent | — | BACKLOG |
| T-133 | Ask the owner to commit work regularly (process evidence, OQ-A5) | Owner | — | BLOCKED (owner) |

### P4: future ideas (not scheduled)

| ID | Idea | Owner | Prerequisite | Status |
| --- | --- | --- | --- | --- |
| T-140 | Calibrated live map mode | gps-movement-agent + campus-map-agent | On-site calibration (`docs/03` §10), Q2 | BACKLOG |
| T-141 | Real squad sync | squad-social-agent + engineering-agent | Backend, accounts, privacy review (option D in T-016) | BACKLOG |
| T-142 | Playtest protocol with consent script and data sheet | qa-safety-agent + academic-presentation-agent | `docs/07` §12; needed to resolve OQ-11 | BACKLOG |

### Academic track

| ID | Task | Owner | Depends on | Status |
| --- | --- | --- | --- | --- |
| T-150 | Rubric alignment | academic-presentation-agent | OQ-A4 (brief) | BLOCKED (owner) |
| T-151 | Jury Q&A and demo plan (12 draft questions are in `reviews/PHASE-7-FINDINGS.md` §G) | academic-presentation-agent | T-102, Q8 | BACKLOG |
