import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Cadastros from './pages/Cadastros';
import LancarFatura from './pages/LancarFatura';
import Aprovacoes from './pages/Aprovacoes';
import Pagamentos from './pages/Pagamentos';
import ConferenciaProtocolo from './pages/ConferenciaProtocolo';
import Financeiro from './pages/Financeiro';
import Relatorios from './pages/Relatorios';
import Usuarios from './pages/Usuarios';

function PrivateRoute({ children, module }) {
  const { signed, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!signed) {
    return <Navigate to="/login" replace />;
  }

  if (module && !hasPermission(module)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  const { signed, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={signed ? <Navigate to="/" replace /> : <Login />} />
      
      <Route
        path="/"
        element={
          <PrivateRoute module="dashboard">
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="cadastros" element={<PrivateRoute module="cadastros"><Cadastros /></PrivateRoute>} />
        <Route path="lancar-fatura" element={<PrivateRoute module="lancar-fatura"><LancarFatura /></PrivateRoute>} />
        <Route path="aprovacoes" element={<PrivateRoute module="aprovacoes"><Aprovacoes /></PrivateRoute>} />
        <Route path="pagamentos" element={<PrivateRoute module="pagamentos"><Pagamentos /></PrivateRoute>} />
        <Route path="conferencia-protocolo" element={<PrivateRoute module="conferencia-protocolo"><ConferenciaProtocolo /></PrivateRoute>} />
        <Route path="financeiro" element={<PrivateRoute module="financeiro"><Financeiro /></PrivateRoute>} />
        <Route path="relatorios" element={<PrivateRoute module="relatorios"><Relatorios /></PrivateRoute>} />
        <Route path="usuarios" element={<PrivateRoute module="usuarios"><Usuarios /></PrivateRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
