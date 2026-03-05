const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const { authMiddleware } = require('../middlewares/auth.middleware');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authMiddleware);

// Multer em memória (não salva em disco — só para leitura)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são permitidos'));
    }
  },
});

// ==========================================
// FUNÇÕES UTILITÁRIAS DE VALIDAÇÃO DE CÓDIGO DE BARRAS
// ==========================================

// Módulo 10 - usado nos campos 1, 2 e 3 da linha digitável
function modulo10(bloco) {
  const digits = bloco.replace(/\D/g, '');
  let soma = 0;
  let peso = 2;

  for (let i = digits.length - 1; i >= 0; i--) {
    let parcial = parseInt(digits[i]) * peso;
    if (parcial > 9) parcial = Math.floor(parcial / 10) + (parcial % 10);
    soma += parcial;
    peso = peso === 2 ? 1 : 2;
  }

  const resto = soma % 10;
  return resto === 0 ? 0 : 10 - resto;
}

// Módulo 11 - usado no dígito verificador geral (posição 5 do código de barras)
function modulo11Boleto(codigo) {
  const digits = codigo.replace(/\D/g, '');
  let soma = 0;
  let peso = 2;

  for (let i = digits.length - 1; i >= 0; i--) {
    soma += parseInt(digits[i]) * peso;
    peso = peso >= 9 ? 2 : peso + 1;
  }

  const resto = soma % 11;
  const dv = 11 - resto;

  if (dv === 0 || dv === 10 || dv === 11) return 1;
  return dv;
}

// Validar linha digitável de boleto bancário (47 dígitos) e extrair dados
function validarLinhaDigitavel(linhaDigitavel) {
  const digits = linhaDigitavel.replace(/\D/g, '');

  if (digits.length !== 47) {
    return { valido: false, motivo: `Tamanho inválido: ${digits.length} dígitos (esperado 47)` };
  }

  // Campo 1: posições 1-9, DV na posição 10
  const campo1 = digits.substring(0, 9);
  const dv1 = parseInt(digits[9]);
  const dv1Calc = modulo10(campo1);

  // Campo 2: posições 11-20, DV na posição 21
  const campo2 = digits.substring(10, 20);
  const dv2 = parseInt(digits[20]);
  const dv2Calc = modulo10(campo2);

  // Campo 3: posições 22-31, DV na posição 32
  const campo3 = digits.substring(21, 31);
  const dv3 = parseInt(digits[31]);
  const dv3Calc = modulo10(campo3);

  // DV geral (posição 33)
  const dvGeral = parseInt(digits[32]);

  // Montar código de barras a partir da linha digitável
  const codigoBarras = digits.substring(0, 4)
    + digits.substring(32, 33)
    + digits.substring(33, 47)
    + digits.substring(4, 9)
    + digits.substring(10, 20)
    + digits.substring(21, 31);

  // Código sem DV para cálculo
  const codigoSemDV = codigoBarras.substring(0, 4) + codigoBarras.substring(5);
  const dvGeralCalc = modulo11Boleto(codigoSemDV);

  const erros = [];
  if (dv1 !== dv1Calc) erros.push(`Campo 1: DV esperado ${dv1Calc}, encontrado ${dv1}`);
  if (dv2 !== dv2Calc) erros.push(`Campo 2: DV esperado ${dv2Calc}, encontrado ${dv2}`);
  if (dv3 !== dv3Calc) erros.push(`Campo 3: DV esperado ${dv3Calc}, encontrado ${dv3}`);
  if (dvGeral !== dvGeralCalc) erros.push(`DV Geral: esperado ${dvGeralCalc}, encontrado ${dvGeral}`);

  if (erros.length > 0) {
    return { valido: false, motivo: erros.join('; ') };
  }

  // Extrair dados do código de barras
  const banco = digits.substring(0, 3);
  const fatorVenc = parseInt(digits.substring(33, 37));
  const valorInt = parseInt(digits.substring(37, 47));
  const valor = valorInt / 100;

  // Calcular vencimento
  let vencimento = null;
  if (fatorVenc > 0) {
    const base = new Date(1997, 9, 7); // 07/10/1997
    const candidata = new Date(base.getTime() + fatorVenc * 24 * 60 * 60 * 1000);

    // Após 21/02/2025 (fator 10000), o campo reinicia em 1000
    if (candidata.getFullYear() < 2020) {
      const novaBase = new Date(2025, 1, 22); // 22/02/2025
      vencimento = new Date(novaBase.getTime() + (fatorVenc - 1000) * 24 * 60 * 60 * 1000);
    } else {
      vencimento = candidata;
    }
  }

  // Formatar vencimento como YYYY-MM-DD
  let vencimentoStr = null;
  if (vencimento) {
    const yyyy = vencimento.getFullYear();
    const mm = String(vencimento.getMonth() + 1).padStart(2, '0');
    const dd = String(vencimento.getDate()).padStart(2, '0');
    vencimentoStr = `${yyyy}-${mm}-${dd}`;
  }

  return { valido: true, banco, valor, vencimento: vencimentoStr, linhaDigitavel: digits };
}

// Extrair linha digitável do texto (busca sequências de 47 dígitos)
function extrairLinhaDigitavel(texto) {
  const resultados = [];
  let match;

  // Padrão 1: com pontos — XXXXX.XXXXX XXXXX.XXXXXX XXXXX.XXXXXX X XXXXXXXXXXXXXX
  const padrao1 = /(\d{5}\.\d{5})\s+(\d{5}\.\d{6})\s+(\d{5}\.\d{6})\s+(\d)\s+(\d{14})/g;
  while ((match = padrao1.exec(texto)) !== null) {
    const digits = match[0].replace(/\D/g, '');
    if (digits.length === 47) resultados.push(digits);
  }

  // Padrão 2: sem pontos — XXXXXXXXXX XXXXXXXXXXX XXXXXXXXXXX X XXXXXXXXXXXXXX
  const padrao2 = /(\d{10})\s+(\d{11})\s+(\d{11})\s+(\d{1})\s+(\d{14})/g;
  while ((match = padrao2.exec(texto)) !== null) {
    const digits = match[0].replace(/\D/g, '');
    if (digits.length === 47) resultados.push(digits);
  }

  // Padrão 3: 47 dígitos consecutivos
  const padrao3 = /\d{47}/g;
  while ((match = padrao3.exec(texto)) !== null) {
    resultados.push(match[0]);
  }

  return [...new Set(resultados)];
}

