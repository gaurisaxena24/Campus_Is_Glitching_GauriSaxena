---
name: test-and-regression-review
description: "Plan, trace and run tests: map acceptance criteria and rules to test IDs in docs/08, add missing cases, run automated and manual tests on the real app at phone and MacBook sizes, record results with evidence, and run the regression suite. Use after any feature change, bug fix or before marking work VERIFIED."
---

# Test and Regression Review

## When to use
After a feature or fix; before a VERIFIED status; before submission.

## Required inputs
`docs/08`; changed files; test commands (from the manifest) if code exists.

## Procedure
1. **Traceability:** build a matrix of AC1–AC7 and rules R1–R12 → test IDs. List untested requirements, including D18 viewport tests and approved SRC items.
2. **Gap tests:** propose new IDs in the existing series (T-MIS, T-STA, T-TOK, T-TIM, T-PER, T-VAL, T-MAP, T-LOC, T-HON, T-ERR, T-ACC, T-RES, T-DL; add T-VPT for viewport) with steps and expected results.
3. **Automated run** (if code exists): run the project's test command(s) exactly and capture full output and exit code. Never summarise a failing run as passing.
4. **Manual run on the real app:** at phone viewport (e.g. 390×844) and MacBook window (e.g. 1440×900). Record date, browser, viewport, steps executed and observed result.
5. **Record:** update the `docs/08` Result column only for tests actually run (if you own `docs/08` in this task). Otherwise return the results to the Super Agent. Use `Not run` · `Pass` · `Fail` · `Blocked` · `N/A`.
6. **Regression:** run the `docs/08` §18 suite after significant changes.
7. **Bugs:** add failures to the `docs/08` Bug Log with severity.

## Validation checklist
- [ ] Every result has date, environment and evidence
- [ ] No Pass without execution
- [ ] Regression suite run, or explicitly NOT RUN

## Failure cases
No app exists (all execution NOT RUN; planning only); flaky tests (report the flakiness and don't retry until green silently).

## Ask for clarification when
A failing test implies a spec change rather than a bug.

## Completion report
Return: what was checked, results with citations, files changed (or none), commands run with their actual output, items `NOT RUN` and why, open questions raised.
