const express = require('express');
const prisma = require('../config/database');
const { authMiddleware, authorize } = require('../middlewares/auth.middleware');
const ExcelJS = require('exceljs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const logger = require('../utils/logger');

// Todos os perfis com acesso a Relatórios
const TODOS_PERFIS = ['ADMINISTRADOR', 'ADMINISTRATIVO', 'GERENTE_ADM', 'DIRETOR', 'FINANCEIRO'];

const router = express.Router();

router.use(authMiddleware);

// GET /api/relatorios/logs - Logs de auditoria
router.get('/logs', authorize(...TODOS_PERFIS), async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, acao, faturaId, dataInicio, dataFim } = req.query;

    const where = {};
    if (userId) where.userId = parseInt(userId);
    if (acao) where.acao = acao;
    if (faturaId) where.faturaId = parseInt(faturaId);
    if (dataInicio || dataFim) {
      where.createdAt = {};
      if (dataInicio) where.createdAt.gte = new Date(dataInicio);
      if (dataFim) where.createdAt.lte = new Date(dataFim + 'T23:59:59');
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, nome: true, email: true, role: true } },
          fatura: {
            select: {
              id: true,
              valor: true,
              referencia: true,
              status: true,
              fornecedor: { select: { nome: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    logger.error('GET /api/relatorios (logs)', err);
    res.status(500).json({ error: true, message: 'Erro ao buscar logs' });
  }
});

// GET /api/relatorios/faturas - Relatório de faturas
router.get('/faturas', authorize(...TODOS_PERFIS), async (req, res) => {
  try {
    const {
      status,
      filialId,
      fornecedorId,
      naturezaId,
      ucId,
      referencia,       // mês referência exato (ex: "2026-02")
      refInicio,
      refFim,
      dataInicio,       // intervalo de datas de vencimento
      dataFim,
      competencia,      // mês de competência (mesmo que referência, atalho)
      page = 1,
      limit = 50,
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (filialId) where.filialId = parseInt(filialId);
    if (fornecedorId) where.fornecedorId = parseInt(fornecedorId);
    if (naturezaId) where.naturezaId = parseInt(naturezaId);
    if (ucId) where.ucId = parseInt(ucId);

    // Referência exata ou competência
    if (referencia) {
      where.referencia = referencia;
    } else if (competencia) {
      where.referencia = competencia;
    } else if (refInicio || refFim) {
      where.referencia = {};
      if (refInicio) where.referencia.gte = refInicio;
      if (refFim) where.referencia.lte = refFim;
    }

    // Intervalo de data de vencimento
    if (dataInicio || dataFim) {
      where.vencimento = {};
      if (dataInicio) where.vencimento.gte = new Date(dataInicio);
      if (dataFim) where.vencimento.lte = new Date(dataFim + 'T23:59:59');
    }

    const [faturas, total, totais] = await Promise.all([
      prisma.fatura.findMany({
        where,
        include: {
          uc: { select: { uc: true, numInstalacao: true } },
          fornecedor: { select: { nome: true, cnpj: true, tipoPagamento: true } },
          filial: { select: { razaoSocial: true } },
          natureza: { select: { descricao: true } },
          centroCusto: { select: { numero: true, descricao: true } },
          contaContabil: { select: { numero: true, descricao: true } },
          lancadoPor: { select: { nome: true } },
          aprovadoPor: { select: { nome: true } },
          liberadoPor: { select: { nome: true } },
          protocoladoPor: { select: { nome: true } },
          baixadoPor: { select: { nome: true } },
          baixadoPor: { select: { nome: true } },
        },
        orderBy: { vencimento: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.fatura.count({ where }),
      // Totais excluem REJEITADAS (não representam valores reais)
      prisma.fatura.aggregate({
        where: { ...where, status: { not: 'REJEITADA' } },
        _sum: { valor: true },
        _avg: { valor: true, leituraKwh: true },
        _count: { id: true },
      }),
    ]);

    res.json({
      data: faturas,
      totais: {
        somaValor: totais._sum.valor || 0,
        mediaValor: totais._avg.valor || 0,
        mediaKwh: totais._avg.leituraKwh || 0,
        quantidade: totais._count.id,
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    logger.error('GET /api/relatorios/faturas', err);
    res.status(500).json({ error: true, message: 'Erro ao gerar relatório' });
  }
});

// ===== Helper: build where clause for faturas =====
function buildFaturasWhere(query) {
  const { status, filialId, fornecedorId, naturezaId, ucId, referencia, refInicio, refFim, dataInicio, dataFim, competencia } = query;
  const where = {};
  if (status) where.status = status;
  if (filialId) where.filialId = parseInt(filialId);
  if (fornecedorId) where.fornecedorId = parseInt(fornecedorId);
  if (naturezaId) where.naturezaId = parseInt(naturezaId);
  if (ucId) where.ucId = parseInt(ucId);
  if (referencia) {
    where.referencia = referencia;
  } else if (competencia) {
    where.referencia = competencia;
  } else if (refInicio || refFim) {
    where.referencia = {};
    if (refInicio) where.referencia.gte = refInicio;
    if (refFim) where.referencia.lte = refFim;
  }
  if (dataInicio || dataFim) {
    where.vencimento = {};
    if (dataInicio) where.vencimento.gte = new Date(dataInicio);
    if (dataFim) where.vencimento.lte = new Date(dataFim + 'T23:59:59');
  }
  return where;
}

const FATURAS_INCLUDE = {
  uc: { select: { uc: true, numInstalacao: true } },
  fornecedor: { select: { nome: true, cnpj: true, tipoPagamento: true } },
  filial: { select: { razaoSocial: true } },
  natureza: { select: { descricao: true } },
  centroCusto: { select: { numero: true, descricao: true } },
  contaContabil: { select: { numero: true, descricao: true } },
  lancadoPor: { select: { nome: true } },
  aprovadoPor: { select: { nome: true } },
  liberadoPor: { select: { nome: true } },
  protocoladoPor: { select: { nome: true } },
  baixadoPor: { select: { nome: true } },
};

// GET /api/relatorios/faturas/export/excel
router.get('/faturas/export/excel', authorize(...TODOS_PERFIS), async (req, res) => {
  try {
    const where = buildFaturasWhere(req.query);
    const faturas = await prisma.fatura.findMany({
      where,
      include: FATURAS_INCLUDE,
      orderBy: { vencimento: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Voltaris Energy';
    const sheet = workbook.addWorksheet('Relatório de Faturas');

    // Header style
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      },
    };

    const columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Referência', key: 'referencia', width: 14 },
      { header: 'Filial', key: 'filial', width: 30 },
      { header: 'Fornecedor', key: 'fornecedor', width: 25 },
      { header: 'UC', key: 'uc', width: 20 },
      { header: 'Nota Fiscal', key: 'notaFiscal', width: 16 },
      { header: 'Valor (R$)', key: 'valor', width: 16 },
      { header: 'kWh', key: 'kwh', width: 12 },
      { header: 'Vencimento', key: 'vencimento', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Centro Custo', key: 'centroCusto', width: 20 },
      { header: 'Conta Contábil', key: 'contaContabil', width: 20 },
    ];
    sheet.columns = columns;

    // Apply header style
    sheet.getRow(1).eachCell(cell => { Object.assign(cell, headerStyle); });

    // Data rows
    faturas.forEach(f => {
      sheet.addRow({
        id: f.id,
        referencia: f.referencia || '',
        filial: f.filial?.razaoSocial || '',
        fornecedor: f.fornecedor?.nome || '',
        uc: f.uc?.uc || '',
        notaFiscal: f.notaFiscal || '',
        valor: Number(f.valor) || 0,
        kwh: f.leituraKwh ? Number(f.leituraKwh) : 0,
        vencimento: f.vencimento ? new Date(f.vencimento).toLocaleDateString('pt-BR') : '',
        status: f.status,
        centroCusto: f.centroCusto ? `${f.centroCusto.numero} - ${f.centroCusto.descricao}` : '',
        contaContabil: f.contaContabil ? `${f.contaContabil.numero} - ${f.contaContabil.descricao}` : '',
      });
    });

    // Format currency column
    sheet.getColumn('valor').numFmt = '#,##0.00';
    sheet.getColumn('kwh').numFmt = '#,##0.00';

    // Totals row
    const totalRow = sheet.addRow({
      id: '',
      referencia: '',
      filial: '',
      fornecedor: '',
      uc: '',
      notaFiscal: 'TOTAIS',
      valor: faturas.filter(f => f.status !== 'REJEITADA').reduce((s, f) => s + (Number(f.valor) || 0), 0),
      kwh: faturas.filter(f => f.status !== 'REJEITADA').reduce((s, f) => s + (Number(f.leituraKwh) || 0), 0),
      vencimento: '',
      status: `${faturas.filter(f => f.status !== 'REJEITADA').length} faturas`,
    });
    totalRow.font = { bold: true };

    // Zebra striping
    sheet.eachRow((row, idx) => {
      if (idx > 1 && idx <= faturas.length + 1) {
        row.eachCell(cell => {
          cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
          if (idx % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
          }
        });
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=relatorio_faturas_${new Date().toISOString().slice(0, 10)}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    logger.error('GET /api/relatorios/faturas/export/excel', err);
    res.status(500).json({ error: true, message: 'Erro ao exportar Excel' });
  }
});

// GET /api/relatorios/faturas/export/pdf
router.get('/faturas/export/pdf', authorize(...TODOS_PERFIS), async (req, res) => {
  try {
    const where = buildFaturasWhere(req.query);
    const faturas = await prisma.fatura.findMany({
      where,
      include: FATURAS_INCLUDE,
      orderBy: { vencimento: 'desc' },
    });

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const PAGE_W = 842; // A4 landscape width
    const PAGE_H = 595; // A4 landscape height
    const ROW_H = 16;
    const HEADER_H = 20;
    const TEXT_OFFSET = 5; // vertical offset from bottom of row to text baseline

    const cols = [
      { label: 'ID', w: 35, align: 'center' },
      { label: 'Ref.', w: 55, align: 'center' },
      { label: 'Filial', w: 150, align: 'left' },
      { label: 'Fornecedor', w: 130, align: 'left' },
      { label: 'UC', w: 90, align: 'left' },
      { label: 'NF', w: 70, align: 'center' },
      { label: 'Valor (R$)', w: 80, align: 'right' },
      { label: 'kWh', w: 55, align: 'right' },
      { label: 'Vencimento', w: 70, align: 'center' },
      { label: 'Status', w: 65, align: 'center' },
    ];

    const TABLE_W = cols.reduce((s, c) => s + c.w, 0);
    const MARGIN = Math.floor((PAGE_W - TABLE_W) / 2); // centraliza a tabela

    // Sanitize text: remove characters not supported by WinAnsiEncoding
    function sanitize(str) {
      if (!str) return '-';
      try {
        // Replace problematic characters
        return String(str)
          .replace(/[\u2018\u2019]/g, "'")
          .replace(/[\u201C\u201D]/g, '"')
          .replace(/\u2013/g, '-')
          .replace(/\u2014/g, '--')
          .replace(/\u2026/g, '...')
          .replace(/[^\x00-\xFF]/g, ''); // Remove anything outside Latin-1
      } catch {
        return '-';
      }
    }

    function fmtCurrency(v) {
      return (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function fmtDate(d) {
      if (!d) return '-';
      return new Date(d).toLocaleDateString('pt-BR');
    }
    function truncate(str, maxLen) {
      const s = sanitize(str);
      return s.length > maxLen ? s.substring(0, maxLen - 2) + '..' : s;
    }

    function textWidth(f, text, size) {
      try {
        return f.widthOfTextAtSize(sanitize(text), size);
      } catch {
        return 0;
      }
    }

    function safeDraw(pg, text, options) {
      try {
        const clean = sanitize(text);
        if (clean) pg.drawText(clean, options);
      } catch (e) {
        // Skip if character encoding fails
      }
    }

    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MARGIN;

    function drawTitle(pg, yPos) {
      safeDraw(pg, 'Relatorio de Faturas - Voltaris Energy', { x: MARGIN, y: yPos, size: 14, font: fontBold, color: rgb(0.15, 0.39, 0.92) });
      safeDraw(pg, 'Gerado em: ' + new Date().toLocaleString('pt-BR'), { x: MARGIN, y: yPos - 16, size: 8, font, color: rgb(0.5, 0.5, 0.5) });
      return yPos - 36;
    }

    function drawTableHeader(pg, yPos) {
      pg.drawRectangle({ x: MARGIN, y: yPos - HEADER_H, width: TABLE_W, height: HEADER_H, color: rgb(0.15, 0.39, 0.92) });
      let x = MARGIN;
      cols.forEach(col => {
        let tx = x + 3;
        const w = textWidth(fontBold, col.label, 8);
        if (col.align === 'center') tx = x + col.w / 2 - w / 2;
        if (col.align === 'right') tx = x + col.w - 3 - w;
        safeDraw(pg, col.label, { x: tx, y: yPos - HEADER_H + TEXT_OFFSET, size: 8, font: fontBold, color: rgb(1, 1, 1) });
        x += col.w;
      });
      return yPos - HEADER_H;
    }

    function drawRow(pg, yPos, rowData, isEven) {
      if (isEven) {
        pg.drawRectangle({ x: MARGIN, y: yPos - ROW_H, width: TABLE_W, height: ROW_H, color: rgb(0.95, 0.95, 0.95) });
      }
      let x = MARGIN;
      cols.forEach((col, i) => {
        const text = sanitize(rowData[i]);
        let tx = x + 3;
        const w = textWidth(font, text, 7.5);
        if (col.align === 'center') tx = x + col.w / 2 - w / 2;
        if (col.align === 'right') tx = x + col.w - 3 - w;
        safeDraw(pg, text, { x: tx, y: yPos - ROW_H + TEXT_OFFSET, size: 7.5, font, color: rgb(0.1, 0.1, 0.1) });
        x += col.w;
      });
      return yPos - ROW_H;
    }

    y = drawTitle(page, y);
    y = drawTableHeader(page, y);

    for (let i = 0; i < faturas.length; i++) {
      if (y < MARGIN + ROW_H + 30) {
        safeDraw(page, 'Pagina ' + pdfDoc.getPageCount(), { x: PAGE_W - MARGIN - 50, y: 20, size: 7, font, color: rgb(0.5, 0.5, 0.5) });
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
        y = drawTitle(page, y);
        y = drawTableHeader(page, y);
      }
      const f = faturas[i];
      const rowData = [
        String(f.id),
        f.referencia || '-',
        truncate(f.filial?.razaoSocial, 28),
        truncate(f.fornecedor?.nome, 24),
        truncate(f.uc?.uc, 16),
        f.notaFiscal || '-',
        fmtCurrency(f.valor),
        f.leituraKwh ? String(Number(f.leituraKwh).toFixed(1)) : '-',
        fmtDate(f.vencimento),
        f.status || '-',
      ];
      y = drawRow(page, y, rowData, i % 2 === 0);
    }

    // Totals row
    if (y < MARGIN + ROW_H + 30) {
      safeDraw(page, 'Pagina ' + pdfDoc.getPageCount(), { x: PAGE_W - MARGIN - 50, y: 20, size: 7, font, color: rgb(0.5, 0.5, 0.5) });
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
      y = drawTitle(page, y);
      y = drawTableHeader(page, y);
    }
    page.drawRectangle({ x: MARGIN, y: y - ROW_H, width: TABLE_W, height: ROW_H, color: rgb(0.15, 0.39, 0.92) });
    const faturasValidas = faturas.filter(f => f.status !== 'REJEITADA');
    const somaValor = faturasValidas.reduce((s, f) => s + (Number(f.valor) || 0), 0);
    const somaKwh = faturasValidas.reduce((s, f) => s + (Number(f.leituraKwh) || 0), 0);
    const totaisLabels = ['', '', '', '', '', 'TOTAIS', fmtCurrency(somaValor), String(somaKwh.toFixed(1)), '', faturasValidas.length + ' fat.'];
    let x = MARGIN;
    cols.forEach((col, i) => {
      const text = sanitize(totaisLabels[i]);
      let tx = x + 3;
      const w = textWidth(fontBold, text, 8);
      if (col.align === 'center') tx = x + col.w / 2 - w / 2;
      if (col.align === 'right') tx = x + col.w - 3 - w;
      safeDraw(page, text, { x: tx, y: y - ROW_H + TEXT_OFFSET, size: 8, font: fontBold, color: rgb(1, 1, 1) });
      x += col.w;
    });

    // Page number on last page
    safeDraw(page, 'Pagina ' + pdfDoc.getPageCount(), { x: PAGE_W - MARGIN - 50, y: 20, size: 7, font, color: rgb(0.5, 0.5, 0.5) });

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio_faturas_' + new Date().toISOString().slice(0, 10) + '.pdf');
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    logger.error('GET /api/relatorios/faturas/export/pdf', err);
    res.status(500).json({ error: true, message: 'Erro ao exportar PDF' });
  }
});

module.exports = router;
