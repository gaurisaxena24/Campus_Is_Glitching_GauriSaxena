---
name: ui-ux-consistency-review
description: "Review screen specs and the rendered UI for flow completeness, navigation, interaction states, design-token use, accessibility (contrast via bundled contrast.py, touch targets, focus, reduced motion, colour-independent state), the D18 phone viewport centred in a MacBook browser, and the illustrated adventure-RPG direction. Use for any screen, navigation or visual change."
---

# UI/UX Consistency Review

## When to use
Screen specs change; a new screen or state is added; tokens change; the real app's UI changes.

## Required inputs
`docs/04`, `docs/05`, the screens or code to review; for built UI, the running app.

## Procedure
1. **Flow completeness:** walk `docs/04` §3 journey. Every screen is reachable and has an exit, with no dead ends. Every S-ID has purpose, elements, interactions, states and edge cases.
2. **Navigation:** compare against the original model (SRC-01: MAP / QUESTS / INVENTORY / SQUAD / STATUS) and the current decision. Report differences. Don't decide.
3. **States:** each screen covers empty, loading, error, success, offline and permission-denied where relevant, and simulated features are labelled.
4. **Contrast:** for every text/background token pair:
   `python3 .claude/skills/ui-ux-consistency-review/contrast.py <FG> <BG> ...`. Normal text needs ≥ 4.5:1 and large text ≥ 3:1. Textured backgrounds must also be checked on the real render.
5. **Accessibility checklist** (`docs/05`): 44×44px targets, visible focus, no colour-only state, reduced motion, ≤ 3 flashes/sec, 16px body minimum, 200% zoom.
6. **Viewport (D18):** phone viewport about 9:19.5, max about 390–430 CSS px, height fitted, centred in the desktop browser; no device frame, no desktop dashboard; no horizontal scroll; scrolling contained in the game viewport.
7. **Art direction:** parchment, botanical, earthy, quest journal, restrained pixel accents. Flag dashboard tiles, charts, neon or cyberpunk styling, and glitch effects covering text.
8. **Real render (when code exists):** launch the app and capture screenshots at phone (e.g. 390×844) and MacBook (e.g. 1440×900) sizes. Cite file names and dates. Mockups are never evidence (D20).

## Validation checklist
- [ ] Contrast script output attached
- [ ] Every screen state covered or flagged
- [ ] Viewport rules checked on the real render (or NOT RUN: no build)

## Failure cases
No build (spec-only review, so label it); fonts unavailable (record it); texture contrast unmeasurable (NOT RUN).

## Ask for clarification when
A fix changes navigation structure, removes a screen, or alters art direction.

## Completion report
Return: what was checked, results with citations, files changed (or none), commands run with their actual output, items `NOT RUN` and why, open questions raised.
