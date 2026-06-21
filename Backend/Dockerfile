# Step 1: Base image
FROM node:20-alpine

# Step 2: Working directory inside the container
WORKDIR /app

# Step 3: Copy package files
COPY package.json package-lock.json* ./

# Step 4: Install dependencies
RUN npm install

# Step 5: Copy source code
COPY . .

# Step 6: Make the entrypoint executable (generates .env at startup)
RUN chmod +x /app/docker-entrypoint.sh

# Step 7: Expose port and start
EXPOSE 8000
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]
