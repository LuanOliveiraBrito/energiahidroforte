import { formatCurrency, formatDate, formatCNPJ } from '../utils/formatters';
import '../styles/capaProcesso.css';

export default function CapaProcesso({ fatura }) {
  if (!fatura) return null;

  const fornecedor = fatura.fornecedor || {};
  const fp = fatura.formaPagamento || fornecedor.tipoPagamento || '';

  return (
    <div className="capa-processo-container">
      <div className="capa-processo" id="capa-processo-print">

        {/* ========== CABEÇALHO ========== */}
        <div className="capa-header">
          <div className="capa-header-title">FORNECEDOR</div>
          <div className="capa-header-logo">
            <img src="/img/logo-voltaris.png" alt="Voltaris Energy" className="logo-voltaris" />
          </div>
        </div>

        {/* ========== DADOS DO FORNECEDOR ========== */}
        <div className="capa-section">
          <div className="capa-row">
            <div className="capa-label">NOME:</div>
            <div className="capa-value">{fornecedor.nome || ''}</div>
          </div>
          <div className="capa-row">
            <div className="capa-label">CNPJ/CPF:</div>
            <div className="capa-value">{formatCNPJ(fornecedor.cnpj) || ''}</div>
          </div>
          <div className="capa-row">
            <div className="capa-label">PEDIDO DE COMPRAS:</div>
            <div className="capa-value">{fatura.pedidoCompras || ''}</div>
          </div>
        </div>

        {/* ========== PAGAMENTO ========== */}
        <div className="capa-section-title">PAGAMENTO</div>

        <div className="capa-section">
          {/* Checkboxes TED / BOLETO / PIX */}
          <div className="capa-checkboxes">
            <div className="capa-check-item">
              <span className="capa-check-label">TRANSF. (TED)</span>
              <span className={`checkbox ${fp === 'TED' ? 'checked' : ''}`}>
                {fp === 'TED' ? '✓' : ''}
              </span>
            </div>
            <div className="capa-check-item">
              <span className="capa-check-label">BOLETO</span>
              <span className={`checkbox ${fp === 'BOLETO' ? 'checked' : ''}`}>
                {fp === 'BOLETO' ? '✓' : ''}
              </span>
            </div>
            <div className="capa-check-item">
              <span className="capa-check-label">PIX</span>
              <span className={`checkbox ${fp === 'PIX' ? 'checked' : ''}`}>
                {fp === 'PIX' ? '✓' : ''}
              </span>
            </div>
          </div>

          {/* Dados Bancários */}
          <div className="capa-subsection-title">DADOS BANCÁRIOS</div>
          <div className="capa-row">
            <div className="capa-label">BANCO:</div>
            <div className="capa-value">{fornecedor.banco || ''}</div>
          </div>
          <div className="capa-row">
            <div className="capa-label">AGÊNCIA:</div>
            <div className="capa-value">{fornecedor.agencia || ''}</div>
          </div>
          <div className="capa-row-double">
            <div className="capa-row-half">
              <div className="capa-label">CONTA:</div>
              <div className="capa-value">{fornecedor.conta || ''}</div>
            </div>
            <div className="capa-row-half">
              <div className="capa-label">TIPO DE CONTA:</div>
              <div className="capa-value">{fornecedor.tipoConta || ''}</div>
            </div>
          </div>
          <div className="capa-row">
            <div className="capa-label">OP:</div>
            <div className="capa-value">{fornecedor.op || ''}</div>
          </div>
          <div className="capa-row">
            <div className="capa-label">CNPJ/CPF:</div>
            <div className="capa-value">{formatCNPJ(fornecedor.cnpj) || ''}</div>
          </div>
          <div className="capa-row-double">
            <div className="capa-row-half">
              <div className="capa-label">CHAVE PIX:</div>
              <div className="capa-value">{fornecedor.chavePix || ''}</div>
            </div>
            <div className="capa-row-half">
              <div className="capa-label">TIPO CHAVE PIX:</div>
              <div className="capa-value">{fornecedor.tipoChavePix || ''}</div>
            </div>
          </div>
        </div>

        {/* ========== DADOS DA FATURA ========== */}
        <div className="capa-section-title">DADOS DA FATURA</div>

        <div className="capa-section">
          <div className="capa-row capa-row-valor">
            <div className="capa-label">VALOR:</div>
            <div className="capa-value valor-destaque">{formatCurrency(fatura.valor)}</div>
          </div>
          <div className="capa-row">
            <div className="capa-label">FILIAL:</div>
            <div className="capa-value">{fatura.filial?.razaoSocial || ''}</div>
          </div>
        </div>

        {/* ========== APLICAÇÃO ========== */}
        <div className="capa-section-title">APLICAÇÃO</div>

        <div className="capa-section">
          <div className="capa-checkboxes">
            <div className="capa-check-item">
              <span className="capa-check-label">CAPEX</span>
              <span className={`checkbox ${fatura.aplicacao === 'CAPEX' ? 'checked' : ''}`}>
                {fatura.aplicacao === 'CAPEX' ? '✓' : ''}
              </span>
            </div>
            <div className="capa-check-item">
              <span className="capa-check-label">OPEX</span>
              <span className={`checkbox ${fatura.aplicacao === 'OPEX' ? 'checked' : ''}`}>
                {fatura.aplicacao === 'OPEX' ? '✓' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* ========== CONTABILIDADE ========== */}
        <div className="capa-section-title">CONTABILIDADE</div>

        <div className="capa-section">
          <div className="capa-row">
            <div className="capa-label">CENTRO DE CUSTO:</div>
            <div className="capa-value">
              {fatura.centroCusto ? `${fatura.centroCusto.numero} - ${fatura.centroCusto.descricao}` : ''}
            </div>
          </div>
          <div className="capa-row">
            <div className="capa-label">CONTA CONTÁBIL:</div>
            <div className="capa-value">
              {fatura.contaContabil ? `${fatura.contaContabil.numero} - ${fatura.contaContabil.descricao}` : ''}
            </div>
          </div>
          <div className="capa-row">
            <div className="capa-label">NATUREZA:</div>
            <div className="capa-value">{fatura.natureza?.descricao || ''}</div>
          </div>
          <div className="capa-row">
            <div className="capa-label">VENCIMENTO:</div>
            <div className="capa-value">{formatDate(fatura.vencimento)}</div>
          </div>
        </div>

        {/* ========== ASSINATURA ========== */}
        <div className="capa-assinatura-area">
          <div className="capa-assinatura-espaco"></div>
          <div className="capa-assinatura-linha"></div>
          <div className="capa-assinatura-texto">ASS. RESPONSÁVEL</div>
        </div>

        {/* ========== SELO ========== */}
        <div className="capa-selo">
          <img src="/img/selo-voltaris.png" alt="" className="selo-img" />
        </div>

        {/* ========== PROTOCOLO ========== */}
        <div className="capa-section capa-protocolo">
          <div className="capa-row">
            <div className="capa-label">Nº PROTOCOLO:</div>
            <div className="capa-value capa-protocol-field"></div>
          </div>
          <div className="capa-row">
            <div className="capa-label">DATA ENVIO:</div>
            <div className="capa-value">{formatDate(new Date())}</div>
          </div>
        </div>

      </div>
    </div>
  );
}
