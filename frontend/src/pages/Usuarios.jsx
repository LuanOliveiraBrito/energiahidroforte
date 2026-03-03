import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { FiUsers, FiPlus, FiEdit2, FiUserCheck, FiUserX, FiEye, FiEyeOff, FiX } from 'react-icons/fi';

const ROLES = [
  { value: 'ADMINISTRADOR', label: 'Administrador - Acesso Total' },
  { value: 'ADMINISTRATIVO', label: 'Administrativo - Dashboard, Cadastros, Lançamentos, Relatórios' },
  { value: 'GERENTE_ADM', label: 'Gerente ADM - Administrativo + Aprovações' },
  { value: 'DIRETOR', label: 'Diretor - Aprovações, Pagamentos, Relatórios' },
  { value: 'FINANCEIRO', label: 'Financeiro - Cadastros, Lançamentos, Baixas, Relatórios' },
];

function formatCPF(v) {
  const nums = (v || '').replace(/\D/g, '').slice(0, 11);
  if (nums.length <= 3) return nums;
  if (nums.length <= 6) return `${nums.slice(0,3)}.${nums.slice(3)}`;
  if (nums.length <= 9) return `${nums.slice(0,3)}.${nums.slice(3,6)}.${nums.slice(6)}`;
  return `${nums.slice(0,3)}.${nums.slice(3,6)}.${nums.slice(6,9)}-${nums.slice(9)}`;
}

export default function Usuarios() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [form, setForm] = useState({ nome: '', cpf: '', email: '', senha: '', role: 'ADMINISTRATIVO' });
  const [editForm, setEditForm] = useState({ email: '', cpf: '', senha: '', role: 'ADMINISTRATIVO' });
  const [showSenhaNew, setShowSenhaNew] = useState(false);
  const [showSenhaEdit, setShowSenhaEdit] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    const { nome, cpf, email, senha, role } = form;

    const cpfNums = cpf.replace(/\D/g, '');
    if (!nome || !cpfNums || !email || !senha || !role) {
      toast.warning('Preencha todos os campos obrigatórios');
      return;
    }
    if (cpfNums.length !== 11) {
      toast.warning('CPF deve ter 11 dígitos');
      return;
    }

    try {
      await api.post('/users', { nome, cpf: cpfNums, email, senha, role });
      toast.success('Usuário criado!');
      setForm({ nome: '', cpf: '', email: '', senha: '', role: 'ADMINISTRATIVO' });
      setShowForm(false);
      setShowSenhaNew(false);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao criar');
    }
  }

  async function handleEdit(e) {
    e.preventDefault();
    if (!editModal) return;

    const cpfNums = editForm.cpf.replace(/\D/g, '');
    if (!editForm.email || !cpfNums || !editForm.role) {
      toast.warning('Preencha todos os campos obrigatórios');
      return;
    }
    if (cpfNums.length !== 11) {
      toast.warning('CPF deve ter 11 dígitos');
      return;
    }

    try {
      const data = {
        email: editForm.email,
        cpf: cpfNums,
        role: editForm.role,
      };
      if (editForm.senha) data.senha = editForm.senha;

      await api.put(`/users/${editModal.id}`, data);
      toast.success('Usuário atualizado!');
      setEditModal(null);
      setShowSenhaEdit(false);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao atualizar');
    }
  }

  async function toggleAtivo(user) {
    try {
      await api.put(`/users/${user.id}`, { ativo: !user.ativo });
      toast.success(`Usuário ${user.ativo ? 'desativado' : 'ativado'}`);
      loadUsers();
    } catch (err) {
      toast.error('Erro ao alterar status');
    }
  }

  function openEditModal(user) {
    setEditModal(user);
    setEditForm({ email: user.email, cpf: formatCPF(user.cpf), senha: '', role: user.role });
    setShowSenhaEdit(false);
  }

  return (
    <div className="page-enter">
      <div className="flex-between mb-4">
        <div className="page-title" style={{ marginBottom: 0 }}><FiUsers size={20} /> Gestão de Usuários</div>
        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setShowSenhaNew(false); }}>
          <FiPlus size={14} /> Novo Usuário
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Novo Usuário</h3>
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <div className="f-group">
                <label>Nome Completo *</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" />
              </div>
              <div className="f-group">
                <label>CPF *</label>
                <input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })} placeholder="000.000.000-00" maxLength={14} required />
              </div>
            </div>
            <div className="form-row">
              <div className="f-group">
                <label>Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@empresa.com" />
              </div>
              <div className="f-group">
                <label>Senha *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showSenhaNew ? 'text' : 'password'}
                    value={form.senha}
                    onChange={(e) => setForm({ ...form, senha: e.target.value })}
                    placeholder="••••••••"
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenhaNew(!showSenhaNew)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
                    title={showSenhaNew ? 'Ocultar' : 'Mostrar'}
                  >
                    {showSenhaNew ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="form-row">
              <div className="f-group">
                <label>Perfil de Acesso *</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">Criar Usuário</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? (
          <p className="text-sub">Carregando...</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Email</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.nome}</strong></td>
                    <td>{u.cpf ? formatCPF(u.cpf) : <span style={{ color: '#999' }}>-</span>}</td>
                    <td>{u.email}</td>
                    <td><span className="badge badge-aprovada">{u.role}</span></td>
                    <td>
                      <span className={`badge ${u.ativo ? 'badge-liberada' : 'badge-rejeitada'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(u)} title="Editar">
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          className={`btn btn-sm ${u.ativo ? 'btn-danger' : 'btn-primary'}`}
                          onClick={() => toggleAtivo(u)}
                          title={u.ativo ? 'Desativar' : 'Ativar'}
                        >
                          {u.ativo ? <FiUserX size={14} /> : <FiUserCheck size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Editar Usuário</h3>
              <button onClick={() => setEditModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleEdit}>
              <div className="f-group" style={{ marginBottom: 14 }}>
                <label>Nome</label>
                <input
                  value={editModal.nome}
                  disabled
                  style={{ background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
                  title="Nome não pode ser alterado"
                />
                <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'block' }}>🔒 Nome não é editável por segurança</span>
              </div>

              <div className="f-group" style={{ marginBottom: 14 }}>
                <label>CPF *</label>
                <input value={editForm.cpf} onChange={(e) => setEditForm({ ...editForm, cpf: formatCPF(e.target.value) })} placeholder="000.000.000-00" maxLength={14} required />
              </div>

              <div className="f-group" style={{ marginBottom: 14 }}>
                <label>Email *</label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="email@empresa.com" />
              </div>

              <div className="f-group" style={{ marginBottom: 14 }}>
                <label>Nova Senha (deixe em branco para manter)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showSenhaEdit ? 'text' : 'password'}
                    value={editForm.senha}
                    onChange={(e) => setEditForm({ ...editForm, senha: e.target.value })}
                    placeholder="••••••••"
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenhaEdit(!showSenhaEdit)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
                    title={showSenhaEdit ? 'Ocultar' : 'Mostrar'}
                  >
                    {showSenhaEdit ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>

              <div className="f-group" style={{ marginBottom: 20 }}>
                <label>Perfil de Acesso *</label>
                <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
