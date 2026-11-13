import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createReport, getReports, getReportPdfUrl } from '../../services/reportService';
import type { Report } from '../../types/report';
import '../AdminReports/AdminReports.css';
import './BusinessDashboard.css';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function BusinessDashboard() {
  const navigate = useNavigate();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [openingPdfId, setOpeningPdfId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    let active = true;

    getReports('own')
      .then((data) => {
        if (active) setReports(data);
      })
      .catch(() => {
        if (active) setLoadError('Não foi possível carregar seus envios.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadAttempt]);

  function handleFileChange(file: File | null) {
    setSendError('');
    setSuccess('');

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
      setSelectedFile(null);
      setSendError('Selecione um arquivo PDF válido.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setSendError('O arquivo PDF não pode ultrapassar 10 MB.');
      return;
    }

    setSelectedFile(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (sending) return;

    const form = event.currentTarget;
    const data = new FormData(form);

    const title = String(data.get('title') ?? '').trim();
    const description = String(data.get('description') ?? '').trim();

    setSuccess('');
    setSendError('');

    if (!title) {
      setSendError('Informe o título do relatório.');
      return;
    }

    if (!selectedFile) {
      setSendError('Selecione um arquivo PDF para enviar.');
      return;
    }

    setSending(true);

    try {
      const report = await createReport(
        {
          title,
          description,
          published: false,
        },
        selectedFile,
      );

      setReports((current) => [report, ...current]);
      form.reset();
      setSelectedFile(null);
      setSuccess('Relatório enviado para revisão.');
    } catch (error) {
      setSendError(
        error instanceof Error
          ? error.message
          : 'Não foi possível enviar o relatório.',
      );
    } finally {
      setSending(false);
    }
  }

  async function handleOpenPdf(reportId: string) {
      if (openingPdfId) return;

      // Abre uma aba imediatamente para evitar bloqueio do navegador.
      const newTab = window.open('', '_blank');

      if (!newTab) {
          setSendError('Permita a abertura de novas abas para visualizar o PDF.');
          return;
      }

      newTab.document.title = 'Carregando relatório...';
      setOpeningPdfId(reportId);

      try {
          const pdfUrl = await getReportPdfUrl(reportId);
          newTab.location.href = pdfUrl;

          // Libera a URL temporária depois que a aba tiver tempo de carregá-la.
          window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
      } catch (error) {
          newTab.close();

          setSendError(
              error instanceof Error
                  ? error.message
                  : 'Não foi possível abrir o PDF.'
          );
      } finally {
          setOpeningPdfId(null);
      }
  }

  function logout() {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('authUser');
    navigate('/login', { replace: true });
  }

  return (
    <main className="admin-reports-page business-dashboard">
      <header className="admin-reports-header">
        <div>
          <h1>Área da empresa</h1>
          <p>Envie relatórios e acompanhe a publicação pelo Observatório.</p>
        </div>

        <div className="admin-reports-header-actions">
          <Link to="/">Página inicial</Link>
          <button type="button" onClick={logout}>Sair</button>
        </div>
      </header>

      <section className="admin-reports-list" aria-labelledby="business-send-heading">
        <h2 id="business-send-heading">Novo envio</h2>

        <form className="business-report-form" onSubmit={handleSubmit}>
          <label htmlFor="business-title">Título</label>
          <input
            id="business-title"
            name="title"
            required
            maxLength={255}
            disabled={sending}
          />

          <label htmlFor="business-description">Descrição (opcional)</label>
          <textarea
            id="business-description"
            name="description"
            rows={3}
            disabled={sending}
          />

          <label htmlFor="business-pdf">Arquivo PDF</label>
          <input
            id="business-pdf"
            name="file"
            type="file"
            accept=".pdf,application/pdf"
            required
            disabled={sending}
            onChange={(event) =>
              handleFileChange(event.target.files?.[0] ?? null)
            }
          />

          <p>
            Formato permitido: PDF. Tamanho máximo: 10 MB.
          </p>

          {selectedFile && (
            <div className="selected-pdf">
              <p><strong>Arquivo selecionado:</strong> {selectedFile.name}</p>
              <p>
                Tamanho: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
              <button
                type="button"
                disabled={sending}
                onClick={() => {
                  setSelectedFile(null);
                  const input = document.getElementById(
                    'business-pdf',
                  ) as HTMLInputElement | null;
                  if (input) input.value = '';
                }}
              >
                Remover arquivo
              </button>
            </div>
          )}

          <button
            className="login-button"
            type="submit"
            disabled={sending || loading || !selectedFile}
          >
            {sending ? 'Enviando…' : 'Enviar relatório'}
          </button>

          {sendError && <p role="alert">{sendError}</p>}
          {success && <p role="status">{success}</p>}
        </form>
      </section>

      <section className="admin-reports-list" aria-labelledby="business-reports-heading">
        <h2 id="business-reports-heading">Meus relatórios</h2>

        {loading && <p role="status">Carregando seus envios…</p>}

        {loadError && (
          <div>
            <p role="alert">{loadError}</p>
            <button
              type="button"
              disabled={sending}
              onClick={() => {
                setLoading(true);
                setLoadError('');
                setLoadAttempt((attempt) => attempt + 1);
              }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !loadError && reports.length === 0 && (
          <p>Nenhum relatório enviado.</p>
        )}

        {reports.length > 0 && (
          <div className="admin-reports-table-wrapper">
            <table className="admin-reports-table">
              <thead>
                <tr>
                  <th scope="col">Relatório</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>

              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <details>
                        <summary>{report.name}</summary>
                        {report.description && <p>{report.description}</p>}
                        <button
                          type="button"
                          onClick={() => handleOpenPdf(report.id)}
                          disabled={!!openingPdfId}
                        >
                            {openingPdfId === report.id ? 'Abrindo...' : 'Abrir relatório'}
                        </button>
                      </details>
                    </td>

                    <td>
                      <span
                        className={`report-status ${
                          report.published ? 'published' : 'unpublished'
                        }`}
                      >
                        {report.published ? 'Publicado' : 'Aguardando publicação'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
