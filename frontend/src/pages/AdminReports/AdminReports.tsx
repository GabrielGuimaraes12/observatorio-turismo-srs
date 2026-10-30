import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Report } from '../../types/report';
import { ReportForm } from '../../components/admin/ReportForm';
import { getReports, createReport, updateReport, deleteReport } from '../../services/reportService';
import { applyReportMetadata, saveReportMetadata } from '../../services/reportMetadataStorage';
import { AdminSummaryCards } from '../../components/admin/AdminSummaryCards';
import './AdminReports.css';

export function AdminReports() {
    const [reports, setReports] = useState<Report[]>([]);
    const [selectedReport, setSelectedReport] = useState<Report | undefined>();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isLoadingReports, setIsLoadingReports] = useState(true);
    const [reportsError, setReportsError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        let isMounted = true;

        async function loadReports(){
            try {
                setIsLoadingReports(true);
                setReportsError('');

                const data = await getReports();

                if (isMounted){
                    setReports(applyReportMetadata(data));
                }
            } catch (error) {
                if(isMounted){
                    setReportsError(
                        error instanceof Error ? error.message : 'Não foi possível carregar os relatórios.'
                    );
                }
            } finally {
                if (isMounted){
                    setIsLoadingReports(false);
                }
            }
        }

        void loadReports();

        return () => {
            isMounted = false;
        };
    }, []);

    function handleLogout(){
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('authUser');
        navigate('/login', { replace: true });
    }

    function handleCreate(){
        setSelectedReport(undefined);
        setIsFormOpen(true);
    }

    function handleEdit(report: Report){
        setSelectedReport(report);
        setIsFormOpen(true);
    }

    async function handleSave(report: Report) {
        try {
            if (selectedReport) {
                await updateReport(report.id, {
                    title: report.name,
                    description: report.description,
                    fileUrl: report.pdfUrl,
                    published: report.published,
                });
                saveReportMetadata(report);

                setReports((currentReports) => currentReports.map((currentReport) => 
                    currentReport.id === report.id ? report : currentReport));
            } else {
                await createReport({
                    title: report.name,
                    description: report.description,
                    fileUrl: report.pdfUrl,
                    published: false,
                });
                
                const updatedReports = await getReports();
                const reportCreated = updatedReports.find((item) => item.name === report.name);
                
                if(reportCreated){
                    const reportWithMetadata = {
                        ...reportCreated,
                        period: report.period,
                        sector: report.sector,
                    };

                    saveReportMetadata(reportWithMetadata);
                }
                setReports(applyReportMetadata(updatedReports));
            }
            
            setIsFormOpen(false);
            setSelectedReport(undefined);
            } catch (error) {
                window.alert(
                    error instanceof Error ? error.message : 'Não foi possível salvar o relatório.');
            }
    }

    function handleCancel(){
        setIsFormOpen(false);
        setSelectedReport(undefined);
    }

    
    async function handleDelete(id: string) {
        const confirmed = window.confirm('Tem certeza de que deseja excluir este relatório?');

        if (!confirmed) {
            return;
        }

        try {
            await deleteReport(id);

            setReports((currentReports) => currentReports.filter((report) => report.id !== id));

            const metadata = JSON.parse(localStorage.getItem('reportMetadata') ?? '{}');

            delete metadata[id];

            localStorage.setItem('reportMetadata', JSON.stringify(metadata));
        } catch (error) {
            window.alert(
                error instanceof Error ? error.message : 'Não foi possível excluir o relatório.');
        }
    }


  return (
    <main className="admin-reports-page">
      <header className="admin-reports-header">
        <div>
          <h1>Gerenciar relatórios</h1>
          <p>Consulte e gerencie os relatórios do Observatório.</p>
        </div>

        <div className="admin-reports-header-actions">
            <button type="button" onClick={handleCreate}>
                + Novo relatório
            </button>

            <button type="button"
                className="logout-button" onClick={handleLogout}
            >
                Sair
            </button>
        </div>
      </header>

      {isFormOpen ? (
        <section className="admin-report-form-section">
            <ReportForm
                report={selectedReport}
                onSave={handleSave}
                onCancel={handleCancel}
            />
        </section>
      ) : (
        <section className="admin-reports-list">
            <AdminSummaryCards reports={reports}
                isLoading={isLoadingReports}
                hasError={!!reportsError} />
            <h2>Relatórios cadastrados ({reports.length})</h2>

            {isLoadingReports ? (
                <p>Carregando relatórios...</p>
            ) : reportsError ? (
                <div role="alert">
                    <p>{reportsError}</p>
                    <button type="button" onClick={() => window.location.reload()}
                    >
                        Tentar novamente
                    </button>
                </div>
            ) : reports.length === 0 ? (
            <p>Nenhum relatório cadastrado.</p>
            ) : (
            <div className="admin-reports-table-wrapper">
                <table className="admin-reports-table">
                <thead>
                    <tr>
                    <th>Relatório</th>
                    <th>Período</th>
                    <th>Setor</th>
                    <th>Ações</th>
                    </tr>
                </thead>

                <tbody>
                    {reports.map((report) => (
                    <tr key={report.id}>
                        <td>{report.name}</td>
                        <td>{report.period}</td>
                        <td>{report.sector}</td>
                        <td>
                        <div className="admin-report-actions">
                            <button
                            type="button" onClick={() => handleEdit(report)}>
                            Editar
                            </button>

                            <button
                            type="button"
                            className="delete-report-button"
                            onClick={() => handleDelete(report.id)}
                            >
                            Excluir
                            </button>
                        </div>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
            )}
        </section>
    )}
    </main>
  );
}
