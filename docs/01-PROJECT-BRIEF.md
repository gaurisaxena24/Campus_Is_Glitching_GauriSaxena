# The Campus Is Glitching

## Project Brief

**Version:** 1.2

**Date:** 9 October 2026

**Course:** DESG310 Game Design, FLAME University

**Project type:** Hybrid physical and digital campus wellness game

> Version 1.1 incorporated the original Project Brief (version 1.0) and aligned its scope wording with the full documentation pack. Version 1.2 records the project owner's update: Claude Code is the implementation workflow, Figma Make is removed, and the game is a phone-sized viewport presented in a MacBook browser. See the [Documentation Index](./00-DOCUMENTATION-INDEX.md) for status labels.

---

## 1. Project Overview

The Campus Is Glitching is a hybrid campus wellness game set at FLAME University. The campus is experiencing fictional glitches linked to everyday habits such as endless scrolling, inactivity, disconnection, and rushing through familiar spaces. Players explore campus and repair each glitch by completing a physical activity and a digital or social task.

## 2. Project Purpose

The project turns small acts of movement, environmental awareness, and social connection into a short cooperative game. It is designed to encourage players to notice their surroundings and interact with people, rather than remain focused only on a screen.

## 3. Problem / Opportunity

Campus routines can become repetitive. Students may move between classes without noticing their environment, spend unstructured time on their phones, or miss opportunities for low-pressure interaction. A campus-based game can make these everyday behaviours visible through playful, optional challenges.

## 4. Target Audience

- **Primary audience:** FLAME University students who can safely access campus spaces.
- **Secondary audience:** Student groups or friends who want a short cooperative activity.
- The game should be understandable without prior gaming experience and usable on a phone.

## 5. Core Experience

1. Start a 15-minute session.
2. Explore a simplified interactive map based on the official FLAME campus map.
3. Choose one of five glitches.
4. Complete its physical task and digital/social task.
5. Submit evidence or a reflection where appropriate.
6. Repair the glitch and earn two repair tokens.
7. Continue until time expires or the squad chooses to finish.

The five glitches are **Frozen Character**, **Lost Colour**, **Missing Connection**, **Time Loop**, and **Low Battery**. They are defined in full in the [Game Design Document](./02-GAME-DESIGN-DOCUMENT.md#6-the-five-missions).

## 6. Design Principles

- **Real campus first:** Preserve the actual geography and use the official map as the source of truth.
- **Physical and digital balance:** Neither side alone repairs a glitch.
- **Consent over surveillance:** GPS and squad location sharing are optional.
- **Honest system states:** Never represent mock data as live GPS or multiplayer data.
- **Small, safe, accessible actions:** Challenges should be low-pressure and adaptable.
- **Readable on mobile:** The map and current mission must remain easy to understand.
- **Always phone-sized:** The game is a mobile-first, phone-sized interface. On a MacBook it is shown as a phone-shaped viewport centred in the browser, never stretched into a desktop dashboard.

## 7. Scope

| In Scope | Out of Scope Unless Specifically Implemented |
| --- | --- |
| Five playable campus wellness missions | Integration with official university systems |
| A 15-minute game timer | Automatic public social-media posting |
| Campus map exploration | Automatic proof of a social interaction |
| Quest journal and mission progress | Continuous background GPS tracking |
| Token rewards | Production-grade multiplayer without a functioning backend |
| Local progress persistence where supported | |
| Responsive, mobile-first interface | |
| Phone-sized viewport centred in a MacBook browser | |

## 8. Success Criteria

- A player can start, pause, resume, finish, and restart a session.
- All five missions have clear physical and digital completion conditions.
- A repaired glitch awards exactly two tokens once.
- The map is recognisably based on the official campus layout.
- Players can play manually if GPS is unavailable or declined.
- The interface works at mobile sizes, and on a MacBook it appears as a centred, phone-sized viewport that fits the browser height without clipped controls or horizontal scrolling.
- The prototype clearly labels any simulated or unconfigured functionality.

Each criterion maps to test cases in the [Test Plan](./08-TEST-PLAN-AND-ACCEPTANCE-CRITERIA.md).

## 9. Deliverables

| Deliverable | Document |
| --- | --- |
| Project brief | This document |
| Game design document; rules, mechanics, mission definitions, and progression model | [02-GAME-DESIGN-DOCUMENT.md](./02-GAME-DESIGN-DOCUMENT.md) |
| Map specification and location register | [03-CAMPUS-MAP-SPECIFICATION.md](./03-CAMPUS-MAP-SPECIFICATION.md) |
| User flow and screen specification | [04-USER-FLOWS-AND-SCREEN-SPECIFICATION.md](./04-USER-FLOWS-AND-SCREEN-SPECIFICATION.md) |
| Visual design system and UI component inventory | [05-VISUAL-DESIGN-SYSTEM.md](./05-VISUAL-DESIGN-SYSTEM.md) |
| Technical implementation and tracking specification | [06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md](./06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md) |
| Privacy and safety notes | [07-PRIVACY-AND-SAFETY-GUIDELINES.md](./07-PRIVACY-AND-SAFETY-GUIDELINES.md) |
| Testing plan and acceptance checklist | [08-TEST-PLAN-AND-ACCEPTANCE-CRITERIA.md](./08-TEST-PLAN-AND-ACCEPTANCE-CRITERIA.md) |
| Working web application built with Claude Code in this repository | Not started; see [10-DEVELOPMENT-ROADMAP.md](./10-DEVELOPMENT-ROADMAP.md) |
| ~~Master Figma Make build prompt~~ (superseded, no longer a deliverable) | [09-FIGMA-MAKE-MASTER-PROMPT.md](./09-FIGMA-MAKE-MASTER-PROMPT.md) |
| Development roadmap | [10-DEVELOPMENT-ROADMAP.md](./10-DEVELOPMENT-ROADMAP.md) |
| Decision log | [11-DECISIONS-AND-OPEN-QUESTIONS.md](./11-DECISIONS-AND-OPEN-QUESTIONS.md) |

## 10. Key Assumptions to Validate

- The official 2025 campus map is suitable as the visual/geographical reference for this prototype.
- The selected mission areas are accessible and safe at the time of play.
- GPS accuracy is not guaranteed between nearby buildings.
- The initial build may run as a web app with foreground-only location tracking.

These assumptions are tracked in [11-DECISIONS-AND-OPEN-QUESTIONS.md](./11-DECISIONS-AND-OPEN-QUESTIONS.md#4-assumptions).

## References

- [Official FLAME University Campus Map 2025](https://www.flame.edu.in/images/events/orientation/FLAME-University-Campus-Map-2025.jpg)
- [FLAME University Student Orientation 2025–26](https://www.flame.edu.in/flame-events/student-orientation-2025-26)
