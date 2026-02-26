#!/bin/bash
# =====================================================
# Script de Setup do Servidor - Voltaris Energy
# Ubuntu 24.04 LTS - Google Cloud
# =====================================================
# Já instalados: Node.js 20, PostgreSQL, Nginx, PM2,
#   Tesseract, Git
# Banco: hidroforte_erp | Usuário: hidroforte
# =====================================================

set -e

echo "=========================================="
echo "  VOLTARIS ENERGY - Configuração Final"
echo "=========================================="

# 1) Configurar Nginx como proxy reverso
echo ""
echo "� [1/3] Configurando Nginx..."
sudo tee /etc/nginx/sites-available/voltaris > /dev/null <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
NGINX

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/voltaris /etc/nginx/sites-enabled/voltaris
sudo nginx -t && sudo systemctl reload nginx
echo "   ✅ Nginx configurado (porta 80 → 3001)"

# 2) Criar pasta do projeto
echo ""
echo "� [2/3] Criando estrutura de pastas..."
sudo mkdir -p /opt/voltaris
sudo chown -R $USER:$USER /opt/voltaris
echo "   ✅ /opt/voltaris/ pronta"

# 3) Configurar PM2 para iniciar com o sistema
echo ""
echo "� [3/3] Configurando PM2 startup..."
pm2 startup systemd -u $USER --hp $HOME 2>/dev/null || true
echo "   ✅ PM2 configurado"

echo ""
echo "=========================================="
echo "  ✅ SERVIDOR CONFIGURADO!"
echo "=========================================="
echo ""
echo "  Próximos passos:"
echo ""
echo "  1. No seu PC Windows (PowerShell):"
echo "     cd \"C:\\Users\\Luan\\Documents\\PROJETO HF - HIDROFORTE\""
echo "     tar -czf voltaris.tar.gz --exclude=node_modules --exclude=uploads --exclude=logs backend frontend"
echo ""
echo "  2. Suba o voltaris.tar.gz pelo botão Upload do terminal SSH"
echo ""
echo "  3. No servidor:"
echo "     cd ~"
echo "     tar -xzf voltaris.tar.gz"
echo "     cp -r backend frontend /opt/voltaris/"
echo "     cd /opt/voltaris/backend"
echo "     npm install"
echo "     cd /opt/voltaris/frontend"
echo "     npm install && npm run build"
echo ""
echo "  4. Configurar .env:"
echo "     cd /opt/voltaris/backend"
echo "     nano .env"
echo ""
echo '     DATABASE_URL="postgresql://hidroforte:sua_senha_segura@localhost:5432/hidroforte_erp?schema=public"'
echo '     JWT_SECRET="uma-chave-segura-para-producao"'
echo '     JWT_EXPIRES_IN="8h"'
echo '     PORT=3001'
echo '     NODE_ENV=production'
echo '     MAX_FILE_SIZE=10'
echo ""
echo "  5. Rodar migrations e iniciar:"
echo "     cd /opt/voltaris/backend"
echo "     npx prisma generate"
echo "     npx prisma migrate deploy"
echo "     npx prisma db seed"
echo "     pm2 start src/server.js --name voltaris"
echo "     pm2 save"
echo ""
echo "  6. Acessar: http://IP_EXTERNO_DA_INSTANCIA"
echo ""
