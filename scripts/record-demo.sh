#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
READY=/tmp/co-tam-demo-ready
BROWSER_LOG=/tmp/co-tam-browser.log
OUTPUT="$ROOT/media/cotam_gameplay.mp4"

rm -f "$READY" "$OUTPUT"
mkdir -p "$ROOT/media"
export ROOT READY BROWSER_LOG OUTPUT

# Software-rendered WebGL can leave Chromium helper processes alive after the
# recording is complete. Limit the virtual-display session, then validate the
# generated MP4 instead of treating a late cleanup timeout as a failed capture.
STATUS=0
timeout --kill-after=10s 180s xvfb-run -a -s '-screen 0 960x540x24 -nolisten tcp' bash -c '
  set -euo pipefail

  setsid node "$ROOT/scripts/run-demo.mjs" >"$BROWSER_LOG" 2>&1 &
  NODE_PID=$!

  cleanup() {
    kill -TERM -- -"$NODE_PID" 2>/dev/null || true
    sleep 1
    kill -KILL -- -"$NODE_PID" 2>/dev/null || true
  }
  trap cleanup EXIT

  for _ in $(seq 1 240); do
    [ -f "$READY" ] && break
    if ! kill -0 "$NODE_PID" 2>/dev/null; then
      cat "$BROWSER_LOG"
      exit 1
    fi
    sleep .25
  done

  if [ ! -f "$READY" ]; then
    cat "$BROWSER_LOG"
    exit 1
  fi

  xdpyinfo -display "$DISPLAY" >/dev/null
  sleep .5

  ffmpeg -y -loglevel warning \
    -f x11grab -draw_mouse 0 -framerate 12 \
    -video_size 960x540 -i "${DISPLAY}.0+0,0" \
    -t 28 -c:v libx264 -preset ultrafast -crf 26 \
    -pix_fmt yuv420p -movflags +faststart "$OUTPUT"

  cleanup
  trap - EXIT
' || STATUS=$?

if [ ! -s "$OUTPUT" ]; then
  echo "Gameplay video was not created. xvfb status: $STATUS" >&2
  cat "$BROWSER_LOG" 2>/dev/null || true
  exit 1
fi

DURATION="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$OUTPUT")"
if ! awk "BEGIN { exit !($DURATION >= 20) }"; then
  echo "Gameplay video is too short: ${DURATION}s. xvfb status: $STATUS" >&2
  cat "$BROWSER_LOG" 2>/dev/null || true
  exit 1
fi

echo "Gameplay video ready: $OUTPUT (${DURATION}s, recorder status $STATUS)"
