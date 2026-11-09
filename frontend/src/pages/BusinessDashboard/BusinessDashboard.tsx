import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createReport, getReports } from '../../services/reportService';
import type { Report } from '../../types/report';
import '../AdminReports/AdminReports.css';
import './BusinessDashboard.css';

export function BusinessDashboard() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    getReports('own')
      .then((data) => { if (active) setReports(data); })
      .catch(() => { if (active) setLoadError('Não foi possível carregar seus envios.'); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [loadAttempt]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get('title') ?? '').trim();
    const description = String(data.get('description') ?? '').trim();
    const fileUrl = String(data.get('fileUrl') ?? '').trim();
    const url = URL.canParse(fileUrl) ? new URL(fileUrl) : null;

    setSuccess('');
    if (!title || !url || !['http:', 'https:'].includes(url.protocol)) {
      setSendError('Informe um título e um link HTTP ou HTTPS válido.');
      return;
    }

    setSendError('');
    setSending(true);
    try {
      const report = await createReport({ title, description, fileUrl, published: false });
      setReports((current) => [report, ...current]);
      form.reset();
      setSuccess('Relatório enviado para revisão.');
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Não foi possível enviar o relatório.');
    } finally {
      setSending(false);
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
          <input id="business-title" name="title" required maxLength={255} disabled={sending} />
          <label htmlFor="business-description">Descrição (opcional)</label>
          <textarea id="business-description" name="description" rows={3} disabled={sending} />
          <label htmlFor="business-file-url">Link do relatório</label>
          <input id="business-file-url" name="fileUrl" type="url" required disabled={sending} />
          <button className="login-button" type="submit" disabled={sending || loading}>
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
            <button type="button" disabled={sending} onClick={() => {
              setLoading(true);
              setLoadError('');
              setLoadAttempt((attempt) => attempt + 1);
            }}>Tentar novamente</button>
          </div>
        )}
        {!loading && !loadError && reports.length === 0 && <p>Nenhum relatório enviado.</p>}
        {reports.length > 0 && (
          <div className="admin-reports-table-wrapper">
            <table className="admin-reports-table">
              <thead>
                <tr><th scope="col">Relatório</th><th scope="col">Status</th></tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <details>
                        <summary>{report.name}</summary>
                        {report.description && <p>{report.description}</p>}
                        {/^https?:\/\//i.test(report.pdfUrl) && (
                          <a href={report.pdfUrl} target="_blank" rel="noopener noreferrer">
                            Abrir relatório
                          </a>
                        )}
                      </details>
                    </td>
                    <td>
                      <span className={`report-status ${report.published ? 'published' : 'unpublished'}`}>
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
