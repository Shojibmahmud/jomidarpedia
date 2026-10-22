---
name: new-spec
description: Turn the roadmap and current task into a clear, numbered feature specification in .claude/specs/ through a thorough "grill-me" interview before implementation. Use when the user says "new spec", "write a spec", or "spec this feature".
disable-model-invocation: true
argument-hint: "[feature or roadmap task, e.g. 1.3]"
---

# new-spec

Interview the user thoroughly, then write a Draft feature specification to `.claude/specs/NN-Feature-name.md`.

Arguments (optional): `$ARGUMENTS` — the feature or roadmap task to specify.

**Boundaries.** This skill interviews and writes the specification only. Do not implement code, create an implementation task list, modify the roadmap, commit, or push unless the user separately asks.

Keep a running ledger throughout (in your working notes, not in chat unless useful):

- **Confirmed** — decisions the user has explicitly agreed to.
- **Assumptions** — your recommendations or inferences not yet accepted.
- **Open** — questions still unanswered.

## 1. Gather context

- Find the repo root (`git rev-parse --show-toplevel`) and read project instructions: `CLAUDE.md`, `.claude/CLAUDE.md`, `README.md`, `CONTRIBUTING.md`.
- Find the roadmap (e.g. `*ROADMAP*.md`, `docs/`, `plans/`) and identify the current task: from `$ARGUMENTS`, the current branch name (e.g. `02-search-filters`), or the next unchecked roadmap item. Read the surrounding roadmap section, including dependencies and acceptance notes.
- Read existing specs in `.claude/specs/` so the new one is consistent and does not duplicate them.
- Inspect the code relevant to the feature to understand current behavior, data shapes, conventions, and constraints.
- If you cannot confidently identify the roadmap or task, ask the user for it before interviewing.

## 2. Grill-me interview

Open with a short statement of your understanding: the feature, who it is for, the intended outcome, and where it sits in the roadmap. Then interview in rounds:

- Ask **one to three related, focused questions per round** (use AskUserQuestion when the options are clear-cut, plain questions when open-ended). Let each answer shape the next round.
- Cover what is relevant among: the problem, target users, real use cases, scope and exclusions, expected behavior, permissions, data, integrations, failure cases, constraints, tradeoffs, and success criteria.
- Challenge vague answers, hidden assumptions, contradictions, and unnecessary complexity — respectfully. Ask for concrete examples and counterexamples ("what should happen when…?").
- Follow decisions to their consequences: once an approach is chosen, ask about its boundaries and what happens when it fails.
- When the user is unsure, lay out the options briefly, recommend a sensible default with its tradeoffs, and record it under **Assumptions** until they accept it.
- Answer from repository evidence whenever possible instead of asking; say what you found and where.
- Do not repeat resolved questions unless new information creates a conflict — then name the conflict explicitly.
- No fixed length: keep going until the important behavior, boundaries, and acceptance criteria are clear; skip irrelevant topics.
- If the user asks to stop and draft, do so, carrying all unresolved items into the spec as explicitly marked open questions or assumptions.

## 3. Confirm understanding

Determine the filename first (step 4), then present in one message:

- Agreed scope and explicit exclusions
- Key decisions (Confirmed)
- Assumptions awaiting acceptance
- Open questions
- Suggested filename

Ask the user to confirm or correct this summary and to accept or revise the filename. Never silently convert Open items or Assumptions into requirements.

## 4. Choose the filename

```bash
ROOT=$(git rev-parse --show-toplevel)
mkdir -p "$ROOT/.claude/specs"
ls "$ROOT/.claude/specs"
```

- Find filenames matching `^[0-9]+-`; next number = highest + 1, or `1` if none. Format with at least two digits (`printf '%02d'`): `01`, `10`, `100`.
- Name: `NN-Feature-name.md` — concise, descriptive, words joined by hyphens, first word capitalized, e.g. `01-Authentication-function.md`.
- Just before saving, recheck the directory: the number must still be unused and the file must not exist. Never overwrite an existing spec; if there is a collision, recompute and tell the user.

## 5. Write the specification

Use this structure, adapting depth to the feature (omit a section only if it truly does not apply, and say so briefly rather than dropping it silently where that would be confusing):

```markdown
# <Feature name>

**Status:** Draft
**Roadmap reference:** <roadmap file + section/task id>
**Source task:** <task text or link>
**Branch:** <current branch, if relevant>
**Date:** <today>

## 1. Problem and intended outcome
## 2. Scope
### In scope
### Out of scope
## 3. User journeys / use cases
## 4. Functional requirements
FR-1 … FR-n — each a precise, testable statement of behavior. Mark any that rest on an assumption: "(Assumption A-2)".
## 5. Non-functional requirements
NFR-1 … (performance, accessibility, security, privacy, i18n, reliability — only what is relevant)
## 6. Data, interfaces, and integrations
## 7. Edge cases and failure behavior
## 8. Acceptance criteria
AC-1 … AC-n — verifiable (Given/When/Then where helpful), each linked to the FR/NFR it verifies.
## 9. Dependencies, constraints, and assumptions
### Dependencies
### Constraints (cite repository evidence: file paths, existing patterns)
### Assumptions (A-1 …, not yet confirmed)
## 10. Key decisions and rationale
## 11. Open questions
```

Writing rules:

- Describe required behavior precisely enough to guide implementation and testing.
- Distinguish confirmed requirements from assumptions everywhere.
- Include technical constraints supported by the repository; avoid prescribing implementation details that aren't required.

## 6. Self-review

Before saving, check the draft for:

- Contradictions between sections or with earlier decisions
- Missing failure cases and edge cases
- Scope drift beyond what was agreed
- Acceptance criteria that cannot be verified, and FRs without any AC
- Assumptions presented as confirmed requirements

If this reveals a material gap, go back to the interview with targeted follow-up questions, then revise.

## 7. Save and report

- Save to `.claude/specs/NN-Feature-name.md` (after the collision recheck in step 4).
- Report the path, a short summary of scope, and the unresolved assumptions and open questions.
- Status stays **Draft**. Approving the interview summary is not approval of the spec. Change it to **Approved** only when the user explicitly approves the finished specification.
