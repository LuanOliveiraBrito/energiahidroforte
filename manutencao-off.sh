#!/bin/bash
# Desativa o modo manutenção do Voltaris
# Uso: sudo bash /opt/voltaris/manutencao-off.sh

echo "🚀 Desativando modo manutenção..."

# Troca nginx: remove manutenção, ativa config normal
rm -f /etc/nginx/sites-enabled/voltaris-manutencao
ln -sf /etc/nginx/sites-available/voltaris /etc/nginx/sites-enabled/voltaris

# Testa e recarrega nginx
nginx -t && systemctl reload nginx

# Inicia o backend (roda como usuário luan)
sudo -u luan pm2 start voltaris-backend 2>/dev/null || sudo -u luan pm2 restart voltaris-backend

echo "✅ Sistema ONLINE!"
