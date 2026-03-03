import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import {
  FiAlertCircle, FiCheckCircle, FiAlertTriangle, FiClock,
  FiDownload, FiEye, FiEyeOff, FiX, FiInfo, FiBell,
  FiFileText, FiZap, FiDollarSign, FiGrid, FiFilter,
  FiChevronLeft, FiChevronRight, FiSearch
} from 'react-icons/fi';
import '../styles/pages/checkout.css';

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatDate(d) {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleDateString('pt-BR');
}

function formatRef(ref) {
  if (!ref) return '';
  const [year, month] = ref.split('-');
  return MONTHS_PT[parseInt(month) - 1] + '/' + year;
}

// ==================== STATUS HELPERS ====================

function getStatusLabel(status) {
  switch (status) {
    case 'OK': return 'Pago';
    case 'EM_ANDAMENTO': return 'Em andamento';
    case 'PROXIMO_VENCIMENTO': return 'Próx. vencimento';
    case 'AGUARDANDO': return 'Aguardando';
    case 'CRITICO': return 'Crítico';
    case 'ATRASO': return 'Em atraso';
    case 'REJEITADA': return 'Rejeitada';
    case 'FUTURO': return '-';
    case 'SEM_LANCAMENTO': return '-';
    default: return status;
  }
}

function getStatusGeralBadge(s) {
  switch (s) {
    case 'EM_DIA': return { className: 'badge-em-dia', label: 'Em dia' };
    case 'AGUARDANDO': return { className: 'badge-aguardando', label: 'Aguardando' };
    case 'EM_ATRASO': return { className: 'badge-atraso', label: 'Em atraso' };
    case 'CRITICO': return { className: 'badge-critico', label: 'CRÍTICO' };
    default: return { className: 'badge-default', label: s };
  }
}

// ==================== COMPONENTE PRINCIPAL ====================