// Converter valor BR "1.976,70" → 1976.70
function parsarValorBR(str) {
  if (!str) return null;
  const parsed = parseFloat(str.replace(/\./g, '').replace(',', '.'));
  return (!isNaN(parsed) && parsed > 0 && parsed < 10000000) ? parsed : null;
}

// Converter data BR "20/02/2026" → "2026-02-20"
function parsarDataBR(str) {
  if (!str) return null;
  const parts = str.split('/');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return null;
}

// ==========================================
// DETECÇÃO DE CONCESSIONÁRIA
// ==========================================
function detectarConcessionaria(texto) {
  const textoUpper = texto.toUpperCase();

  if (textoUpper.includes('ENERGISA')) return 'ENERGISA';
  if (textoUpper.includes('EQUATORIAL')) return 'EQUATORIAL';

  // Fallback: desconhecida
  return null;
}

// ==========================================
// ENERGISA — Extração de dados
// ==========================================
// Formato: Gera boleto bancário com linha digitável (47 dígitos) no texto do PDF.
// Valor e vencimento são extraídos do código de barras.
// Consumo kWh: "Energia ativa em kWh X YYYY" onde YYYY é o consumo.
// Tem também "CONSUMO FATURADO" e tabela de leituras (Ponta atual/anterior).
// ==========================================
function extrairDadosEnergisa(texto) {
  console.log('🔌 [ENERGISA] Iniciando extração...');

  // --- 0) UNIDADE CONSUMIDORA (UC) e Nº INSTALAÇÃO ---
  // Energisa usa formato "8/2896310-6" como UC (campo MATRÍCULA)
  // No OCR pode aparecer como "8/2896310-6" em vários locais
  let unidadeConsumidora = null;
  let numInstalacao = null;

  // Padrão 1: "MATRÍCULA" ou "MATRICULA" seguido do código UC (ex: 8/2896310-6)
  const matchMatricula = texto.match(/MATR[IÍ]CULA[:\s]*(\d+\/\d+[-–]\d)/i);
  if (matchMatricula) {
    unidadeConsumidora = matchMatricula[1].replace('–', '-');
    console.log(`🏠 [ENERGISA] UC (matrícula): ${unidadeConsumidora}`);
  }

  // Padrão 2: formato X/XXXXXXX-X solto no texto (padrão Energisa)
  if (!unidadeConsumidora) {
    const matchUC = texto.match(/\b(\d{1,2}\/\d{5,10}[-–]\d)\b/);
    if (matchUC) {
      unidadeConsumidora = matchUC[1].replace('–', '-');
      console.log(`🏠 [ENERGISA] UC (padrão X/XXXXXXX-X): ${unidadeConsumidora}`);
    }
  }

  // Padrão 3: "Utilize o Código" seguido de número longo (ex: 0002896310-6)
  if (!unidadeConsumidora) {
    const matchCodigo = texto.match(/(?:Utilize\s+o\s+C[oó]digo|C[oó]digo)[:\s—-]*(\d+[-–]\d)/i);
    if (matchCodigo) {
      // Remover zeros à esquerda e adicionar prefixo 8/
      const numLimpo = matchCodigo[1].replace('–', '-').replace(/^0+/, '');
      unidadeConsumidora = `8/${numLimpo}`;
      console.log(`🏠 [ENERGISA] UC (código): ${unidadeConsumidora}`);
    }
  }

  // Número de instalação: "INSTALAÇÃO: XXXXX" ou "Instalação XXXXX"
  const matchInstalacao = texto.match(/INSTALA[CÇ][ÃA]O[:\s]+([A-Z0-9]{5,15})/i);
  if (matchInstalacao) {
    numInstalacao = matchInstalacao[1];
    console.log(`🏠 [ENERGISA] Nº Instalação: ${numInstalacao}`);
  }

  // --- 1) CONSUMO kWh ---
  let consumoKwh = null;

  // Padrão principal: "Energia ativa em kWh 1 2880"
  const matchKwh = texto.match(/Energia\s+ativa\s+em\s+kWh\s+\d+\s+([\d.,]+)/i);
  if (matchKwh) {
    consumoKwh = parsarValorBR(matchKwh[1]);
    console.log(`⚡ [ENERGISA] Consumo kWh (energia ativa): ${consumoKwh}`);
  }

  // Fallback: "CONSUMO FATURADO ... 2.880,00"
  if (!consumoKwh) {
    // Buscar na tabela — "2.880,00" no final da linha de Ponta
    const matchPonta = texto.match(/Ponta\s+[\d.,]+\s+[\d.,]+[\s\S]{0,200}?([\d.,]+)\s+([\d.,]+)\s*$/m);
    if (matchPonta) {
      consumoKwh = parsarValorBR(matchPonta[2]);
      console.log(`⚡ [ENERGISA] Consumo kWh (tabela ponta): ${consumoKwh}`);
    }
  }

  // Fallback OCR: "Consumo em kWh KH 5.527,00"
  if (!consumoKwh) {
    const matchConsumoKwh = texto.match(/Consumo\s+em\s+kWh[\s\S]{0,20}?([\d.,]+)/i);
    if (matchConsumoKwh) {
      consumoKwh = parsarValorBR(matchConsumoKwh[1]);
      console.log(`⚡ [ENERGISA] Consumo kWh (consumo em kWh): ${consumoKwh}`);
    }
  }

  // Fallback: "CONSUMO FATURADO ... X.XXX,XX kWh"
  if (!consumoKwh) {
    const matchCF = texto.match(/CONSUMO\s+FATURADO[\s\S]{0,100}?([\d.,]+)\s*k[wW][hH]/i);
    if (matchCF) {
      consumoKwh = parsarValorBR(matchCF[1]);
      console.log(`⚡ [ENERGISA] Consumo kWh (consumo faturado): ${consumoKwh}`);
    }
  }

  // --- 2) LINHA DIGITÁVEL (código de barras) ---
  let linhaDigitavel = null;
  let valor = null;
  let vencimento = null;
  let banco = null;

  const candidatos = extrairLinhaDigitavel(texto);
  for (const candidato of candidatos) {
    const resultado = validarLinhaDigitavel(candidato);
    if (resultado.valido) {
      linhaDigitavel = resultado.linhaDigitavel;
      valor = resultado.valor;
      vencimento = resultado.vencimento;
      banco = resultado.banco;
      console.log(`✅ [ENERGISA] Código de barras válido: R$ ${valor} | Venc: ${vencimento}`);
      break;
    }
  }

  // --- 3) FALLBACK — valor e vencimento pelo texto (caso código de barras falhe) ---
  if (!valor) {
    // "TOTAL: 2042,64" ou "TOTAL: 2.042,64"
    const matchTotal = texto.match(/TOTAL:\s*([\d.,]+)/i);
    if (matchTotal) {
      valor = parsarValorBR(matchTotal[1]);
      console.log(`📋 [ENERGISA] Valor pelo texto (TOTAL): R$ ${valor}`);
    }
  }

  if (!valor) {
    // "R$ 7.422,12" — pegar o primeiro R$ seguido de valor
    const matchRS = texto.match(/R\$\s*([\d.,]+)/i);
    if (matchRS) {
      valor = parsarValorBR(matchRS[1]);
      console.log(`📋 [ENERGISA] Valor pelo texto (R$): R$ ${valor}`);
    }
  }

  if (!vencimento) {
    // "Março / 2025 26/04/2025 R$ 2.042,64" — data logo após mês/ano
    const matchVenc = texto.match(/\d{2}\/\d{2}\/\d{4}\s+R\$/);
    if (matchVenc) {
      const dataMatch = matchVenc[0].match(/(\d{2}\/\d{2}\/\d{4})/);
      if (dataMatch) {
        vencimento = parsarDataBR(dataMatch[1]);
        console.log(`📋 [ENERGISA] Vencimento pelo texto: ${vencimento}`);
      }
    }
  }

  // --- 4) DATA DE EMISSÃO ---
  // pdfjs-dist pode inserir espaços dentro das palavras: "DAT A DE EMISSÃO"
  let dataEmissao = null;
  const matchEmissao = texto.match(/DAT\s*A\s+DE\s+EMISS[ÃA]O[:\s]*(\d{2}\/\d{2}\/\d{4})/i);
  if (matchEmissao) {
    dataEmissao = parsarDataBR(matchEmissao[1]);
    console.log(`📋 [ENERGISA] Data emissão: ${dataEmissao}`);
  }

  // --- 5) NOTA FISCAL ---
  // pdfjs-dist pode inserir espaços: "NOT A FISCAL"
  let notaFiscal = null;
  const matchNF = texto.match(/NOT\s*A\s+FISCAL\s+N[º°]?:?\s*([\d.]+)/i);
  if (matchNF) {
    notaFiscal = matchNF[1].replace(/\./g, '');
    console.log(`📋 [ENERGISA] Nota fiscal: ${notaFiscal}`);
  }

  // --- 6) REFERÊNCIA (Mês / Ano) → formato YYYY-MM para <input type="month"> ---
  let referencia = null;
  const nomeMeses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  // Padrão 1: "Março / 2025" ou "Março/2025"
  const mesesRegex = 'Janeiro|Fevereiro|Mar[çc]o|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro';
  const matchRef = texto.match(new RegExp(`(${mesesRegex})\\s*\\/\\s*(\\d{4})`, 'i'));
  if (matchRef) {
    const mesNome = matchRef[1].charAt(0).toUpperCase() + matchRef[1].slice(1).toLowerCase();
    const mesNorm = mesNome.replace('ç', 'ç'); // normalizar
    const idx = nomeMeses.findIndex(m => m.toLowerCase() === mesNorm.toLowerCase());
    if (idx >= 0) {
      referencia = `${matchRef[2]}-${String(idx + 1).padStart(2, '0')}`;
      console.log(`📋 [ENERGISA] Referência: ${nomeMeses[idx]} / ${matchRef[2]} → ${referencia}`);
    }
  }
  // Padrão 2: "Referência: MM/YYYY" ou "Ref: 01/2025"
  if (!referencia) {
    const matchRef2 = texto.match(/Refer[êe]ncia[:\s]*(\d{2}\/\d{4})/i);
    if (matchRef2) {
      const [mes, ano] = matchRef2[1].split('/');
      const idx = parseInt(mes, 10) - 1;
      if (idx >= 0 && idx < 12) {
        referencia = `${ano}-${mes}`;
        console.log(`📋 [ENERGISA] Referência (numérica): ${nomeMeses[idx]} / ${ano} → ${referencia}`);
      }
    }
  }

  if (!valor && !consumoKwh) return null;

  return {
    concessionaria: 'ENERGISA',
    valor,
    vencimento,
    linhaDigitavel,
    banco,
    consumoKwh,
    dataEmissao,
    notaFiscal,
    referencia,
    unidadeConsumidora,
    numInstalacao,
  };
}

