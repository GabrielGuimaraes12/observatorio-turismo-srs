import type { Report } from '../types/report';

const STORAGE_KEY = 'reportMetadata';

type ReportMetadata = {
    period: string;
    sector: string;
};

type ReportMetadataMap = Record<string, ReportMetadata>;

function readMetadata(): ReportMetadataMap {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) as ReportMetadataMap : {};
    } catch {
        return {};
    }
}

export function saveReportMetadata(report: Report): void {
    const metadata = readMetadata();

    metadata[report.id] = {
        period: report.period,
        sector: report.sector,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
}

export function applyReportMetadata(reports: Report[]): Report[] {
    const metadata = readMetadata();

    return reports.map((report) => ({
        ...report,
        period: metadata[report.id]?.period ?? report.period,
        sector: metadata[report.id]?.sector ?? report.sector,
    }));
}
