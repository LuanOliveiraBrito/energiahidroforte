import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import ReviewModal from '../components/ReviewModal';
import { formatCurrency, formatDate } from '../utils/formatters';
import { FiCreditCard, FiCheck } from 'react-icons/fi';

export default function Pagamentos() {
  const [faturas, setFaturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    loadFaturas();
  }, []);

  async function loadFaturas() {
    try {
      const res = await api.get('/faturas?status=APROVADA');
      setFaturas(res.data.data);
    } catch (err) {
      toast.error('Erro ao carregar pagamentos');
    } finally {
      setLoading(false);
    }
  }

  async function handleLiberar() {
    if (!selected) return;
    try {
      await api.post(`/workflow/liberar/${selected.id}`);
      toast.success('Pagamento liberado para financeiro!');
      setSelected(null);
      loadFaturas();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao liberar');
    }
  }

  return (
    <div className="page-enter">
      <div className="page-title"><FiCreditCard size={20} /> Pagamentos (Fila de Liberação)</div>

      <div className="card">
        {loading ? (
          <p className="text-sub">Carregando...</p>
        ) : faturas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💳</div>
            <p>Nenhum pagamento aguardando liberação</p>
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
                  <th>Aprovado por</th>
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
                    <td>{f.aprovadoPor?.nome || '-'}</td>
                    <td><span className="badge badge-aprovada">{f.status}</span></td>
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
          title="Liberação de Pagamento"
          onClose={() => setSelected(null)}
          actions={
            <button className="btn btn-primary" onClick={handleLiberar}>
              <FiCheck size={14} /> Liberar para Financeiro
            </button>
          }
        />
      )}
    </div>
  );
}
