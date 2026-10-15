# 12. Device Features: Camera, Motion, GPS, Episodes and Pattern Puzzles

**Status:** Implemented (code in `src/js/`), unit-tested and browser-tested in headless Chrome. **Not yet tested on a real phone.**
**Last updated:** 11 October 2026
**Related:** [02 Game Design](./02-GAME-DESIGN-DOCUMENT.md) · [06 Technical Spec](./06-TECHNICAL-IMPLEMENTATION-SPECIFICATION.md) · [07 Privacy and Safety](./07-PRIVACY-AND-SAFETY-GUIDELINES.md) · [08 Test Plan](./08-TEST-PLAN-AND-ACCEPTANCE-CRITERIA.md)

This document records how the four device-backed features work, what each device needs, what data is kept, and how to test them by hand. Labels follow [00](./00-DOCUMENTATION-INDEX.md): **Implemented** means code exists and automated tests pass; nothing here is claimed to work on a real phone until it has been tried on one.

---

## 1. Summary

| Feature | Mission part | Engine | External API | Status |
| --- | --- | --- | --- | --- |
| Colour hunt (camera or upload, colour checked from pixels) | Lost Colour: physical | Local, `game/colour.js` | None | Implemented |
| Pattern restore (two rounds) | Lost Colour: digital | Local, `game/pattern.js` | None | Implemented |
| Walk tracking (estimated steps + GPS distance) | Frozen Character: physical | Local, `game/steps.js`, `game/tracking.js` | None | Implemented |
| Conversation episode (five messages) | Missing Connection: digital | **Scripted story engine (no AI)**, `game/conversation.js` | None | Implemented |

No language model, cloud vision service, server or API key is used anywhere. Nothing needs setting up beyond `npm start`.

Each feature completes **only its own objective**. The photo hunt never completes the pattern puzzle and vice versa. The conversation episode never completes the physical Missing Connection task, and that task never requires the episode.

## 2. Device and browser requirements

All three device APIs (camera, motion, location) are only available to pages served from a **secure context**: `https://…` or `http://localhost`. This is a browser rule, not a game choice.

| Capability | MacBook (Chrome/Safari, `localhost`) | Phone over `https` | Phone over plain `http://<laptop-ip>` |
| --- | --- | --- | --- |
| Live camera preview (`getUserMedia`) | Works with the built-in webcam | Expected to work (rear camera preferred) | **Blocked.** The game falls back to the file picker, which on most phones still offers "Take photo" |
| Upload a photo from files/gallery | Works | Works | Works |
| Motion sensor (`DeviceMotionEvent`) | No accelerometer: shows "unavailable"; GPS rule is used | Expected to work. iOS asks for permission when the player taps Start | **Blocked** in current browsers |
| Location (`watchPosition`) | Wi-Fi-based, often low accuracy | Expected to work | **Blocked**; the game says so |
| Pattern puzzle, conversation episode | Works | Works | Works |

To try the device features on a phone, the game must be served over HTTPS (for example a static host or an HTTPS tunnel). **Deploying or publishing needs the owner's approval** (`CLAUDE.md`), so this has not been done.

There is **no step-counting API on the web.** Android's step counter and Apple's pedometer (Core Motion / HealthKit) are only available to native apps. The game therefore never shows "device-reported" steps; every step figure is labelled *estimated*. A native wrapper would be needed for measured steps.

## 3. Lost Colour: colour hunt (physical)

**Flow:** the target colour is chosen per session from the mission configuration (`data/missions.js`, `physical.targets`: blue, red, yellow, green, purple; `physical.count`: 5). The player opens the camera or uploads a photo, previews it, and sees a swatch, the detected colour name, a confidence figure and pass/fail. They can retake, replace, or tap the object in the photo to analyse just that region. A pass fills one of five slots, plays a sound (if sound is on), animates the slot and adds the swatch to **Inventory → Field finds**.

**How the colour is judged** (thresholds in `COLOUR_RULES`):

1. Pixels are sampled inside a circular region (default: centre, radius 45% of the short side; or around the point the player taps). Centre pixels weigh more, so the background and frame edges count less.
2. Blown highlights and deep shadows are dropped (unless almost everything would be dropped, as with a genuinely white or black object).
3. Small deterministic k-means (k = 4) in **CIELAB**; clusters are named by OKLCh hue/chroma and same-named clusters are added together, so a shaded blue object still counts as one blue share.
4. The dominant colour must hold at least 35% of the weighted share **and** reach 40% confidence. Otherwise the result is "This looks closer to teal" (wrong colour) or "We couldn't confidently identify the colour" (uncertain). Half-and-half photos come out uncertain until the player taps the object.

