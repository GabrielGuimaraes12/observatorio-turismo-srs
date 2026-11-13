const API_URL =
    import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export interface Sector {
    id: string;
    name: string;
    description?: string | null;
}

export interface SectorRequest {
    name: string;
    description?: string;
}

function getAdminHeaders() {
    const token = sessionStorage.getItem('authToken');

    if (!token) {
        throw new Error('Sua sessão expirou. Entre novamente.');
    }

    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    };
}

async function handleResponse(response: Response): Promise<void> {
    if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = Array.isArray(data?.message)
            ? data.message.join(', ')
            : data?.message;

        throw new Error(message || 'Não foi possível realizar a operação.');
    }
}

export async function getSectors(): Promise<Sector[]> {
    const response = await fetch(`${API_URL}/sectors`);

    if (!response.ok) {
        throw new Error('Não foi possível carregar os setores.');
    }

    return response.json() as Promise<Sector[]>;
}

export async function createSector(sector: SectorRequest): Promise<Sector> {
    const response = await fetch(`${API_URL}/sectors`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(sector),
    });

    await handleResponse(response);

    return response.json() as Promise<Sector>;
}

export async function updateSector(
    id: string,
    sector: SectorRequest
): Promise<Sector> {
    const response = await fetch(`${API_URL}/sectors/${id}`, {
        method: 'PATCH',
        headers: getAdminHeaders(),
        body: JSON.stringify(sector),
    });

    await handleResponse(response);

    return response.json() as Promise<Sector>;
}

export async function deleteSector(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/sectors/${id}`, {
        method: 'DELETE',
        headers: getAdminHeaders(),
    });

    await handleResponse(response);
}
