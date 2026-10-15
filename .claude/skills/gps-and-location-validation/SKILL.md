---
name: gps-and-location-validation
description: "Validate location and movement design or code: opt-in permission at point of use, foreground-only, denied/unavailable/unsupported/timeout/stale/low-accuracy states, device vs manual vs simulated data provenance, calibration honesty, and that proximity never proves social interaction. Use whenever geolocation, movement or the player marker is touched."
---

# GPS and Location Validation

## When to use
Any doc or code involving geolocation, movement estimates, the player marker or calibration.

## Required inputs
`docs/03` §8–11, `docs/06` §11, `docs/07` §3, D8–D10, Q2; code if present.

## Procedure
1. **Necessity:** state which feature needs location and why. If none needs it, recommend omitting it (Q2) and stop.
2. **Permission flow:** location is never requested on load (`grep -rn "geolocation" <code>`, and check call sites happen after a user action), there is an explanation before the browser prompt, and play is possible after denial.
3. **State table:** granted, denied, unsupported, unavailable, timeout, stale, low accuracy, page hidden. For each, record UI behaviour and copy, plus the original requirements (SRC-07: label unverified, offer retry).
4. **Provenance:** every value is tagged `device` / `manual` / `simulated`. Search for hard-coded positions or default coordinates. Any found must be labelled simulated and never shown as the player.
5. **Foreground-only:** watching stops on pause, session end and `visibilitychange` hidden.
6. **Accuracy:** readings show accuracy. No building-level claims. Calibration is "Not started" unless field records exist.
7. **Social:** confirm no code path uses distance or proximity for Missing Connection (D9).
8. **Tests:** run or specify T-LOC-01…06 with a mocked geolocation, labelled as mocks.

## Validation checklist
- [ ] No load-time prompt
- [ ] Every state handled
- [ ] No unlabeled simulated or default position
- [ ] Proximity never used as proof

## Failure cases
Can't test on a real device (NOT RUN, and say only mocks were used); background behaviour varies by browser (document it, don't assume).

## Ask for clarification when
Anything would store or transmit location, run in the background, or need calibration fieldwork.

## Completion report
Return: what was checked, results with citations, files changed (or none), commands run with their actual output, items `NOT RUN` and why, open questions raised.