No white-balance correction is applied: grey-world correction assumes the scene averages to grey, which is false when the player fills the frame with one colour.

**Duplicates:** each photo gets a perceptual hash with two parts: a 64-bit difference hash (structure) and a 4×4 grid of mean CIELAB values (colour layout). A photo is flagged as *likely already added* when **both** match an earlier photo (structure within 10 of 64 bits **and** mean layout difference ≤ 12 ΔE), or when the colour layout alone is near-identical (≤ 3 ΔE, which catches re-encoded flat photos whose structure bits are ties). These thresholds are an **Assumption** tuned on synthetic images; they should be re-tuned with real campus photos. A side effect: two different objects of very similar colour, photographed against the same plain background, may be refused as duplicates. The colour layout was added on 11 Oct 2026 because low-texture photos (one plain object filling the frame) all produce nearly identical structure hashes. The reducer repeats the duplicate and colour checks, so the UI cannot grant progress the rules would refuse.

**Never awarded:** a wrong colour, an uncertain result, a likely duplicate, or a sixth item.

## 4. Lost Colour: pattern restore (digital)

Exactly two rounds per playthrough. Each round is generated from a seed, and **the generated sequence, its rule and its verified solution are stored in the session**. Answers are checked against the stored solution, never against a hard-coded answer. The generator only keeps puzzles whose gaps have exactly one valid answer under the rule (`countSolutions`).

| Round | Rule families (one is picked) |
| --- | --- |
| 1: Learn the pattern | Taking turns (alternating) · Group of three (repeating group) · Growing runs (1, 2, 3, 4…) |
| 2: Apply a harder rule | Two patterns woven together (interleave) · Mirror · Rotating groups · Growing group |

The player taps tiles to fill the gaps (Undo, Reset, Check pattern). Mistakes get a short rule-specific explanation and count as an attempt. Each cleared round gives a level-up animation, a sound and **+15 XP once**: the reward key is per session and round, so replays and reloads never repeat it. Clearing round 2 completes the digital objective only.

Tiles carry a symbol and a name as well as a colour, so the puzzle never depends on colour vision alone.

## 5. Frozen Character: walk tracking (physical)

**Target (shown before starting):** at least **2:00 of tracked (not paused) time**, plus either

- **150 estimated steps** when the motion sensor is delivering data (`stepTarget` in `data/missions.js`), or
- **60 m of filtered GPS distance** from at least 5 good readings when there is no motion data.

Elapsed time alone never completes the walk (test `GPS-SHORT`).

**Estimated steps** (`game/steps.js`): orientation-independent acceleration magnitude, fast and slow low-pass filters, a peak must rise ≥ 1.0 m/s² above baseline, cadence must be plausible (285–1430 ms between steps) and regular (±30%), and nothing counts until 6 rhythmic peaks in a row confirm walking. Spikes (drops, shakes) mute detection for 1 s. A gap of more than 2 s in samples restarts the rhythm, so it is never bridged.

