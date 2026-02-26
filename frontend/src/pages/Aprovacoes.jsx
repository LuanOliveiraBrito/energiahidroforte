import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import ReviewModal from '../components/ReviewModal';
import { formatCurrency, formatDate } from '../utils/formatters';
import { FiCheckSquare, FiCheck, FiX } from 'react-icons/fi';

export default function Aprovacoes() {
  const [faturas, setFaturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [showRejeitar, setShowRejeitar] = useState(false);

  useEffect(() => {
    loadFaturas();
  }, []);

  async function loadFaturas() {
    try {
      const res = await api.get('/faturas?status=PENDENTE');
      setFaturas(res.data.data);
    } catch (err) {
      toast.error('Erro ao carregar aprovações');
    } finally {
      setLoading(false);
    }
  }

  async function handleAprovar() {
    if (!selected) return;
    try {
      await api.post(`/workflow/aprovar/${selected.id}`);
      toast.success('Fatura aprovada com sucesso!');
      setSelected(null);
      loadFaturas();
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
      loadFaturas();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao rejeitar');
    }
  }

  return (
    <div className="page-enter">
      <div className="page-title"><FiCheckSquare size={20} /> Aprovações Pendentes</div>

      <div className="card">
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
                  <th>#</th>
                  <th>Vencimento</th>
                  <th>Fornecedor</th>
                  <th>Filial</th>
                  <th>UC</th>
                  <th>Valor</th>
                  <th>Referência</th>
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
                    <td>{f.uc?.uc}</td>
                    <td><strong>{formatCurrency(f.valor)}</strong></td>
                    <td>{f.referencia}</td>
                    <td><span className="badge badge-pendente">{f.status}</span></td>
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
    </div>
  );
}
