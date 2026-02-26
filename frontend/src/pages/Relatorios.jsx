import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiFilter, FiSearch, FiDollarSign, FiHash, FiTrendingUp, FiZap, FiDownload, FiEye, FiInfo } from 'react-icons/fi';
import ReviewModal from '../components/ReviewModal';

const STATUS_OPTIONS = ['PENDENTE', 'APROVADA', 'LIBERADA', 'PAGA', 'REJEITADA'];

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('pt-BR');
}

export default function Relatorios() {
  const [activeTab, setActiveTab] = useState('faturas');
  const [faturas, setFaturas] = useState([]);
  const [logs, setLogs] = useState([]);
  const [totais, setTotais] = useState({});
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [selected, setSelected] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [loadingLogFatura, setLoadingLogFatura] = useState(false);
  const [paginationFat, setPaginationFat] = useState({ page: 1, totalPages: 1, total: 0 });
  const [paginationLog, setPaginationLog] = useState({ page: 1, totalPages: 1, total: 0 });

  const [filiais, setFiliais] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [unidades, setUnidades] = useState([]);

  const [filtrosFat, setFiltrosFat] = useState({
    competencia: '',
    status: '',
    filialId: '',
    fornecedorId: '',
    ucId: '',
    dataInicio: '',
    dataFim: '',
  });

  const [filtrosLog, setFiltrosLog] = useState({
    acao: '',
    dataInicio: '',
    dataFim: '',
  });

  useEffect(() => {
    loadAuxData();
  }, []);

  useEffect(() => {
    if (activeTab === 'faturas') loadFaturas();
    else loadLogs();
  }, [activeTab]);

  async function loadAuxData() {
    try {
      const [resF, resForn, resUC] = await Promise.all([
        api.get('/cadastros/filiais'),
        api.get('/cadastros/fornecedores'),
        api.get('/cadastros/unidades'),
      ]);
      setFiliais(resF.data || []);
      setFornecedores(resForn.data || []);
      setUnidades(resUC.data || []);
    } catch (e) {
      console.error('Erro ao carregar dados auxiliares:', e);
    }
  }

  async function loadFaturas(page = 1) {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (filtrosFat.competencia) params.competencia = filtrosFat.competencia;
      if (filtrosFat.status) params.status = filtrosFat.status;
      if (filtrosFat.filialId) params.filialId = filtrosFat.filialId;
      if (filtrosFat.fornecedorId) params.fornecedorId = filtrosFat.fornecedorId;
      if (filtrosFat.ucId) params.ucId = filtrosFat.ucId;
      if (filtrosFat.dataInicio) params.dataInicio = filtrosFat.dataInicio;
      if (filtrosFat.dataFim) params.dataFim = filtrosFat.dataFim;

      const res = await api.get('/relatorios/faturas', { params });
      setFaturas(res.data.data || []);
      setTotais(res.data.totais || {});
      setPaginationFat(res.data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (e) {
      console.error('Erro ao carregar faturas:', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadLogs(page = 1) {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (filtrosLog.acao) params.acao = filtrosLog.acao;
      if (filtrosLog.dataInicio) params.dataInicio = filtrosLog.dataInicio;
      if (filtrosLog.dataFim) params.dataFim = filtrosLog.dataFim;

      const res = await api.get('/relatorios/logs', { params });
      setLogs(res.data.data || []);
      setPaginationLog(res.data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (e) {
      console.error('Erro ao carregar logs:', e);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchFaturas(e) {
    e.preventDefault();
    loadFaturas(1);
  }

  function handleSearchLogs(e) {
    e.preventDefault();
    loadLogs(1);
  }

  function handleClearFiltrosFat() {
    setFiltrosFat({ competencia: '', status: '', filialId: '', fornecedorId: '', ucId: '', dataInicio: '', dataFim: '' });
  }

  function handleClearFiltrosLog() {
    setFiltrosLog({ acao: '', dataInicio: '', dataFim: '' });
  }

  async function handleViewLogFatura(faturaId) {
    if (!faturaId) return;
    setLoadingLogFatura(true);
    try {
      const res = await api.get(`/faturas/${faturaId}`);
      setSelectedLog(res.data);
    } catch (e) {
      console.error('Erro ao carregar fatura do log:', e);
    } finally {
      setLoadingLogFatura(false);
    }
  }

  const acaoColor = (acao) => {
    const map = {
      LANCAMENTO: { bg: '#e3f2fd', color: '#1565c0' },
      APROVACAO: { bg: '#e8f5e9', color: '#2e7d32' },
      REJEICAO: { bg: '#ffebee', color: '#c62828' },
      LIBERACAO: { bg: '#f3e5f5', color: '#6a1b9a' },
      BAIXA: { bg: '#e0f2f1', color: '#00695c' },
      ESTORNO: { bg: '#fff3e0', color: '#e65100' },
      EXCLUSAO: { bg: '#fce4ec', color: '#b71c1c' },
      EDICAO_FATURA: { bg: '#fff8e1', color: '#f57f17' },
      CADASTRO_FILIAL: { bg: '#e8eaf6', color: '#283593' },
      EDICAO_FILIAL: { bg: '#e8eaf6', color: '#283593' },
      EXCLUSAO_FILIAL: { bg: '#fce4ec', color: '#b71c1c' },
      CADASTRO_FORNECEDOR: { bg: '#e8eaf6', color: '#283593' },
      EDICAO_FORNECEDOR: { bg: '#e8eaf6', color: '#283593' },
      EXCLUSAO_FORNECEDOR: { bg: '#fce4ec', color: '#b71c1c' },
      CADASTRO_UC: { bg: '#e8eaf6', color: '#283593' },
      EDICAO_UC: { bg: '#e8eaf6', color: '#283593' },
      EXCLUSAO_UC: { bg: '#fce4ec', color: '#b71c1c' },
      CADASTRO_CC: { bg: '#e8eaf6', color: '#283593' },
      EDICAO_CC: { bg: '#e8eaf6', color: '#283593' },
      CADASTRO_CONTA: { bg: '#e8eaf6', color: '#283593' },
      EDICAO_CONTA: { bg: '#e8eaf6', color: '#283593' },
      CADASTRO_NATUREZA: { bg: '#e8eaf6', color: '#283593' },
      EDICAO_NATUREZA: { bg: '#e8eaf6', color: '#283593' },
      CADASTRO_USUARIO: { bg: '#e8eaf6', color: '#283593' },
      EDICAO_USUARIO: { bg: '#e8eaf6', color: '#283593' },
    };
    return map[acao] || { bg: '#f5f5f5', color: '#616161' };
  };

  const acaoLabel = (acao) => {
    const map = {
      LANCAMENTO: '📄 Lançamento',
      APROVACAO: '✅ Aprovação',
      REJEICAO: '❌ Rejeição',
      LIBERACAO: '🔓 Liberação',
      BAIXA: '💰 Baixa',
      ESTORNO: '↩️ Estorno',
      EXCLUSAO: '🗑️ Exclusão',
      CADASTRO_FILIAL: '🏢 Cad. Filial',
      EDICAO_FILIAL: '🏢 Edit. Filial',
      EXCLUSAO_FILIAL: '🏢 Excl. Filial',
      CADASTRO_FORNECEDOR: '🏭 Cad. Fornecedor',
      EDICAO_FORNECEDOR: '🏭 Edit. Fornecedor',
      EXCLUSAO_FORNECEDOR: '🏭 Excl. Fornecedor',
      CADASTRO_UC: '⚡ Cad. UC',
      EDICAO_UC: '⚡ Edit. UC',
      EXCLUSAO_UC: '⚡ Excl. UC',
      CADASTRO_CC: '📁 Cad. C.Custo',
      EDICAO_CC: '📁 Edit. C.Custo',
      CADASTRO_CONTA: '📊 Cad. Conta',
      EDICAO_CONTA: '📊 Edit. Conta',
      CADASTRO_NATUREZA: '🏷️ Cad. Natureza',
      EDICAO_NATUREZA: '🏷️ Edit. Natureza',
      CADASTRO_USUARIO: '👤 Cad. Usuário',
      EDICAO_USUARIO: '👤 Edit. Usuário',
    };
    return map[acao] || acao;
  };

  const statusClass = (s) => {
    const map = { PENDENTE: 'warning', APROVADA: 'info', LIBERADA: 'success', PAGA: 'neutral', REJEITADA: 'danger' };
    return map[s] || '';
  };

  function buildExportParams() {
    const params = new URLSearchParams();
    if (filtrosFat.competencia) params.set('competencia', filtrosFat.competencia);
    if (filtrosFat.status) params.set('status', filtrosFat.status);
    if (filtrosFat.filialId) params.set('filialId', filtrosFat.filialId);
    if (filtrosFat.fornecedorId) params.set('fornecedorId', filtrosFat.fornecedorId);
    if (filtrosFat.ucId) params.set('ucId', filtrosFat.ucId);
    if (filtrosFat.dataInicio) params.set('dataInicio', filtrosFat.dataInicio);
    if (filtrosFat.dataFim) params.set('dataFim', filtrosFat.dataFim);
    return params.toString();
  }

  function handleExport(tipo) {
    const params = buildExportParams();
    const token = localStorage.getItem('@voltaris:token');
    const sep = params ? '&' : '';
    const url = `/api/relatorios/faturas/export/${tipo}?${params}${sep}token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
  }

  return (
    <div className="page-enter">
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button className={`btn ${activeTab === 'faturas' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('faturas')}>
          Relatório de Faturas
        </button>
        <button className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('logs')}>
          Logs de Auditoria
        </button>
      </div>

      {activeTab === 'faturas' && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showFilters ? 16 : 0 }}>
              <h3 style={{ margin: 0 }}><FiFilter size={14} /> Filtros</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setShowFilters(!showFilters)}>
                {showFilters ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {showFilters && (
              <form onSubmit={handleSearchFaturas}>
                <div className="form-grid-4">
                  <div className="form-group">
                    <label>Competência</label>
                    <input type="month" value={filtrosFat.competencia} onChange={e => setFiltrosFat({ ...filtrosFat, competencia: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Filial</label>
                    <select value={filtrosFat.filialId} onChange={e => setFiltrosFat({ ...filtrosFat, filialId: e.target.value })}>
                      <option value="">Todas</option>
                      {filiais.map(f => <option key={f.id} value={f.id}>{f.razaoSocial}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Fornecedor</label>
                    <select value={filtrosFat.fornecedorId} onChange={e => setFiltrosFat({ ...filtrosFat, fornecedorId: e.target.value })}>
                      <option value="">Todos</option>
                      {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>UC</label>
                    <select value={filtrosFat.ucId} onChange={e => setFiltrosFat({ ...filtrosFat, ucId: e.target.value })}>
                      <option value="">Todas</option>
                      {unidades.map(u => <option key={u.id} value={u.id}>{u.uc} - {u.numInstalacao || ''}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={filtrosFat.status} onChange={e => setFiltrosFat({ ...filtrosFat, status: e.target.value })}>
                      <option value="">Todos</option>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Vencimento De</label>
                    <input type="date" value={filtrosFat.dataInicio} onChange={e => setFiltrosFat({ ...filtrosFat, dataInicio: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Vencimento Até</label>
                    <input type="date" value={filtrosFat.dataFim} onChange={e => setFiltrosFat({ ...filtrosFat, dataFim: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                    <button type="submit" className="btn btn-primary"><FiSearch size={14} /> Buscar</button>
                    <button type="button" className="btn btn-outline" onClick={handleClearFiltrosFat}>Limpar</button>
                  </div>
                </div>
              </form>
            )}
          </div>

          <div className="stat-grid" style={{ marginBottom: 16 }}>
            <div className="card">
              <h3><FiDollarSign size={12} /> Valor Total</h3>
              <span className="card-value text-accent">{formatCurrency(totais.somaValor)}</span>
            </div>
            <div className="card">
              <h3><FiHash size={12} /> Quantidade</h3>
              <span className="card-value">{totais.quantidade || 0}</span>
            </div>
            <div className="card">
              <h3><FiTrendingUp size={12} /> Média Valor</h3>
              <span className="card-value">{formatCurrency(totais.mediaValor)}</span>
            </div>
            <div className="card">
              <h3><FiZap size={12} /> Média kWh</h3>
              <span className="card-value">{Math.round(totais.mediaKwh || 0)} kWh</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
            <button className="btn btn-outline btn-sm" onClick={() => handleExport('excel')} disabled={!faturas.length}>
              <FiDownload size={14} /> Exportar Excel
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => handleExport('pdf')} disabled={!faturas.length}>
              <FiDownload size={14} /> Exportar PDF
            </button>
          </div>

          <div className="card">
            {loading ? <p>Carregando...</p> : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Referência</th>
                        <th>Filial</th>
                        <th>Fornecedor</th>
                        <th>UC</th>
                        <th>NF</th>
                        <th>Valor</th>
                        <th>kWh</th>
                        <th>Vencimento</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {faturas.length === 0 ? (
                        <tr><td colSpan="10" style={{ textAlign: 'center' }}>Nenhuma fatura encontrada. Use os filtros e clique em Buscar.</td></tr>
                      ) : faturas.map(f => (
                        <tr key={f.id} className="clickable" onClick={() => setSelected(f)} style={{ cursor: 'pointer' }}>
                          <td>{f.id}</td>
                          <td>{f.referencia || '-'}</td>
                          <td>{f.filial?.razaoSocial || '-'}</td>
                          <td>{f.fornecedor?.nome || '-'}</td>
                          <td>{f.uc?.uc || '-'}</td>
                          <td>{f.notaFiscal || '-'}</td>
                          <td>{formatCurrency(f.valor)}</td>
                          <td>{f.leituraKwh ? `${f.leituraKwh} kWh` : '-'}</td>
                          <td>{formatDate(f.vencimento)}</td>
                          <td><span className={`badge badge-${statusClass(f.status)}`}>{f.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {paginationFat.totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                    <button className="btn btn-outline btn-sm" disabled={paginationFat.page <= 1} onClick={() => loadFaturas(paginationFat.page - 1)}>Anterior</button>
                    <span style={{ padding: '6px 12px' }}>Página {paginationFat.page} de {paginationFat.totalPages} ({paginationFat.total} registros)</span>
                    <button className="btn btn-outline btn-sm" disabled={paginationFat.page >= paginationFat.totalPages} onClick={() => loadFaturas(paginationFat.page + 1)}>Próxima</button>
                  </div>
                )}
              </>
            )}
          </div>

          {selected && (
            <ReviewModal
              fatura={selected}
              title="Detalhes da Fatura"
              onClose={() => setSelected(null)}
            />
          )}
        </>
      )}

      {activeTab === 'logs' && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 16 }}><FiFilter size={14} /> Filtros</h3>
            <form onSubmit={handleSearchLogs}>
              <div className="form-grid-4">
                <div className="form-group">
                  <label>Ação</label>
                  <select value={filtrosLog.acao} onChange={e => setFiltrosLog({ ...filtrosLog, acao: e.target.value })}>
                    <option value="">Todas</option>
                    <optgroup label="Workflow de Faturas">
                      <option value="LANCAMENTO">Lançamento</option>
                      <option value="APROVACAO">Aprovação</option>
                      <option value="REJEICAO">Rejeição</option>
                      <option value="LIBERACAO">Liberação</option>
                      <option value="BAIXA">Baixa (Pagamento)</option>
                      <option value="ESTORNO">Estorno</option>
                      <option value="EXCLUSAO">Exclusão de Fatura</option>
                    </optgroup>
                    <optgroup label="Cadastros">
                      <option value="CADASTRO_FILIAL">Cadastro Filial</option>
                      <option value="EDICAO_FILIAL">Edição Filial</option>
                      <option value="CADASTRO_FORNECEDOR">Cadastro Fornecedor</option>
                      <option value="EDICAO_FORNECEDOR">Edição Fornecedor</option>
                      <option value="CADASTRO_UC">Cadastro UC</option>
                      <option value="EDICAO_UC">Edição UC</option>
                      <option value="CADASTRO_USUARIO">Cadastro Usuário</option>
                      <option value="EDICAO_USUARIO">Edição Usuário</option>
                    </optgroup>
                  </select>
                </div>
                <div className="form-group">
                  <label>Data De</label>
                  <input type="date" value={filtrosLog.dataInicio} onChange={e => setFiltrosLog({ ...filtrosLog, dataInicio: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Data Até</label>
                  <input type="date" value={filtrosLog.dataFim} onChange={e => setFiltrosLog({ ...filtrosLog, dataFim: e.target.value })} />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <button type="submit" className="btn btn-primary"><FiSearch size={14} /> Buscar</button>
                  <button type="button" className="btn btn-outline" onClick={handleClearFiltrosLog}>Limpar</button>
                </div>
              </div>
            </form>
          </div>

          <div className="card">
            {loading ? <p>Carregando...</p> : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Data/Hora</th>
                        <th>Usuário</th>
                        <th>Ação</th>
                        <th>Fatura</th>
                        <th>Detalhes</th>
                        <th style={{ width: 60, textAlign: 'center' }}>Ver</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length === 0 ? (
                        <tr><td colSpan="6" style={{ textAlign: 'center' }}>Nenhum log encontrado.</td></tr>
                      ) : logs.map(l => {
                        const cores = acaoColor(l.acao);
                        const isExpanded = expandedLogId === l.id;
                        return (
                          <tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => setExpandedLogId(isExpanded ? null : l.id)}>
                            <td style={{ whiteSpace: 'nowrap' }}>{new Date(l.createdAt).toLocaleString('pt-BR')}</td>
                            <td>{l.user?.nome || '-'}</td>
                            <td>
                              <span style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 600,
                                background: cores.bg,
                                color: cores.color,
                                whiteSpace: 'nowrap',
                              }}>
                                {acaoLabel(l.acao)}
                              </span>
                            </td>
                            <td>
                              {l.fatura ? (
                                <span style={{ fontWeight: 500 }}>
                                  #{l.faturaId} — {formatCurrency(l.fatura.valor)}
                                  {l.fatura.fornecedor?.nome ? ` (${l.fatura.fornecedor.nome})` : ''}
                                </span>
                              ) : (
                                <span style={{ color: '#999' }}>-</span>
                              )}
                            </td>
                            <td style={{ maxWidth: 360 }}>
                              {isExpanded ? (
                                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13, lineHeight: 1.5, padding: '4px 0' }}>
                                  {l.descricao || '-'}
                                </div>
                              ) : (
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {l.descricao || '-'}
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {l.faturaId && (
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{ padding: '4px 8px', minWidth: 'auto' }}
                                  onClick={(e) => { e.stopPropagation(); handleViewLogFatura(l.faturaId); }}
                                  disabled={loadingLogFatura}
                                  title="Ver detalhes da fatura"
                                >
                                  <FiEye size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {paginationLog.totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                    <button className="btn btn-outline btn-sm" disabled={paginationLog.page <= 1} onClick={() => loadLogs(paginationLog.page - 1)}>Anterior</button>
                    <span style={{ padding: '6px 12px' }}>Página {paginationLog.page} de {paginationLog.totalPages} ({paginationLog.total} registros)</span>
                    <button className="btn btn-outline btn-sm" disabled={paginationLog.page >= paginationLog.totalPages} onClick={() => loadLogs(paginationLog.page + 1)}>Próxima</button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {selectedLog && (
        <ReviewModal
          fatura={selectedLog}
          title="Detalhes da Fatura (via Log de Auditoria)"
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}
