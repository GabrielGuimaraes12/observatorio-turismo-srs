import { useState, useEffect } from 'react';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { getReports, getReportPdfUrl } from '../../services/reportService';
import { applyReportMetadata } from '../../services/reportMetadataStorage';
import './Reports.css';

export function Reports() {
  const [reports, setReports] = useState<Awaited<ReturnType<typeof getReports>>>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('Todos');
  const [selectedSector, setSelectedSector] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getReports()
      .then((data) => setReports(applyReportMetadata(data)))
      .catch(() => setError('Não foi possível carregar os relatórios.'))
      .finally(() => setLoading(false));
}, []);

  const filteredReports = reports.filter((report) => {
    const isPublished = report.published;
    const matchesPeriod =
      selectedPeriod === 'Todos' || report.period.includes(selectedPeriod);

    const matchesSector =
      selectedSector === 'Todos' || report.sector.includes(selectedSector);

    return isPublished && matchesPeriod && matchesSector;
});

  async function handleViewReport(reportId: string) {
    const newTab = window.open('', '_blank');

    if (!newTab) {
      setError('Permita a abertura de novas abas para visualizar o relatório.');
      return;
    }

    newTab.document.title = 'Carregando relatório...';

    try {
      const pdfUrl = await getReportPdfUrl(reportId);
      newTab.opener = null;
      newTab.location.href = pdfUrl;

      window.setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 60000);
    } catch (error) {
      newTab.close();

      setError(
        error instanceof Error
          ? error.message
          : 'Não foi possível abrir o relatório.'
      );
    }
  }

  async function handleDownloadReport(reportId: string, reportName: string) {
    try {
      const pdfUrl = await getReportPdfUrl(reportId);

      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${reportName.replace(/[\\/:*?"<>|]/g, '_')}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 60000);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Não foi possível baixar o PDF.'
      );
    }
  }

  return (
    <div className="reports-page">
      <Header />

      <main className="reports-content">
        <section className="reports-intro">
          <h1>Relatórios do Observatório</h1>
          <p>
            Consulte os relatórios e informações sobre o turismo de
            Santa Rita do Sapucaí.
          </p>
        </section>

        <section className="reports-filters">
          <select
          value ={selectedPeriod}
          onChange={(event) => setSelectedPeriod(event.target.value)}
          >
            <option value="Todos">Todos os períodos</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>

          <select
          value={selectedSector}
          onChange={(event) => setSelectedSector(event.target.value)}
          >
            <option value="Todos">Todos os setores</option>
            <option value="Turismo">Turismo</option>
            <option value="Hospedagem">Hospedagem</option>
          </select>
        </section>

        <section className="reports-grid">
          {loading && <p>Carregando relatórios...</p>}
          {error && <p role="alert">{error}</p>}
          {filteredReports.map((report) => (
            <article className="report-card" key={report.id}>
              <div className="report-icon">PDF</div>

              <div className="report-info">
                <h2>{report.name}</h2>

                <span className="report-period">
                  {report.period}
                </span>

                <span className="report-sector">
                  {report.sector}
                </span>

                <p>{report.description}</p>
              </div>
              
              <div className="report-actions">
                <button
                  type="button"
                  onClick={() => handleViewReport(report.id)}
                >
                  Ver relatório
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadReport(report.id, report.name)}
                >
                  Baixar PDF
                </button>
              </div>
            </article>
          ))}
          {!loading && !error && filteredReports.length === 0 && (
            <p>Nenhum relatório encontrado para os filtros selecionados</p>)}
        </section>
      </main>

      <Footer />
    </div>
  );
}