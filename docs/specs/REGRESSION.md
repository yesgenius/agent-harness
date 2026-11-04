# Regression run on fixtures

Before a release the agent goes through the scenarios itself, in a real browser, on fixture pages. A fixture stands in for an external service and behaves predictably, so a mismatch means an error on our side.

## What the run proves

That the product behaves by its rules on the fixtures. The run does not replace the manual check: a user's look at the result stays with a person.

## What the run does not prove

Anything about live services. No scenario opens a third-party page: on a live service a mismatch cannot be told apart from that page's behavior today. A live service is checked separately, in the browser lane, and the result is recorded as an observation, not as a norm.

## How to run

1. `npm run build`.
2. `npm run testserver` in the background. The default address is `http://127.0.0.1:4173/`.
3. For every row of the table, open the page, do what it says, read the status and the console.
4. Close the page before the next row: `docs/specs/BROWSER-LANE.md`.
5. Report: the table row, the norm, the observation, deviations in the language of behavior.

## Table format

A guard reads the table, so its format is normative. Four columns. "Fixture" holds, in backticks, the name of a page from the fixtures folder. "Norm" holds, in backticks, the id of the transition that owns the answer. Every page is used, and every terminal state of the model is reached by at least one scenario.

## Scenarios

| Scenario | Fixture | What the run does | Norm (owner of the answer) |
| --- | --- | --- | --- |
| Delivery proven | `delivered.html` | Press Send, wait for the status | Status `confirmed`, the text is in the feed, `reminder.delivery-confirmed` in the console |
| Accepted but not delivered | `swallowed.html` | Press Send, wait up to 7 seconds | Status `unconfirmed`, no success shown, `reminder.delivery-unproven` in the console |
| The provider refused | `refused.html` | Press Send | Status `failed`, `reminder.send-refused` in the console |
| Restart with an unknown outcome | `restarted.html` | Press Send | Status `duplicate-blocked`, the feed is empty, `reminder.duplicate-blocked` in the console |