// ==========================================
// EQUATORIAL — Extração de dados
// ==========================================
// Formato: NÃO gera linha digitável no PDF (código de barras é imagem).
// Valor: "Total a Pagar R$ 1.976,70" ou "Valor cobrado (R$): ... 1.976,70"
// Vencimento: "Vencimento 20/02/2026"
// Consumo kWh: "Consumo Ativo FP ... X.XXX,XX kWh" + "Consumo Ativo NP ... XX,XX kWh"
// Também: "TUSD Energia Fora Ponta (kWh) X.XXX,XX" nos itens da fatura.
// ==========================================
function extrairDadosEquatorial(texto) {
  console.log('🔌 [EQUATORIAL] Iniciando extração...');

  // --- 0) UNIDADE CONSUMIDORA (UC) e Nº INSTALAÇÃO ---
  // Equatorial usa "INSTALAÇÃO: 2000411478" (numInstalacao)
  // UC aparece no texto como número de 10 dígitos (ex: 3008246660)
  let unidadeConsumidora = null;
  let numInstalacao = null;

  // Padrão 1: "INSTALAÇÃO: XXXXXXXX" — isso é o numInstalacao na Equatorial
  const matchInstalacao = texto.match(/INSTALA[CÇ][ÃA]O[:\s]+(\d{5,15})/i);
  if (matchInstalacao) {
    numInstalacao = matchInstalacao[1];
    console.log(`🏠 [EQUATORIAL] Nº Instalação: ${numInstalacao}`);
  }

  // Padrão 2: UC aparece como "Unidade Consumidora: XXXXXXXXXX" ou "UC: XXXXXXXXXX"
  const matchUC = texto.match(/(?:Unidade\s+Consumidora|UC)[:\s]+(\d{5,15})/i);
  if (matchUC) {
    unidadeConsumidora = matchUC[1];
    console.log(`🏠 [EQUATORIAL] UC (direto): ${unidadeConsumidora}`);
  }

  // Padrão 3: CC com percentual de 100% — ex: "3008246660(100%)" ou "3008246660(— 100%)"
  // Esse é o padrão mais confiável quando há GD (geração distribuída)
  if (!unidadeConsumidora) {
    const matchCC100 = texto.match(/(\d{7,15})\s*\([—–\s]*100\s*%?\)/);
    if (matchCC100) {
      unidadeConsumidora = matchCC100[1];
      console.log(`🏠 [EQUATORIAL] UC (CC 100%): ${unidadeConsumidora}`);
    }
  }

  // Padrão 4: Número grande de 10 dígitos começando com 30 (padrão Equatorial UC)
  if (!unidadeConsumidora) {
    const match30 = texto.match(/\b(30\d{8})\b/);
    if (match30) {
      unidadeConsumidora = match30[1];
      console.log(`🏠 [EQUATORIAL] UC (padrão 30XXXXXXXX): ${unidadeConsumidora}`);
    }
  }

  // Padrão 5: Conta Contrato (genérico — cuidado: pode pegar a geradora)
  // Só usar se nenhum outro padrão funcionou
  if (!unidadeConsumidora) {
    const matchCC = texto.match(/(?:Conta\s+Contrato)[:\s]+(\d{7,15})/i);
    if (matchCC) {
      unidadeConsumidora = matchCC[1];
      console.log(`🏠 [EQUATORIAL] UC (conta contrato): ${unidadeConsumidora}`);
    }
  }

  // --- kWh: não extrair automaticamente (padrão muito variável na Equatorial) ---
  // O usuário preenche manualmente
  let consumoKwh = null;

  // --- 2) LINHA DIGITÁVEL (código de barras) ---
  let linhaDigitavel = null;
  let valorBoleto = null;
  let vencimentoBoleto = null;
  let banco = null;

  const candidatos = extrairLinhaDigitavel(texto);
  for (const candidato of candidatos) {
    const resultado = validarLinhaDigitavel(candidato);
    if (resultado.valido) {
      linhaDigitavel = resultado.linhaDigitavel;
      valorBoleto = resultado.valor;
      vencimentoBoleto = resultado.vencimento;
      banco = resultado.banco;
      console.log(`✅ [EQUATORIAL] Código de barras válido: R$ ${valorBoleto} | Venc: ${vencimentoBoleto} | Banco: ${banco}`);
      break;
    }
  }

  // --- 3) VALOR ---
  let valor = null;

  // Prioridade 1: valor do código de barras (mais confiável)
  if (valorBoleto && valorBoleto > 0) {
    valor = valorBoleto;
    console.log(`💰 [EQUATORIAL] Valor (código de barras): R$ ${valor}`);
  }

  // Fallback: "Total a Pagar R$ 1.976,70"
  if (!valor) {
    const matchTotal = texto.match(/Total\s+a\s+Pagar[\s\S]{0,30}?R\$\s*([\d.,]+)/i);
    if (matchTotal) {
      valor = parsarValorBR(matchTotal[1]);
      console.log(`💰 [EQUATORIAL] Valor (Total a Pagar): R$ ${valor}`);
    }
  }

  // Fallback: "Valor cobrado (R$): ... 1.976,70"
  if (!valor) {
    const matchVC = texto.match(/Valor\s+cobrado\s*\(R\$\)[:\s].*?([\d.,]+)\s*\n/i);
    if (matchVC) {
      valor = parsarValorBR(matchVC[1]);
      console.log(`💰 [EQUATORIAL] Valor (Valor cobrado): R$ ${valor}`);
    }
  }

  // Fallback: "VALOR DOCUMENTO ... 131,55"
  if (!valor) {
    const matchVD = texto.match(/VALOR\s+DOCUMENTO[\s\S]{0,30}?([\d.,]+)/i);
    if (matchVD) {
      valor = parsarValorBR(matchVD[1]);
      console.log(`💰 [EQUATORIAL] Valor (Valor Documento): R$ ${valor}`);
    }
  }

  // --- 4) VENCIMENTO ---
  let vencimento = null;

  // Prioridade 1: vencimento do código de barras
  if (vencimentoBoleto) {
    vencimento = vencimentoBoleto;
    console.log(`📅 [EQUATORIAL] Vencimento (código de barras): ${vencimento}`);
  }

  // Fallback: "Vencimento 26/01/2026" ou "VENCIMENTO 26.01.2026"
  if (!vencimento) {
    const matchVenc = texto.match(/Vencimento[\s:]+(\d{2}[\/.]?\d{2}[\/.]?\d{4})/i);
    if (matchVenc) {
      vencimento = parsarDataBR(matchVenc[1].replace(/\./g, '/'));
      console.log(`📅 [EQUATORIAL] Vencimento (texto): ${vencimento}`);
    }
  }

  // Fallback: "DATA DE VENCIMENTO ... DD/MM/YYYY"
  if (!vencimento) {
    const matchVenc2 = texto.match(/DATA\s+DE\s+VENCIMENTO[:\s]+(\d{2}\/\d{2}\/\d{4})/i);
    if (matchVenc2) {
      vencimento = parsarDataBR(matchVenc2[1]);
      console.log(`📅 [EQUATORIAL] Vencimento (Data de Vencimento): ${vencimento}`);
    }
  }

  // --- 4) DATA DE EMISSÃO ---
  let dataEmissao = null;
  const matchEmissao = texto.match(/DAT\s*A\s+DE\s+EMISS[ÃA]O[:\s]*(\d{2}\/\d{2}\/\d{4})/i);
  if (matchEmissao) {
    dataEmissao = parsarDataBR(matchEmissao[1]);
    console.log(`📋 [EQUATORIAL] Data emissão: ${dataEmissao}`);
  }

  // --- 5) NOTA FISCAL ---
  let notaFiscal = null;
  const matchNF = texto.match(/NOT\s*A\s+FISCAL\s+N[º°]?\s*([\d]+)/i);
  if (matchNF) {
    notaFiscal = matchNF[1];
    console.log(`📋 [EQUATORIAL] Nota fiscal: ${notaFiscal}`);
  }

  // --- 6) REFERÊNCIA (Mês / Ano) → formato YYYY-MM ---
  let referencia = null;
  const nomeMesesEq = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  // Padrão 1: "Competência: 01/2026" ou "Conta Mês 01/2026"
  const matchComp = texto.match(/(?:Compet[êe]ncia|Conta\s+M[êe]s)[:\s]*(\d{2})\/(\d{4})/i);
  if (matchComp) {
    referencia = `${matchComp[2]}-${matchComp[1]}`;
    const idx = parseInt(matchComp[1], 10) - 1;
    console.log(`📋 [EQUATORIAL] Referência: ${nomeMesesEq[idx]} / ${matchComp[2]} → ${referencia}`);
  }
  // Padrão 2: "Mês/Ano por extenso" — "Janeiro / 2026"
  if (!referencia) {
    const mesesRegex = 'Janeiro|Fevereiro|Mar[çc]o|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro';
    const matchRef = texto.match(new RegExp(`(${mesesRegex})\\s*\\/\\s*(\\d{4})`, 'i'));
    if (matchRef) {
      const mesNome = matchRef[1].charAt(0).toUpperCase() + matchRef[1].slice(1).toLowerCase();
      const idx = nomeMesesEq.findIndex(m => m.toLowerCase() === mesNome.toLowerCase());
      if (idx >= 0) {
        referencia = `${matchRef[2]}-${String(idx + 1).padStart(2, '0')}`;
        console.log(`📋 [EQUATORIAL] Referência: ${nomeMesesEq[idx]} / ${matchRef[2]} → ${referencia}`);
      }
    }
  }
  // Padrão 3: "Referência: MM/YYYY"
  if (!referencia) {
    const matchRef2 = texto.match(/Refer[êe]ncia[:\s]*(\d{2})\/(\d{4})/i);
    if (matchRef2) {
      referencia = `${matchRef2[2]}-${matchRef2[1]}`;
      const idx = parseInt(matchRef2[1], 10) - 1;
      console.log(`📋 [EQUATORIAL] Referência (Referência): ${nomeMesesEq[idx]} / ${matchRef2[2]} → ${referencia}`);
    }
  }

  if (!valor && !notaFiscal) return null;

  return {
    concessionaria: 'EQUATORIAL',
    valor,
    vencimento,
    linhaDigitavel,
    banco,
    consumoKwh,
    dataEmissao,
    notaFiscal,
    referencia,
    unidadeConsumidora,
    numInstalacao,
  };
}

