#!/bin/sh
set -e

# Wait for the PostgreSQL service to be ready
echo "Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
/usr/local/bin/wait-for-it.sh "$DB_HOST:$DB_PORT" --timeout=60 -- echo "PostgreSQL is up - executing command"

# Run TypeORM migrations
echo "Running TypeORM migrations..."
npm run typeorm migration:run -- -d ./typeOrm.config.ts

# Start the NestJS application
echo "Starting NestJS application..."
exec "$@"
