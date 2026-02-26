FROM node:20-alpine

WORKDIR /app

# Only copy lock files for faster cache if ever built in CI
COPY package.json package-lock.json ./

# Do NOT install deps at build time (they will live in the volume)
# Installation happens at container start via docker-compose command

EXPOSE 5173

CMD ["npm", "run", "dev"]
