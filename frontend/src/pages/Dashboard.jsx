import { useState, useEffect } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import api from '../services/api';
import {
  FiAlertCircle, FiCheckCircle, FiZap, FiFileText, FiClock,
  FiAlertTriangle, FiHome, FiClipboard,
  FiX, FiInfo, FiBell, FiEye, FiEyeOff
} from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatRef(ref) {
  if (!ref) return '';
  const [year, month] = ref.split('-');
  return MONTHS_PT[parseInt(month) - 1] + '/' + year;
}

// ==================== COMPONENTE CHECKOUT FATURA ====================
function CheckoutFatura() {
  const [checkout, setCheckout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [soPendencias, setSoPendencias] = useState(false);

  useEffect(() => { loadCheckout(); }, [ano]);

  async function loadCheckout() {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/checkout', { params: { ano } });
      setCheckout(res.data);
    } catch (err) {
      console.error('Erro checkout:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p style={{ padding: 20 }}>Carregando checkout...</p>;
  if (!checkout) return <p style={{ padding: 20 }}>Erro ao carregar dados.</p>;

  const { indicadores, matriz, notificacoes } = checkout;

  const matrizFiltrada = soPendencias
    ? matriz.filter(uc => uc.statusGeral !== 'EM_DIA')
    : matriz;

  /* ---------- estilos do bloco de célula (referencia.html) ---------- */
  const cellBlockStyle = (status) => {
    const base = {
      borderRadius: 6, padding: '6px 4px', minHeight: 44, display: 'flex',
      flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      transition: 'all 0.2s', fontSize: 11, lineHeight: 1.3,
    };
    switch (status) {
      case 'PAGO':
      case 'EM_ANDAMENTO':
        return { ...base, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.25)', color: '#166534' };
      case 'ATRASO':
      case 'REJEITADA':
        return { ...base, background: 'rgba(225,29,72,0.06)', border: '1px dashed #e11d48', color: '#9f1239', fontWeight: 700 };
      case 'AGUARDANDO':
      case 'PROXIMO_VENCIMENTO':
        return { ...base, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.3)', color: '#92400e' };
      case 'MULTI':
        return { ...base, background: 'rgba(245,158,11,0.08)', border: '1px solid #f59e0b', color: '#92400e' };
      case 'FUTURO':
        return { ...base, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#cbd5e1' };
      default:
        return { ...base, background: '#f8fafc', border: '1px dashed #e2e8f0', color: '#cbd5e1' };
    }
  };

  const cellContent = (m) => {
    if (m.status === 'FUTURO' || m.status === 'SEM_LANCAMENTO') {
      return <span style={{ fontSize: 11, color: '#cbd5e1' }}>—</span>;
    }
    if (m.status === 'ATRASO' || m.status === 'REJEITADA') {
      if (m.valor) {
        return (
          <>
            <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 11 }}>{formatCurrency(m.valor)}</span>
            {m.notaFiscal && <span style={{ fontSize: 9, opacity: 0.7 }}>NF: {m.notaFiscal}</span>}
            <span style={{ fontSize: 9, fontWeight: 700, marginTop: 1 }}>PENDENTE</span>
          </>
        );
      }
      return <span style={{ fontSize: 10, fontWeight: 700 }}>PENDENTE</span>;
    }
    if (m.qtdFaturas > 1) {
      return (
        <>
          <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 11 }}>{formatCurrency(m.valor)}</span>
          <span style={{ fontSize: 9, fontWeight: 600 }}>({m.qtdFaturas}) FATURAS</span>
        </>
      );
    }
    // PAGO, EM_ANDAMENTO, AGUARDANDO, PROXIMO_VENCIMENTO — com valor
    return (
      <>
        <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 11 }}>{formatCurrency(m.valor)}</span>
        {m.notaFiscal && <span style={{ fontSize: 9, opacity: 0.6 }}>NF: {m.notaFiscal}</span>}
      </>
    );
  };

  const statusGeralBadge = (s) => {
    switch (s) {
      case 'EM_DIA': return { bg: '#dcfce7', color: '#166534', label: 'Em dia' };
      case 'AGUARDANDO': return { bg: '#fef3c7', color: '#92400e', label: 'Aguardando' };
      case 'EM_ATRASO': return { bg: '#ffe4e6', color: '#9f1239', label: 'Em atraso' };
      case 'CRITICO': return { bg: '#e11d48', color: '#fff', label: 'CRÍTICO' };
      default: return { bg: '#f1f5f9', color: '#64748b', label: s };
    }
  };

  const notiIcon = (tipo) => {
    switch (tipo) {
      case 'ALERTA': return <FiAlertTriangle size={14} style={{ color: '#e11d48' }} />;
      case 'AVISO': return <FiAlertCircle size={14} style={{ color: '#f59e0b' }} />;
      case 'CRITICO': return <FiX size={14} style={{ color: '#e11d48' }} />;
      default: return <FiInfo size={14} style={{ color: '#3b82f6' }} />;
    }
  };

  /* cobertura = lancadas / totalUCs */
  const cobertura = indicadores.totalUCs > 0
    ? Math.round((indicadores.lancadas.quantidade / indicadores.totalUCs) * 100)
    : 0;

  return (
    <div>
      {/* SEÇÃO 1: KPIs (4 cards tipo referencia.html) */}
      <div className="stat-grid">
        <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <small style={{ display: 'block', fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Total UCs</small>
          <strong style={{ fontSize: 26, fontWeight: 800, color: '#1e293b' }}>{indicadores.totalUCs}</strong>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
          <small style={{ display: 'block', fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Cobertura {formatRef(indicadores.mesReferencia)}</small>
          <strong style={{ fontSize: 26, fontWeight: 800, color: '#10b981' }}>{cobertura}%</strong>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #e11d48' }}>
          <small style={{ display: 'block', fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Omissões Críticas</small>
          <strong style={{ fontSize: 26, fontWeight: 800, color: '#e11d48' }}>{indicadores.omissoesCriticas || 0}</strong>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #6366f1' }}>
          <small style={{ display: 'block', fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Faturamento {ano}</small>
          <strong style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{formatCurrency(indicadores.faturamentoAno)}</strong>
        </div>
      </div>

      {/* SEÇÃO 2: MATRIZ DE DISPONIBILIDADE */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>
            Matriz de Disponibilidade  {ano}
          </h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-outline btn-sm" onClick={() => setAno(ano - 1)}>&larr; {ano - 1}</button>
            <span style={{ fontWeight: 700, fontSize: 15, padding: '0 8px' }}>{ano}</span>
            <button className="btn btn-outline btn-sm" onClick={() => setAno(ano + 1)}>{ano + 1} &rarr;</button>
            <button
              className={'btn btn-sm ' + (soPendencias ? 'btn-primary' : 'btn-outline')}
              onClick={() => setSoPendencias(!soPendencias)}
              title={soPendencias ? 'Mostrar todas' : 'Mostrar apenas pendências'}
            >
              {soPendencias ? <><FiEyeOff size={13} /> Pendências</> : <><FiEye size={13} /> Todas</>}
            </button>
          </div>
        </div>

        {/* Legenda */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap', fontSize: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.25)' }} /> OK / Pago
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.3)' }} /> Aguardando
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(225,29,72,0.06)', border: '1px dashed #e11d48' }} /> Pendente / Atraso
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(245,158,11,0.08)', border: '1px solid #f59e0b' }} /> Múltiplas
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: '#f8fafc', border: '1px solid #e2e8f0' }} /> Futuro
          </span>
        </div>

        <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <table style={{ fontSize: 12, borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, background: '#f8fafc', zIndex: 2, minWidth: 190, textAlign: 'left', padding: '12px 14px', borderBottom: '2px solid #e2e8f0', borderRight: '2px solid #e2e8f0', fontSize: 11, textTransform: 'uppercase', color: '#64748b' }}>
                  Unidade Consumidora
                </th>
                {MONTHS_PT.map((m, i) => (
                  <th key={i} style={{ textAlign: 'center', minWidth: 100, padding: '12px 6px', borderBottom: '2px solid #e2e8f0', fontSize: 11, textTransform: 'uppercase', color: '#64748b', background: '#f8fafc' }}>{m}</th>
                ))}
                <th style={{ textAlign: 'center', minWidth: 64, padding: '12px 6px', borderBottom: '2px solid #e2e8f0', fontSize: 11, textTransform: 'uppercase', color: '#64748b', background: '#f8fafc' }}>Venc.</th>
                <th style={{ textAlign: 'center', minWidth: 100, padding: '12px 6px', borderBottom: '2px solid #e2e8f0', fontSize: 11, textTransform: 'uppercase', color: '#64748b', background: '#f8fafc' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {matrizFiltrada.length === 0 ? (
                <tr><td colSpan={15} style={{ textAlign: 'center', padding: 24, color: '#10b981' }}><FiCheckCircle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />Todas as UCs estão em dia!</td></tr>
              ) : matrizFiltrada.map(uc => {
                const badge = statusGeralBadge(uc.statusGeral);
                return (
                  <tr key={uc.id} style={uc.statusGeral === 'CRITICO' ? { background: '#fff5f5' } : {}}>
                    <td style={{ position: 'sticky', left: 0, background: uc.statusGeral === 'CRITICO' ? '#fff5f5' : '#fff', zIndex: 1, fontWeight: 600, fontSize: 12, padding: '8px 14px', borderBottom: '1px solid #f1f5f9', borderRight: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <strong>{uc.uc}</strong>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400, marginTop: 2 }}>{uc.filial}</div>
                    </td>
                    {uc.meses.map((m, i) => {
                      const effectiveStatus = m.qtdFaturas > 1 ? 'MULTI' : m.status;
                      return (
                        <td key={i} style={{ textAlign: 'center', padding: '4px 3px', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9' }}>
                          <div style={cellBlockStyle(effectiveStatus)} title={m.status.replace(/_/g, ' ')}>
                            {cellContent(m)}
                          </div>
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'center', fontWeight: 600, borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>{uc.diaVencimento ? 'Dia ' + uc.diaVencimento : '-'}</td>
                    <td style={{ textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ background: badge.bg, color: badge.color, padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SEÇÃO 3: NOTIFICAÇÕES */}
      {notificacoes && notificacoes.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiBell size={16} /> Notificações
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notificacoes.map((n, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
                background: n.tipo === 'CRITICO' ? '#fff5f5' : n.tipo === 'ALERTA' ? '#fff5f5' : n.tipo === 'AVISO' ? '#fffbeb' : '#f0f9ff',
                borderRadius: 8, borderLeft: '3px solid ' + (n.tipo === 'CRITICO' || n.tipo === 'ALERTA' ? '#e11d48' : n.tipo === 'AVISO' ? '#f59e0b' : '#3b82f6'),
              }}>
                <div style={{ marginTop: 2 }}>{notiIcon(n.tipo)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{n.mensagem}</div>
                  {n.detalhe && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{n.detalhe}</div>}
                </div>
                <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>{n.data}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== COMPONENTE PRINCIPAL (HOME) ====================
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  const lineChartData = data ? {
    labels: (data.gastosPorMes || []).map((g) => formatRef(g.referencia)),
    datasets: [
      {
        label: 'Gasto (R$)',
        data: (data.gastosPorMes || []).map((g) => Number(g.total)),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Média kWh',
        data: (data.gastosPorMes || []).map((g) => Number(g.media_kwh || 0)),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: false,
        yAxisID: 'y1',
      },
    ],
  } : { labels: [], datasets: [] };

  const lineChartOptions = {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: { beginAtZero: true, position: 'left', ticks: { callback: (v) => 'R$ ' + v.toLocaleString() } },
      y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { callback: (v) => v + ' kWh' } },
    },
  };

  const statusColors = { PENDENTE: '#f59e0b', APROVADA: '#3b82f6', LIBERADA: '#10b981', PAGA: '#64748b', REJEITADA: '#e11d48' };

  const doughnutData = data ? {
    labels: (data.statusBreakdown || []).map((s) => s.status),
    datasets: [{ data: (data.statusBreakdown || []).map((s) => s.count), backgroundColor: (data.statusBreakdown || []).map((s) => statusColors[s.status] || '#94a3b8') }],
  } : { labels: [], datasets: [{ data: [], backgroundColor: [] }] };

  return (
    <div className="page-enter">
      {/* ABAS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          className={'btn ' + (activeTab === 'dashboard' ? 'btn-primary' : 'btn-outline')}
          onClick={() => setActiveTab('dashboard')}
        >
          <FiHome size={14} /> Dashboard
        </button>
        <button
          className={'btn ' + (activeTab === 'checkout' ? 'btn-primary' : 'btn-outline')}
          onClick={() => setActiveTab('checkout')}
        >
          <FiClipboard size={14} /> Checkout Fatura
        </button>
      </div>

      {/* ABA DASHBOARD */}
      {activeTab === 'dashboard' && (
        <>
          {loading ? <p>Carregando dashboard...</p> : !data ? <p>Erro ao carregar dados.</p> : (
            <>
              <div className="stat-grid">
                <div className="card">
                  <h3><FiAlertCircle size={12} /> Total Pendente</h3>
                  <span className="card-value text-danger">{formatCurrency(data.totalPendente)}</span>
                </div>
                <div className="card">
                  <h3><FiCheckCircle size={12} /> Total Pago</h3>
                  <span className="card-value text-accent">{formatCurrency(data.totalPago)}</span>
                </div>
                <div className="card">
                  <h3><FiZap size={12} /> Média kWh</h3>
                  <span className="card-value">{data.mediaKwh} kWh</span>
                </div>
                <div className="card">
                  <h3><FiFileText size={12} /> Faturas Mês</h3>
                  <span className="card-value">{data.faturasMes}</span>
                </div>
              </div>

              <div className="chart-grid">
                <div className="card" style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: 16 }}>Gastos por Período</h3>
                  <Line data={lineChartData} options={lineChartOptions} />
                </div>
                <div className="card">
                  <h3 style={{ marginBottom: 16 }}>Faturas por Status</h3>
                  <Doughnut data={doughnutData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ABA CHECKOUT FATURA */}
      {activeTab === 'checkout' && <CheckoutFatura />}
    </div>
  );
}
