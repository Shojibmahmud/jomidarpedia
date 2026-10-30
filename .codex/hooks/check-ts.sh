#!/bin/bash
# PostToolUse hook: after Claude edits a .ts/.tsx file, typecheck the project
# and lint that file. Problems go back to Claude (exit 2) so it fixes them
# straight away instead of leaving them for CI or the owner to find.

f=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')
case "$f" in *.ts|*.tsx) ;; *) exit 0 ;; esac
root=${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}
case "$f" in "$root"/node_modules/*|"$root"/.next/*|"$root"/out/*) exit 0 ;; "$root"/*) ;; *) exit 0 ;; esac
cd "$root" || exit 0

problems=""
if ! tsc_out=$(npx tsc --noEmit 2>&1); then
  problems+=$'Typecheck failed (npx tsc --noEmit):\n'"$(head -30 <<<"$tsc_out")"$'\n'
fi
if ! lint_out=$(npx eslint --quiet "$f" 2>&1); then
  problems+=$'ESLint failed for '"${f#"$root"/}"$':\n'"$(head -30 <<<"$lint_out")"$'\n'
fi

if [[ -n "$problems" ]]; then
  printf '%s' "$problems" >&2
  exit 2
fi
exit 0
