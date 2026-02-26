import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext({});

// Mapeamento de permissões por role
const PERMISSIONS = {
  ADMINISTRADOR: ['dashboard', 'cadastros', 'lancar-fatura', 'aprovacoes', 'pagamentos', 'conferencia-protocolo', 'financeiro', 'relatorios', 'usuarios'],
  ADMINISTRATIVO: ['dashboard', 'cadastros', 'lancar-fatura', 'conferencia-protocolo', 'relatorios'],
  GERENTE_ADM: ['dashboard', 'cadastros', 'lancar-fatura', 'aprovacoes', 'relatorios'],
  DIRETOR: ['dashboard', 'cadastros', 'lancar-fatura', 'aprovacoes', 'pagamentos', 'relatorios'],
  FINANCEIRO: ['dashboard', 'cadastros', 'lancar-fatura', 'relatorios', 'financeiro'],
};

const ROLE_LABELS = {
  ADMINISTRADOR: 'Administrador',
  ADMINISTRATIVO: 'Administrativo',
  GERENTE_ADM: 'Gerente ADM',
  DIRETOR: 'Diretor',
  FINANCEIRO: 'Financeiro',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('@voltaris:token');
    const savedUser = localStorage.getItem('@voltaris:user');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      // Verificar se token ainda é válido
      api.get('/auth/me')
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('@voltaris:user', JSON.stringify(res.data));
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email, senha) {
    const response = await api.post('/auth/login', { email, senha });
    const { token, user: userData } = response.data;

    localStorage.setItem('@voltaris:token', token);
    localStorage.setItem('@voltaris:user', JSON.stringify(userData));
    setUser(userData);

    return userData;
  }

  function logout() {
    localStorage.removeItem('@voltaris:token');
    localStorage.removeItem('@voltaris:user');
    setUser(null);
  }

  function hasPermission(module) {
    if (!user) return false;
    const perms = PERMISSIONS[user.role] || [];
    return perms.includes(module);
  }

  function getRoleLabel() {
    if (!user) return '';
    return ROLE_LABELS[user.role] || user.role;
  }

  function getPermissions() {
    if (!user) return [];
    return PERMISSIONS[user.role] || [];
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signed: !!user,
        login,
        logout,
        hasPermission,
        getRoleLabel,
        getPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
