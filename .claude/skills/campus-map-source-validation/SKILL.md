---
name: campus-map-source-validation
description: "Validate campus destinations, labels, map modes, mission placements and any geographic claim against the official FLAME University Campus Map 2025, and detect invented coordinates, distances or routes. Use whenever the map spec, destination data or map art changes."
---

# Campus Map Source Validation

## When to use
`docs/03`, destination data, mission placement or map art changes; before claiming the map is "recognisably based on" the official map (AC4).

## Required inputs
Official map: https://www.flame.edu.in/images/events/orientation/FLAME-University-Campus-Map-2025.jpg; `docs/03` §3 register.

## Procedure
1. **Access check:** attempt to view the official image. If you can only fetch it and cannot actually see the image, every "Verified on official map" must stay **To be verified**. Record what was attempted.
2. **Register check:** each of D1–D9 has the exact name, label, verification status (with who, when and what was seen), and GPS = "Not collected" unless a field record exists.
3. **Invention scan:** `grep -rnE "[0-9]{1,3}\.[0-9]{3,}|[0-9]+ ?(m|km|metres|meters|minutes walk)" docs <code dirs>`. Every coordinate, distance or walking time needs a measurement source, or it is a defect.
4. **Mode labelling:** the illustrative mode always shows "Illustrated map, not to scale". No player marker unless calibrated mode plus permission plus fresh reading plus accuracy shown.
5. **Placements:** mission↔destination assignments are Proposed/suggested only (Q12, SRC-03). Each needs a safety and access note. No mission requires being at a destination.
6. **Rights:** Q10 is unresolved, so any use of the image itself in the game is flagged.

## Validation checklist
- [ ] No invented geography
- [ ] Verification claims have records
- [ ] Mode label present for every mode

## Failure cases
Image inaccessible (NOT RUN, keep "To be verified"); a destination is not visible on the map (log an OPEN-QUESTION and do not relocate it by guess).

## Ask for clarification when
A destination name differs from the map; a placement needs a safety judgement; rights are unclear.

## Completion report
Return: what was checked, results with citations, files changed (or none), commands run with their actual output, items `NOT RUN` and why, open questions raised.
