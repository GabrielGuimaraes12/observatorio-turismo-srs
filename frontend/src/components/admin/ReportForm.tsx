import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Report } from '../../types/report';
import { getSectors } from '../../services/sectorService';
import type { Sector } from '../../services/sectorService';

interface ReportFormProps {
    report?: Report;
    onSave: (report: Report) => void;
    onCancel: () => void;
}

export function ReportForm({ report, onSave, onCancel }: ReportFormProps) {
    const [name, setName] = useState(report?.name ?? '');
    const [startDate, setStartDate] = useState(report?.periodStartDate?.slice(0, 10) ?? '');
    const [endDate, setEndDate] = useState(report?.periodEndDate?.slice(0, 10) ?? '');
    const [sectorId, setSectorId] = useState(report?.sectorId ?? '');
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [loadingSectors, setLoadingSectors] = useState(true);
    const [sectorError, setSectorError] = useState('');
    const [description, setDescription] = useState(report?.description ?? '');
    const [pdfUrl, setPdfUrl] = useState(report?.pdfUrl ?? '');

    useEffect(() => {
        async function loadSectors() {
            try {
                const data = await getSectors();
                setSectors(data);
            } catch {
                setSectorError('Não foi possível carregar os setores.');
            } finally {
                setLoadingSectors(false);
            }
        }

        loadSectors();
    }, []);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        onSave({
            id: report?.id ?? crypto.randomUUID(),
            name: name.trim(),
            period: '',
            periodId: report?.periodId ?? null,
            periodStartDate: startDate,
            periodEndDate: endDate,
            sector: sectors.find((sector) => sector.id === sectorId)?.name ?? '',
            sectorId: sectorId || null,
            description: description.trim(),
            pdfUrl: pdfUrl.trim(),
            published: report?.published ?? false,
            createdAt: report?.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }

    return (
        <form onSubmit={handleSubmit} className="report-form">
            <h2>{report ? 'Editar relatório' : 'Novo relatório'}</h2>

            <label htmlFor="report-name">Nome do relatório</label>
            <input
                id="report-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={150}
            />

            <label htmlFor="report-start-date">Data inicial</label>
            <input
                id="report-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
            />

            <label htmlFor="report-end-date">Data final</label>
            <input
                id="report-end-date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                min={startDate || undefined}
                required
            />

            <label htmlFor="report-sector">Setor</label>
            <select
                id="report-sector"
                value={sectorId}
                onChange={(event) => setSectorId(event.target.value)}
                disabled={loadingSectors || !!sectorError}
                required
            >
                <option value="">
                    {loadingSectors ? 'Carregando setores...' : 'Selecione um setor'}
                </option>
                {sectors.map((sector) => (
                    <option key={sector.id} value={sector.id}>
                        {sector.name}
                    </option>
                ))}
            </select>

            {sectorError && <p role="alert">{sectorError}</p>}

            <label htmlFor="report-description">Descrição</label>
            <textarea
                id="report-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
                maxLength={500}
                rows={4}
            />

            <label htmlFor="report-pdf">URL do PDF</label>
            <input
                id="report-pdf"
                type="text"
                value={pdfUrl}
                onChange={(event) => setPdfUrl(event.target.value)}
                placeholder="/reports/arquivo.pdf"
                required
                maxLength={500}
            />

            <div className="report-form-actions">
                <button type="submit" disabled={loadingSectors || !!sectorError}>
                    Salvar
                </button>
                <button type="button" onClick={onCancel}>
                    Cancelar
                </button>
            </div>
        </form>
    );
}
