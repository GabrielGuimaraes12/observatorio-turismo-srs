import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ReportForm } from './ReportForm';
import type { Report } from '../../types/report';

const publishedReport: Report = {
    id: 'report-1',
    name: 'Relatório publicado',
    period: '2026',
    sector: 'Turismo',
    description: 'Relatório de teste',
    pdfUrl: '/reports/relatorio.pdf',
    published: true,
};

describe('ReportForm', () => {
    it('preserva o estado de publicação ao editar um relatório publicado', async () => {
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

        await user.click(screen.getByRole('button', { name: /salvar/i }));

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({
            id: 'report-1',
            published: true,
            }),
        );
    });

    
it('cria um relatório como não publicado por padrão', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(<ReportForm onSave={onSave} onCancel={onCancel} />);

    await user.type(
        screen.getByLabelText('Nome do relatório'),
        'Novo relatório',
    );
    await user.type(
        screen.getByLabelText('Período de referência'),
        '2026',
    );
    await user.type(
        screen.getByLabelText('Descrição'),
        'Descrição do novo relatório',
    );
    await user.type(
        screen.getByLabelText('URL do PDF'),
        '/reports/novo-relatorio.pdf',
    );

    await user.click(screen.getByRole('button', { name: /salvar/i }));

    expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
            name: 'Novo relatório',
            published: false,
        }),
    );
});
});