// ==========================================
// GENÉRICA — Fallback para concessionárias não identificadas
// ==========================================
function extrairDadosGenerica(texto) {
  console.log('🔌 [GENÉRICA] Iniciando extração (concessionária não identificada)...');

  // --- UNIDADE CONSUMIDORA (UC) e Nº INSTALAÇÃO ---
  let unidadeConsumidora = null;
  let numInstalacao = null;

  // Tentar "MATRÍCULA" ou "Matrícula" (Energisa-like)
  const matchMatricula = texto.match(/MATR[IÍ]CULA[:\s]*(\d+\/\d+[-–]\d)/i);
  if (matchMatricula) {
    unidadeConsumidora = matchMatricula[1].replace('–', '-');
  }

  // Tentar formato X/XXXXXXX-X
  if (!unidadeConsumidora) {
    const matchUCBarra = texto.match(/\b(\d{1,2}\/\d{5,10}[-–]\d)\b/);
    if (matchUCBarra) unidadeConsumidora = matchUCBarra[1].replace('–', '-');
  }

  // Tentar "Unidade Consumidora" / "UC"
  if (!unidadeConsumidora) {
    const matchUC = texto.match(/(?:Unidade\s+Consumidora|UC)[:\s]+(\d{5,15})/i);
    if (matchUC) unidadeConsumidora = matchUC[1];
  }

  // Tentar "Conta Contrato"
  if (!unidadeConsumidora) {
    const matchCC = texto.match(/(?:Conta\s+Contrato|CC)[:\s]+(\d{7,15})/i);
    if (matchCC) unidadeConsumidora = matchCC[1];
  }

  // Número de instalação
  const matchInstalacao = texto.match(/INSTALA[CÇ][ÃA]O[:\s]+([A-Z0-9]{5,15})/i);
  if (matchInstalacao) numInstalacao = matchInstalacao[1];

  if (unidadeConsumidora) console.log(`🏠 [GENÉRICA] UC: ${unidadeConsumidora}`);
  if (numInstalacao) console.log(`🏠 [GENÉRICA] Nº Instalação: ${numInstalacao}`);

  // --- CONSUMO kWh (todos os padrões) ---
  let consumoKwh = null;

  // Tentar "Energia ativa em kWh"
  const matchEnergia = texto.match(/Energia\s+ativa\s+em\s+kWh\s+\d+\s+([\d.,]+)/i);
  if (matchEnergia) consumoKwh = parsarValorBR(matchEnergia[1]);

  // Tentar "Consumo Ativo FP" + NP
  if (!consumoKwh) {
    const matchFP = texto.match(/Consumo\s+Ativo\s+FP[\s\S]{0,80}?([\d.,]+)\s*kWh/i);
    if (matchFP) {
      const fp = parsarValorBR(matchFP[1]) || 0;
      const matchNP = texto.match(/Consumo\s+Ativo\s+(?:NP|P\b)[\s\S]{0,80}?([\d.,]+)\s*kWh/i);
      const np = matchNP ? (parsarValorBR(matchNP[1]) || 0) : 0;
      consumoKwh = fp + np;
    }
  }

  // Tentar "CONSUMO FATURADO ... kWh"
  if (!consumoKwh) {
    const matchCF = texto.match(/CONSUMO\s+FATURADO[\s\S]{0,100}?([\d.,]+)\s*kWh/i);
    if (matchCF) consumoKwh = parsarValorBR(matchCF[1]);
  }

  // Tentar maior valor com "kWh"
  if (!consumoKwh) {
    const todosKwh = texto.match(/([\d.,]+)\s*kWh/gi);
    if (todosKwh && todosKwh.length > 0) {
      let maior = 0;
      for (const item of todosKwh) {
        const val = parsarValorBR(item.replace(/\s*kWh/i, '').trim());
        if (val && val > maior) maior = val;
      }
      if (maior > 0) consumoKwh = maior;
    }
  }

  // --- LINHA DIGITÁVEL ---
  let linhaDigitavel = null;
  let valor = null;
  let vencimento = null;
  let banco = null;

  const candidatos = extrairLinhaDigitavel(texto);
  for (const candidato of candidatos) {
    const resultado = validarLinhaDigitavel(candidato);
    if (resultado.valido) {
      linhaDigitavel = resultado.linhaDigitavel;
      valor = resultado.valor;
      vencimento = resultado.vencimento;
      banco = resultado.banco;
      break;
    }
  }

  // --- VALOR (fallback texto) ---
  if (!valor) {
    const padroesValor = [
      /Total\s+a\s+Pagar[\s\S]{0,30}?R\$\s*([\d.,]+)/i,
      /Valor\s+cobrado\s*\(R\$\)[:\s].*?([\d.,]+)\s*\n/i,
      /VALOR\s+TOTAL[\s:]*R\$\s*([\d.,]+)/i,
      /Valor\s+a\s+pagar[\s:]*R\$\s*([\d.,]+)/i,
      /TOTAL[\s:]+R\$\s*([\d.,]+)/i,
    ];
    for (const padrao of padroesValor) {
      const match = texto.match(padrao);
      if (match) {
        valor = parsarValorBR(match[1]);
        if (valor) break;
      }
    }
  }

  // --- VENCIMENTO (fallback texto) ---
  if (!vencimento) {
    const padroesVenc = [
      /Vencimento[\s:]+(\d{2}\/\d{2}\/\d{4})/i,
      /DATA\s+DE\s+VENCIMENTO[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
      /Venc\.?[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
    ];
    for (const padrao of padroesVenc) {
      const match = texto.match(padrao);
      if (match) {
        vencimento = parsarDataBR(match[1]);
        if (vencimento) break;
      }
    }
  }

  // --- DATA DE EMISSÃO ---
  let dataEmissao = null;
  const matchEmissao = texto.match(/DATA\s+DE\s+EMISS[ÃA]O[:\s]*(\d{2}\/\d{2}\/\d{4})/i);
  if (matchEmissao) dataEmissao = parsarDataBR(matchEmissao[1]);

  // --- NOTA FISCAL ---
  let notaFiscal = null;
  const matchNF = texto.match(/NOTA\s+FISCAL\s+N[º°]?:?\s*([\d.]+)/i);
  if (matchNF) notaFiscal = matchNF[1].replace(/\./g, '');

  if (!valor && !consumoKwh) return null;

  return {
    concessionaria: 'DESCONHECIDA',
    valor,
    vencimento,
    linhaDigitavel,
    banco,
    consumoKwh,
    dataEmissao,
    notaFiscal,
    referencia: null,
    unidadeConsumidora,
    numInstalacao,
  };
}

// ==========================================
// OCR — Extração de texto de PDFs escaneados (imagem)
// ==========================================
// Quando o pdf-parse não retorna texto útil (PDF é uma imagem escaneada),
// renderizamos cada página do PDF como imagem em alta resolução usando
// pdfjs-dist + @napi-rs/canvas, e depois rodamos OCR com Tesseract.
//
// PROTEÇÕES:
// - Máximo 3 páginas processadas (fatura de energia não tem mais que isso)
// - Semáforo: só 1 OCR por vez (Tesseract é CPU-bound e trava a event loop)
// - Timeout de 30s por página individual
// ==========================================
const TEXTO_MINIMO_PDF = 100; // Se pdf-parse extrair menos que isso, é provavelmente imagem
const MAX_PAGINAS_OCR = 3;    // Limite de páginas para OCR (fatura = 2-3 págs)
const OCR_TIMEOUT_MS = 30000; // 30s timeout por página
const fs = require('fs');
const os = require('os');
const pathModule = require('path');

// Semáforo simples — só 1 OCR por vez para não travar o servidor
let ocrEmUso = false;

async function extrairTextoOCR(pdfBuffer) {
  // Verificar se já tem OCR rodando
  if (ocrEmUso) {
    console.log('⏳ [OCR] Já existe um OCR em andamento, pulando para evitar sobrecarga');
    return null;
  }

  ocrEmUso = true;
  console.log('🔍 [OCR] PDF parece ser imagem escaneada, renderizando páginas...');

  const tmpFiles = []; // Para limpar arquivos temporários ao final

  try {
    const pdfjsLib = await getPdfjsLib();
    const { createCanvas } = require('@napi-rs/canvas');

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
    const pdf = await loadingTask.promise;

    const totalPaginas = Math.min(pdf.numPages, MAX_PAGINAS_OCR);
    if (pdf.numPages > MAX_PAGINAS_OCR) {
      console.log(`⚠️ [OCR] PDF tem ${pdf.numPages} páginas, processando apenas as ${MAX_PAGINAS_OCR} primeiras`);
    }
    console.log(`📄 [OCR] PDF carregado: ${pdf.numPages} página(s), processando ${totalPaginas}`);

    let textoCompleto = '';
    const scale = 2.5; // Alta resolução para melhor OCR

    for (let i = 1; i <= totalPaginas; i++) {
      try {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
        const ctx = canvas.getContext('2d');

        // Fundo branco
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Renderizar página completa
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Salvar como arquivo temporário JPEG (mais confiável com Tesseract)
        const tmpPath = pathModule.join(os.tmpdir(), `hf_ocr_page_${i}_${Date.now()}.jpg`);
        const imgBuffer = canvas.toBuffer('image/jpeg');
        fs.writeFileSync(tmpPath, imgBuffer);
        tmpFiles.push(tmpPath);
        console.log(`🖼️ [OCR] Página ${i}/${pdf.numPages} renderizada (${(imgBuffer.length / 1024).toFixed(0)} KB)`);

        // OCR no arquivo temporário (com timeout por página)
        const ocrPromise = Tesseract.recognize(tmpPath, 'por');
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('OCR timeout')), OCR_TIMEOUT_MS)
        );
        const result = await Promise.race([ocrPromise, timeoutPromise]);
        if (result.data.text && result.data.text.trim().length > 0) {
          textoCompleto += result.data.text + '\n';
          console.log(`🔤 [OCR] Página ${i}: ${result.data.text.length} chars extraídos (confidence: ${result.data.confidence}%)`);
        } else {
          console.log(`⚠️ [OCR] Página ${i}: nenhum texto extraído`);
        }
      } catch (err) {
        console.warn(`⚠️ [OCR] Erro ao processar página ${i}: ${err.message}`);
      }
    }

    if (textoCompleto.trim().length === 0) {
      console.log('⚠️ [OCR] Nenhum texto extraído via OCR');
      return null;
    }

    console.log(`✅ [OCR] Total: ${textoCompleto.length} chars extraídos via OCR`);
    return textoCompleto;
  } catch (err) {
    logger.error('OCR — Erro geral', err);
    return null;
  } finally {
    ocrEmUso = false; // Liberar semáforo
    // Limpar arquivos temporários
    for (const f of tmpFiles) {
      try { fs.unlinkSync(f); } catch { /* ignorar */ }
    }
  }
}

