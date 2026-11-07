#!/bin/sh
set -eu
cd "$(dirname "$0")/browser"
if [ ! -d node_modules ]; then npm ci; fi
npm run characters
exec npm run dev
