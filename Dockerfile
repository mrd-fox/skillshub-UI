# =========================
# PROD — Multi-stage build
# Vite (build) -> Nginx (serve dist)
# =========================

# ---------- 1) Build stage ----------
FROM node:20-alpine AS build

WORKDIR /app

# Build-time variables (Vite injects these into the bundle)
ARG VITE_API_URL
# Add others if needed later:
# ARG VITE_SENTRY_DSN
# ARG VITE_APP_ENV

ENV VITE_API_URL=${VITE_API_URL}

# Install deps (cached)
COPY package.json package-lock.json ./
RUN npm ci

# Build
COPY . .
RUN npm run build


# ---------- 2) Runtime stage ----------
FROM nginx:1.27-alpine AS runtime

# SPA routing + sane defaults
RUN rm -f /etc/nginx/conf.d/default.conf && \
  cat > /etc/nginx/conf.d/default.conf <<'NGINX'
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  # Security / hygiene
  server_tokens off;
  charset utf-8;

  # Static assets caching
  location ~* \.(?:css|js|mjs|map|ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot)$ {
    try_files $uri =404;
    expires 30d;
    add_header Cache-Control "public, max-age=2592000, immutable";
  }

  # SPA fallback
  location / {
    try_files $uri $uri/ /index.html;
  }
}
NGINX

# Copy built app
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Basic healthcheck (optional but useful)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]