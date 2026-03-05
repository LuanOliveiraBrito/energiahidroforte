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
  FiAlertCircle, FiCheckCircle, FiZap, FiFileText
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

// ==================== COMPONENTE PRINCIPAL (HOME) ====================
export default function Dashboard() {
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

  const statusColors = { PENDENTE: '#f59e0b', APROVADA: '#3b82f6', PROTOCOLADA: '#10b981', PAGA: '#64748b', REJEITADA: '#e11d48' };

  const doughnutData = data ? {
    labels: (data.statusBreakdown || []).map((s) => s.status),
    datasets: [{ data: (data.statusBreakdown || []).map((s) => s.count), backgroundColor: (data.statusBreakdown || []).map((s) => statusColors[s.status] || '#94a3b8') }],
  } : { labels: [], datasets: [{ data: [], backgroundColor: [] }] };

  return (
    <div className="page-enter">
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
    </div>
  );
}
