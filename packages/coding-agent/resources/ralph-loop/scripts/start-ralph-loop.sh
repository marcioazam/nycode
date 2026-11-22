#!/usr/bin/env bash
# Starts a Ralph loop from raw, untrusted command text.
#
# The command used to paste $ARGUMENTS unquoted into the shell block, so a prompt containing `<promise>DONE</promise>`
# became a redirection, and `;`, an apostrophe or `$(...)` broke the line or ran code. The command now hands the text
# to this script through a heredoc with a quoted delimiter (the shell never expands it). Here it is split into words
# with shlex (quotes respected) and passed to setup-ralph-loop.sh as plain arguments, never through a shell.
#
# Usage: start-ralph-loop.sh [session-id] < raw-arguments
#   session-id: optional; defaults to $CLAUDE_CODE_SESSION_ID.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export CLAUDE_CODE_SESSION_ID="${1:-${CLAUDE_CODE_SESSION_ID:-}}"
raw="$(cat)"
args=()
while IFS= read -r -d '' word; do args+=("$word"); done < <(
  RALPH_RAW="$raw" python3 -c '
import os, shlex, sys
raw = os.environ["RALPH_RAW"]
try:
    words = shlex.split(raw)
except ValueError:  # unbalanced quote (e.g. an apostrophe in the text): split on whitespace
    words = raw.split()
for w in words:
    sys.stdout.write(w + "\0")
'
)
# ${args[@]+...}: an empty array is an unbound variable under `set -u` in bash < 4.4.
exec "$here/setup-ralph-loop.sh" ${args[@]+"${args[@]}"}
