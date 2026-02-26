# 🚀 Deploy Voltaris Energy - Google Cloud (Ubuntu 24.04)

## Pré-requisitos
- Instância GCE rodando Ubuntu 24.04 LTS
- Acesso SSH à instância
- Portas 80 e 443 liberadas no firewall da VPC

---

## PASSO 1 — Liberar Firewall no Google Cloud Console

1. Acesse: **VPC Network → Firewall**
2. Clique em **"Create Firewall Rule"**
3. Configure:
   - Nome: `allow-http-https`
   - Targets: All instances in the network
   - Source IP ranges: `0.0.0.0/0`
   - Protocols and ports: **tcp: 80, 443**
4. Salve

---

## PASSO 2 — Conectar via SSH

No Google Cloud Console, na página da instância, clique no botão **"SSH"**.
Isso abre um terminal no navegador direto no servidor.

---

## PASSO 3 — No servidor, rodar o script de setup

Cole o conteúdo do arquivo `setup-server.sh` no terminal (ou transfira o arquivo).

```bash
# Copiar e colar o conteúdo do setup-server.sh diretamente no terminal SSH
```

---

## PASSO 4 — Transferir os arquivos do projeto

### Opção A: Pelo Google Cloud Console (mais fácil)
No terminal SSH do navegador, no canto superior direito tem um botão **"Upload File"**.
Mas só aceita arquivos individuais — então primeiro compacte o projeto.

### Opção B: Compactar e transferir via gcloud CLI

No seu PC Windows (PowerShell), instale o gcloud CLI se não tiver:
https://cloud.google.com/sdk/docs/install

Depois:

```powershell
# 1) Compactar o projeto (sem node_modules)
cd "C:\Users\Luan\Documents\PROJETO HF - HIDROFORTE"
tar -czf voltaris.tar.gz --exclude=node_modules --exclude=.env --exclude=uploads backend frontend

# 2) Enviar para o servidor
gcloud compute scp voltaris.tar.gz instance-20260226-000302:~ --zone=southamerica-east1-c
```

### Opção C: Sem gcloud — usando o terminal SSH do navegador

1. No Windows, compacte com 7-Zip ou WinRAR o projeto (sem node_modules)
2. No terminal SSH do navegador, clique em "Upload File" e suba o .tar.gz
3. Ou use um serviço temporário (Google Drive, etc)

---

## PASSO 5 — No servidor, descompactar e configurar

```bash
cd ~
tar -xzf voltaris.tar.gz

# Mover para o local definitivo
sudo mv backend /opt/voltaris/backend
sudo mv frontend /opt/voltaris/frontend
sudo chown -R $USER:$USER /opt/voltaris

# Instalar dependências do backend
cd /opt/voltaris/backend
npm install

# Instalar dependências do frontend e fazer build
cd /opt/voltaris/frontend
npm install
npm run build

# Configurar o .env do backend
cd /opt/voltaris/backend
cp .env.example .env
nano .env
```

No .env, ajuste:
```
DATABASE_URL="postgresql://voltaris:SUA_SENHA_FORTE@localhost:5432/voltaris_erp?schema=public"
JWT_SECRET="uma-chave-segura-diferente-para-producao"
JWT_EXPIRES_IN="8h"
PORT=3001
NODE_ENV=production
MAX_FILE_SIZE=10
```

---

## PASSO 6 — Configurar banco de dados

```bash
# Rodar migrations do Prisma
cd /opt/voltaris/backend
npx prisma generate
npx prisma migrate deploy

# Rodar seed (criar usuário admin e dados iniciais)
npx prisma db seed
```

---

## PASSO 7 — Iniciar a aplicação com PM2

```bash
cd /opt/voltaris/backend
pm2 start src/server.js --name voltaris --env production
pm2 save
pm2 startup
# Copie e execute o comando que o PM2 mostrar
```

---

## PASSO 8 — Testar

Acesse no navegador: `http://IP_EXTERNO_DA_INSTANCIA`

O IP externo está na página da instância no Google Cloud Console.

---

## PASSO 9 (Opcional) — Domínio + HTTPS

Se tiver um domínio:

```bash
# Apontar o domínio para o IP da instância (no painel do registrador DNS)
# Depois instalar certificado SSL:
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seudominio.com.br
```

---

## Comandos úteis no servidor

```bash
# Ver status da aplicação
pm2 status

# Ver logs em tempo real
pm2 logs voltaris

# Reiniciar após atualização
pm2 restart voltaris

# Ver uso de recursos
pm2 monit
```
