import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  FiHome,
  FiDatabase,
  FiFileText,
  FiCheckSquare,
  FiCreditCard,
  FiClipboard,
  FiDollarSign,
  FiBarChart2,
  FiUsers,
  FiLogOut,
  FiMenu,
  FiX,
} from 'react-icons/fi';

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: FiHome, module: 'dashboard', end: true },
  { path: '/cadastros', label: 'Cadastros', icon: FiDatabase, module: 'cadastros' },
  { path: '/lancar-fatura', label: 'Lançar Fatura', icon: FiFileText, module: 'lancar-fatura' },
  { path: '/aprovacoes', label: 'Aprovações', icon: FiCheckSquare, module: 'aprovacoes' },
  { path: '/pagamentos', label: 'Pagamentos', icon: FiCreditCard, module: 'pagamentos' },
  { path: '/conferencia-protocolo', label: 'Conferência e Protocolo', icon: FiClipboard, module: 'conferencia-protocolo' },
  { path: '/financeiro', label: 'Financeiro / Baixas', icon: FiDollarSign, module: 'financeiro' },
  { path: '/relatorios', label: 'Relatórios', icon: FiBarChart2, module: 'relatorios' },
  { path: '/usuarios', label: 'Usuários', icon: FiUsers, module: 'usuarios' },
];

export default function Layout() {
  const { user, logout, hasPermission, getRoleLabel } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Fechar sidebar ao navegar (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const initials = user?.nome
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="app-layout">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Botão hamburger mobile */}
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Menu"
      >
        {sidebarOpen ? <FiX size={22} /> : <FiMenu size={22} />}
      </button>

      <nav className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <img src="/img/logo.png" alt="Voltaris Energy" className="sidebar-logo-img" />
        </div>

        <div className="sidebar-nav">
          {NAV_ITEMS.filter((item) => hasPermission(item.module)).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.nome}</div>
            <div className="user-role">{getRoleLabel()}</div>
          </div>
          <button
            onClick={logout}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
            title="Sair"
          >
            <FiLogOut size={18} />
          </button>
        </div>
      </nav>

      <main className="main-content">
        <Outlet />
        <footer style={{
          textAlign: 'center',
          padding: '16px 0',
          marginTop: 32,
          fontSize: 12,
          color: '#94a3b8',
          borderTop: '1px solid #e2e8f0',
        }}>
          Desenvolvido por Luan Oliveira - (63) 98144-8181
        </footer>
      </main>
    </div>
  );
}
