import { type FormEvent, useEffect, useState } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  type ApiIndicator,
  type IndicatorReference,
  deleteIndicator,
  getIndicatorManagementData,
  saveIndicator,
} from '../../services/indicatorService';
import '../AdminReports/AdminReports.css';
import './AdminIndicators.css';

export function AdminIndicators() {
  const [indicators, setIndicators] = useState<ApiIndicator[]>([]);
  const [sectors, setSectors] = useState<IndicatorReference[]>([]);
  const [periods, setPeriods] = useState<IndicatorReference[]>([]);
  const [selected, setSelected] = useState<ApiIndicator | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    let active = true;
    getIndicatorManagementData()
      .then(([items, availableSectors, availablePeriods]) => {
        if (!active) return;
        setIndicators(items);
        setSectors(availableSectors);
        setPeriods(availablePeriods);
      })
      .catch((error: Error) => { if (active) setLoadError(error.message); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [attempt]);

  function openForm(indicator: ApiIndicator | null) {
    setSelected(indicator);
    setSaveError('');
    setSaved(false);
    setEditing(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const fields = new FormData(event.currentTarget);
    const name = String(fields.get('name') ?? '').trim();
    if (!name) {
      setSaveError('Informe o nome do indicador.');
      return;
    }

    setSaving(true);
    setSaveError('');
    try {
      const result = await saveIndicator({
        name,
        description: String(fields.get('description') ?? '').trim(),
        unit: String(fields.get('unit') ?? '').trim(),
        value: Number(fields.get('value')),
        sectorId: String(fields.get('sectorId')),
        periodId: String(fields.get('periodId')),
        published: fields.has('published'),
      }, selected?.id);

      setIndicators((current) => selected
        ? current.map((item) => item.id === result.id ? result : item)
        : [result, ...current]);
      setEditing(false);
      setSaved(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível salvar o indicador.');
    } finally {
      setSaving(false);
    }
  }

  async function changeIndicator(indicator: ApiIndicator, action: 'publication' | 'delete') {
    const removing = action === 'delete';
    const verb = removing ? 'excluir' : indicator.published ? 'despublicar' : 'publicar';
    if (changing || !window.confirm(`Deseja ${verb} o indicador "${indicator.name}"?`)) return;

    setChanging(true);
    setSaveError('');
    setSaved(false);
    try {
      if (removing) {
        await deleteIndicator(indicator.id);
        setIndicators((current) => current.filter((item) => item.id !== indicator.id));
      } else {
        const result = await saveIndicator({ published: !indicator.published }, indicator.id);
        setIndicators((current) => current.map((item) => item.id === result.id ? result : item));
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível atualizar a lista.');
    } finally {
      setChanging(false);
    }
  }

  const hasReferences = sectors.length > 0 && periods.length > 0;

  return (
    <AdminLayout>
      <main className="admin-reports-page">
        <header className="admin-reports-header">
          <div>
            <h1>Gerenciar indicadores</h1>
            <p>Cadastre, edite e controle a publicação dos indicadores do Observatório.</p>
          </div>

        {!editing && hasReferences && (
          <div className="admin-reports-header-actions">
            <button
              type="button"
              disabled={changing}
              onClick={() => openForm(null)}
            >
              + Novo indicador
            </button>
          </div>
        )}
      </header>
      <section className="admin-reports-list">
        {loading && <p role="status">Carregando indicadores…</p>}
        {loadError && (
          <>
            <p role="alert">{loadError}</p>
            <button type="button" onClick={() => {
              setLoading(true);
              setLoadError('');
              setAttempt((value) => value + 1);
            }}>Tentar novamente</button>
          </>
        )}
        {!loading && !loadError && !hasReferences && (
          <p>Cadastre pelo menos um setor e um período para gerenciar indicadores.</p>
        )}
        {saved && <p role="status">Indicador salvo.</p>}
        {saveError && <p role="alert">{saveError}</p>}
        {editing ? (
          <form className="admin-indicator-form" onSubmit={handleSubmit} key={selected?.id ?? 'new'}>
            <h2>{selected ? 'Editar indicador' : 'Novo indicador'}</h2>
            <fieldset disabled={saving}>
              <label htmlFor="indicator-name">Nome</label>
              <input id="indicator-name" name="name" required maxLength={255} defaultValue={selected?.name} />
              <label htmlFor="indicator-description">Descrição</label>
              <textarea id="indicator-description" name="description" maxLength={500} defaultValue={selected?.description ?? ''} />
              <label htmlFor="indicator-value">Valor</label>
              <input id="indicator-value" name="value" type="number" min="0" step="any" required defaultValue={selected?.value} />
              <label htmlFor="indicator-unit">Unidade</label>
              <input id="indicator-unit" name="unit" maxLength={20} defaultValue={selected?.unit ?? ''} />
              <label htmlFor="indicator-sector">Setor</label>
              <select id="indicator-sector" name="sectorId" required defaultValue={selected?.sectorId ?? ''}>
                <option value="" disabled>Selecione um setor</option>
                {sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
              </select>
              <label htmlFor="indicator-period">Período</label>
              <select id="indicator-period" name="periodId" required defaultValue={selected?.periodId ?? ''}>
                <option value="" disabled>Selecione um período</option>
                {periods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}
              </select>
              <label><input name="published" type="checkbox" defaultChecked={selected?.published} /> Publicar indicador</label>
              <div className="admin-report-actions">
                <button type="submit">{saving ? 'Salvando…' : 'Salvar indicador'}</button>
                <button type="button" onClick={() => setEditing(false)}>Cancelar</button>
              </div>
            </fieldset>
          </form>
        ) : !loading && !loadError && (
          <>
            {indicators.length === 0 ? <p>Nenhum indicador cadastrado.</p> : (
              <div className="admin-reports-table-wrapper">
                <table className="admin-reports-table">
                  <thead>
                    <tr>
                      <th scope="col">Indicador</th><th scope="col">Valor</th>
                      <th scope="col">Setor</th><th scope="col">Período</th>
                      <th scope="col">Status</th><th scope="col">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {indicators.map((indicator) => (
                      <tr key={indicator.id}>
                        <td>{indicator.name}</td>
                        <td>{indicator.value.toLocaleString('pt-BR')} {indicator.unit}</td>
                        <td>{indicator.sector.name}</td>
                        <td>{indicator.period.name}</td>
                        <td>{indicator.published ? 'Publicado' : 'Rascunho'}</td>
                        <td>
                          <div className="admin-report-actions">
                            <button type="button" disabled={changing} onClick={() => openForm(indicator)} aria-label={`Editar ${indicator.name}`}>Editar</button>
                            <button type="button" disabled={changing} onClick={() => void changeIndicator(indicator, 'publication')}>
                              {indicator.published ? 'Despublicar' : 'Publicar'}
                            </button>
                            <button type="button" disabled={changing} onClick={() => void changeIndicator(indicator, 'delete')}>Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  </AdminLayout>
  );
}