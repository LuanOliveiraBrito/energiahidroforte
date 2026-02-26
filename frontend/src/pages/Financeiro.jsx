import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ReviewModal from '../components/ReviewModal';
import { formatCurrency, formatDate } from '../utils/formatters';
import { FiDollarSign, FiCheck, FiTrash2, FiCalendar, FiRotateCcw } from 'react-icons/fi';

// Retorna data de ontem no formato YYYY-MM-DD
function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export default function Financeiro() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMINISTRADOR';
  const [faturasLiberadas, setFaturasLiberadas] = useState([]);
  const [faturasPagas, setFaturasPagas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('liberadas');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmBaixa, setConfirmBaixa] = useState(null);
  const [confirmEstorno, setConfirmEstorno] = useState(null);
  const [motivoEstorno, setMotivoEstorno] = useState('');
  const [dataPagamento, setDataPagamento] = useState(getYesterday());

  useEffect(() => {
    loadFaturas();
  }, []);

  async function loadFaturas() {
    try {
      const [libRes, pagRes] = await Promise.all([
        api.get('/faturas?status=LIBERADA'),
        api.get('/faturas?status=PAGA'),
      ]);
      setFaturasLiberadas(libRes.data.data);
      setFaturasPagas(pagRes.data.data);
    } catch (err) {
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  }

  async function handleBaixa() {
    if (!confirmBaixa) return;
    try {
      await api.post(`/workflow/baixar/${confirmBaixa.id}`, { dataPagamento });
      toast.success('Pagamento confirmado! Baixa realizada.');
      setConfirmBaixa(null);
      setSelected(null);
      setDataPagamento(getYesterday());
      loadFaturas();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro na baixa');
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await api.delete(`/faturas/${confirmDelete.id}`);
      toast.success(`Fatura #${confirmDelete.id} excluída com sucesso!`);
      setConfirmDelete(null);
      setSelected(null);
      loadFaturas();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao excluir fatura');
    }
  }

  async function handleEstorno() {
    if (!confirmEstorno) return;
    if (!motivoEstorno.trim()) {
      toast.warning('Informe o motivo do estorno');
      return;
    }
    try {
      await api.post(`/workflow/estornar/${confirmEstorno.id}`, { motivo: motivoEstorno.trim() });
      toast.success(`Fatura #${confirmEstorno.id} estornada com sucesso! Retornou para "Aguardando Baixa".`);
      setConfirmEstorno(null);
      setMotivoEstorno('');
      setSelected(null);
      loadFaturas();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao estornar fatura');
    }
  }

  const faturas = activeSubTab === 'liberadas' ? faturasLiberadas : faturasPagas;

  return (
    <div className="page-enter">
      <div className="page-title"><FiDollarSign size={20} /> Financeiro / Baixas</div>

      <div className="card">
        <div className="tab-bar" style={{ marginBottom: 20 }}>
          <button
            className={`tab-btn ${activeSubTab === 'liberadas' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('liberadas')}
          >
            Aguardando Baixa ({faturasLiberadas.length})
          </button>
          <button
            className={`tab-btn ${activeSubTab === 'pagas' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('pagas')}
          >
            Liquidados ({faturasPagas.length})
          </button>
        </div>

        {loading ? (
          <p className="text-sub">Carregando...</p>
        ) : faturas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏦</div>
            <p>{activeSubTab === 'liberadas' ? 'Nenhuma fatura aguardando baixa' : 'Nenhuma fatura paga'}</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Vencimento</th>
                  <th>Fornecedor</th>
                  <th>Filial</th>
                  <th>Valor</th>
                  <th>{activeSubTab === 'pagas' ? 'Baixado por' : 'Liberado por'}</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {faturas.map((f) => (
                  <tr key={f.id} className="clickable" onClick={() => setSelected(f)}>
                    <td>{f.id}</td>
                    <td>{formatDate(f.vencimento)}</td>
                    <td>{f.fornecedor?.nome}</td>
                    <td>{f.filial?.razaoSocial}</td>
                    <td><strong>{formatCurrency(f.valor)}</strong></td>
                    <td>{activeSubTab === 'pagas' ? (f.baixadoPor?.nome || '-') : (f.liberadoPor?.nome || '-')}</td>
                    <td><span className={`badge badge-${f.status?.toLowerCase()}`}>{f.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <ReviewModal
          fatura={selected}
          title={selected.status === 'LIBERADA' ? 'Baixa de Título' : 'Detalhes do Pagamento'}
          onClose={() => setSelected(null)}
          extraInfo={
            selected.estornadoPor ? (
              <div style={{ background: '#fff3e0', border: '1px solid #ffcc80', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
                <strong style={{ color: '#e65100' }}>⚠️ Esta fatura já foi estornada anteriormente</strong><br />
                <span style={{ color: '#666' }}>
                  Por: <strong>{selected.estornadoPor.nome}</strong> em <strong>{formatDate(selected.dataEstorno)}</strong><br />
                  Motivo: <em>{selected.motivoEstorno}</em>
                </span>
              </div>
            ) : null
          }
          actions={
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {selected.status === 'LIBERADA' && (
                <button className="btn btn-primary" onClick={() => { setConfirmBaixa(selected); setDataPagamento(getYesterday()); }}>
                  <FiCheck size={14} /> Confirmar Pagamento (Baixa)
                </button>
              )}
              {selected.status === 'PAGA' && (
                <button
                  className="btn"
                  style={{ background: '#e65100', color: '#fff', border: 'none' }}
                  onClick={() => { setConfirmEstorno(selected); setMotivoEstorno(''); }}
                >
                  <FiRotateCcw size={14} /> Estornar Pagamento
                </button>
              )}
              {isAdmin && (
                <button
                  className="btn btn-danger"
                  onClick={() => setConfirmDelete(selected)}
                >
                  <FiTrash2 size={14} /> Excluir Fatura
                </button>
              )}
            </div>
          }
        />
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <h3 style={{ marginBottom: 12, color: '#e74c3c' }}>⚠️ Confirmar Exclusão</h3>
            <p style={{ marginBottom: 8 }}>
              Tem certeza que deseja excluir a <strong>Fatura #{confirmDelete.id}</strong>?
            </p>
            <p style={{ marginBottom: 8, fontSize: 14, color: '#666' }}>
              Fornecedor: <strong>{confirmDelete.fornecedor?.nome}</strong><br />
              Valor: <strong>{formatCurrency(confirmDelete.valor)}</strong><br />
              Referência: <strong>{confirmDelete.referencia}</strong>
            </p>
            <p style={{ marginBottom: 16, fontSize: 13, color: '#e74c3c' }}>
              Esta ação é irreversível. Todos os logs de auditoria vinculados e arquivos anexos também serão removidos.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                <FiTrash2 size={14} /> Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmBaixa && (
        <div className="modal-overlay" onClick={() => setConfirmBaixa(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <h3 style={{ marginBottom: 12, color: 'var(--primary)' }}>
              <FiCalendar size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Data do Pagamento
            </h3>
            <p style={{ marginBottom: 6, fontSize: 14, color: '#666' }}>
              Fatura <strong>#{confirmBaixa.id}</strong> — {confirmBaixa.fornecedor?.nome}
            </p>
            <p style={{ marginBottom: 16, fontSize: 14, color: '#666' }}>
              Valor: <strong>{formatCurrency(confirmBaixa.valor)}</strong>
            </p>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#444' }}>
              Informe a data em que o pagamento foi efetuado:
            </label>
            <input
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              className="form-input"
              style={{ width: '100%', padding: '10px 12px', fontSize: 15, marginBottom: 20 }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmBaixa(null)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleBaixa}>
                <FiCheck size={14} /> Confirmar Baixa
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmEstorno && (
        <div className="modal-overlay" onClick={() => setConfirmEstorno(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <h3 style={{ marginBottom: 12, color: '#e65100' }}>
              <FiRotateCcw size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Estorno de Pagamento
            </h3>
            <div style={{ background: '#fff3e0', border: '1px solid #ffcc80', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
              <strong>⚠️ Atenção:</strong> O estorno irá reverter a baixa desta fatura, retornando-a para o status <strong>"Aguardando Baixa"</strong>.
              Esta ação ficará registrada no log de auditoria.
            </div>
            <p style={{ marginBottom: 6, fontSize: 14, color: '#666' }}>
              Fatura <strong>#{confirmEstorno.id}</strong> — {confirmEstorno.fornecedor?.nome}
            </p>
            <p style={{ marginBottom: 6, fontSize: 14, color: '#666' }}>
              Valor: <strong>{formatCurrency(confirmEstorno.valor)}</strong>
            </p>
            <p style={{ marginBottom: 16, fontSize: 14, color: '#666' }}>
              Baixado por: <strong>{confirmEstorno.baixadoPor?.nome || '-'}</strong> em <strong>{formatDate(confirmEstorno.dataBaixa)}</strong>
            </p>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#444' }}>
              Motivo do estorno (obrigatório):
            </label>
            <textarea
              value={motivoEstorno}
              onChange={(e) => setMotivoEstorno(e.target.value)}
              placeholder="Descreva o motivo do estorno..."
              className="form-input"
              rows={3}
              style={{ width: '100%', padding: '10px 12px', fontSize: 14, marginBottom: 20, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmEstorno(null)}>
                Cancelar
              </button>
              <button
                className="btn"
                style={{ background: '#e65100', color: '#fff', border: 'none' }}
                onClick={handleEstorno}
                disabled={!motivoEstorno.trim()}
              >
                <FiRotateCcw size={14} /> Confirmar Estorno
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
