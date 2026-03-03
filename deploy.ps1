# =====================================================
# Deploy Voltaris Energy - Rodar no PC (PowerShell)
# Compacta e envia arquivos para o servidor
# =====================================================
# USO: .\deploy.ps1
# =====================================================

$PROJECT_DIR = "C:\Users\Luan\Documents\PROJETO HF - HIDROFORTE"
$INSTANCE = "instance-20260226-000302"
$ZONE = "southamerica-east1-c"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  VOLTARIS ENERGY - Deploy" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1) Build do frontend
Write-Host ""
Write-Host "[1/3] Build do frontend..." -ForegroundColor Yellow
Set-Location "$PROJECT_DIR\frontend"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERRO no build!" -ForegroundColor Red; exit 1 }

# 2) Compactar (sem node_modules, uploads, logs, .env)
Write-Host ""
Write-Host "[2/3] Compactando projeto..." -ForegroundColor Yellow
Set-Location $PROJECT_DIR

# Remover arquivo anterior se existir
if (Test-Path "voltaris-update.tar.gz") { Remove-Item "voltaris-update.tar.gz" }

tar -czf voltaris-update.tar.gz --exclude=node_modules --exclude=uploads --exclude=logs --exclude=.env --exclude=backup.dump backend frontend update-server.sh

$size = [math]::Round((Get-Item "voltaris-update.tar.gz").Length / 1MB, 2)
Write-Host "   Arquivo: voltaris-update.tar.gz ($size MB)" -ForegroundColor Green

# 3) Instrucoes
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  ARQUIVO PRONTO!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Agora suba o arquivo para o servidor:" -ForegroundColor White
Write-Host "  1. No terminal SSH do navegador, clique no icone de engrenagem" -ForegroundColor Gray
Write-Host "  2. Clique em 'Upload file'" -ForegroundColor Gray
Write-Host "  3. Selecione: $PROJECT_DIR\voltaris-update.tar.gz" -ForegroundColor Gray
Write-Host ""
Write-Host "  Depois, no servidor SSH, rode:" -ForegroundColor White
Write-Host "  cd ~ && tar -xzf voltaris-update.tar.gz" -ForegroundColor Yellow
Write-Host "  cp -r backend frontend /opt/voltaris/" -ForegroundColor Yellow
Write-Host "  cp update-server.sh /opt/voltaris/" -ForegroundColor Yellow
Write-Host "  cd /opt/voltaris && bash update-server.sh" -ForegroundColor Yellow
Write-Host ""
