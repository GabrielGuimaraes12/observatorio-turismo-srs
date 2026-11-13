import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { AdminReports } from './AdminReports';
import type { Report } from '../../types/report';

const {
    getReportsMock,
    createReportMock,
    updateReportMock,
    deleteReportMock,
} = vi.hoisted(() => ({
    getReportsMock: vi.fn(),
    createReportMock: vi.fn(),
    updateReportMock: vi.fn(),
    deleteReportMock: vi.fn(),
}));

vi.mock('../../services/reportService', () => ({
    getReports: getReportsMock,
    createReport: createReportMock,
    updateReport: updateReportMock,
    deleteReport: deleteReportMock,
}));

vi.mock('../../components/admin/ReportForm', () => ({
    ReportForm: ({
        report,
        onSave,
        onCancel,
    }: {
        report?: Report;
        onSave: (report: Report) => void;
        onCancel: () => void;
    }) => (
        <div>
            <span>{report?.name ?? 'Novo relatório'}</span>
            <button
                type="button"
                onClick={() =>
                    onSave({
                        ...(report ?? publishedReport),
                        id: report?.id ?? 'report-new',
                        name: 'Relatório atualizado',
                    })
                }
            >
                Salvar edição de teste
            </button>
            <button type="button" onClick={onCancel}>
                Cancelar
            </button>
        </div>
    ),
}));

const publishedReport: Report = {
    id: 'report-1',
    name: 'Relatório publicado',
    period: 'janeiro de 2026 a dezembro de 2026',
    periodId: 'period-1',
    periodStartDate: '2026-01-01T00:00:00.000Z',
    periodEndDate: '2026-12-31T00:00:00.000Z',
    sector: 'Turismo',
    sectorId: 'sector-1',
    description: 'Relatório de teste',
    pdfUrl: '/reports/relatorio.pdf',
    published: true,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-10T10:00:00.000Z',
};

function renderAdminReports() {
    return render(
        <MemoryRouter>
            <AdminReports />
        </MemoryRouter>,
    );
}

