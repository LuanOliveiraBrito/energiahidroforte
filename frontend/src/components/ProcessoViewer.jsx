import { useState, useEffect, useRef } from 'react';
import { FiX, FiLoader, FiDownload } from 'react-icons/fi';
import api from '../services/api';
import '../styles/processoViewer.css';

// Detecta se é mobile (iOS/Android não suportam iframe com PDF)
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export default function ProcessoViewer({ fatura, onClose }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasRequested = useRef(false);

  useEffect(() => {
    if (hasRequested.current || !fatura?.id) return;
    hasRequested.current = true;
    fetchProcessoCompleto();
  }, [fatura]);

  async function fetchProcessoCompleto() {
    try {
      setLoading(true);
      setError(null);

      // Backend retorna JSON com { pdf: 'base64...' } para evitar que IDM intercepte
      const response = await api.get(`/faturas/${fatura.id}/processo-completo`);

      const { pdf } = response.data;
      if (!pdf) throw new Error('Resposta sem dados PDF');

      // Decodificar base64 para binary
      const binaryString = atob(pdf);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      console.error('Erro ao gerar processo:', err);
      const msg = err.response?.data?.message || err.message;
      setError(`Erro ao gerar o PDF do processo: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  function handleRetry() {
    hasRequested.current = false;
    setError(null);
    setPdfUrl(null);
    fetchProcessoCompleto();
  }

  function handleClose() {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    onClose();
  }

  function handleDownload() {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `processo-fatura-${fatura.id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="processo-viewer-overlay" onClick={handleClose}>
      <div className="processo-viewer-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="processo-viewer-header">
          <h3 className="processo-viewer-title">Processo Completo — Fatura #{fatura.id}</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {pdfUrl && (
              <button className="btn btn-secondary btn-sm" onClick={handleDownload} title="Baixar PDF">
                <FiDownload size={16} />
                <span style={{ marginLeft: '4px' }}>Baixar</span>
              </button>
            )}
            <button className="processo-viewer-close" onClick={handleClose}>
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="processo-viewer-body">
          {loading && (
            <div className="processo-viewer-loading">
              <FiLoader size={32} className="spin" />
              <p>Gerando PDF do processo...</p>
            </div>
          )}

          {error && !loading && (
            <div className="processo-viewer-error">
              <p>{error}</p>
              <button className="btn btn-primary btn-sm" onClick={handleRetry}>
                Tentar novamente
              </button>
            </div>
          )}

          {pdfUrl && !loading && (
            isMobile ? (
              <div className="processo-viewer-mobile">
                <FiDownload size={48} style={{ color: '#4f8ef7', marginBottom: '16px' }} />
                <p style={{ marginBottom: '16px', textAlign: 'center', color: '#555' }}>
                  Visualização de PDF não é suportada neste dispositivo.
                </p>
                <button className="btn btn-primary" onClick={handleDownload}>
                  <FiDownload size={16} style={{ marginRight: '8px' }} />
                  Baixar PDF do Processo
                </button>
              </div>
            ) : (
              <iframe
                src={pdfUrl}
                className="processo-viewer-iframe"
                title="Processo Completo"
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
