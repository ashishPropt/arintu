#!/bin/bash
# Arintu deployment script for Ubuntu 22.04 (Vultr)
set -e

echo "=== Arintu Setup Script ==="

# System updates
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git nginx certbot python3-certbot-nginx

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# PostgreSQL 16
apt-get install -y postgresql postgresql-contrib

# PM2
npm install -g pm2

# --- Database setup ---
DB_PASS=$(openssl rand -hex 16)
su - postgres -c "psql -c \"CREATE USER arintu WITH PASSWORD '$DB_PASS';\""
su - postgres -c "psql -c \"CREATE DATABASE arintu OWNER arintu;\""
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE arintu TO arintu;\""

# --- App setup ---
mkdir -p /opt/arintu
cd /opt/arintu
git clone https://github.com/ashishPropt/arintu.git .

# Backend
cd /opt/arintu/backend
npm install --production

# Write .env
JWT_SECRET=$(openssl rand -hex 32)
cat > .env <<EOF
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://arintu:${DB_PASS}@localhost:5432/arintu
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
ZOOM_ACCOUNT_ID=
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=
MATHWAVE_API_URL=
MATHWAVE_API_KEY=
FRONTEND_URL=http://$(curl -s ifconfig.me)
EOF

# Run migrations and seed
node database/migrate.js
node seed.js

# Frontend
cd /opt/arintu/frontend
npm install
VITE_API_URL="" npm run build

# Nginx config
cat > /etc/nginx/sites-available/arintu <<'NGINX'
server {
    listen 80;
    server_name _;

    root /opt/arintu/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/arintu /etc/nginx/sites-enabled/arintu
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# PM2
cd /opt/arintu/backend
pm2 start server.js --name arintu-api
pm2 startup systemd
pm2 save

echo ""
echo "=== Arintu deployed! ==="
echo "URL: http://$(curl -s ifconfig.me)"
echo "Superadmin: superadmin@arintu.com / Admin@123"
echo "Admin:      admin@arintu.com / Admin@123"
echo ""
echo "IMPORTANT: Change default passwords immediately!"
