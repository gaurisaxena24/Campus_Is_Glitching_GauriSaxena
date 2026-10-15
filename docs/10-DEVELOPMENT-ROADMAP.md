# Development Roadmap

**Project:** The Campus Is Glitching
**Version:** 1.0
**Date:** 9 October 2026

> **Build route:** everything is designed, built, tested, and maintained through Claude Code in the repository ([D17, D19](./11-DECISIONS-AND-OPEN-QUESTIONS.md#1-confirmed-decisions)). Figma Make is not part of this roadmap; the former Figma Make deliverable ([09](./09-FIGMA-MAKE-MASTER-PROMPT.md)) is superseded.
>
> **Priority rule:** build a reliable core game first (missions, rewards, timer) before adding technically complex features such as GPS or multiplayer.

## Status Overview

| Phase | Name | Status |
| --- | --- | --- |
| 1 | Repository audit and documentation | In progress (documentation drafted 9 October 2026; review pending) |
| 2 | Phone viewport shell, core interface, and navigation | First build implemented 10 Oct 2026; owner review pending |
| 3 | Mission logic and reward validation | Implemented and unit tested 10 Oct 2026 |
| 4 | Timer and persistence | Implemented and unit tested 10 Oct 2026 (defaults for Q5, Q6, Q11 await confirmation) |
| 5 | Campus map and exploration | Illustrative map implemented 10 Oct 2026; owner review of placements pending (Q12, Q17) |
| 6 | Movement tracking (only if justified and feasible) | Planned, conditional |
| 7 | Accessibility and phone viewport refinement | Partly done: automated viewport tests pass in Chrome; screen reader, Safari and real-phone checks not run |
| 8 | Testing, bug fixes, and final presentation | In progress: unit, build and browser suites exist and pass |

Dates are not set. Add them once the assignment schedule is confirmed.

---

## Phase 1: Repository Audit and Documentation

| | |
| --- | --- |
| **Completed** | Repository inspected (only `README.md` and the project brief found). Documentation pack drafted in `docs/`. README rewritten. |
| **Remaining tasks** | Review all documents; resolve or acknowledge open questions in [11](./11-DECISIONS-AND-OPEN-QUESTIONS.md); commit documentation. |
| **Dependencies** | None |
| **Deliverables** | 13 Markdown documents |
| **Completion criteria** | Documents reviewed; open questions Q1 to Q15 each have an owner or decision. |

## Phase 2: Phone Viewport Shell, Core Interface, and Navigation

| | |
| --- | --- |
| **Tasks** | Choose the web framework (Q9); build the phone-sized viewport shell centred in the browser ([06 section 15](./06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md#15-phone-viewport-implementation-implemented-10-oct-2026)); build screens S1 to S17 in code with Claude Code; set up shared session state; implement routing and bottom navigation (Map, Missions, Items, Squad, Status); add session bar. |
| **Dependencies** | Phase 1; framework choice (Q9) and screen contents for Items, Squad, Status (Q16) in [11](./11-DECISIONS-AND-OPEN-QUESTIONS.md#2-open-questions). |
| **Deliverables** | Running web app in the repository, with all screens connected inside the phone viewport. |
| **Completion criteria** | Every screen reachable as in [04](./04-USER-FLOWS-AND-SCREEN-SPECIFICATION.md#3-primary-user-journey); no dead ends; T-VP-01, T-VP-03, T-VP-06 observed passing on a MacBook and at 390 x 844. |

## Phase 3: Mission Logic and Reward Validation

| | |
| --- | --- |
| **Tasks** | Define the five missions as data; implement `UNDISCOVERED → ACTIVE → REPAIRED`; independent physical and digital completion; submission validation; derived token count. |
| **Dependencies** | Phase 2 |
| **Deliverables** | Working mission flow for all five missions. |
| **Completion criteria** | T-MIS, T-STA, T-TOK, and T-VAL tests pass in [08](./08-TEST-PLAN-AND-ACCEPTANCE-CRITERIA.md). |

## Phase 4: Timer and Persistence

| | |
| --- | --- |
| **Tasks** | Timestamp-based timer; start, pause, resume, finish, restart, timeout; decide and implement timeout behaviour; decide on persistence; if adopted, implement local save and restore. |
| **Dependencies** | Phase 3; decisions on Q5 (timeout) and Q6 (refresh). |
| **Deliverables** | Reliable session lifecycle. |
| **Completion criteria** | T-TIM tests pass; T-PER tests pass or are marked N/A with a recorded decision. |

## Phase 5: Campus Map and Exploration

| | |
| --- | --- |
| **Tasks** | Verify the nine destinations on the official map; create illustrated map art preserving layout; place labels and glitch markers; map mode label; list fallback. |
| **Dependencies** | Phase 2; decision on Q1 (illustrative or calibrated); map usage rights check. |
| **Deliverables** | Illustrated map integrated with missions. |
| **Completion criteria** | T-MAP tests pass; destination register in [03](./03-CAMPUS-MAP-SPECIFICATION.md#3-destination-register) updated to "Verified". |

## Phase 6: Movement Tracking (Conditional)

Only start this phase if Q2 concludes that GPS is genuinely useful and feasible.

| | |
| --- | --- |
| **Tasks** | Calibration process from [03](./03-CAMPUS-MAP-SPECIFICATION.md#10-calibration-requirements); opt-in foreground location; accuracy handling; fallbacks. |
| **Dependencies** | Phases 4 and 5; privacy review against [07](./07-PRIVACY-AND-SAFETY-GUIDELINES.md). |
| **Deliverables** | Optional calibrated live map mode. |
| **Completion criteria** | T-LOC tests pass on real devices on campus; calibration error recorded. |

## Phase 7: Accessibility and Phone Viewport Refinement

| | |
| --- | --- |
| **Tasks** | Contrast checks on textured backgrounds; keyboard and screen reader pass; reduced motion; phone viewport at MacBook sizes (1440 x 900, 1280 x 600, full screen) and phone sizes (390 x 844, 320 x 568); automated viewport tests; copy review for safety language. |
| **Dependencies** | Phases 2 to 5 |
| **Deliverables** | Refined interface. |
| **Completion criteria** | T-ACC and T-VP tests pass on the running application. |

## Phase 8: Testing, Bug Fixes, and Final Presentation

| | |
| --- | --- |
| **Tasks** | Full test plan run; bug log triage and fixes; regression suite; playtest with students (with consent); prepare demonstration; update README status. |
| **Dependencies** | All earlier phases; decision on Q8 (demonstration format). |
| **Deliverables** | Tested application shown on a MacBook as a centred phone viewport, completed test plan, presentation materials. |
| **Completion criteria** | All acceptance criteria AC1 to AC7 pass or have a documented, accepted exception. |
