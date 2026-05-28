#!/bin/bash
# Arintu deployment script for Ubuntu 22.04 (Vultr)
# Logs to /var/log/arintu-setup.log
exec > >(tee -a /var/log/arintu-setup.log) 2>&1
set -e

echo "=== [$(date)] Arintu Setup Starting ==="

export DEBIAN_FRONTEND=noninteractive

# System updates
apt-get update -y
apt-get upgrade -y -o Dpkg::Options::="--force-confnew"
apt-get install -y curl git nginx ufw

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# PostgreSQL 16
apt-get install -y postgresql postgresql-contrib

# PM2
npm install -g pm2

echo "=== [$(date)] Dependencies installed ==="

# Database setup
DB_PASS=$(openssl rand -hex 16)
su - postgres -c "psql -c \"CREATE USER arintu WITH PASSWORD '${DB_PASS}';\""
su - postgres -c "psql -c \"CREATE DATABASE arintu OWNER arintu;\""
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE arintu TO arintu;\""

echo "=== [$(date)] Database ready ==="

# App setup
mkdir -p /opt/arintu
cd /opt/arintu
git clone https://github.com/ashishPropt/arintu.git .

echo "=== [$(date)] Code cloned ==="

# Backend
cd /opt/arintu/backend
npm install --production

JWT_SECRET=$(openssl rand -hex 32)
SERVER_IP=$(curl -s https://api.ipify.org)

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
FRONTEND_URL=http://${SERVER_IP}
EOF

node database/migrate.js
node seed.js

echo "=== [$(date)] Backend ready ==="

# Frontend
cd /opt/arintu/frontend
npm install
npm run build

echo "=== [$(date)] Frontend built ==="

# Nginx
cat > /etc/nginx/sites-available/arintu <<'NGINX'
server {
    listen 80 default_server;
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

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/arintu /etc/nginx/sites-enabled/arintu
nginx -t && systemctl enable nginx && systemctl restart nginx

# Firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# PM2
cd /opt/arintu/backend
pm2 start server.js --name arintu-api
pm2 startup systemd -u root --hp /root
pm2 save

echo ""
echo "=== [$(date)] ARINTU SETUP COMPLETE ==="
echo "URL: http://${SERVER_IP}"
echo "Superadmin: superadmin@arintu.com / Admin@123"
