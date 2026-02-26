#!/bin/sh

echo "🔧 Injecting runtime environment variables into config.js ..."

# Utilise envsubst pour remplacer les variables dans le template
envsubst < /usr/share/nginx/html/config.template.js > /usr/share/nginx/html/config.js

echo "✅ Configuration injected successfully."
exec "$@"
