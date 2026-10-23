---
name: git-start
description: Prepare an up-to-date, numbered feature branch (NN-short-name) from main before starting Spec Driven Development. Use when the user says "git start", "start a new branch", or "set up a branch for this session".
disable-model-invocation: true
argument-hint: "[optional short branch description]"
---

# git-start

Prepare an up-to-date, numbered feature branch off `main` so specification work can begin. Run every step in the terminal with `git`. Stop and ask whenever a step below says so — never guess on anything destructive.

Arguments (optional): `$ARGUMENTS` — a short description of the work, used to suggest the branch name.

## 1. Inspect the repository

- `git rev-parse --show-toplevel` — confirm this is a git repo; if not, stop and say so.
- `git status` and `git branch --show-current` — note the current branch.
- Read the project instructions if present (`AGENTS.md`, `.Codex/AGENTS.md`, `README.md`, `CONTRIBUTING.md`). If they define branch conventions that conflict with this skill, follow them and mention it.

## 2. Check for unfinished work

- `git status --porcelain` — any output means uncommitted or untracked changes.
- Check for an in-progress operation; each of these paths existing means one is underway:
  ```bash
  for p in MERGE_HEAD rebase-merge rebase-apply CHERRY_PICK_HEAD REVERT_HEAD; do
    f=$(git rev-parse --git-path "$p"); [ -e "$f" ] && echo "in progress: $p"
  done
  ```
- If anything is found: explain what you found (list the files or the operation) and ask the user how to proceed with AskUserQuestion. **Never discard, commit, stash, reset, or abort anything on your own.** Only continue once the user has resolved it or explicitly tells you what to do.

## 3. Identify the remote

- `git remote -v`, then for each remote `git ls-remote --heads <remote> main`.
- Use `origin` if it has a `main` branch. If `origin` lacks `main` and exactly one other remote has it, use that one and say so. If several remotes have `main` and none is `origin`, or no remote has `main`, ask the user.

## 4. Update `main`

```bash
git fetch --prune <remote>
```

- If local `main` exists: `git switch main`, then `git pull --ff-only <remote> main`.
- If local `main` does not exist: `git switch -c main --track <remote>/main`.
- If the fast-forward fails because the branches have diverged, stop. Explain the situation, showing `git rev-list --left-right --count main...<remote>/main` (local-only vs remote-only commits) and `git log --oneline main...<remote>/main`. Do not merge, rebase, or reset — let the user decide.

## 5. Determine the next branch number

- Collect branch names: `git branch --format='%(refname:short)'` and `git branch -r --format='%(refname:short)'` (strip the `<remote>/` prefix from remote names).
- Find names matching `^[0-9]+-` and take the highest number. Next number = highest + 1, or `1` if none exist.
- Format with at least two digits: `printf '%02d' <n>` → `01`, `09`, `10`, `100`.

## 6. Suggest a branch name

Build a short, descriptive slug (about 2–5 words) in lowercase kebab-case (`a-z`, `0-9`, single hyphens, no leading/trailing hyphen). Source, in priority order:

1. `$ARGUMENTS`, if provided.
2. The current session title, if one is shown in the conversation context and is relevant to the work.
3. The task the user has described in the conversation.
4. If there is not enough context, ask the user what this session will accomplish.

## 7. Confirm the name

Present the complete name, e.g. `01-git-setup`, with AskUserQuestion: offer to accept it, plus one or two alternative slugs; the user can type their own via "Other". Normalize any revision to kebab-case. Keep the computed number unless the user explicitly provides a different one.

## 8. Create the branch

- Re-check for collisions immediately before creating: the exact name must not exist locally or on the remote, and the number must not already be used by another branch (re-run step 5's listing). If there is a collision, recompute and confirm again with the user.
- `git switch -c <name> main`

## 9. Report

- Branch name: `git branch --show-current`
- Base commit: `git log -1 --format='%h %s' main`
- State that the repository is ready for specification work.

## Scope

Prepare the branch only. Do not begin implementation, generate specifications, push the branch, or create pull requests unless the user separately requests it.
