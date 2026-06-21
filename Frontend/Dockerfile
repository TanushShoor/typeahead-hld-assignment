# This is a temporary Dockerfile to allow docker-compose to build.
# Once you initialize your React frontend, this will run it!

FROM node:20-alpine
WORKDIR /app

# We use a wildcard so it doesn't crash if you haven't created the React app yet.
COPY package*.json ./
RUN npm install || echo "No package.json yet, skipping install."

COPY . .

# Make the entrypoint executable (generates .env at startup)
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 5173
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]
