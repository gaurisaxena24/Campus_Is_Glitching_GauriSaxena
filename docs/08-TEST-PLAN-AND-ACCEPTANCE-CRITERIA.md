# Test Plan and Acceptance Criteria

**Project:** The Campus Is Glitching
**Version:** 1.0
**Date:** 9 October 2026

> **Status (10 October 2026):** A first build exists. Results below are only marked Pass where a test was actually run; the run record in section 0 says how. Everything else remains **Not run**. Design documents, prompts and mockups are never evidence that a test passes.

---

## 0. Test Run Record

| Date | Suite | Command | Environment | Result |
| --- | --- | --- | --- | --- |
| 10 Oct 2026 | Unit tests (rules, timer, tokens, validation, persistence, privacy) | `npm test` | Node 22.19.0, macOS | 31 passed, 0 failed |
| 10 Oct 2026 | Build check (modules parse and import, referenced files exist) | `npm run check` | Node 22.19.0 | OK |
| 10 Oct 2026 | End-to-end and viewport tests | `npm start` then `npm run e2e` | Headless Google Chrome via DevTools protocol; sizes 1440x900, 1920x1080, 1280x600, 1100x760, 390x844 (mobile emulation), 320x568 (mobile emulation) | 21 passed, 0 failed (run three times after final fixes) |
| 10 Oct 2026 | Manual playthrough in desktop Chrome | Claude in Chrome | Chrome on macOS, window 1440x900 (viewport 1440x779) | Title, tutorial, first quest, repair sequence, map reveal observed working |

**Not run yet:** Safari; a real phone (only emulation); screen reader (T-ACC-04); timeout in the browser (covered by unit tests only); photo upload; sound output by ear; touch pinch on a real device; Missing Connection and Low Battery end to end in the browser (unit tests cover their rules).

**Second defect (reported by the peer review session as T-160), fixed 10 Oct 2026:** at 390x844 map labels overlapped ("EATING PLACE" ran into "SHANTINIKETAN") and a label was cut off at the map edge. The map now hides lower-priority labels that would overlap another label, overlap another marker's pin, or be clipped at the edge (pins stay visible; the place list and location panel still name every place). `npm run e2e` now checks for label collisions at 390x844 (default and fully zoomed out) and 1280x600; 21 of 21 pass.

**Defect found and fixed during testing:** in desktop Chrome with the Claude in Chrome extension, capturing a screenshot of an active mission page failed and the tab then stopped responding (seen twice). The mission header's glitch effect re-drew a filtered copy of a 330% background image. It was replaced with a lightweight gradient overlay; afterwards screenshots and play worked normally in the same browser.

## 1. Scope

Covers functional, state, timer, persistence, map, location, accessibility, responsive, error, and regression testing for the game defined in [02-GAME-DESIGN-DOCUMENT.md](./02-GAME-DESIGN-DOCUMENT.md) and the screens in [04-USER-FLOWS-AND-SCREEN-SPECIFICATION.md](./04-USER-FLOWS-AND-SCREEN-SPECIFICATION.md).

Tests marked **(if implemented)** apply only when the related feature exists. If it does not exist, record "N/A: not implemented".

## 2. Test Environment (to fill in)

| Item | Value |
| --- | --- |
| Commit hash and local URL | |
| Phone devices and browsers | |
| MacBook model, screen resolution, and browsers | |
| Tester | |
| Date | |

## 3. Result Key

`Not run` · `Pass` · `Fail` · `Blocked` · `N/A`

## 4. Acceptance Criteria

