import { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
    getSectors,
    createSector,
    updateSector,
    deleteSector,
} from '../../services/sectorService';
import type { Sector } from '../../services/sectorService';
import './AdminSectors.css';

export function AdminSectors() {
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    async function loadSectors() {
        try {
            setIsLoading(true);
            setError('');
            const data = await getSectors();
            setSectors(data);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Não foi possível carregar os setores.'
            );
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        void loadSectors();
    }, []);

    function resetForm() {
        setSelectedSector(null);
        setName('');
        setDescription('');
    }

    function handleEdit(sector: Sector) {
        setSelectedSector(sector);
        setName(sector.name);
        setDescription(sector.description ?? '');
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        try {
            setIsSaving(true);
            setError('');

            const sectorData = {
                name: name.trim(),
                description: description.trim(),
            };

            if (selectedSector) {
                const updatedSector = await updateSector(
                    selectedSector.id,
                    sectorData
                );

                setSectors((current) =>
                    current.map((sector) =>
                        sector.id === updatedSector.id
                            ? updatedSector
                            : sector
                    )
                );
            } else {
                const newSector = await createSector(sectorData);
                setSectors((current) => [...current, newSector]);
            }

            resetForm();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Não foi possível salvar o setor.'
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete(sector: Sector) {
        const confirmed = window.confirm(
            `Deseja realmente excluir o setor "${sector.name}"?`
        );

        if (!confirmed) return;

        try {
            setError('');
            await deleteSector(sector.id);

            setSectors((current) =>
                current.filter((item) => item.id !== sector.id)
            );

            if (selectedSector?.id === sector.id) {
                resetForm();
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Não foi possível excluir o setor.'
            );
        }
    }

    return (
        <AdminLayout>
            <main className="admin-sectors-page">
                <header className="admin-sectors-header">
                    <div>
                        <h1>Gerenciar setores</h1>
                        <p>
                            Cadastre e organize os setores utilizados nos
                            relatórios e indicadores do Observatório.
                        </p>
                    </div>
                </header>

                {error && (
                    <div className="admin-sectors-error" role="alert">
                        {error}
                    </div>
                )}

                <section className="admin-sectors-content">
                    <form
                        className="admin-sector-form"
                        onSubmit={handleSubmit}
                    >
                        <h2>
                            {selectedSector ? 'Editar setor' : 'Novo setor'}
                        </h2>

                        <label htmlFor="sector-name">Nome do setor</label>
                        <input
                            id="sector-name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Ex.: Hospedagem"
                            maxLength={255}
                            required
                        />

                        <label htmlFor="sector-description">Descrição</label>
                        <textarea
                            id="sector-description"
                            value={description}
                            onChange={(event) =>
                                setDescription(event.target.value)
                            }
                            placeholder="Descreva o setor..."
                            rows={4}
                        />

                        <div className="admin-sector-form-actions">
                            <button type="submit" disabled={isSaving}>
                                {isSaving
                                    ? 'Salvando...'
                                    : selectedSector
                                        ? 'Salvar alterações'
                                        : 'Cadastrar setor'}
                            </button>

                            {selectedSector && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                >
                                    Cancelar edição
                                </button>
                            )}
                        </div>
                    </form>

                    <section className="admin-sectors-list">
                        <h2>Setores cadastrados ({sectors.length})</h2>

                        {isLoading ? (
                            <p>Carregando setores...</p>
                        ) : sectors.length === 0 ? (
                            <p>Nenhum setor cadastrado.</p>
                        ) : (
                            <div className="admin-sectors-table-wrapper">
                                <table className="admin-sectors-table">
                                    <thead>
                                        <tr>
                                            <th>Nome</th>
                                            <th>Descrição</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {sectors.map((sector) => (
                                            <tr key={sector.id}>
                                                <td>{sector.name}</td>
                                                <td>
                                                    {sector.description || '—'}
                                                </td>
                                                <td>
                                                    <div className="admin-sector-actions">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleEdit(sector)
                                                            }
                                                        >
                                                            Editar
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="delete-sector-button"
                                                            onClick={() =>
                                                                handleDelete(sector)
                                                            }
                                                        >
                                                            Excluir
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </section>
            </main>
        </AdminLayout>
    );
}
