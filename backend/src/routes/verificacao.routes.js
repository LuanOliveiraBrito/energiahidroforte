const express = require('express');
const prisma = require('../config/database');
const { verificarHash } = require('../utils/verificacaoHash');

const router = express.Router();

// Formatar moeda
function fmtCurrency(v) {
  if (!v && v !== 0) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

// Formatar data
function fmtDate(d) {
  if (!d) return '-';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
}

function fmtDateTime(d) {
  if (!d) return '-';
  const dt = new Date(d);
  return `${fmtDate(d)} às ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
}

function fmtCNPJ(c) {
  if (!c) return '';
  const d = c.replace(/\D/g, '');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return c;
}

const statusLabels = {
  PENDENTE: { label: 'Pendente de Aprovação', color: '#f59e0b', bg: '#fffbeb', icon: '⏳' },
  APROVADA: { label: 'Aprovada', color: '#3b82f6', bg: '#eff6ff', icon: '✅' },
  LIBERADA: { label: 'Liberada para Pagamento', color: '#8b5cf6', bg: '#f5f3ff', icon: '🔓' },
  PAGA: { label: 'Paga / Baixada', color: '#10b981', bg: '#ecfdf5', icon: '💰' },
  REJEITADA: { label: 'Rejeitada', color: '#ef4444', bg: '#fef2f2', icon: '❌' },
};

// GET /verificar/:hash — Página pública de verificação
router.get('/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const fatura = await verificarHash(hash);

    if (!fatura) {
      return res.send(gerarHTML(null, hash));
    }

    return res.send(gerarHTML(fatura, hash));
  } catch (err) {
    console.error('Erro na verificação:', err);
    return res.status(500).send(gerarHTML(null, req.params.hash, 'Erro interno do servidor'));
  }
});

// GET /verificar — Página de consulta manual
router.get('/', (req, res) => {
  res.send(gerarHTMLConsulta());
});

function gerarHTMLConsulta() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificação de Documento — Voltaris Energy</title>
  <style>${getCSS()}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 Verificação de Documento</h1>
      <p>Voltaris Energy — Excelência na gestão de faturas de energia</p>
    </div>
    <div class="card">
      <h2>Consultar Autenticidade</h2>
      <p style="color:#64748b;margin-bottom:20px;">Digite o código de verificação que aparece na Capa de Processo do documento.</p>
      <form onsubmit="verificar(event)">
        <input type="text" id="codigo" placeholder="XXXX-XXXX-XXXX" maxlength="14" 
          style="width:100%;padding:14px;font-size:1.3rem;text-align:center;font-family:monospace;letter-spacing:4px;border:2px solid #e2e8f0;border-radius:10px;outline:none;text-transform:uppercase;"
          onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#e2e8f0'" />
        <button type="submit" style="width:100%;margin-top:16px;padding:14px;background:#2563eb;color:#fff;border:none;border-radius:10px;font-size:1rem;font-weight:600;cursor:pointer;">
          Verificar Documento
        </button>
      </form>
    </div>
    <div class="footer">
      Sistema Voltaris Energy — Verificação criptográfica de documentos
    </div>
  </div>
  <script>
    function verificar(e) {
      e.preventDefault();
      const codigo = document.getElementById('codigo').value.trim().toUpperCase();
      if (!codigo) { alert('Digite o código de verificação'); return; }
      window.location.href = '/verificar/' + encodeURIComponent(codigo);
    }
  </script>
</body>
</html>`;
}

function gerarHTML(fatura, hash, erro) {
  const st = fatura ? (statusLabels[fatura.status] || statusLabels.PENDENTE) : null;

  const content = !fatura
    ? `
      <div class="result invalid">
        <div class="result-icon">❌</div>
        <h2>Documento Não Encontrado</h2>
        <p>O código de verificação <strong style="font-family:monospace;letter-spacing:2px;">${hash}</strong> não corresponde a nenhum documento válido no sistema.</p>
        <p style="color:#ef4444;font-weight:600;">Este documento pode ter sido adulterado ou o código é inválido.</p>
        ${erro ? `<p style="color:#ef4444;">${erro}</p>` : ''}
      </div>
    `
    : `
      <div class="result valid">
        <div class="result-icon">✅</div>
        <h2>Documento Válido e Autêntico</h2>
        <p>Este documento foi emitido pelo sistema Voltaris Energy e suas assinaturas são legítimas.</p>
      </div>
      
      <div class="card">
        <div class="status-badge" style="background:${st.bg};color:${st.color};border:1px solid ${st.color}20;">
          ${st.icon} ${st.label}
        </div>
        
        <table class="info-table">
          <tr><th>Fatura Nº</th><td><strong>#${fatura.id}</strong></td></tr>
          <tr><th>Código de Verificação</th><td style="font-family:monospace;letter-spacing:2px;font-weight:700;">${hash}</td></tr>
          <tr><th>Fornecedor</th><td>${fatura.fornecedor?.nome || '-'}</td></tr>
          <tr><th>CNPJ/CPF</th><td>${fmtCNPJ(fatura.fornecedor?.cnpj)}</td></tr>
          <tr><th>Filial</th><td>${fatura.filial?.razaoSocial || '-'}</td></tr>
          <tr><th>UC</th><td>${fatura.uc?.uc || '-'} — ${fatura.uc?.numInstalacao || '-'}</td></tr>
          <tr><th>Valor</th><td style="font-size:1.1rem;font-weight:700;color:#1a365d;">${fmtCurrency(fatura.valor)}</td></tr>
          <tr><th>Referência</th><td>${fatura.referencia || '-'}</td></tr>
          <tr><th>Vencimento</th><td>${fmtDate(fatura.vencimento)}</td></tr>
          <tr><th>Nota Fiscal</th><td>${fatura.notaFiscal || '-'}</td></tr>
          <tr><th>Centro de Custo</th><td>${fatura.centroCusto ? `${fatura.centroCusto.numero} — ${fatura.centroCusto.descricao}` : '-'}</td></tr>
          <tr><th>Natureza</th><td>${fatura.natureza?.descricao || '-'}</td></tr>
        </table>
      </div>

      <div class="card">
        <h3 style="margin-bottom:16px;">📝 Tramitação / Assinaturas</h3>
        <div class="timeline">
          ${gerarEtapa('Lançado por', fatura.lancadoPor?.nome, fatura.dataLancamento, true)}
          ${gerarEtapa('Aprovado por', fatura.aprovadoPor?.nome, fatura.dataAprovacao, !!fatura.aprovadoPor)}
          ${gerarEtapa('Liberado por', fatura.liberadoPor?.nome, fatura.dataLiberacao, !!fatura.liberadoPor)}
          ${gerarEtapa('Baixado por', fatura.baixadoPor?.nome, fatura.dataBaixa, !!fatura.baixadoPor)}
          ${fatura.estornadoPor ? gerarEtapa('⚠️ Estornado por', fatura.estornadoPor?.nome, fatura.dataEstorno, true, true) : ''}
        </div>
      </div>
    `;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fatura ? '✅ Documento Válido' : '❌ Documento Inválido'} — Voltaris Energy</title>
  <style>${getCSS()}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 Verificação de Documento</h1>
      <p>Voltaris Energy — Excelência na gestão de faturas de energia</p>
    </div>
    ${content}
    <div class="card" style="text-align:center;">
      <a href="/verificar" style="color:#2563eb;text-decoration:none;font-weight:600;">← Verificar outro documento</a>
    </div>
    <div class="footer">
      Verificação realizada em ${fmtDateTime(new Date())}<br>
      Sistema Voltaris Energy — Verificação criptográfica de documentos
    </div>
  </div>
</body>
</html>`;
}

function gerarEtapa(label, nome, data, ativo, estorno) {
  return `
    <div class="timeline-item ${ativo ? 'active' : 'pending'} ${estorno ? 'estorno' : ''}">
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <strong>${label}:</strong>
        ${ativo && nome ? `<span>${nome.toUpperCase()}</span> — <span class="timeline-date">${fmtDateTime(data)}</span>` : '<span class="pending-text">Pendente</span>'}
      </div>
    </div>
  `;
}

function getCSS() {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; color: #1e293b; min-height: 100vh; }
    .container { max-width: 640px; margin: 0 auto; padding: 24px 16px; }
    .header { text-align: center; margin-bottom: 24px; }
    .header h1 { font-size: 1.5rem; color: #1e293b; }
    .header p { color: #64748b; font-size: 0.9rem; margin-top: 4px; }
    .card { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .card h3 { color: #1e293b; font-size: 1.05rem; }
    .result { text-align: center; padding: 32px 24px; border-radius: 12px; margin-bottom: 16px; }
    .result-icon { font-size: 3rem; margin-bottom: 12px; }
    .result.valid { background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 1px solid #6ee7b7; }
    .result.valid h2 { color: #065f46; }
    .result.valid p { color: #047857; }
    .result.invalid { background: linear-gradient(135deg, #fef2f2, #fecaca); border: 1px solid #fca5a5; }
    .result.invalid h2 { color: #991b1b; }
    .result.invalid p { color: #b91c1c; }
    .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 0.9rem; margin-bottom: 20px; }
    .info-table { width: 100%; border-collapse: collapse; }
    .info-table tr { border-bottom: 1px solid #f1f5f9; }
    .info-table tr:last-child { border: none; }
    .info-table th { text-align: left; padding: 10px 8px; color: #64748b; font-size: 0.85rem; font-weight: 500; width: 40%; vertical-align: top; }
    .info-table td { padding: 10px 8px; font-size: 0.92rem; }
    .timeline { position: relative; padding-left: 24px; }
    .timeline-item { position: relative; padding: 0 0 20px 16px; }
    .timeline-item:last-child { padding-bottom: 0; }
    .timeline-item::before { content: ''; position: absolute; left: -18px; top: 10px; bottom: -10px; width: 2px; background: #e2e8f0; }
    .timeline-item:last-child::before { display: none; }
    .timeline-dot { position: absolute; left: -24px; top: 6px; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #cbd5e1; background: #fff; }
    .timeline-item.active .timeline-dot { background: #10b981; border-color: #10b981; }
    .timeline-item.estorno .timeline-dot { background: #f59e0b; border-color: #f59e0b; }
    .timeline-content { font-size: 0.9rem; line-height: 1.5; }
    .timeline-date { color: #64748b; font-size: 0.82rem; }
    .pending-text { color: #94a3b8; font-style: italic; }
    .footer { text-align: center; color: #94a3b8; font-size: 0.78rem; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
  `;
}

module.exports = router;
