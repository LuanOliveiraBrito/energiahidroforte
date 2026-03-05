#!/bin/bash
# Ativa o modo manutenção do Voltaris
# Uso: sudo bash /opt/voltaris/manutencao-on.sh

echo "🔧 Ativando modo manutenção..."

# Para o backend (roda como usuário luan)
sudo -u luan pm2 stop voltaris-backend 2>/dev/null

# Troca nginx: remove config normal, ativa manutenção
rm -f /etc/nginx/sites-enabled/voltaris
ln -sf /etc/nginx/sites-available/voltaris-manutencao /etc/nginx/sites-enabled/voltaris-manutencao

# Testa e recarrega nginx
nginx -t && systemctl reload nginx

echo "✅ Modo manutenção ATIVADO!"
echo "   Para desativar: sudo bash /opt/voltaris/manutencao-off.sh"
