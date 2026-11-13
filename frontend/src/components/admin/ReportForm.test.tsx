import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ReportForm } from './ReportForm';
import type { Report } from '../../types/report';
import { getSectors } from '../../services/sectorService';

vi.mock('../../services/sectorService', () => ({
    getSectors: vi.fn(),
}));

const sectors = [
    { id: 'sector-1', name: 'Turismo' },
    { id: 'sector-2', name: 'Comércio' },
];

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

describe('ReportForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getSectors).mockResolvedValue(sectors);
    });

    it('preserva os dados e o estado de publicação ao editar um relatório publicado', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        const onCancel = vi.fn();

        render(
            <ReportForm
                report={publishedReport}
                onSave={onSave}
                onCancel={onCancel}
            />,
        );

        await screen.findByRole('option', { name: 'Turismo' });

        expect(screen.getByLabelText('Nome do relatório')).toHaveValue(
            'Relatório publicado',
        );
        expect(screen.getByLabelText('Data inicial')).toHaveValue('2026-01-01');
        expect(screen.getByLabelText('Data final')).toHaveValue('2026-12-31');
        expect(screen.getByLabelText('Setor')).toHaveValue('sector-1');

        await user.click(screen.getByRole('button', { name: /salvar/i }));

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'report-1',
                periodStartDate: '2026-01-01',
                periodEndDate: '2026-12-31',
                sectorId: 'sector-1',
                published: true,
                pdfUrl: '/reports/relatorio.pdf',
            }),
            null,
        );
    });

    it('cria um relatório como não publicado e envia o PDF selecionado', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        const onCancel = vi.fn();

        const { container } = render(
            <ReportForm onSave={onSave} onCancel={onCancel} />,
        );

        await screen.findByRole('option', { name: 'Turismo' });

        await user.type(
            screen.getByLabelText('Nome do relatório'),
            'Novo relatório',
        );
        await user.type(
            screen.getByLabelText('Data inicial'),
            '2026-01-01',
        );
        await user.type(
            screen.getByLabelText('Data final'),
            '2026-12-31',
        );
        await user.selectOptions(
            screen.getByLabelText('Setor'),
            'sector-1',
        );
        await user.type(
            screen.getByLabelText('Descrição'),
            'Descrição do novo relatório',
        );

        const pdfFile = new File(
            ['%PDF-1.4 conteúdo de teste'],
            'novo-relatorio.pdf',
            { type: 'application/pdf' },
        );

        const fileInput = container.querySelector(
            'input[type="file"]',
        ) as HTMLInputElement;

        await user.upload(fileInput, pdfFile);

        expect(screen.getByText('novo-relatorio.pdf')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /salvar/i }));

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Novo relatório',
                periodStartDate: '2026-01-01',
                periodEndDate: '2026-12-31',
                sector: 'Turismo',
                sectorId: 'sector-1',
                description: 'Descrição do novo relatório',
                pdfUrl: '',
                published: false,
            }),
            pdfFile,
        );
    });
});
