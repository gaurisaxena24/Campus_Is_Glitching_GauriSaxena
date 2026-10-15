# Project State

**Project:** The Campus Is Glitching (DESG310 Game Design, FLAME University)
**Last updated:** 10 October 2026, 07:12 IST, by super-agent
**Rule:** facts here must carry a source and a timestamp. This file summarises and points to sources; it does not duplicate them. It holds status, not requirements.

> **11 Oct 2026, 01:30 update (super-agent):** device features (camera colour hunt, two-round pattern puzzle, estimated-step + GPS walk, five-message scripted conversation episodes) are implemented. Fixed a duplicate-photo false positive that had broken 14 of 31 e2e checks. Added Inventory "Field finds", capped toasts, and wrote `docs/12-DEVICE-FEATURES.md`. Evidence: `npm test` 146/146, `npm run check` OK, `npm run e2e` 31/31 (headless Chrome, emulated sensors), independent-reviewer APPROVE_WITH_NOTES (notes 1 and 6 fixed). **Not tried on a real phone.** New palette conflict: OQ-18.
>
> **07:10 update:** the peer session reports the **first playable build is complete**. Super-agent reproduced: `npm test` 31/31, `npm run check` OK, `npm run e2e` **21/21** (headless Chrome, own server on port 5199, screenshots reviewed). See §6 and §12.
>
> **Earlier notice:** a peer Claude session (`campus-is-glitching-gaurisaxena-e3`) has been building the game since about 00:00 IST on 10 Oct 2026, and the code changes every few minutes. Any implementation fact below is a **snapshot**. Re-run the `project-audit` skill (or `git status --short` plus `node --test tests/*.test.js`) before relying on it.

---

## 1. Purpose and assignment

| Item | State | Source |
| --- | --- | --- |
| Concept | Hybrid physical and digital campus wellness game; 15-minute session; repair five glitches | `docs/01`, D1–D2 |
| Course | DESG310 Game Design, FLAME University | `docs/01` header |
| Assignment brief and rubric | **Not in repository.** Needed for academic alignment. | OQ-A4 |

## 2. Confirmed mechanics (owner decisions)

Five missions: Frozen Character, Lost Colour, Missing Connection, Time Loop, Low Battery (D3). Each needs a physical **and** a digital component, in either order (D4–D5). `UNDISCOVERED → ACTIVE → REPAIRED` (D6). 2 tokens once per repair, max 10 (D7). 15-minute session (D2). GPS optional and never proof of social interaction (D8–D9); foreground-only (D10). Photos and social optional (D16). Detail: `docs/02` §5–9.

Open rule questions: Q3, Q5, Q7, Q13, Q14 (`docs/11`); source conflicts SRC-04/05/06 (`PROJECT_AUDIT.md` §4); rules decided in code without approval: OQ-09 (reveal), OQ-10 (pause/timeout blocking), OQ-12 (squad size).

## 3. Missions and completion conditions

See `docs/02` §6 and `docs/06` §9. Mission data in code: `src/js/data/missions.js` (as of 00:12). Code assigns a fixed destination per mission, which no doc approves (OQ-06 / T-101). The original GDD candidate areas (SRC-03) are not in the Markdown.

## 4. Screens and navigation

`docs/04` (mtime 23:53:30) lists **S1–S17**: S15 Items, S16 Squad and S17 Status are placeholders. §2.1 proposes five bottom tabs **Map / Missions / Items / Squad / Status**. The original `.docx` uses **MAP / QUESTS / INVENTORY / SQUAD / STATUS**, and the code (`persistence.js:110`) uses `map, quests, inventory, squad, status`. Structure and labels await an owner decision (OQ-01, OQ-16).

## 5. Design direction

Vintage illustrated adventure RPG (D13). Phone-sized viewport (about 9:19.5, max about 390–430 CSS px, height-fitted) centred in a MacBook browser, with no frame or dashboard (D18). `docs/05` §13.3 still allows an optional frame (OQ-15). Tokens, palette and type are **Proposed**. Measured with `contrast.py`: `ochre #C9973A` on `parchment #F3E9D2` = 2.18:1 (fails AA even for large text), plus about 17 more pairs failing AA for normal text (T-012 report, `reviews/PHASE-7-FINDINGS.md`).

## 6. Technical architecture and current implementation

