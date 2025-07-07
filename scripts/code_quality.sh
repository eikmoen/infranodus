#!/bin/bash
# Run linting and tests with logging

set -e
WORKDIR="$(cd "$(dirname "$0")/.." && pwd)"
LOGFILE="$WORKDIR/quality.log"
cd "$WORKDIR"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOGFILE"
}

log "Installing dependencies"
if [ ! -d node_modules ]; then
  npm install >>"$LOGFILE" 2>&1
fi

log "Running ESLint"
npm run lint >>"$LOGFILE" 2>&1 || log "Lint issues detected"

log "Running tests"
npm test >>"$LOGFILE" 2>&1 || log "Tests failed"

log "Quality checks complete"
