#!/bin/bash

# Script to upgrade dependencies and generate combo report
# Maintains logs in upgrade_report.json
# This script checks for outdated dependencies, updates them, and groups them into categories.

set -e

WORKDIR="$(cd "$(dirname "$0")/.." && pwd)"
PACKAGE_JSON="$WORKDIR/package.json"
REPORT_JSON="$WORKDIR/upgrade_report.json"
LOGFILE="$WORKDIR/upgrade_script.log"
NODE_MODULES="$WORKDIR/node_modules"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOGFILE"
}

# Ensure package.json exists
if [ ! -f "$PACKAGE_JSON" ]; then
    log "package.json not found in $WORKDIR"
    exit 1
fi

# Initialize report file
if [ ! -f "$REPORT_JSON" ]; then
    echo '{"upgrades": [], "combos": {}}' > "$REPORT_JSON"
fi

# Ensure dependencies are installed
if [ ! -d "$NODE_MODULES" ]; then
    log "node_modules not found. Installing dependencies"
    npm install >>"$LOGFILE" 2>&1
fi

temp_outdated=$(mktemp)

log "Checking for outdated dependencies"
if ! npm outdated --json > "$temp_outdated" 2>>"$LOGFILE"; then
    log "No outdated dependencies or npm error"
    echo '{"upgrades": [], "combos": {}}' > "$REPORT_JSON"
    rm -f "$temp_outdated"
    exit 0
fi

if [ ! -s "$temp_outdated" ]; then
    log "All dependencies up to date"
    echo '{"upgrades": [], "combos": {}}' > "$REPORT_JSON"
    rm -f "$temp_outdated"
    exit 0
fi

# Parse outdated dependencies and update them
update_list=$(jq -r 'keys[]' "$temp_outdated")

log "Updating dependencies"
update_dep() {
    dep="$1"
    current=$(jq -r ".[\"$dep\"].current" "$temp_outdated")
    latest=$(jq -r ".[\"$dep\"].latest" "$temp_outdated")
    log "Updating $dep from $current to $latest"
    if npm install "$dep@$latest" --save >>"$LOGFILE" 2>&1; then
        jq --arg name "$dep" --arg from "$current" --arg to "$latest" \
           '.upgrades += [{name:$name, from:$from, to:$to}]' "$REPORT_JSON" > "$REPORT_JSON.tmp" && mv "$REPORT_JSON.tmp" "$REPORT_JSON"
    else
        log "Failed to update $dep"
    fi

    prefix=${dep%%-*}
    if jq -e ".combos.\"$prefix\"" "$REPORT_JSON" >/dev/null; then
        jq --arg prefix "$prefix" --arg name "$dep" '.combos[$prefix] += [$name]' "$REPORT_JSON" > "$REPORT_JSON.tmp" && mv "$REPORT_JSON.tmp" "$REPORT_JSON"
    else
        jq --arg prefix "$prefix" --arg name "$dep" '.combos[$prefix] = [$name]' "$REPORT_JSON" > "$REPORT_JSON.tmp" && mv "$REPORT_JSON.tmp" "$REPORT_JSON"
    fi
}

export -f update_dep
echo "$update_list" | xargs -I {} -n 1 -P 4 bash -c 'update_dep "$@"' _ {}

rm -f "$temp_outdated"

log "Upgrade process complete. Report saved to $REPORT_JSON"

echo "Upgrade report saved to $REPORT_JSON"
