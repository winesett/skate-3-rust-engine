#!/bin/sh
set -eu
cd "$(dirname "$0")/browser"
if [ ! -d node_modules ]; then npm ci; fi
exec npm run dev
