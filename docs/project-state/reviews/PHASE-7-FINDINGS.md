# Phase 7 Findings: First Project-Wide Review

**Date:** 10 October 2026, reports returned 00:06–00:10 IST
**Method:** nine read-only workstreams run in parallel. T-010…T-018 ran as `general-purpose` subagents loaded with each role's agent file and skills, because the native types had not yet loaded in this session (manual §6). T-901a ran as the native `documentation-agent`.
**Fidelity note:** these are **condensed copies** made by super-agent. Quotes, file:line citations and command outputs are kept; prose is shortened. The full reports exist only in the session transcript. The code was changing during the review, so every code fact is a snapshot (about 00:06).

---

## A. Documentation (T-010, documentation-agent)

- `check_links.py docs README.md` → `Checked 133 relative links; 0 broken.` (exit 0).
- Source gaps re-checked against revised docs: **SRC-01 partial** (`docs/04` §2 adds S15–S17 and five tabs labelled Missions/Items, not QUESTS/INVENTORY); **SRC-08 partial** (`docs/04` S16 line 268 forbids simulated members); **SRC-13 mostly missing**; SRC-02, 03, 04, 05, 06, 07, 09, 10, 11, 12 **still missing**.
- New issues: `docs/11` Q16 is stale and placed before Q15; destination IDs D1–D9 (`docs/03`) collide with decision IDs D1–D20 (OQ-13); `docs/00` line 51 and `docs/06` line 222 point to the non-existent `docs/agents/`; "no code" claims in `docs/06` §1, `docs/00` line 18 and README lines 32/52 are stale; `docs/Description.md` is not indexed and still says "social media interactions" (Q15 evidence); DOC-01 "13 Markdown documents" persists.
- Terminology clean: no "Lost Color"; only the three mission states; token rule consistent.

## B. Game rules (T-011, game-design-agent)

- Mission names, "physical and digital both required" and token values are consistent across docs and `src/`.
- Code decides rules that no doc approves: progressive **SIGNAL reveal** (`state.js:109-111`), **actions blocked while paused** (`state.js:128-130`), **completions blocked at timeout** (settles Q5 without a decision), **fixed mission→destination mapping** (Time Loop→APJ, versus the original "player-selected"), **MAX_SQUAD = 6**.
- Doc inconsistencies: Restart confirmation is "Proposed" in `docs/02` §8 but a rule in `docs/04`/`08`; Time Loop place name is required in `docs/04` but optional in `docs/06`; "GPS never social proof" is absent from `docs/04` and `docs/06`.
- Against the original GDD: themes relabelled (OQ-04); Missing Connection "walk with… or short conversation" dropped; candidate areas missing; intermediate states dropped; the original timeout default differs from both doc 11 and the code.
- **Balance (Assumption):** about 16–21 minutes for all five, so they likely don't fit in 15 (OQ-11). Needs a playtest.
- Rules without a test ID: R8, pause blocking, reveal, skip-without-penalty, accessible alternatives shown, photo denied, the GPS "unverified" label, squad size.

## C. UI/UX (T-012, ui-ux-agent)

- Flow gaps: no Back on S3/S4; the "session bar menu" is undefined; the confirmation dialog has no spec; S13 has no exit except Play again; the §3 journey omits S11 and S15–S17; bottom-nav visibility on S6–S9 is unspecified; pause or timeout during S7/S8 is open; the expired returning session is unspecified; the S10 "Empty" state contradicts "always five entries".
- **Contrast (`contrast.py`, flat colours), failing as normal text:** moss on parchment-deep 4.30; fern 2.64/2.28; terracotta 3.70/3.19; ochre 2.18/1.88; glitch 4.35/3.75; sky-faded 1.80; parchment on terracotta 3.70, glitch 4.35, fern 2.64, ochre 2.18; parchment-deep on moss 4.30; ink on fern 4.48; ink on terracotta 3.19. Passing: ink on parchment 11.81; ink on ochre 5.41 (recommended for tokens); alert on parchment 6.16; parchment on moss 4.98.
- D18: `docs/05` §13.1–13.2 match. §13.3 optional rounded frame, "rounded corners" safe areas and §13.4 outer title conflict with D18 (OQ-15).
- Art-direction risks: S9/S17 totals drifting into metric tiles; scanline/CRT drift.
- Code display states SIGNAL / PHYSICAL_COMPLETE / DIGITAL_COMPLETE are not in the specs.
- Navigation options for OQ-01: (a) original five tabs; (b) five tabs with an honest Squad stub; (c) two tabs; (d) Map / Quests / Status. Five tabs at 320px give about 64px each, which meets the 44px minimum.

## Map (T-013, campus-map-agent; confirmed by super-agent)

- `assets/map/source-official-campus-map-2025.jpg`: 180,872 bytes, 1500×1061, SHA-256 `88cc9b7ff8ab0e1f972e81b408cf9e74157b50ce682ce65851057d1451b3515c`. Super-agent confirmed a fresh download from the official URL is identical.
- Legend: ACADEMICS "2. APJ Abdul Kalam", "3. Vivekananda Library" (separate), "12. Chandragupta Collaborative Development Centre"; SPORTS "18. Arjuna Centre for Sports"; EATERIES 25–35; HOUSING 40–42 (North/West/East); RECREATIONAL "43. FLAME Plaza"; COMMON AREAS "46. FLAME Entrance", "47. Infirmary", "48. ATM, Convenient Store"; SHANTINIKETAN 49–54. On-map text "PLAZA" appears twice and "ENTRANCE" once.
- Register names not printed on the map: Main Gate, APJ Abdul Kalam Library, Housing Area, General Areas, Eating Place.
- The coordinate/distance grep over `docs/` and `src/` found no matches.

