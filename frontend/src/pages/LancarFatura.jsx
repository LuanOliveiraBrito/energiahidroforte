import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { FiFileText, FiUpload, FiSend, FiFile, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import SearchableSelect from '../components/SearchableSelect';

export default function LancarFatura() {
  const [unidades, setUnidades] = useState([]);
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [naturezas, setNaturezas] = useState([]);
  const [contasContabeis, setContasContabeis] = useState([]);

  const [form, setForm] = useState({
    ucId: '',
    fornecedor: '',
    fornecedorId: '',
    filial: '',
    filialId: '',
    notaFiscal: '',
    valor: '',
    leituraKwh: '',
    vencimento: '',
    referencia: '',
    centroCustoId: '',
    naturezaId: '',
    contaContabilId: '',
    pedidoCompras: '',
    formaPagamento: '',
    aplicacao: '',
    dataEmissao: '',
  });

  const [anexoFatura, setAnexoFatura] = useState(null);
  const [anexoPedidoCompras, setAnexoPedidoCompras] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [boletoInfo, setBoletoInfo] = useState(null);
  const [extraindoBoleto, setExtraindoBoleto] = useState(false);
  const [codigoBarrasManual, setCodigoBarrasManual] = useState('');

  const [dragOverFatura, setDragOverFatura] = useState(false);
  const [dragOverPedido, setDragOverPedido] = useState(false);

  const fileInputFatura = useRef(null);
  const fileInputPedido = useRef(null);

  useEffect(() => {
    loadSelects();
  }, []);

  // Drag & drop handlers
  function handleDragOver(e, setDragState) {
    e.preventDefault();
    e.stopPropagation();
    setDragState(true);
  }

  function handleDragLeave(e, setDragState) {
    e.preventDefault();
    e.stopPropagation();
    setDragState(false);
  }

  function handleDropFatura(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFatura(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Apenas arquivos PDF são permitidos');
      return;
    }
    setAnexoFatura(file);
    setBoletoInfo(null);
    setCodigoBarrasManual('');
    const url = URL.createObjectURL(file);
    setPdfPreviewUrl(url);
    extrairDadosBoleto(file);
  }

  function handleDropPedido(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPedido(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Apenas arquivos PDF são permitidos');
      return;
    }
    setAnexoPedidoCompras(file);
    toast.info(`Pedido de Compras anexado: ${file.name}`);
  }

  async function loadSelects() {
    try {
      const [ucRes, natRes, ctRes] = await Promise.all([
        api.get('/cadastros/unidades'),
        api.get('/cadastros/naturezas'),
        api.get('/cadastros/contas-contabeis'),
      ]);
      setUnidades(ucRes.data);
      setNaturezas(natRes.data);
      setContasContabeis(ctRes.data);
    } catch (err) {
      toast.error('Erro ao carregar dados auxiliares');
    }
  }

  // Carrega centros de custo quando filialId mudar
  async function loadCentrosCusto(filialId) {
    if (!filialId) {
      setCentrosCusto([]);
      return;
    }
    try {
      const res = await api.get(`/cadastros/centros-custo?filialId=${filialId}`);
      setCentrosCusto(res.data);
    } catch (err) {
      setCentrosCusto([]);
    }
  }

  function handleUCChange(ucId) {
    const uc = unidades.find((u) => u.id === parseInt(ucId));
    if (uc) {
      setForm({
        ...form,
        ucId,
        fornecedor: uc.fornecedor?.nome || '',
        fornecedorId: uc.fornecedorId,
        filial: uc.filial?.razaoSocial || '',
        filialId: uc.filialId,
        formaPagamento: uc.fornecedor?.tipoPagamento || '',
        centroCustoId: '', // Reset ao trocar UC
      });
      loadCentrosCusto(uc.filialId);
    } else {
      setForm({ ...form, ucId, fornecedor: '', fornecedorId: '', filial: '', filialId: '', formaPagamento: '', centroCustoId: '' });
      setCentrosCusto([]);
    }
  }

  function handleAnexoFatura(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Apenas arquivos PDF são permitidos');
      return;
    }
    setAnexoFatura(file);
    setBoletoInfo(null);
    setCodigoBarrasManual('');
    // Preview
    const url = URL.createObjectURL(file);
    setPdfPreviewUrl(url);

    // Tentar extrair dados automaticamente do PDF (boleto ou fatura)
    extrairDadosBoleto(file);
  }

  async function extrairDadosBoleto(file) {
    setExtraindoBoleto(true);
    try {
      const formData = new FormData();
      formData.append('arquivo', file);

      const res = await api.post('/boleto/extrair', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.encontrado && res.data.valido) {
        const { valor, vencimento, linhaDigitavel, banco, consumoKwh, concessionaria, dataEmissao, notaFiscal, referencia } = res.data;

        // Preencher campos automaticamente
        const updates = {};
        if (valor && valor > 0) updates.valor = valor.toFixed(2);
        if (vencimento) updates.vencimento = vencimento;
        if (consumoKwh && consumoKwh > 0) updates.leituraKwh = String(consumoKwh);
        if (dataEmissao) updates.dataEmissao = dataEmissao;
        if (notaFiscal) updates.notaFiscal = notaFiscal;
        if (referencia) updates.referencia = referencia;

        if (Object.keys(updates).length > 0) {
          setForm(prev => ({ ...prev, ...updates }));
        }

        setBoletoInfo({
          linhaDigitavel,
          banco,
          valor,
          vencimento,
          consumoKwh,
          concessionaria,
        });

        const concLabel = concessionaria ? ` (${concessionaria})` : '';
        const kwhLabel = consumoKwh ? ` | Consumo: ${consumoKwh.toLocaleString('pt-BR')} kWh` : '';
        const ocrLabel = res.data.ocr ? ' 📷' : '';
        toast.success(
          `✅ Fatura detectada${concLabel}${ocrLabel}! Valor: R$ ${valor.toFixed(2)}${vencimento ? ` | Venc: ${vencimento.split('-').reverse().join('/')}` : ''}${kwhLabel}`,
          { autoClose: 5000 }
        );
      } else {
        // Mostrar mensagem diferente se OCR foi utilizado
        if (res.data.ocr) {
          setBoletoInfo({
            concessionaria: res.data.concessionaria || null,
            ocrParcial: true,
          });
          toast.warn(
            `📷 PDF escaneado detectado${res.data.concessionaria ? ` (${res.data.concessionaria})` : ''}. Não foi possível extrair os dados automaticamente. Preencha os campos manualmente.`,
            { autoClose: 6000 }
          );
        } else {
          toast.info('PDF anexado. Não foi possível extrair dados da fatura automaticamente.', { autoClose: 4000 });
        }
      }
    } catch {
      // Silencioso — não impede o fluxo normal
      console.warn('Não foi possível extrair dados da fatura');
    } finally {
      setExtraindoBoleto(false);
    }
  }

  function handleAnexoPedido(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Apenas arquivos PDF são permitidos');
      return;
    }
    setAnexoPedidoCompras(file);
    toast.info(`Pedido de Compras anexado: ${file.name}`);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const { ucId, fornecedorId, filialId, notaFiscal, valor, leituraKwh, vencimento, referencia, centroCustoId, naturezaId, contaContabilId, aplicacao, pedidoCompras, dataEmissao } = form;

    if (!ucId || !valor || !vencimento || !referencia || !centroCustoId || !naturezaId || !contaContabilId || !notaFiscal || !dataEmissao || !leituraKwh || !aplicacao || !pedidoCompras) {
      toast.warning('Preencha todos os campos obrigatórios');
      return;
    }

    if (!anexoFatura) {
      toast.warning('Anexe a fatura em PDF');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('ucId', ucId);
      formData.append('fornecedorId', fornecedorId);
      formData.append('filialId', filialId);
      formData.append('notaFiscal', form.notaFiscal);
      formData.append('valor', valor);
      formData.append('leituraKwh', form.leituraKwh);
      formData.append('vencimento', vencimento);
      formData.append('referencia', referencia);
      formData.append('centroCustoId', centroCustoId);
      formData.append('naturezaId', naturezaId);
      formData.append('contaContabilId', contaContabilId);
      formData.append('pedidoCompras', form.pedidoCompras);
      formData.append('formaPagamento', form.formaPagamento);
      formData.append('aplicacao', form.aplicacao);
      formData.append('dataEmissao', form.dataEmissao);

      // Dados da fatura (código de barras)
      if (boletoInfo && boletoInfo.linhaDigitavel) {
        formData.append('codigoBarras', boletoInfo.linhaDigitavel);
      } else if (codigoBarrasManual) {
        formData.append('codigoBarras', codigoBarrasManual);
      }
      if (boletoInfo && boletoInfo.vencimento) {
        formData.append('vencimentoBoleto', boletoInfo.vencimento);
      }

      if (anexoFatura) {
        formData.append('anexoFatura', anexoFatura);
      }
      if (anexoPedidoCompras) {
        formData.append('anexoPedidoCompras', anexoPedidoCompras);
      }

      await api.post('/faturas', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Fatura lançada e enviada para aprovação!');

      // Reset
      setForm({
        ucId: '', fornecedor: '', fornecedorId: '', filial: '', filialId: '',
        notaFiscal: '', valor: '', leituraKwh: '', vencimento: '', referencia: '',
        centroCustoId: '', naturezaId: '', contaContabilId: '', pedidoCompras: '',
        formaPagamento: '', aplicacao: '', dataEmissao: '',
      });
      setAnexoFatura(null);
      setAnexoPedidoCompras(null);
      setPdfPreviewUrl(null);
      setBoletoInfo(null);
      setCodigoBarrasManual('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao lançar fatura');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-enter">
      <div className="split-view">
        {/* Painel do Visualizador PDF */}
        <div
          className="viewer-pane"
          onDragOver={(e) => handleDragOver(e, setDragOverFatura)}
          onDragLeave={(e) => handleDragLeave(e, setDragOverFatura)}
          onDrop={handleDropFatura}
        >
          {/* Overlay de drag sobre o painel inteiro */}
          {dragOverFatura && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              background: 'rgba(37, 99, 235, 0.12)',
              border: '3px dashed var(--primary)',
              borderRadius: 12,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <FiUpload size={48} style={{ color: 'var(--primary)', marginBottom: 8 }} />
              <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '1.1rem' }}>Solte o PDF aqui</p>
            </div>
          )}

          {pdfPreviewUrl ? (
            <iframe src={pdfPreviewUrl} title="Visualizar PDF" />
          ) : (
            <div className="drop-zone" onClick={() => fileInputFatura.current?.click()}>
              <div className="drop-icon"><FiFileText size={48} /></div>
              <p>Clique ou arraste a fatura aqui (PDF)</p>
              <input
                ref={fileInputFatura}
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={handleAnexoFatura}
              />
            </div>
          )}

          {pdfPreviewUrl && (
            <div style={{ position: 'absolute', top: 10, right: 10 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputFatura.current?.click()}
              >
                <FiUpload size={14} /> Trocar PDF
              </button>
              <input
                ref={fileInputFatura}
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={handleAnexoFatura}
              />
            </div>
          )}
        </div>

        {/* Painel do Formulário */}
        <div className="form-pane">
          <h3><FiFileText size={18} /> Dados da Fatura</h3>

          <form onSubmit={handleSubmit}>
            <div className="f-group">
              <label>Selecionar UC *</label>
              <SearchableSelect
                options={unidades.map((u) => ({ value: u.id, label: `${u.uc} - ${u.numInstalacao}` }))}
                value={form.ucId}
                onChange={(val) => handleUCChange(val)}
                placeholder="Pesquisar UC..."
                noOptionsText="Nenhuma UC encontrada"
              />
            </div>

            <div className="f-group">
              <label>Fornecedor</label>
              <input value={form.fornecedor} readOnly placeholder="Preenchido automaticamente" />
            </div>

            <div className="f-group">
              <label>Filial</label>
              <input value={form.filial} readOnly placeholder="Preenchido automaticamente" />
            </div>

            <div className="form-row">
              <div className="f-group">
                <label>Nota Fiscal *</label>
                <input value={form.notaFiscal} onChange={(e) => setForm({ ...form, notaFiscal: e.target.value })} placeholder="Nº da Nota Fiscal" />
              </div>
              <div className="f-group">
                <label>Data de Emissão *</label>
                <input type="date" value={form.dataEmissao} onChange={(e) => setForm({ ...form, dataEmissao: e.target.value })} />
              </div>
            </div>

            <div className="form-row">
              <div className="f-group">
                <label>Valor (R$) *</label>
                <input type="number" step="0.01" min="0" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="0,00" />
              </div>
              <div className="f-group">
                <label>Leitura kWh *</label>
                <input type="number" min="0" step="0.01" value={form.leituraKwh} onChange={(e) => setForm({ ...form, leituraKwh: e.target.value })} placeholder="kWh" />
              </div>
            </div>

            <div className="form-row">
              <div className="f-group">
                <label>Vencimento *</label>
                <input type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} />
              </div>
              <div className="f-group">
                <label>Referência *</label>
                <input type="month" value={form.referencia} onChange={(e) => setForm({ ...form, referencia: e.target.value })} />
              </div>
            </div>

            <div className="f-group">
              <label>Centro de Custo *</label>
              <SearchableSelect
                options={centrosCusto.map((cc) => ({ value: cc.id, label: `${cc.numero} - ${cc.descricao}` }))}
                value={form.centroCustoId}
                onChange={(val) => setForm({ ...form, centroCustoId: val })}
                placeholder={form.filialId ? 'Pesquisar centro de custo...' : 'Selecione uma UC primeiro'}
                disabled={!form.filialId}
                noOptionsText="Nenhum centro de custo encontrado"
              />
            </div>

            <div className="f-group">
              <label>Natureza *</label>
              <select value={form.naturezaId} onChange={(e) => setForm({ ...form, naturezaId: e.target.value })}>
                <option value="">Selecione...</option>
                {naturezas.map((n) => (
                  <option key={n.id} value={n.id}>{n.descricao}</option>
                ))}
              </select>
            </div>

            <div className="f-group">
              <label>Conta Contábil *</label>
              <SearchableSelect
                options={contasContabeis.map((c) => ({ value: c.id, label: `${c.numero} - ${c.descricao}` }))}
                value={form.contaContabilId}
                onChange={(val) => setForm({ ...form, contaContabilId: val })}
                placeholder="Pesquisar conta contábil..."
                noOptionsText="Nenhuma conta contábil encontrada"
              />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />

            <div className="form-row">
              <div className="f-group">
                <label>Forma de Pagamento</label>
                <input
                  value={form.formaPagamento === 'TED' ? 'Transferência (TED)' : form.formaPagamento === 'PIX' ? 'PIX' : form.formaPagamento === 'BOLETO' ? 'Boleto' : ''}
                  readOnly
                  placeholder="Preenchido pelo fornecedor"
                  style={{ backgroundColor: 'var(--bg-main)', cursor: 'default' }}
                />
              </div>
              <div className="f-group">
                <label>Aplicação *</label>
                <select value={form.aplicacao} onChange={(e) => setForm({ ...form, aplicacao: e.target.value })}>
                  <option value="">Selecione...</option>
                  <option value="CAPEX">CAPEX</option>
                  <option value="OPEX">OPEX</option>
                </select>
              </div>
            </div>

            {/* Indicador de extração automática */}
            {extraindoBoleto && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                background: 'var(--bg-main)', borderRadius: 6, margin: '8px 0',
                border: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--text-secondary)',
              }}>
                <span className="spinner-sm" style={{ width: 16, height: 16, border: '2px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                Extraindo dados da fatura...
              </div>
            )}

            {boletoInfo && (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px',
                background: boletoInfo.ocrParcial ? '#fff3e0' : '#e8f5e9',
                borderRadius: 6, margin: '8px 0',
                border: boletoInfo.ocrParcial ? '1px solid #ffcc80' : '1px solid #a5d6a7',
                fontSize: '0.82rem',
                color: boletoInfo.ocrParcial ? '#e65100' : '#2e7d32',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                  {boletoInfo.ocrParcial ? (
                    <>
                      <FiAlertCircle size={15} /> PDF escaneado{boletoInfo.concessionaria ? ` — ${boletoInfo.concessionaria}` : ''} (preencha manualmente)
                    </>
                  ) : (
                    <>
                      <FiCheckCircle size={15} /> Fatura detectada automaticamente{boletoInfo.concessionaria ? ` (${boletoInfo.concessionaria})` : ''}
                    </>
                  )}
                </div>
                {boletoInfo.linhaDigitavel && (
                  <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', wordBreak: 'break-all', color: '#1b5e20', marginTop: 2 }}>
                    Código de barras: {boletoInfo.linhaDigitavel.replace(/(\d{5})(\d{5})(\d{5})(\d{6})(\d{5})(\d{6})(\d)(\d{14})/, '$1.$2 $3.$4 $5.$6 $7 $8')}
                  </div>
                )}
                {!boletoInfo.linhaDigitavel && !boletoInfo.ocrParcial && boletoInfo.valor && (
                  <div style={{ fontSize: '0.78rem', color: '#1b5e20', marginTop: 2 }}>
                    Valor: R$ {boletoInfo.valor.toFixed(2)}{boletoInfo.vencimento ? ` | Vencimento: ${boletoInfo.vencimento.split('-').reverse().join('/')}` : ''}
                  </div>
                )}
              </div>
            )}

            {/* Campo de código de barras: aparece quando PDF anexado mas código não detectado automaticamente */}
            {anexoFatura && !extraindoBoleto && (!boletoInfo || !boletoInfo.linhaDigitavel) && (
              <div className="f-group" style={{ marginTop: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  Código de Barras
                  {!boletoInfo && <span style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 400 }}>(não detectado automaticamente)</span>}
                </label>
                <input
                  value={codigoBarrasManual}
                  onChange={(e) => setCodigoBarrasManual(e.target.value.replace(/\D/g, ''))}
                  placeholder="Digite os números do código de barras"
                  style={{ fontFamily: 'monospace', letterSpacing: '1px' }}
                  maxLength={48}
                />
                {codigoBarrasManual && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    {codigoBarrasManual.length} dígitos
                  </span>
                )}
              </div>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />

            <div className="f-group">
              <label>Pedido de Compras (Nº) *</label>
              <input value={form.pedidoCompras} onChange={(e) => setForm({ ...form, pedidoCompras: e.target.value })} placeholder="Número do Pedido de Compras" />
            </div>

            <div className="f-group">
              <label>Anexo do Pedido de Compras (PDF) *</label>
              <div
                className="file-upload"
                onClick={() => fileInputPedido.current?.click()}
                onDragOver={(e) => handleDragOver(e, setDragOverPedido)}
                onDragLeave={(e) => handleDragLeave(e, setDragOverPedido)}
                onDrop={handleDropPedido}
                style={dragOverPedido ? {
                  borderColor: 'var(--primary)',
                  background: 'rgba(37, 99, 235, 0.08)',
                  transform: 'scale(1.02)',
                  transition: 'all 0.2s ease',
                } : { transition: 'all 0.2s ease' }}
              >
                {dragOverPedido ? (
                  <>
                    <FiUpload size={20} style={{ color: 'var(--primary)' }} />
                    <p style={{ fontSize: '0.8rem', margin: '4px 0 0', color: 'var(--primary)', fontWeight: 600 }}>
                      Solte o PDF aqui
                    </p>
                  </>
                ) : (
                  <>
                    <FiFile size={20} />
                    <p style={{ fontSize: '0.8rem', margin: '4px 0 0' }}>
                      {anexoPedidoCompras ? anexoPedidoCompras.name : 'Clique ou arraste o PDF aqui'}
                    </p>
                  </>
                )}
                <input
                  ref={fileInputPedido}
                  type="file"
                  accept="application/pdf"
                  onChange={handleAnexoPedido}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: 16 }}>
              <FiSend size={14} />
              {loading ? 'ENVIANDO...' : 'ENVIAR PARA APROVAÇÃO'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
