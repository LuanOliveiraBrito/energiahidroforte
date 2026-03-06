import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import ReviewModal from '../components/ReviewModal';
import { formatCurrency, formatDate } from '../utils/formatters';
import { FiCheckSquare, FiCheck, FiX, FiSquare } from 'react-icons/fi';

// Helper de ordenação genérico
function getNestedValue(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}
function sortData(data, field, dir) {
  if (!field) return data;
  return [...data].sort((a, b) => {
    let va = getNestedValue(a, field);
    let vb = getNestedValue(b, field);
    if (va == null) va = '';
    if (vb == null) vb = '';
    if (typeof va === 'number' && typeof vb === 'number') return dir === 'asc' ? va - vb : vb - va;
    if (typeof va === 'string' && typeof vb === 'string') {
      if (/^\d{4}-\d{2}/.test(va) && /^\d{4}-\d{2}/.test(vb)) return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return dir === 'asc' ? va.localeCompare(vb, 'pt-BR', { sensitivity: 'base' }) : vb.localeCompare(va, 'pt-BR', { sensitivity: 'base' });
    }
    return 0;
  });
}
function SortHeader({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field;
  return (
    <th className={`sortable${active ? ' active' : ''}`} onClick={() => onSort(field)}>
      {label}<span className="sort-icon">{active ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
    </th>
  );
}

export default function Aprovacoes() {
  const [faturas, setFaturas] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [showRejeitar, setShowRejeitar] = useState(false);
  const [selecionadas, setSelecionadas] = useState([]);
  const [confirmLote, setConfirmLote] = useState(false);
  const [aprovandoLote, setAprovandoLote] = useState(false);
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    loadFaturas();
  }, []);

  async function loadFaturas(page = 1) {
    try {
      const res = await api.get('/faturas', { params: { status: 'PENDENTE', page, limit: 50 } });
      setFaturas(res.data.data);
      setPagination(res.data.pagination || { page: 1, totalPages: 1, total: 0 });
      setSelecionadas([]);
    } catch (err) {
      toast.error('Erro ao carregar aprovações');
    } finally {
      setLoading(false);
    }
  }

  function toggleSelecao(id) {
    setSelecionadas(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }

  function toggleTodas() {
    if (selecionadas.length === faturas.length) {
      setSelecionadas([]);
    } else {
      setSelecionadas(faturas.map(f => f.id));
    }
  }

  async function handleAprovarLote() {
    if (selecionadas.length === 0) return;
    setAprovandoLote(true);
    try {
      const res = await api.post('/workflow/aprovar-lote', { ids: selecionadas });
      toast.success(`✅ ${res.data.aprovadas} fatura(s) aprovada(s) com sucesso!`);
      setConfirmLote(false);
      setSelecionadas([]);
      loadFaturas(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao aprovar em lote');
    } finally {
      setAprovandoLote(false);
    }
  }

  async function handleAprovar() {
    if (!selected) return;
    try {
      await api.post(`/workflow/aprovar/${selected.id}`);
      toast.success('Fatura aprovada com sucesso!');
      setSelected(null);
      loadFaturas(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao aprovar');
    }
  }

  async function handleRejeitar() {
    if (!selected || !motivoRejeicao) {
      toast.warning('Informe o motivo da rejeição');
      return;
    }
    try {
      await api.post(`/workflow/rejeitar/${selected.id}`, { motivo: motivoRejeicao });
      toast.success('Fatura rejeitada');
      setSelected(null);
      setShowRejeitar(false);
      setMotivoRejeicao('');
      loadFaturas(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao rejeitar');
    }
  }

  function handleSort(field) {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  const sortedFaturas = sortData(faturas, sortField, sortDir);

  return (
    <div className="page-enter">
      <div className="page-title"><FiCheckSquare size={20} /> Aprovações Pendentes ({pagination.total})</div>

      <div className="card">
        {/* Barra de ações em lote */}
        {selecionadas.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%)',
            border: '1px solid #a5d6a7',
            borderRadius: 10,
            padding: '10px 16px',
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#2e7d32' }}>
              <FiCheckSquare size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              {selecionadas.length} fatura(s) selecionada(s)
              {' '}
              <span style={{ fontWeight: 400, color: '#558b2f', fontSize: 13 }}>
                — Total: {formatCurrency(faturas.filter(f => selecionadas.includes(f.id)).reduce((s, f) => s + (f.valor || 0), 0))}
              </span>
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelecionadas([])}
              >
                Limpar seleção
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setConfirmLote(true)}
              >
                <FiCheck size={14} /> Aprovar selecionados
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sub">Carregando...</p>
        ) : faturas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <p>Nenhuma fatura pendente de aprovação</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <span
                      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                      onClick={toggleTodas}
                      title={selecionadas.length === faturas.length ? 'Desmarcar todas' : 'Selecionar todas'}
                    >
                      {selecionadas.length === faturas.length && faturas.length > 0
                        ? <FiCheckSquare size={18} style={{ color: 'var(--primary)' }} />
                        : <FiSquare size={18} style={{ color: '#94a3b8' }} />
                      }
                    </span>
                  </th>
                  <SortHeader label="#" field="id" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label="Vencimento" field="vencimento" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label="Fornecedor" field="fornecedor.nome" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label="Filial" field="filial.razaoSocial" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label="UC" field="uc.uc" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label="Valor" field="valor" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label="Referência" field="referencia" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedFaturas.map((f) => (
                  <tr
                    key={f.id}
                    className="clickable"
                    style={selecionadas.includes(f.id) ? { background: 'rgba(37, 99, 235, 0.06)' } : {}}
                  >
                    <td style={{ textAlign: 'center' }} onClick={(e) => { e.stopPropagation(); toggleSelecao(f.id); }}>
                      <span style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                        {selecionadas.includes(f.id)
                          ? <FiCheckSquare size={18} style={{ color: 'var(--primary)' }} />
                          : <FiSquare size={18} style={{ color: '#94a3b8' }} />
                        }
                      </span>
                    </td>
                    <td onClick={() => setSelected(f)}>{f.id}</td>
                    <td onClick={() => setSelected(f)}>{formatDate(f.vencimento)}</td>
                    <td onClick={() => setSelected(f)}>{f.fornecedor?.nome}</td>
                    <td onClick={() => setSelected(f)}>{f.filial?.razaoSocial}</td>
                    <td onClick={() => setSelected(f)}>{f.uc?.uc}</td>
                    <td onClick={() => setSelected(f)}><strong>{formatCurrency(f.valor)}</strong></td>
                    <td onClick={() => setSelected(f)}>{f.referencia}</td>
                    <td onClick={() => setSelected(f)}><span className="badge badge-pendente">{f.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pagination.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
                <button className="btn btn-outline btn-sm" disabled={pagination.page <= 1} onClick={() => loadFaturas(pagination.page - 1)}>Anterior</button>
                <span style={{ padding: '6px 12px', fontSize: 13, color: '#64748b' }}>Página {pagination.page} de {pagination.totalPages} ({pagination.total} registros)</span>
                <button className="btn btn-outline btn-sm" disabled={pagination.page >= pagination.totalPages} onClick={() => loadFaturas(pagination.page + 1)}>Próxima</button>
              </div>
            )}
          </div>
        )}
      </div>

      {selected && (
        <ReviewModal
          fatura={selected}
          title="Aprovação de Fatura"
          onClose={() => { setSelected(null); setShowRejeitar(false); setMotivoRejeicao(''); }}
          actions={
            <>
              {showRejeitar ? (
                <div style={{ width: '100%' }}>
                  <div className="f-group">
                    <label>Motivo da Rejeição</label>
                    <textarea
                      value={motivoRejeicao}
                      onChange={(e) => setMotivoRejeicao(e.target.value)}
                      rows={3}
                      placeholder="Descreva o motivo da rejeição..."
                      style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-danger" onClick={handleRejeitar}><FiX size={14} /> Confirmar Rejeição</button>
                    <button className="btn btn-secondary" onClick={() => setShowRejeitar(false)}>Voltar</button>
                  </div>
                </div>
              ) : (
                <>
                  <button className="btn btn-primary" onClick={handleAprovar}><FiCheck size={14} /> Aprovar Lançamento</button>
                  <button className="btn btn-danger" onClick={() => setShowRejeitar(true)}><FiX size={14} /> Rejeitar</button>
                </>
              )}
            </>
          }
        />
      )}

      {/* Modal de confirmação de aprovação em lote */}
      {confirmLote && (
        <div className="modal-overlay" onClick={() => setConfirmLote(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <h3 style={{ marginBottom: 12, color: 'var(--primary)' }}>
              <FiCheckSquare size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
              Aprovar {selecionadas.length} Fatura(s)
            </h3>

            <div style={{
              background: '#e8f5e9',
              border: '1px solid #a5d6a7',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 16,
              fontSize: 14,
            }}>
              <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#2e7d32' }}>
                Faturas selecionadas para aprovação:
              </p>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {faturas.filter(f => selecionadas.includes(f.id)).map(f => (
                  <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, borderBottom: '1px solid #c8e6c9' }}>
                    <span>#{f.id} — {f.fornecedor?.nome}</span>
                    <strong>{formatCurrency(f.valor)}</strong>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '2px solid #a5d6a7', display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#1b5e20' }}>
                <span>Total</span>
                <span>{formatCurrency(faturas.filter(f => selecionadas.includes(f.id)).reduce((s, f) => s + (f.valor || 0), 0))}</span>
              </div>
            </div>

            <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>
              Tem certeza que deseja aprovar todas as faturas selecionadas?
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmLote(false)} disabled={aprovandoLote}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleAprovarLote} disabled={aprovandoLote}>
                <FiCheck size={14} /> {aprovandoLote ? 'Aprovando...' : `Confirmar Aprovação (${selecionadas.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
