# The Campus Is Glitching

A hybrid physical and digital campus wellness game for FLAME University, created for **DESG310 Game Design**. It is a mobile-first, phone-sized game; on a MacBook it runs as a phone-shaped viewport centred in the browser window.

The campus is experiencing fictional glitches caused by endless scrolling, inactivity, disconnection, and rushing through everyday life. In a 15-minute session, players explore the campus and repair each glitch by completing a real-world physical action and a matching digital mission.

## Purpose

The game turns small acts of movement, noticing, and social connection into a short cooperative adventure. It encourages players to look up from their screens, see familiar campus spaces differently, and connect with people, without pressure or surveillance.

## Core Gameplay

1. Start a 15-minute session.
2. Explore a simplified map based on the official FLAME University campus map.
3. Choose one of five glitches.
4. Complete its **physical** component and its **digital** component, in either order.
5. When both are done, the glitch is **repaired** and you earn **two repair tokens** (once per glitch, ten maximum).
6. Continue until time runs out or you choose to finish.

| Mission | Physical | Digital |
| --- | --- | --- |
| Frozen Character | Walk a comfortable loop for two minutes and notice one detail | Observation, optional photo |
| Lost Colour | Find five distinct colours around campus | Colour list or collage |
| Missing Connection | A voluntary interaction with a willing participant | One thing learned, no private details |
| Time Loop | Visit a familiar place you usually pass without noticing | A new observation |
| Low Battery | A short, comfortable stretch or movement break | Recharge signal or reflection |

Mission states: `UNDISCOVERED → ACTIVE → REPAIRED`. Full rules are in the [Game Design Document](docs/02-GAME-DESIGN-DOCUMENT.md).

## Play It Locally

