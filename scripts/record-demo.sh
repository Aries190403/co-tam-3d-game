#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DISPLAY_NUM=:97
READY=/tmp/co-tam-demo-ready
rm -f "$READY"
Xvfb "$DISPLAY_NUM" -screen 0 1280x720x24 -nolisten tcp >/tmp/co-tam-xvfb.log 2>&1 &
XVFB_PID=$!
cleanup() { kill "${NODE_PID:-}" "$XVFB_PID" 2>/dev/null || true; }
trap cleanup EXIT
export DISPLAY="$DISPLAY_NUM"
node "$ROOT/scripts/run-demo.mjs" >/tmp/co-tam-browser.log 2>&1 &
NODE_PID=$!
for _ in $(seq 1 120); do
  [ -f "$READY" ] && break
  sleep .25
done
[ -f "$READY" ] || { cat /tmp/co-tam-browser.log; exit 1; }
mkdir -p "$ROOT/media"
ffmpeg -y -loglevel warning \
  -f x11grab -framerate 24 -video_size 1280x720 -i "$DISPLAY_NUM.0" \
  -t 28 -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -movflags +faststart \
  "$ROOT/media/cotam_gameplay.mp4"
wait "$NODE_PID" || true
