#!/usr/bin/env bash
# Link Claude Code's auto-memory directory for THIS repo to .claude/memory, so the
# memory files live in the repo (visible in VS Code, git-tracked) instead of hidden
# under ~/.claude/projects/<slug>/memory. Same pattern as claude-config-MHUB.
#
# Windows (Git Bash): creates a directory junction (no admin needed).
# macOS/Linux:        creates a symlink.
#
# Usage: bash .claude/scripts/link-memory.sh          # link (idempotent)
#        bash .claude/scripts/link-memory.sh --check  # report only
set -u

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET="$REPO/.claude/memory"
CHECK=0; [ "${1:-}" = "--check" ] && CHECK=1

# Claude Code's project slug = absolute path with every / \ : replaced by '-'.
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    WIN_REPO="$(cd "$REPO" && pwd -W)"                 # C:/Users/kamek/Documents/niaga-labs/trading-bot
    SLUG="$(printf '%s' "$WIN_REPO" | sed -e 's#[/\\:]#-#g')"   # C--Users-kamek-Documents-niaga-labs-trading-bot
    IS_WIN=1 ;;
  *)
    SLUG="$(printf '%s' "$REPO" | sed -e 's#/#-#g')"   # -Users-x-Documents-trading-bot
    IS_WIN=0 ;;
esac

PROJ_DIR="$HOME/.claude/projects/$SLUG"
LINK="$PROJ_DIR/memory"

echo "repo:    $REPO"
echo "slug:    $SLUG"
echo "link:    $LINK"
echo "target:  $TARGET"

# Same absolute path, compared case-insensitively on Windows (paths there are case-insensitive; a junction's
# .Target and $TARGET can differ only in case and still be the same folder).
same_path() {
  if [ "$IS_WIN" = 1 ]; then
    local a b
    a="$(cygpath -w "$1" 2>/dev/null | tr '[:upper:]' '[:lower:]')"
    b="$(cygpath -w "$2" 2>/dev/null | tr '[:upper:]' '[:lower:]')"
    [ -n "$a" ] && [ "$a" = "$b" ]
  else
    [ "$1" = "$2" ]
  fi
}

# HQ-102: reports whether $LINK is currently a junction/symlink, and if so, what it resolves to.
# Sets LINK_KIND (junction|symlink) and LINK_TARGET on success (exit 0). A plain directory, a plain
# file, or nothing at all all fail this (exit 1) — the caller tells those apart itself when it needs to.
read_link() {
  LINK_KIND=""; LINK_TARGET=""
  if [ "$IS_WIN" = 1 ]; then
    # Get-Item -Force on a reparse point reports LinkType/Target straight from the reparse data, even
    # when the target no longer exists — that is exactly the dangling case this fixes, so this must
    # NOT be gated on `[ -d "$LINK" ]` first (a dangling junction still passes -d on this laptop, which
    # is the bug: a resolved-but-missing target reported no differently from a resolved, existing one).
    local out
    out="$(powershell.exe -NoProfile -Command \
      "\$i = Get-Item -LiteralPath '$(cygpath -w "$LINK")' -Force -ErrorAction SilentlyContinue; if (\$i -and \$i.LinkType -eq 'Junction') { 'JUNCTION|' + \$i.Target }" \
      2>/dev/null | tr -d '\r')"
    case "$out" in
      JUNCTION\|*)   # the \| escapes the pipe so it is literal text here, not a case-pattern separator
                     # (unescaped, '*' alone would match everything, including a non-junction $out)
        LINK_KIND="junction"
        LINK_TARGET="$(cygpath -u "${out#JUNCTION|}" 2>/dev/null)"
        [ -n "$LINK_TARGET" ] || LINK_TARGET="${out#JUNCTION|}"
        return 0 ;;
      *) return 1 ;;
    esac
  else
    [ -L "$LINK" ] || return 1
    LINK_KIND="symlink"
    LINK_TARGET="$(readlink "$LINK")"
    return 0
  fi
}

if read_link; then
  if [ -n "$LINK_TARGET" ] && [ -d "$LINK_TARGET" ] && same_path "$LINK_TARGET" "$TARGET"; then
    echo "status:  already linked ✓"
    exit 0
  fi
  if [ -z "$LINK_TARGET" ]; then
    echo "status:  points at <unreadable>, expected $TARGET"
  elif [ ! -d "$LINK_TARGET" ]; then
    # Same wording either way ("points at X, expected Y") so a script parsing this can rely on it, but
    # named as missing rather than mismatched — "points at X, expected X" read as a no-op otherwise.
    echo "status:  points at $LINK_TARGET (target no longer exists), expected $TARGET"
  else
    echo "status:  points at $LINK_TARGET, expected $TARGET"
  fi
  if [ "$CHECK" = 1 ]; then
    exit 1
  fi
  # Remove the stale link ONLY — never recurse into it, so its old target (if it still exists) is
  # never touched. `cmd /c rmdir` on a junction removes the reparse point itself, never the target
  # (same primitive test-hooks.sh already relies on). PowerShell's Remove-Item is deliberately not
  # used here: it throws "Object reference not set to an instance of an object" removing a junction
  # whose target still exists (measured on this laptop's PowerShell 5.1) — it works for a dangling
  # one and fails for exactly the other half of this bug's own test cases.
  echo "fixing:  removing the stale $LINK_KIND (its old target, if any, is left untouched)"
  if [ "$IS_WIN" = 1 ]; then
    MSYS_NO_PATHCONV=1 cmd /c rmdir "$(cygpath -w "$LINK")" \
      || { echo "could not remove $LINK"; exit 1; }
  else
    rm "$LINK" || { echo "could not remove $LINK"; exit 1; }
  fi
elif [ "$CHECK" = 1 ]; then
  echo "status:  NOT linked (run without --check to create)"
  exit 1
fi

mkdir -p "$PROJ_DIR" "$TARGET"

if [ -d "$LINK" ]; then
  # A real directory exists where the link should go. Preserve anything in it.
  if [ -n "$(ls -A "$LINK" 2>/dev/null)" ]; then
    echo "moving existing memory files into the repo (no overwrite):"
    for f in "$LINK"/*; do
      [ -e "$f" ] || continue
      base="$(basename "$f")"
      if [ -e "$TARGET/$base" ]; then
        echo "  keep repo copy, leaving $base at $LINK.bak/"
        mkdir -p "$LINK.bak" && mv "$f" "$LINK.bak/"
      else
        echo "  $base"
        mv "$f" "$TARGET/"
      fi
    done
  fi
  rmdir "$LINK" 2>/dev/null || { echo "could not remove $LINK (not empty?)"; exit 1; }
fi

if [ "$IS_WIN" = 1 ]; then
  # New-Item junction needs no admin rights and no Developer Mode (unlike a symlink).
  powershell.exe -NoProfile -Command \
    "New-Item -ItemType Junction -Path '$(cygpath -w "$LINK")' -Target '$(cygpath -w "$TARGET")' | Out-Null" \
    && echo "status:  junction created ✓"
else
  ln -s "$TARGET" "$LINK" && echo "status:  symlink created ✓"
fi

ls "$LINK" | head -5
