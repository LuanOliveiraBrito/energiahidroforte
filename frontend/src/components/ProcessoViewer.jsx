import { useState, useEffect, useRef } from 'react';
import { FiX, FiLoader } from 'react-icons/fi';
import api from '../services/api';
import '../styles/processoViewer.css';

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

  return (
    <div className="processo-viewer-overlay" onClick={handleClose}>
      <div className="processo-viewer-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="processo-viewer-header">
          <h3 className="processo-viewer-title">Processo Completo — Fatura #{fatura.id}</h3>
          <button className="processo-viewer-close" onClick={handleClose}>
            <FiX size={20} />
          </button>
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
            <iframe
              src={pdfUrl}
              className="processo-viewer-iframe"
              title="Processo Completo"
            />
          )}
        </div>
      </div>
    </div>
  );
}
