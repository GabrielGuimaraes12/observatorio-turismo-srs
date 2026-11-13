import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Reports } from './Reports';
import type { Report } from '../../types/report';

const { getReportsMock, getReportPdfUrlMock } = vi.hoisted(() => ({
    getReportsMock: vi.fn(),
    getReportPdfUrlMock: vi.fn(),
}));

vi.mock('../../services/reportService', () => ({
    getReports: getReportsMock,
    getReportPdfUrl: getReportPdfUrlMock,
}));

vi.mock('../../components/layout/Header', () => ({
    Header: () => <header>Header</header>,
}));

vi.mock('../../components/layout/Footer', () => ({
    Footer: () => <footer>Footer</footer>,
}));

const reports: Report[] = [
    {
        id: '1',
        name: 'Relatório de Turismo 2026',
        period: '2026',
        periodId: 'period-2026',
        periodStartDate: '2026-01-01T00:00:00.000Z',
        periodEndDate: '2026-12-31T00:00:00.000Z',
        sector: 'Turismo',
        sectorId: 'sector-1',
        description: 'Dados do turismo em 2026',
        pdfUrl: '/reports/turismo-2026.pdf',
        published: true,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-10T10:00:00.000Z',
    },
    {
        id: '2',
        name: 'Relatório de Hospedagem 2025',
        period: '2025',
        periodId: 'period-2025',
        periodStartDate: '2025-01-01T00:00:00.000Z',
        periodEndDate: '2025-12-31T00:00:00.000Z',
        sector: 'Hospedagem',
        sectorId: 'sector-2',
        description: 'Dados de hospedagem em 2025',
        pdfUrl: '/reports/hospedagem-2025.pdf',
        published: true,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-10T10:00:00.000Z',
    },
];

describe('Reports', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getReportsMock.mockResolvedValue(reports);
        getReportPdfUrlMock.mockResolvedValue('blob:http://localhost/test-pdf');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('exibe os relatórios carregados pela API', async () => {
        render(<Reports />);

        expect(
            await screen.findByText('Relatório de Turismo 2026'),
        ).toBeInTheDocument();

        expect(
            screen.getByText('Relatório de Hospedagem 2025'),
        ).toBeInTheDocument();
    });

    it('filtra os relatórios pelo período selecionado', async () => {
        const user = userEvent.setup();

        render(<Reports />);

        await screen.findByText('Relatório de Turismo 2026');

        await user.selectOptions(
            screen.getAllByRole('combobox')[0],
            '2026',
        );

        expect(
            screen.getByText('Relatório de Turismo 2026'),
        ).toBeInTheDocument();

        expect(
            screen.queryByText('Relatório de Hospedagem 2025'),
        ).not.toBeInTheDocument();
    });

    it('filtra os relatórios pelo setor selecionado', async () => {
        const user = userEvent.setup();

        render(<Reports />);

        await screen.findByText('Relatório de Turismo 2026');

        await user.selectOptions(
            screen.getAllByRole('combobox')[1],
            'Hospedagem',
        );

        expect(
            screen.getByText('Relatório de Hospedagem 2025'),
        ).toBeInTheDocument();

        expect(
            screen.queryByText('Relatório de Turismo 2026'),
        ).not.toBeInTheDocument();
    });

    it('abre o PDF em uma nova aba ao clicar em Ver relatório', async () => {
        const user = userEvent.setup();

        const newTab = {
            document: { title: '' },
            opener: window,
            location: { href: '' },
            close: vi.fn(),
        };

        const openSpy = vi
            .spyOn(window, 'open')
            .mockReturnValue(newTab as unknown as Window);

        render(<Reports />);

        const reportTitle = await screen.findByText('Relatório de Turismo 2026');
        const card = reportTitle.closest('article');

        expect(card).not.toBeNull();

        await user.click(
            within(card as HTMLElement).getByRole('button', {
                name: 'Ver relatório',
            }),
        );

        await waitFor(() => {
            expect(getReportPdfUrlMock).toHaveBeenCalledWith('1');
            expect(newTab.location.href).toBe('blob:http://localhost/test-pdf');
        });

        expect(openSpy).toHaveBeenCalledWith('', '_blank');
        expect(newTab.document.title).toBe('Carregando relatório...');
        expect(newTab.opener).toBeNull();
    });

    
    it('baixa o PDF ao clicar em Baixar PDF', async () => {
        const user = userEvent.setup();

        const clickSpy = vi
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(() => {});

        const appendSpy = vi.spyOn(document.body, 'appendChild');

        render(<Reports />);

        const reportTitle = await screen.findByText('Relatório de Turismo 2026');
        const card = reportTitle.closest('article');

        expect(card).not.toBeNull();

        await user.click(
            within(card as HTMLElement).getByRole('button', {
                name: 'Baixar PDF',
            }),
        );

        await waitFor(() => {
            expect(getReportPdfUrlMock).toHaveBeenCalledWith('1');
            expect(clickSpy).toHaveBeenCalledOnce();
        });

        const downloadLink = appendSpy.mock.calls
            .map(([element]) => element)
            .find(
                (element): element is HTMLAnchorElement =>
                    element instanceof HTMLAnchorElement,
            );

        expect(downloadLink).toBeDefined();
        expect(downloadLink?.href).toBe('blob:http://localhost/test-pdf');
        expect(downloadLink?.download).toBe('Relatório de Turismo 2026.pdf');
        expect(downloadLink?.isConnected).toBe(false);
    });

    it('não exibe relatórios que não foram publicados', async () => {
        const unpublishedReport: Report = {
            id: '3',
            name: 'Relatório ainda não publicado',
            period: '2026',
            periodId: 'period-2026',
            periodStartDate: '2026-01-01T00:00:00.000Z',
            periodEndDate: '2026-12-31T00:00:00.000Z',
            sector: 'Turismo',
            sectorId: 'sector-1',
            description: 'Relatório de teste privado',
            pdfUrl: '/reports/rascunho.pdf',
            published: false,
            createdAt: '2026-10-01T10:00:00.000Z',
            updatedAt: '2026-10-10T10:00:00.000Z',
        };

        getReportsMock.mockResolvedValue([
            ...reports,
            unpublishedReport,
        ]);

        render(<Reports />);

        expect(
            await screen.findByText('Relatório de Turismo 2026'),
        ).toBeInTheDocument();

        expect(
            screen.queryByText('Relatório ainda não publicado'),
        ).not.toBeInTheDocument();
    });
});