// ==========================================
// ROTA: POST /api/boleto/extrair
// ==========================================

// Cache do pdfjs-dist (importação ESM dinâmica — só na primeira chamada)
let _pdfjsLib = null;
async function getPdfjsLib() {
  if (!_pdfjsLib) {
    _pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return _pdfjsLib;
}

// Extrair texto do PDF usando pdfjs-dist diretamente (sem pdf-parse)
// Limita a 5 páginas — fatura de energia nunca tem mais que isso
const MAX_PAGINAS_TEXTO = 5;
async function extrairTextoPDF(pdfBuffer) {
  const pdfjsLib = await getPdfjsLib();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
  const pdf = await loadingTask.promise;

  const totalPaginas = Math.min(pdf.numPages, MAX_PAGINAS_TEXTO);
  let textoCompleto = '';
  for (let i = 1; i <= totalPaginas; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    textoCompleto += pageText + '\n';
  }

  return textoCompleto;
}

router.post('/extrair', upload.single('arquivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: true, message: 'Nenhum arquivo PDF enviado' });
    }

    console.log(`📄 Extraindo dados da fatura PDF (${req.file.size} bytes)...`);

    // 1) Tentar extrair texto diretamente (texto embutido no PDF)
    let texto = await extrairTextoPDF(req.file.buffer);

    // 2) Se o texto extraído for insuficiente, tentar OCR
    const textoLimpo = texto.replace(/\s+/g, ' ').trim();
    let usouOCR = false;

    if (textoLimpo.length < TEXTO_MINIMO_PDF) {
      console.log(`📝 Texto extraído insuficiente (${textoLimpo.length} chars), tentando OCR...`);
      const textoOCR = await extrairTextoOCR(req.file.buffer);
      if (textoOCR && textoOCR.trim().length > textoLimpo.length) {
        texto = textoOCR;
        usouOCR = true;
      }
    }

    if (!texto || texto.trim().length === 0) {
      return res.status(400).json({ error: true, message: 'Não foi possível extrair texto do PDF' });
    }

    // 3) Detectar concessionária e extrair dados
    const concessionaria = detectarConcessionaria(texto);
    console.log(`🏢 Concessionária detectada: ${concessionaria || 'NÃO IDENTIFICADA'}${usouOCR ? ' (via OCR)' : ''}`);

    let dados = null;
    switch (concessionaria) {
      case 'ENERGISA':
        dados = extrairDadosEnergisa(texto);
        break;
      case 'EQUATORIAL':
        dados = extrairDadosEquatorial(texto);
        break;
      default:
        dados = extrairDadosGenerica(texto);
        break;
    }

    // 4) Retornar resultado
    if (dados && (dados.valor || dados.consumoKwh)) {
      console.log(`✅ Fatura processada: ${dados.concessionaria} | R$ ${dados.valor} | Venc: ${dados.vencimento} | kWh: ${dados.consumoKwh} | UC: ${dados.unidadeConsumidora || 'N/A'} | Inst: ${dados.numInstalacao || 'N/A'}${usouOCR ? ' (OCR)' : ''}`);
      return res.json({
        encontrado: true,
        valido: true,
        tipo: 'FATURA_CONCESSIONARIA',
        concessionaria: dados.concessionaria,
        valor: dados.valor,
        vencimento: dados.vencimento,
        linhaDigitavel: dados.linhaDigitavel,
        banco: dados.banco,
        consumoKwh: dados.consumoKwh,
        dataEmissao: dados.dataEmissao,
        notaFiscal: dados.notaFiscal,
        referencia: dados.referencia || null,
        unidadeConsumidora: dados.unidadeConsumidora || null,
        numInstalacao: dados.numInstalacao || null,
        ocr: usouOCR,
      });
    }

    console.log(`⚠️ Nenhum dado relevante encontrado no PDF${usouOCR ? ' (mesmo com OCR)' : ''}`);
    return res.json({
      encontrado: false,
      concessionaria: concessionaria || 'DESCONHECIDA',
      ocr: usouOCR,
      message: usouOCR
        ? 'PDF escaneado detectado. OCR executado, mas não foi possível extrair todos os dados. Preencha manualmente.'
        : 'Não foi possível extrair dados da fatura',
    });
  } catch (err) {
    logger.error('POST /api/boleto/extrair', err);
    return res.status(500).json({ error: true, message: 'Erro ao processar PDF da fatura' });
  }
});