Derived from the success criteria in [01-PROJECT-BRIEF.md](./01-PROJECT-BRIEF.md#8-success-criteria).

| ID | Criterion | Verified by | Result |
| --- | --- | --- | --- |
| AC1 | A player can start, pause, resume, finish, and restart a session. | T-TIM-01 to 07 | Pass (unit + e2e, 10 Oct 2026) |
| AC2 | All five missions have clear physical and digital completion conditions. | T-MIS-01 to 05 | Pass (unit: all five; e2e: three of five) |
| AC3 | A repaired glitch awards exactly two tokens once. | T-TOK-01 to 06 | Pass (unit + e2e) |
| AC4 | The map is recognisably based on the official campus layout. | T-MAP-01 to 03 | Built from the official map; owner review not yet done |
| AC5 | Players can play manually if GPS is unavailable or declined. | T-LOC-01 to 04 | Pass by design: the game never uses GPS (T-LOC tests N/A) |
| AC6 | The interface works at mobile sizes and, on a MacBook, as a phone-sized viewport centred in the browser. | T-VP-01 to T-VP-10 | Pass for automated checks (Chrome); Safari and real phone not run |
| AC7 | The application clearly labels any simulated or unconfigured functionality. | T-HON-01 to 03 | Reviewed in the build (map mode label, legend, Squad, Status); not formally tested |

## 5. Mission Tests

For each mission: activate, complete physical, complete digital, confirm `REPAIRED` and +2 tokens.

| ID | Mission | Steps | Expected | Result |
| --- | --- | --- | --- | --- |
| T-MIS-01 | Frozen Character | Activate; confirm walk; submit observation | `REPAIRED`, +2 tokens | Pass (unit + e2e, 10 Oct 2026) |
| T-MIS-02 | Lost Colour | Activate; confirm search; submit five distinct colours | `REPAIRED`, +2 tokens | Pass (unit, 10 Oct 2026) |
| T-MIS-03 | Missing Connection | Activate; confirm interaction; submit one thing learned | `REPAIRED`, +2 tokens; privacy reminder visible | Pass (unit, 10 Oct 2026) |
| T-MIS-04 | Time Loop | Activate; confirm visit; submit new observation | `REPAIRED`, +2 tokens | Pass (unit + e2e, 10 Oct 2026) |
| T-MIS-05 | Low Battery | Activate; confirm stretch; submit recharge signal | `REPAIRED`, +2 tokens | Pass (unit, 10 Oct 2026) |

## 6. Completion Order and State Tests

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| T-STA-01 | Complete physical first, then digital | Repaired only after digital | Pass (unit + e2e, 10 Oct 2026) |
| T-STA-02 | Complete digital first, then physical | Repaired only after physical | Pass (unit + e2e, 10 Oct 2026) |
| T-STA-03 | Complete physical only | Stays `ACTIVE`, 0 tokens for this mission | Pass (unit, 10 Oct 2026) |
| T-STA-04 | Complete digital only | Stays `ACTIVE`, 0 tokens for this mission | Pass (unit, 10 Oct 2026) |
| T-STA-05 | Try to complete a component on an `UNDISCOVERED` mission | Not possible; mission must be activated first | Pass (unit, 10 Oct 2026) |
| T-STA-06 | Open a `REPAIRED` mission | Read-only record; no new attempt | Not run |
| T-STA-07 | Two missions `ACTIVE` at once (if allowed) | Each tracks its own components independently | Not run |

## 7. Token Tests

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| T-TOK-01 | Repair one glitch | Total = 2 | Pass (unit + e2e, 10 Oct 2026) |
| T-TOK-02 | Repair all five | Total = 10 | Pass (unit, 10 Oct 2026) |
| T-TOK-03 | Double-tap the final completion button | Total increases by exactly 2 | Pass (unit, 10 Oct 2026) |
| T-TOK-04 | Resubmit digital component after repair | No change in total | Pass (unit, 10 Oct 2026) |
| T-TOK-05 | Navigate back to the repaired screen | No change in total | Pass (e2e, 10 Oct 2026) |
| T-TOK-06 | Refresh after repair (if persistence implemented) | Total unchanged, not doubled | Pass (unit + e2e, 10 Oct 2026) |

## 8. Timer Tests

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| T-TIM-01 | Open app, do not press Start | Timer shows 15:00 and does not run | Pass (unit + e2e, 10 Oct 2026) |
| T-TIM-02 | Press Start | Timer counts down from 15:00 | Pass (unit + e2e, 10 Oct 2026) |
| T-TIM-03 | Press Start twice quickly | Only one timer runs | Pass (unit, 10 Oct 2026) |
| T-TIM-04 | Pause for 30 seconds, then resume | Remaining time unchanged during pause | Pass (unit + e2e, 10 Oct 2026) |
| T-TIM-05 | Let timer reach 0:00 | Time's Up then Summary; no further completions | Pass (unit, 10 Oct 2026) |
| T-TIM-06 | Finish early | Confirmation, then Summary | Pass (unit, 10 Oct 2026) |
| T-TIM-07 | Restart | Confirmation; timer 15:00; all missions `UNDISCOVERED`; tokens 0 | Pass (unit + e2e, 10 Oct 2026) |
| T-TIM-08 | Navigate map, journal, mission, back button repeatedly | Timer continues without reset or jump | Pass (e2e, 10 Oct 2026) |
| T-TIM-09 | Lock phone or switch tab for 1 minute | Behaviour matches the decision recorded in doc 11 | Not run |
| T-TIM-10 | Low-time warning at 2:00 (if implemented) | Gentle notice, no flashing | Not run |

## 9. Persistence Tests (if implemented)

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| T-PER-01 | Refresh mid-session | Offer to continue; states and tokens restored | Pass (unit, 10 Oct 2026) |
| T-PER-02 | Close and reopen browser | Same as above | Not run |
| T-PER-03 | Restart after refresh | Saved data cleared | Not run |
| T-PER-04 | Private browsing or storage blocked | Warning shown; game still playable | Pass (unit, 10 Oct 2026) |
| T-PER-05 | Corrupted saved data | App starts a new session safely, no crash | Pass (unit, 10 Oct 2026) |

## 10. Submission Validation Tests

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| T-VAL-01 | Submit empty text | Rejected with inline message | Pass (unit + e2e, 10 Oct 2026) |
| T-VAL-02 | Submit whitespace only | Rejected | Pass (unit, 10 Oct 2026) |
| T-VAL-03 | Lost Colour with four colours | Rejected; says five needed | Pass (unit + e2e, 10 Oct 2026) |
| T-VAL-04 | Lost Colour with duplicate colours | Rejected; says colours must be distinct | Pass (unit + e2e, 10 Oct 2026) |
| T-VAL-05 | Very long text | Limited to maximum length with a visible counter | Pass (unit, 10 Oct 2026) |
| T-VAL-06 | Error shown | Entered text is kept | Not run |
| T-VAL-07 | Leave form and return | Draft text kept | Not run |
| T-VAL-08 | Submit without photo where photo is optional | Accepted | Pass (unit, 10 Oct 2026) |
| T-VAL-09 | Text containing HTML or script | Shown as plain text | Pass (unit, 10 Oct 2026) |

## 11. Map Tests

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| T-MAP-01 | Compare map with official 2025 campus map | Nine destinations in the correct relative arrangement | Not run |
| T-MAP-02 | Destination labels | All nine labels match the register in doc 03 | Not run |
| T-MAP-03 | Map mode label | Visible and accurate ("Illustrated map, not to scale" unless calibrated) | Not run |
| T-MAP-04 | Map image fails to load | List fallback appears | Not run |
| T-MAP-05 | Glitch marker states | Distinct by shape or icon, not colour alone | Not run |

## 12. Location Tests (if implemented)

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| T-LOC-01 | Decline location | Game fully playable; no player marker; neutral note | N/A: location not implemented |
| T-LOC-02 | Browser without geolocation | Location controls hidden; game playable | N/A: location not implemented |
| T-LOC-03 | Low-accuracy reading | Marker hidden or accuracy shown; no false precision | N/A: location not implemented |
| T-LOC-04 | App load | No location prompt until player opts in | N/A: location not implemented |
| T-LOC-05 | Pause or hide page | Location watching stops | N/A: location not implemented |
| T-LOC-06 | Missing Connection with two devices close together | Proximity does not complete the mission | N/A: location not implemented |

## 13. Honesty Tests

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| T-HON-01 | Any simulated data (sample squad, sample position) | Clearly labelled as simulated | Not run |
| T-HON-02 | Unconfigured features | Labelled as unavailable, not shown as working | Not run |
| T-HON-03 | Failed save or upload | Error shown; no false success message | Not run |

## 14. Error and Network Tests

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| T-ERR-01 | Missing illustration | Layout intact; text readable | Not run |
| T-ERR-02 | Offline after load | Core game continues (no backend) | Not run |
| T-ERR-03 | Network failure on backend call (if backend exists) | Retry offered; data not lost | Not run |

## 15. Accessibility Tests

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| T-ACC-01 | Keyboard only: complete one mission | All controls reachable, visible focus | Not run |
| T-ACC-02 | Text contrast on parchment texture | At least 4.5:1 | Not run |
| T-ACC-03 | Zoom to 200% | No lost content or overlap | Not run |
| T-ACC-04 | Screen reader on mission card | Name, state, and components announced | Not run |
| T-ACC-05 | Reduced-motion setting | Non-essential animation off | Not run |
| T-ACC-06 | Touch targets | At least 44 x 44px | Not run |
| T-ACC-07 | Copy review | No "run", no shaming language, alternatives present | Not run |

## 16. Phone Viewport and Responsive Tests

Requirement: [05 section 13](./05-VISUAL-DESIGN-SYSTEM.md#13-phone-viewport-and-desktop-presentation) and [D18](./11-DECISIONS-AND-OPEN-QUESTIONS.md#1-confirmed-decisions). Suggested browser sizes: MacBook 1440 x 900, 1280 x 800, 1920 x 1080 (full screen on an external display or large window), short window 1280 x 600; phone 390 x 844 and 320 x 568.

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| T-VP-01 | Open the game in a MacBook browser at 1440 x 900 | Phone viewport centred horizontally and vertically | Pass (e2e, 10 Oct 2026) |
| T-VP-02 | Widen the browser to full screen or 1920px | Viewport keeps phone width (at most about 430px) and ratio; no stretching; outer area is background only | Pass (e2e, 10 Oct 2026) |
| T-VP-03 | Check viewport height at 1440 x 900 and 1280 x 600 | Viewport fits inside the browser height; page does not scroll | Pass (e2e, 10 Oct 2026) |
| T-VP-04 | Visit Map, Missions, Items, Squad, and Status inside the viewport | Each screen renders and works inside the viewport (Items, Squad, Status as placeholders until Q16 is resolved) | Pass (e2e, 10 Oct 2026) |
| T-VP-05 | Inspect every screen at 1280 x 600 and at 320 x 568 | No important control is clipped; content area scrolls internally where needed | Pass (e2e, 10 Oct 2026) |
| T-VP-06 | Check for horizontal scrolling on every screen at all sizes | None at page level or inside the viewport | Pass (e2e, 10 Oct 2026) |
| T-VP-07 | Start timer; switch tabs and open missions repeatedly; complete one component | Timer continues without reset; mission state correct | Pass (e2e, 10 Oct 2026) |
| T-VP-08 | Open Pause, Time's Up, Restart and Finish confirmations, and a submission form with an error | Buttons, forms, overlays, and modals sit inside the viewport and are fully usable | Not run |
| T-VP-09 | Resize the MacBook browser window while a session is running | Viewport recalculates; no lost state; timer unaffected; no layout break | Pass (e2e, 10 Oct 2026) |
| T-VP-10 | Open on a real phone or device emulation at 390 x 844 and 320 x 568 | Game fills the screen; no frame or outer background; fully usable by touch | Pass (e2e, 10 Oct 2026) |
| T-VP-11 | Inspect the outer background | No navigation, cards, statistics, or competing controls; no laptop or device mockup | Not run |
| T-VP-12 | Keyboard: Tab through the game on a MacBook | Focus stays within the game; focus ring visible; nothing outside the viewport receives focus | Not run |

### 16.1 Manual Test Procedure (MacBook)

Use this when automated browser tests are not yet available.

1. Run the application locally (commands will be listed in the README once code exists).
2. Open it in Safari and Chrome on the MacBook. Record browser versions.
3. For each size above, set the window size (Chrome DevTools device toolbar set to "Responsive", or resize the window and confirm size with `window.innerWidth` and `window.innerHeight` in the console).
4. Run T-VP-01 to T-VP-12 in order. Take a screenshot for each test and save it with the test ID in the filename.
5. Record Pass or Fail with the date, browser, and size. Only mark Pass for tests actually observed.

### 16.2 Automated Verification (planned)

Once a framework is chosen (Q9), add browser tests that load the app at the sizes above and assert: viewport bounding box centred within 2px tolerance; width at most the configured maximum; viewport height at most the window height; `document.documentElement.scrollWidth` equal to `clientWidth`; and key controls fully inside the viewport bounding box. Until those tests exist and run, viewport behaviour is unverified.

## 17. Data Loss Prevention

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| T-DL-01 | Press Restart | Confirmation required | Not run |
| T-DL-02 | Press Finish early | Confirmation required | Not run |
| T-DL-03 | Timeout while typing a submission | Behaviour matches decision in doc 11; text not silently lost | Not run |
| T-DL-04 | Browser Back from summary | Does not restart or corrupt the ended session | Not run |

## 18. Regression Suite

Run after every significant change:

- [ ] T-MIS-01 to T-MIS-05
- [ ] T-STA-01, T-STA-02
- [ ] T-TOK-03, T-TOK-04
- [ ] T-TIM-04, T-TIM-07, T-TIM-08
- [ ] T-VAL-01, T-VAL-06
- [ ] T-VP-01, T-VP-05, T-VP-06, T-VP-07
- [ ] T-ACC-01

## 19. Bug Log

| ID | Found in test | Description | Severity | Status |
| --- | --- | --- | --- | --- |
| | | | | |
