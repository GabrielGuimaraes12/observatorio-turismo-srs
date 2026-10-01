import { useState } from 'react';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { mockReports } from '../../services/mockReports';
import './Reports.css';

export function Reports() {
    const [selectedPeriod, setSelectedPeriod] = useState('Todos');
    const [selectedSector, setSelectedSector] = useState('Todos');

    const filteredReports = mockReports.filter((report) => {
        const matchesPeriod =
        selectedPeriod === 'Todos' || report.period.includes(selectedPeriod);

        const matchesSector =
        selectedSector === 'Todos' || report.sector.includes(selectedSector);

        return matchesPeriod && matchesSector;
    });
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
                <a 
                href={report.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                >
                    Ver relatório
                    </a>
                <a
                href={report.pdfUrl}
                download
                >
                    Baixar PDF
                    </a>
              </div>
            </article>
          ))}
          {filteredReports.length === 0 && (
            <p>Nenhum relatório encontrado para os filtros selecionados</p>)}
        </section>
      </main>

      <Footer />
    </div>
  );
}