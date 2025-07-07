#!/bin/bash
# Organize and rename files for forensic case management
# Usage: case_file_organizer.sh [DIRECTORY]
# Default directory is public/files
set -euo pipefail

WORKDIR="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_DIR="${1:-$WORKDIR/public/files}"
LOG_FILE="$WORKDIR/case_rename_log.json"

mkdir -p "$TARGET_DIR"
if [ ! -f "$LOG_FILE" ]; then
  echo '[]' > "$LOG_FILE"
fi

sanitize_name() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed -e 's/ /_/g' -e 's/[^a-z0-9._-]//g'
}

process_file() {
  local file="$1"
  local base="$(basename "$file")"
  local dir="$(dirname "$file")"
  local sanitized="$(sanitize_name "$base")"

  if [ "$base" != "$sanitized" ]; then
    mv "$file" "$dir/$sanitized"
  fi
  local ext="${sanitized##*.}"
  case "$ext" in
    jpg|png|gif) dest="images" ;;
    txt|md|json) dest="docs" ;;
    *) dest="other" ;;
  esac
  mkdir -p "$TARGET_DIR/$dest"
  mv "$dir/$sanitized" "$TARGET_DIR/$dest/" 2>/dev/null || true

  jq --arg orig "$base" --arg new "$sanitized" --arg path "$dest" \
    '. += [{original:$orig, renamed:$new, location:$path}]' "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
}

export -f sanitize_name process_file LOG_FILE TARGET_DIR
find "$TARGET_DIR" -maxdepth 1 -type f -print0 | xargs -0 -I{} bash -c 'process_file "$@"' _ {}

echo "Files organized. Log saved to $LOG_FILE"
