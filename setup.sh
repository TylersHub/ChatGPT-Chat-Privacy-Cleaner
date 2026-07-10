#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"

node -e "if (Number(process.versions.node.split('.')[0]) < 20) process.exit(1)" || {
  echo "Node.js 20 or newer is required."
  exit 1
}

npm install --no-audit --fund=false
npm test
npm run build
npm run doctor
echo "Setup complete. Start ClearSlate with: npm start"

