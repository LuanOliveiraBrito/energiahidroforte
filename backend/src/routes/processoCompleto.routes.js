const express = require('express');
const path = require('path');
const fs = require('fs');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const QRCode = require('qrcode');
const prisma = require('../config/database');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { atualizarHashVerificacao } = require('../utils/verificacaoHash');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authMiddleware);

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Caminhos das imagens
const LOGO_PATH = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'img', 'logo-voltaris.png');

// Formatar CNPJ
function formatCNPJ(cnpj) {
  if (!cnpj) return '';
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return cnpj;
}

// Formatar moeda BRL
function formatCurrency(value) {
  if (!value && value !== 0) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Formatar data
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// Formatar data + hora
function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const dia = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${dia} às ${hora}`;
}

// ========================================
// ========================================
// Gerar Capa de Processo como PDF
// ========================================
async function gerarCapaPDF(fatura, req) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const { width, height } = page.getSize();
  const M = 40;
  const W = width - M * 2;
  let y = height - 36;

  const preto = rgb(0, 0, 0);
  const borda = rgb(0.5, 0.5, 0.5);
  const cinzaTitulo = rgb(0.91, 0.91, 0.91);
  const cinzaLabel = rgb(0.96, 0.96, 0.96);
  const cinzaSub = rgb(0.93, 0.93, 0.93);
  const azulValor = rgb(0.102, 0.322, 0.463);
  const verdeCk = rgb(0, 0.573, 0.259);
  const branco = rgb(1, 1, 1);
  const valorBg = rgb(0.97, 0.97, 1);

  const fornecedor = fatura.fornecedor || {};
  const fp = fatura.formaPagamento || fornecedor.tipoPagamento || '';

  const ROW_H = 22;
  const LABEL_W = 135;
  const SECTION_H = 20;
  const T = 0.6; // espessura UNICA para TODAS as linhas

  // ===== UNICA funcao de linha =====
  function line(x1, y1, x2, y2) {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: T, color: borda });
  }

  function safeText(text, maxW, font, size) {
    let t = String(text || '');
    while (t.length > 0 && font.widthOfTextAtSize(t, size) > maxW) t = t.slice(0, -1);
    return t;
  }

  // ===== ROW: desenha tudo sozinha (topo, base, esquerda, direita, separador) =====
  function drawRow(label, value, yTop, opts = {}) {
    const lw = opts.labelWidth || LABEL_W;
    const rowH = opts.rowH || ROW_H;
    const bot = yTop - rowH;

    // Fundos
    page.drawRectangle({ x: M, y: bot, width: lw, height: rowH, color: opts.labelBg || cinzaLabel });
    if (opts.valueBg) page.drawRectangle({ x: M + lw, y: bot, width: W - lw, height: rowH, color: opts.valueBg });

    // 4 bordas + separador vertical (todas com mesma espessura e cor)
    line(M, yTop, M + W, yTop);       // topo
    line(M, bot, M + W, bot);         // base
    line(M, yTop, M, bot);            // esquerda
    line(M + W, yTop, M + W, bot);    // direita
    line(M + lw, yTop, M + lw, bot);  // separador label|value

    // Textos
    const ty = bot + (rowH / 2) - 3.5;
    page.drawText(label, { x: M + 8, y: ty, size: 9, font: fontBold, color: preto });
    const vf = opts.valueFont || fontNormal;
    const vs = opts.valueSize || 9.5;
    const vc = opts.valueColor || preto;
    page.drawText(safeText(value, W - lw - 16, vf, vs), { x: M + lw + 8, y: bot + (rowH / 2) - (vs / 2) + 1, size: vs, font: vf, color: vc });

    return bot;
  }

  // ===== ROW DUPLA =====
  function drawRowDouble(l1, v1, l2, v2, yTop) {
    const rowH = ROW_H;
    const bot = yTop - rowH;
    const half = W / 2;
    const lw = 110;

    // Fundos labels
    page.drawRectangle({ x: M, y: bot, width: lw, height: rowH, color: cinzaLabel });
    page.drawRectangle({ x: M + half, y: bot, width: lw, height: rowH, color: cinzaLabel });

    // Bordas externas
    line(M, yTop, M + W, yTop);          // topo
    line(M, bot, M + W, bot);            // base
    line(M, yTop, M, bot);               // esquerda
    line(M + W, yTop, M + W, bot);       // direita
    // Separadores internos
    line(M + lw, yTop, M + lw, bot);     // label1|value1
    line(M + half, yTop, M + half, bot); // value1|label2
    line(M + half + lw, yTop, M + half + lw, bot); // label2|value2

    const ty = bot + (rowH / 2) - 3.5;
    page.drawText(l1, { x: M + 6, y: ty, size: 8.5, font: fontBold, color: preto });
    page.drawText(safeText(v1, half - lw - 12, fontNormal, 9.5), { x: M + lw + 6, y: ty, size: 9.5, font: fontNormal, color: preto });
    page.drawText(l2, { x: M + half + 6, y: ty, size: 8.5, font: fontBold, color: preto });
    page.drawText(safeText(v2, half - lw - 12, fontNormal, 9.5), { x: M + half + lw + 6, y: ty, size: 9.5, font: fontNormal, color: preto });

    return bot;
  }

  // ===== TITULO DE SECAO =====
  function drawSectionTitle(text, yTop) {
    const bot = yTop - SECTION_H;
    page.drawRectangle({ x: M, y: bot, width: W, height: SECTION_H, color: cinzaTitulo });
    line(M, yTop, M + W, yTop);
    line(M, bot, M + W, bot);
    line(M, yTop, M, bot);
    line(M + W, yTop, M + W, bot);
    const tw = fontBold.widthOfTextAtSize(text, 11);
    page.drawText(text, { x: M + (W - tw) / 2, y: bot + (SECTION_H / 2) - 4, size: 11, font: fontBold, color: preto });
    return bot;
  }

  // ===== BLOCO generico (cabecalho, checkbox area) =====
  function drawBlock(yTop, h) {
    const bot = yTop - h;
    line(M, yTop, M + W, yTop);
    line(M, bot, M + W, bot);
    line(M, yTop, M, bot);
    line(M + W, yTop, M + W, bot);
    return bot;
  }

  // ===== CHECKBOX =====
  function drawCheckbox(label, checked, x, yCenter) {
    const sz = 13, bx = x, by = yCenter - sz / 2;
    if (checked) {
      page.drawRectangle({ x: bx, y: by, width: sz, height: sz, color: rgb(0.91, 0.96, 0.91), borderColor: verdeCk, borderWidth: T });
      page.drawText('X', { x: bx + 2.5, y: by + 2.5, size: 9, font: fontBold, color: verdeCk });
    } else {
      page.drawRectangle({ x: bx, y: by, width: sz, height: sz, color: branco, borderColor: borda, borderWidth: T });
    }
    page.drawText(label, { x: bx + sz + 6, y: yCenter - 4, size: 10, font: fontBold, color: preto });
  }

  // =============================================
  // DESENHO
  // =============================================

  // CABECALHO
  const headerH = 46;
  const hBot = drawBlock(y, headerH);
  try {
    if (fs.existsSync(LOGO_PATH)) {
      const logoImg = await pdfDoc.embedPng(fs.readFileSync(LOGO_PATH));
      const lh = 36, ls = lh / logoImg.height, lw = logoImg.width * ls;
      page.drawImage(logoImg, { x: M + 8, y: hBot + (headerH - lh) / 2, width: lw, height: lh });
      page.drawText('FORNECEDOR', { x: M + 8 + lw + 10, y: hBot + (headerH / 2) - 6, size: 16, font: fontBold, color: preto });
    } else {
      page.drawText('FORNECEDOR', { x: M + 14, y: hBot + (headerH / 2) - 6, size: 16, font: fontBold, color: preto });
    }
  } catch (e) {
    page.drawText('FORNECEDOR', { x: M + 14, y: hBot + (headerH / 2) - 6, size: 16, font: fontBold, color: preto });
  }
  y = hBot;

  // FORNECEDOR
  y = drawRow('NOME:', fornecedor.nome, y);
  y = drawRow('CNPJ/CPF:', formatCNPJ(fornecedor.cnpj), y);
  y = drawRow('PEDIDO DE COMPRAS:', fatura.pedidoCompras, y);

  // PAGAMENTO
  y = drawSectionTitle('PAGAMENTO', y);

  // Checkboxes pagamento
  const ckH = 28;
  const ckBot = drawBlock(y, ckH);
  const ckC = y - ckH / 2;
  drawCheckbox('TRANSF. (TED)', fp === 'TED', M + 60, ckC);
  drawCheckbox('BOLETO', fp === 'BOLETO', M + 210, ckC);
  drawCheckbox('PIX', fp === 'PIX', M + 340, ckC);
  y = ckBot;

  // Subtitulo conforme forma de pagamento
  const subTitulo = fp === 'PIX' ? 'DADOS PIX' : fp === 'BOLETO' ? 'DADOS DO BOLETO' : 'DADOS BANCARIOS';
  const subH = 18;
  const subBot = y - subH;
  page.drawRectangle({ x: M, y: subBot, width: W, height: subH, color: cinzaSub });
  line(M, y, M + W, y);
  line(M, subBot, M + W, subBot);
  line(M, y, M, subBot);
  line(M + W, y, M + W, subBot);
  const stw = fontBold.widthOfTextAtSize(subTitulo, 9.5);
  page.drawText(subTitulo, { x: M + (W - stw) / 2, y: subBot + 5, size: 9.5, font: fontBold, color: preto });
  y = subBot;

  // Rows condicionais por forma de pagamento
  if (fp === 'PIX') {
    // PIX: só mostra dados de PIX + CNPJ
    y = drawRow('CHAVE PIX:', fornecedor.chavePix, y);
    y = drawRow('TIPO CHAVE PIX:', fornecedor.tipoChavePix, y);
    y = drawRow('CNPJ/CPF:', formatCNPJ(fornecedor.cnpj), y);
  } else if (fp === 'TED') {
    // TED: só mostra dados bancários (sem PIX)
    y = drawRow('BANCO:', fornecedor.banco, y);
    y = drawRow('AGENCIA:', fornecedor.agencia, y);
    y = drawRow('CONTA:', fornecedor.conta, y);
    y = drawRow('TIPO DE CONTA:', fornecedor.tipoConta, y);
    y = drawRow('OP:', fornecedor.op, y);
    y = drawRow('CNPJ/CPF:', formatCNPJ(fornecedor.cnpj), y);
  } else if (fp === 'BOLETO') {
    // BOLETO: mostrar código de barras e validade
    // Formatar linha digitável
    let ldFormatado = fatura.codigoBarras || '';
    if (ldFormatado) {
      const ld = ldFormatado.replace(/\D/g, '');
      if (ld.length === 47) {
        ldFormatado = `${ld.slice(0,5)}.${ld.slice(5,10)} ${ld.slice(10,15)}.${ld.slice(15,21)} ${ld.slice(21,26)}.${ld.slice(26,32)} ${ld.slice(32,33)} ${ld.slice(33)}`;
      }
    }

    y = drawRow('COD. BARRAS:', ldFormatado, y, { valueFont: fontBold, valueSize: 9 });

    // Validade do boleto
    let vencBoleto = '';
    if (fatura.vencimentoBoleto) {
      const parts = fatura.vencimentoBoleto.split('-');
      if (parts.length === 3) {
        vencBoleto = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } else {
        vencBoleto = fatura.vencimentoBoleto;
      }
    }
    y = drawRow('VALIDADE BOLETO:', vencBoleto, y);
  } else {
    // Outros: mostra dados bancários padrão
    y = drawRow('BANCO:', fornecedor.banco, y);
    y = drawRow('AGENCIA:', fornecedor.agencia, y);
    y = drawRow('CONTA:', fornecedor.conta, y);
    y = drawRow('TIPO DE CONTA:', fornecedor.tipoConta, y);
    y = drawRow('OP:', fornecedor.op, y);
    y = drawRow('CNPJ/CPF:', formatCNPJ(fornecedor.cnpj), y);
  }

  // DADOS DA FATURA
  y = drawSectionTitle('DADOS DA FATURA', y);
  y = drawRow('VALOR:', formatCurrency(fatura.valor), y, { valueBg: valorBg, valueFont: fontBold, valueSize: 13, valueColor: azulValor });
  y = drawRow('FILIAL:', fatura.filial?.razaoSocial, y);

  // Código de barras — só mostra aqui se NÃO for BOLETO (pois já aparece na seção de pagamento)
  if (fatura.codigoBarras && fp !== 'BOLETO') {
    let ldCapa = fatura.codigoBarras;
    const ldNum = ldCapa.replace(/\D/g, '');
    if (ldNum.length === 47) {
      ldCapa = `${ldNum.slice(0,5)}.${ldNum.slice(5,10)} ${ldNum.slice(10,15)}.${ldNum.slice(15,21)} ${ldNum.slice(21,26)}.${ldNum.slice(26,32)} ${ldNum.slice(32,33)} ${ldNum.slice(33)}`;
    }
    y = drawRow('COD. BARRAS:', ldCapa, y, { valueFont: fontBold, valueSize: 8.5 });
  }

  // APLICACAO
  y = drawSectionTitle('APLICACAO', y);
  const appBot = drawBlock(y, 28);
  const appC = y - 14;
  drawCheckbox('CAPEX', fatura.aplicacao === 'CAPEX', M + 120, appC);
  drawCheckbox('OPEX', fatura.aplicacao === 'OPEX', M + 290, appC);
  y = appBot;

  // CONTABILIDADE
  y = drawSectionTitle('CONTABILIDADE', y);
  y = drawRow('CENTRO DE CUSTO:', fatura.centroCusto ? `${fatura.centroCusto.numero} - ${fatura.centroCusto.descricao}` : '', y);
  y = drawRow('CONTA CONTABIL:', fatura.contaContabil ? `${fatura.contaContabil.numero} - ${fatura.contaContabil.descricao}` : '', y);
  y = drawRow('NATUREZA:', fatura.natureza?.descricao, y);
  y = drawRow('VENCIMENTO:', formatDate(fatura.vencimento), y);

  // ASSINATURAS DO WORKFLOW
  y = drawSectionTitle('TRAMITACAO / ASSINATURAS', y);

  const assinaturas = [
    { etapa: 'LANCADO POR:', nome: fatura.lancadoPor?.nome, data: fatura.dataLancamento },
    { etapa: 'APROVADO POR:', nome: fatura.aprovadoPor?.nome, data: fatura.dataAprovacao },
    { etapa: 'LIBERADO POR:', nome: fatura.liberadoPor?.nome, data: fatura.dataLiberacao },
    { etapa: 'BAIXADO POR:', nome: fatura.baixadoPor?.nome, data: fatura.dataBaixa },
  ];

  for (const ass of assinaturas) {
    const valor = ass.nome ? `${ass.nome.toUpperCase()}  —  ${formatDateTime(ass.data)}` : '';
    y = drawRow(ass.etapa, valor, y, { valueFont: fontBold, valueSize: 9, valueColor: ass.nome ? verdeCk : preto });
  }

  // VERIFICAÇÃO CRIPTOGRÁFICA
  if (fatura.hashVerificacao) {
    y = drawSectionTitle('VERIFICACAO DE AUTENTICIDADE', y);

    const BASE_URL = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const verificacaoUrl = `${BASE_URL}/verificar/${fatura.hashVerificacao}`;

    // Gerar QR Code como PNG buffer
    try {
      const qrBuffer = await QRCode.toBuffer(verificacaoUrl, {
        width: 120,
        margin: 1,
        color: { dark: '#1a365d', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });

      const qrImage = await pdfDoc.embedPng(qrBuffer);
      const qrSize = 80;
      const qrX = M + 12;
      const qrY = y - qrSize - 10;

      page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });

      // Texto ao lado do QR Code
      const txtX = qrX + qrSize + 16;
      const txtY = y - 18;

      page.drawText('Escaneie o QR Code para verificar', { x: txtX, y: txtY, size: 9, font: fontBold, color: preto });
      page.drawText('a autenticidade deste documento.', { x: txtX, y: txtY - 13, size: 9, font: fontNormal, color: preto });

      page.drawText('Código de Verificação:', { x: txtX, y: txtY - 32, size: 8, font: fontNormal, color: borda });
      page.drawText(fatura.hashVerificacao, { x: txtX, y: txtY - 46, size: 14, font: fontBold, color: azulValor });

      page.drawText(verificacaoUrl, { x: txtX, y: txtY - 62, size: 6.5, font: fontNormal, color: borda });

      // Borda ao redor da seção
      const secBot = qrY - 10;
      line(M, y, M + W, y);
      line(M, secBot, M + W, secBot);
      line(M, y, M, secBot);
      line(M + W, y, M + W, secBot);

      y = secBot;
    } catch (qrErr) {
      console.warn('Erro ao gerar QR Code:', qrErr.message);
    }
  }

  // PROTOCOLO
  const protocoloLabel = fatura.numeroProtocolo || `FAT-${String(fatura.id).padStart(6, '0')}`;
  y = drawRow('N. PROTOCOLO:', protocoloLabel, y);
  y = drawRow('DATA ENVIO:', formatDate(new Date()), y);

  return await pdfDoc.save();
}

// ========================================
// GET /api/faturas/:id/processo-completo
// ========================================
router.get('/:id/processo-completo', async (req, res) => {
  try {
    const faturaId = parseInt(req.params.id);

    if (isNaN(faturaId)) {
      return res.status(400).json({ error: true, message: 'ID inválido' });
    }

    const fatura = await prisma.fatura.findUnique({
      where: { id: faturaId },
      include: {
        fornecedor: true,
        filial: true,
        uc: true,
        centroCusto: true,
        contaContabil: true,
        natureza: true,
        lancadoPor: { select: { nome: true } },
        aprovadoPor: { select: { nome: true } },
        liberadoPor: { select: { nome: true } },
        protocoladoPor: { select: { nome: true } },
        baixadoPor: { select: { nome: true } },
      },
    });

    if (!fatura) {
      return res.status(404).json({ error: true, message: 'Fatura nao encontrada' });
    }

    // Se a fatura não tem hash de verificação, gerar agora
    if (!fatura.hashVerificacao) {
      const hash = await atualizarHashVerificacao(faturaId);
      fatura.hashVerificacao = hash;
    }

    // 1) Gerar Capa de Processo como PDF
    console.log(`📄 Gerando processo completo para fatura #${faturaId}...`);
    const capaPdfBytes = await gerarCapaPDF(fatura, req);
    console.log(`✅ Capa gerada (${capaPdfBytes.length} bytes)`);

    // 2) Criar o PDF final mesclando tudo
    const mergedPdf = await PDFDocument.create();

    // Adicionar Capa de Processo (sempre primeiro)
    const capaDoc = await PDFDocument.load(capaPdfBytes);
    const capaPages = await mergedPdf.copyPages(capaDoc, capaDoc.getPageIndices());
    capaPages.forEach((p) => mergedPdf.addPage(p));

    // 3) Adicionar Fatura (sempre após a capa)
    if (fatura.anexoFatura) {
      const faturaPath = path.join(UPLOADS_DIR, fatura.anexoFatura);
      if (fs.existsSync(faturaPath)) {
        try {
          const faturaBytes = fs.readFileSync(faturaPath);
          const faturaDoc = await PDFDocument.load(faturaBytes, { ignoreEncryption: true });
          const faturaPages = await mergedPdf.copyPages(faturaDoc, faturaDoc.getPageIndices());
          faturaPages.forEach((p) => mergedPdf.addPage(p));
          console.log(`📎 Fatura anexada (${faturaPages.length} paginas)`);
        } catch (err) {
          console.warn(`⚠️ Erro ao anexar fatura: ${err.message}`);
        }
      }
    }

    // 4) Adicionar Pedido de Compras (se existir, após a fatura)
    if (fatura.anexoPedidoCompras) {
      const pedidoPath = path.join(UPLOADS_DIR, fatura.anexoPedidoCompras);
      if (fs.existsSync(pedidoPath)) {
        try {
          const pedidoBytes = fs.readFileSync(pedidoPath);
          const pedidoDoc = await PDFDocument.load(pedidoBytes, { ignoreEncryption: true });
          const pedidoPages = await mergedPdf.copyPages(pedidoDoc, pedidoDoc.getPageIndices());
          pedidoPages.forEach((p) => mergedPdf.addPage(p));
          console.log(`📎 Pedido de Compras anexado (${pedidoPages.length} paginas)`);
        } catch (err) {
          console.warn(`⚠️ Erro ao anexar pedido de compras: ${err.message}`);
        }
      }
    }

    // 5) Gerar o PDF final
    const mergedPdfBytes = await mergedPdf.save();
    console.log(`✅ Processo completo: ${mergedPdfBytes.length} bytes, ${mergedPdf.getPageCount()} paginas`);

    // Retornar como JSON com base64 para evitar que o IDM intercepte
    const base64Pdf = Buffer.from(mergedPdfBytes).toString('base64');
    res.setHeader('Content-Type', 'application/json');
    res.json({ pdf: base64Pdf, pages: mergedPdf.getPageCount(), size: mergedPdfBytes.length });

  } catch (err) {
    logger.error('GET /api/faturas/:id/processo-completo', err);
    res.status(500).json({ error: true, message: 'Erro ao gerar processo completo' });
  }
});

module.exports = router;
