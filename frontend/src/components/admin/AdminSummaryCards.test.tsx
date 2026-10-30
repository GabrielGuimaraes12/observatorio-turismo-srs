import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AdminSummaryCards } from './AdminSummaryCards';
import type { Report } from '../../types/report';

const mockReports: Report[] = [
    {
        id: '1',
        name: 'Relatório 1',
        period: '2026',
        sector: 'Hotelaria',
        description: 'Descrição 1',
        pdfUrl: '#',
        published: true,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-10T10:00:00.000Z',
    },
    {
        id: '2',
        name: 'Relatório 2',
        period: '2026',
        sector: 'Alimentação',
        description: 'Descrição 2',
        pdfUrl: '#',
        published: true,
        createdAt: '2026-10-02T10:00:00.000Z',
        updatedAt: '2026-10-15T10:00:00.000Z',
    },
    {
        id: '3',
        name: 'Relatório 3',
        period: '2026',
        sector: 'Transporte',
        description: 'Descrição 3',
        pdfUrl: '#',
        published: false,
        createdAt: '2026-10-03T10:00:00.000Z',
        updatedAt: '2026-10-12T10:00:00.000Z',
    },
];

describe('AdminSummaryCards', () => {
    it('exibe corretamente os indicadores dos relatórios', () => {
        render(
            <AdminSummaryCards
                reports={mockReports}
                isLoading={false}
                hasError={false}
            />
        );

        expect(screen.getByText('Total de relatórios')).toBeInTheDocument();
        expect(screen.getByText('Publicados')).toBeInTheDocument();
        expect(screen.getByText('Rascunhos')).toBeInTheDocument();
        expect(screen.getByText('Última atualização')).toBeInTheDocument();

        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('15/10/2026')).toBeInTheDocument();
    });
    it('exibe uma mensagem enquanto os indicadores estão carregando', () => {
        render(
        <AdminSummaryCards
            reports={[]}
            isLoading={true}
            hasError={false}
        />
        );

        expect(screen.getByText('Carregando indicadores...')).toBeInTheDocument();
    });

    it('exibe uma mensagem quando ocorre um erro ao carregar os indicadores', () => {
        render(
        <AdminSummaryCards
            reports={[]}
            isLoading={false}
            hasError={true}
        />
        );

        expect(screen.getByText('Os indicadores não estão disponíveis.')).toBeInTheDocument();
    });
    it('exibe zero nos indicadores quando não existem relatórios', () => {
        render(
            <AdminSummaryCards
                reports={[]}
                isLoading={false}
                hasError={false}
            />
        );

        expect(screen.getByText('Total de relatórios')).toBeInTheDocument();
        expect(screen.getByText('Publicados')).toBeInTheDocument();
        expect(screen.getByText('Rascunhos')).toBeInTheDocument();

        expect(screen.getAllByText('0')).toHaveLength(3);
        expect(screen.getByText('Nenhuma atualização')).toBeInTheDocument();
    });
});