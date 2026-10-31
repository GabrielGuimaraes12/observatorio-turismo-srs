import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { AdminReports } from "./AdminReports";
import type { Report } from "../../types/report";

const { getReportsMock, updateReportMock, deleteReportMock } = vi.hoisted(() => ({
    getReportsMock: vi.fn(),
    updateReportMock: vi.fn(),
    deleteReportMock: vi.fn()
}));

vi.mock("../../services/reportService", () => ({
    getReports: getReportsMock,
    createReport: vi.fn(),
    updateReport: updateReportMock,
    deleteReport: deleteReportMock,
}))

vi.mock("../../services/reportMetadataStorage", () => ({
    applyReportMetadata: (reports: Report[]) => reports,
    saveReportMetadata: vi.fn(),
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
      <span>{report?.name}</span>
      <button
        type="button"
        onClick={() => onSave({...report!, name: 'Relatório atualizado',})}
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
    period: '2026',
    sector: 'Turismo',
    description: 'Relatório de teste',
    pdfUrl: '/reports/relatorio.pdf',
    published: true,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-10T10:00:00.000Z',
};

describe('AdminReports', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.resetAllMocks();
        getReportsMock.mockResolvedValue([{ ...publishedReport }]);
        updateReportMock.mockResolvedValue(undefined);
        deleteReportMock.mockResolvedValue(undefined);
    });

    it('preserva a publicação ao editar um relatório publicado', async () => {
        const user = userEvent.setup();
        render(
        <MemoryRouter>
        <AdminReports />
        </MemoryRouter>,
        );
        
        await screen.findByText('Relatório publicado');

        await user.click(screen.getByRole('button', { name: /editar/i }));

        await user.click(screen.getByRole('button', { name: 'Salvar edição de teste' }),);

        await waitFor(() => {expect(updateReportMock).toHaveBeenCalledWith('report-1', {
            title: 'Relatório atualizado',
            description: 'Relatório de teste',
            fileUrl: '/reports/relatorio.pdf',
            published: true,
        });
    });
  });
  
    it('exclui um relatório após confirmação', async () => {
        const user = userEvent.setup();

        vi.spyOn(window, 'confirm').mockReturnValue(true);

        render(
            <MemoryRouter>
                <AdminReports />
            </MemoryRouter>,
        );

        await screen.findByText('Relatório publicado');

        await user.click(screen.getByRole('button', { name: /excluir/i }));

        await waitFor(() => {
            expect(deleteReportMock).toHaveBeenCalledWith('report-1');
        });

        await waitFor(() => {
            expect(screen.queryByText('Relatório publicado')).not.toBeInTheDocument();
        });
    });

    it('não exclui um relatório quando a confirmação é cancelada', async () => {
        const user = userEvent.setup();

        vi.spyOn(window, 'confirm').mockReturnValue(false);

        render(
            <MemoryRouter>
                <AdminReports />
            </MemoryRouter>,
        );

        await screen.findByText('Relatório publicado');

        await user.click(screen.getByRole('button', { name: /excluir/i }));

        expect(deleteReportMock).not.toHaveBeenCalled();
        expect(screen.getByText('Relatório publicado')).toBeInTheDocument();
    });

    it('mantém o relatório na lista quando a exclusão falha', async () => {
        const user = userEvent.setup();
        const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

        vi.spyOn(window, 'confirm').mockReturnValue(true);
        deleteReportMock.mockRejectedValueOnce(new Error('Falha ao excluir relatório'));

        render(
            <MemoryRouter>
                <AdminReports />
            </MemoryRouter>,
        );

        await screen.findByText('Relatório publicado');

        await user.click(screen.getByRole('button', { name: /excluir/i }));

        await waitFor(() => {expect(alertMock).toHaveBeenCalledWith('Falha ao excluir relatório');});
        expect(screen.getByText('Relatório publicado')).toBeInTheDocument();
        expect(alertMock).toHaveBeenCalledWith('Falha ao excluir relatório');
    });

    it('exibe uma mensagem quando falha ao carregar os relatórios', async () => {
        getReportsMock.mockRejectedValueOnce(
            new Error('Falha ao carregar relatórios'),
        );

        render(
            <MemoryRouter>
                <AdminReports />
            </MemoryRouter>,
        );

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Falha ao carregar relatórios',
        );
    });

    it('permite tentar carregar os relatórios novamente', async () => {
        const user = userEvent.setup();

        getReportsMock
            .mockRejectedValueOnce(new Error('Falha ao carregar relatórios'))
            .mockResolvedValueOnce([{ ...publishedReport }]);

        render(
            <MemoryRouter>
                <AdminReports />
            </MemoryRouter>,
        );

        await screen.findByRole('alert');

        await user.click(
            screen.getByRole('button', { name: /tentar novamente/i }),
        );

        expect(getReportsMock).toHaveBeenCalledTimes(1);
    });
        it('publica um relatório não publicado', async () => {
            const user = userEvent.setup();

            const unpublishedReport = {
                ...publishedReport,
                published: false,
            };

            getReportsMock.mockResolvedValue([unpublishedReport]);
            vi.spyOn(window, 'confirm').mockReturnValue(true);

            render(
                <MemoryRouter>
                    <AdminReports />
                </MemoryRouter>,
            );

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

    it('retira um relatório de publicação', async () => {
        const user = userEvent.setup();

        vi.spyOn(window, 'confirm').mockReturnValue(true);

        render(
            <MemoryRouter>
                <AdminReports />
            </MemoryRouter>,
        );

        await screen.findByText('Publicado');

        await user.click(screen.getByRole('button', { name: 'Retirar de publicação' }),);

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

        render(
            <MemoryRouter>
                <AdminReports />
            </MemoryRouter>,
        );

        await screen.findByText('Publicado');

        await user.click(screen.getByRole('button', { name: 'Retirar de publicação' }),);

        expect(confirmMock).toHaveBeenCalled();
        expect(updateReportMock).not.toHaveBeenCalled();
        expect(screen.getByText('Publicado')).toBeInTheDocument();
    });

    it('mantém o status original quando a atualização da publicação falha', async () => {
        const user = userEvent.setup();
        const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

        vi.spyOn(window, 'confirm').mockReturnValue(true);

        updateReportMock.mockRejectedValueOnce(new Error('Falha ao atualizar publicação'),);

        render(
            <MemoryRouter>
                <AdminReports />
            </MemoryRouter>,
        );

        await screen.findByText('Publicado');

        await user.click(screen.getByRole('button', { name: 'Retirar de publicação' }),);

        await waitFor(() => {
            expect(alertMock).toHaveBeenCalledWith(
                'Falha ao atualizar publicação',
            );
        });

        expect(screen.getByText('Publicado')).toBeInTheDocument();
        expect(screen.queryByText('Não publicado')).not.toBeInTheDocument();
    });
});