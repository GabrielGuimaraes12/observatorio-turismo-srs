import type { Report } from '../types/report';
import { getSessionUser } from './authService';

const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

interface ApiReport {
    id: string;
    title: string;
    authorId: string;
    description: string | null;
    fileUrl: string;
    published: boolean;
    createdAt: string;
    updatedAt: string;
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
        published: report.published,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt
  };
}

export async function getReports(scope: 'public' | 'admin' | 'own' = 'public'): Promise<Report[]> {
    const authorId = scope === 'own' ? getSessionUser()?.id : undefined;
    const options = scope === 'public' ? undefined : {
        headers: { Authorization: `Bearer ${getReportToken()}` },
    };
    const response = await fetch(`${API_URL}/reports`, options);

    if (!response.ok) {
        throw new Error('Não foi possível carregar os relatórios.');
    }

    const data = (await response.json()) as ApiReport[];

    const reports = scope === 'own' ? data.filter((report) => report.authorId === authorId) : data;
    return reports.map(mapApiReport);
}

export interface CreateReportRequest {
    title: string;
    description: string;
    fileUrl: string;
    published: boolean;
}

function getReportToken(): string {
    const token = sessionStorage.getItem('authToken');

    if (!token) {
        throw new Error('Sua sessão expirou. Entre novamente.');
    }

    return token;
}

export async function createReport(report: CreateReportRequest): Promise<Report> {
    const token = getReportToken();
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

    return mapApiReport(await response.json() as ApiReport);
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
