# Figma Make Master Prompt (SUPERSEDED)

**Project:** The Campus Is Glitching
**Version:** 1.0 (superseded 9 October 2026)
**Date:** 9 October 2026

> **SUPERSEDED. Do not use.** Figma Make has been removed from this project as a tool, workflow, deliverable, and dependency ([D17](./11-DECISIONS-AND-OPEN-QUESTIONS.md#1-confirmed-decisions)). The game is designed, built, tested, and maintained through Claude Code in the repository. Do not paste this prompt into Figma Make or any other visual builder.
>
> This file is kept as a historical record only. Its useful design requirements have been moved to the active documents:
>
> | Requirement in the old prompt | Now maintained in |
> | --- | --- |
> | Concept, audience, game loop, five missions, mission states, token rules | [02-GAME-DESIGN-DOCUMENT.md](./02-GAME-DESIGN-DOCUMENT.md) |
> | Screens, navigation, empty, loading, success, and error states | [04-USER-FLOWS-AND-SCREEN-SPECIFICATION.md](./04-USER-FLOWS-AND-SCREEN-SPECIFICATION.md) |
> | Visual direction, proposed palette, typography, glitch treatment, accessibility | [05-VISUAL-DESIGN-SYSTEM.md](./05-VISUAL-DESIGN-SYSTEM.md) |
> | Timer in shared state, derived token count, validation, map restrictions, honesty rules | [06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md](./06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md) |
> | Follow-up checks (timer reset, duplicate tokens, completion order, Lost Colour validation, copy review, 320px layout) | [08-TEST-PLAN-AND-ACCEPTANCE-CRITERIA.md](./08-TEST-PLAN-AND-ACCEPTANCE-CRITERIA.md) |
>
> **Overridden content:** the archived prompt's responsive line ("Tablet: map with slide-over mission panel. Desktop: map and side panel side by side.") no longer applies. On every screen size the game is a phone-sized viewport centred in the browser ([D18](./11-DECISIONS-AND-OPEN-QUESTIONS.md#1-confirmed-decisions)).

## 2. Archived Prompt Text (superseded)

```text
Build a connected, clickable mobile-first web app prototype called "The Campus Is Glitching".
It must be one coherent experience with working navigation and shared state between screens,
not a set of unrelated static screens.

=== PROJECT CONCEPT ===
A 15-minute hybrid physical and digital campus wellness game set at FLAME University.
The campus is experiencing fictional glitches caused by endless scrolling, inactivity,
disconnection, and rushing through everyday life. Players repair each glitch by completing
BOTH a real-world physical action AND a matching digital submission in the app.
Neither part alone repairs a glitch.

=== TARGET AUDIENCE ===
FLAME University students, playing alone or with friends, on their phones.
No gaming experience required. Language is warm, playful, and short. Never shame phone use.

=== CORE GAME LOOP ===
Start 15-minute session -> explore campus map -> choose a glitch -> start repair ->
complete physical task and digital submission in either order -> glitch repaired ->
earn exactly 2 repair tokens -> continue until time runs out or player finishes -> summary.

=== THE FIVE MISSIONS (use these exact names) ===
1. Frozen Character
   Physical: walk a comfortable loop for two minutes and notice one detail.
   Digital: write an observation; optional photo.
2. Lost Colour
   Physical: find five distinct colours around campus.
   Digital: enter five colours and where each was found, or a collage.
3. Missing Connection
   Physical: a voluntary interaction with another willing person.
   Digital: record one thing learned. Show a reminder: do not include names or private details.
   Location or proximity must never count as proof of this interaction.
4. Time Loop
   Physical: visit a familiar place you usually pass without noticing.
   Digital: record a new observation; optional photo.
5. Low Battery
   Physical: a short, comfortable stretch or movement break.
   Digital: tap a recharge signal or write a short reflection.
Every physical task shows a comfortable alternative and a safety note:
walk, do not run; stop if anything feels uncomfortable.

=== MISSION STATES ===
Each mission has one state: UNDISCOVERED, ACTIVE, or REPAIRED.
- UNDISCOVERED -> ACTIVE when the player taps "Start repair".
- In ACTIVE, show two separate checkmarks: Physical and Digital. They can be completed in either order.
- When both are complete, the mission becomes REPAIRED automatically.
- REPAIRED is final. Opening it shows a read-only record.
Show state with an icon and a text label, not colour alone.

=== TOKENS ===
Exactly 2 repair tokens per repaired glitch, awarded once. Maximum 10.
Calculate tokens as 2 x number of REPAIRED missions so duplicates are impossible.
Double taps, resubmitting, or navigating back must never add more tokens.
Show tokens as "y / 10" in the session bar.

=== TIMER ===
- 15:00 countdown. Starts only when the player taps Start.
- Pause, Resume, Finish early (with confirmation), Restart (with confirmation; resets timer,
  missions, and tokens).
- The timer lives in shared app state. Navigating between screens must never reset or pause it.
- At 0:00 show a "Time's up" overlay, then the summary.
- Gentle low-time notice at 2:00 remaining, no flashing.

=== SCREENS AND NAVIGATION ===
1. Welcome: title, one-line story, illustrated campus, Begin.
2. How to Play: three short steps.
3. Permissions and Safety: explain that location and photos are optional; safety rules;
   Continue without location is the primary path.
4. Ready: big 15:00, Start button.
5. Campus Map: session bar (time, pause, tokens), illustrated map, nine destination labels,
   glitch markers by state, legend, map mode label, link to Quest Journal.
6. Mission Detail: glitch story, Physical card, Digital card, alternative, reward, Start repair.
7. Physical Task: instructions, safety note, alternative, "I've done this".
8. Digital Submission: mission-specific input, optional photo, privacy note, Submit,
   inline validation that keeps typed text.
9. Glitch Repaired: celebration, "+2 repair tokens", totals x/5 glitches and y/10 tokens.
10. Quest Journal: all five missions with state, checkmarks, and submissions.
11. Pause overlay: Resume, Finish, Restart.
12. Time's Up overlay.
13. Session Summary: glitches repaired, tokens, submissions, Play again.
Mobile: fixed session bar at top, bottom navigation with Map and Journal.
Tablet: map with slide-over mission panel. Desktop: map and side panel side by side.

=== CAMPUS MAP ===
Base the map on the official FLAME University Campus Map 2025:
https://www.flame.edu.in/images/events/orientation/FLAME-University-Campus-Map-2025.jpg
Show these nine destinations, preserving their real relative arrangement from the official map:
Main Gate; APJ (APJ Abdul Kalam Library); Arjuna Centre for Sports; Housing Area;
General Areas / Common Areas; Eating Place; Shantiniketan; Plaza;
Chandragupta Collaborative Development Centre.
Restrictions:
- Do not invent buildings, paths, landmarks, coordinates, or distances.
- This is an illustrated map. Label it "Illustrated map, not to scale".
- Do not show a live player location marker. Map pixel positions are not GPS coordinates.
- If the map image fails, show a list of the nine destinations instead.
Tapping a destination opens a card; tapping a glitch opens its Mission Detail.

=== VISUAL DIRECTION ===
Vintage illustrated adventure RPG. Parchment surfaces, botanical details, earthy colours,
illustrated campus environments, quest-journal pages, and restrained pixel-style accents
(token icons, timer digits, small borders). It must NOT look like a fitness tracker or a
corporate wellness dashboard.
Proposed palette: parchment #F3E9D2, deep parchment #E8D9B5, ink #2E2A24, muted ink #5C5346,
moss #4F6B3A (primary, repaired), terracotta #B5603C (active), ochre #C9973A (tokens),
faded sky #9DB4B8 (map), glitch violet #7B5EA7 (glitch effects only), alert #9E2B25 (errors).
Typography: storybook serif for headings, readable body text at 16px minimum,
pixel font only for small accents.
Glitches: desaturation and small pixel displacement on glitched illustrations only;
removed when repaired. Never cover text or controls.

=== ACCESSIBILITY ===
Text contrast at least 4.5:1. Touch targets at least 44x44px. Visible focus states.
Keyboard navigable. State never shown by colour alone. Respect reduced motion.
No flashing more than three times per second. Body text never below 16px.

=== STATES TO DESIGN ===
Empty: Quest Journal before any mission is started; Summary with no repairs (encouraging, no penalty).
Loading: map loading skeleton on parchment.
Success: submission accepted; glitch repaired.
Error: empty or invalid submission (inline, keeps text); map failed (list fallback);
photo failed (continue without photo); storage unavailable (warning).

=== HONESTY RULES ===
- Do not simulate GPS, live location, multiplayer, squads syncing, or cloud saving as if real.
- If any sample or placeholder data is shown, label it "Sample" or "Simulated".
- No automatic social-media posting.
- Do not ask for names, emails, student IDs, or information about other people.
```

## 3. Archived Follow-up Prompts (superseded)

These checks now live as test cases in [08](./08-TEST-PLAN-AND-ACCEPTANCE-CRITERIA.md).

- "Check that navigating between Map, Journal, and Mission Detail never resets the timer, and fix it if it does."
- "Make tokens derived from the number of REPAIRED missions times two, and confirm double taps cannot add tokens."
- "Let physical and digital be completed in either order, and only mark REPAIRED when both are done."
- "Add the Lost Colour validation: five entries, all distinct, with inline errors that keep entered text."
- "Review all copy: remove any instruction to run or hurry; add the comfortable alternative to every physical task."
- "Check the mobile layout at 320px width: no horizontal scroll, session bar and primary action visible."

## 4. Archived Note: What a Generated Prototype Does Not Prove

A Figma Make prototype is a design and interaction prototype. Unless specifically built and tested, it does **not** provide:

- Working GPS or verified location
- Persistence across refresh or devices
- Multiplayer or squad synchronisation
- Secure data storage
- Verification that physical tasks happened

Record actual behaviour after testing with [08-TEST-PLAN-AND-ACCEPTANCE-CRITERIA.md](./08-TEST-PLAN-AND-ACCEPTANCE-CRITERIA.md).
