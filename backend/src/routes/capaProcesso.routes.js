const express = require('express');
const path = require('path');
const ExcelJS = require('exceljs');
const prisma = require('../config/database');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

const TEMPLATE_PATH = path.join(__dirname, '..', '..', 'templates', 'capa-processo-modelo.xlsx');

// GET /api/faturas/:id/capa-processo
router.get('/:id/capa-processo', async (req, res) => {
  try {
    const faturaId = parseInt(req.params.id);

    const fatura = await prisma.fatura.findUnique({
      where: { id: faturaId },
      include: {
        fornecedor: true,
        filial: { select: { razaoSocial: true } },
        centroCusto: { select: { numero: true, descricao: true } },
        contaContabil: { select: { numero: true, descricao: true } },
        natureza: { select: { descricao: true } },
      },
    });

    if (!fatura) {
      return res.status(404).json({ error: true, message: 'Fatura não encontrada' });
    }

    // Carregar template
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(TEMPLATE_PATH);

    const ws = workbook.getWorksheet('CAPA');

    if (!ws) {
      return res.status(500).json({ error: true, message: 'Template inválido: aba CAPA não encontrada' });
    }

    // ========================================
    // PREENCHER DADOS NA CAPA
    // ========================================

    // FORNECEDOR
    // Row 2: B2 = "NOME:", C2 = nome do fornecedor
    ws.getCell('C2').value = fatura.fornecedor?.nome || '';

    // Row 3: B3 = "CNPJ/CPF:", C3 = cnpj formatado
    const cnpj = fatura.fornecedor?.cnpj || '';
    ws.getCell('C3').value = cnpj.length === 14
      ? cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
      : cnpj;

    // Row 4: PEDIDO DE COMPRAS (B4 é label, vamos colocar o valor ao lado)
    // Na verdade o template mostra o nº do pedido de compras - colocar em C4
    ws.getCell('C4').value = fatura.pedidoCompras || '';

    // Row 5: PAGAMENTO (label)
    // Row 6: TRANSF (TED) checkbox D6, BOLETO checkbox F6, PIX checkbox H6
    const fp = fatura.formaPagamento || fatura.fornecedor?.tipoPagamento || '';
    ws.getCell('D6').value = fp === 'TED';
    ws.getCell('F6').value = fp === 'BOLETO';
    ws.getCell('H6').value = fp === 'PIX';

    // Dados bancários / boleto — condicional por forma de pagamento
    if (fp === 'BOLETO') {
      // Limpar campos bancários (não se aplicam a boleto)
      ws.getCell('B8').value = '';
      ws.getCell('C8').value = '';
      ws.getCell('B9').value = '';
      ws.getCell('C9').value = '';
      ws.getCell('B10').value = '';
      ws.getCell('C10').value = '';
      ws.getCell('E10').value = '';
      ws.getCell('F10').value = '';
      ws.getCell('B11').value = '';
      ws.getCell('C11').value = '';
      ws.getCell('B12').value = '';
      ws.getCell('C12').value = '';
      ws.getCell('B13').value = '';
      ws.getCell('C13').value = '';
      ws.getCell('E13').value = '';
      ws.getCell('F13').value = '';

      // Preencher dados do boleto nas linhas 8-10
      ws.getCell('B8').value = 'CÓD. BARRAS:';
      ws.getCell('B8').font = { bold: true, size: 10 };

      if (fatura.codigoBarras) {
        const ld = fatura.codigoBarras.replace(/\D/g, '');
        let ldFormatado = ld;
        if (ld.length === 47) {
          ldFormatado = `${ld.slice(0,5)}.${ld.slice(5,10)} ${ld.slice(10,15)}.${ld.slice(15,21)} ${ld.slice(21,26)}.${ld.slice(26,32)} ${ld.slice(32,33)} ${ld.slice(33)}`;
        }
        ws.getCell('C8').value = ldFormatado;
        ws.getCell('C8').font = { size: 10, name: 'Consolas' };
      }

      ws.getCell('B9').value = 'VALIDADE BOLETO:';
      ws.getCell('B9').font = { bold: true, size: 10 };

      if (fatura.vencimentoBoleto) {
        const parts = fatura.vencimentoBoleto.split('-');
        if (parts.length === 3) {
          ws.getCell('C9').value = `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else {
          ws.getCell('C9').value = fatura.vencimentoBoleto;
        }
      }
    } else {
      // TED / PIX — preencher dados bancários normalmente
      ws.getCell('C8').value = fatura.fornecedor?.banco || '';
      ws.getCell('C9').value = fatura.fornecedor?.agencia || '';
      ws.getCell('C10').value = fatura.fornecedor?.conta || '';
      ws.getCell('F10').value = fatura.fornecedor?.tipoConta || '';
      ws.getCell('C11').value = fatura.fornecedor?.op || '';
      ws.getCell('C12').value = fatura.fornecedor?.cnpj
        ? (cnpj.length === 14
          ? cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
          : cnpj)
        : '';
      ws.getCell('C13').value = fatura.fornecedor?.chavePix || '';
      ws.getCell('F13').value = fatura.fornecedor?.tipoChavePix || '';
    }

    // VALOR
    ws.getCell('C14').value = fatura.valor || 0;

    // FILIAL
    ws.getCell('C15').value = fatura.filial?.razaoSocial || '';

    // APLICAÇÃO - CAPEX/OPEX
    const aplicacao = fatura.aplicacao || '';
    ws.getCell('D17').value = aplicacao === 'CAPEX';
    ws.getCell('F17').value = aplicacao === 'OPEX';

    // C.CUSTO
    ws.getCell('C19').value = fatura.centroCusto?.numero || '';

    // CONTA CONTABIL - B20 é label, colocar valor em C20
    ws.getCell('C20').value = fatura.contaContabil?.numero || '';

    // NATUREZA
    ws.getCell('C21').value = fatura.natureza?.descricao || '';

    // VENCIMENTO - formato data Excel (serial number)
    if (fatura.vencimento) {
      const dt = new Date(fatura.vencimento);
      ws.getCell('C22').value = dt;
      ws.getCell('C22').numFmt = 'DD/MM/YYYY';
    }

    // Nº PROTOCOLO - deixar vazio para preenchimento manual
    // DATA ENVIO - preencher com data atual formatada
    const hoje = new Date();
    const dataEnvio = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
    ws.getCell('C33').value = dataEnvio;

    // ========================================
    // ENVIAR O ARQUIVO
    // ========================================

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Capa_Processo_Fatura_${faturaId}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Erro ao gerar capa de processo:', err);
    res.status(500).json({ error: true, message: 'Erro ao gerar capa de processo' });
  }
});

module.exports = router;
