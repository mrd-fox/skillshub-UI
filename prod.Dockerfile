# ---------- Build stage ----------
FROM node:20-alpine AS build

WORKDIR /app

# 1) Install deps deterministically (CI/CD)
COPY package.json package-lock.json ./
RUN npm ci

# 2) Build
COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:1.27-alpine

# Remove default nginx static content
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# SPA fallback (React Router) - default nginx.conf doesn't do this
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
