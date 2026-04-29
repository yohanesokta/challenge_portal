#!/bin/sh

echo "Waiting for database to be ready..."
# Simple wait loop
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

echo "Starting Shortlink service on port 3001..."
# Start shortlink service in background
node shortlink/index.js &

echo "Starting Next.js server on port 3000..."
# Start Next.js and replace the shell process
exec node server.js
