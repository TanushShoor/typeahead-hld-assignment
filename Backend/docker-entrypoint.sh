#!/bin/sh
set -e

# Generate the backend .env from the container's environment variables.
# Runs at startup so it always reflects the values passed by docker-compose.
cat > /app/.env <<EOF
DATABASE_URL=${DATABASE_URL}
REDIS_URLS=${REDIS_URLS:-redis://localhost:6379}
PORT=${PORT:-8000}
EOF

echo "✅ Backend .env generated (PORT=${PORT:-8000})"

# Generate the Prisma client into src/generated/prisma.
# Must run here (not just at build time) because the ./Backend:/app bind mount
# overlays the host folder and hides anything generated during the image build.
if [ ! -d "/app/src/generated/prisma" ]; then
  echo "⏳ Generating Prisma client..."
  npx prisma generate
fi

# Hand off to the container's main command (CMD)
exec "$@"
