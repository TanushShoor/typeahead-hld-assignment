#!/bin/sh
set -e

# Generate the frontend .env from the container's environment variables.
# Vite only exposes vars prefixed with VITE_ to the browser bundle.
cat > /app/.env <<EOF
VITE_API_URL=${VITE_API_URL:-http://localhost:8000}
EOF

echo "✅ Frontend .env generated (VITE_API_URL=${VITE_API_URL:-http://localhost:8000})"

# Hand off to the container's main command (CMD)
exec "$@"
