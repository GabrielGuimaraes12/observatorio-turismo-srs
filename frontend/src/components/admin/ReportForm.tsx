import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Report } from '../../types/report';

interface ReportFormProps {
    report?: Report;
    onSave: (report: Report) => void;
    onCancel: () => void;
}

export function ReportForm({ report, onSave, onCancel }: ReportFormProps) {
    const [name, setName] = useState(report?.name ?? '');
    const [period, setPeriod] = useState(report?.period ?? '');
    const [sector, setSector] = useState(report?.sector ?? 'Todos');
    const [description, setDescription] = useState(report?.description ?? '');
    const [pdfUrl, setPdfUrl] = useState(report?.pdfUrl ?? '');

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        onSave({
            id: report?.id ?? crypto.randomUUID(),
            name: name.trim(),
            period: period.trim(),
            sector,
            description: description.trim(),
            pdfUrl: pdfUrl.trim(),
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

        <label htmlFor="report-period">Período de referência</label>
        <input
            id="report-period"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            placeholder="Ex.: Janeiro - Dezembro de 2026"
            required
            maxLength={100}
        />

        <label htmlFor="report-sector">Setor</label>
        <select
            id="report-sector"
            value={sector}
            onChange={(event) => setSector(event.target.value)}
            required
        >
            <option value="Todos">Todos</option>
            <option value="Turismo">Turismo</option>
            <option value="Hospedagem">Hospedagem</option>
        </select>

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
            <button type="submit">Salvar</button>
            <button type="button" onClick={onCancel}>
            Cancelar
            </button>
        </div>
        </form>
    );
}
