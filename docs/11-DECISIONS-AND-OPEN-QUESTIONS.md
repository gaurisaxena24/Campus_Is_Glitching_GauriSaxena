# Decisions and Open Questions

**Project:** The Campus Is Glitching
**Version:** 1.0
**Date:** 9 October 2026

This is the single place where decisions are recorded. Open questions stay open until a decision is written in section 1 with a date. Do not treat proposals as decisions.

---

## 1. Confirmed Decisions

Sourced from the Project Brief v1.0, the documentation requirements, and the project owner's update, all provided on 9 October 2026.

| ID | Decision | Source | Date |
| --- | --- | --- | --- |
| D1 | The game is a hybrid physical and digital campus wellness game set at FLAME University. | Project Brief | 9 Oct 2026 |
| D2 | A session lasts 15 minutes. | Project Brief | 9 Oct 2026 |
| D3 | There are exactly five missions: Frozen Character, Lost Colour, Missing Connection, Time Loop, Low Battery. | Documentation requirements | 9 Oct 2026 |
| D4 | Every mission has a physical and a digital component; a glitch is repaired only when both are complete. | Project Brief | 9 Oct 2026 |
| D5 | Components can be completed in either order. | Documentation requirements | 9 Oct 2026 |
| D6 | Mission states are `UNDISCOVERED → ACTIVE → REPAIRED`. | Documentation requirements | 9 Oct 2026 |
| D7 | Exactly two tokens per repaired glitch, awarded once, with duplicate rewards prevented. | Project Brief | 9 Oct 2026 |
| D8 | GPS and location sharing are optional; the game is playable without GPS. | Project Brief | 9 Oct 2026 |
| D9 | GPS proximity never counts as proof of a social interaction. | Documentation requirements | 9 Oct 2026 |
| D10 | Location tracking, if any, is foreground-only. | Documentation requirements | 9 Oct 2026 |
| D11 | The official FLAME University Campus Map 2025 is the geographic reference. No invented buildings, paths, coordinates, or distances. | Project Brief | 9 Oct 2026 |
| D12 | The nine initial destinations are as listed in [03](./03-CAMPUS-MAP-SPECIFICATION.md#3-destination-register). | Documentation requirements | 9 Oct 2026 |
| D13 | Visual direction: vintage illustrated adventure RPG; not a fitness tracker or corporate dashboard. | Documentation requirements | 9 Oct 2026 |
| D14 | Mock or simulated data is never presented as live GPS or multiplayer data. | Project Brief | 9 Oct 2026 |
| D15 | Out of scope unless specifically implemented: university system integration, automatic public social-media posting, automatic proof of social interaction, continuous background GPS, production multiplayer without a backend. | Project Brief | 9 Oct 2026 |
| D16 | Photos and social interactions can be declined. | Documentation requirements | 9 Oct 2026 |
| D17 | Figma Make is removed as a tool, workflow, deliverable, and dependency. The game is designed, built, tested, and maintained through Claude Code in the repository codebase. The former Figma Make prompt ([09](./09-FIGMA-MAKE-MASTER-PROMPT.md)) is superseded; its design requirements were moved into [04](./04-USER-FLOWS-AND-SCREEN-SPECIFICATION.md), [05](./05-VISUAL-DESIGN-SYSTEM.md), and [06](./06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md). | Project owner update | 9 Oct 2026 |
| D18 | The game is a mobile-first, phone-sized interface (about 9:19.5, maximum width about 390 to 430 CSS px, fitted to the browser height) centred in a MacBook browser window. The desktop browser is only the presentation context; it is not a desktop layout or dashboard. No laptop or second-device mockup. See [05](./05-VISUAL-DESIGN-SYSTEM.md#13-phone-viewport-and-desktop-presentation). | Project owner update | 9 Oct 2026 |
| D19 | The build route is a coded web application built with Claude Code. This resolves the "Figma Make or coded app" part of Q9. | Project owner update | 9 Oct 2026 |
| D20 | Roles: the UI/UX Agent specifies screens, layout, tokens, states, responsive behaviour, and accessibility; the Engineering Agent implements them in code; the QA Agent and Independent Reviewer verify the real rendered application at phone size and at MacBook browser size. Design text or mockups are never evidence of implementation. | Project owner update | 9 Oct 2026 |

## 2. Open Questions

| ID | Question | Options | Recommendation (Proposed) | Affects |
| --- | --- | --- | --- | --- |
| Q1 | Is the campus map illustrative or geographically calibrated? | Illustrative only; calibrated later; calibrated from the start | Illustrative for the first build | [03](./03-CAMPUS-MAP-SPECIFICATION.md), [06](./06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md) |
| Q2 | Is GPS genuinely necessary for the core experience? | Not needed; nice-to-have; required | Not needed for the core game; reconsider after Phase 5 | Roadmap Phase 6 |
| Q3 | How is physical completion validated? | Self-report; self-report plus digital evidence; sensor-based; facilitator check | Self-report, with the digital component serving as reflection | [02](./02-GAME-DESIGN-DOCUMENT.md), [06](./06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md) |
| Q4 | Does the app need squads or multiplayer? | Single device shared by friends; separate devices without sync; real-time multiplayer with backend | Shared single device or separate unsynced devices for the first build | [02](./02-GAME-DESIGN-DOCUMENT.md#12-squads-and-multiplayer), [06](./06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md#13-potential-backend-requirements) |
| Q5 | What happens when the timer expires? | End immediately; allow finishing an in-progress submission; grace period | End session; preserve any typed text in the summary | [02](./02-GAME-DESIGN-DOCUMENT.md#11-failure-and-recovery-states), [04](./04-USER-FLOWS-AND-SCREEN-SPECIFICATION.md) |
| Q6 | Does progress survive a refresh? | No; yes via local storage | Yes via local storage, if feasible in the build route | [06](./06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md#8-persistence) |
| Q7 | Are token rewards purely in-game? | In-game only; linked to real-world rewards | In-game only | [02](./02-GAME-DESIGN-DOCUMENT.md#9-reward-economy) |
| Q8 | How will the final game be demonstrated for the assignment? | Live playtest on campus; recorded walkthrough; prototype demo in class; combination | To be decided with the course requirements | Roadmap Phase 8 |
| Q9 | Which web framework and tooling should the Claude Code build use? (Build route itself is decided by D19.) The repository has no existing framework to reuse. | Plain HTML, CSS, and TypeScript; a lightweight component framework; other | Choose the smallest stack that supports routing, shared state, and automated browser tests | [06](./06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md), Roadmap Phase 2 |
| Q10 | May the official map image be reproduced in the game, or must it be redrawn? | Use directly with attribution; redraw | Redraw in the game's style, citing the source | [03](./03-CAMPUS-MAP-SPECIFICATION.md) |
| Q11 | Does the timer keep running when the app is backgrounded or the phone is locked? | Keep running; auto-pause | To be decided after testing | [06](./06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md#6-timer) |
| Q12 | Which missions, if any, are assigned to specific destinations? | None; one per destination; suggested only | Suggested only, never required | [03](./03-CAMPUS-MAP-SPECIFICATION.md#5-mission-placement) |
| Q13 | Is a remote interaction (message or call) an acceptable alternative for Missing Connection? | Yes; no | To be decided | [02](./02-GAME-DESIGN-DOCUMENT.md#63-missing-connection) |
| Q14 | Can more than one mission be `ACTIVE` at once, and can missions be skipped? | Yes; no | Yes to both | [02](./02-GAME-DESIGN-DOCUMENT.md#52-rules) |
| Q16 | The project owner refers to map, missions, items, squad, and status screens. The current screen specification has Map and Quest Journal only. What do the Items, Squad, and Status screens contain? (The original source documents in the owner's Downloads folder reportedly define a MAP / QUESTS / INVENTORY / SQUAD / STATUS navigation; they have not been reviewed for this pack.) | Adopt the five-tab navigation from the source documents; keep two tabs | Adopt five tabs once source content is reviewed; Squad must follow D14 | [04](./04-USER-FLOWS-AND-SCREEN-SPECIFICATION.md#2-screen-inventory) |
| Q15 | The original README mentions "social media interactions". Does this mean in-app social tasks, or posting to social media? | In-app social tasks only; optional sharing; posting | In-app social tasks only, consistent with D15 | README, [01](./01-PROJECT-BRIEF.md) |

### 2.1 Defaults Implemented in Code (awaiting owner confirmation)

The first build (10 October 2026) had to pick a behaviour for several open questions. These are **implemented defaults, not confirmed decisions**. Each can be changed; see [06 section 2.1](./06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md#21-as-built-behaviour-decisions-proposed-awaiting-owner-confirmation).

| Question | Implemented default |
| --- | --- |
| Q4 Squads | One device shared by 1 to 6 people; no names; nothing synced; online squads clearly marked unavailable |
| Q5 Timeout | Session ends at 0:00; active missions stay unrepaired; unsubmitted draft text is listed on the summary. Actions while paused or ended are ignored |
| Q6 Refresh | Progress survives refresh via localStorage; title screen offers Continue |
| Q7 Tokens | In-game only, stated on the Inventory screen |
| Q9 Stack | Plain HTML, CSS and ES modules; no framework; no runtime dependencies |
| Q11 Backgrounded phone | Timer keeps running |
| Q12 Placement | Frozen Character: Plaza; Lost Colour: Shantiniketan; Missing Connection: Mess; Time Loop: APJ; Low Battery: Arjuna. All marked "suggested"; Time Loop lets the player name any place |
| Q13 Remote interaction | Not offered; the alternative is to skip the glitch |
| Q14 Multiple active / skip | Yes to both |
| Q16 Navigation | Five tabs: Map, Quests, Inventory, Squad, Status |

### 2.2 New Questions From the Build

| ID | Question | Notes |
| --- | --- | --- |
| Q17 | The docs list "APJ Abdul Kalam Library". The official map key lists **2. APJ Abdul Kalam** (Academics) and **3. Vivekananda Library** as separate buildings, and names the entrance **46. FLAME Entrance** (not "Main Gate"). Which names should the game use? | The build places "APJ" on key 2 and "Main Gate" on key 46, and shows the official key name on each location panel. The library is not one of the nine destinations. |
| Q18 | Should glitches be revealed progressively? | Built: only Frozen Character at first; the rest after the first repair, or at once via "Reveal all glitches". Not in the original design. |
| Q19 | The owner supplied an illustrated reference map with a baked-in quest tracker and labels. Should it be used as an asset? | Not used: its CHANDRAGUPTA and LIBRARY labels disagree with the official map, and its tracker shows invented numbers. The build uses the official map, restyled. A second reference image (phone UI) was mentioned but not received. |

## 3. Proposed Decisions Awaiting Approval

These appear in other documents marked **Proposed**. They are not decisions yet.

- Colour palette, typography, spacing, and component styling in [05](./05-VISUAL-DESIGN-SYSTEM.md).
- Route structure and data model in [06](./06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md).
- Submission validation rules (for example minimum 3 characters, maximum 500) in [06](./06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md#9-form-validation).
- Low-time warning at 2:00.
- Confirmation before Restart and Finish early.
- Short display labels for destinations other than "APJ".

## 4. Assumptions

| ID | Assumption | How to validate |
| --- | --- | --- |
| A1 | The official 2025 campus map is suitable as the visual/geographical reference. | Compare with the campus on site; confirm currency of the map. |
| A2 | The selected mission areas are accessible and safe at the time of play. | Site visit at the planned play time. |
| A3 | GPS accuracy is not guaranteed between nearby buildings. | Field test with two or more phones if Phase 6 proceeds. |
| A4 | The initial build may run as a web app with foreground-only location tracking. | Build route is a web app (D19); confirm geolocation support in the chosen stack (Q9). |
| A5 | Players have a smartphone with a modern browser. | Playtest recruitment. |
| A6 | 15 minutes is enough to repair several glitches. | Timed playtest. |

## 5. Risks

| ID | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| K1 | Inaccurate GPS shows players in the wrong place | High if GPS used | Medium | Illustrative map by default; no marker without calibration |
| K2 | Players feel pressured into social interaction | Medium | High | Voluntary, skippable, clear copy |
| K3 | Players hurry or move unsafely because of the timer | Medium | High | Pause available; "walk, do not run" copy; no speed rewards |
| K4 | Duplicate token awards from double taps or reloads | Medium | Medium | Tokens derived from repaired count |
| K5 | Timer resets during navigation | Medium | High | Timer in shared state; regression tests |
| K6 | Progress lost on refresh | Medium | Medium | Decide Q6; local persistence |
| K7 | Phone viewport clips controls or overflows at short MacBook browser heights | Medium | High | Height-fitted viewport with internal scrolling; viewport tests T-VP-01 to T-VP-10 |
| K8 | Map reproduction rights unclear | Low | Medium | Resolve Q10; redraw if uncertain |

## 6. Items Requiring Validation

- [ ] Each of the nine destinations located on the official map (update register in doc 03)
- [ ] Map usage rights (Q10)
- [ ] Course requirements for demonstration (Q8)
- [ ] Framework choice (Q9)
- [ ] Contents of Items, Squad, and Status screens (Q16)
- [ ] Mission duration fits within 15 minutes (A6)
- [ ] Safety of any assigned mission areas (A2)

## 7. Change Log

| Date | Change |
| --- | --- |
| 9 Oct 2026 | Decision log created with D1 to D16 and Q1 to Q15. |
| 10 Oct 2026 | First playable build. Implemented defaults recorded in section 2.1; Q17 to Q19 added. |
| 9 Oct 2026 | Project owner update: Figma Make removed (D17), phone-sized viewport on MacBook (D18), Claude Code web app build route (D19), agent roles (D20). Q9 narrowed to framework choice. Q16 added. K7 replaced. |
