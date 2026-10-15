# Technical Implementation Specification

**Project:** The Campus Is Glitching
**Version:** 1.0
**Date:** 9 October 2026

---

## 1. Current Repository State (Verified)

Updated 10 October 2026 after the first build. Earlier versions of this section said "no code"; that is no longer true.

| Item | Found |
| --- | --- |
| Application code | `index.html`, `src/js/**` (12 ES modules), `src/styles/**` (5 stylesheets) |
| Dependency manifest | `package.json` with **no dependencies** (scripts only) |
| Build or run configuration | No bundler. `npm start` runs `scripts/serve.mjs`, a dependency-free static server on port 5173 |
| Environment files | None. No secrets, keys or credentials are used |
| Assets | `assets/map/campus-map.jpg` (stylised from the official map), `assets/map/source-official-campus-map-2025.jpg` (unmodified official map), `assets/map/stylise-map.py` (how the asset was made). Icons are inline SVG in `index.html`. Fonts load from Google Fonts with system fallbacks |
| Tests | `tests/*.test.js` (Node built-in test runner, 31 tests), `scripts/check.mjs` (build check), `scripts/e2e.mjs` (headless Chrome end-to-end and viewport tests, 21 checks) |
| Documentation | `README.md` and this `docs/` folder |

**Stack (resolves Q9 in practice, owner confirmation pending):** plain HTML, CSS and JavaScript ES modules, no framework, no build step, no runtime dependencies. Chosen because the repository had nothing to reuse and the game needs only shared state, a few screens and a map; a framework would add installation and build steps without a stated need.

## 2. Implementation Status Summary

| Capability | Status | Where |
| --- | --- | --- |
| Title screen, tutorial, first quest | **Implemented** | `src/js/ui/screens.js` |
| Screens and navigation (Map, Quests, Inventory, Squad, Status) | **Implemented** (in-app navigation state, no URL routes) | `src/js/app.js`, `src/js/ui/pages.js` |
| Mission state machine (`UNDISCOVERED → ACTIVE → REPAIRED`, parts in either order) | **Implemented and unit tested** | `src/js/game/state.js` |
| Session timer (timestamp based, pause, resume, finish, restart, timeout) | **Implemented and unit tested** | `src/js/game/state.js` |
| Token rewards, exactly once (derived: 2 x repaired) | **Implemented and tested** (unit and browser) | `src/js/game/state.js` |
| Local persistence (localStorage, validated on load, drafts whitelisted, photos never stored) | **Implemented and unit tested** | `src/js/game/persistence.js` |
| Phone-sized viewport on desktop | **Implemented and browser tested** | `src/styles/base.css` |
| Campus map (illustrative mode, pan, zoom, pinch, keyboard, list fallback, legend) | **Implemented**; pinch tested only by code review, not on a real touch device | `src/js/ui/map.js` |
| Photo submission (optional, memory only, never saved or uploaded) | **Implemented**; not covered by automated tests | `src/js/ui/pages.js`, `src/js/app.js` |
| Sound (off by default, synthesised Web Audio tones) | **Implemented**; toggle tested, audio output not verified by ear | `src/js/ui/audio.js` |
| Geolocation | **Not implemented** (deliberately: map not calibrated, see docs/03 s10) | |
| Authentication | Not implemented, not planned | |
| Multiplayer / squad sync | **Not implemented.** Squad screen offers one-device play only and says so | |
| Backend | Not implemented, not required | |

## 2.1 As-Built Behaviour Decisions (Proposed, awaiting owner confirmation)