**GPS distance** (`game/tracking.js`): readings worse than ±35 m, older than 15 s, or implying more than 7 m/s are ignored. Moves inside the noise radius (≥ 8 m or the readings' accuracy) are treated as drift. Pausing, stopping or reloading clears the anchor, so distance is never counted across a gap.

**Controls:** Start, Pause, Resume, Stop, Finish. The live panel shows tracked time, steps (labelled *estimated*), GPS distance (labelled *estimate*), moving time, GPS status with accuracy, and progress bars toward the target. A walk bar keeps tracking visible when the player changes tab. If both sensors are unavailable or refused, the game says exactly which one is missing and offers only a clearly labelled self-reported walk.

**Permissions** are requested only when the player taps Start on this mission, after an explanation of what each sensor is used for. Sensor listeners and the GPS watcher are removed on pause, stop, finish and when the page is hidden; reload restores the walk **paused**, with no watcher until the player resumes.

## 6. Missing Connection: conversation episode (digital)

Three fictional episodes, each with its own character, personality, mood and setting: *The Quiet Sketcher* (Ira), *After the Club Meeting* and *Not Your Kind of Night*. The player sends **exactly five messages**, choosing a suggested line or writing their own (up to 200 characters). After each message the character replies with typing animation.

**Engine:** a local, rule-based **scripted story engine**, labelled "Scripted story engine (no AI)" in the UI. It analyses each message (greeting, question, warmth, empathy, word overlap with the character's last line, dismissive language) and chooses a reply from a hand-written bank. It tracks the character's mood and what has been discussed, so replies depend on what the player actually wrote. It is deterministic and never calls a network service, so there is no network-failure state to handle. The episode in progress is saved after every message and survives reload.

**Evaluation** after the fifth message: Friendliness, Curiosity, Responsiveness, Empathy and Flow, each 0–3 (total out of 15), scored across the whole conversation. Results show one quoted example of something the player did well, one suggestion for next time, a rank (Spark, Friendly Wave, Bridge Builder, Kindred Spirit), and a replay option. Wording is encouraging and about the conversation, never about the player's personality.

## 7. Privacy behaviour

| Data | Where it lives | Kept |
| --- | --- | --- |
| Photos | An in-memory canvas while being checked | **Never saved or uploaded.** Dropped after the check. Only the hash, swatch hex, colour name and confidence are saved (`campus-glitching:session:v1`, test `S-COLOUR` asserts no `data:image`) |
| Raw accelerometer samples | Memory only | Never saved; only the step total |
| GPS coordinates | Memory only; the live position is shown on screen while walking | **Never saved.** Only distance, tracked time and moving time are saved (test "saved summaries contain no coordinates") |
| Conversation messages | Browser localStorage, this device | Kept with the session so the episode survives reload. Episodes are fictional; the player is never asked to name or describe a real person |

Nothing is sent to any server. The game has no backend.

## 8. Known limitations

- **Not yet tried on a real phone.** All browser testing used headless Chrome with emulated camera, location and motion events.
- Colour detection is a heuristic. Warm indoor light, coloured shade and screens shift what a camera records; results are shown as "looks like", never as proof.
- Duplicate detection catches the same photo re-uploaded or re-exposed. It cannot reliably tell that a *new* photo shows the same object from a different angle on a different background.
- Steps are estimates and can under-count (phone in a loose bag) or, rarely, over-count rhythmic non-walking motion. Step thresholds were tuned on synthetic data, not on recorded phone walks.
- GPS distance usually under-counts because of drift filtering, and can be poor indoors.
- The conversation engine is keyword- and overlap-based. Unusual phrasing, sarcasm or very short replies may be misread.

## 9. Manual test instructions

Run `npm start` and open <http://localhost:5173>. For phone tests, serve over HTTPS first (see §2).

| ID | Steps | Expected |
| --- | --- | --- |
| M-CAM-1 | Lost Colour → Colour hunt → Open camera; refuse permission | Plain "Camera access was refused" message; Upload still works |
| M-CAM-2 | Allow camera; photograph an object of the target colour filling most of the frame | Swatch, colour name, confidence, "pass"; Add fills one slot with an animation |
| M-CAM-3 | Photograph something clearly another colour | "This looks closer to …"; Add is disabled; no slot filled |
| M-CAM-4 | Upload the same photo twice | Second time: "Looks like a photo you already added" |
| M-CAM-5 | Photo with two large competing colours | Uncertain; tapping the target object re-analyses that region |
| M-PAT-1 | Lost Colour → Pattern restore; submit a wrong answer | Short explanation; attempts +1; no reward |
| M-PAT-2 | Solve round 1, reload, reopen | Round 2 shown; XP not repeated |
| M-WALK-1 | Phone: Frozen Character → Walk it off → Start, refuse motion and location | Each refusal named; only "Walk without GPS (self-reported)" offered |
| M-WALK-2 | Phone: allow both; stand still for 2 minutes | Steps stay at or near 0; GPS drift adds little or no distance; Finish stays disabled |
| M-WALK-3 | Walk normally for 2+ minutes with pauses | Steps rise only while walking and tracking; pause freezes all figures; Finish enables once the target is met |
| M-WALK-4 | Start a walk, switch tab, return; then reload | Walk bar while away; after reload the walk is paused with its totals kept |
| M-EP-1 | Missing Connection → Conversation; send five messages | Replies refer to what you wrote; no sixth message; results with dimensions, example, suggestion, rank |
| M-EP-2 | Reload mid-episode | Same messages restored; continue from the same point |
| M-A11Y-1 | Turn on Reduced motion (Status → Settings, or the OS setting); play a pattern round | No confetti or bouncing; feedback still shown |
| M-A11Y-2 | VoiceOver/keyboard through the hunt, pattern and episode screens | Every control reachable and named; results announced |

Automated coverage: `npm test` (unit: colour analysis, duplicates, step filtering, GPS distance, conversation evaluation, puzzle generation/validation, reward idempotency) and `npm run e2e` (journeys `S-COLOUR`, `S-PATTERN`, `S-SOCIAL`, `GPS-*`, `JOURNAL`).
