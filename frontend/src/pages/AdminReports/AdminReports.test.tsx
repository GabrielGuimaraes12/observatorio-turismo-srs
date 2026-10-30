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
};

describe('AdminReports', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
});