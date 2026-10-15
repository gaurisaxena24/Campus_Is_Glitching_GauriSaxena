# Privacy and Safety Guidelines

**Project:** The Campus Is Glitching
**Version:** 1.0
**Date:** 9 October 2026

> **Status:** These are **design requirements**. No data collection, storage, location, or photo feature exists in the repository yet, so no privacy protections are implemented. This document must not be read as a description of protections already in place. When a feature is built, record here exactly what it does.

---

## 1. Core Rules

| # | Rule |
| --- | --- |
| P1 | Location permission is requested explicitly, only when needed, with a plain explanation. Never on app load. |
| P2 | Tracking remains foreground-only unless a separately justified and properly implemented alternative exists. |
| P3 | Players can decline photos and social interactions without losing the ability to play. |
| P4 | The game never requires sensitive personal disclosures. |
| P5 | GPS proximity cannot verify meaningful social interaction and is never used to do so. |
| P6 | Physical tasks offer reasonable alternatives. |
| P7 | The game never encourages running, entering restricted areas, trespassing, unsafe routes, or movement that ignores discomfort. |
| P8 | Players are told what information is collected, why, and whether it is stored or shared. |
| P9 | The game does not claim privacy protections that have not been implemented. |

## 2. Consent

- All optional features (location, photos) are off by default.
- Consent is asked at the point of use, with the reason stated.
- Players can change their mind: turning off location stops tracking immediately.
- Declining any permission never blocks play or triggers negative messaging.
- Missing Connection depends on the other person's willingness. The app tells the player to ask first and to accept "no".

## 3. Location Permission

- Location is optional and not needed to complete any mission.
- Requested only when the player chooses to enable it (for example on S3 or the map).
- Explanation shown before the browser prompt, stating: what is used (approximate device location), why (to show an approximate position on a calibrated map), and that it stays on the device (if true at implementation time).
- Foreground-only: stop on pause, session end, or when the page is hidden.
- Location must never be presented as more accurate than it is.

## 4. Data Minimisation

Collect only what the game needs to function.

| Data | Needed? | Notes |
| --- | --- | --- |
| Name, email, student ID | No | Not collected. No accounts. |
| Mission states and timer | Yes | Needed for gameplay. |
| Text submissions | Yes | Needed for the digital component. |
| Photos | Optional | Player choice. Text alternative always available. |
| Location | Optional | Only if location is implemented and enabled. |
| Information about other people | No | Explicitly discouraged in prompts. |

## 5. Data Handling Statement (to complete at implementation)

Fill this table in truthfully once code exists, and show a short version to players.

| Data | Collected | Purpose | Where stored | Shared | Retention |
| --- | --- | --- | --- | --- | --- |
| Mission progress | To be confirmed | Gameplay | To be confirmed | To be confirmed | To be confirmed |
| Text submissions | To be confirmed | Digital component | To be confirmed | To be confirmed | To be confirmed |
| Photos | To be confirmed | Optional evidence | To be confirmed | To be confirmed | To be confirmed |
| Location | To be confirmed | Optional map marker | To be confirmed | To be confirmed | To be confirmed |

Proposed target for a single-device prototype: everything stays on the device, nothing is shared, and data is cleared on Restart or when the player chooses.

## 6. Photo Submissions

- Always optional.
- The interface reminds players not to photograph people without their permission, and not to capture identifiable people, ID cards, screens with personal information, or restricted areas.
- Photos are not posted anywhere automatically. Automatic public social-media posting is out of scope.
- If photos are stored, state where and for how long.
- Proposed: if a photo includes location metadata, it is not read or stored by the game.

## 7. Social Interaction Safety (Missing Connection)

- The interaction is voluntary for both people.
- The player asks first and accepts a refusal.
- The digital component records one thing the player learned. It must not include the other person's name, contact details, or private information. The input shows this reminder.
- No proof of interaction is required or collected. The game does not use proximity, contact exchange, or photos of the other person as proof.
- Players can skip this mission without penalty (Proposed).
- Interactions should take place in open, public campus areas.

## 8. Movement Accessibility and Physical Safety

- Every physical component has a comfortable alternative (see [02-GAME-DESIGN-DOCUMENT.md](./02-GAME-DESIGN-DOCUMENT.md#6-the-five-missions)).
- Wording uses "walk", "move at a comfortable pace", and "stop if anything feels uncomfortable". It never uses "run", "race", or "as fast as you can".
- The timer is not a reason to hurry. The interface does not reward speed beyond the session limit, and the timer can be paused.
- Players are reminded to stay on public paths, respect restricted areas, watch for vehicles, and look up from the screen while moving.
- Mission locations, if assigned, must be checked for safety and access at the time of play.
- The game is not medical or fitness advice.

## 9. Privacy

- No accounts, no tracking for analytics, no third-party advertising (Proposed baseline).
- If any third-party service is added (for example hosting, analytics, or a backend), list it here with what it receives.
- Do not include secrets, API keys, or environment variable values in the repository or documentation.

## 10. Data Retention

- To be defined at implementation. Proposed for the prototype: session data kept on the device until Restart or until the player clears it, and never uploaded.
- If a backend is added, a retention period and deletion process must be defined before any real player data is collected.

## 11. Error Handling with Privacy in Mind

- Error messages must not expose submission content or location values.
- Failed saves are reported honestly.
- Location errors explain what happened and confirm that play can continue.

## 12. Responsible Use

- The game supports wellbeing; it does not diagnose, measure, or judge health.
- Copy does not shame phone use, inactivity, or lack of social contact.
- Any classroom demo using real players should explain the game, its optional features, and what data (if any) is recorded before starting.