describe('AdminReports', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        getReportsMock.mockResolvedValue([{ ...publishedReport }]);
        createReportMock.mockResolvedValue({
            ...publishedReport,
            id: 'report-new',
        });
        updateReportMock.mockImplementation(
            async (_id, data) => ({
                ...publishedReport,
                name: data.title,
                description: data.description,
                pdfUrl: data.fileUrl,
                published: data.published,
            }),
        );
        deleteReportMock.mockResolvedValue(undefined);
    });

    it('preserva a publicação ao editar um relatório publicado', async () => {
        const user = userEvent.setup();

        renderAdminReports();

        await screen.findByText('Relatório publicado');

        await user.click(screen.getByRole('button', { name: 'Editar' }));
        await user.click(
            screen.getByRole('button', { name: 'Salvar edição de teste' }),
        );

        await waitFor(() => {
            expect(updateReportMock).toHaveBeenCalledWith('report-1', {
                title: 'Relatório atualizado',
                description: 'Relatório de teste',
                fileUrl: '/reports/relatorio.pdf',
                published: true,
                period: {
                    startDate: '2026-01-01T00:00:00.000Z',
                    endDate: '2026-12-31T00:00:00.000Z',
                },
                sectorId: 'sector-1',
            });
        });
    });

    it('exclui um relatório após confirmação', async () => {
        const user = userEvent.setup();
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        renderAdminReports();

        await screen.findByText('Relatório publicado');

        await user.click(screen.getByRole('button', { name: 'Excluir' }));

        await waitFor(() => {
            expect(deleteReportMock).toHaveBeenCalledWith('report-1');
        });

        expect(
            screen.queryByText('Relatório publicado'),
        ).not.toBeInTheDocument();
    });

    it('não exclui um relatório quando a confirmação é cancelada', async () => {
        const user = userEvent.setup();
        vi.spyOn(window, 'confirm').mockReturnValue(false);

        renderAdminReports();

        await screen.findByText('Relatório publicado');

        await user.click(screen.getByRole('button', { name: 'Excluir' }));

        expect(deleteReportMock).not.toHaveBeenCalled();
        expect(screen.getByText('Relatório publicado')).toBeInTheDocument();
    });

    it('mantém o relatório na lista quando a exclusão falha', async () => {
        const user = userEvent.setup();
        const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

        vi.spyOn(window, 'confirm').mockReturnValue(true);
        deleteReportMock.mockRejectedValueOnce(
            new Error('Falha ao excluir relatório'),
        );

        renderAdminReports();

        await screen.findByText('Relatório publicado');

        await user.click(screen.getByRole('button', { name: 'Excluir' }));

        await waitFor(() => {
            expect(alertMock).toHaveBeenCalledWith(
                'Falha ao excluir relatório',
            );
        });

        expect(screen.getByText('Relatório publicado')).toBeInTheDocument();
    });

    it('exibe uma mensagem quando falha ao carregar os relatórios', async () => {
        getReportsMock.mockRejectedValueOnce(
            new Error('Falha ao carregar relatórios'),
        );

        renderAdminReports();

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Falha ao carregar relatórios',
        );
    });

    it('permite tentar carregar os relatórios novamente', async () => {
        const user = userEvent.setup();
        const reloadMock = vi.fn();

        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { ...window.location, reload: reloadMock },
        });

        getReportsMock.mockRejectedValueOnce(
            new Error('Falha ao carregar relatórios'),
        );

        renderAdminReports();

        await screen.findByRole('alert');

        await user.click(
            screen.getByRole('button', { name: 'Tentar novamente' }),
        );

        expect(reloadMock).toHaveBeenCalledTimes(1);
    });

    it('publica um relatório não publicado', async () => {
        const user = userEvent.setup();

        getReportsMock.mockResolvedValueOnce([
            { ...publishedReport, published: false },
        ]);

        vi.spyOn(window, 'confirm').mockReturnValue(true);

        renderAdminReports();

        await screen.findByText('Não publicado');

        await user.click(screen.getByRole('button', { name: 'Publicar' }));

        await waitFor(() => {
            expect(updateReportMock).toHaveBeenCalledWith('report-1', {
                title: 'Relatório publicado',
                description: 'Relatório de teste',
                fileUrl: '/reports/relatorio.pdf',
                published: true,
            });
        });

        expect(await screen.findByText('Publicado')).toBeInTheDocument();
    });

    it('remove um relatório de publicação', async () => {
        const user = userEvent.setup();

        vi.spyOn(window, 'confirm').mockReturnValue(true);

        renderAdminReports();

        await screen.findByText('Publicado');

        await user.click(
            screen.getByRole('button', { name: 'Remover publicação' }),
        );

        await waitFor(() => {
            expect(updateReportMock).toHaveBeenCalledWith('report-1', {
                title: 'Relatório publicado',
                description: 'Relatório de teste',
                fileUrl: '/reports/relatorio.pdf',
                published: false,
            });
        });

        expect(await screen.findByText('Não publicado')).toBeInTheDocument();
    });

    it('não altera a publicação quando a confirmação é cancelada', async () => {
        const user = userEvent.setup();
        const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(false);

        renderAdminReports();

        await screen.findByText('Publicado');

        await user.click(
            screen.getByRole('button', { name: 'Remover publicação' }),
        );

        expect(confirmMock).toHaveBeenCalled();
        expect(updateReportMock).not.toHaveBeenCalled();
        expect(screen.getByText('Publicado')).toBeInTheDocument();
    });

    it('mantém o status original quando a atualização da publicação falha', async () => {
        const user = userEvent.setup();
        const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

        vi.spyOn(window, 'confirm').mockReturnValue(true);
        updateReportMock.mockRejectedValueOnce(
            new Error('Falha ao atualizar publicação'),
        );

        renderAdminReports();

        await screen.findByText('Publicado');

        await user.click(
            screen.getByRole('button', { name: 'Remover publicação' }),
        );

        await waitFor(() => {
            expect(alertMock).toHaveBeenCalledWith(
                'Falha ao atualizar publicação',
            );
        });

        expect(screen.getByText('Publicado')).toBeInTheDocument();
        expect(screen.queryByText('Não publicado')).not.toBeInTheDocument();
    });
});
