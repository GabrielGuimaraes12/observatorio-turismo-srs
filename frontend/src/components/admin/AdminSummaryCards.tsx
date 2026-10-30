import type { Report } from '../../types/report';
import './AdminSummaryCards.css';

interface AdminSummaryCardsProps {
    reports: Report[];
    isLoading: boolean;
    hasError: boolean;
}

export function AdminSummaryCards({ reports, isLoading, hasError }: AdminSummaryCardsProps) {
    if (isLoading) {
        return (
        <section className="admin-summary-cards" aria-label="Resumo dos relatórios">
            <p>Carregando indicadores...</p>
        </section>
        );
    }

    if (hasError) {
        return (
        <section className="admin-summary-cards" aria-label="Resumo dos relatórios">
            <p>Os indicadores não estão disponíveis.</p>
        </section>
        );
    }
    const totalReports = reports.length;

    const publishedReports = reports.filter((report) => report.published).length;

    const draftReports = reports.filter((report) => !report.published).length;

    const lastUpdatedReport = reports.reduce<Report | undefined>(
        (latest, report) => {
            if (!latest) return report;

            return new Date(report.updatedAt) > new Date(latest.updatedAt) ? report : latest;
        },
        undefined
    );

    const lastUpdated = lastUpdatedReport
    ? new Date(lastUpdatedReport.updatedAt).toLocaleDateString('pt-BR') : 'Nenhuma atualização';

    const cards = [
        {
            title: 'Total de relatórios',
            value: totalReports,
        },
        {
            title: 'Publicados',
            value: publishedReports,
        },
        {
            title: 'Rascunhos',
            value: draftReports,
        },
        {
            title: 'Última atualização',
            value: lastUpdated,
        },
    ];

    return (
    <section className="admin-summary-cards" aria-label="Resumo dos relatórios">
        {cards.map((card) => (
            <article className="admin-summary-card" key={card.title}>
                <h3>{card.title}</h3>
                <p>{card.value}</p>
                </article>
            ))}
    </section>
    );
}
