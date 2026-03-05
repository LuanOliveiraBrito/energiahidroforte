import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ReviewModal from '../components/ReviewModal';
import { formatCurrency, formatDate } from '../utils/formatters';
import { FiClipboard, FiDownload, FiSend, FiX } from 'react-icons/fi';

export default function ConferenciaProtocolo() {
  const { user } = useAuth();
  const [faturas, setFaturas] = useState({ aprovadas: [], protocoladas: [], rejeitadas: [] });
  const [pagination, setPagination] = useState({
    aprovadas: { page: 1, totalPages: 1, total: 0 },
    protocoladas: { page: 1, totalPages: 1, total: 0 },
    rejeitadas: { page: 1, totalPages: 1, total: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showProtocoloModal, setShowProtocoloModal] = useState(false);
  const [numeroProtocolo, setNumeroProtocolo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [activeTab, setActiveTab] = useState('aprovadas'); // aprovadas | protocoladas | rejeitadas

  const isAdmin = user?.role === 'ADMINISTRADOR';

  useEffect(() => {
    loadAllTabs();
  }, []);

  function buildParams(status, page = 1) {
    const params = { status, page, limit: 50 };
    if (!isAdmin) params.lancadoPorId = user?.id;
    return params;
  }

  async function loadAllTabs() {
    setLoading(true);
    try {
      const [libRes, protRes, rejRes] = await Promise.all([
        api.get('/faturas', { params: buildParams('APROVADA') }),
        api.get('/faturas', { params: buildParams('PROTOCOLADA') }),
        api.get('/faturas', { params: buildParams('REJEITADA') }),
      ]);

      setFaturas({
        aprovadas: libRes.data.data,
        protocoladas: protRes.data.data,
        rejeitadas: rejRes.data.data,
      });
      setPagination({
        aprovadas: libRes.data.pagination || { page: 1, totalPages: 1, total: 0 },
        protocoladas: protRes.data.pagination || { page: 1, totalPages: 1, total: 0 },
        rejeitadas: rejRes.data.pagination || { page: 1, totalPages: 1, total: 0 },
      });
    } catch (err) {
      toast.error('Erro ao carregar faturas');
    } finally {
      setLoading(false);
    }
  }

  async function loadTab(tab, page = 1) {
    const statusMap = { aprovadas: 'APROVADA', protocoladas: 'PROTOCOLADA', rejeitadas: 'REJEITADA' };
    try {
      const res = await api.get('/faturas', { params: buildParams(statusMap[tab], page) });
      setFaturas(prev => ({ ...prev, [tab]: res.data.data }));
      setPagination(prev => ({ ...prev, [tab]: res.data.pagination || { page: 1, totalPages: 1, total: 0 } }));
    } catch (err) {
      toast.error('Erro ao carregar faturas');
    }
  }

  async function handleDownloadProcesso() {
    if (!selected) return;
    try {
      const res = await api.get(`/faturas/${selected.id}/processo-completo`);
      const { pdf } = res.data;

      // Decodificar base64 para bytes
      const byteCharacters = atob(pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `processo-fatura-${selected.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download iniciado!');
    } catch (err) {
      toast.error('Erro ao baixar processo');
    }
  }

  async function handleProtocolar() {
    if (!selected || !numeroProtocolo.trim()) {
      toast.warning('Informe o número do protocolo');
      return;
    }
    setEnviando(true);
    try {
      await api.post(`/workflow/protocolar/${selected.id}`, {
        numeroProtocolo: numeroProtocolo.trim(),
      });
      toast.success(`Fatura #${selected.id} protocolada e enviada ao financeiro!`);
      setShowProtocoloModal(false);
      setSelected(null);
      setNumeroProtocolo('');
      loadAllTabs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao protocolar');
    } finally {
      setEnviando(false);
    }
  }

  const currentList = faturas[activeTab] || [];

  const getBadgeClass = (status) => {
    const map = {
      APROVADA: 'badge-aprovada',
      PROTOCOLADA: 'badge-protocolada',
      REJEITADA: 'badge-rejeitada',
    };
    return map[status] || 'badge-pendente';
  };

  return (
    <div className="page-enter">
      <div className="page-title">
        <FiClipboard size={20} /> Conferência e Protocolo
      </div>

      <div className="card">
        {/* Tabs */}
        <div className="tabs mb-4">
          <button
            className={`tab-btn ${activeTab === 'aprovadas' ? 'active' : ''}`}
            onClick={() => setActiveTab('aprovadas')}
          >
            Aguardando Protocolo ({pagination.aprovadas.total})
          </button>
          <button
            className={`tab-btn ${activeTab === 'protocoladas' ? 'active' : ''}`}
            onClick={() => setActiveTab('protocoladas')}
          >
            Protocoladas ({pagination.protocoladas.total})
          </button>
          <button
            className={`tab-btn ${activeTab === 'rejeitadas' ? 'active' : ''}`}
            onClick={() => setActiveTab('rejeitadas')}
          >
            Rejeitadas ({pagination.rejeitadas.total})
          </button>
        </div>

        {loading ? (
          <p className="text-sub">Carregando...</p>
        ) : currentList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              {activeTab === 'aprovadas' ? '📋' : activeTab === 'protocoladas' ? '✅' : '❌'}
            </div>
            <p>
              {activeTab === 'aprovadas'
                ? 'Nenhuma fatura aguardando protocolo'
                : activeTab === 'protocoladas'
                ? 'Nenhuma fatura protocolada'
                : 'Nenhuma fatura rejeitada'}
            </p>
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
                  <th>NF</th>
                  <th>Valor</th>
                  <th>Status</th>
                  {activeTab === 'protocoladas' && <th>Protocolo</th>}
                  {activeTab === 'rejeitadas' && <th>Motivo</th>}
                </tr>
              </thead>
              <tbody>
                {currentList.map((f) => (
                  <tr key={f.id} className="clickable" onClick={() => setSelected(f)}>
                    <td>{f.id}</td>
                    <td>{formatDate(f.vencimento)}</td>
                    <td>{f.fornecedor?.nome}</td>
                    <td>{f.filial?.razaoSocial}</td>
                    <td>{f.notaFiscal || '-'}</td>
                    <td><strong>{formatCurrency(f.valor)}</strong></td>
                    <td>
                      <span className={`badge ${getBadgeClass(f.status)}`}>{f.status}</span>
                    </td>
                    {activeTab === 'protocoladas' && <td>{f.numeroProtocolo || '-'}</td>}
                    {activeTab === 'rejeitadas' && (
                      <td style={{ color: 'var(--danger)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.motivoRejeicao || '-'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {pagination[activeTab].totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
                <button className="btn btn-outline btn-sm" disabled={pagination[activeTab].page <= 1} onClick={() => loadTab(activeTab, pagination[activeTab].page - 1)}>Anterior</button>
                <span style={{ padding: '6px 12px', fontSize: 13, color: '#64748b' }}>Página {pagination[activeTab].page} de {pagination[activeTab].totalPages} ({pagination[activeTab].total} registros)</span>
                <button className="btn btn-outline btn-sm" disabled={pagination[activeTab].page >= pagination[activeTab].totalPages} onClick={() => loadTab(activeTab, pagination[activeTab].page + 1)}>Próxima</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selected && !showProtocoloModal && (
        <ReviewModal
          fatura={selected}
          title="Conferência do Processo"
          onClose={() => setSelected(null)}
          actions={
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={handleDownloadProcesso}>
                <FiDownload size={14} /> Baixar Processo Digital
              </button>
              {selected.status === 'APROVADA' && (
                <button className="btn btn-primary" onClick={() => setShowProtocoloModal(true)}>
                  <FiClipboard size={14} /> Gerar Protocolo
                </button>
              )}
            </div>
          }
        />
      )}

      {/* Modal de Protocolo */}
      {showProtocoloModal && selected && (
        <div className="modal-overlay" onClick={() => setShowProtocoloModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-between mb-4">
              <h2 style={{ margin: 0 }}>Solicitação de Protocolo</h2>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowProtocoloModal(false)}
              >
                <FiX size={16} />
              </button>
            </div>

            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
              O documento foi conferido e baixado. Informe o número do protocolo do sistema externo para prosseguir.
            </p>

            <div className="form-group">
              <label className="form-label">
                Nº PROTOCOLO <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: ERP-12345-2024"
                value={numeroProtocolo}
                onChange={(e) => setNumeroProtocolo(e.target.value)}
                autoFocus
              />
            </div>

            <div
              style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 20,
                fontSize: 13,
                color: '#0369a1',
              }}
            >
              <strong>ℹ️ Fatura #{selected.id}</strong> — {selected.fornecedor?.nome} —{' '}
              {formatCurrency(selected.valor)}
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowProtocoloModal(false)}
                disabled={enviando}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleProtocolar}
                disabled={enviando || !numeroProtocolo.trim()}
              >
                <FiSend size={14} /> {enviando ? 'Enviando...' : 'Enviar ao Financeiro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
