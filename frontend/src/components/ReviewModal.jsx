import { useState } from 'react';
import { formatCurrency, formatDate, formatDateTime, formatCNPJ } from '../utils/formatters';
import { FiX, FiEye } from 'react-icons/fi';
import ProcessoViewer from './ProcessoViewer';

export default function ReviewModal({ fatura, title, actions, onClose, extraInfo }) {
  const [showProcesso, setShowProcesso] = useState(false);

  if (!fatura) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex-between mb-4">
          <h2 style={{ margin: 0 }}>{title || 'Revisão de Lançamento'}</h2>
          <button className="btn btn-secondary btn-sm" onClick={onClose}><FiX size={16} /></button>
        </div>

        {extraInfo && extraInfo}

        <div className="review-grid">
          <div className="review-item">
            <b>Fornecedor</b>
            <span>{fatura.fornecedor?.nome || '-'}</span>
          </div>
          <div className="review-item">
            <b>CNPJ Fornecedor</b>
            <span>{fatura.fornecedor?.cnpj ? formatCNPJ(fatura.fornecedor.cnpj) : '-'}</span>
          </div>
          <div className="review-item">
            <b>Unidade (UC)</b>
            <span>{fatura.uc?.uc || '-'}</span>
          </div>
          <div className="review-item">
            <b>Nº Instalação</b>
            <span>{fatura.uc?.numInstalacao || '-'}</span>
          </div>
          <div className="review-item">
            <b>Filial</b>
            <span>{fatura.filial?.razaoSocial || '-'}</span>
          </div>
          <div className="review-item">
            <b>Vencimento</b>
            <span style={{ color: 'var(--danger)' }}>{formatDate(fatura.vencimento)}</span>
          </div>
          <div className="review-item">
            <b>Valor</b>
            <span style={{ fontSize: '1.1rem' }}>{formatCurrency(fatura.valor)}</span>
          </div>
          <div className="review-item">
            <b>kWh</b>
            <span>{fatura.leituraKwh || '-'} kWh</span>
          </div>
          <div className="review-item">
            <b>Nota Fiscal</b>
            <span>{fatura.notaFiscal || '-'}</span>
          </div>
          <div className="review-item">
            <b>Referência</b>
            <span>{fatura.referencia || '-'}</span>
          </div>
          <div className="review-item">
            <b>Centro de Custo</b>
            <span>{fatura.centroCusto ? `${fatura.centroCusto.numero} - ${fatura.centroCusto.descricao}` : '-'}</span>
          </div>
          <div className="review-item">
            <b>Conta Contábil</b>
            <span>{fatura.contaContabil ? `${fatura.contaContabil.numero} - ${fatura.contaContabil.descricao}` : '-'}</span>
          </div>
          <div className="review-item">
            <b>Natureza</b>
            <span>{fatura.natureza?.descricao || '-'}</span>
          </div>
          <div className="review-item">
            <b>Pedido de Compras</b>
            <span>{fatura.pedidoCompras || '-'}</span>
          </div>
          <div className="review-item">
            <b>Forma Pagamento</b>
            <span>{fatura.formaPagamento || '-'}</span>
          </div>
          <div className="review-item">
            <b>Aplicação</b>
            <span>{fatura.aplicacao || '-'}</span>
          </div>
          <div className="review-item">
            <b>Lançado por</b>
            <span>{fatura.lancadoPor?.nome || '-'}</span>
          </div>
          <div className="review-item">
            <b>Status</b>
            <span className={`badge badge-${fatura.status?.toLowerCase()}`}>{fatura.status}</span>
          </div>
          {fatura.aprovadoPor && (
            <div className="review-item">
              <b>Aprovado por</b>
              <span>{fatura.aprovadoPor.nome} ({formatDateTime(fatura.dataAprovacao)})</span>
            </div>
          )}
          {fatura.liberadoPor && (
            <div className="review-item">
              <b>Liberado por</b>
              <span>{fatura.liberadoPor.nome} ({formatDateTime(fatura.dataLiberacao)})</span>
            </div>
          )}
          {fatura.protocoladoPor && (
            <div className="review-item">
              <b>Protocolado por</b>
              <span>{fatura.protocoladoPor.nome} ({formatDateTime(fatura.dataProtocolo)})</span>
            </div>
          )}
          {fatura.numeroProtocolo && (
            <div className="review-item">
              <b>Nº Protocolo</b>
              <span>{fatura.numeroProtocolo}</span>
            </div>
          )}
          {fatura.baixadoPor && (
            <div className="review-item">
              <b>Baixado por</b>
              <span>{fatura.baixadoPor.nome} ({formatDateTime(fatura.dataBaixa)})</span>
            </div>
          )}
          {fatura.motivoRejeicao && (
            <div className="review-item" style={{ gridColumn: '1 / -1' }}>
              <b>Motivo Rejeição</b>
              <span style={{ color: 'var(--danger)' }}>{fatura.motivoRejeicao}</span>
            </div>
          )}
          {fatura.estornadoPor && (
            <div className="review-item" style={{ gridColumn: '1 / -1' }}>
              <b style={{ color: '#e65100' }}>Último Estorno</b>
              <span style={{ color: '#e65100' }}>
                Por {fatura.estornadoPor.nome} em {formatDateTime(fatura.dataEstorno)} — Motivo: {fatura.motivoEstorno}
              </span>
            </div>
          )}
        </div>

        {/* Botão único para visualizar processo completo */}
        <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowProcesso(true)}>
            <FiEye size={14} /> Visualizar Lançamento
          </button>
        </div>

        {/* Modal do Processo Completo (PDF unificado) */}
        {showProcesso && (
          <ProcessoViewer fatura={fatura} onClose={() => setShowProcesso(false)} />
        )}

        {/* Actions */}
        {actions && (
          <div className="modal-actions">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
