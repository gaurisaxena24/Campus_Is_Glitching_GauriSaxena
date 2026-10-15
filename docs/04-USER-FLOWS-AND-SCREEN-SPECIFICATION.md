# User Flows and Screen Specification

**Project:** The Campus Is Glitching
**Version:** 1.0
**Date:** 9 October 2026

> **Implementation status:** No screens exist in the repository. All flows and screens below are **Proposed** designs and **Not implemented**. Game rules referenced here are defined in [02-GAME-DESIGN-DOCUMENT.md](./02-GAME-DESIGN-DOCUMENT.md).

> **Build note (10 October 2026):** The first build implements the onboarding flow (title, tutorial with Skip, first quest), the map, mission, physical and digital screens, the repair sequence, Quests, Inventory, Squad and Status tabs, pause, confirmation dialogs, time's up and the summary. S15 to S17 now have content as described in [06 section 2](./06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md#2-implementation-status-summary); their final contents still depend on Q16. Navigation is in-app state; the browser Back button is not used by the game.

---

## 1. Global Rules for All Screens

- **Every screen, overlay, and modal renders inside the phone-sized game viewport.** On a MacBook the viewport is centred in the browser window; on a phone it fills the screen. Layout rules are in [05-VISUAL-DESIGN-SYSTEM.md](./05-VISUAL-DESIGN-SYSTEM.md#13-phone-viewport-and-desktop-presentation). There is no separate desktop layout.
- **No horizontal scrolling, no clipped controls.** The session bar and bottom navigation stay fixed; the content area scrolls internally.
- **The area outside the viewport contains no game controls, navigation, or statistics.**
- **The timer never resets or pauses because of navigation.** Only Pause, Resume, Restart, Finish, and timeout change it.
- **Progress is never erased by navigation.** Leaving a submission form keeps any typed text (Proposed: as a draft until the session ends).
- **A persistent session bar** is visible on every in-session screen, showing time remaining, timer control, and token count.
- **Destructive actions** (Restart, Finish early) require confirmation.
- **Simulated or unconfigured features** are labelled as such wherever they appear.

## 2. Screen Inventory

| ID | Screen | Purpose |
| --- | --- | --- |
| S1 | Welcome | Introduce the game and start onboarding |
| S2 | How to Play | Explain rules in three short steps |
| S3 | Permissions and Safety | Explain optional location, photos, and safety; collect choices |
| S4 | Ready / Start Session | Confirm readiness and start the timer |
| S5 | Campus Map | Explore destinations and glitches |
| S6 | Mission Detail | Show a glitch's story and both components; activate the mission |
| S7 | Physical Task | Guide and confirm the physical component |
| S8 | Digital Submission | Collect the digital component |
| S9 | Glitch Repaired | Confirm repair and award tokens |
| S10 | Quest Journal | List all missions, states, and submissions |
| S11 | Pause | Paused state with resume, restart, and finish |
| S12 | Time's Up | Shown on timeout |
| S13 | Session Summary | Final results |
| S14 | Error and Fallback states | Shared patterns for failures |
| S15 | Items | Inventory of items or rewards collected (contents: open question [Q16](./11-DECISIONS-AND-OPEN-QUESTIONS.md#2-open-questions)) |
| S16 | Squad | Squad information (contents: open question Q16; must follow the multiplayer honesty rule D14 and Q4) |
| S17 | Status | Session status: time, tokens, glitches repaired (contents: open question Q16) |

### 2.1 Bottom Navigation (Proposed)

The project owner's update lists **map, missions, items, squad, and status** screens. Proposed bottom navigation inside the phone viewport:

| Tab | Screen | Status |
| --- | --- | --- |
| Map | S5 Campus Map | Specified below |
| Missions | S10 Quest Journal | Specified below |
| Items | S15 Items | Placeholder; contents open (Q16) |
| Squad | S16 Squad | Placeholder; contents open (Q16, Q4) |
| Status | S17 Status | Placeholder; contents open (Q16) |

Five tabs must fit the narrow viewport: icon plus short label, minimum 44 x 44px each. Switching tabs never resets the timer or progress.

## 3. Primary User Journey

```text
S1 Welcome -> S2 How to Play -> S3 Permissions and Safety -> S4 Ready
   -> [Start] timer begins
   -> S5 Campus Map <-> S10 Quest Journal
        -> S6 Mission Detail -> [Activate] mission ACTIVE
             -> S7 Physical Task  (either order)
             -> S8 Digital Submission
             -> both complete -> S9 Glitch Repaired (+2 tokens)
        -> back to S5 / S10
   -> [Finish] or timeout -> S12 Time's Up (timeout only) -> S13 Session Summary
   -> [Play again] -> confirmation -> S4 Ready
```

## 4. Flow Details

### 4.1 Onboarding (S1 to S4)

1. Player opens the app and sees S1.
2. S2 explains: five glitches, physical plus digital to repair each, 15 minutes, two tokens per repair.
3. S3 explains that location and photos are optional and states the safety rules. The player can continue without granting anything.
4. S4 shows "Start 15-minute session". The timer starts only on tap.

Returning players (Proposed): if a session is in progress and persistence is supported, the app offers "Continue session" or "Start new".

### 4.2 Mission Discovery and Activation

1. On S5 or S10, the player selects an `UNDISCOVERED` glitch.
2. S6 shows the glitch story, physical component, digital component, accessible alternative, and reward.
3. Player taps "Start repair". State becomes `ACTIVE`.

### 4.3 Completing Components (either order)

- From S6, the player opens either S7 or S8.
- Completing one shows a checkmark for that component on S6 and S10.
- When the second is completed, the mission becomes `REPAIRED` and S9 appears.

### 4.4 Repair Confirmation and Rewards

- S9 shows the repaired glitch, "+2 repair tokens", and the new totals.
- Token count in the session bar updates once.
- Returning to S9 or revisiting the mission never re-awards tokens.

### 4.5 Timer Controls

| Action | Where | Result |
| --- | --- | --- |
| Start | S4 | Timer begins at 15:00 |
| Pause | Session bar | Opens S11; time stops |
| Resume | S11 | Returns to previous screen; time continues |
| Finish | S11 or session bar menu | Confirmation, then S13 |
| Restart | S11 | Confirmation, then all progress and tokens reset, returns to S4 |
| Timeout | Automatic at 0:00 | S12, then S13 |

## 5. Screen Specifications

### S1 Welcome

| Aspect | Specification |
| --- | --- |
| Purpose | Set the tone and introduce the glitching campus. |
| Key elements | Title, short story line, illustrated campus art, "Begin" button. |
| Interactions | Begin goes to S2. |
| States | Default; Continue session available (if persistence exists). |
| Edge cases | Art fails to load: show title and text on parchment background. |

### S2 How to Play

| Aspect | Specification |
| --- | --- |
| Purpose | Teach the rules quickly. |
| Key elements | Three steps: explore, repair (physical plus digital), earn tokens. Mention 15 minutes and five glitches. |
| Interactions | Next, Back. |
| States | Default. |
| Edge cases | Must be readable without scrolling on small phones if possible; otherwise scroll with a visible Next. |

### S3 Permissions and Safety

| Aspect | Specification |
| --- | --- |
| Purpose | Make optional features and safety rules clear before play. |
| Key elements | Location explanation and toggle (only if location is implemented); photo note; safety rules (walk, do not run, stay in open areas, stop if uncomfortable, all social interaction is voluntary). |
| Interactions | Continue without location; Enable location (triggers browser prompt). |
| States | Location not implemented (toggle hidden, note shown); granted; denied; unsupported. |
| Edge cases | Permission denied: continue in manual mode with no error tone. |

### S4 Ready / Start Session

| Aspect | Specification |
| --- | --- |
| Purpose | Confirm the player is ready; start the timer. |
| Key elements | 15:00 display, Start button, reminder that the timer can be paused. |
| Interactions | Start goes to S5 and starts the timer. |
| States | Ready. |
| Edge cases | Double tap on Start must not start two timers. |

### S5 Campus Map

| Aspect | Specification |
| --- | --- |
| Purpose | Explore the campus and choose a glitch. |
| Key elements | Session bar, map in the active mode with mode label, nine destination labels, glitch markers by state, legend, bottom navigation. |
| Interactions | Tap destination; tap glitch; pan and zoom; open journal. |
| States | Illustrative mode; non-geographic fallback; calibrated live mode (only if implemented); loading; map failed. |
| Edge cases | Map image fails: switch to list view of destinations. Location denied: no player marker, short note. Pan and zoom stay inside the phone viewport and never cause page-level scrolling. See [03-CAMPUS-MAP-SPECIFICATION.md](./03-CAMPUS-MAP-SPECIFICATION.md). |

### S6 Mission Detail

| Aspect | Specification |
| --- | --- |
| Purpose | Explain one glitch and show progress on both components. |
| Key elements | Mission name, glitch story, physical component card with status, digital component card with status, accessible alternative, reward "2 repair tokens". |
| Interactions | Start repair (`UNDISCOVERED`); open physical task; open digital submission; back to map. |
| States | `UNDISCOVERED`; `ACTIVE` with 0, 1, or 2 components complete; `REPAIRED` (read-only, shows submission). |
| Edge cases | Opening a `REPAIRED` mission shows its record, not a new attempt. |

### S7 Physical Task

| Aspect | Specification |
| --- | --- |
| Purpose | Guide the real-world action and let the player confirm it. |
| Key elements | Instructions, accessible alternative, safety reminder, "I've done this" button. Optional helper timer for Frozen Character's two-minute walk (Proposed). |
| Interactions | Confirm completion; back without completing. |
| States | Not done; done. |
| Edge cases | Helper timer must not be confused with the session timer. Leaving and returning keeps state. |

### S8 Digital Submission

| Aspect | Specification |
| --- | --- |
| Purpose | Collect the digital component. |
| Key elements | Mission-specific input (see table below), optional photo control where applicable, privacy note, Submit. |
| Interactions | Enter text; add or remove optional photo; submit. |
| States | Empty; valid; invalid with message; submitting; submitted. |
| Edge cases | Empty submission rejected with a clear message. Draft text retained if the player leaves. Photo upload failure does not block text submission. |

| Mission | Input |
| --- | --- |
| Frozen Character | Observation text, optional photo |
| Lost Colour | Five colour entries (colour plus where found), or a collage |
| Missing Connection | "One thing I learned" text with a note: do not include names or private details |
| Time Loop | Place name (free text) and new observation, optional photo |
| Low Battery | Recharge signal (single choice) or short reflection |

### S9 Glitch Repaired

| Aspect | Specification |
| --- | --- |
| Purpose | Celebrate the repair and show the reward. |
| Key elements | Repaired illustration, mission name, "+2 repair tokens", totals (glitches x/5, tokens y/10), Continue. |
| Interactions | Continue to map; open journal. |
| States | Shown once per repair. |
| Edge cases | If all five are repaired, offer "Finish session" alongside Continue. |

### S10 Quest Journal

| Aspect | Specification |
| --- | --- |
| Purpose | Single view of all missions and progress. |
| Key elements | Five mission entries with state, component checkmarks, and submissions; totals. |
| Interactions | Open mission detail. |
| States | Empty (no missions started); partial; complete. |
| Edge cases | Must remain usable without the map. |

### S11 Pause

| Aspect | Specification |
| --- | --- |
| Purpose | Stop the timer and offer session controls. |
| Key elements | "Paused", time remaining, Resume, Finish, Restart. |
| Interactions | Resume; Finish (confirm); Restart (confirm). |
| States | Paused. |
| Edge cases | App backgrounded while running: behaviour is an open question (see [06](./06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md#6-timer)). |

### S12 Time's Up

| Aspect | Specification |
| --- | --- |
| Purpose | Mark the end of the session clearly and kindly. |
| Key elements | "Time's up" message, repaired count, View summary. |
| Interactions | View summary. |
| States | Shown on timeout only. |
| Edge cases | If a submission form is open at timeout, handling is an open question; typed text must not be silently lost. |

### S13 Session Summary

| Aspect | Specification |
| --- | --- |
| Purpose | Show results and reflections. |
| Key elements | Glitches repaired x/5, tokens y/10, list of submissions, Play again. |
| Interactions | Play again (confirm, then reset to S4). |
| States | Partial; all repaired; none repaired (encouraging copy, no penalty language). |
| Edge cases | No submissions: show a friendly empty state. |

### S15 Items (placeholder)

| Aspect | Specification |
| --- | --- |
| Purpose | To be defined (Q16). Likely an inventory of collected items or repair tokens. |
| Key elements | To be defined. Must fit the phone viewport. |
| States | Empty state required. |
| Edge cases | Must not award or display tokens differently from the rule "2 x repaired glitches". |

### S16 Squad (placeholder)

| Aspect | Specification |
| --- | --- |
| Purpose | To be defined (Q16, Q4). |
| Key elements | To be defined. Must fit the phone viewport. |
| States | Until a backend exists: "Squad play on one device" or "Squad sync not available", never simulated live members or locations. |
| Edge cases | Location sharing is optional (D8); no personal data about squad members is required. |

### S17 Status (placeholder)

| Aspect | Specification |
| --- | --- |
| Purpose | To be defined (Q16). Proposed: session overview with time remaining, timer controls, glitches x/5, tokens y/10. |
| Key elements | To be defined. Must fit the phone viewport. |
| States | Running, paused, ended. |
| Edge cases | Values must match the session bar exactly. |

## 6. Error and Fallback States (S14)

| Situation | User-facing behaviour |
| --- | --- |
| Map asset fails to load | Show non-geographic destination list with a short notice. |
| Illustration fails to load | Show parchment background and text; layout does not break. |
| Location denied | Continue in manual mode. Short neutral note on map. |
| Location unavailable or low accuracy | Hide player marker; explain briefly. |
| Location unsupported | Hide location controls entirely. |
| Invalid submission | Inline message stating what is missing; keep entered data. |
| Photo too large or failed | Message with option to retry or continue without a photo. |
| Network failure (only if a backend exists) | Keep data locally where possible; show a retry option; never claim a save succeeded when it did not. |
| Storage unavailable (private mode) | Warn that progress may not survive a refresh. |
| Browser window too short | Viewport keeps its minimum width and fits the window height; content scrolls inside the viewport; no controls are clipped. |
