#!/bin/sh
set -e

# Fix data directory ownership (handles volumes mounted as root)
if [ "$(id -u)" = "0" ]; then
  chown nextjs:nodejs /app/data
  exec su-exec nextjs:nodejs "$0" "$@"
fi

KEY_FILE="/app/data/.encryption_key"

# Use provided ENCRYPTION_KEY, or load/generate one
if [ -z "$ENCRYPTION_KEY" ]; then
  if [ -f "$KEY_FILE" ]; then
    ENCRYPTION_KEY=$(cat "$KEY_FILE")
  else
    ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    echo "$ENCRYPTION_KEY" > "$KEY_FILE"
    echo "Generated and saved encryption key."
  fi
  export ENCRYPTION_KEY
fi

exec "$@"
