---
name: git-ship
description: Commit and push the current feature branch, merge it into main (squash or regular), sync main, and delete the merged remote feature branch. Use when the user says "git ship", "ship this branch", or "merge this into main".
disable-model-invocation: true
argument-hint: "[optional commit message hint]"
---

# git-ship

Ship the current feature branch: commit, push, merge into `main`, sync `main`, and delete the remote feature branch. Run every step in the terminal with `git` (and `gh` when a pull request route is needed).

Arguments (optional): `$ARGUMENTS` — a hint for the commit message.

**Authorization.** Invoking this skill authorizes: staging all changes, committing after the user approves the message, pushing the feature branch, merging after the user chooses the merge method, updating remote `main`, and deleting the merged remote feature branch.

**Never:** delete the local feature branch, force-push, discard/reset/stash changes, or bypass branch protection. If any step fails, leave the state as it is and explain exactly what was done and what remains.

Keep track of these values as you go: `ROOT`, `FEATURE`, `REMOTE`, `UPSTREAM` (e.g. `origin/01-foo`), `SHIPPED_SHA`, `MERGE_METHOD`, `COMMIT_MSG`.

## 1. Check the repository and branch

```bash
ROOT=$(git rev-parse --show-toplevel)
git -C "$ROOT" symbolic-ref --quiet --short HEAD   # fails => detached HEAD
git -C "$ROOT" rev-parse --abbrev-ref --symbolic-full-name @{u}   # fails => no upstream
```

