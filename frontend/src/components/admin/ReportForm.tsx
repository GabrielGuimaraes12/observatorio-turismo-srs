import { useEffect, useRef, useState } from 'react';
import type { FormEvent, DragEvent } from 'react';
import type { Report } from '../../types/report';
import { getSectors } from '../../services/sectorService';
import type { Sector } from '../../services/sectorService';
import './ReportForm.css';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface ReportFormProps {
    report?: Report;
    onSave: (report: Report, file: File | null) => void;
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

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

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

        void loadSectors();
    }, []);

    function handleFileSelection(file: File | null) {
        setFileError('');

        if (!file) return;

        if (
            file.type !== 'application/pdf' ||
            !file.name.toLowerCase().endsWith('.pdf')
        ) {
            setSelectedFile(null);
            setFileError('Selecione um arquivo PDF válido.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setSelectedFile(null);
            setFileError('O arquivo PDF não pode ultrapassar 10 MB.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setSelectedFile(file);
    }

    function handleDrop(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        setIsDragging(false);

        if (event.dataTransfer.files.length > 0) {
            handleFileSelection(event.dataTransfer.files[0]);
        }
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!report && !selectedFile) {
            setFileError('Selecione um arquivo PDF para cadastrar o relatório.');
            return;
        }

        if (fileError) return;

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
            pdfUrl: report?.pdfUrl ?? '',
            published: report?.published ?? false,
            createdAt: report?.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }, selectedFile);
    }

    function removeSelectedFile() {
        setSelectedFile(null);
        setFileError('');

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
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
                maxLength={255}
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

            <div className="report-file-section">
                <label>Arquivo PDF</label>

                {report?.pdfUrl && !selectedFile && (
                    <div className="current-pdf">
                        <span>PDF atual cadastrado</span>
                        <small>Selecione outro arquivo caso queira substituí-lo.</small>
                    </div>
                )}

                <div
                    className={`pdf-dropzone ${isDragging ? 'dragging' : ''}`}
                    onDragOver={(event) => {
                        event.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                >
                    <span className="pdf-upload-icon" aria-hidden="true">
                        ↑
                    </span>

                    <p>Arraste seu PDF até aqui</p>
                    <span>ou</span>

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Selecionar arquivo
                    </button>

                    <small>Somente PDF · Máximo de 10 MB</small>

                    <input
                        ref={fileInputRef}
                        id="report-pdf"
                        type="file"
                        accept=".pdf,application/pdf"
                        hidden
                        onChange={(event) =>
                            handleFileSelection(event.target.files?.[0] ?? null)
                        }
                    />
                </div>

                {selectedFile && (
                    <div className="selected-pdf">
                        <div>
                            <strong>{selectedFile.name}</strong>
                            <small>
                                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                            </small>
                        </div>

                        <button type="button" onClick={removeSelectedFile}>
                            Remover
                        </button>
                    </div>
                )}

                {fileError && <p className="pdf-error" role="alert">{fileError}</p>}
            </div>

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
