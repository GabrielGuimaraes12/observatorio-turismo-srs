import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockReports } from '../../services/mockReports';
import type { Report } from '../../types/report';
import './AdminReports.css';

export function AdminReports() {
  const [reports, setReports] = useState<Report[]>(mockReports);
  const navigate = useNavigate();

  function handleLogout(){
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('authUser');
    navigate('/login', { replace: true });
  }

  function handleDelete(id: string) {
    const confirmed = window.confirm('Tem certeza de que deseja excluir este relatório?');

    if (!confirmed) {
      return;
    }

    setReports((currentReports) => currentReports.filter((report) => report.id !== id));
  }

  return (
    <main className="admin-reports-page">
      <header className="admin-reports-header">
        <div>
          <h1>Gerenciar relatórios</h1>
          <p>Consulte e gerencie os relatórios do Observatório.</p>
        </div>

        <div className="admin-reports-header-actions">
            <button type="button"
                onClick={() => alert('Formulário de cadastro será implementado em seguida.')}
                >
                + Novo relatório
            </button>

            <button type="button"
                className="logout-button" onClick={handleLogout}
            >
                Sair
            </button>
        </div>
      </header>

      <section className="admin-reports-list">
        <h2>Relatórios cadastrados ({reports.length})</h2>

        {reports.length === 0 ? (
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
                          type="button"
                          onClick={() =>
                            alert('Formulário de edição será implementado em seguida.')
                          }
                        >
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
    </main>
  );
}
