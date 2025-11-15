#!/bin/sh
set -e

# Wczytaj sekrety do zmiennych środowiskowych
if [ -f /run/secrets/tavoo_db_user ]; then
  export DB_USER=$(cat /run/secrets/tavoo_db_user)
fi

if [ -f /run/secrets/tavoo_db_pass ]; then
  export DB_PASS=$(cat /run/secrets/tavoo_db_pass)
fi

if [ -f /run/secrets/tavoo_db_name ]; then
  export DB_NAME=$(cat /run/secrets/tavoo_db_name)
fi

# Wait for the PostgreSQL service to be ready
echo "Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
/usr/local/bin/wait-for-it.sh "$DB_HOST:$DB_PORT" --timeout=60 -- echo "PostgreSQL is up - executing command"

# Run TypeORM migrations
echo "Running TypeORM migrations..."
npm run typeorm migration:run -- -d ./typeOrm.config.ts

# Start the NestJS application
echo "Starting NestJS application..."
exec "$@"
