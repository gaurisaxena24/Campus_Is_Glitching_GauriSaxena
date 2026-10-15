# Campus Map Specification

**Project:** The Campus Is Glitching
**Version:** 1.0
**Date:** 9 October 2026

> **Implementation status (10 October 2026):** The illustrative map, destination register, markers, legend, list fallback, pan and zoom are **implemented** (`src/js/ui/map.js`). Location tracking and the calibrated mode are **not implemented**. No GPS coordinates have been collected, and none are listed in this document.

---

## 1. Purpose

The map lets players see where glitches are on a recognisable version of the FLAME University campus, choose where to go next, and track which areas have been repaired. It supports exploration. It is not a navigation or wayfinding tool.

## 2. Source of Truth

| Item | Source |
| --- | --- |
| Geographic reference | [Official FLAME University Campus Map 2025](https://www.flame.edu.in/images/events/orientation/FLAME-University-Campus-Map-2025.jpg) |
| Supporting reference | [FLAME University Student Orientation 2025–26](https://www.flame.edu.in/flame-events/student-orientation-2025-26) |

Rules:

- The relative arrangement of destinations must match the official map.
- No buildings, paths, landmarks, coordinates, or distances may be invented.
- If something is unclear on the official map, it is left out or marked as unverified, not guessed.
- Whether the official map image may be reproduced directly in the game, or must be redrawn, is an open question about usage rights. See [11-DECISIONS-AND-OPEN-QUESTIONS.md](./11-DECISIONS-AND-OPEN-QUESTIONS.md).

## 3. Destination Register

The initial simplified destination list contains nine destinations. Names must be used exactly as written.

| ID | Destination | Display label | Official map key used | Artwork position (x%, y%) | GPS coordinates |
| --- | --- | --- | --- | --- | --- |
| D1 | Main Gate | Main Gate | 46 FLAME Entrance | 86.5, 84.6 | Not collected |
| D2 | APJ Abdul Kalam (see Q17) | APJ | 2 APJ Abdul Kalam (Academics) | 73.2, 35.6 | Not collected |
| D3 | Arjuna Centre for Sports | Arjuna | 18 Arjuna Centre for Sports | 58.8, 8.3 | Not collected |
| D4 | Housing Area | Housing Area | 40 to 42 Housing (marker on 41 West Housing) | 17.3, 32.6 | Not collected |
| D5 | General Areas / Common Areas | Common Areas | 46 to 48 Common Areas (marker on 48 ATM, Convenient Store) | 60.3, 76.1 | Not collected |
| D6 | Mess | Mess | 25 to 35 Eateries (marker on 26 Rasoi) | 62.6, 63.8 | Not collected |
| D7 | Shantiniketan | Shantiniketan | 49 to 54 Shantiniketan | 69.6, 68.5 | Not collected |
| D8 | Plaza | Plaza | 43 FLAME Plaza | 60.8, 45.3 | Not collected |
| D9 | Chandragupta Collaborative Development Centre | Chandragupta | 12 Chandragupta Collaborative Development Centre | 39.6, 51.9 | Not collected |

**Status: Implemented** in `src/js/data/destinations.js` (10 October 2026). Positions were read from the numbered pins on the official map (1500 x 1061 px) and converted to the cropped game artwork (crop x 60 to 1450, y 10 to 900). They are percentages of an image, **not GPS coordinates**. Where a destination covers several official keys, one representative key was chosen and is named above.

**Naming finding (Q17):** the official key separates *2. APJ Abdul Kalam* (an academic block) from *3. Vivekananda Library*. The earlier label "APJ Abdul Kalam Library" combined the two. The official key also calls the entrance *FLAME Entrance*; the game keeps "Main Gate" from the docs and shows the official name in the location panel.

### 3.1 Map Asset (Implemented)

| File | What it is |
| --- | --- |
| `assets/map/source-official-campus-map-2025.jpg` | The official map, downloaded unmodified from the URL in section 2 on 10 October 2026 (1500 x 1061) |
| `assets/map/campus-map.jpg` | Game artwork: legend boxes covered, cropped to the campus, grey tones warmed to parchment, paper grain and vignette added. Geography is unchanged |
| `assets/map/stylise-map.py` | The exact processing script (Python with Pillow), so the asset can be regenerated |

Usage rights remain open (Q10); the game credits the official map on the title screen, the legend and the Status screen.

## 4. Map Modes

The game must be honest about what the map shows. Three modes are defined. Only one is active at a time, and the active mode must be labelled in the interface.

| Mode | Description | When to use | Status |
| --- | --- | --- | --- |
| **Illustrative map** | A stylised campus map preserving the real arrangement of destinations. No live player position. Labelled "Illustrated map · not to scale". | Default. Used whenever the map is not calibrated. | **Implemented** |
| **Non-geographic exploration** | A list or card view of destinations with no spatial layout. | Fallback if map art fails to load, and an accessible alternative via the list button. | **Implemented** |
| **Calibrated live map** | The illustrative map aligned to real GPS coordinates through a verified calibration process, showing an approximate player marker. | Only after calibration is completed and tested. | Not planned until calibration exists |

## 5. Mission Placement

- In the confirmed design, missions are not tied to fixed GPS points.
- Glitch markers may be placed on destinations to encourage exploration. Any assignment of a mission to a destination is **Proposed** and must be checked for safety, accessibility, and access permissions at the time of play.
- Players must be able to complete any mission without being at a specific destination, so that inaccessible or busy areas never block progress.

A mission-to-destination assignment table should be added here once agreed and recorded in the decision log.

## 6. Map Interactions

| Interaction | Behaviour | Status |
| --- | --- | --- |
| View map | Shows all nine destinations with labels and glitch markers | Proposed |
| Tap destination | Opens a card with the destination name and any glitch located there | Proposed |
| Tap glitch marker | Opens the mission detail for that glitch | Proposed |
| Pan and zoom | Allowed on small screens; labels remain readable at all zoom levels | Proposed |
| Repaired state | Repaired glitch markers change appearance (not colour alone) | Proposed |
| Return to current mission | A persistent control returns to the active mission from the map | Proposed |

The timer must continue running and remain visible while the map is open.

## 7. Map Assets

| Asset | Description | Status |
| --- | --- | --- |
| Base map artwork | Illustrated campus base layer, vintage RPG style, preserving real layout | Not created |
| Destination icons | One icon per destination type | Not created |
| Glitch markers | Distinct markers for `UNDISCOVERED`, `ACTIVE`, and `REPAIRED` | Not created |
| Player marker | Only used in calibrated live map mode | Not created |
| Map legend | Explains markers and states the active map mode | Not created |

Styling is defined in [05-VISUAL-DESIGN-SYSTEM.md](./05-VISUAL-DESIGN-SYSTEM.md#9-map-styling).

## 8. Player Marker Requirements

A player position marker may only be shown when all of the following are true:

1. The map is in calibrated live map mode.
2. The player has explicitly granted location permission.
3. A recent location reading is available.
4. The reading's reported accuracy is shown, for example as an accuracy circle.

If any condition is not met, no player marker is shown and the interface states why (for example "Location off" or "Location not available on this map").

The marker must never be placed at a default, guessed, or simulated position presented as real.

## 9. Movement Tracking

Movement tracking is **optional** and **not required** to play. Whether it is needed at all is an open question.

If it is implemented:

- Location is requested only when needed, with an explanation, never on app load.
- Tracking runs only while the app is open in the foreground.
- Movement estimates depend on permission, device accuracy, device support, and browser limitations. They must be presented as estimates.
- GPS accuracy between nearby campus buildings may be poor (tens of metres or worse). It must not be used to decide whether a player is at a specific building.
- GPS proximity must never be used as proof of a social interaction.
- Location data handling follows [07-PRIVACY-AND-SAFETY-GUIDELINES.md](./07-PRIVACY-AND-SAFETY-GUIDELINES.md).

## 10. Calibration Requirements

Image pixel positions on the map artwork are not GPS coordinates. Converting between them requires a calibration process. Calibration is **Not started**.

A valid calibration would require:

1. Choosing at least three well-separated reference points visible on the map artwork.
2. Measuring real GPS coordinates on site at each point, recording date, device, and reported accuracy.
3. Computing a transform from coordinates to map pixels.
4. Testing the transform at points not used for calibration and recording the error.
5. Documenting the results in this file.

Until this is complete, the map must remain in illustrative or non-geographic mode.

## 11. Technical Limitations

- Browser geolocation requires a secure (HTTPS) context and user permission.
- Location may be unavailable indoors, inaccurate near buildings, or slow to resolve.
- Background tracking is not reliably available to web apps and is out of scope.
- Battery use increases with continuous location watching.
- The official map image may not be to scale.
