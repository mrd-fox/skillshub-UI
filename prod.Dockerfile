# ===========================
#  1 : build front
# ===========================
FROM node:20 AS builder
WORKDIR /app

# Copy the dependecies files to install
COPY package*.json ./
RUN npm install

# Copytout all project
COPY . .

#  Arguments wile build
#ARG VITE_KEYCLOAK_URL
#ARG VITE_KEYCLOAK_REALM
#ARG VITE_KEYCLOAK_CLIENT_ID
#ARG VITE_API_URL

# Define these variables like the env variables inside the build conteiner
#ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL
#ENV VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM
#ENV VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID
#ENV VITE_API_URL=$VITE_API_URL

# Build the project  (dist/)
RUN npm run build

# ===========================
# 2 : server nginx
# ===========================
FROM nginx:stable-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY config-entrypoint.sh /docker-entrypoint.d/config-entrypoint.sh
RUN chmod +x /docker-entrypoint.d/config-entrypoint.sh

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