| Item | State (snapshot 10 Oct 00:12) | Source |
| --- | --- | --- |
| Build route | Coded web app built with Claude Code; Figma Make removed | D17, D19 |
| Framework | Plain HTML, CSS and ES modules; `node --test`; `package.json` with no dependencies. **Owner approval of Q9 not confirmed to this session.** | `package.json`; OQ-02 |
| Files present | `index.html`; `src/js/game/{state,persistence}.js`; `src/js/data/{missions,destinations}.js`; `src/js/ui/{audio,dom,pins}.js`; `src/styles/{base,components,map,screens,tokens}.css`; `scripts/{serve,check}.mjs`; `tests/{missions,persistence,state}.test.js`; `assets/map/*` | `find`, 00:12 |
| Logic layer | Timestamp timer, mission state machine, derived tokens (2 × repaired), versioned localStorage persistence with try/catch, submission validation | T-014 report (00:06), spot-checked by super-agent 00:07 |
| Unit tests | **31/31 pass** (`node --test tests/*.test.js`, 00:12:04). Logic only. Under D20 these do not verify UI behaviour. | Command output |
| UI / rendered app | Files exist; **not rendered or reviewed by this system** (NOT RUN). No phone or MacBook render evidence yet. | — |
| Known code risks | R1: drafts can carry arbitrary fields into localStorage (T-110) | T-014 report |
| `build-log.md` | Announced by the peer; **not present** at 00:12 | `find` |

## 7. Campus destinations

Nine destinations in `docs/03` §3, all "To be verified", no GPS collected. Official map: https://www.flame.edu.in/images/events/orientation/FLAME-University-Campus-Map-2025.jpg. The local copy `assets/map/source-official-campus-map-2025.jpg` has SHA-256 `88cc9b7f…515c`, **identical to a fresh download from the official URL** (super-agent, 00:07). **Verified (OQ-07):** the legend lists "2. APJ Abdul Kalam" and "3. Vivekananda Library" separately, so `docs/03` D2 "APJ Abdul Kalam Library" is a conflation. The legend also uses "46. FLAME Entrance" (not "Main Gate") and category headings HOUSING / EATERIES / COMMON AREAS. Name changes await the owner.

## 8. Privacy and safety

Requirements P1–P9 are in `docs/07`. Code stores session state, drafts and settings in localStorage under `campus-glitching:session:v1` / `:settings:v1` (T-017). No geolocation, network calls or file inputs were found in `src/` at 00:06 (T-015, T-017). `docs/07` §5 (data-handling statement) is still "To be confirmed" and therefore out of date (T-111).

## 9. Known bugs and unfinished work

`TASK-REGISTER.md` §3 is the master backlog. The audit's defects and source gaps are in `PROJECT_AUDIT.md` §3–4.

## 10. Decisions

`docs/11` §1 (D1–D20) is canonical for product decisions. Agent-system decisions (AD-01…AD-07) are in `DECISION-LOG.md`.

## 11. Current owners and blockers

See `FILE-OWNERSHIP.md`. The peer **released** code and `docs/00`–`11` at about 07:10, so the default owners apply and `TASK-REGISTER.md`. Main blockers: T-100 owner decisions (OQ-01/16, OQ-02, OQ-05/10, OQ-09), OQ-A4 (rubric).

## 12. Last verified status of major features

| Feature | Status | Last verified | Evidence |
| --- | --- | --- | --- |
| Documentation links (`docs/` incl. `project-state/`, README) | 0 broken | 10 Oct 00:18 | `check_links.py` |
| Mission/token/timer/persistence logic | Implemented; unit-tested 31/31 (incl. photo-never-stored test) | 10 Oct 07:06 | `npm test` |
| Playable UI flow: title → tutorial → mission → repair → tokens; restart; tabs | **Implemented, e2e-verified** | 10 Oct 07:08 | `npm run e2e` 21/21 (T-VP-01…05, 09, 10; T-STA-01/02; T-TOK-01/05; T-VAL-03; T-TIM-01/07/08; T-RES-320; no JS errors) |
| D18 viewport | Verified at 1440×900, 1920×1080, 1280×600, 390×844, 320×568 | 10 Oct 07:08 | e2e plus super-agent review of screenshots `01-macbook-title.png`, `18-phone-390-map.png` |
| Map label legibility (`docs/05`) | Fixed: no overlap or clipping (declutter). Follow-up T-163: some glitch pins are unlabelled | 10 Oct 07:10 | e2e `labelCollisions()`; screenshots `18-`, `18b-phone-390-map*.png` |
| Official map image usage | **Used directly** on title and map screens while Q10 (rights) is open | 10 Oct 07:09 | Screenshots (T-161) |
| Playable-game brief (minigames, alive map, sound, local Squad Mode, rewards) | **Implemented, e2e-verified.** S-SQUAD test completed (rally now actually played, squad XP checked); toast/repair-banner overlap fixed | 10 Oct 17:20 | `npm run e2e` **20/20**, `npm test` 39/39; screenshots `10-repaired-map.png`, `18-phone-squad.png`, `game-rally-won.png` reviewed |
| GPS, squad sync | Not implemented (Squad tab present) | 10 Oct 00:06 | T-015, T-016 |
| Accessibility beyond e2e (contrast on render, screen reader, reduced motion) | Not verified | — | NOT RUN |
