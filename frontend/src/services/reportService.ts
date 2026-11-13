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
        startDate?: string;
        endDate?: string;
    } | null;
    sectorId: string | null;
    sector?: {
        id: string;
        name: string;
        description?: string | null;
    } | null;
}

function mapApiReport(report: ApiReport): Report {
    return {
        id: report.id,
        name: report.title,
        period: report.period?.name ?? '',
        periodId: report.periodId,
        periodStartDate: report.period?.startDate ?? '',
        periodEndDate: report.period?.endDate ?? '',
        sector: report.sector?.name ?? 'Todos',
        sectorId: report.sectorId,
        description: report.description ?? '',
        pdfUrl: report.fileUrl,
        published: report.published,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
    };
}

export interface CreateReportRequest {
    title: string;
    description: string;
    published: boolean;
    period?: {
        startDate: string;
        endDate: string;
    } | null;
    sectorId?: string | null;
}

function getReportToken(): string {
    const token = sessionStorage.getItem('authToken');

    if (!token) {
        throw new Error('Sua sessão expirou. Entre novamente.');
    }

    return token;
}

function createReportFormData(
    report: CreateReportRequest,
    file?: File | null,
): FormData {
    const formData = new FormData();

    formData.append('title', report.title);
    formData.append('description', report.description);
    formData.append('published', String(report.published));

    if (report.period) {
        formData.append('period', JSON.stringify(report.period));
    }

    if (report.sectorId) {
        formData.append('sectorId', report.sectorId);
    }

    if (file) {
        formData.append('file', file);
    }

    return formData;
}

async function handleReportResponse(
    response: Response,
    defaultMessage: string,
): Promise<Report> {
    if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = Array.isArray(data?.message)
            ? data.message.join(', ')
            : data?.message;

        throw new Error(message || defaultMessage);
    }

    return mapApiReport(await response.json() as ApiReport);
}

export async function getReports(
    scope: 'public' | 'admin' | 'own' = 'public',
): Promise<Report[]> {
    const authorId = scope === 'own' ? getSessionUser()?.id : undefined;

    const options = scope === 'public'
        ? undefined
        : {
            headers: {
                Authorization: `Bearer ${getReportToken()}`,
            },
        };

    const response = await fetch(`${API_URL}/reports`, options);

    if (!response.ok) {
        throw new Error('Não foi possível carregar os relatórios.');
    }

    const data = await response.json() as ApiReport[];

    const reports = scope === 'own'
        ? data.filter((report) => report.authorId === authorId)
        : data;

    return reports.map(mapApiReport);
}

export async function createReport(
    report: CreateReportRequest,
    file: File,
): Promise<Report> {
    const token = getReportToken();

    const response = await fetch(`${API_URL}/reports`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: createReportFormData(report, file),
    });

    return handleReportResponse(
        response,
        'Não foi possível cadastrar o relatório.',
    );
}

export async function updateReport(
    id: string,
    report: CreateReportRequest,
    file?: File | null,
): Promise<Report> {
    const token = getReportToken();

    const response = await fetch(`${API_URL}/reports/${id}`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: createReportFormData(report, file),
    });

    return handleReportResponse(
        response,
        'Não foi possível atualizar o relatório.',
    );
}

export async function deleteReport(id: string): Promise<void> {
    const token = getReportToken();

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



export async function getReportPdfUrl(id: string): Promise<string> {
    const token = sessionStorage.getItem('authToken');

    const response = await fetch(`${API_URL}/reports/${id}/pdf`, {
        headers: token
            ? { Authorization: `Bearer ${token}` }
            : {},
    });

    if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = Array.isArray(data?.message)
            ? data.message.join(', ')
            : data?.message;

        throw new Error(message || 'Não foi possível abrir o PDF.');
    }

    const pdfBlob = await response.blob();

    return URL.createObjectURL(pdfBlob);
}
