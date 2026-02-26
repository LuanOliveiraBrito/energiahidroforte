import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import estadosCidades from '../data/estadosCidades';
import { formatCNPJ, validarCNPJ } from '../utils/formatters';
import { FiPlus, FiEdit2, FiTrash2, FiDatabase, FiSearch, FiChevronLeft, FiChevronRight, FiX, FiSave } from 'react-icons/fi';

const TABS = [
  { id: 'filiais', label: 'Filiais' },
  { id: 'fornecedores', label: 'Fornecedores' },
  { id: 'unidades', label: 'Unidades (UC)' },
  { id: 'centros-custo', label: 'C. Custo' },
  { id: 'contas-contabeis', label: 'Contas' },
  { id: 'naturezas', label: 'Naturezas' },
];

export default function Cadastros() {
  const [activeTab, setActiveTab] = useState('filiais');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Paginação e busca (para abas com muitos registros)
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const PAGE_SIZE = 20;

  // Abas que usam paginação
  const PAGINATED_TABS = ['filiais', 'centros-custo', 'contas-contabeis'];

  // Dados auxiliares para selects
  const [filiais, setFiliais] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);

  // Forms
  const [formFilial, setFormFilial] = useState({ razaoSocial: '', cnpj: '', estado: '', cidade: '' });
  const [formFornecedor, setFormFornecedor] = useState({ nome: '', cnpj: '', tipoPagamento: '', banco: '', agencia: '', conta: '', tipoConta: '', op: '', chavePix: '', tipoChavePix: '' });
  const [formUnidade, setFormUnidade] = useState({ uc: '', numInstalacao: '', filialId: '', fornecedorId: '', diaVencimento: '' });
  const [formCC, setFormCC] = useState({ numero: '', descricao: '', filialId: '' });
  const [formConta, setFormConta] = useState({ numero: '', descricao: '' });
  const [formNatureza, setFormNatureza] = useState({ descricao: '' });

  // Filtro de filial para aba C.Custo
  const [filialFilterCC, setFilialFilterCC] = useState('');

  const [editingId, setEditingId] = useState(null); // mantido para resetForms

  // Modal de edição
  const [editModal, setEditModal] = useState(null); // { tab, item, form }

  useEffect(() => {
    loadData();
    loadAuxData();
  }, [activeTab, currentPage, filialFilterCC]);

  // Debounce da busca
  useEffect(() => {
    if (!PAGINATED_TABS.includes(activeTab)) return;
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        loadData();
      } else {
        setCurrentPage(1); // vai disparar loadData via useEffect acima
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  async function loadData() {
    setLoading(true);
    try {
      if (PAGINATED_TABS.includes(activeTab)) {
        const params = new URLSearchParams({ page: currentPage, limit: PAGE_SIZE });
        if (searchTerm.trim()) params.append('search', searchTerm.trim());
        if (activeTab === 'centros-custo' && filialFilterCC) params.append('filialId', filialFilterCC);
        const res = await api.get(`/cadastros/${activeTab}?${params}`);
        setData(res.data.data);
        setPagination(res.data.pagination);
      } else {
        const res = await api.get(`/cadastros/${activeTab}`);
        setData(res.data);
        setPagination(null);
      }
    } catch (err) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  async function loadAuxData() {
    try {
      const [filRes, fornRes] = await Promise.all([
        api.get('/cadastros/filiais'),
        api.get('/cadastros/fornecedores'),
      ]);
      setFiliais(filRes.data);
      setFornecedores(fornRes.data);
    } catch (err) {
      // silencioso
    }
  }

  function resetForms() {
    setFormFilial({ razaoSocial: '', cnpj: '', estado: '', cidade: '' });
    setFormFornecedor({ nome: '', cnpj: '', tipoPagamento: '', banco: '', agencia: '', conta: '', tipoConta: '', op: '', chavePix: '', tipoChavePix: '' });
    setFormUnidade({ uc: '', numInstalacao: '', filialId: '', fornecedorId: '', diaVencimento: '' });
    setFormCC({ numero: '', descricao: '', filialId: '' });
    setFormConta({ numero: '', descricao: '' });
    setFormNatureza({ descricao: '' });
    setEditingId(null);
  }

  function handleTabChange(tab) {
    setActiveTab(tab);
    setSearchTerm('');
    setCurrentPage(1);
    setPagination(null);
    setFilialFilterCC('');
    resetForms();
  }

  // === SAVE HANDLERS ===

  async function saveFilial(e) {
    e.preventDefault();
    const { razaoSocial, cnpj, estado, cidade } = formFilial;

    if (!razaoSocial || !cnpj || !estado || !cidade) {
      toast.warning('Preencha todos os campos');
      return;
    }

    if (!validarCNPJ(cnpj)) {
      toast.error('CNPJ inválido');
      return;
    }

    try {
      await api.post('/cadastros/filiais', { razaoSocial, cnpj, estado, cidade });
      toast.success('Filial cadastrada!');
      resetForms();
      loadData();
      loadAuxData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao salvar');
    }
  }

  async function saveFornecedor(e) {
    e.preventDefault();
    const { nome, cnpj, tipoPagamento, banco, agencia, conta, tipoConta, op, chavePix, tipoChavePix } = formFornecedor;

    if (!nome || !cnpj) {
      toast.warning('Preencha Nome e CNPJ');
      return;
    }

    if (!validarCNPJ(cnpj)) {
      toast.error('CNPJ inválido');
      return;
    }

    if (tipoPagamento === 'TED' && (!banco || !agencia || !conta)) {
      toast.warning('Para TED, preencha Banco, Agência e Conta');
      return;
    }

    if (tipoPagamento === 'PIX' && (!chavePix || !tipoChavePix)) {
      toast.warning('Para PIX, preencha a Chave e o Tipo de Chave');
      return;
    }

    const payload = { nome, cnpj, tipoPagamento, banco, agencia, conta, tipoConta, op, chavePix, tipoChavePix };

    try {
      await api.post('/cadastros/fornecedores', payload);
      toast.success('Fornecedor cadastrado!');
      resetForms();
      loadData();
      loadAuxData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao salvar');
    }
  }

  async function saveUnidade(e) {
    e.preventDefault();
    const { uc, numInstalacao, filialId, fornecedorId, diaVencimento } = formUnidade;

    if (!uc || !numInstalacao || !filialId || !fornecedorId) {
      toast.warning('Preencha todos os campos');
      return;
    }

    try {
      const payload = { uc, numInstalacao, filialId, fornecedorId, diaVencimento: diaVencimento || null };
      await api.post('/cadastros/unidades', payload);
      toast.success('UC cadastrada!');
      resetForms();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao salvar');
    }
  }

  async function saveCC(e) {
    e.preventDefault();
    const { numero, descricao, filialId } = formCC;
    const ccFilialId = filialId || filialFilterCC;
    if (!numero || !descricao || !ccFilialId) { toast.warning('Preencha todos os campos (Filial, Número e Descrição)'); return; }

    try {
      await api.post('/cadastros/centros-custo', { numero, descricao, filialId: ccFilialId });
      toast.success('Centro de custo cadastrado!');
      resetForms();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao salvar');
    }
  }

  async function saveConta(e) {
    e.preventDefault();
    const { numero, descricao } = formConta;
    if (!numero || !descricao) { toast.warning('Preencha todos os campos'); return; }

    try {
      await api.post('/cadastros/contas-contabeis', { numero, descricao });
      toast.success('Conta cadastrada!');
      resetForms();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao salvar');
    }
  }

  async function saveNatureza(e) {
    e.preventDefault();
    const { descricao } = formNatureza;
    if (!descricao) { toast.warning('Preencha a descrição'); return; }

    try {
      await api.post('/cadastros/naturezas', { descricao });
      toast.success('Natureza cadastrada!');
      resetForms();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao salvar');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Deseja realmente desativar este registro?')) return;
    try {
      await api.delete(`/cadastros/${activeTab}/${id}`);
      toast.success('Registro desativado!');
      loadData();
    } catch (err) {
      toast.error('Erro ao desativar');
    }
  }

  // === CIDADES ===
  const cidadesDoEstado = formFilial.estado ? estadosCidades[formFilial.estado]?.cidades || [] : [];

  // === RENDERS ===

  function renderForm() {
    switch (activeTab) {
      case 'filiais':
        return (
          <form onSubmit={saveFilial}>
            <div className="form-row">
              <div className="f-group">
                <label>Razão Social</label>
                <input value={formFilial.razaoSocial} onChange={(e) => setFormFilial({ ...formFilial, razaoSocial: e.target.value })} placeholder="Razão Social da Filial" />
              </div>
              <div className="f-group">
                <label>CNPJ</label>
                <input value={formFilial.cnpj} onChange={(e) => setFormFilial({ ...formFilial, cnpj: formatCNPJ(e.target.value) })} placeholder="00.000.000/0000-00" maxLength={18} />
              </div>
            </div>
            <div className="form-row">
              <div className="f-group">
                <label>Estado</label>
                <select value={formFilial.estado} onChange={(e) => setFormFilial({ ...formFilial, estado: e.target.value, cidade: '' })}>
                  <option value="">Selecione o Estado</option>
                  {Object.entries(estadosCidades).map(([uf, info]) => (
                    <option key={uf} value={uf}>{info.nome} ({uf})</option>
                  ))}
                </select>
              </div>
              <div className="f-group">
                <label>Cidade</label>
                <select value={formFilial.cidade} onChange={(e) => setFormFilial({ ...formFilial, cidade: e.target.value })} disabled={!formFilial.estado}>
                  <option value="">Selecione a Cidade</option>
                  {cidadesDoEstado.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary"><FiPlus size={14} /> Adicionar Filial</button>
          </form>
        );

      case 'fornecedores':
        return (
          <form onSubmit={saveFornecedor}>
            <div className="form-row">
              <div className="f-group">
                <label>Nome Fornecedor *</label>
                <input value={formFornecedor.nome} onChange={(e) => setFormFornecedor({ ...formFornecedor, nome: e.target.value })} placeholder="Nome do Fornecedor" />
              </div>
              <div className="f-group">
                <label>CNPJ Fornecedor *</label>
                <input value={formFornecedor.cnpj} onChange={(e) => setFormFornecedor({ ...formFornecedor, cnpj: formatCNPJ(e.target.value) })} placeholder="00.000.000/0000-00" maxLength={18} />
              </div>
            </div>

            <div className="form-row">
              <div className="f-group">
                <label>Tipo de Pagamento</label>
                <select
                  value={formFornecedor.tipoPagamento}
                  onChange={(e) => setFormFornecedor({
                    ...formFornecedor,
                    tipoPagamento: e.target.value,
                    // Limpar campos ao trocar tipo
                    ...(e.target.value !== 'TED' ? { banco: '', agencia: '', conta: '', tipoConta: '', op: '' } : {}),
                    ...(e.target.value !== 'PIX' ? { chavePix: '', tipoChavePix: '' } : {}),
                  })}
                >
                  <option value="">Selecione...</option>
                  <option value="TED">Transferência (TED)</option>
                  <option value="PIX">PIX</option>
                  <option value="BOLETO">Boleto</option>
                </select>
              </div>
            </div>

            {/* Campos TED */}
            {formFornecedor.tipoPagamento === 'TED' && (
              <>
                <h4 style={{ margin: '16px 0 8px', color: 'var(--text-sub)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 1 }}>Dados Bancários (TED)</h4>
                <div className="form-row">
                  <div className="f-group">
                    <label>Banco *</label>
                    <input value={formFornecedor.banco} onChange={(e) => setFormFornecedor({ ...formFornecedor, banco: e.target.value })} placeholder="Nome do Banco" />
                  </div>
                  <div className="f-group">
                    <label>Agência *</label>
                    <input value={formFornecedor.agencia} onChange={(e) => setFormFornecedor({ ...formFornecedor, agencia: e.target.value })} placeholder="Nº da Agência" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="f-group">
                    <label>Conta *</label>
                    <input value={formFornecedor.conta} onChange={(e) => setFormFornecedor({ ...formFornecedor, conta: e.target.value })} placeholder="Nº da Conta" />
                  </div>
                  <div className="f-group">
                    <label>Tipo de Conta</label>
                    <select value={formFornecedor.tipoConta} onChange={(e) => setFormFornecedor({ ...formFornecedor, tipoConta: e.target.value })}>
                      <option value="">Selecione...</option>
                      <option value="Corrente">Corrente</option>
                      <option value="Poupança">Poupança</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="f-group">
                    <label>OP</label>
                    <input value={formFornecedor.op} onChange={(e) => setFormFornecedor({ ...formFornecedor, op: e.target.value })} placeholder="Operação" />
                  </div>
                </div>
              </>
            )}

            {/* Campos PIX */}
            {formFornecedor.tipoPagamento === 'PIX' && (
              <>
                <h4 style={{ margin: '16px 0 8px', color: 'var(--text-sub)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 1 }}>Dados PIX</h4>
                <div className="form-row">
                  <div className="f-group">
                    <label>Chave PIX *</label>
                    <input value={formFornecedor.chavePix} onChange={(e) => setFormFornecedor({ ...formFornecedor, chavePix: e.target.value })} placeholder="Chave PIX" />
                  </div>
                  <div className="f-group">
                    <label>Tipo Chave PIX *</label>
                    <select value={formFornecedor.tipoChavePix} onChange={(e) => setFormFornecedor({ ...formFornecedor, tipoChavePix: e.target.value })}>
                      <option value="">Selecione...</option>
                      <option value="CNPJ/CPF">CNPJ/CPF</option>
                      <option value="Telefone">Telefone</option>
                      <option value="E-mail">E-mail</option>
                      <option value="Aleatória">Aleatória</option>
                      <option value="Copia e Cola">Copia e Cola</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Boleto: sem campos adicionais */}
            {formFornecedor.tipoPagamento === 'BOLETO' && (
              <p style={{ margin: '16px 0', color: 'var(--text-sub)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                💡 Boleto não requer dados adicionais de pagamento.
              </p>
            )}

            <button type="submit" className="btn btn-primary"><FiPlus size={14} /> Adicionar Fornecedor</button>
          </form>
        );

      case 'unidades':
        return (
          <form onSubmit={saveUnidade}>
            <div className="form-row">
              <div className="f-group">
                <label>Unidade Consumidora</label>
                <input value={formUnidade.uc} onChange={(e) => setFormUnidade({ ...formUnidade, uc: e.target.value })} placeholder="Código da UC" />
              </div>
              <div className="f-group">
                <label>Nº Instalação</label>
                <input value={formUnidade.numInstalacao} onChange={(e) => setFormUnidade({ ...formUnidade, numInstalacao: e.target.value })} placeholder="Número da Instalação" />
              </div>
            </div>
            <div className="form-row">
              <div className="f-group">
                <label>Vincular Filial</label>
                <select value={formUnidade.filialId} onChange={(e) => setFormUnidade({ ...formUnidade, filialId: e.target.value })}>
                  <option value="">Selecione a Filial</option>
                  {filiais.map((f) => <option key={f.id} value={f.id}>{f.razaoSocial}</option>)}
                </select>
              </div>
              <div className="f-group">
                <label>Vincular Fornecedor</label>
                <select value={formUnidade.fornecedorId} onChange={(e) => setFormUnidade({ ...formUnidade, fornecedorId: e.target.value })}>
                  <option value="">Selecione o Fornecedor</option>
                  {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="f-group">
                <label>Dia Vencimento das Faturas</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formUnidade.diaVencimento}
                  onChange={(e) => setFormUnidade({ ...formUnidade, diaVencimento: e.target.value })}
                  placeholder="Ex: 15"
                />
              </div>
              <div className="f-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-sub)', margin: 0, paddingBottom: 8 }}>
                  💡 Dia do mês em que a fatura desta UC vence. Usado para alertar lançamentos pendentes.
                </p>
              </div>
            </div>
            <button type="submit" className="btn btn-primary"><FiPlus size={14} /> Adicionar UC</button>
          </form>
        );

      case 'centros-custo':
        return (
          <>
            {/* Seletor de filial para filtrar/vincular */}
            <div className="form-row" style={{ marginBottom: 12 }}>
              <div className="f-group" style={{ flex: '0 0 350px' }}>
                <label>📌 Filial</label>
                <select
                  value={filialFilterCC}
                  onChange={(e) => {
                    setFilialFilterCC(e.target.value);
                    setCurrentPage(1);
                    setFormCC({ ...formCC, filialId: e.target.value });
                  }}
                >
                  <option value="">-- Selecione uma Filial --</option>
                  {filiais.map((f) => (
                    <option key={f.id} value={f.id}>{f.razaoSocial}</option>
                  ))}
                </select>
              </div>
              {filialFilterCC && (
                <div className="f-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 6 }}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-sub)', margin: 0 }}>
                    💡 Mostrando centros de custo vinculados a esta filial. Adicione novos abaixo.
                  </p>
                </div>
              )}
            </div>

            {filialFilterCC ? (
              <form onSubmit={saveCC}>
                <div className="form-row">
                  <div className="f-group">
                    <label>Nº Centro de Custo</label>
                    <input value={formCC.numero} onChange={(e) => setFormCC({ ...formCC, numero: e.target.value })} placeholder="Número do Centro de Custo" />
                  </div>
                  <div className="f-group">
                    <label>Descrição Centro de Custo</label>
                    <input value={formCC.descricao} onChange={(e) => setFormCC({ ...formCC, descricao: e.target.value })} placeholder="Descrição" />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary"><FiPlus size={14} /> Adicionar C. Custo</button>
              </form>
            ) : (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <p style={{ color: 'var(--text-sub)' }}>Selecione uma filial acima para gerenciar seus centros de custo.</p>
              </div>
            )}
          </>
        );

      case 'contas-contabeis':
        return (
          <form onSubmit={saveConta}>
            <div className="form-row">
              <div className="f-group">
                <label>Nº Conta Contábil</label>
                <input value={formConta.numero} onChange={(e) => setFormConta({ ...formConta, numero: e.target.value })} placeholder="Número da Conta" />
              </div>
              <div className="f-group">
                <label>Descrição Conta Contábil</label>
                <input value={formConta.descricao} onChange={(e) => setFormConta({ ...formConta, descricao: e.target.value })} placeholder="Descrição" />
              </div>
            </div>
            <button type="submit" className="btn btn-primary"><FiPlus size={14} /> Adicionar Conta</button>
          </form>
        );

      case 'naturezas':
        return (
          <form onSubmit={saveNatureza}>
            <div className="f-group">
              <label>Descrição de Natureza</label>
              <input value={formNatureza.descricao} onChange={(e) => setFormNatureza({ ...formNatureza, descricao: e.target.value })} placeholder="Ex: Energia, Água, Aluguel" />
            </div>
            <button type="submit" className="btn btn-primary"><FiPlus size={14} /> Adicionar Natureza</button>
          </form>
        );
    }
  }

  function renderList() {
    const isPaginated = PAGINATED_TABS.includes(activeTab);
    const isCompactTable = activeTab === 'filiais' || activeTab === 'centros-custo' || activeTab === 'contas-contabeis';

    // Para C.Custo, só mostra lista se filial estiver selecionada
    if (activeTab === 'centros-custo' && !filialFilterCC) return null;

    return (
      <>
        {/* Divisor visual */}
        <div className="cadastro-divider" />

        {/* Barra de busca para abas paginadas */}
        {isPaginated && (
          <div className="search-bar">
            <div className="search-input-wrap">
              <FiSearch size={16} className="search-icon" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={activeTab === 'filiais' ? 'Buscar filial (razão social, CNPJ, cidade, UF)...' : activeTab === 'centros-custo' ? 'Buscar centro de custo...' : 'Buscar conta contábil...'}
              />
            </div>
            {pagination && (
              <span className="search-count">
                {pagination.total} registro{pagination.total !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {loading && <p className="text-sub" style={{ padding: 20, textAlign: 'center' }}>Carregando...</p>}
        {!loading && data.length === 0 && <div className="empty-state"><p>Nenhum registro encontrado</p></div>}

        {/* Tabela compacta para Filiais, C.Custo e Contas */}
        {!loading && data.length > 0 && isCompactTable && (
          <table className="cadastro-table">
            <thead>
              <tr>
                {activeTab === 'filiais' ? (
                  <>
                    <th>Razão Social</th>
                    <th>CNPJ</th>
                    <th>Cidade/UF</th>
                    <th>Ações</th>
                  </>
                ) : (
                  <>
                    <th>Número</th>
                    <th>Descrição</th>
                    <th>Ações</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  {activeTab === 'filiais' ? (
                    <>
                      <td>{item.razaoSocial}</td>
                      <td>{formatCNPJ(item.cnpj)}</td>
                      <td>{item.cidade}/{item.estado}</td>
                    </>
                  ) : (
                    <>
                      <td>{item.numero}</td>
                      <td>{item.descricao}</td>
                    </>
                  )}
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(item)} title="Editar"><FiEdit2 size={13} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)} title="Desativar"><FiTrash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Lista padrão para demais abas */}
        {!loading && data.length > 0 && !isCompactTable && (
          <div className="data-list">
            {data.map((item) => (
              <div key={item.id} className="data-list-item">
                <div className="item-info">
                  <div className="item-title">{getItemTitle(item)}</div>
                  <div className="item-subtitle">{getItemSubtitle(item)}</div>
                </div>
                <div className="item-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(item)} title="Editar"><FiEdit2 size={14} /></button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)} title="Desativar"><FiTrash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginação */}
        {isPaginated && pagination && pagination.totalPages > 1 && (
          <div className="pagination-bar">
            <button
              className="page-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <FiChevronLeft size={14} /> Anterior
            </button>
            <span className="page-info">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              className="page-btn"
              disabled={currentPage >= pagination.totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Próxima <FiChevronRight size={14} />
            </button>
          </div>
        )}
      </>
    );
  }

  function getItemTitle(item) {
    switch (activeTab) {
      case 'filiais': return item.razaoSocial;
      case 'fornecedores': return item.nome;
      case 'unidades': return `UC: ${item.uc}`;
      case 'centros-custo': return `${item.numero} - ${item.descricao}`;
      case 'contas-contabeis': return `${item.numero} - ${item.descricao}`;
      case 'naturezas': return item.descricao;
      default: return '';
    }
  }

  function getItemSubtitle(item) {
    switch (activeTab) {
      case 'filiais': return `CNPJ: ${formatCNPJ(item.cnpj)} | ${item.cidade}/${item.estado}`;
      case 'fornecedores': {
        const tp = item.tipoPagamento;
        const pagLabel = tp === 'TED' ? `TED (${item.banco || '?'})` : tp === 'PIX' ? `PIX (${item.tipoChavePix || '?'})` : tp === 'BOLETO' ? 'Boleto' : 'Não definido';
        return `CNPJ: ${formatCNPJ(item.cnpj)} | Pagamento: ${pagLabel}`;
      }
      case 'unidades': return `Instalação: ${item.numInstalacao} | Filial: ${item.filial?.razaoSocial || '-'} | Fornecedor: ${item.fornecedor?.nome || '-'}${item.diaVencimento ? ` | Venc. dia ${item.diaVencimento}` : ''}`;
      case 'centros-custo': return `Filial: ${item.filial?.razaoSocial || '-'}`;
      case 'contas-contabeis': return `Conta Contábil`;
      case 'naturezas': return `Natureza de Despesa`;
      default: return '';
    }
  }

  function handleEdit(item) {
    let form;
    switch (activeTab) {
      case 'filiais':
        form = { razaoSocial: item.razaoSocial, cnpj: formatCNPJ(item.cnpj), estado: item.estado, cidade: item.cidade };
        break;
      case 'fornecedores':
        form = {
          nome: item.nome, cnpj: formatCNPJ(item.cnpj),
          tipoPagamento: item.tipoPagamento || '', banco: item.banco || '',
          agencia: item.agencia || '', conta: item.conta || '', tipoConta: item.tipoConta || '',
          op: item.op || '', chavePix: item.chavePix || '', tipoChavePix: item.tipoChavePix || '',
        };
        break;
      case 'unidades':
        form = {
          uc: item.uc, numInstalacao: item.numInstalacao,
          filialId: item.filialId.toString(), fornecedorId: item.fornecedorId.toString(),
          diaVencimento: item.diaVencimento ? item.diaVencimento.toString() : '',
        };
        break;
      case 'centros-custo':
        form = { numero: item.numero, descricao: item.descricao, filialId: item.filialId || filialFilterCC };
        break;
      case 'contas-contabeis':
        form = { numero: item.numero, descricao: item.descricao };
        break;
      case 'naturezas':
        form = { descricao: item.descricao };
        break;
    }
    setEditModal({ tab: activeTab, item, form });
  }

  // ============== SALVAR EDIÇÃO VIA MODAL ==============
  async function saveEditModal(e) {
    e.preventDefault();
    if (!editModal) return;
    const { tab, item, form } = editModal;
    const id = item.id;

    try {
      switch (tab) {
        case 'filiais': {
          const { razaoSocial, cnpj, estado, cidade } = form;
          if (!razaoSocial || !cnpj || !estado || !cidade) { toast.warning('Preencha todos os campos'); return; }
          if (!validarCNPJ(cnpj)) { toast.error('CNPJ inválido'); return; }
          await api.put(`/cadastros/filiais/${id}`, { razaoSocial, cnpj, estado, cidade });
          toast.success('Filial atualizada!');
          loadAuxData();
          break;
        }
        case 'fornecedores': {
          const { nome, cnpj, tipoPagamento, banco, agencia, conta, tipoConta, op, chavePix, tipoChavePix } = form;
          if (!nome || !cnpj) { toast.warning('Preencha Nome e CNPJ'); return; }
          if (!validarCNPJ(cnpj)) { toast.error('CNPJ inválido'); return; }
          await api.put(`/cadastros/fornecedores/${id}`, { nome, cnpj, tipoPagamento, banco, agencia, conta, tipoConta, op, chavePix, tipoChavePix });
          toast.success('Fornecedor atualizado!');
          loadAuxData();
          break;
        }
        case 'unidades': {
          const { uc, numInstalacao, filialId, fornecedorId, diaVencimento } = form;
          if (!uc || !numInstalacao || !filialId || !fornecedorId) { toast.warning('Preencha todos os campos'); return; }
          await api.put(`/cadastros/unidades/${id}`, { uc, numInstalacao, filialId, fornecedorId, diaVencimento: diaVencimento || null });
          toast.success('UC atualizada!');
          break;
        }
        case 'centros-custo': {
          const { numero, descricao, filialId } = form;
          if (!numero || !descricao || !filialId) { toast.warning('Preencha todos os campos'); return; }
          await api.put(`/cadastros/centros-custo/${id}`, { numero, descricao, filialId });
          toast.success('Centro de custo atualizado!');
          break;
        }
        case 'contas-contabeis': {
          const { numero, descricao } = form;
          if (!numero || !descricao) { toast.warning('Preencha todos os campos'); return; }
          await api.put(`/cadastros/contas-contabeis/${id}`, { numero, descricao });
          toast.success('Conta atualizada!');
          break;
        }
        case 'naturezas': {
          const { descricao } = form;
          if (!descricao) { toast.warning('Preencha a descrição'); return; }
          await api.put(`/cadastros/naturezas/${id}`, { descricao });
          toast.success('Natureza atualizada!');
          break;
        }
      }
      setEditModal(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao atualizar');
    }
  }

  function updateEditForm(field, value) {
    setEditModal(prev => ({ ...prev, form: { ...prev.form, [field]: value } }));
  }

  // ============== RENDER MODAL DE EDIÇÃO ==============
  function renderEditModal() {
    if (!editModal) return null;
    const { tab, form } = editModal;

    const tabLabel = { filiais: 'Filial', fornecedores: 'Fornecedor', unidades: 'UC', 'centros-custo': 'Centro de Custo', 'contas-contabeis': 'Conta Contábil', naturezas: 'Natureza' };
    const cidadesModal = form.estado ? estadosCidades[form.estado]?.cidades || [] : [];

    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setEditModal(null)}>
        <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
              <FiEdit2 size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              Editar {tabLabel[tab]}
            </h3>
            <button onClick={() => setEditModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: '#64748b' }}>
              <FiX size={20} />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={saveEditModal} style={{ padding: 20 }}>
            {tab === 'filiais' && (
              <>
                <div className="form-row">
                  <div className="f-group">
                    <label>Razão Social</label>
                    <input value={form.razaoSocial} onChange={e => updateEditForm('razaoSocial', e.target.value)} />
                  </div>
                  <div className="f-group">
                    <label>CNPJ</label>
                    <input value={form.cnpj} onChange={e => updateEditForm('cnpj', formatCNPJ(e.target.value))} maxLength={18} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="f-group">
                    <label>Estado</label>
                    <select value={form.estado} onChange={e => { updateEditForm('estado', e.target.value); updateEditForm('cidade', ''); }}>
                      <option value="">Selecione</option>
                      {Object.entries(estadosCidades).map(([uf, info]) => <option key={uf} value={uf}>{info.nome} ({uf})</option>)}
                    </select>
                  </div>
                  <div className="f-group">
                    <label>Cidade</label>
                    <select value={form.cidade} onChange={e => updateEditForm('cidade', e.target.value)} disabled={!form.estado}>
                      <option value="">Selecione</option>
                      {cidadesModal.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}

            {tab === 'fornecedores' && (
              <>
                <div className="form-row">
                  <div className="f-group">
                    <label>Nome *</label>
                    <input value={form.nome} onChange={e => updateEditForm('nome', e.target.value)} />
                  </div>
                  <div className="f-group">
                    <label>CNPJ *</label>
                    <input value={form.cnpj} onChange={e => updateEditForm('cnpj', formatCNPJ(e.target.value))} maxLength={18} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="f-group">
                    <label>Tipo de Pagamento</label>
                    <select value={form.tipoPagamento} onChange={e => updateEditForm('tipoPagamento', e.target.value)}>
                      <option value="">Selecione...</option>
                      <option value="TED">Transferência (TED)</option>
                      <option value="PIX">PIX</option>
                      <option value="BOLETO">Boleto</option>
                    </select>
                  </div>
                </div>
                {form.tipoPagamento === 'TED' && (
                  <>
                    <div className="form-row">
                      <div className="f-group"><label>Banco *</label><input value={form.banco} onChange={e => updateEditForm('banco', e.target.value)} /></div>
                      <div className="f-group"><label>Agência *</label><input value={form.agencia} onChange={e => updateEditForm('agencia', e.target.value)} /></div>
                    </div>
                    <div className="form-row">
                      <div className="f-group"><label>Conta *</label><input value={form.conta} onChange={e => updateEditForm('conta', e.target.value)} /></div>
                      <div className="f-group">
                        <label>Tipo de Conta</label>
                        <select value={form.tipoConta} onChange={e => updateEditForm('tipoConta', e.target.value)}>
                          <option value="">Selecione...</option>
                          <option value="Corrente">Corrente</option>
                          <option value="Poupança">Poupança</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="f-group"><label>OP</label><input value={form.op} onChange={e => updateEditForm('op', e.target.value)} /></div>
                    </div>
                  </>
                )}
                {form.tipoPagamento === 'PIX' && (
                  <div className="form-row">
                    <div className="f-group"><label>Chave PIX *</label><input value={form.chavePix} onChange={e => updateEditForm('chavePix', e.target.value)} /></div>
                    <div className="f-group">
                      <label>Tipo Chave *</label>
                      <select value={form.tipoChavePix} onChange={e => updateEditForm('tipoChavePix', e.target.value)}>
                        <option value="">Selecione...</option>
                        <option value="CNPJ/CPF">CNPJ/CPF</option>
                        <option value="Telefone">Telefone</option>
                        <option value="E-mail">E-mail</option>
                        <option value="Aleatória">Aleatória</option>
                        <option value="Copia e Cola">Copia e Cola</option>
                      </select>
                    </div>
                  </div>
                )}
              </>
            )}

            {tab === 'unidades' && (
              <>
                <div className="form-row">
                  <div className="f-group"><label>UC</label><input value={form.uc} onChange={e => updateEditForm('uc', e.target.value)} /></div>
                  <div className="f-group"><label>Nº Instalação</label><input value={form.numInstalacao} onChange={e => updateEditForm('numInstalacao', e.target.value)} /></div>
                </div>
                <div className="form-row">
                  <div className="f-group">
                    <label>Filial</label>
                    <select value={form.filialId} onChange={e => updateEditForm('filialId', e.target.value)}>
                      <option value="">Selecione</option>
                      {filiais.map(f => <option key={f.id} value={f.id}>{f.razaoSocial}</option>)}
                    </select>
                  </div>
                  <div className="f-group">
                    <label>Fornecedor</label>
                    <select value={form.fornecedorId} onChange={e => updateEditForm('fornecedorId', e.target.value)}>
                      <option value="">Selecione</option>
                      {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="f-group"><label>Dia Vencimento</label><input type="number" min="1" max="31" value={form.diaVencimento} onChange={e => updateEditForm('diaVencimento', e.target.value)} /></div>
                </div>
              </>
            )}

            {tab === 'centros-custo' && (
              <div className="form-row">
                <div className="f-group"><label>Número</label><input value={form.numero} onChange={e => updateEditForm('numero', e.target.value)} /></div>
                <div className="f-group"><label>Descrição</label><input value={form.descricao} onChange={e => updateEditForm('descricao', e.target.value)} /></div>
              </div>
            )}

            {tab === 'contas-contabeis' && (
              <div className="form-row">
                <div className="f-group"><label>Número</label><input value={form.numero} onChange={e => updateEditForm('numero', e.target.value)} /></div>
                <div className="f-group"><label>Descrição</label><input value={form.descricao} onChange={e => updateEditForm('descricao', e.target.value)} /></div>
              </div>
            )}

            {tab === 'naturezas' && (
              <div className="f-group"><label>Descrição</label><input value={form.descricao} onChange={e => updateEditForm('descricao', e.target.value)} /></div>
            )}

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setEditModal(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary"><FiSave size={14} /> Salvar Alterações</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="page-title"><FiDatabase size={20} /> Cadastros</div>

      <div className="card">
        <div className="tab-bar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {renderForm()}
        {renderList()}
      </div>

      {/* Modal de Edição */}
      {renderEditModal()}
    </div>
  );
}
