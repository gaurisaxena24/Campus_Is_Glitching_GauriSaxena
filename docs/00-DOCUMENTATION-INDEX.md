# Documentation Index

This folder contains the design and planning documentation for **The Campus Is Glitching**, a hybrid physical and digital campus wellness game created for DESG310 Game Design at FLAME University.

## Status Labels Used Across All Documents

Every document uses the same labels so that design intent is never confused with working software.

| Label | Meaning |
| --- | --- |
| **Confirmed** | A project decision that has been agreed and recorded in [11-DECISIONS-AND-OPEN-QUESTIONS.md](./11-DECISIONS-AND-OPEN-QUESTIONS.md). |
| **Proposed** | A recommended approach that has not yet been approved. |
| **Assumption** | Something believed to be true that still needs validation. |
| **Open question** | An unresolved issue. Not to be treated as a decision. |
| **Implemented** | Exists in the repository code. |
| **Not implemented** | Designed or planned, but no code exists yet. |

> **Current implementation status (10 October 2026):** A playable first build exists: title screen, tutorial, all five missions, map, timer, tokens, local saving and the phone viewport. What is implemented, partial or not implemented is listed in [06 section 2](./06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md#2-implementation-status-summary). Test results are in [08](./08-TEST-PLAN-AND-ACCEPTANCE-CRITERIA.md).

## Recommended Reading Order

Read these first:

1. [01-PROJECT-BRIEF.md](./01-PROJECT-BRIEF.md) for what the project is and why it exists.
2. [02-GAME-DESIGN-DOCUMENT.md](./02-GAME-DESIGN-DOCUMENT.md) for the rules, the five missions, and the token economy.
3. [11-DECISIONS-AND-OPEN-QUESTIONS.md](./11-DECISIONS-AND-OPEN-QUESTIONS.md) for what is settled and what is not.

Then read the documents relevant to your task.

## All Documents

| # | Document | What it contains | Read when |
| --- | --- | --- | --- |
| 00 | [Documentation Index](./00-DOCUMENTATION-INDEX.md) | This page. Reading order and status labels. | Starting out |
| 01 | [Project Brief](./01-PROJECT-BRIEF.md) | Overview, purpose, audience, core experience, design principles, scope, success criteria, deliverables, assumptions, references. | First |
| 02 | [Game Design Document](./02-GAME-DESIGN-DOCUMENT.md) | Concept, setting, game loop, rules, time system, the five missions, reward economy, progression, failure and recovery, accessibility, rationale. | Designing or building gameplay |
| 03 | [Campus Map Specification](./03-CAMPUS-MAP-SPECIFICATION.md) | Map reference, the nine destinations, map modes, player marker rules, movement tracking limits, calibration requirements. | Working on the map |
| 04 | [User Flows and Screen Specification](./04-USER-FLOWS-AND-SCREEN-SPECIFICATION.md) | End-to-end journey and per-screen purpose, elements, interactions, states, edge cases. | Designing or building screens |
| 05 | [Visual Design System](./05-VISUAL-DESIGN-SYSTEM.md) | Aesthetic direction, proposed palette and type, components, mission state styling, phone viewport and MacBook presentation rules. | Visual design and front-end work |
| 06 | [Technical Implementation Specification](./06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md) | Current repository state, Claude Code workflow and roles, proposed architecture, phone viewport implementation, state model, timer, persistence, reward validation, map and location handling. | Engineering |
| 07 | [Privacy and Safety Guidelines](./07-PRIVACY-AND-SAFETY-GUIDELINES.md) | Consent, location, photos, social safety, movement accessibility, data handling. | Before building any data, location, or social feature |
| 08 | [Test Plan and Acceptance Criteria](./08-TEST-PLAN-AND-ACCEPTANCE-CRITERIA.md) | Test cases, acceptance criteria, edge cases, accessibility checks, phone viewport tests on a MacBook, manual test procedure. | QA and before submission |
| 09 | [Figma Make Master Prompt (SUPERSEDED)](./09-FIGMA-MAKE-MASTER-PROMPT.md) | Historical record only. Figma Make is no longer used (D17). Its requirements now live in 04, 05, 06, and 08. | Do not use |
| 10 | [Development Roadmap](./10-DEVELOPMENT-ROADMAP.md) | Eight phases with tasks, dependencies, deliverables, completion criteria. | Planning work |
| 11 | [Decisions and Open Questions](./11-DECISIONS-AND-OPEN-QUESTIONS.md) | Decision log, open questions, assumptions, risks, validation items. | Any time a decision is made or questioned |
| 12 | [Device Features](./12-DEVICE-FEATURES.md) | Camera colour hunt, pattern puzzles, step and GPS walk tracking, conversation episodes: device requirements, privacy, limitations, manual tests. | Before testing on a phone or changing a device feature |

## Build Route and Form Factor

- **Claude Code is the implementation workflow.** The game is designed, built, tested, and maintained in this repository's codebase. Figma Make is not used (D17, D19).
- **The game is phone-sized.** On a MacBook it is a phone-shaped viewport centred in the browser window (D18).
- Agent definitions and skills are maintained in `CLAUDE.md` and `.claude/`; shared project state is in `docs/project-state/`.

## Shared Vocabulary

These terms are used identically in every document.

| Term | Definition |
| --- | --- |
| **Glitch** | A fictional campus malfunction. Each glitch corresponds to one mission. |
| **Mission** | The pair of tasks (physical and digital) that repairs one glitch. There are exactly five. |
| **Physical component** | The real-world action part of a mission. |
| **Digital component** | The in-app submission part of a mission (observation, list, reflection, optional photo). |
| **Mission states** | `UNDISCOVERED`, `ACTIVE`, `REPAIRED`. |
| **Repair token** | In-game reward. Exactly two per repaired glitch, awarded once. Maximum ten per session. |
| **Session** | One 15-minute play period. |
| **Phone viewport** | The phone-shaped (about 9:19.5) container that holds the entire game. Centred in the browser on a MacBook; full screen on a phone. |
| **Destination** | One of the nine simplified campus locations listed in [03-CAMPUS-MAP-SPECIFICATION.md](./03-CAMPUS-MAP-SPECIFICATION.md). |

## Maintaining These Documents

- When a decision is made, record it in [11-DECISIONS-AND-OPEN-QUESTIONS.md](./11-DECISIONS-AND-OPEN-QUESTIONS.md) first, then update affected documents.
- When code is added, update the status labels in [06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md](./06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md) and the README.
- Only mark a test as passed in [08-TEST-PLAN-AND-ACCEPTANCE-CRITERIA.md](./08-TEST-PLAN-AND-ACCEPTANCE-CRITERIA.md) after it has actually been run.