- Detached HEAD, or the branch is `main` → refuse and stop.
- No upstream → stop and explain (suggest `git push -u <remote> <branch>`, but don't run it).
- Determine `REMOTE` as the remote that hosts `main` (normally `origin`: `git config branch.main.remote`, else `git ls-remote --heads <remote> main`). The upstream must be on that remote; if it is not, stop and explain.
- Unfinished operation → stop and explain:
  ```bash
  for p in MERGE_HEAD rebase-merge rebase-apply CHERRY_PICK_HEAD REVERT_HEAD; do
    f=$(git rev-parse --git-path "$p"); [ -e "$f" ] && echo "in progress: $p"
  done
  ```
- Read project instructions (`CLAUDE.md`, `.claude/CLAUDE.md`, `README.md`, `CONTRIBUTING.md`) for commit-message and merge conventions.

## 2. Review changes

From `ROOT`:

- `git status --porcelain=v1 --untracked-files=all`, `git diff --stat`, `git diff --cached --stat`.
- Read the actual diffs of modified files and skim new untracked files.
- Summarize for the user what will be committed (grouped by area).
- Look for apparent secrets or accidental files: `.env*`, keys/certs (`*.pem`, `*.key`, `id_rsa*`), tokens/passwords in diffs (`AKIA`, `sk-`, `ghp_`, `-----BEGIN`, `password=`, `secret`, `token`), large binaries, build output, `node_modules`, `.DS_Store`, editor/OS junk, debug dumps. If anything looks wrong, **pause** and ask the user with AskUserQuestion (e.g. continue / let me fix it first). Do not edit `.gitignore` or remove files unless the user says so.

## 3. Stage

```bash
cd "$ROOT" && git add .
git diff --cached --stat
git diff --cached
```

Inspect the complete staged diff, including anything that was already staged before.

## 4. Commit

- If `git diff --cached --quiet` succeeds (nothing staged), skip to step 5 and say so.
- Otherwise suggest `COMMIT_MSG` based on the staged diff, `$ARGUMENTS`, and repo conventions (check `git log --oneline -15` for style). Imperative subject ≤ ~72 chars, optional body explaining why.
- Ask with AskUserQuestion: accept, or one alternative; the user can type their own via "Other".
- Commit with the approved message, ending with the attribution trailer required by the current session (if any). Use a heredoc so formatting is preserved.

## 5. Push the feature branch

```bash
git push <REMOTE> HEAD:<upstream-branch-name>
SHIPPED_SHA=$(git rev-parse HEAD)
```

- If the push is rejected, inspect why (`git fetch <REMOTE>`, `git rev-list --left-right --count HEAD...<UPSTREAM>`, hook/protection messages) and report. **Never force-push.** Stop.
- Confirm `git rev-parse <UPSTREAM>` equals `SHIPPED_SHA` after fetching.

## 6. Choose the merge method

Ask with AskUserQuestion and wait for the answer:

- **Squash merge** — combine the feature changes into one commit on `main`.
- **Regular merge** — preserve the feature commits (merge commit).

## 7. Update `main`

```bash
git fetch --prune <REMOTE>
git switch main
git pull --ff-only <REMOTE> main
git rev-list --left-right --count main...<REMOTE>/main   # must be "0 0"
```

If the pull fails or local `main` has local-only commits (left count > 0), stop and explain; do not merge, rebase, or reset. The feature branch stays checked-out-able and pushed, so nothing is lost.

## 8. Merge

First confirm the remote feature branch is still exactly what was pushed: `git rev-parse <UPSTREAM>` == `SHIPPED_SHA`. If not, stop and explain.

**Check whether `main` requires a pull request.** If `gh` is available and authenticated:

```bash
gh api repos/{owner}/{repo}/rules/branches/main          # rulesets (pull_request rule)
gh api repos/{owner}/{repo}/branches/main/protection     # classic protection (404 = none)
```

Also treat a push rejection mentioning protected branch / GH006 / "changes must be made through a pull request" as "PR required".

### Direct route (no PR required)

- Squash: `git merge --squash SHIPPED_SHA`, then commit on `main` with a meaningful message (default: the feature's commit subject(s) summarized, plus `(#branch FEATURE)` context in the body). Ask the user to approve this message the same way as in step 4 if it differs from `COMMIT_MSG`.
- Regular: `git merge --no-ff SHIPPED_SHA -m "Merge branch 'FEATURE'"`.
- Conflicts: list them (`git diff --name-only --diff-filter=U`) and show the hunks. Resolve only where the intended result is clear; ask the user about anything ambiguous. If the user wants to stop, leave the merge in progress and explain how to continue or abort — do not abort on your own.

### Pull-request route (PR required)

- Create or reuse a PR: `gh pr view FEATURE` or `gh pr create --base main --head FEATURE --title "<COMMIT_MSG subject>" --body "<summary>"`.
- Merge with the chosen method, pinned to the shipped revision, **without** `--delete-branch` (that would delete the local branch):
  `gh pr merge FEATURE --squash|--merge --match-head-commit SHIPPED_SHA`
- If required checks/reviews block the merge, do not use `--admin`. Report the PR URL and what is pending, then stop.

## 9. Publish and verify `main`

- Direct route: `git push <REMOTE> main` (never force). If rejected, stop and explain.
- PR route: `git fetch <REMOTE>`, then `git switch main && git pull --ff-only <REMOTE> main`.
- Verify `git rev-parse main` == `git rev-parse <REMOTE>/main`.
- Verify the shipped work is in `main`:
  - Regular merge: `git merge-base --is-ancestor SHIPPED_SHA <REMOTE>/main`.
  - Squash merge: compare content, not ancestry — for the files the feature changed (`git diff --name-only <merge-base-before>..SHIPPED_SHA`), `git diff SHIPPED_SHA <REMOTE>/main -- <those files>` should be empty. If it isn't, explain whether the difference comes from other commits on `main` or from a missing change.

## 10. Delete the remote feature branch

Only if all are true:

- The merge succeeded (step 8/9).
- `<REMOTE>/main` includes the shipped work (step 9 verification).
- After `git fetch --prune <REMOTE>`, `<UPSTREAM>` still equals `SHIPPED_SHA` (it has not advanced).

Then: `git push <REMOTE> --delete <upstream-branch-name>`. Otherwise keep it and explain why. Never delete the local feature branch.

## 11. Report

Finish on local `main`, in sync with `<REMOTE>/main`. Report:

- Commit message (or "no new commit — nothing staged") and `SHIPPED_SHA`
- Merge method and route (direct / PR with URL)
- Resulting `main` commit and sync status (`git status -sb` first line)
- Whether the remote feature branch was deleted (and that the local one was kept)
