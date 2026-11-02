# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues in `luiqor/rivtuber`. Use the `gh` CLI for all operations.

## Conventions

- **Spec**: one issue per feature, titled `Spec: <feature>`, with the spec in the body
- **Implementation issues**: one issue per ticket, each linking back to the spec issue (`Part of #<spec>`)
- **Triage state**: recorded as GitHub labels (see `triage-labels.md` for the role strings)
- **Comments and conversation history**: GitHub issue comments

## When a skill says "publish to the issue tracker"

Create a GitHub issue with `gh issue create --title ... --body ...`.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`. The user will normally pass the issue number or URL.

## Wayfinding operations

Used by `/wayfinder`. The **map** is an issue with one **child** issue per ticket.

- **Map**: an issue titled `Map: <effort>` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: an issue with the question in the body, linked from the map as a sub-issue or task-list item. Type is recorded as a label (`research`/`prototype`/`grilling`/`task`); state is recorded as a label `claimed`, or closed once resolved.
- **Blocking**: a `Blocked by: #N, #N` line near the top of the body. A ticket is unblocked when every issue it lists is closed.
- **Frontier**: `gh issue list --state open` for issues that are unblocked and not labelled `claimed`; lowest number wins.
- **Claim**: add the `claimed` label (`gh issue edit <n> --add-label claimed`) before any work.
- **Resolve**: post the answer as a comment under an `## Answer` heading, close the issue, then append a context pointer (gist + link) to the map issue's Decisions-so-far.