// ==========================================
// ROTA: POST /api/boleto/extrair-pedido
// ==========================================
// Extrai o número do Pedido de Compras a partir do PDF.
// Formato esperado: "P E D I D O  D E  C O M P R A S - REAL 020503 /1"
// O número extraído seria: 020503
// ==========================================
router.post('/extrair-pedido', upload.single('arquivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: true, message: 'Nenhum arquivo PDF enviado' });
    }

    console.log(`📄 Extraindo número do Pedido de Compras (${req.file.size} bytes)...`);

    // 1) Extrair texto do PDF
    let texto = await extrairTextoPDF(req.file.buffer);
    let usouOCR = false;

    const textoLimpo = texto.replace(/\s+/g, ' ').trim();

    // 2) Se texto insuficiente, tentar OCR
    if (textoLimpo.length < TEXTO_MINIMO_PDF) {
      console.log(`📝 Texto do pedido insuficiente (${textoLimpo.length} chars), tentando OCR...`);
      const textoOCR = await extrairTextoOCR(req.file.buffer);
      if (textoOCR && textoOCR.trim().length > textoLimpo.length) {
        texto = textoOCR;
        usouOCR = true;
      }
    }

    if (!texto || texto.trim().length === 0) {
      return res.status(400).json({ error: true, message: 'Não foi possível extrair texto do PDF' });
    }

    // 3) Extrair número do pedido de compras
    // O pdfjs-dist extrai com espaços entre letras: "P   E   D   I   D   O   D   E   C   O   M   P   R   A   S   -   REAL   020503   /1"
    // Normalizar espaços múltiplos para facilitar o regex
    const textoNorm = texto.replace(/\s+/g, ' ').trim();

    let numeroPedido = null;

    // Padrão 1: "P E D I D O D E C O M P R A S" (com espaços entre letras) seguido de "REAL XXXXXX /N"
    const matchPedido1 = textoNorm.match(/P\s*E\s*D\s*I\s*D\s*O\s+D\s*E\s+C\s*O\s*M\s*P\s*R\s*A\s*S\s*[-–—]\s*REAL\s+(\d{4,10})\s*\//i);
    if (matchPedido1) {
      numeroPedido = matchPedido1[1];
      console.log(`📋 [PEDIDO] Número extraído (padrão 1 - espaçado): ${numeroPedido}`);
    }

    // Padrão 2: "PEDIDO DE COMPRAS - REAL XXXXXX /N" (texto contínuo, pós-OCR)
    if (!numeroPedido) {
      const matchPedido2 = textoNorm.match(/PEDIDO\s+DE\s+COMPRAS?\s*[-–—]\s*REAL\s+(\d{4,10})\s*\//i);
      if (matchPedido2) {
        numeroPedido = matchPedido2[1];
        console.log(`📋 [PEDIDO] Número extraído (padrão 2 - contínuo): ${numeroPedido}`);
      }
    }

    // Padrão 3: Apenas "REAL XXXXXX /" em qualquer lugar do texto
    if (!numeroPedido) {
      const matchPedido3 = textoNorm.match(/REAL\s+(\d{4,10})\s*\//i);
      if (matchPedido3) {
        numeroPedido = matchPedido3[1];
        console.log(`📋 [PEDIDO] Número extraído (padrão 3 - fallback REAL): ${numeroPedido}`);
      }
    }

    if (numeroPedido) {
      console.log(`✅ Pedido de Compras extraído: ${numeroPedido}${usouOCR ? ' (via OCR)' : ''}`);
      return res.json({
        encontrado: true,
        numeroPedido,
        ocr: usouOCR,
      });
    }

    console.log(`⚠️ Número do Pedido de Compras não encontrado no PDF${usouOCR ? ' (mesmo com OCR)' : ''}`);
    return res.json({
      encontrado: false,
      ocr: usouOCR,
      message: 'Não foi possível extrair o número do Pedido de Compras. Preencha manualmente.',
    });
  } catch (err) {
    logger.error('POST /api/boleto/extrair-pedido', err);
    return res.status(500).json({ error: true, message: 'Erro ao processar PDF do Pedido de Compras' });
  }
});

module.exports = router;
