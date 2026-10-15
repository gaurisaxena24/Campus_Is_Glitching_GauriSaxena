# Game Design Document

**Project:** The Campus Is Glitching
**Course:** DESG310 Game Design, FLAME University
**Version:** 1.0
**Date:** 9 October 2026

> **Implementation status:** This document describes the **intended game design**. No application code exists in the repository yet, so every mechanic below is **Not implemented**. Where a rule is a proposal rather than a confirmed decision, it is labelled **Proposed**. See [11-DECISIONS-AND-OPEN-QUESTIONS.md](./11-DECISIONS-AND-OPEN-QUESTIONS.md).

> **Build note (10 October 2026):** All five missions are playable in the first build with the rules in this document. Additions made by the build, awaiting confirmation: progressive reveal of glitches (Q18), a consent checkbox before completing Missing Connection, an optional two-minute walk timer for Frozen Character, and a fixed list of recharge signals for Low Battery. See [11 section 2.1](./11-DECISIONS-AND-OPEN-QUESTIONS.md#21-defaults-implemented-in-code-awaiting-owner-confirmation).

---

## 1. Concept

The FLAME University campus is glitching. Familiar places have started to freeze, lose colour, disconnect, loop, and run out of power. These fictional glitches are caused by everyday habits: endless scrolling, inactivity, disconnection, and rushing through life without noticing it.

Players repair the campus by completing pairs of small actions. Each repair needs one action in the physical world and one matching digital submission. The game lasts 15 minutes.

**One-line pitch:** A 15-minute campus adventure where you fix a glitching world by moving, noticing, and connecting.

## 2. Player Motivation

| Motivation | How the design supports it |
| --- | --- |
| Curiosity | A glitching campus invites players to find out what has gone wrong and where. |
| Completion | Five clearly bounded glitches and a visible token count give a finite, achievable goal. |
| Light challenge | A 15-minute limit makes choices matter without demanding high effort. |
| Social play | Missions can be played with friends, and one mission is about a voluntary connection. |
| Reflection | Digital submissions ask players to notice and record something real. |

Tokens are a progress signal, not the main reward. The intended payoff is the noticing, movement, and conversation that happen along the way.

## 3. Setting and Tone

- **Setting:** The real FLAME University campus, represented through a simplified map based on the [official 2025 campus map](https://www.flame.edu.in/images/events/orientation/FLAME-University-Campus-Map-2025.jpg). See [03-CAMPUS-MAP-SPECIFICATION.md](./03-CAMPUS-MAP-SPECIFICATION.md).
- **Fiction:** The campus is a world whose "code" has been disrupted by habits. Players act as repairers.
- **Tone:** Warm, curious, and gently playful. The game never shames players for phone use or inactivity. Glitches are framed as the campus needing care, not as player failure.
- **Aesthetic:** Vintage illustrated adventure RPG. See [05-VISUAL-DESIGN-SYSTEM.md](./05-VISUAL-DESIGN-SYSTEM.md).

## 4. Core Game Loop

```text
Start session (15:00)
      |
      v
Explore map  --->  Discover a glitch  --->  Activate mission (ACTIVE)
      ^                                           |
      |                                           v
      |                          Complete physical component  (either order)
      |                          Complete digital component
      |                                           |
      |                                           v
      |                                   Glitch REPAIRED
      |                                   +2 repair tokens (once)
      |                                           |
      +--------- time remaining and glitches left?+
                                                  |
                                                  v
                                     Session ends (timeout or finish)
                                                  |
                                                  v
                                           Session summary
```

## 5. Objectives, Rules, and Constraints

### 5.1 Objective

Repair as many of the five glitches as possible within 15 minutes. Repairing all five earns the maximum of ten tokens.

### 5.2 Rules

| # | Rule | Status |
| --- | --- | --- |
| R1 | A session lasts 15 minutes of active play time. | Confirmed |
| R2 | There are exactly five missions, one per glitch. | Confirmed |
| R3 | Every mission has a physical component and a digital component. | Confirmed |
| R4 | A glitch is repaired only when both components are complete. Neither alone is enough. | Confirmed |
| R5 | The two components can be completed in either order. | Confirmed |
| R6 | Exactly two repair tokens are awarded per repaired glitch. | Confirmed |
| R7 | Tokens for a given mission are awarded once only. Repeating or resubmitting a mission never awards more tokens. | Confirmed |
| R8 | Missions can be attempted in any order. | Proposed |
| R9 | More than one mission may be `ACTIVE` at the same time. | Proposed |
| R10 | GPS proximity never counts as proof of a social interaction. | Confirmed |
| R11 | Players can play fully without GPS. | Confirmed |
| R12 | Photos are always optional. A text alternative is always available. | Confirmed |

### 5.3 Constraints

- Physical components must be low-pressure, short, and adaptable. See [07-PRIVACY-AND-SAFETY-GUIDELINES.md](./07-PRIVACY-AND-SAFETY-GUIDELINES.md).
- The game must never encourage running, entering restricted areas, or ignoring discomfort.
- The game cannot verify that a physical action happened. Physical completion is self-reported unless a verification method is later chosen. This is an open question (see [11-DECISIONS-AND-OPEN-QUESTIONS.md](./11-DECISIONS-AND-OPEN-QUESTIONS.md#2-open-questions)).

## 6. The Five Missions

Each mission is written in the same structure. Mission names are fixed and must be used exactly as written in every document and in the interface.

### 6.1 Frozen Character

| Field | Detail |
| --- | --- |
| **Glitch fiction** | A campus character has frozen in place because nobody has been moving. |
| **Habit addressed** | Inactivity |
| **Physical component** | Walk a comfortable loop for two minutes and notice one detail along the way. |
| **Digital component** | Submit a short written observation of the detail. An optional photo may be added. |
| **Completion condition** | Player confirms the walk is done **and** submits a non-empty observation. |
| **Accessible alternative** | Move at any comfortable pace or for a comfortable duration; a seated or rolling loop counts. Observation can be of anything noticed nearby. |
| **Reward** | 2 repair tokens, once |

### 6.2 Lost Colour

| Field | Detail |
| --- | --- |
| **Glitch fiction** | Part of the campus has faded to grey. |
| **Habit addressed** | Rushing past surroundings without noticing them |
| **Physical component** | Find five distinct colours around campus. |
| **Digital component** | Submit a colour list (five named colours with where each was found) or a collage. |
| **Completion condition** | Player confirms the search is done **and** submits five distinct colour entries or a collage. |
| **Accessible alternative** | Colours can be found within a small area; describing colours by object or texture is accepted. |
| **Reward** | 2 repair tokens, once |

### 6.3 Missing Connection

| Field | Detail |
| --- | --- |
| **Glitch fiction** | Two parts of campus have stopped talking to each other. |
| **Habit addressed** | Disconnection |
| **Physical component** | Have a voluntary interaction with another willing participant. |
| **Digital component** | Record one thing learned from the interaction, without sharing private details about the other person. |
| **Completion condition** | Player confirms an interaction took place **and** submits a non-empty "one thing learned" entry. |
| **Rules specific to this mission** | GPS proximity must not count as proof of an interaction. The other person must be willing. No names, contact details, or personal information about the other person are requested or stored. |
| **Accessible alternative** | Interaction may be with a squad member, a friend, or via a message or call if in-person interaction is not comfortable. **Proposed**, pending decision. |
| **Reward** | 2 repair tokens, once |

### 6.4 Time Loop

| Field | Detail |
| --- | --- |
| **Glitch fiction** | A familiar place keeps repeating because nobody really sees it. |
| **Habit addressed** | Autopilot routines |
| **Physical component** | Visit a familiar place that is usually passed without noticing. |
| **Digital component** | Record a new observation about that place. An optional photo may be added. |
| **Completion condition** | Player confirms the visit **and** submits a non-empty new observation. |
| **Accessible alternative** | The place can be the nearest familiar spot, including the player's current location. |
| **Reward** | 2 repair tokens, once |

### 6.5 Low Battery

| Field | Detail |
| --- | --- |
| **Glitch fiction** | The campus is running out of energy. |
| **Habit addressed** | Endless scrolling and sedentary screen time |
| **Physical component** | Complete a short, comfortable stretch or movement break. |
| **Digital component** | Submit a recharge signal (a single tap confirming how the player feels) or a short reflection. |
| **Completion condition** | Player confirms the break is done **and** submits a recharge signal or reflection. |
| **Accessible alternative** | Any comfortable movement, including seated stretches or breathing; players are told to stop if anything is uncomfortable. |
| **Reward** | 2 repair tokens, once |

### 6.6 Mission Summary

| Mission | Physical | Digital | Habit |
| --- | --- | --- | --- |
| Frozen Character | 2-minute comfortable walk, notice a detail | Observation, optional photo | Inactivity |
| Lost Colour | Find five distinct colours | Colour list or collage | Rushing |
| Missing Connection | Voluntary interaction with a willing participant | One thing learned, no private details | Disconnection |
| Time Loop | Visit an overlooked familiar place | New observation, optional photo | Autopilot |
| Low Battery | Short comfortable stretch or movement | Recharge signal or reflection | Scrolling |

### 6.7 Mission Locations

Missions are not tied to fixed GPS points in the confirmed design. Glitches may be shown at destinations on the map to encourage exploration. Any mission-to-destination assignment is **Proposed** and must be validated for safety and accessibility at the time of play. See [03-CAMPUS-MAP-SPECIFICATION.md](./03-CAMPUS-MAP-SPECIFICATION.md#5-mission-placement).

## 7. Mission State Model

| State | Meaning | Player-visible label (Proposed) |
| --- | --- | --- |
| `UNDISCOVERED` | The player has not opened this glitch yet. | "Undiscovered" |
| `ACTIVE` | The player has started the mission. Physical and digital completion are tracked independently. | "In progress" with two checkmarks |
| `REPAIRED` | Both components are complete and tokens have been awarded. Final state. | "Repaired" |

Transitions:

- `UNDISCOVERED → ACTIVE` when the player activates the mission.
- `ACTIVE → REPAIRED` automatically when the second of the two components is completed.
- `REPAIRED` has no outgoing transitions within a session.

The technical version of this model is in [06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md](./06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md#5-mission-state-model).

## 8. Time System

| Aspect | Design | Status |
| --- | --- | --- |
| Duration | 15:00 countdown | Confirmed |
| Start | Starts only when the player presses Start, never automatically | Confirmed |
| Pause and resume | Player can pause and resume. Time does not decrease while paused. | Confirmed |
| Finish early | Player or squad can choose to finish before time runs out | Confirmed |
| Restart | Player can restart, which resets the timer, mission states, and tokens | Confirmed (confirmation step before reset is Proposed) |
| Navigation | Moving between screens never resets or pauses the timer | Confirmed |
| Timeout | When the timer reaches 0:00, the session ends and the summary is shown | **Proposed**. Behaviour for in-progress missions at timeout is an open question. |
| Low-time warning | A gentle notice at 2:00 remaining | Proposed |

## 9. Reward Economy

- **Currency:** repair tokens.
- **Earning:** exactly two tokens when a glitch becomes `REPAIRED`.
- **Maximum per session:** 10 tokens (5 missions x 2 tokens).
- **Spending:** none. Tokens are a score and progress indicator only. Whether tokens have any value outside the game is an open question.
- **Duplicate protection:** tokens are tied to the mission's transition into `REPAIRED`, which happens at most once per mission per session.
- **No partial tokens:** completing one component awards nothing on its own.

## 10. Progression

- Progress is shown as glitches repaired out of five and tokens out of ten.
- The campus map visually "heals" as glitches are repaired (Proposed).
- The quest journal records each mission's state and the player's submissions.
- There is no level system or difficulty curve. Every mission is equally sized so any can be done in any order.

## 11. Failure and Recovery States

| Situation | Intended behaviour | Status |
| --- | --- | --- |
| Time runs out with missions unrepaired | Session ends. Summary shows repaired glitches and tokens. No penalty language. | Proposed |
| Time runs out with a mission `ACTIVE` | Open question. Options: end immediately, or allow submission of an already-completed component. | Open question |
| Player declines GPS | Game continues in manual mode. No functionality required for completion is lost. | Confirmed |
| Player declines photo | Text submission accepted. | Confirmed |
| Player cannot or will not do a physical task | Accessible alternative offered (Confirmed). Player may also skip that mission without penalty (Proposed). | Confirmed / Proposed |
| No willing participant for Missing Connection | Mission can be skipped without penalty. Alternative interaction formats are proposed. | Proposed |
| Empty or invalid submission | Submission is not accepted; a clear message explains what is needed. Entered text is not lost. | Confirmed |
| App closed or refreshed mid-session | Depends on persistence, which is not yet decided. See [06](./06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md#8-persistence). | Open question |

## 12. Squads and Multiplayer

The brief describes a cooperative "squad". Whether this means friends playing together on one device, several devices without syncing, or real multiplayer with a backend is an **open question**. Until a backend exists, the game must not present any data as live multiplayer data. See [11-DECISIONS-AND-OPEN-QUESTIONS.md](./11-DECISIONS-AND-OPEN-QUESTIONS.md).

## 13. Accessibility

- Every physical task has a comfortable alternative and can be skipped.
- No mission requires running, climbing, or a fixed pace.
- No mission requires speaking to strangers; Missing Connection is voluntary.
- No mission requires a camera.
- Text is readable on a phone; controls meet minimum touch-target size. See [05-VISUAL-DESIGN-SYSTEM.md](./05-VISUAL-DESIGN-SYSTEM.md).
- Timer can be paused at any time.
- Colour is never the only signal of mission state (relevant for Lost Colour and for colour-blind players).

## 14. Design Rationale

| Decision | Reason |
| --- | --- |
| Physical plus digital for every repair | Keeps the game from becoming either a pure screen activity or a pure fitness tracker. Matches the principle "Neither side alone repairs a glitch". |
| 15-minute session | Fits between classes and keeps commitment low. |
| Five missions, each tied to one habit | Each glitch makes one everyday behaviour visible without lecturing. |
| Equal reward per mission | Avoids pushing players toward the easiest or hardest mission. |
| Self-reported physical completion | Avoids surveillance; the game cannot honestly verify real-world actions. |
| No automatic social proof | Meaningful interaction cannot be measured by proximity, and trying to would be invasive. |
| Real campus map | Grounds the fiction in places players already know, so the game changes how they see them. |