export default function CheckoutFatura() {
  const [checkout, setCheckout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [soPendencias, setSoPendencias] = useState(false);
  const [filialFilter, setFilialFilter] = useState('');
  const [fornecedorFilter, setFornecedorFilter] = useState('');
  const [searchUC, setSearchUC] = useState('');
  const [detalheModal, setDetalheModal] = useState(null);
  const [detalheLoading, setDetalheLoading] = useState(false);

  const loadCheckout = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ano };
      if (filialFilter) params.filialId = filialFilter;
      if (fornecedorFilter) params.fornecedorId = fornecedorFilter;
      if (soPendencias) params.soPendencias = 'true';
      const res = await api.get('/checkout', { params });
      setCheckout(res.data);
    } catch (err) {
      console.error('Erro checkout:', err);
      toast.error('Erro ao carregar checkout de faturas');
    } finally {
      setLoading(false);
    }
  }, [ano, filialFilter, fornecedorFilter, soPendencias]);

  useEffect(() => { loadCheckout(); }, [loadCheckout]);

  async function openDetalhe(ucId, ref) {
    setDetalheLoading(true);
    try {
      const res = await api.get(`/checkout/detalhe/${ucId}/${ref}`);
      setDetalheModal(res.data);
    } catch (err) {
      toast.error('Erro ao carregar detalhes');
    } finally {
      setDetalheLoading(false);
    }
  }

  function exportCSV() {
    if (!checkout) return;
    const { matriz } = checkout;
    
    let csv = 'UC;Instalação;Filial;Fornecedor;Dia Emissão;Prazo Vencimento;Status Geral';
    MONTHS_PT.forEach(m => csv += `;${m}`);
    csv += '\n';

    matriz.forEach(uc => {
      csv += `"${uc.uc}";"${uc.numInstalacao}";"${uc.filial || ''}";"${uc.fornecedor || ''}"`;
      csv += `;${uc.diaEmissao || '-'};${uc.prazoVencimento ? uc.prazoVencimento + 'd' : '-'};"${getStatusGeralBadge(uc.statusGeral).label}"`;
      uc.meses.forEach(m => {
        if (m.valor) {
          csv += `;${Number(m.valor).toFixed(2).replace('.', ',')}`;
        } else {
          csv += `;${getStatusLabel(m.status)}`;
        }
      });
      csv += '\n';
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checkout-faturas-${ano}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado com sucesso!');
  }

  if (loading) {
    return (
      <div className="checkout-loading">
        <div className="checkout-spinner" />
        <p>Carregando checkout de faturas...</p>
      </div>
    );
  }

  if (!checkout) {
    return <div className="checkout-error"><FiAlertCircle size={24} /> Erro ao carregar dados.</div>;
  }

  const { indicadores, matriz, notificacoes, filtros } = checkout;

  // Filtro local por busca de UC
  const matrizFiltrada = searchUC
    ? matriz.filter(uc => uc.uc.toLowerCase().includes(searchUC.toLowerCase()) || uc.filial?.toLowerCase().includes(searchUC.toLowerCase()))
    : matriz;

  return (
    <div className="page-enter checkout-page">
      {/* HEADER */}
      <div className="checkout-header">
        <div>
          <h1 className="checkout-title">
            <FiGrid size={22} /> Checkout de Faturas
          </h1>
          <p className="checkout-subtitle">
            Monitoramento de disponibilidade · Regra 50% (Emissão → Vencimento)
          </p>
        </div>
        <button className="btn btn-primary" onClick={exportCSV}>
          <FiDownload size={14} /> Exportar CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="checkout-kpis">
        <div className="checkout-kpi kpi-blue">
          <div className="kpi-icon"><FiZap size={20} /></div>
          <div>
            <small>Total UCs</small>
            <strong>{indicadores.totalUCs}</strong>
          </div>
        </div>
        <div className="checkout-kpi kpi-green">
          <div className="kpi-icon"><FiCheckCircle size={20} /></div>
          <div>
            <small>Cobertura {formatRef(indicadores.mesReferencia)}</small>
            <strong>{indicadores.cobertura}%</strong>
          </div>
        </div>
        <div className="checkout-kpi kpi-red">
          <div className="kpi-icon"><FiAlertTriangle size={20} /></div>
          <div>
            <small>Omissões Críticas</small>
            <strong>{indicadores.omissoesCriticas}</strong>
          </div>
        </div>
        <div className="checkout-kpi kpi-purple">
          <div className="kpi-icon"><FiDollarSign size={20} /></div>
          <div>
            <small>Faturamento {ano}</small>
            <strong>{formatCurrency(indicadores.faturamentoAno)}</strong>
          </div>
        </div>
      </div>

      {/* CONTROLES */}
      <div className="checkout-controls">
        <div className="checkout-controls-left">
          {/* Navegação de Ano */}
          <div className="year-nav">
            <button className="btn btn-outline btn-sm" onClick={() => setAno(ano - 1)}>
              <FiChevronLeft size={14} /> {ano - 1}
            </button>
            <span className="year-label">{ano}</span>
            <button className="btn btn-outline btn-sm" onClick={() => setAno(ano + 1)}>
              {ano + 1} <FiChevronRight size={14} />
            </button>
          </div>

          {/* Toggle pendências */}
          <button
            className={'btn btn-sm ' + (soPendencias ? 'btn-danger' : 'btn-outline')}
            onClick={() => setSoPendencias(!soPendencias)}
          >
            {soPendencias ? <><FiEyeOff size={13} /> Só Pendências</> : <><FiEye size={13} /> Todas</>}
          </button>
        </div>

        <div className="checkout-controls-right">
          {/* Filtros */}
          {filtros && (
            <>
              <select
                className="checkout-filter-select"
                value={filialFilter}
                onChange={e => setFilialFilter(e.target.value)}
              >
                <option value="">Todas Filiais</option>
                {filtros.filiais.map(f => <option key={f.id} value={f.id}>{f.razaoSocial}</option>)}
              </select>
              <select
                className="checkout-filter-select"
                value={fornecedorFilter}
                onChange={e => setFornecedorFilter(e.target.value)}
              >
                <option value="">Todos Fornecedores</option>
                {filtros.fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </>
          )}

          {/* Busca UC */}
          <div className="checkout-search">
            <FiSearch size={14} />
            <input
              type="text"
              placeholder="Buscar UC..."
              value={searchUC}
              onChange={e => setSearchUC(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* LEGENDA */}
      <div className="checkout-legend">
        <span className="legend-item"><span className="legend-dot dot-ok" /> Pago / OK</span>
        <span className="legend-item"><span className="legend-dot dot-andamento" /> Em andamento</span>
        <span className="legend-item"><span className="legend-dot dot-aguardando" /> Aguardando (&lt;50%)</span>
        <span className="legend-item"><span className="legend-dot dot-critico" /> Crítico (&gt;50%)</span>
        <span className="legend-item"><span className="legend-dot dot-atraso" /> Atraso / Vencido</span>
        <span className="legend-item"><span className="legend-dot dot-futuro" /> Futuro</span>
      </div>

      {/* MATRIZ */}
      <div className="checkout-matrix-wrapper">
        <table className="checkout-matrix">
          <thead>
            <tr>
              <th className="col-uc">Unidade Consumidora</th>
              {MONTHS_PT.map((m, i) => (
                <th key={i} className="col-mes">{m}</th>
              ))}
              <th className="col-ciclo">Ciclo</th>
              <th className="col-status">Status</th>
            </tr>
          </thead>
          <tbody>
            {matrizFiltrada.length === 0 ? (
              <tr>
                <td colSpan={15} className="checkout-empty">
                  <FiCheckCircle size={18} />
                  {soPendencias
                    ? 'Nenhuma pendência encontrada! Todas as UCs estão em dia.'
                    : 'Nenhuma UC encontrada com os filtros aplicados.'}
                </td>
              </tr>
            ) : matrizFiltrada.map(uc => {
              const badge = getStatusGeralBadge(uc.statusGeral);
              const isCritico = uc.statusGeral === 'CRITICO';
              return (
                <tr key={uc.id} className={isCritico ? 'row-critico' : ''}>
                  <td className="col-uc cell-uc">
                    <strong>{uc.uc}</strong>
                    <span className="uc-filial">{uc.filial}</span>
                  </td>
                  {uc.meses.map((m, i) => {
                    const isClickable = m.status !== 'FUTURO';
                    return (
                      <td key={i} className="col-mes">
                        <div
                          className={`cell-block cell-${m.status.toLowerCase().replace(/_/g, '-')} ${m.qtdFaturas > 1 ? 'cell-multi' : ''} ${isClickable ? 'cell-clickable' : ''}`}
                          onClick={() => isClickable && openDetalhe(uc.id, m.ref)}
                          title={`${uc.uc} · ${m.mesLabel}/${ano} · ${getStatusLabel(m.status)}`}
                        >
                          {renderCellContent(m)}
                        </div>
                      </td>
                    );
                  })}
                  <td className="col-ciclo cell-ciclo">
                    {uc.diaEmissao && uc.prazoVencimento ? (
                      <span className="ciclo-badge">
                        Dia {uc.diaEmissao} + {uc.prazoVencimento}d
                      </span>
                    ) : uc.prazoVencimento ? (
                      <span className="ciclo-badge">Prazo {uc.prazoVencimento}d</span>
                    ) : (
                      <span className="ciclo-badge ciclo-na">N/A</span>
                    )}
                  </td>
                  <td className="col-status">
                    <span className={`status-badge ${badge.className}`}>
                      {badge.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* RESUMO RODAPÉ */}
      <div className="checkout-summary">
        <span><strong>{matrizFiltrada.length}</strong> UCs exibidas</span>
        <span>Em dia: <strong style={{ color: '#10b981' }}>{indicadores.ucsEmDia}</strong></span>
        <span>Aguardando: <strong style={{ color: '#f59e0b' }}>{indicadores.ucsAguardando}</strong></span>
        <span>Críticas: <strong style={{ color: '#e11d48' }}>{indicadores.ucsCriticas}</strong></span>
      </div>

      {/* NOTIFICAÇÕES */}
      {notificacoes && notificacoes.length > 0 && (
        <div className="checkout-notificacoes card">
          <h3 className="noti-title">
            <FiBell size={16} /> Notificações
          </h3>
          <div className="noti-list">
            {notificacoes.map((n, i) => (
              <div key={i} className={`noti-item noti-${n.tipo.toLowerCase()}`}>
                <div className="noti-icon">
                  {n.tipo === 'CRITICO' && <FiX size={14} />}
                  {n.tipo === 'ALERTA' && <FiAlertTriangle size={14} />}
                  {n.tipo === 'AVISO' && <FiAlertCircle size={14} />}
                  {n.tipo === 'INFO' && <FiInfo size={14} />}
                </div>
                <div className="noti-content">
                  <div className="noti-msg">{n.mensagem}</div>
                  {n.detalhe && <div className="noti-detail">{n.detalhe}</div>}
                </div>
                <span className="noti-date">{n.data}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL DE DETALHE */}
      {(detalheModal || detalheLoading) && (
        <div className="modal-overlay" onClick={() => !detalheLoading && setDetalheModal(null)}>
          <div className="modal checkout-detalhe-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <FiFileText size={18} />
                {detalheLoading ? 'Carregando...' : `${detalheModal.uc.uc} — ${formatRef(detalheModal.referencia)}`}
              </h3>
              <button className="modal-close" onClick={() => setDetalheModal(null)}><FiX size={18} /></button>
            </div>
            {detalheLoading ? (
              <div className="modal-body" style={{ textAlign: 'center', padding: 40 }}>
                <div className="checkout-spinner" />
              </div>
            ) : detalheModal && (
              <div className="modal-body">
                {/* Info UC */}
                <div className="detalhe-uc-info">
                  <div><strong>UC:</strong> {detalheModal.uc.uc}</div>
                  <div><strong>Instalação:</strong> {detalheModal.uc.numInstalacao}</div>
                  <div><strong>Filial:</strong> {detalheModal.uc.filial}</div>
                  <div><strong>Fornecedor:</strong> {detalheModal.uc.fornecedor}</div>
                </div>

                {/* Ciclo */}
                <div className="detalhe-ciclo">
                  <h4>Ciclo do Mês ({formatRef(detalheModal.referencia)})</h4>
                  <div className="ciclo-timeline">
                    <div className="ciclo-step">
                      <span className="ciclo-label">Emissão</span>
                      <span className="ciclo-date">{formatDate(detalheModal.ciclo.dataEmissao)}</span>
                    </div>
                    <div className="ciclo-line" />
                    <div className="ciclo-step ciclo-step-meia">
                      <span className="ciclo-label">50% (Meia-vida)</span>
                      <span className="ciclo-date">{formatDate(detalheModal.ciclo.meiaVida)}</span>
                    </div>
                    <div className="ciclo-line" />
                    <div className="ciclo-step ciclo-step-venc">
                      <span className="ciclo-label">Vencimento</span>
                      <span className="ciclo-date">{formatDate(detalheModal.ciclo.dataVencimento)}</span>
                    </div>
                  </div>
                </div>

                {/* Faturas */}
                {detalheModal.faturas.length === 0 ? (
                  <div className="detalhe-sem-fatura">
                    <FiAlertTriangle size={20} />
                    <p>Nenhuma fatura lançada para este mês de referência.</p>
                  </div>
                ) : (
                  <div className="detalhe-faturas">
                    <h4>Fatura(s) Lançada(s)</h4>
                    {detalheModal.faturas.map((fat, idx) => (
                      <div key={idx} className="detalhe-fatura-card">
                        <div className="fatura-row">
                          <div><strong>NF:</strong> {fat.notaFiscal || '-'}</div>
                          <div><strong>Valor:</strong> {formatCurrency(fat.valor)}</div>
                          <div><strong>Status:</strong> <span className={`mini-badge st-${fat.status.toLowerCase()}`}>{fat.status}</span></div>
                        </div>
                        <div className="fatura-row">
                          <div><strong>Vencimento:</strong> {formatDate(fat.vencimento)}</div>
                          <div><strong>kWh:</strong> {fat.leituraKwh || '-'}</div>
                          <div><strong>Pagamento:</strong> {fat.formaPagamento || '-'}</div>
                        </div>
                        <div className="fatura-workflow">
                          <h5>Workflow</h5>
                          <div className="workflow-steps">
                            <div className={`wf-step ${fat.dataLancamento ? 'wf-done' : ''}`}>
                              <span>Lançamento</span>
                              <small>{fat.lancadoPor || '-'}</small>
                              <small>{formatDate(fat.dataLancamento)}</small>
                            </div>
                            <div className={`wf-step ${fat.dataAprovacao ? 'wf-done' : ''}`}>
                              <span>Aprovação</span>
                              <small>{fat.aprovadoPor || '-'}</small>
                              <small>{formatDate(fat.dataAprovacao)}</small>
                            </div>
                            <div className={`wf-step ${fat.dataLiberacao ? 'wf-done' : ''}`}>
                              <span>Liberação</span>
                              <small>{fat.liberadoPor || '-'}</small>
                              <small>{formatDate(fat.dataLiberacao)}</small>
                            </div>
                            <div className={`wf-step ${fat.dataProtocolo ? 'wf-done' : ''}`}>
                              <span>Protocolo</span>
                              <small>{fat.protocoladoPor || '-'}</small>
                              <small>{formatDate(fat.dataProtocolo)}</small>
                            </div>
                            <div className={`wf-step ${fat.dataBaixa ? 'wf-done' : ''}`}>
                              <span>Baixa</span>
                              <small>{fat.baixadoPor || '-'}</small>
                              <small>{formatDate(fat.dataBaixa)}</small>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== RENDER CELL CONTENT ====================
function renderCellContent(m) {
  if (m.status === 'FUTURO') {
    return <span className="cell-dash">—</span>;
  }
  if (m.status === 'CRITICO') {
    return (
      <span className="cell-critico-text">
        <FiAlertTriangle size={12} />
        <span>PENDENTE</span>
      </span>
    );
  }
  if (m.status === 'AGUARDANDO') {
    return (
      <span className="cell-aguardando-text">
        <FiClock size={11} />
        <span>Aguardando</span>
      </span>
    );
  }
  if (m.status === 'SEM_LANCAMENTO') {
    return <span className="cell-dash">—</span>;
  }
  if (m.status === 'ATRASO' || m.status === 'REJEITADA') {
    return (
      <>
        {m.valor && <span className="cell-valor">{formatCurrency(m.valor)}</span>}
        {m.notaFiscal && <span className="cell-nf">NF: {m.notaFiscal}</span>}
        <span className="cell-atraso-label">PENDENTE</span>
      </>
    );
  }
  if (m.qtdFaturas > 1) {
    return (
      <>
        <span className="cell-valor">{formatCurrency(m.valor)}</span>
        <span className="cell-multi-label">({m.qtdFaturas}) faturas</span>
      </>
    );
  }
  // OK, EM_ANDAMENTO, PROXIMO_VENCIMENTO
  return (
    <>
      {m.valor && <span className="cell-valor">{formatCurrency(m.valor)}</span>}
      {m.notaFiscal && <span className="cell-nf">NF: {m.notaFiscal}</span>}
    </>
  );
}