## D. Engineering (T-014, engineering-agent)

- Stack: ES modules, `node --test`, no dependencies; Q9 approval not logged.
- Implemented (logic): timestamp timer with idempotent start and single timeout; state machine; tokens = repaired × 2, never stored; versioned persistence with try/catch and rejection of corrupt saves; validation of 3–500 characters.
- Deviations: `pausedMs` versus spec `accumulatedPausedMs`; `celebrated` versus `tokensAwarded`; reveal rule not in spec; hard-coded five-tab IDs.
- **Risk R1:** `SAVE_DRAFT` (`state.js:194-198`) merges any draft fields, and `deserialize` accepts `drafts` unchecked, so photo data could reach localStorage (T-110).
- `package.json` `check` pointed to a missing `scripts/check.mjs` (present by 00:12).
- `node --test tests/*.test.js` → 30 pass / 0 fail (00:06). Re-run 31/31 at 00:12.

## E1. GPS (T-015, gps-movement-agent)

- Location states: granted, denied and unsupported are partly specified. **Timeout, stale and page-hidden behaviour and copy are missing.** No copy exists for any state.
- SRC-07: the "label location as unverified" requirement and the retry action are **absent**. "Not calibrated → overlay off" is covered.
- `device/manual/simulated` provenance is **not specified** anywhere.
- No geolocation code. `destinations.js` positions are correctly labelled "NOT GPS coordinates".
- Q2 options: omit GPS; optional, with a marker only after calibration; coarse labelled estimates only; required (conflicts with D8).

## E2. Squad (T-016, squad-social-agent)

- Squad states (invite, joined, present, stale, unavailable, network failure, consent withdrawn) are **not specified**. Only `docs/04` S16 forbids simulated members.
- SRC-08: local test profiles, invite code, stale position and squad contributions in results are missing. The SQUAD tab is a placeholder without "consent-based sharing".
- Missing Connection safety is well specified (`docs/07` §7) and reflected in `missions.js:64-74` copy.
- Code: `squadSize` 1–6 is a local integer with no network. Nothing fabricates presence.
- OQ-03 options: A solo only; B shared device with "Sample" local profiles; C unsynced devices; D real sync (needs a backend).

## F. QA, privacy, accessibility (T-017, qa-safety-agent)

- Every AC maps to tests. Gaps: R8, R12 text alternative, measurable D18 checks, D20 evidence capture. Proposed T-VPT-01…05, T-MIS-06/07, T-VAL-10, T-LOC-07, T-ACC-08, T-HON-04, T-PER-06.
- P1–P9: P8 has no test; P1, P3, P7 and P9 are partly covered.
- Storage keys `campus-glitching:session:v1`, `:settings:v1`. `docs/07` §5 is out of date.
- Copy scan: no unsafe instructions. Suggest "running out of energy" → "low on energy".
- Secrets scan: policy text only. **No test is marked Pass in `docs/08`.**

## G. Academic (T-018, academic-presentation-agent)

- No DESG310 brief or rubric (OQ-A4). Aligned to the original GDD seven elements: Players, Goals, Rules, Space, Time and Resources are documented. **Conflict** is not documented in the Markdown (OQ-06).
- Process evidence: one commit (`17bb8c9`, 9 Oct 14:58); everything else is uncommitted (OQ-A5); timestamps; `docs/11` change log; DECISION-LOG. The D17–D19 rationale is not recorded (OQ-14). No playtests were recorded.
- Demo today: docs and unit tests only. No playable UI had been verified.
- **Draft jury questions (answers grounded in sources):**
  1. How do you verify physical tasks? Self-report (Q3, Proposed).
  2. Why no GPS? It's optional and never social proof, to avoid surveillance (D8–D9).
  3. Is the map accurate? It's based on the official 2025 map; destinations are unverified, and one is a naming conflation (OQ-07).
  4. Privacy? P1–P9 are documented; implementation is partial.
  5. What if nobody wants to talk? Skippable (Proposed).
  6. Why 15 minutes? It fits between classes; A6 is untested.
  7. What did playtesting show? None has been conducted.
  8. What's built? The logic layer plus unit tests; the UI is in progress.
  9. Why drop Figma Make? Owner decision D17–D19; the reason is not yet recorded.
  10. How is it balanced? Equal rewards. Timing may exceed 15 minutes (OQ-11).
  11. Which habits do missions target? The labels conflict between sources (OQ-04).
  12. Is multiplayer real? No; no fake live data (D14).

## Reviewer rejection test (T-900, independent-reviewer)

A synthetic deliverable was planted with 7 flaws: 5 destinations removed, "Verified" without a record, invented coordinates, "Pass" without evidence, a false "calibrated" claim, "hurry" copy, and no evidence. Verdict: **REJECT**. It caught all 7, plus the false "file modified" claim.
