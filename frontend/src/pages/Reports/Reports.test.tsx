import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Reports } from './Reports';
import type { Report } from '../../types/report';

const { getReportsMock } = vi.hoisted(() => ({
    getReportsMock: vi.fn()
}));

vi.mock('../../services/reportService', () => ({
    getReports: getReportsMock,
}));

vi.mock('../../services/reportMetadataStorage', () => ({
    applyReportMetadata: (reports: Report[]) => reports,
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
    sector: 'Turismo',
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
    sector: 'Hospedagem',
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

        await user.selectOptions(screen.getAllByRole('combobox')[1], 'Hospedagem');

        expect(
            screen.getByText('Relatório de Hospedagem 2025'),
        ).toBeInTheDocument();

        expect(
            screen.queryByText('Relatório de Turismo 2026'),
        ).not.toBeInTheDocument();
    });

    it('exibe os links para visualizar e baixar o PDF', async () => {
        render(<Reports />);

        const reportTitle = await screen.findByText('Relatório de Turismo 2026');
        const card = reportTitle.closest('article');

        expect(card).not.toBeNull();

        const links = within(card as HTMLElement).getAllByRole('link');

        expect(links[0]).toHaveAttribute('href', '/reports/turismo-2026.pdf');
        expect(links[0]).toHaveAttribute('target', '_blank');
        expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer');

        expect(links[1]).toHaveAttribute('href', '/reports/turismo-2026.pdf');
        expect(links[1]).toHaveAttribute('download');
    });
    
    it('não exibe relatórios que não foram publicados', async () => {
        getReportsMock.mockResolvedValue([
            ...reports,
            {
                id: '3',
                name: 'Relatório ainda não publicado',
                period: '2026',
                sector: 'Turismo',
                description: 'Relatório de teste privado',
                pdfUrl: '/reports/rascunho.pdf',
                published: false,
            },
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
