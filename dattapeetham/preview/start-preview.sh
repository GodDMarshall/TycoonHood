#!/bin/sh
# Datta Peetham website - local preview for macOS and Linux.
# Run it from a terminal:  ./start-preview.sh   (options: --port=9000 --no-open ...)
# It needs Node.js 20 or newer: https://nodejs.org

here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "  Node.js is not installed on this computer, so the preview cannot start."
  echo
  echo "  1. Download Node.js (the LTS version, 20 or newer) from  https://nodejs.org"
  echo "  2. Install it, open a new terminal window, and run this script again."
  echo
  echo "  You do not need Node.js to put the website online: upload the contents"
  echo "  of the \"website\" folder to the web server (see README-FIRST.html)."
  echo
  exit 1
fi

if ! node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"; then
  echo
  echo "  The Node.js on this computer ($(node -v)) is too old for the preview."
  echo "  It needs version 20 or newer: download the LTS version from https://nodejs.org"
  echo
  exit 1
fi

exec node "$here/serve.mjs" "$here/../website" "$@"