The code had to choose a behaviour where the design was still open. Each choice is recorded in [11](./11-DECISIONS-AND-OPEN-QUESTIONS.md#2-open-questions) and can be changed.

| Topic | Implemented behaviour | Open question |
| --- | --- | --- |
| Progressive reveal | Only Frozen Character is revealed at first; the other four appear after the first repair, or at once via "Reveal all glitches" on Quests | Q18 |
| Paused or ended session | Starting repairs, completing parts and submitting are ignored unless the session is running | Q5 |
| Timeout | Session ends at 0:00; active missions stay unrepaired; unsubmitted draft text is shown on the summary | Q5 |
| Refresh | Progress survives refresh and browser restart via localStorage; title offers "Continue" | Q6 |
| Backgrounded or locked phone | Timer keeps running (timestamp based), because walking tasks happen away from the screen | Q11 |
| Squad | One device, 1 to 6 people, no names, nothing shared | Q4 |
| Navigation | Five tabs: Map, Quests, Inventory, Squad, Status | Q16 |
| Mission placement | Each glitch is shown at a suggested destination; every mission says it can be done anywhere | Q12 |

## 3. Architecture

- **Platform:** A client-side web app, built mobile-first, shown as a phone-sized viewport centred in a MacBook browser and usable full-screen on a phone ([D18](./11-DECISIONS-AND-OPEN-QUESTIONS.md#1-confirmed-decisions)).
- **Build route:** Implemented in the repository codebase through Claude Code ([D17, D19](./11-DECISIONS-AND-OPEN-QUESTIONS.md#1-confirmed-decisions)). No Figma, Figma Make, or external visual builder is used or required. See section 14.
- **Framework:** None. Plain ES modules (see section 1).
- **Backend:** none required for single-player or single-device play.
- **Data:** a single session object held in client state and optionally persisted to browser storage.

### Modules (proposed names; as built: `data/missions.js`, `data/destinations.js`, `game/state.js`, `game/persistence.js`, `ui/map.js`, `ui/pages.js`, `ui/screens.js`, `ui/audio.js`, `app.js`)

| Module | Responsibility |
| --- | --- |
| `missions` | Static definitions of the five missions |
| `session` | Timer, mission states, tokens, submissions |
| `rewards` | Exactly-once token award logic |
| `persistence` | Save and load the session |
| `map` | Destination data, map mode, marker rendering |
| `location` | Optional geolocation wrapper (only if adopted) |
| `viewport` | Phone-sized app shell, centring, height fitting, outer background |
| `ui` | Screens S1 to S17 from [04-USER-FLOWS-AND-SCREEN-SPECIFICATION.md](./04-USER-FLOWS-AND-SCREEN-SPECIFICATION.md) |

## 4. Routing (Proposed; as built, navigation is in-app state and the URL does not change)

| Route | Screen |
| --- | --- |
| `/` | S1 Welcome |
| `/how-to-play` | S2 |
| `/setup` | S3 |
| `/ready` | S4 |
| `/map` | S5 |
| `/mission/:missionId` | S6 |
| `/mission/:missionId/physical` | S7 |
| `/mission/:missionId/digital` | S8 |
| `/mission/:missionId/repaired` | S9 |
| `/journal` | S10 (Missions tab) |
| `/items` | S15 (contents open, Q16) |
| `/squad` | S16 (contents open, Q16) |
| `/status` | S17 (contents open, Q16) |
| `/summary` | S13 |

S11 Pause and S12 Time's Up are overlays, not routes, so they do not affect history.

**Rule:** the timer and session state live outside the routed screens so that navigation, including browser Back, never resets them. In-session routes redirect to `/ready` if no session has started.

Proposed `missionId` values: `frozen-character`, `lost-colour`, `missing-connection`, `time-loop`, `low-battery`.

## 5. Mission State Model

```text
UNDISCOVERED --activate--> ACTIVE --(physical && digital)--> REPAIRED
```

### Data shape (Proposed)

```ts
type MissionId =
  | "frozen-character"
  | "lost-colour"
  | "missing-connection"
  | "time-loop"
  | "low-battery";

type MissionStatus = "UNDISCOVERED" | "ACTIVE" | "REPAIRED";

interface MissionProgress {
  id: MissionId;
  status: MissionStatus;
  physicalComplete: boolean;
  digitalComplete: boolean;
  submission: Submission | null;
  tokensAwarded: boolean;
  repairedAt: number | null; // ms timestamp
}
```

### Transition rules

| Event | Allowed from | Effect |
| --- | --- | --- |
| `ACTIVATE` | `UNDISCOVERED` | status = `ACTIVE` |
| `COMPLETE_PHYSICAL` | `ACTIVE` | physicalComplete = true; then check repair |
| `COMPLETE_DIGITAL` (with valid submission) | `ACTIVE` | digitalComplete = true; store submission; then check repair |
| Check repair | internal | if physicalComplete and digitalComplete and status is `ACTIVE`: status = `REPAIRED`, award tokens |
| Any event | `REPAIRED` | Ignored (no-op) |
| Any event | Session not `RUNNING` | Ignored (Proposed; see timeout question) |

Physical and digital can be completed in either order. Completing the same component twice is a no-op.

## 6. Timer

### Session states (Proposed)

`NOT_STARTED → RUNNING ⇄ PAUSED → ENDED`, where `ENDED` records a reason: `TIMEOUT` or `FINISHED`. Restart returns to `NOT_STARTED`.

### Behaviour

- Store `durationMs = 900000`, `startedAt`, `accumulatedPausedMs`, and `pausedAt`, rather than decrementing a counter. Remaining time is computed from timestamps so that slow ticks, tab throttling, and re-renders do not drift.
- `remaining = durationMs - (now - startedAt - accumulatedPausedMs)`, clamped to 0.
- When `remaining` reaches 0 in `RUNNING`, transition to `ENDED (TIMEOUT)` exactly once.
- Start is idempotent: repeated Start calls while `RUNNING` do nothing.
- Navigation never touches timer state.

### Open questions

- Should the timer keep running if the app is backgrounded or the phone is locked? Timestamp-based computation means it will, unless the app auto-pauses on visibility change. Not decided.
- What happens to `ACTIVE` missions at timeout. Not decided.

## 7. Reward Validation (Exactly Once)

- Tokens are derived from mission state, not incremented independently: `tokens = 2 x count(missions where status == REPAIRED)`. Maximum 10.
- `tokensAwarded` is set in the same state update that sets `REPAIRED`, and is used only to trigger the S9 celebration once.
- Because `REPAIRED` is terminal and events on `REPAIRED` missions are ignored, double taps, repeated submissions, back navigation to S9, and reloads cannot award extra tokens.
- If persistence is added, the saved data stores mission states; tokens are recomputed on load, never stored as a separate counter that could drift.

## 8. Persistence

**Status:** Not implemented. Whether progress should survive a refresh is an open question.

Proposed approach if adopted:

- Save the session object to `localStorage` under one versioned key, for example `campus-glitching:session:v1`, on each state change.
- On load: if a valid session exists and is not `ENDED`, offer Continue or Start new.
- Wrap all storage reads and writes in error handling; if storage is unavailable, continue in memory and warn the player that progress may be lost on refresh.
- Do not store photos in `localStorage` (size limits). Store text only, or keep photos in memory for the session.
- Clear saved data on Restart and offer to clear it after the summary.

## 9. Form Validation

| Mission | Valid digital submission (Proposed) |
| --- | --- |
| Frozen Character | Observation text, trimmed, at least 3 characters. Photo optional. |
| Lost Colour | Five entries, each with a non-empty colour; colours distinct (case-insensitive). Or a collage image. |
| Missing Connection | "One thing learned" text, trimmed, at least 3 characters. Show a reminder not to include names or private details. |
| Time Loop | Observation text, trimmed, at least 3 characters. Place name optional. Photo optional. |
| Low Battery | A recharge signal selection, or a reflection of at least 3 characters. |

General rules: validate on submit, show inline errors, never clear entered data on error, set a reasonable maximum length (Proposed: 500 characters), and treat all input as plain text.

The game cannot validate that physical components happened. Physical completion is a player confirmation. How, if at all, to validate it further is an open question.

## 10. Map Implementation (Proposed)

- Destinations stored as data: `id`, `name`, `label`, and `mapPosition` (x and y as a percentage of the map artwork). `mapPosition` values must be read from the official map, not guessed, and are **not** GPS coordinates.
- A `gps` field is only added after the calibration process in [03-CAMPUS-MAP-SPECIFICATION.md](./03-CAMPUS-MAP-SPECIFICATION.md#10-calibration-requirements).
- Map mode is explicit state: `illustrative`, `list`, or `calibrated`. The UI shows a label for the current mode.
- If the map image fails to load, fall back to `list`.

## 11. Movement Tracking (Optional, Proposed only if adopted)

- Use the browser Geolocation API `watchPosition` only after the player opts in, and only while the session is `RUNNING` and the page is visible.
- Stop watching on pause, session end, and page hidden.
- Reject readings with reported accuracy worse than a threshold (to be decided after testing on campus).
- Distance estimates, if shown, are labelled as estimates.
- Never use location to validate Missing Connection.
- Never send location to any server unless a backend and a privacy review exist.
- Handle `PERMISSION_DENIED`, `POSITION_UNAVAILABLE`, `TIMEOUT`, and unsupported browsers with the fallbacks in [04](./04-USER-FLOWS-AND-SCREEN-SPECIFICATION.md#6-error-and-fallback-states-s14).

## 12. Error Handling

- Missing assets: fallbacks as defined in [04](./04-USER-FLOWS-AND-SCREEN-SPECIFICATION.md#6-error-and-fallback-states-s14).
- Storage failure: in-memory mode with a warning.
- Unexpected errors: show a recoverable error screen that preserves the session state where possible.
- Never display success for an operation that failed.

## 13. Potential Backend Requirements

A backend is **not** needed for the core single-device game. It would only be needed for:

| Feature | Why a backend is needed |
| --- | --- |
| Real-time squads across devices | Shared state and sync |
| Persisting progress across devices | Server storage and identity |
| Facilitator view for a class demo | Aggregated results |

Any backend would require authentication, a privacy review, and a data retention policy before use. Until then, no feature may imply that data is shared between devices.

## 14. Implementation Workflow (Claude Code)

**Status:** Confirmed workflow (D17, D20). Agent definitions and skills live in `CLAUDE.md` and `.claude/`; shared project state lives in `docs/project-state/`. Check those files for the current roles.

| Role | Responsibility |
| --- | --- |
| UI/UX Agent | Mobile-first game interface design; phone viewport layout within a desktop browser; old-school adventure art direction; screen and interaction specifications; responsive behaviour and accessibility; visual quality review of the real application. Writes requirements into [04](./04-USER-FLOWS-AND-SCREEN-SPECIFICATION.md) and [05](./05-VISUAL-DESIGN-SYSTEM.md). |
| Engineering Agent | Implements those requirements in code through Claude Code; maintains the codebase; builds the responsive viewport, game mechanics, state, and persistence; writes automated tests. |
| QA Agent | Runs [08](./08-TEST-PLAN-AND-ACCEPTANCE-CRITERIA.md) against the actual running application. Design text, prompts, and mockups are never evidence. |
| Independent Reviewer | Checks the rendered application at phone dimensions and at MacBook browser size before work is accepted. |

Workflow for each change:

1. UI/UX requirement written or updated in docs 04 or 05.
2. Engineering implements it in code and adds or updates tests.
3. Application is run locally and checked at phone and MacBook sizes.
4. QA records actual results; only run tests are marked Pass.
5. Implementation status tables (section 2 and the README) are updated.

## 15. Phone Viewport Implementation (Implemented 10 Oct 2026)

Implements [05 section 13](./05-VISUAL-DESIGN-SYSTEM.md#13-phone-viewport-and-desktop-presentation). As built in `src/styles/base.css` (class `.viewport`, maximum width 400px, phones at or below 480px wide go full screen). Verified by `npm run e2e` (T-VP tests).

- One app shell element (for example `#game-viewport`) contains the entire game. All screens, overlays, and modals render inside it and are positioned relative to it, not to the browser window.
- Outer page: full viewport height (`100dvh`), no page scrolling, flexbox or grid centring, atmospheric background as a decorative layer only.
- Viewport sizing (proposed CSS approach):

```css
#game-viewport {
  --max-w: 400px;          /* proposed; within 390 to 430 */
  --min-w: 320px;          /* proposed; narrowest supported game width */
  --gap: 32px;             /* outer margin above and below */
  /* Always fits the window height; never taller than the 9:19.5 height at max width */
  height: min(calc(100dvh - var(--gap)), calc(var(--max-w) * 19.5 / 9));
  /* Width follows the 9:19.5 ratio, clamped between min and max */
  width: clamp(var(--min-w), calc((100dvh - var(--gap)) * 9 / 19.5), var(--max-w));
  overflow: hidden;        /* the content row inside handles its own scroll */
  position: relative;      /* overlays use position: absolute inside */
}

@media (max-width: 430px) {
  #game-viewport { width: 100vw; height: 100dvh; border-radius: 0; }
}
```

- In short windows the width holds at `--min-w`, so the shape becomes less tall than 9:19.5 and the content row scrolls internally. The viewport never exceeds the window height and the page never scrolls.
- Inside the shell: a three-row layout (session bar, scrolling content, bottom navigation) with `overflow-y: auto` on the content row only, and `overflow-x: hidden` throughout.
- Safe-area padding with `env(safe-area-inset-*)` for real phones.
- Resizing the window only changes CSS sizing; it never re-mounts the game or touches session state.
- Respect `prefers-reduced-motion`; no animation is required for resizing.
- Automated checks (implemented in `scripts/e2e.mjs`): browser tests at 390 x 844 (phone) and at MacBook-like sizes such as 1440 x 900 and 1280 x 600, asserting centring, width cap, no horizontal overflow, and that key controls are within the viewport bounds (see T-VP tests in [08](./08-TEST-PLAN-AND-ACCEPTANCE-CRITERIA.md#16-phone-viewport-and-responsive-tests)).

