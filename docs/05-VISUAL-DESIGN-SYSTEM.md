# Visual Design System

**Project:** The Campus Is Glitching
**Version:** 1.0
**Date:** 9 October 2026

> **Status:** The **aesthetic direction** in section 1 and the **phone viewport requirement** in section 13 are **Confirmed** ([D13, D18](./11-DECISIONS-AND-OPEN-QUESTIONS.md#1-confirmed-decisions)). All specific values (colours, typefaces, sizes, spacing) are **Proposed** and have not been approved as brand decisions. No design files or styles exist in the repository yet.

> **Build note (10 October 2026):** The implemented palette, type and components are in `src/styles/tokens.css` and `components.css`. They follow this document with the owner's later direction: antique gold, warm cream, deep olive, charcoal and muted rust; Cinzel for display, Alegreya for narrative, Alegreya Sans for interface text. The phone viewport uses a thin dark bezel with a faint gold edge (the owner's brief allows a subtle device-like border); there is no laptop frame or device mockup. Values remain Proposed until the owner approves them.

---

## 1. Visual Identity (Confirmed direction)

A **vintage illustrated adventure RPG**:

- Parchment-like surfaces
- Botanical details
- Earthy colours
- Illustrated campus environments
- Quest-journal elements
- Restrained pixel-style interface details

It must feel like an illustrated adventure game. It must **not** feel like a generic fitness tracker or a corporate wellness dashboard.

**Form factor:** the game is always a phone-sized screen. On a MacBook it appears as a tall, narrow phone viewport centred in the browser window (section 13).

**The glitch layer:** glitches are the one place where the calm illustrated world is disrupted. Proposed treatment: limited pixel displacement, desaturation, or scanline texture applied only to glitched elements, removed when repaired.

## 2. Design Principles

| Principle | Meaning in practice |
| --- | --- |
| Storybook, not dashboard | Use illustrated cards and journal pages instead of charts and metric tiles. |
| Calm world, contained glitches | Glitch effects are local and small. They never cover text or controls. |
| Readable first | Decorative texture never reduces text contrast. |
| Restrained pixels | Pixel details are accents (icons, borders, token art), not the whole interface. |
| State is never colour alone | Every mission state also uses an icon, label, or shape. |
| Honest labels | Simulated or unavailable features are visibly marked. |

## 3. Colour Palette (Proposed)

All values are proposals for testing. Contrast must be checked before adoption.

| Token | Role | Proposed value |
| --- | --- | --- |
| `parchment` | Main background | `#F3E9D2` |
| `parchment-deep` | Cards, journal pages | `#E8D9B5` |
| `ink` | Primary text | `#2E2A24` |
| `ink-muted` | Secondary text | `#5C5346` |
| `moss` | Primary action, repaired state | `#4F6B3A` |
| `fern` | Hover and highlight | `#7A9A5A` |
| `terracotta` | Active state, accents | `#B5603C` |
| `ochre` | Tokens, rewards | `#C9973A` |
| `sky-faded` | Map water and sky | `#9DB4B8` |
| `glitch` | Glitch effect accent only | `#7B5EA7` |
| `alert` | Errors | `#9E2B25` |

Rules:

- Body text uses `ink` on `parchment` or `parchment-deep`.
- `glitch` is never used for text or for primary buttons.
- A dark mode is not planned. Open question if required.

## 4. Typography (Proposed)

| Role | Direction | Example candidates (not decided) |
| --- | --- | --- |
| Display (titles, mission names) | Serif with storybook character | A classic book serif |
| Body | Highly readable serif or humanist sans | A readable text face at 16px minimum |
| Pixel accent | Pixel font for small labels such as token counts and timer digits | A pixel display face, used sparingly |

Proposed scale (mobile first): 32 / 24 / 20 / 16 / 14 px. Body text never below 16px. Pixel font never used for paragraphs.

Typeface choices must be checked for licensing before use.

## 5. Spacing and Layout (Proposed)

- Base spacing unit: 4px, with common steps 8, 12, 16, 24, 32.
- Side margin inside the phone viewport: 16px.
- All game layout is designed for the phone viewport only (width 320 to 430 CSS px). There is no wider desktop layout.
- Session bar fixed at the top of the phone viewport.
- Bottom navigation fixed at the bottom of the phone viewport.
- Content between them scrolls internally; the page itself does not scroll.
- Primary actions placed within easy thumb reach.

## 6. Buttons

| Variant | Use | Appearance (Proposed) |
| --- | --- | --- |
| Primary | Start, Start repair, Submit, Continue | `moss` fill, parchment text, slight pixel-stepped corners |
| Secondary | Back, Open journal | Outlined in `ink`, transparent fill |
| Destructive | Restart, Finish early | Outlined in `alert`, requires confirmation |
| Disabled | Unavailable actions | Reduced contrast plus a reason in text where useful |

All buttons: minimum touch target 44 x 44px, visible keyboard focus ring, text label (no icon-only primary actions).

## 7. Cards

| Card | Contents |
| --- | --- |
| Mission card | Mission name, glitch illustration, state badge, two component checkmarks, reward |
| Component card | "Physical" or "Digital" label, instruction, status |
| Destination card | Destination name, any glitch at that location |
| Journal entry | Mission name, state, submission text, optional photo thumbnail |
| Summary card | Totals and reflections |

Cards use `parchment-deep` with a subtle paper texture and a thin ink border. Botanical corner ornaments are optional decoration.

## 8. Mission States and Tokens

| State | Visual (Proposed) | Non-colour signal |
| --- | --- | --- |
| `UNDISCOVERED` | Desaturated, glitch texture, `glitch` accent | "?" icon and label "Undiscovered" |
| `ACTIVE` | Full colour with `terracotta` border, partial glitch | Two checkboxes showing component progress; label "In progress" |
| `REPAIRED` | Clean illustration, `moss` badge, botanical flourish | Check seal icon; label "Repaired" |

**Repair token:** a small pixel-art coin or seal in `ochre`. Totals shown as "y / 10". Award animation is short (under one second), skippable, and respects reduced-motion settings.

## 9. Map Styling

- Hand-drawn, illustrated campus in the confirmed aesthetic, preserving real layout. See [03-CAMPUS-MAP-SPECIFICATION.md](./03-CAMPUS-MAP-SPECIFICATION.md).
- Destination labels on parchment tabs, always readable over the art.
- Glitch markers use the state visuals above.
- The map mode label (for example "Illustrated map, not to scale") is always visible.
- Player marker, if ever used, includes an accuracy circle.

## 10. Icons and Illustrations

- Icon style: simple line or pixel icons in `ink`, consistent stroke.
- Illustration subjects: campus buildings, plants, paths, and the five glitch characters or scenes.
- Each mission needs a glitched and a repaired illustration.
- Illustrations must not depict identifiable real people.

## 11. Feedback

| Feedback | Treatment |
| --- | --- |
| Success | Short message plus repaired illustration; no loud effects |
| Error | Inline, in `alert` with an icon and plain-language fix |
| Loading | Parchment skeleton or small pixel spinner with a text label |
| Low time (Proposed) | Gentle banner at 2:00 remaining; no flashing |
| Empty states | Friendly illustrated message explaining what to do next |

## 12. Motion

- Motion is subtle and brief.
- Glitch flicker effects must not flash more than three times per second.
- All non-essential animation is disabled when the device requests reduced motion.

## 13. Phone Viewport and Desktop Presentation

**Status:** Requirement Confirmed (D18). Specific values below are Proposed. **Not implemented.**

The game is a mobile-first, phone-sized interface. On a MacBook, the desktop browser is only the presentation environment; the phone-shaped viewport *is* the game.

### 13.1 Phone viewport

| Property | Requirement |
| --- | --- |
| Aspect ratio | About 9:19.5 (portrait) |
| Width | Up to about 390 to 430 CSS px (Proposed default: 400px) |
| Height | Fits the available browser height, minus a small outer margin; width derived from height and ratio, capped at the maximum width |
| Position | Centred horizontally and vertically in the browser window |
| Contents | The entire game interface, including overlays and modals, renders inside the viewport |
| Scrolling | Session bar and bottom navigation stay fixed; the content area scrolls internally. No horizontal overflow. |
| Safe areas | Top and bottom padding inside the viewport so content clears the rounded corners and any device safe-area insets |
| Interactivity | The viewport is the real, interactive application, not a static image. Touch, mouse, and keyboard all work. |

### 13.2 Behaviour by browser size

| Browser window | Behaviour |
| --- | --- |
| Real phone (width at or below about 430px) | The viewport fills the screen edge to edge. No frame, no outer background, no rounded corners. |
| MacBook, normal window | Phone viewport centred, height-fitted, with the atmospheric background around it. |
| MacBook, very wide or full screen | Viewport keeps its phone width and ratio. It does not stretch. Extra space is background only. |
| MacBook, short window | Viewport height always fits the window. Width follows the 9:19.5 ratio down to a proposed minimum of 320px; below that the width holds, the shape becomes slightly less tall than 9:19.5, and the content area scrolls internally. No controls are clipped and the page itself never scrolls. |
| Window resized live | Viewport recalculates without losing game state or resetting the timer. |

### 13.3 Phone frame (optional)

- A subtle frame is allowed: a thin rounded border (Proposed radius about 32px) in `ink` or `parchment-deep`, possibly with a soft shadow.
- It must match the illustrated adventure aesthetic and must not take more than a few pixels of space.
- No realistic phone hardware (notches, buttons) is required.
- **No MacBook frame, laptop illustration, or second device mockup** anywhere.

### 13.4 Outer desktop background

- Restrained and atmospheric, inspired by the game world, for example a dim parchment or painted campus landscape, softly blurred or low contrast.
- Visually secondary: lower contrast and saturation than the game.
- **Must not contain** navigation, cards, statistics, controls, or text that competes with the game. At most, a small unobtrusive title is allowed (Proposed; optional).
- Glitch effects never appear in the outer background.

### 13.5 Components that must fit the viewport

Buttons, forms, mission cards, the map, the Quest Journal, the Pause, Time's Up, and confirmation overlays, and all modals are sized for the phone viewport and positioned relative to it, never to the full browser window.

## 14. Accessibility Checklist for Visual Design

- [ ] Text contrast at least 4.5:1 against its actual background (including texture)
- [ ] Touch targets at least 44 x 44px
- [ ] Visible focus indicator on all interactive elements
- [ ] Mission state never conveyed by colour alone
- [ ] Reduced-motion support
- [ ] No flashing above three times per second
- [ ] Text resizable to 200% without loss of content
- [ ] No horizontal scrolling inside the phone viewport
- [ ] No controls clipped at the minimum supported viewport height