You need [Node.js](https://nodejs.org/) 20 or newer. Install the project dependencies once:

```bash
npm install
npm start
```

Then open <http://localhost:5173> in Chrome or Safari on your MacBook. The game appears as a phone-sized screen in the middle of the window. On a phone (or a browser window narrower than 480px) it fills the screen.

The game needs a local server because it uses JavaScript modules; opening `index.html` directly from the file system will not work.

### Sending team invitations

The Squad tab sends invitations through Gmail SMTP. To enable it, turn on 2-Step Verification for the sender’s Google account, create a Gmail App Password, copy `.env.example` to `.env` (or `env`), and set `GMAIL_USER` and `GMAIL_APP_PASSWORD`. Restart `npm start` after changing the file. Keep it private; both filenames are ignored by Git and the credentials are only read by the server. `APP_URL` is optional and controls the link included in the invite.

The invitation endpoint accepts addresses on any domain and allows up to 10 recipients per send. Gmail still applies its own sending limits. For a deployed app, set the same values as server environment variables and use the deployed app URL for `APP_URL`; never put the Gmail App Password in frontend JavaScript. Gmail SMTP with Nodemailer and App Passwords is described in the [Nodemailer Gmail guide](https://nodemailer.com/guides/using-gmail).

## Tests

```bash
npm test        # 145 unit tests: rules, timer, tokens, saving, privacy, colour analysis,
                #   duplicate photos, step filtering, GPS distance, conversations, puzzles
npm run check   # build check: every module parses and every referenced file exists
npm run e2e     # 31 browser journeys in headless Google Chrome (run `npm start` first)
```

`npm run e2e` needs Google Chrome installed (set `CHROME_PATH` if it is not in `/Applications`). Screenshots are written to a temporary folder printed at the start of the run. Latest results are recorded in [the test plan](docs/08-TEST-PLAN-AND-ACCEPTANCE-CRITERIA.md#0-test-run-record).

## Current Implementation Status

**First playable build, 10 October 2026.** Details and file locations are in [06 section 2](docs/06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md#2-implementation-status-summary).

| Area | Status |
| --- | --- |
| Title screen, skippable tutorial, first quest (Frozen Character) | Implemented |
| All five missions with physical and digital parts, either order | Implemented |
| Exactly two tokens per repair, once (cannot be duplicated by taps, reloads or navigation) | Implemented and tested |
| 15-minute timer with pause, resume, finish, restart and timeout | Implemented and tested |
| Map, Quests, Inventory, Squad and Status tabs sharing one game state | Implemented |
| Illustrated campus map from the official 2025 map, with pan, zoom, legend and a list view | Implemented |
| Saving progress in this browser (localStorage); Continue from the title screen | Implemented and tested |
| Phone-sized viewport centred on a MacBook; full screen on phones | Implemented and browser tested |
| Optional sound (off by default) and reduced-motion and larger-text settings | Implemented |
| Lost Colour colour hunt: camera or upload, colour checked from the photo's pixels on the device, duplicate detection, 5 slots | Implemented and browser tested (emulated camera, generated images) |
| Lost Colour pattern restore: two generated rounds, rewards once | Implemented and tested |
| Frozen Character walk: estimated steps (motion sensor) plus GPS distance, pause/resume/stop | Implemented and browser tested (emulated sensors). **Not yet tried on a real phone** |
| Missing Connection conversation episodes (3 fictional characters, 5 messages, evaluated) | Implemented and tested. Scripted story engine, **no AI** |
| GPS on the map | **Not implemented** on purpose: the map is not calibrated to GPS, so no map position is ever shown |
| Online squads / multiplayer | **Not implemented**: Squad supports several people sharing one phone, and says plainly that nothing is synced |

Several behaviours were chosen by the build where the design was still open (progressive reveal, timeout, squads, tabs). They are listed for confirmation in [Decisions and Open Questions](docs/11-DECISIONS-AND-OPEN-QUESTIONS.md#21-defaults-implemented-in-code-awaiting-owner-confirmation).

## Technology Stack

Plain HTML, CSS and JavaScript modules, built and maintained with Claude Code. No framework, no bundler, no runtime dependencies, no backend, no accounts. Figma Make is not used.

| Path | Contents |
| --- | --- |
| `index.html` | Page shell, phone viewport and icon set |
| `src/js/data/` | The five missions and nine destinations |
| `src/js/game/` | Game rules (state machine, timer, tokens) and saving |
| `src/js/ui/` | Map, pages, screens, sound |
| `src/js/app.js` | Controller: navigation, rendering, events |
| `src/styles/` | Design tokens, viewport, components, screens, map |
| `assets/map/` | Official map (unmodified), game artwork and the script that made it |
| `tests/`, `scripts/` | Unit tests, build check, end-to-end tests, local server |

## Documentation

Start with the [Documentation Index](docs/00-DOCUMENTATION-INDEX.md).

| # | Document |
| --- | --- |
| 00 | [Documentation Index](docs/00-DOCUMENTATION-INDEX.md) |
| 01 | [Project Brief](docs/01-PROJECT-BRIEF.md) |
| 02 | [Game Design Document](docs/02-GAME-DESIGN-DOCUMENT.md) |
| 03 | [Campus Map Specification](docs/03-CAMPUS-MAP-SPECIFICATION.md) |
| 04 | [User Flows and Screen Specification](docs/04-USER-FLOWS-AND-SCREEN-SPECIFICATION.md) |
| 05 | [Visual Design System](docs/05-VISUAL-DESIGN-SYSTEM.md) |
| 06 | [Technical Implementation Specification](docs/06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md) |
| 07 | [Privacy and Safety Guidelines](docs/07-PRIVACY-AND-SAFETY-GUIDELINES.md) |
| 08 | [Test Plan and Acceptance Criteria](docs/08-TEST-PLAN-AND-ACCEPTANCE-CRITERIA.md) |
| 09 | [Figma Make Master Prompt](docs/09-FIGMA-MAKE-MASTER-PROMPT.md) (superseded, historical record only) |
| 10 | [Development Roadmap](docs/10-DEVELOPMENT-ROADMAP.md) |
| 11 | [Decisions and Open Questions](docs/11-DECISIONS-AND-OPEN-QUESTIONS.md) |
| 12 | [Device Features: camera, motion, GPS, episodes, puzzles](docs/12-DEVICE-FEATURES.md) |

## Known Limitations

- Camera, motion and location need a secure context (`https://` or `localhost`). On a phone over plain `http://` they are blocked. Requirements, privacy and manual tests: [12 Device Features](docs/12-DEVICE-FEATURES.md).
- Browsers have no pedometer API, so steps are always *estimated* from the motion sensor.
- Tested in Chrome (desktop and mobile emulation). Safari and real phones have not been tested yet.
- Fonts load from Google Fonts; without internet the game falls back to system fonts.
- The campus map is illustrative and not to scale. No GPS calibration has been done. Map pixel positions are not GPS coordinates.
- Most physical tasks are self-reported. The colour hunt checks photo colours and the walk uses sensor estimates, but neither proves exactly what the player did.
- GPS proximity is never used to prove a social interaction.
- Automatic social-media posting, official university system integration, continuous background GPS, and production multiplayer are out of scope unless specifically implemented.

## References

- [Official FLAME University Campus Map 2025](https://www.flame.edu.in/images/events/orientation/FLAME-University-Campus-Map-2025.jpg)
- [FLAME University Student Orientation 2025–26](https://www.flame.edu.in/flame-events/student-orientation-2025-26)
