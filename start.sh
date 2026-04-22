#!/bin/sh

echo "Waiting for database to be ready..."
# Simple wait loop
# We don't use set -e here so the loop can retry on connection failure
MAX_RETRIES=30
COUNT=0

while [ $COUNT -lt $MAX_RETRIES ]; do
  npx drizzle-kit push && break
  echo "Database is not ready yet (attempt $COUNT/$MAX_RETRIES) - retrying in 2 seconds..."
  sleep 2
  COUNT=$((COUNT + 1))
done

if [ $COUNT -eq $MAX_RETRIES ]; then
  echo "Failed to connect to database after $MAX_RETRIES attempts."
  exit 1
fi

echo "Database ready and migrated."

echo "Starting Next.js server..."
exec node server.js
