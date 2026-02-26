#!/bin/bash
# =====================================================
# Script de atualização - Voltaris Energy
# Rode no SERVIDOR após git pull ou upload de arquivos
# =====================================================

set -e
cd /opt/voltaris

echo "=========================================="
echo "  VOLTARIS ENERGY - Atualizando..."
echo "=========================================="

# 1) Instalar dependências do backend (se mudaram)
echo ""
echo "📦 [1/4] Backend dependencies..."
cd /opt/voltaris/backend
npm install --production 2>/dev/null

# 2) Build do frontend (se mudou)
echo ""
echo "🔨 [2/4] Frontend build..."
cd /opt/voltaris/frontend
npm install 2>/dev/null
npm run build

# 3) Migrations (se houver novas)
echo ""
echo "🗄️  [3/4] Database migrations..."
cd /opt/voltaris/backend
npx prisma generate
npx prisma migrate deploy

# 4) Reiniciar aplicação
echo ""
echo "🔄 [4/4] Reiniciando aplicação..."
pm2 restart voltaris

echo ""
echo "=========================================="
echo "  ✅ ATUALIZAÇÃO CONCLUÍDA!"
echo "=========================================="
pm2 status
