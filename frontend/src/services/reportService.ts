import type { Report } from '../types/report';

const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

interface ApiReport {
    id: string;
    title: string;
    description: string | null;
    fileUrl: string;
    published: boolean;
    periodId: string | null;
    period?: {
        id: string;
        name?: string;
        year?: number;
        startDate?: string;
        endDate?: string;
    } | null;
}

function mapApiReport(report: ApiReport): Report {
    const periodLabel = report.period?.name ?? (report.period?.year ? String(report.period.year) : '');

    return {
        id: report.id,
        name: report.title,
        period: periodLabel,
        sector: 'Todos',
        description: report.description ?? '',
        pdfUrl: report.fileUrl,
        published: report.published
  };
}

export async function getReports(): Promise<Report[]> {
    const response = await fetch(`${API_URL}/reports`);

    if (!response.ok) {
        throw new Error('Não foi possível carregar os relatórios.');
    }

    const data = (await response.json()) as ApiReport[];

    return data.map(mapApiReport);
}

export interface CreateReportRequest {
    title: string;
    description: string;
    fileUrl: string;
    published: boolean;
}

export async function createReport(report: CreateReportRequest): Promise<void> {
    const token = sessionStorage.getItem('authToken');

    if (!token) {
        throw new Error('Sua sessão expirou. Entre novamente.');
    }

    const response = await fetch(`${API_URL}/reports`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(report),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;

        throw new Error(message || 'Não foi possível cadastrar o relatório.');
    }
}


export async function updateReport(id: string, report: CreateReportRequest): Promise<void> {
    const token = sessionStorage.getItem('authToken');

    if (!token) {
        throw new Error('Sua sessão expirou. Entre novamente.');
    }

    const response = await fetch(`${API_URL}/reports/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(report),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;

        throw new Error(message || 'Não foi possível atualizar o relatório.');
    }
}


export async function deleteReport(id: string): Promise<void> {
    const token = sessionStorage.getItem('authToken');

    if (!token) {
        throw new Error('Sua sessão expirou. Entre novamente.');
    }

    const response = await fetch(`${API_URL}/reports/${id}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = Array.isArray(data?.message)
            ? data.message.join(', ')
            : data?.message;

        throw new Error(message || 'Não foi possível excluir o relatório.');
    }
}
