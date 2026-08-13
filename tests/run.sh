#!/usr/bin/env bash
# Runs every tests/*.html page in headless Chrome and checks its reported
# results. No test framework, no Node — the app is plain HTML/JS with no
# build step, so tests are plain HTML pages that assert into the DOM and get
# read back out via `--dump-dom`. Works the same locally and in CI.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PORT="${PORT:-8123}"

CHROME_BIN="${CHROME_BIN:-}"
if [ -z "$CHROME_BIN" ]; then
  for candidate in \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    "google-chrome-stable" \
    "google-chrome" \
    "chromium-browser" \
    "chromium"; do
    if [ -x "$candidate" ] || command -v "$candidate" >/dev/null 2>&1; then
      CHROME_BIN="$candidate"
      break
    fi
  done
fi
if [ -z "$CHROME_BIN" ]; then
  echo "No Chrome/Chromium binary found. Set CHROME_BIN explicitly." >&2
  exit 1
fi

cd "$ROOT_DIR"
python3 -m http.server "$PORT" >/tmp/iron-ledger-test-server.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 40); do
  if curl -s -o /dev/null "http://localhost:$PORT/index.html"; then break; fi
  sleep 0.25
done

EXIT_CODE=0

for test_file in tests/unit.html tests/dom.html; do
  echo "=== Running $test_file ==="
  DOM_OUTPUT=$("$CHROME_BIN" \
    --headless=new --disable-gpu --no-sandbox \
    --dump-dom "http://localhost:$PORT/$test_file" 2>/dev/null || true)
  RESULT=$(printf '%s' "$DOM_OUTPUT" | awk '/<pre id="out">/,/<\/pre>/' \
    | sed -e 's/<pre id="out">//' -e 's/<\/pre>//' \
          -e 's/&gt;/>/g' -e 's/&lt;/</g' -e 's/&amp;/\&/g')
  echo "$RESULT"
  echo

  if [ -z "$RESULT" ]; then
    echo "!! $test_file produced no output — it likely failed to load or threw before reporting." >&2
    EXIT_CODE=1
    continue
  fi
  if echo "$RESULT" | grep -q "^FAIL:"; then
    echo "!! $test_file has failing assertions." >&2
    EXIT_CODE=1
  fi
  if ! echo "$RESULT" | grep -qE '[0-9]+ passed, 0 failed'; then
    echo "!! $test_file summary line missing or reports non-zero failures." >&2
    EXIT_CODE=1
  fi
done

exit $EXIT_CODE
