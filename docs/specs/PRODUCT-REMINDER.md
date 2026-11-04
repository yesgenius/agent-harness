# The example's product: a reminder

The description of the product in `example/`. The example is made up, but this is a real specification of its code. It answers the five questions of the first step of moving the harness, from `docs/SKELETON.md`. The description of your own product will look like this.

## What it does and for whom

The user writes the text of a reminder and presses Send. The product sends the reminder through an external provider and shows only what is proven:

| Status | When |
| --- | --- |
| `confirmed` | The text appeared in the provider's delivery feed |
| `unconfirmed` | The provider accepted the reminder, but delivery could not be proven within the allotted time (`PROOF_TIMEOUT_MS` in `example/src/constants.js`) |
| `failed` | The provider refused or is not found in the configuration |
| `duplicate-blocked` | The intent to send this reminder is already recorded. It may already have left, so it does not leave a second time |

Success without proof is not shown: a reminder the provider accepted is not yet delivered.

## What cannot be undone

The send. A reminder that left cannot be recalled, so before the send the product records the intent. If a record already exists, the reminder does not leave a second time. For this to protect against a restart between the record and the send as well, the journal must keep the record where it survives a restart. The example has no such storage: the journal is a dependency passed into `example/src/dispatch.js`. On the fixture pages the journal lives in the page's memory, and a restart is represented by a record made in advance (`restarted.html`). This checks the reaction to an intent already recorded, not that the record survives. The order of the steps and their log tags are set by the process model: `docs/specs/PROCESS-REMINDER.md`.

## Which external services it relies on

One provider. Its name and address are written only in `example/config/providers.json`. Code, tests and specifications do not contain the provider's name: a service changes its behavior without warning, and a description that names it goes stale silently.

## What must not change without the owner

| Promise | What holds it |
| --- | --- |
| The intent is recorded before the send | Guard `no-reminder-leaves-before-the-intent-is-recorded` |
| Success is shown only after delivery is proven | An ordinary test in `example/tests/dispatch.test.js`. Breaking the promise fails that test, so no separate guard is needed |
| A fixed provider configuration reaches the user within an hour | Guard `a-published-provider-fix-reaches-a-user-within-an-hour` holds the part of the promise that is in the code: a refresh period of at most an hour and the "time to refresh" decision. The example has no program that refreshes (last section) |
| The provider's name lives only in its configuration | Guard `no-provider-name-outlives-the-provider-config`: it looks for the provider's name and identifier |

The guards' rules are listed in `docs/specs/GUARDS.md`.

## How a new version reaches users

It does not: the example is released only as part of the template and has no users of its own. The code holds only the decision of when it is time to refresh the provider configuration (`example/src/provider-config.js`). The example has no program that refreshes it.
