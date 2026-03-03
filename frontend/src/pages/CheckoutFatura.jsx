import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import {
  FiAlertCircle, FiCheckCircle, FiAlertTriangle, FiClock,
  FiDownload, FiEye, FiEyeOff, FiX, FiInfo, FiBell,
  FiFileText, FiZap, FiDollarSign, FiGrid,
  FiChevronLeft, FiChevronRight, FiSearch, FiExternalLink
} from 'react-icons/fi';
import '../styles/pages/checkout.css';

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function getStatusGeralBadge(s) {
  switch (s) {
    case 'EM_DIA': return { className: 'badge-em-dia', label: 'Em dia' };
    case 'AGUARDANDO': return { className: 'badge-aguardando', label: 'Aguardando' };
    case 'PENDENTE': return { className: 'badge-pendente', label: 'Pendente' };
    case 'CRITICO': return { className: 'badge-critico', label: 'Crítico' };
    default: return { className: 'badge-default', label: s || '—' };
  }
}

export default function CheckoutFatura() {
  const navigate = useNavigate();
  const [checkout, setCheckout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [filtroFilial, setFiltroFilial] = useState('');
  const [filtroFornecedor, setFiltroFornecedor] = useState('');
  const [busca, setBusca] = useState('');
  const [detalheModal, setDetalheModal] = useState(null);
  const [detalheLoading, setDetalheLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});

  const fetchCheckout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/checkout/matriz?ano=${ano}`);
      setCheckout(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar checkout');
      toast.error('Erro ao carregar dados do checkout');
    } finally {
      setLoading(false);
    }
  }, [ano]);

  useEffect(() => {
    fetchCheckout();
  }, [fetchCheckout]);

  function irParaLancamento(ucId, ref) {
    navigate(`/lancar-fatura?ucId=${ucId}&ref=${ref}`);
  }

  async function handleCellClick(ucRow, mesIdx) {
    const cell = ucRow.meses[mesIdx];
    if (!cell || cell.status === 'FUTURO') return;

    if (cell.status === 'PENDENTE' || cell.status === 'AGUARDANDO') {
      const ref = `${ano}-${String(mesIdx + 1).padStart(2, '0')}`;
      irParaLancamento(ucRow.ucId, ref);
      return;
    }

    setDetalheLoading(true);
    setDetalheModal({ ucRow, mesIdx, data: null });
    try {
      const ref = `${ano}-${String(mesIdx + 1).padStart(2, '0')}`;
      const res = await api.get(`/checkout/detalhe/${ucRow.ucId}?ref=${ref}`);
      setDetalheModal({ ucRow, mesIdx, data: res.data });
    } catch (err) {
      toast.error('Erro ao carregar detalhes');
      setDetalheModal(null);
    } finally {
      setDetalheLoading(false);
    }
  }

  function toggleRow(ucId) {
    setExpandedRows(prev => ({ ...prev, [ucId]: !prev[ucId] }));
  }

  function exportCSV() {
    if (!checkout?.matriz) return;
    const header = ['UC', 'Código', 'Filial', 'Fornecedor', ...MONTHS_PT, 'Status Geral'];
    const rows = checkout.matriz.map(uc => [
      uc.nome,
      uc.codigo,
      uc.filial || '',
      uc.fornecedor || '',
      ...uc.meses.map(m => m ? m.status : ''),
      uc.statusGeral
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checkout-faturas-${ano}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function renderCellContent(cell, ucRow, mesIdx) {
    if (!cell || cell.status === 'FUTURO') {
      return <span className="cell-futuro-text">—</span>;
    }
    switch (cell.status) {
      case 'PAGA':
        return (
          <>
            <FiCheckCircle size={13} />
            {cell.valor && <span className="cell-valor">{formatCurrency(cell.valor)}</span>}
          </>
        );
      case 'LANCADA':
        return (
          <>
            <FiFileText size={13} />
            <span className="cell-lancada-label">Lançada</span>
          </>
        );
      case 'PENDENTE':
        return (
          <span className="cell-pendente-text">
            <FiAlertTriangle size={13} />
            <span style={{ fontSize: '0.55rem' }}>Pendente</span>
          </span>
        );
      case 'AGUARDANDO':
        return (
          <span className="cell-aguardando-text">
            <FiClock size={12} />
          </span>
        );
      default:
        return <span>—</span>;
    }
  }

  function renderDetalheContent(modal) {
    const { ucRow, data } = modal;
    const { uc, fatura, ciclo } = data;
    return (
      <>
        <div className="detalhe-uc-info">
          <div><strong>UC:</strong> {uc?.nome}</div>
          <div><strong>Código:</strong> {uc?.codigo}</div>
          <div><strong>Filial:</strong> {uc?.filial}</div>
          <div><strong>Fornecedor:</strong> {uc?.fornecedor}</div>
          <div><strong>Dia Emissão:</strong> {uc?.diaEmissao || '—'}</div>
          <div><strong>Prazo Vencimento:</strong> {uc?.prazoVencimento ? `${uc.prazoVencimento} dias` : '—'}</div>
        </div>

        {ciclo && (
          <div className="detalhe-ciclo">
            <h4>Ciclo da Fatura</h4>
            <div className="ciclo-timeline">
              <div className="ciclo-step">
                <span className="ciclo-label">Emissão</span>
                <span className="ciclo-date">{ciclo.emissao || '—'}</span>
              </div>
              <div className="ciclo-line" />
              <div className="ciclo-step ciclo-step-meia">
                <span className="ciclo-label">Gatilho 50%</span>
                <span className="ciclo-date">{ciclo.gatilho50 || '—'}</span>
              </div>
              <div className="ciclo-line" />
              <div className="ciclo-step ciclo-step-venc">
                <span className="ciclo-label">Vencimento</span>
                <span className="ciclo-date">{ciclo.vencimento || '—'}</span>
              </div>
            </div>
          </div>
        )}

        {fatura ? (
          <div className="detalhe-faturas">
            <h4>Fatura</h4>
            <div className="detalhe-fatura-card">
              <div className="fatura-row">
                <div><strong>NF:</strong> {fatura.notaFiscal || '—'}</div>
                <div><strong>Valor:</strong> {formatCurrency(fatura.valor)}</div>
                <div><strong>Status:</strong> <span className={`mini-badge st-${fatura.status?.toLowerCase()}`}>{fatura.status}</span></div>
              </div>
              <div className="fatura-row">
                <div><strong>Vencimento:</strong> {fatura.vencimento ? new Date(fatura.vencimento).toLocaleDateString('pt-BR') : '—'}</div>
                <div><strong>Referência:</strong> {fatura.referencia || '—'}</div>
                <div><strong>Leitura kWh:</strong> {fatura.leituraKwh || '—'}</div>
              </div>
              {fatura.workflow && (
                <div className="fatura-workflow">
                  <h5>Workflow</h5>
                  <div className="workflow-steps">
                    {fatura.workflow.map((step, si) => (
                      <div key={si} className={`wf-step ${step.concluido ? 'wf-done' : ''}`}>
                        <span>{step.etapa}</span>
                        {step.data && <small>{step.data}</small>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="detalhe-sem-fatura">
            <FiAlertCircle size={36} />
            <strong>Nenhuma fatura lançada para este mês</strong>
            <p>Clique abaixo para lançar a fatura desta UC para o período selecionado.</p>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setDetalheModal(null);
                const ref = `${ano}-${String(modal.mesIdx + 1).padStart(2, '0')}`;
                irParaLancamento(ucRow.ucId, ref);
              }}
            >
              <FiExternalLink size={14} /> Lançar Fatura
            </button>
          </div>
        )}
      </>
    );
  }

  // ─── RENDER ───
  if (loading) {
    return (
      <div className="checkout-loading">
        <div className="checkout-spinner" />
        <span>Carregando checkout de faturas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="checkout-error">
        <FiAlertCircle size={20} /> {error}
      </div>
    );
  }

  if (!checkout) return null;

  const { indicadores, matriz, notificacoes, filtros } = checkout;

  let matrizFiltrada = matriz || [];
  if (filtroStatus !== 'TODOS') {
    matrizFiltrada = matrizFiltrada.filter(uc => uc.statusGeral === filtroStatus);
  }
  if (filtroFilial) {
    matrizFiltrada = matrizFiltrada.filter(uc => uc.filial === filtroFilial);
  }
  if (filtroFornecedor) {
    matrizFiltrada = matrizFiltrada.filter(uc => uc.fornecedor === filtroFornecedor);
  }
  if (busca) {
    const term = busca.toLowerCase();
    matrizFiltrada = matrizFiltrada.filter(uc =>
      uc.nome?.toLowerCase().includes(term) ||
      uc.codigo?.toLowerCase().includes(term) ||
      uc.filial?.toLowerCase().includes(term)
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <div>
          <h2 className="checkout-title">
            <FiGrid size={22} /> Checkout de Faturas
          </h2>
          <p className="checkout-subtitle">Matriz de disponibilidade — {ano}</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={exportCSV}>
          <FiDownload size={14} /> Exportar CSV
        </button>
      </div>

      <div className="checkout-kpis">
        <div className="checkout-kpi kpi-blue">
          <div className="kpi-icon"><FiZap size={20} /></div>
          <div>
            <small>Total UCs</small>
            <strong>{indicadores?.totalUcs || 0}</strong>
          </div>
        </div>
        <div className="checkout-kpi kpi-green">
          <div className="kpi-icon"><FiCheckCircle size={20} /></div>
          <div>
            <small>Pagas em {MONTHS_PT[new Date().getMonth()]}</small>
            <strong>{indicadores?.pagas || 0}</strong>
          </div>
        </div>
        <div className="checkout-kpi kpi-orange">
          <div className="kpi-icon"><FiAlertTriangle size={20} /></div>
          <div>
            <small>Pendentes (total ano)</small>
            <strong>{indicadores?.totalPendentesGeral || 0}</strong>
          </div>
        </div>
        <div className="checkout-kpi kpi-purple">
          <div className="kpi-icon"><FiDollarSign size={20} /></div>
          <div>
            <small>Faturamento {ano}</small>
            <strong>{formatCurrency(indicadores?.faturamentoTotal)}</strong>
          </div>
        </div>
      </div>

      <div className="checkout-controls">
        <div className="checkout-controls-left">
          <div className="year-nav">
            <button className="btn btn-ghost btn-sm" onClick={() => setAno(a => a - 1)}>
              <FiChevronLeft size={16} />
            </button>
            <span className="year-label">{ano}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setAno(a => a + 1)}>
              <FiChevronRight size={16} />
            </button>
          </div>

          <select className="checkout-filter-select" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
            <option value="TODOS">Todos os Status</option>
            <option value="EM_DIA">Em Dia</option>
            <option value="AGUARDANDO">Aguardando</option>
            <option value="PENDENTE">Pendente</option>
            <option value="CRITICO">Crítico</option>
          </select>

          {filtros?.filiais?.length > 0 && (
            <select className="checkout-filter-select" value={filtroFilial} onChange={e => setFiltroFilial(e.target.value)}>
              <option value="">Todas Filiais</option>
              {filtros.filiais.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          )}

          {filtros?.fornecedores?.length > 0 && (
            <select className="checkout-filter-select" value={filtroFornecedor} onChange={e => setFiltroFornecedor(e.target.value)}>
              <option value="">Todos Fornecedores</option>
              {filtros.fornecedores.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          )}
        </div>
        <div className="checkout-controls-right">
          <div className="checkout-search">
            <FiSearch size={14} />
            <input
              type="text"
              placeholder="Buscar UC..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="checkout-legend">
        <span className="legend-item"><span className="legend-dot dot-paga" /> Paga</span>
        <span className="legend-item"><span className="legend-dot dot-lancada" /> Lançada</span>
        <span className="legend-item"><span className="legend-dot dot-pendente" /> Pendente</span>
        <span className="legend-item"><span className="legend-dot dot-aguardando" /> Aguardando</span>
        <span className="legend-item"><span className="legend-dot dot-futuro" /> Futuro</span>
      </div>

      <div className="checkout-matrix-container">
        <table className="checkout-matrix">
          <thead>
            <tr>
              <th className="col-uc">UC</th>
              {MONTHS_PT.map((m, i) => <th key={i} className="col-mes">{m}</th>)}
              <th className="col-status">Status</th>
            </tr>
          </thead>
          <tbody>
            {matrizFiltrada.length === 0 ? (
              <tr>
                <td colSpan={14} className="checkout-empty">
                  <FiInfo size={16} /> Nenhuma UC encontrada com os filtros selecionados
                </td>
              </tr>
            ) : (
              matrizFiltrada.map((uc) => (
                <tr key={uc.ucId}>
                  <td className="col-uc">
                    <div className="uc-cell-info">
                      <button className="uc-toggle-btn" onClick={() => toggleRow(uc.ucId)}>
                        {expandedRows[uc.ucId] ? <FiEyeOff size={12} /> : <FiEye size={12} />}
                      </button>
                      <div>
                        <div className="uc-name">{uc.nome}</div>
                        {expandedRows[uc.ucId] && (
                          <div className="uc-details">
                            <span>{uc.codigo}</span>
                            <span>{uc.filial}</span>
                            <span>{uc.fornecedor}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  {uc.meses.map((cell, mi) => (
                    <td
                      key={mi}
                      className={`col-mes cell-mes ${cell ? `cell-${cell.status.toLowerCase()}` : 'cell-futuro'}`}
                      onClick={() => handleCellClick(uc, mi)}
                      title={cell ? `${MONTHS_PT[mi]}: ${cell.status}` : `${MONTHS_PT[mi]}: Futuro`}
                    >
                      {renderCellContent(cell, uc, mi)}
                    </td>
                  ))}
                  <td className="col-status">
                    {(() => {
                      const badge = getStatusGeralBadge(uc.statusGeral);
                      return <span className={`status-badge ${badge.className}`}>{badge.label}</span>;
                    })()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="checkout-summary">
        <span><strong>{matrizFiltrada.length}</strong> UCs exibidas</span>
        <span>Em dia: <strong style={{ color: '#10b981' }}>{indicadores.ucsEmDia}</strong></span>
        <span>Aguardando: <strong style={{ color: '#94a3b8' }}>{indicadores.ucsAguardando}</strong></span>
        <span>Pendentes: <strong style={{ color: '#f59e0b' }}>{indicadores.ucsPendentes}</strong></span>
        <span>Críticas: <strong style={{ color: '#e11d48' }}>{indicadores.ucsCriticas}</strong></span>
      </div>

      {notificacoes && notificacoes.length > 0 && (
        <div className="checkout-notificacoes card">
          <h3 className="noti-title">
            <FiBell size={14} /> Alertas e Notificações
          </h3>
          <div className="noti-list">
            {notificacoes.map((n, i) => (
              <div key={i} className={`noti-item noti-${n.tipo.toLowerCase()}`}>
                <div className="noti-icon">
                  {n.tipo === 'CRITICO' && <FiAlertCircle size={16} />}
                  {n.tipo === 'PENDENTE' && <FiAlertTriangle size={16} />}
                  {n.tipo === 'AVISO' && <FiAlertTriangle size={16} />}
                  {n.tipo === 'INFO' && <FiInfo size={16} />}
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

      {detalheModal && (
        <div className="modal-overlay" onClick={() => setDetalheModal(null)}>
          <div className="modal-content checkout-detalhe-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <FiFileText size={18} />
                {detalheModal.ucRow.nome} — {MONTHS_PT[detalheModal.mesIdx]}/{ano}
              </h3>
              <button className="modal-close" onClick={() => setDetalheModal(null)}>
                <FiX size={18} />
              </button>
            </div>
            <div className="modal-body">
              {detalheLoading ? (
                <div className="checkout-loading" style={{ minHeight: 200 }}>
                  <div className="checkout-spinner" />
                  <span>Carregando detalhes...</span>
                </div>
              ) : detalheModal.data ? (
                renderDetalheContent(detalheModal)
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
